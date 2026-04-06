const db = require('../config/db');
const bcrypt = require('bcryptjs');

// GET /users — List all users across all companies (super_admin only)
exports.getAllUsers = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const result = await db.query(
            `SELECT u.id, u.email, u.full_name, u.is_active, u.is_super_admin, u.created_at,
                    COUNT(cu.company_id) AS company_count
             FROM public.users u
             LEFT JOIN public.company_users cu ON u.id = cu.user_id
             GROUP BY u.id
             ORDER BY u.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// GET /companies/:id/users — List users of a company with tenant role
exports.getCompanyUsers = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id: companyId } = req.params;

        const companyResult = await db.query('SELECT schema_name FROM public.companies WHERE id = $1', [companyId]);
        if (companyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }
        const schemaName = companyResult.rows[0].schema_name;

        const result = await db.query(
            `SELECT u.id, u.email, u.full_name, u.is_active, u.created_at,
                    cu.is_company_admin, cu.id as company_user_id,
                    up.role_id, r.name as role_name
             FROM public.users u
             JOIN public.company_users cu ON u.id = cu.user_id
             LEFT JOIN "${schemaName}".user_profiles up ON u.id = up.user_id
             LEFT JOIN "${schemaName}".roles r ON up.role_id = r.id
             WHERE cu.company_id = $1
             ORDER BY cu.is_company_admin DESC, u.full_name ASC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Get company users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// POST /companies/:id/users — Invite (create + link) a user to a company
exports.inviteUser = async (req, res) => {
    const client = await db.getClient();
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id: companyId } = req.params;
        const { email, full_name, password, is_company_admin, role_id } = req.body;

        if (!email || !full_name || !password) {
            return res.status(400).json({ error: 'Email, full name and password are required' });
        }

        await client.query('BEGIN');

        // Get company schema for user_profiles linkage
        const companyResult = await client.query('SELECT schema_name FROM public.companies WHERE id = $1', [companyId]);
        if (companyResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Company not found' });
        }
        const schemaName = companyResult.rows[0].schema_name;

        // Check if user already exists
        let userResult = await client.query(
            'SELECT id FROM public.users WHERE email = $1',
            [email]
        );

        let userId;

        if (userResult.rows.length > 0) {
            userId = userResult.rows[0].id;
        } else {
            // Create user
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await client.query(
                `INSERT INTO public.users (email, password_hash, full_name, is_super_admin, is_active)
                 VALUES ($1, $2, $3, FALSE, TRUE)
                 RETURNING id`,
                [email, passwordHash, full_name]
            );
            userId = newUser.rows[0].id;
        }

        // Check if already linked to this company
        const existingLink = await client.query(
            'SELECT id FROM public.company_users WHERE company_id = $1 AND user_id = $2',
            [companyId, userId]
        );

        if (existingLink.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'User is already linked to this company' });
        }

        // Link user to company
        await client.query(
            `INSERT INTO public.company_users (company_id, user_id, is_company_admin)
             VALUES ($1, $2, $3)`,
            [companyId, userId, is_company_admin || false]
        );

        // Create or update user_profiles in tenant schema with assigned role
        let assignedRoleId = role_id || null;
        if (!assignedRoleId) {
            const defaultRole = await client.query(
                `SELECT id FROM "${schemaName}".roles WHERE name = 'user' LIMIT 1`
            );
            if (defaultRole.rows.length > 0) assignedRoleId = defaultRole.rows[0].id;
        }
        if (assignedRoleId) {
            await client.query(
                `INSERT INTO "${schemaName}".user_profiles (user_id, role_id, is_active)
                 VALUES ($1, $2, TRUE)
                 ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
                [userId, assignedRoleId]
            );
        }

        await client.query('COMMIT');

        res.status(201).json({ message: 'User invited successfully', userId });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Invite user error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Email already in use' });
        }
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
};

// PUT /companies/:id/users/:userId — Update user link (admin role, active status)
exports.updateCompanyUser = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id: companyId, userId } = req.params;
        const { is_company_admin, is_active, role_id } = req.body;

        // Update company_users role
        if (is_company_admin !== undefined) {
            await db.query(
                `UPDATE public.company_users SET is_company_admin = $1
                 WHERE company_id = $2 AND user_id = $3`,
                [is_company_admin, companyId, userId]
            );
        }

        // Update user active status
        if (is_active !== undefined) {
            await db.query(
                'UPDATE public.users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [is_active, userId]
            );
        }

        // Update tenant role in user_profiles
        if (role_id !== undefined) {
            const companyRes = await db.query('SELECT schema_name FROM public.companies WHERE id = $1', [companyId]);
            if (companyRes.rows.length > 0) {
                const schemaName = companyRes.rows[0].schema_name;
                await db.query(
                    `INSERT INTO "${schemaName}".user_profiles (user_id, role_id, is_active)
                     VALUES ($1, $2, TRUE)
                     ON CONFLICT (user_id) DO UPDATE SET role_id = EXCLUDED.role_id`,
                    [userId, role_id]
                );
            }
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update company user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// DELETE /companies/:id/users/:userId — Remove user from company
exports.removeCompanyUser = async (req, res) => {
    try {
        if (!req.user.is_super_admin) {
            return res.status(403).json({ error: 'Access denied. Super Admin only.' });
        }

        const { id: companyId, userId } = req.params;

        const result = await db.query(
            'DELETE FROM public.company_users WHERE company_id = $1 AND user_id = $2 RETURNING id',
            [companyId, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in this company' });
        }

        res.json({ message: 'User removed from company' });
    } catch (error) {
        console.error('Remove company user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
