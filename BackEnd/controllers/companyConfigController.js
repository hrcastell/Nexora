const db = require('../config/db');

// GET /companies/:id/config — Get tenant config_company (branding)
exports.getCompanyConfig = async (req, res) => {
    try {
        const { id: companyId } = req.params;

        // Get schema_name from public.companies
        const companyResult = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const { schema_name } = companyResult.rows[0];

        const result = await db.query(
            `SELECT * FROM "${schema_name}".config_company LIMIT 1`
        );

        if (result.rows.length === 0) {
            return res.json(null);
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get company config error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// PUT /companies/:id/config — Update tenant config_company (branding)
exports.updateCompanyConfig = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id: companyId } = req.params;
        const { company_name, country, rut, address, email, phone, logo_url, primary_color, secondary_color, font_family } = req.body;

        // Get schema_name
        const companyResult = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const { schema_name } = companyResult.rows[0];

        // Check if config row exists
        const existing = await db.query(
            `SELECT id FROM "${schema_name}".config_company LIMIT 1`
        );

        let result;
        if (existing.rows.length > 0) {
            const existingId = existing.rows[0].id;
            result = await db.query(
                `UPDATE "${schema_name}".config_company SET
                   company_name    = COALESCE($1, company_name),
                   country         = COALESCE($2, country),
                   rut             = COALESCE($3, rut),
                   address         = COALESCE($4, address),
                   email           = COALESCE($5, email),
                   phone           = COALESCE($6, phone),
                   logo_url        = COALESCE($7, logo_url),
                   primary_color   = COALESCE($8, primary_color),
                   secondary_color = COALESCE($9, secondary_color),
                   font_family     = COALESCE($10, font_family),
                   updated_at      = CURRENT_TIMESTAMP
                 WHERE id = $11
                 RETURNING *`,
                [company_name, country, rut, address, email, phone, logo_url, primary_color, secondary_color, font_family, existingId]
            );
        } else {
            result = await db.query(
                `INSERT INTO "${schema_name}".config_company 
                 (company_name, country, rut, address, email, phone, logo_url, primary_color, secondary_color, font_family)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING *`,
                [company_name, country, rut, address, email, phone, logo_url, primary_color, secondary_color, font_family]
            );
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update company config error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /companies/:id/roles — List roles from tenant schema
exports.getCompanyRoles = async (req, res) => {
    try {
        const { id: companyId } = req.params;

        const companyResult = await db.query(
            'SELECT schema_name FROM public.companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const { schema_name } = companyResult.rows[0];

        const result = await db.query(
            `SELECT * FROM "${schema_name}".roles ORDER BY is_system_role DESC, name ASC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get company roles error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
