const db = require('../config/db');
const fs = require('fs');
const path = require('path');

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

exports.getAllCompanies = async (req, res) => {
    try {
        // Only Super Admin should see all companies or maybe filtered?
        // For now, assuming Super Admin access based on requirements
        if (!req.user.is_super_admin) {
             return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const result = await db.query('SELECT * FROM public.companies ORDER BY created_at DESC');
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

        // 3.5 Initialize Tenant Config (Populate config_company)
        await client.query(`
            INSERT INTO "${schema_name}".config_company (company_name, country, rut, address, email, phone)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [name, country, rut, address, contact_email, contact_phone]);

        // 4. Create Initial Admin User for this Company (Optional: Reuse the creator or create a new one?)
        // Strategy: Link the current Super Admin as a user in this company too, so they can manage it.
        // Also, usually we might invite a new user. For now, let's just link the Super Admin.
        await client.query(`
            INSERT INTO public.company_users (company_id, user_id, is_company_admin)
            VALUES ($1, $2, TRUE)
        `, [newCompany.id, req.user.id]);

        await client.query('COMMIT');

        res.status(201).json({ message: 'Company and Schema created successfully', company: newCompany });

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
