const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /garage/labor-rates
 * Query: ?employee_id=N, ?status=active|inactive|all
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { employee_id, status = 'active' } = req.query;

        const params = [];
        const conditions = [];

        if (status !== 'all') {
            params.push(status);
            conditions.push(`r.status = $${params.length}`);
        }
        if (employee_id) {
            params.push(employee_id);
            conditions.push(`r.employee_id = $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await db.query(
            `SELECT r.*, e.first_name || ' ' || COALESCE(e.last_name, '') AS employee_name
             FROM ${schema}.employee_labor_rates r
             JOIN ${schema}.employees e ON e.id = r.employee_id
             ${where}
             ORDER BY e.first_name ASC, r.valid_from DESC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('laborRatesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al listar tarifas' });
    }
};

/**
 * GET /garage/labor-rates/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT r.*, e.first_name || ' ' || COALESCE(e.last_name, '') AS employee_name
             FROM ${schema}.employee_labor_rates r
             JOIN ${schema}.employees e ON e.id = r.employee_id
             WHERE r.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tarifa no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('laborRatesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener tarifa' });
    }
};

/**
 * GET /garage/employees/:employeeId/labor-rates
 */
exports.listByEmployee = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(
            `SELECT * FROM ${schema}.employee_labor_rates
             WHERE employee_id = $1
             ORDER BY valid_from DESC`,
            [req.params.employeeId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('laborRatesController.listByEmployee error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener tarifas del empleado' });
    }
};

/**
 * POST /garage/labor-rates
 * Valida que no se solapen fechas activas para el mismo empleado.
 */
exports.create = async (req, res) => {
    const client = await require('../../config/db').getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { employee_id, rate_name, hourly_rate, currency = 'CLP', valid_from, valid_to } = req.body;

        if (!employee_id) return res.status(400).json({ error: 'employee_id es requerido' });
        if (!rate_name?.trim()) return res.status(400).json({ error: 'rate_name es requerido' });
        if (hourly_rate == null || isNaN(Number(hourly_rate))) return res.status(400).json({ error: 'hourly_rate debe ser un número válido' });

        await client.query('BEGIN');

        // Verificar solapamiento de fechas para el mismo empleado
        const overlap = await client.query(
            `SELECT id FROM ${schema}.employee_labor_rates
             WHERE employee_id = $1
               AND status = 'active'
               AND id != COALESCE($2, -1)
               AND (
                 (valid_to IS NULL)
                 OR ($3::date IS NULL OR valid_to >= $3::date)
               )
               AND (
                 ($4::date IS NULL OR valid_from <= $4::date)
               )`,
            [employee_id, null, valid_from || null, valid_to || null]
        );

        if (overlap.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Ya existe una tarifa activa que se solapa con el período indicado. Cierra la tarifa anterior antes de crear una nueva.' });
        }

        const result = await client.query(
            `INSERT INTO ${schema}.employee_labor_rates (employee_id, rate_name, hourly_rate, currency, valid_from, valid_to)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [employee_id, rate_name.trim(), Number(hourly_rate), currency, valid_from || new Date().toISOString().split('T')[0], valid_to || null]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('laborRatesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al crear tarifa' });
    } finally {
        client.release();
    }
};

/**
 * PUT /garage/labor-rates/:id
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { rate_name, hourly_rate, currency, valid_from, valid_to } = req.body;

        if (!rate_name?.trim()) return res.status(400).json({ error: 'rate_name es requerido' });

        const result = await db.query(
            `UPDATE ${schema}.employee_labor_rates
             SET rate_name=$1, hourly_rate=$2, currency=$3, valid_from=$4, valid_to=$5, updated_at=CURRENT_TIMESTAMP
             WHERE id=$6 RETURNING *`,
            [rate_name.trim(), Number(hourly_rate), currency || 'CLP', valid_from || null, valid_to || null, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tarifa no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('laborRatesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al actualizar tarifa' });
    }
};

/**
 * PATCH /garage/labor-rates/:id/status
 */
exports.toggleStatus = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const { status } = req.body;
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ error: 'status debe ser active o inactive' });

        const result = await db.query(
            `UPDATE ${schema}.employee_labor_rates SET status=$1, updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING id, status`,
            [status, req.params.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Tarifa no encontrada' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('laborRatesController.toggleStatus error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al cambiar estado' });
    }
};
