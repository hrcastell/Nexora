const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

const HR_FIELDS = [
    'employee_code', 'user_id', 'work_email', 'personal_email', 'mobile_phone',
    'birth_date', 'hire_date', 'termination_date', 'employment_status',
    'employment_type', 'department_id', 'position_id', 'supervisor_employee_id',
    'cost_center_id', 'work_shift_id', 'privacy_level', 'created_by', 'updated_by'
];
const NULLABLE_FIELDS = new Set(HR_FIELDS.filter((field) => field !== 'employment_status'));
const VALID_EMPLOYMENT_STATUSES = ['draft', 'active', 'inactive', 'on_leave', 'terminated', 'suspended'];
const VALID_EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contractor', 'intern', 'temporary'];

const employeeSelect = `
    SELECT e.*, d.name AS department_name, p.name AS position_name,
           cc.name AS cost_center_name, ws.name AS work_shift_name,
           CONCAT_WS(' ', s.first_name, s.last_name) AS supervisor_name
    FROM %SCHEMA%.employees e
    LEFT JOIN %SCHEMA%.hr_departments d ON d.id = e.department_id
    LEFT JOIN %SCHEMA%.hr_positions p ON p.id = e.position_id
    LEFT JOIN %SCHEMA%.hr_cost_centers cc ON cc.id = e.cost_center_id
    LEFT JOIN %SCHEMA%.hr_work_shifts ws ON ws.id = e.work_shift_id
    LEFT JOIN %SCHEMA%.employees s ON s.id = e.supervisor_employee_id`;

function normalizeValue(field, value) {
    if (value === '' && NULLABLE_FIELDS.has(field)) return null;
    if (typeof value === 'string' && ['employee_code', 'work_email', 'personal_email', 'mobile_phone', 'employment_status', 'employment_type', 'privacy_level'].includes(field)) return value.trim() || null;
    return value;
}

function validateUpdate(body, res) {
    const fields = HR_FIELDS.filter((field) => Object.prototype.hasOwnProperty.call(body, field));
    if (!fields.length) {
        res.status(400).json({ error: 'Se requiere al menos un campo de RRHH' });
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'employment_status') && !VALID_EMPLOYMENT_STATUSES.includes(body.employment_status)) {
        res.status(400).json({ error: 'employment_status inválido' });
        return null;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'employment_type') && body.employment_type !== null && body.employment_type !== '' && !VALID_EMPLOYMENT_TYPES.includes(body.employment_type)) {
        res.status(400).json({ error: 'employment_type inválido' });
        return null;
    }
    return fields;
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const { q, department_id, position_id, employment_status } = req.query;
        const params = [];
        const conditions = [];
        if (q?.trim()) {
            params.push(`%${q.trim()}%`);
            conditions.push(`(e.first_name ILIKE $${params.length} OR e.last_name ILIKE $${params.length} OR e.employee_code ILIKE $${params.length})`);
        }
        for (const [column, value] of [['department_id', department_id], ['position_id', position_id], ['employment_status', employment_status]]) {
            if (value !== undefined && value !== '') {
                params.push(value);
                conditions.push(`e.${column} = $${params.length}`);
            }
        }
        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`${employeeSelect.replace(/%SCHEMA%/g, schema)} ${where} ORDER BY e.first_name ASC, e.last_name ASC`, params);
        res.json(result.rows);
    } catch (err) {
        console.error('hr employees.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible listar empleados' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`${employeeSelect.replace(/%SCHEMA%/g, schema)} WHERE e.id = $1`, [req.params.id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('hr employees.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible obtener el empleado' });
    }
};

exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
        const fields = validateUpdate(req.body, res);
        if (!fields) return;
        const { schema } = await resolveSchema(req);
        const writableFields = fields.filter((field) => field !== 'updated_by');
        const values = writableFields.map((field) => normalizeValue(field, req.body[field]));
        const sets = writableFields.map((field, index) => `${field} = $${index + 1}`);
        const updatedByIndex = writableFields.length + 1;
        sets.push(`updated_by = COALESCE($${updatedByIndex}, updated_by)`);
        const result = await db.query(
            `UPDATE ${schema}.employees SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${updatedByIndex + 1} RETURNING *`,
            [...values, req.user?.id || null, req.params.id]
        );
        if (!result.rows.length) return res.status(404).json({ error: 'Empleado no encontrado' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('hr employees.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'No fue posible actualizar el empleado' });
    }
};

module.exports.HR_FIELDS = HR_FIELDS;
