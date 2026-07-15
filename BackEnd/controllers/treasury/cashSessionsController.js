const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { createNotification } = require('../../utils/notifications');

const MOVEMENT_TYPES = [
    'sale_in',
    'payment_out',
    'deposit_out',
    'withdrawal_out',
    'adjustment_in',
    'adjustment_out'
];

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function isNonNegativeAmount(value) {
    return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) >= 0;
}

exports.open = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user && req.user.read_only) {
            return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        }

        const { cash_register_id, employee_id, opening_amount } = req.body;
        if (!isPositiveInteger(cash_register_id) || !isPositiveInteger(employee_id) || !isNonNegativeAmount(opening_amount)) {
            return res.status(400).json({ error: 'cash_register_id, employee_id y opening_amount válidos son requeridos' });
        }

        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');

        const register = await client.query(
            `SELECT id FROM ${schema}.treasury_cash_registers WHERE id = $1 AND status = 'active' FOR UPDATE`,
            [cash_register_id]
        );
        if (!register.rows.length) throw createError('Caja activa no encontrada', 404);

        const employee = await client.query(
            `SELECT id FROM ${schema}.employees WHERE id = $1`,
            [employee_id]
        );
        if (!employee.rows.length) throw createError('Cajero no encontrado', 404);

        const openSession = await client.query(
            `SELECT id FROM ${schema}.treasury_cash_sessions WHERE cash_register_id = $1 AND status = 'open'`,
            [cash_register_id]
        );
        if (openSession.rows.length) throw createError('La caja ya tiene una sesión abierta', 409);

        const result = await client.query(
            `INSERT INTO ${schema}.treasury_cash_sessions
             (tenant_id, cash_register_id, employee_id, opened_at, opening_amount, status)
             VALUES ($1, $2, $3, NOW(), $4, 'open')
             RETURNING *`,
            [companyId, cash_register_id, employee_id, Number(opening_amount)]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('cashSessionsController.open error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible abrir la sesión de caja' });
    } finally {
        client.release();
    }
};

exports.recordMovement = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user && req.user.read_only) {
            return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        }

        const { cash_register_id, movement_type, amount, signed_amount, currency, notes, reference_table, reference_id } = req.body;
        if (!isPositiveInteger(cash_register_id) || !MOVEMENT_TYPES.includes(movement_type) || !isNonNegativeAmount(amount) || !Number.isFinite(Number(signed_amount))) {
            return res.status(400).json({ error: 'Datos de movimiento de caja inválidos' });
        }
        if (reference_id !== undefined && reference_id !== null && !isPositiveInteger(reference_id)) {
            return res.status(400).json({ error: 'reference_id debe ser un entero positivo' });
        }

        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        const session = await client.query(
            `SELECT id FROM ${schema}.treasury_cash_sessions
             WHERE cash_register_id = $1 AND status = 'open'
             FOR UPDATE`,
            [cash_register_id]
        );
        if (!session.rows.length) throw createError('La caja no tiene una sesión abierta', 409);

        const result = await client.query(
            `INSERT INTO ${schema}.treasury_cash_movements
             (tenant_id, cash_session_id, movement_type, reference_table, reference_id, amount, currency, signed_amount, notes, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING *`,
            [
                companyId,
                session.rows[0].id,
                movement_type,
                reference_table || null,
                reference_id || null,
                Number(amount),
                currency || 'CLP',
                Number(signed_amount),
                notes || null,
                req.user.id
            ]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('cashSessionsController.recordMovement error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible registrar el movimiento de caja' });
    } finally {
        client.release();
    }
};

exports.close = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user && req.user.read_only) {
            return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        }
        if (!isNonNegativeAmount(req.body.counted_amount)) {
            return res.status(400).json({ error: 'counted_amount válido es requerido' });
        }

        const { schema, companyId } = await resolveSchema(req);
        await client.query('BEGIN');
        const sessionResult = await client.query(
            `SELECT * FROM ${schema}.treasury_cash_sessions WHERE id = $1 FOR UPDATE`,
            [req.params.id]
        );
        if (!sessionResult.rows.length) throw createError('Sesión de caja no encontrada', 404);

        const session = sessionResult.rows[0];
        if (session.status !== 'open') throw createError('La sesión de caja ya está cerrada', 409);

        const countedAmount = Number(req.body.counted_amount);
        const result = await client.query(
            `UPDATE ${schema}.treasury_cash_sessions
             SET expected_amount = opening_amount + COALESCE((
                    SELECT SUM(signed_amount)
                    FROM ${schema}.treasury_cash_movements
                    WHERE cash_session_id = $1
                 ), 0),
                 counted_amount = $2,
                 difference_amount = $2 - opening_amount - COALESCE((
                    SELECT SUM(signed_amount)
                    FROM ${schema}.treasury_cash_movements
                    WHERE cash_session_id = $1
                 ), 0),
                 status = 'closed', closed_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [session.id, countedAmount]
        );
        const differenceAmount = Number(result.rows[0].difference_amount);

        await client.query('COMMIT');

        if (differenceAmount !== 0) {
            await createNotification({
                userId: req.user.id,
                companyId,
                type: 'warning',
                category: 'treasury_collections',
                title: 'Diferencia de caja detectada',
                body: `La sesión de caja ${session.id} se cerró con una diferencia de ${differenceAmount.toFixed(2)}.`,
                actionUrl: `/treasury/cash-sessions/${session.id}`
            });
        }

        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('cashSessionsController.close error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible cerrar la sesión de caja' });
    } finally {
        client.release();
    }
};

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { status } = req.query;
        const params = [];
        let where = '';
        if (status && ['open', 'closed'].includes(status)) {
            params.push(status);
            where = 'WHERE cs.status = $1';
        }
        const result = await db.query(
            `SELECT cs.*, cr.code AS cash_register_code, cr.name AS cash_register_name,
                    e.first_name || ' ' || e.last_name AS employee_name
             FROM ${schema}.treasury_cash_sessions cs
             JOIN ${schema}.treasury_cash_registers cr ON cr.id = cs.cash_register_id
             JOIN ${schema}.employees e ON e.id = cs.employee_id
             ${where}
             ORDER BY cs.opened_at DESC`,
            params
        );
        res.json(result.rows);
    } catch (err) {
        console.error('cashSessionsController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar las sesiones de caja' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const session = await db.query(
            `SELECT cs.*, cr.code AS cash_register_code, cr.name AS cash_register_name,
                    e.first_name || ' ' || e.last_name AS employee_name
             FROM ${schema}.treasury_cash_sessions cs
             JOIN ${schema}.treasury_cash_registers cr ON cr.id = cs.cash_register_id
             JOIN ${schema}.employees e ON e.id = cs.employee_id
             WHERE cs.id = $1`,
            [req.params.id]
        );
        if (!session.rows.length) return res.status(404).json({ error: 'Sesión de caja no encontrada' });

        const movements = await db.query(
            `SELECT * FROM ${schema}.treasury_cash_movements
             WHERE cash_session_id = $1
             ORDER BY created_at ASC, id ASC`,
            [req.params.id]
        );
        res.json({ ...session.rows[0], movements: movements.rows });
    } catch (err) {
        console.error('cashSessionsController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible obtener la sesión de caja' });
    }
};
