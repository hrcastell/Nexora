const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { registerCompanyCoreModules } = require('./companyModulesController');

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

const normalizePlanCode = (value) =>
    typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;

const parsePlanId = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
};

const resolveSubscriptionPlan = async (client, { subscriptionPlanId, planCode }) => {
    if (subscriptionPlanId) {
        const byId = await client.query(
            'SELECT * FROM public.subscription_plans WHERE id = $1 AND is_active = TRUE',
            [subscriptionPlanId]
        );
        return byId.rows[0] || null;
    }

    if (planCode) {
        const byCode = await client.query(
            'SELECT * FROM public.subscription_plans WHERE code = $1 AND is_active = TRUE',
            [planCode]
        );
        return byCode.rows[0] || null;
    }

    return null;
};

const createAgreementFromPlan = async (client, { companyId, plan, createdBy, replaceActive = false }) => {
    if (!plan) return null;

    if (replaceActive) {
        await client.query(
            `UPDATE public.payment_agreements
             SET status = 'inactivo', updated_at = CURRENT_TIMESTAMP
             WHERE company_id = $1 AND status = 'activo'`,
            [companyId]
        );
    }

    const result = await client.query(
        `INSERT INTO public.payment_agreements
         (company_id, amount, currency, frequency, start_date, due_day,
          service_description, grace_period_days, status, created_by)
         VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7, 'activo', $8)
         RETURNING *`,
        [
            companyId,
            plan.amount,
            plan.currency || 'CLP',
            plan.payment_frequency || 'monthly',
            plan.due_day || 1,
            `Suscripcion plan ${plan.name}`,
            plan.grace_period_days || 5,
            createdBy
        ]
    );

    return result.rows[0];
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

// Seed profiles and transaction permission matrix for a new tenant.
// Modules are global now:
// - public.module_catalog owns the module catalog
// - public.company_modules owns company/module assignments
// Do not seed tenant-local modules/profile_permissions here; those legacy
// tables are intentionally not created by tenant_schema.sql.
const GARAGE_TRANSACTION_CODES = [
    'garage_dashboard',
    'garage_customers',
    'garage_vehicles',
    'garage_appointments',
    'garage_work_orders',
    'garage_employees',
    'garage_labor_rates',
    'garage_products',
    'garage_service_templates',
    'garage_vehicle_history',
    'garage_catalogs',
    'garage_settings',
];

const buildTransactionFlags = (codes, flags) =>
    Object.fromEntries(codes.map(code => [code, flags]));

const seedTenantExtended = async (schemaName, client) => {
    const s = schemaName;

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

    // ── profile_transaction_permissions ──────────────────────────────────────
    // Modelo nuevo: permisos por transacción del catálogo global.
    // Códigos de transacción = public.module_transactions.code (migración 05).
    // [can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin]
    const txMatrix = {
        acceso_total: {
            dashboard:     [true,  true,  true,  true,  true,  true,  true],
            companies:     [true,  true,  true,  true,  true,  true,  true],
            requests:      [true,  true,  true,  true,  true,  true,  true],
            users:         [true,  true,  true,  true,  true,  true,  true],
            profiles:      [true,  true,  true,  true,  true,  true,  true],
            modules:       [true,  true,  true,  true,  true,  true,  true],
            reports:       [true,  true,  true,  true,  true,  true,  true],
            commercial:    [true,  true,  true,  true,  true,  true,  true],
            subscriptions: [true,  true,  true,  true,  true,  true,  true],
            visual_config: [true,  true,  true,  true,  true,  true,  true],
            ...buildTransactionFlags(GARAGE_TRANSACTION_CODES, [true, true, true, true, true, true, true]),
        },
        admin_empresa: {
            dashboard:     [true,  true,  true,  false, true,  true,  false],
            companies:     [true,  true,  true,  false, true,  true,  false],
            requests:      [true,  true,  true,  false, true,  true,  false],
            users:         [true,  true,  true,  true,  true,  true,  false],
            profiles:      [true,  true,  true,  false, true,  true,  false],
            modules:       [true,  false, false, false, false, false, false],
            reports:       [true,  false, false, false, true,  true,  false],
            commercial:    [true,  true,  true,  false, true,  true,  false],
            subscriptions: [true,  false, false, false, false, true,  false],
            visual_config: [true,  false, true,  false, false, false, false],
            ...buildTransactionFlags(GARAGE_TRANSACTION_CODES, [true, true, true, true, true, true, true]),
        },
        supervisor: {
            dashboard:     [true,  false, false, false, false, true,  false],
            companies:     [true,  false, false, false, true,  false, false],
            requests:      [true,  false, false, false, true,  true,  false],
            users:         [true,  false, false, false, false, false, false],
            profiles:      [true,  false, false, false, false, false, false],
            modules:       [true,  false, false, false, false, false, false],
            reports:       [true,  false, false, false, true,  true,  false],
            commercial:    [true,  false, false, false, true,  true,  false],
            subscriptions: [true,  false, false, false, false, true,  false],
            visual_config: [true,  false, false, false, false, false, false],
        },
        operacion: {
            dashboard:     [true,  false, false, false, false, false, false],
            requests:      [true,  true,  true,  false, false, false, false],
            reports:       [true,  false, false, false, false, true,  false],
            visual_config: [true,  false, false, false, false, false, false],
        },
        consulta: {
            dashboard:     [true,  false, false, false, false, false, false],
            companies:     [true,  false, false, false, false, false, false],
            requests:      [true,  false, false, false, false, false, false],
            reports:       [true,  false, false, false, false, true,  false],
        },
    };

    for (const [profileCode, txPerms] of Object.entries(txMatrix)) {
        const profileId = profileIds[profileCode];
        if (!profileId) continue;
        for (const [txCode, p] of Object.entries(txPerms)) {
            await client.query(
                `INSERT INTO "${s}".profile_transaction_permissions
                 (profile_id, transaction_code, can_view, can_create, can_edit, can_delete, can_approve, can_export, can_admin)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (profile_id, transaction_code) DO NOTHING`,
                [profileId, txCode, ...p]
            );
        }
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
    let creationStep = 'initializing';
    
    try {
        creationStep = 'authorizing user';
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { name, schema_name, rut, contact_email, contact_phone, address, country, plan_type, subscription_plan_id } = req.body;
        const hasSubscriptionPlanField = Object.prototype.hasOwnProperty.call(req.body, 'subscription_plan_id');
        const requestedPlanId = parsePlanId(subscription_plan_id);
        const requestedPlanCode = normalizePlanCode(plan_type);

        // Basic validation
        if (!name || !schema_name || !contact_email || !country) {
            return res.status(400).json({ error: 'Name, Schema Name (unique), Contact Email, and Country are required' });
        }

        // Validate schema_name format (alphanumeric + underscore, lowercase)
        const schemaRegex = /^[a-z0-9_]+$/;
        if (!schemaRegex.test(schema_name)) {
            return res.status(400).json({ error: 'Schema name must be lowercase alphanumeric and underscores only' });
        }

        creationStep = 'starting transaction';
        await client.query('BEGIN');

        let selectedPlan = null;
        if (hasSubscriptionPlanField) {
            if (subscription_plan_id !== null && subscription_plan_id !== '' && !requestedPlanId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El plan de suscripcion seleccionado no es valido.' });
            }
            if (requestedPlanId) {
                creationStep = 'resolving subscription plan by id';
                selectedPlan = await resolveSubscriptionPlan(client, { subscriptionPlanId: requestedPlanId });
                if (!selectedPlan) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'El plan de suscripcion seleccionado no existe o esta inactivo.' });
                }
            }
        } else if (requestedPlanCode && requestedPlanCode !== 'none') {
            creationStep = 'resolving subscription plan by code';
            selectedPlan = await resolveSubscriptionPlan(client, { planCode: requestedPlanCode });
            if (!selectedPlan) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El codigo de plan de suscripcion no existe o esta inactivo.' });
            }
        }

        const finalPlanType = selectedPlan?.code || (requestedPlanCode && requestedPlanCode !== 'none' ? requestedPlanCode : 'none');
        const finalSubscriptionPlanId = selectedPlan?.id || null;

        // 1. Create Company Record in Public Schema
        creationStep = 'inserting public company';
        const insertCompanyQuery = `
            INSERT INTO public.companies (name, schema_name, rut, contact_email, contact_phone, address, country, plan_type, subscription_plan_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        const companyResult = await client.query(insertCompanyQuery, [
            name,
            schema_name,
            rut,
            contact_email,
            contact_phone,
            address,
            country,
            finalPlanType,
            finalSubscriptionPlanId
        ]);
        const newCompany = companyResult.rows[0];

        // 1.5 Auto-create payment agreement from selected subscription plan
        if (selectedPlan) {
            creationStep = 'creating payment agreement from plan';
            await createAgreementFromPlan(client, {
                companyId: newCompany.id,
                plan: selectedPlan,
                createdBy: req.user.id,
                replaceActive: false
            });
        }
        // 2. Create Schema
        creationStep = 'creating tenant schema';
        await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema_name}"`);

        // 3. Run Tenant Template SQL
        creationStep = 'running tenant schema template';
        const templatePath = path.join(__dirname, '../templates/tenant_schema.sql');
        await runSqlFile(templatePath, schema_name, client);

        // 3.5 Seed base roles, permissions and RBAC matrix for the new tenant
        creationStep = 'seeding tenant roles';
        await seedTenantRoles(schema_name, client);

        // 3.6 Seed profiles and transaction permission matrix
        creationStep = 'seeding tenant profiles and transaction permissions';
        await seedTenantExtended(schema_name, client);

        // 3.6.1 Register core modules (dashboard + configuration) in public.company_modules
        creationStep = 'registering core company modules';
        await registerCompanyCoreModules(newCompany.id, client);

        // 3.7 Initialize Tenant Config (Populate config_company)
        creationStep = 'initializing tenant config_company';
        await client.query(`
            INSERT INTO "${schema_name}".config_company (company_name, country, rut, address, email, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [name, country, rut, address, contact_email, contact_phone]);

        // 4. Link Super Admin to company
        creationStep = 'linking super admin to company';
        await client.query(`
            INSERT INTO public.company_users (company_id, user_id, is_company_admin)
            VALUES ($1, $2, TRUE)
        `, [newCompany.id, req.user.id]);

        // 5. Create dedicated admin user for this company (optional)
        const { admin_user } = req.body;
        let createdAdminUserId = null;

        if (admin_user && admin_user.email && admin_user.password) {
            creationStep = 'validating dedicated admin user';
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
            creationStep = 'checking dedicated admin user';
            let existingUser = await client.query(
                'SELECT id FROM public.users WHERE email = $1', [admin_user.email]
            );

            if (existingUser.rows.length > 0) {
                createdAdminUserId = existingUser.rows[0].id;
            } else {
                creationStep = 'creating dedicated admin user';
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
            creationStep = 'linking dedicated admin user to company';
            await client.query(
                `INSERT INTO public.company_users (company_id, user_id, is_company_admin)
                 VALUES ($1, $2, TRUE)
                 ON CONFLICT (company_id, user_id) DO UPDATE SET is_company_admin = TRUE`,
                [newCompany.id, createdAdminUserId]
            );

            // Assign admin role in tenant schema
            creationStep = 'assigning dedicated admin tenant role';
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

            creationStep = 'assigning dedicated admin tenant profile';
            const adminEmpresaProfile = await client.query(
                `SELECT id FROM "${schema_name}".profiles WHERE code = 'admin_empresa' LIMIT 1`
            );
            if (adminEmpresaProfile.rows.length > 0) {
                await client.query(
                    `INSERT INTO "${schema_name}".user_tenant_profiles (user_id, profile_id, is_primary, assigned_by)
                     VALUES ($1, $2, TRUE, $3)
                     ON CONFLICT (user_id, profile_id) DO UPDATE SET is_primary = TRUE`,
                    [createdAdminUserId, adminEmpresaProfile.rows[0].id, req.user.id]
                );
            }
        }

        creationStep = 'committing transaction';
        await client.query('COMMIT');

        res.status(201).json({
            message: 'Company and Schema created successfully',
            company: newCompany,
            adminUserId: createdAdminUserId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Create company error:', {
            step: creationStep,
            message: error.message,
            code: error.code,
            detail: error.detail,
            table: error.table,
            schema: error.schema,
            constraint: error.constraint,
            stack: error.stack
        });
        
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Schema name or other unique field already exists' });
        }
        
        const response = { error: 'Server error creating company' };
        if (req.user?.is_super_admin) {
            response.debug = {
                step: creationStep,
                message: error.message,
                code: error.code,
                detail: error.detail,
                table: error.table,
                schema: error.schema,
                constraint: error.constraint
            };
        }

        res.status(500).json(response);
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
    const client = await db.getClient();
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;
        const { name, rut, contact_email, contact_phone, address, country, plan_type, is_active, subscription_plan_id } = req.body;

        const hasSubscriptionPlanField = Object.prototype.hasOwnProperty.call(req.body, 'subscription_plan_id');
        const requestedPlanId = parsePlanId(subscription_plan_id);
        const requestedPlanCode = normalizePlanCode(plan_type);
        const shouldUpdatePlan = hasSubscriptionPlanField || requestedPlanCode !== null;

        await client.query('BEGIN');

        const currentCompanyRes = await client.query('SELECT * FROM public.companies WHERE id = $1', [id]);
        if (currentCompanyRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Company not found' });
        }
        const currentCompany = currentCompanyRes.rows[0];

        // Prevent deactivating the master schema
        if (is_active === false && currentCompany.is_master) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'El schema maestro (hernancius) no puede ser desactivado.' });
        }

        let selectedPlan = null;
        if (hasSubscriptionPlanField) {
            if (subscription_plan_id !== null && subscription_plan_id !== '' && !requestedPlanId) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El plan de suscripcion seleccionado no es valido.' });
            }
            if (requestedPlanId) {
                selectedPlan = await resolveSubscriptionPlan(client, { subscriptionPlanId: requestedPlanId });
                if (!selectedPlan) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'El plan de suscripcion seleccionado no existe o esta inactivo.' });
                }
            }
        } else if (requestedPlanCode && requestedPlanCode !== 'none') {
            selectedPlan = await resolveSubscriptionPlan(client, { planCode: requestedPlanCode });
            if (!selectedPlan) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'El codigo de plan de suscripcion no existe o esta inactivo.' });
            }
        }

        const finalPlanType = selectedPlan?.code || (requestedPlanCode && requestedPlanCode !== 'none' ? requestedPlanCode : 'none');
        const finalSubscriptionPlanId = selectedPlan?.id || null;

        const updateQuery = `
            UPDATE public.companies
            SET name = COALESCE($1, name),
                rut = COALESCE($2, rut),
                contact_email = COALESCE($3, contact_email),
                contact_phone = COALESCE($4, contact_phone),
                address = COALESCE($5, address),
                country = COALESCE($6, country),
                plan_type = CASE WHEN $11 THEN $7 ELSE plan_type END,
                is_active = COALESCE($8, is_active),
                subscription_plan_id = CASE WHEN $12 THEN $9 ELSE subscription_plan_id END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const result = await client.query(updateQuery, [
            name,
            rut,
            contact_email,
            contact_phone,
            address,
            country,
            finalPlanType,
            is_active,
            finalSubscriptionPlanId,
            id,
            shouldUpdatePlan,
            shouldUpdatePlan
        ]);

        const updatedCompany = result.rows[0];

        const previousPlanId = currentCompany.subscription_plan_id ? Number(currentCompany.subscription_plan_id) : null;
        const nextPlanId = updatedCompany.subscription_plan_id ? Number(updatedCompany.subscription_plan_id) : null;
        const planChanged = previousPlanId !== nextPlanId;

        if (selectedPlan && planChanged) {
            await createAgreementFromPlan(client, {
                companyId: updatedCompany.id,
                plan: selectedPlan,
                createdBy: req.user.id,
                replaceActive: true
            });
        }

        await client.query('COMMIT');
        res.json(updatedCompany);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update company error:', error);
        res.status(500).json({ error: 'Server error updating company' });
    } finally {
        client.release();
    }
};
exports.deleteCompany = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id } = req.params;

        // Prevent deleting the company currently active in the JWT session
        if (String(req.user.company_id) === String(id)) {
            return res.status(403).json({ error: 'No puedes eliminar la empresa en la que estás actualmente activo. Cambia de empresa e inténtalo de nuevo.' });
        }

        // Get company info
        const companyResult = await client.query(
            'SELECT id, schema_name, name, is_master FROM public.companies WHERE id = $1', [id]
        );
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // Protect master schema
        if (companyResult.rows[0].is_master) {
            return res.status(403).json({ error: 'El schema maestro (hernancius) no puede ser eliminado.' });
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


