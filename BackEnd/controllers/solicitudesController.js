const db = require('../config/db');

exports.getAllSolicitudes = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const result = await db.query('SELECT * FROM public.solicitudes ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Get solicitudes error:', error);
        res.status(500).json({ error: 'Server error fetching solicitudes' });
    }
};

exports.createSolicitud = async (req, res) => {
    // This might be a public endpoint in the future (from website), 
    // but for now let's assume it's protected or we need to add a public route later.
    // Given the prompt, "requests coming from the website", this endpoint should probably NOT require auth if called from the public site.
    // However, the current requirements are about the SaaS admin managing them.
    // I will add a public create endpoint and a protected management endpoint.
    
    try {
        const { company_name, contact_name, email, phone, message } = req.body;

        if (!company_name || !contact_name || !email) {
            return res.status(400).json({ error: 'Required fields missing' });
        }

        const result = await db.query(
            `INSERT INTO public.solicitudes 
            (company_name, contact_name, email, phone, message, status) 
            VALUES ($1, $2, $3, $4, $5, 'new') 
            RETURNING *`,
            [company_name, contact_name, email, phone, message]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Create solicitud error:', error);
        res.status(500).json({ error: 'Server error creating solicitud' });
    }
};

exports.updateSolicitudStatus = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        const { id } = req.params;
        const { status, admin_notes } = req.body;

        const result = await db.query(
            `UPDATE public.solicitudes 
             SET status = COALESCE($1, status), 
                 admin_notes = COALESCE($2, admin_notes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [status, admin_notes, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Solicitud not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Update solicitud error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
