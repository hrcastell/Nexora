const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { createNotification } = require('../../utils/notifications');
const { resolveEmployeeId } = require('../../services/hr/employeeResolver');

const REQUEST_SELECT = `
    SELECT r.*, rt.code AS request_type_code, rt.name AS request_type_name,
           CONCAT_WS(' ', e.first_name, e.last_name) AS employee_name,
           e.supervisor_employee_id,
           CONCAT_WS(' ', s.first_name, s.last_name) AS supervisor_name
    FROM %SCHEMA%.hr_requests r
    JOIN %SCHEMA%.hr_request_types rt ON rt.id = r.request_type_id
    JOIN %SCHEMA%.employees e ON e.id = r.employee_id
    LEFT JOIN %SCHEMA%.employees s ON s.id = e.supervisor_employee_id`;

function requestSelect(schema) {
    return REQUEST_SELECT.replace(/%SCHEMA%/g, schema);
}

function httpError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function hasApprovalPermission(schema, userId, isSuperAdmin) {
    if (isSuperAdmin) return true;
    const result = await db.query(
        `SELECT COALESCE(bool_or(ptp.can_view OR ptp.can_approve), FALSE) AS allowed
         FROM ${schema}.user_tenant_profiles utp
         JOIN ${schema}.profile_transaction_permissions ptp ON ptp.profile_id = utp.profile_id
         WHERE utp.user_id = $1 AND ptp.transaction_code = 'hr_request_approvals'`,
        [userId]
    );
    return result.rows[0]?.allowed === true;
}

async function getHrRecipientIds(schema) {
    const result = await db.query(
        `SELECT DISTINCT utp.user_id
         FROM ${schema}.user_tenant_profiles utp
         JOIN ${schema}.profile_transaction_permissions ptp ON ptp.profile_id = utp.profile_id
         JOIN public.users u ON u.id = utp.user_id AND u.is_active = TRUE
         WHERE ptp.transaction_code = 'hr_request_approvals'
           AND (ptp.can_view = TRUE OR ptp.can_approve = TRUE)`
    );
    return result.rows.map((row) => row.user_id);
}

async function notify(userId, req, type, title, body) {
    if (!userId) return;
    await createNotification({
        userId,
        companyId: req.user.company_id,
        type,
        category: 'human_resources',
        title,
        body,
        actionUrl: '/hr/requests'
    });
}

function isOwnRequestsView(req) {
    return req.query.scope === 'mine' || req.query.view === 'mine';
}

async function canReadRequest(schema, request, userId, employeeId, hasApprovalAccess) {
    if (hasApprovalAccess || request.employee_id === employeeId) return true;
    return request.current_step === 'supervisor'
        && request.status === 'submitted'
        && request.supervisor_employee_id === employeeId;
}

exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const employeeId = await resolveEmployeeId(schema, req.user.id);
        const approvalAccess = await hasApprovalPermission(schema, req.user.id, req.user.is_super_admin);
        const params = [];
        let where = '';

        if (isOwnRequestsView(req)) {
            if (!employeeId) return res.json([]);
            params.push(employeeId);
            where = `WHERE r.employee_id = $${params.length}`;
        } else if (approvalAccess) {
            // HR approval users can review the complete tenant request history.
            where = '';
        } else {
            if (!employeeId) return res.json([]);
            params.push(employeeId);
            where = `WHERE r.status = 'submitted' AND r.current_step = 'supervisor'
                     AND e.supervisor_employee_id = $${params.length}`;
        }

        const result = await db.query(
            `${requestSelect(schema)} ${where} ORDER BY r.created_at DESC, r.id DESC`,
            params
        );
        res.json(result.rows);
    } catch (error) {
        console.error('hr requests.list error:', error.message);
        res.status(error.statusCode || 500).json({ error: error.message || 'No fue posible listar las solicitudes' });
    }
};

exports.getById = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const header = await db.query(`${requestSelect(schema)} WHERE r.id = $1`, [req.params.id]);
        if (!header.rows.length) return res.status(404).json({ error: 'Solicitud no encontrada' });

        const employeeId = await resolveEmployeeId(schema, req.user.id);
        const approvalAccess = await hasApprovalPermission(schema, req.user.id, req.user.is_super_admin);
        if (!await canReadRequest(schema, header.rows[0], req.user.id, employeeId, approvalAccess)) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta solicitud' });
        }

        const [approvals, history] = await Promise.all([
            db.query(`SELECT * FROM ${schema}.hr_request_approvals WHERE request_id = $1 ORDER BY id`, [req.params.id]),
            db.query(`SELECT * FROM ${schema}.hr_request_status_history WHERE request_id = $1 ORDER BY created_at, id`, [req.params.id])
        ]);
        res.json({ ...header.rows[0], approvals: approvals.rows, history: history.rows });
    } catch (error) {
        console.error('hr requests.getById error:', error.message);
        res.status(error.statusCode || 500).json({ error: error.message || 'No fue posible obtener la solicitud' });
    }
};

exports.create = async (req, res) => {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        const employeeId = await resolveEmployeeId(schema, req.user.id);
        if (!employeeId) throw httpError('No tenés un perfil de empleado vinculado', 403);
        if (!req.body.request_type_id) throw httpError('request_type_id es requerido', 400);

        await client.query('BEGIN');
        const requestType = await client.query(
            `SELECT id, name, status FROM ${schema}.hr_request_types WHERE id = $1 FOR UPDATE`,
            [req.body.request_type_id]
        );
        if (!requestType.rows.length) throw httpError('Tipo de solicitud no encontrado', 404);
        if (requestType.rows[0].status !== 'active') throw httpError('El tipo de solicitud está inactivo', 400);

        const request = await client.query(
            `INSERT INTO ${schema}.hr_requests
             (request_type_id, employee_id, title, description, start_date, end_date, status, current_step, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,'submitted','supervisor',$7)
             RETURNING *`,
            [req.body.request_type_id, employeeId, req.body.title || null, req.body.description || null,
             req.body.start_date || null, req.body.end_date || null, req.user.id]
        );
        await client.query(
            `INSERT INTO ${schema}.hr_request_status_history
             (request_id, from_status, to_status, actor_user_id, actor_role, note)
             VALUES ($1,$2,'submitted',$3,$4,$5)`,
            [request.rows[0].id, null, req.user.id, req.user.role || null, req.body.note || null]
        );
        const supervisor = await client.query(
            `SELECT s.user_id FROM ${schema}.employees e
             LEFT JOIN ${schema}.employees s ON s.id = e.supervisor_employee_id
             WHERE e.id = $1`,
            [employeeId]
        );
        await client.query('COMMIT');

        await notify(
            supervisor.rows[0]?.user_id,
            req,
            'info',
            'Nueva solicitud de RRHH',
            `Tenés una solicitud pendiente de revisión: ${requestType.rows[0].name}.`
        );
        res.status(201).json(request.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        res.status(error.statusCode || 500).json({ error: error.message || 'No fue posible crear la solicitud' });
    } finally {
        client.release();
    }
};

async function transition(req, res, action) {
    if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });
    const client = await db.getClient();
    try {
        const { schema } = await resolveSchema(req);
        const employeeId = await resolveEmployeeId(schema, req.user.id);
        const approvalAccess = await hasApprovalPermission(schema, req.user.id, req.user.is_super_admin);
        await client.query('BEGIN');

        const locked = await client.query(
            `SELECT r.*, e.supervisor_employee_id, e.user_id AS requester_user_id
             FROM ${schema}.hr_requests r
             JOIN ${schema}.employees e ON e.id = r.employee_id
             WHERE r.id = $1 FOR UPDATE`,
            [req.params.id]
        );
        if (!locked.rows.length) throw httpError('Solicitud no encontrada', 404);
        const request = locked.rows[0];
        let nextStatus;
        let nextStep;
        let decision = null;
        let approvalStep = null;

        if (action === 'annul') {
            if (request.employee_id !== employeeId) throw httpError('Solo podés anular tus propias solicitudes', 403);
            if (!['submitted', 'supervisor_approved'].includes(request.status) || request.current_step === 'done') {
                throw httpError('La solicitud no puede anularse en su estado actual', 409);
            }
            nextStatus = 'annulled';
            nextStep = 'done';
        } else if (request.current_step === 'supervisor' && request.status === 'submitted') {
            if (!employeeId || request.supervisor_employee_id !== employeeId) {
                throw httpError('Solo el supervisor asignado puede decidir esta solicitud', 403);
            }
            approvalStep = 'supervisor';
            decision = action === 'approve' ? 'approved' : 'rejected';
            nextStatus = action === 'approve' ? 'supervisor_approved' : 'supervisor_rejected';
            nextStep = action === 'approve' ? 'hr' : 'done';
        } else if (request.current_step === 'hr' && request.status === 'supervisor_approved') {
            if (!approvalAccess) throw httpError('Se requiere permiso de aprobación de RRHH', 403);
            approvalStep = 'hr';
            decision = action === 'approve' ? 'approved' : 'rejected';
            nextStatus = action === 'approve' ? 'hr_approved' : 'hr_rejected';
            nextStep = 'done';
        } else {
            throw httpError('La transición solicitada no está permitida', 409);
        }

        const updated = await client.query(
            `UPDATE ${schema}.hr_requests
             SET status = $1, current_step = $2, updated_by = $3, updated_at = CURRENT_TIMESTAMP
             WHERE id = $4 RETURNING *`,
            [nextStatus, nextStep, req.user.id, request.id]
        );
        if (approvalStep) {
            await client.query(
                `INSERT INTO ${schema}.hr_request_approvals
                 (request_id, step, decision, decided_by, decided_at, comment)
                 VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP,$5)`,
                [request.id, approvalStep, decision, req.user.id, req.body.comment || null]
            );
        }
        await client.query(
            `INSERT INTO ${schema}.hr_request_status_history
             (request_id, from_status, to_status, actor_user_id, actor_role, note)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [request.id, request.status, nextStatus, req.user.id, req.user.role || null, req.body.comment || null]
        );
        await client.query('COMMIT');

        if (action === 'approve' && approvalStep === 'supervisor') {
            const recipients = await getHrRecipientIds(schema);
            await Promise.all(recipients.map((userId) => notify(
                userId, req, 'info', 'Solicitud pendiente de RRHH', 'Una solicitud fue aprobada por su supervisor.'
            )));
        } else if (action !== 'annul') {
            await notify(
                request.requester_user_id,
                req,
                action === 'approve' ? 'success' : 'warning',
                'Solicitud de RRHH actualizada',
                `Tu solicitud fue ${action === 'approve' ? 'aprobada' : 'rechazada'}.`
            );
        }
        res.json(updated.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        res.status(error.statusCode || 500).json({ error: error.message || 'No fue posible actualizar la solicitud' });
    } finally {
        client.release();
    }
}

exports.approve = (req, res) => transition(req, res, 'approve');
exports.reject = (req, res) => transition(req, res, 'reject');
exports.annul = (req, res) => transition(req, res, 'annul');
