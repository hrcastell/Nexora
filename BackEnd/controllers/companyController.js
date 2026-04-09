const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Helper to run SQL file
const runSqlFile = async (filePath, schemaName, client) => {
    try {
        let sql = fs.readFileSync(filePath, 'utf8');
        // Replace placeholder with actual schema name
        sql = sql.replace(/{schema_name}/g, schemaName);
        
        await client.query(sql);
    } catch (err) {
        throw new Error(`Failed to execute SQL file ${filePath}: ${err.message}`);
    }
};

// Seed basic roles, permissions and role_permissions for a new tenant schema
const seedTenantRoles = async (schemaName, client) => {
    const s = schemaName;

    // --- Roles ---
    const roles = [
        { name: 'super_admin', description: 'Acceso total a la aplicación. Rol de sistema.', is_system: true },
        { name: 'admin',       description: 'Administrador de la empresa. Gestión completa.',  is_system: true },
        { name: 'user',        description: 'Usuario estándar con acceso de lectura y creación.', is_system: true },
        { name: 'viewer',      description: 'Solo lectura. Sin permisos de modificación.',      is_system: true },
    ];

    const roleIds = {};
    for (const role of roles) {
        const r = await client.query(
            `INSERT INTO "${s}".roles (name, description, is_system_role)
             VALUES ($1, $2, $3)
             ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
             RETURNING id`,
            [role.name, role.description, role.is_system]
        );
        roleIds[role.name] = r.rows[0].id;
    }

    // --- Permissions (module x action) ---
    const modules = ['dashboard', 'companies', 'solicitudes', 'subscriptions', 'users', 'config', 'reports'];
    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    const permIds = {};
    for (const module of modules) {
        permIds[module] = {};
        for (const action of actions) {
            const p = await client.query(
                `INSERT INTO "${s}".permissions (module, action, description)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (module, action) DO UPDATE SET description = EXCLUDED.description
                 RETURNING id`,
                [module, action, `${action} en ${module}`]
            );
            permIds[module][action] = p.rows[0].id;
        }
    }

    // --- Role-Permission matrix ---
    const matrix = {
        super_admin: { modules: modules, actions: actions },
        admin:       { modules: modules, actions: actions },
        user:        { modules: ['dashboard', 'companies', 'solicitudes', 'reports'], actions: ['view', 'create', 'edit'] },
        viewer:      { modules: ['dashboard', 'companies', 'solicitudes', 'reports'], actions: ['view'] },
    };

    for (const [roleName, access] of Object.entries(matrix)) {
        const roleId = roleIds[roleName];
        for (const module of access.modules) {
            for (const action of access.actions) {
                const permId = permIds[module]?.[action];
                if (!permId) continue;
                await client.query(
                    `INSERT INTO "${s}".role_permissions (role_id, permission_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [roleId, permId]
                );
            }
        }
    }
};

// Seed modules, profiles and permission matrix for a new tenant
const seedTenantExtended = async (schemaName, client) => {
    const s = schemaName;

    const BASE_MODULES = [
        { code: 'dashboard',     name: 'Dashboard',         icon: 'LayoutDashboard', group_name: 'Core',      menu_order: 1 },
        { code: 'companies',     name: 'Empresas',           icon: 'Building2',       group_name: 'Admin',     menu_order: 2 },
        { code: 'users',         name: 'Usuarios',           icon: 'Users',           group_name: 'Seguridad', menu_order: 3 },
        { code: 'profiles',      name: 'Perfiles',           icon: 'Shield',          group_name: 'Seguridad', menu_order: 4 },
        { code: 'modules',       name: 'Módulos',            icon: 'Puzzle',          group_name: 'Seguridad', menu_order: 5 },
        { code: 'commercial',    name: 'Control Comercial',  icon: 'CreditCard',      group_name: 'Comercial', menu_order: 6 },
        { code: 'solicitudes',   name: 'Solicitudes',        icon: 'ClipboardList',   group_name: 'Operación', menu_order: 7 },
        { code: 'subscriptions', name: 'Suscripciones',      icon: 'FileText',        group_name: 'Comercial', menu_order: 8 },
        { code: 'config',        name: 'Configuración',      icon: 'Settings',        group_name: 'Admin',     menu_order: 9 },
        { code: 'reports',       name: 'Reportes',           icon: 'BarChart2',       group_name: 'Análisis',  menu_order: 10 },
    ];

    const moduleIds = {};
    for (const m of BASE_MODULES) {
        const r = await client.query(
            `INSERT INTO "${s}".modules (code, name, icon, group_name, menu_order, status, is_system_module)
             VALUES ($1,$2,$3,$4,$5,'activo',TRUE)
             ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [m.code, m.name, m.icon, m.group_name, m.menu_order]
        );
        moduleIds[m.code] = r.rows[0].id;
    }

    const BASE_PROFILES = [
        { code: 'acceso_total',  name: 'Acceso Total',          description: 'Acceso completo a todos los módulos', scope: 'global',  is_system: true },
        { code: 'admin_empresa', name: 'Administrador Empresa', description: 'Gestión completa del tenant',         scope: 'empresa', is_system: true },
        { code: 'supervisor',    name: 'Supervisor',            description: 'Supervisión y aprobaciones',          scope: 'empresa', is_system: false },
        { code: 'operacion',     name: 'Operación',             description: 'Acceso operativo estándar',           scope: 'empresa', is_system: false },
        { code: 'consulta',      name: 'Consulta',              description: 'Solo lectura',                        scope: 'empresa', is_system: false },
    ];

    const profileIds = {};
    for (const p of BASE_PROFILES) {
        const r = await client.query(
            `INSERT INTO "${s}".profiles (code, name, description, scope, is_system_profile)
             VALUES ($1,$2,$3,$4,$5)
             ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [p.code, p.name, p.description, p.scope, p.is_system]
        );
        profileIds[p.code] = r.rows[0].id;
    }

    // acceso_total: all modules, all permissions
    for (const moduleId of Object.values(moduleIds)) {
        await client.query(
            `INSERT INTO "${s}".profile_permissions
             (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
             VALUES ($1,$2,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE)
             ON CONFLICT (profile_id, module_id) DO NOTHING`,
            [profileIds['acceso_total'], moduleId]
        );
    }

    // admin_empresa: all except system modules admin
    for (const [code, moduleId] of Object.entries(moduleIds)) {
        const canAdmin = !['modules'].includes(code);
        const canDelete = !['modules','profiles'].includes(code);
        await client.query(
            `INSERT INTO "${s}".profile_permissions
             (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
             VALUES ($1,$2,TRUE,TRUE,TRUE,$3,TRUE,TRUE,$4)
             ON CONFLICT (profile_id, module_id) DO NOTHING`,
            [profileIds['admin_empresa'], moduleId, canDelete, canAdmin]
        );
    }

    // operacion: core operational modules only
    for (const code of ['dashboard', 'solicitudes', 'reports']) {
        if (!moduleIds[code]) continue;
        await client.query(
            `INSERT INTO "${s}".profile_permissions
             (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
             VALUES ($1,$2,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE)
             ON CONFLICT (profile_id, module_id) DO NOTHING`,
            [profileIds['operacion'], moduleIds[code]]
        );
    }

    // consulta: view only
    for (const code of ['dashboard', 'solicitudes', 'reports', 'companies']) {
        if (!moduleIds[code]) continue;
        await client.query(
            `INSERT INTO "${s}".profile_permissions
             (profile_id, module_id, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
             VALUES ($1,$2,TRUE,FALSE,FALSE,FALSE,FALSE,FALSE,FALSE)
             ON CONFLICT (profile_id, module_id) DO NOTHING`,
            [profileIds['consulta'], moduleIds[code]]
        );
    }
};

exports.getAllCompanies = async (req, res) => {
    try {
        if (req.user.is_super_admin) {
            const result = await db.query('SELECT * FROM public.companies ORDER BY created_at DESC');
            return res.json(result.rows);
        }

        // Company admins only see companies they are linked to
        const result = await db.query(
            `SELECT c.* FROM public.companies c
             JOIN public.company_users cu ON c.id = cu.company_id
             WHERE cu.user_id = $1
             ORDER BY c.created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Server error fetching companies' });
    }
};

exports.createCompany = async (req, res) => {
    const client = await db.getClient();
    
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { name, schema_name, rut, contact_email, contact_phone, address, country, plan_type } = req.body;

        // Basic validation
        if (!name || !schema_name || !contact_email || !country) {
            return res.status(400).json({ error: 'Name, Schema Name (unique), Contact Email, and Country are required' });
        }

        // Validate schema_name format (alphanumeric + underscore, lowercase)
        const schemaRegex = /^[a-z0-9_]+$/;
        if (!schemaRegex.test(schema_name)) {
            return res.status(400).json({ error: 'Schema name must be lowercase alphanumeric and underscores only' });
        }

        await client.query('BEGIN');

        // 1. Create Company Record in Public Schema
        const insertCompanyQuery = `
            INSERT INTO public.companies (name, schema_name, rut, contact_email, contact_phone, address, country, plan_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const companyResult = await client.query(insertCompanyQuery, [name, schema_name, rut, contact_email, contact_phone, address, country, plan_type || 'basic']);
        const newCompany = companyResult.rows[0];

        // 2. Create Schema
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);

        // 3. Run Tenant Template SQL
        const templatePath = path.join(__dirname, '../templates/tenant_schema.sql');
        await runSqlFile(templatePath, schema_name, client);

        // 3.5 Seed base roles, permissions and RBAC matrix for the new tenant
        await seedTenantRoles(schema_name, client);

        // 3.6 Seed modules, profiles and permission matrix
        await seedTenantExtended(schema_name, client);

        // 3.7 Initialize Tenant Config (Populate config_company)
        await client.query(`
            INSERT INTO "${schema_name}".config_company (company_name, country, rut, address, email, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [name, country, rut, address, contact_email, contact_phone]);

        // 4. Link Super Admin to company
        await client.query(`
            INSERT INTO public.company_users (company_id, user_id, is_company_admin)
            VALUES ($1, $2, TRUE)
        `, [newCompany.id, req.user.id]);

        // 5. Create dedicated admin user for this company (optional)
        const { admin_user } = req.body;
        let createdAdminUserId = null;

        if (admin_user && admin_user.email && admin_user.password) {
            const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;
            if (!PASSWORD_REGEX.test(admin_user.password)) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: 'La contraseña del administrador debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial'
                });
            }

            const fName = admin_user.first_name || '';
            const lName = admin_user.last_name || '';
            const displayName = `${fName} ${lName}`.trim() || admin_user.email;
            const passwordHash = await bcrypt.hash(admin_user.password, 10);

            // Check if user already exists
            let existingUser = await client.query(
                'SELECT id FROM public.users WHERE email = $1', [admin_user.email]
            );

            if (existingUser.rows.length > 0) {
                createdAdminUserId = existingUser.rows[0].id;
            } else {
                const newUserResult = await client.query(
                    `INSERT INTO public.users
                     (email, password_hash, full_name, first_name, last_name,
                      role, status, is_super_admin, is_active, is_system_user, created_by)
                     VALUES ($1,$2,$3,$4,$5,'admin','activo',FALSE,TRUE,FALSE,$6)
                     RETURNING id`,
                    [admin_user.email, passwordHash, displayName, fName, lName, req.user.id]
                );
                createdAdminUserId = newUserResult.rows[0].id;
            }

            // Link admin user to company
            await client.query(
                `INSERT INTO public.company_users (company_id, user_id, is_company_admin)
                 VALUES ($1, $2, TRUE)
                 ON CONFLICT (company_id, user_id) DO UPDATE SET is_company_admin = TRUE`,
                [newCompany.id, createdAdminUserId]
            );

            // Assign admin role in tenant schema
            const adminRole = await client.query(
                `SELECT id FROM "${schema_name}".roles WHERE name = 'admin' LIMIT 1`
            );
            if (adminRole.rows.length > 0) {
                await client.query(
                    `INSERT INTO "${schema_name}".user_profiles (user_id, role_id, is_active, status, job_title, access_level)
                     VALUES ($1, $2, TRUE, 'activo', 'Administrador', 'total')
                     ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
                    [createdAdminUserId, adminRole.rows[0].id]
                );
            }
        }

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Company and Schema created successfully',
            company: newCompany,
            adminUserId: createdAdminUserId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create company error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Schema name or other unique field already exists' });
        }
        
        res.status(500).json({ error: 'Server error creating company' });
    } finally {
        client.release();
    }
};

exports.getCompanyById = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if user has access: either super_admin or company admin of this company
        if (!req.user.is_super_admin) {
            const companyUserRes = await db.query(
                'SELECT company_id FROM public.company_users WHERE user_id = $1 AND is_company_admin = TRUE',
                [req.user.id]
            );
            
            const userCompanyIds = companyUserRes.rows.map(row => row.company_id);
            if (!userCompanyIds.includes(parseInt(id))) {
                return res.status(403).json({ error: 'Access denied. You can only view your own company.' });
            }
        }
        
        const result = await db.query('SELECT * FROM public.companies WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

exports.updateCompany = async (req, res) => {
     try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;
        const { name, rut, contact_email, contact_phone, address, country, plan_type, is_active } = req.body;

        const updateQuery = `
            UPDATE public.companies 
            SET name = COALESCE($1, name),
                rut = COALESCE($2, rut),
                contact_email = COALESCE($3, contact_email),
                contact_phone = COALESCE($4, contact_phone),
                address = COALESCE($5, address),
                country = COALESCE($6, country),
                plan_type = COALESCE($7, plan_type),
                is_active = COALESCE($8, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $9
            RETURNING *
        `;
        
        const result = await db.query(updateQuery, [name, rut, contact_email, contact_phone, address, country, plan_type, is_active, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        res.json(result.rows[0]);

     } catch (error) {
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Server error updating company' });
     }
};

exports.deleteCompany = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;

        // Check if super_admin is linked to this company (prevent self-deletion)
        const linkedCompanyRes = await client.query(
            'SELECT company_id FROM public.company_users WHERE user_id = $1 AND company_id = $2',
            [req.user.id, id]
        );
        
        if (linkedCompanyRes.rows.length > 0) {
            return res.status(403).json({ error: 'No puedes eliminar una empresa a la que estás asociado.' });
        }

        // Get company info
        const companyResult = await client.query(
            'SELECT id, schema_name, name FROM public.companies WHERE id = $1', [id]
        );
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const { schema_name, name } = companyResult.rows[0];

        await client.query('BEGIN');

        // 1. Drop the tenant schema and all its objects
        await client.query(`DROP SCHEMA IF EXISTS "${schema_name}" CASCADE`);

        // 2. Delete related records in public schema
        await client.query('DELETE FROM public.company_users WHERE company_id = $1', [id]);
        await client.query('DELETE FROM public.payments_history WHERE company_id = $1', [id]);
        await client.query('DELETE FROM public.invoices WHERE company_id = $1', [id]);
        await client.query('DELETE FROM public.payment_agreements WHERE company_id = $1', [id]);
        await client.query('DELETE FROM public.subscriptions WHERE company_id = $1', [id]);

        // 3. Delete the company record
        await client.query('DELETE FROM public.companies WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.status(204).send();

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete company error:', error);
        res.status(500).json({ error: 'Server error deleting company' });
    } finally {
        client.release();
    }
};
