const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');
const { createNotification } = require('../../utils/notifications');

function createError(message, statusCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function positiveAmount(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isValidDate(value) {
    return value && !Number.isNaN(new Date(value).getTime());
}

function documentStatus(balanceAmount, totalAmount) {
    if (Number(balanceAmount) <= 0) return 'settled';
    if (Number(balanceAmount) >= Number(totalAmount)) return 'open';
    return 'partially_applied';
}

function installmentStatus(balanceAmount, amount) {
    if (Number(balanceAmount) <= 0) return 'settled';
    if (Number(balanceAmount) >= Number(amount)) return 'pending';
    return 'partially_applied';
}

module.exports = function createPaymentApplicationsController(config) {
    const {
        entityName,
        entityTable,
        entityIdColumn,
        numberColumn,
        dateColumn,
        applicationTable,
        applicationEntityColumn,
        direction,
        notificationTitle,
        routePath
    } = config;

    async function findCounterparty(client, schema, counterpartyId) {
        const result = await client.query(
            `SELECT id FROM ${schema}.treasury_counterparties WHERE id = $1 AND status = 'active'`,
            [counterpartyId]
        );
        if (!result.rows.length) throw createError('Contraparte activa no encontrada', 404);
    }

    async function findOpenCashSession(client, schema, cashSessionId) {
        const result = await client.query(
            `SELECT id FROM ${schema}.treasury_cash_sessions WHERE id = $1 AND status = 'open'`,
            [cashSessionId]
        );
        if (!result.rows.length) throw createError('Sesi\u00f3n de caja abierta no encontrada', 404);
    }

    function validateHeader(body) {
        if (!isPositiveInteger(body.counterparty_id)) throw createError('counterparty_id debe ser un entero positivo', 400);
        if (!body[numberColumn] || !String(body[numberColumn]).trim()) throw createError(`${numberColumn} es requerido`, 400);
        if (body[dateColumn] && !isValidDate(body[dateColumn])) throw createError(`${dateColumn} no es v\u00e1lida`, 400);
        if (body.cash_session_id !== undefined && body.cash_session_id !== null && !isPositiveInteger(body.cash_session_id)) {
            throw createError('cash_session_id debe ser un entero positivo', 400);
        }
        const totalAmount = positiveAmount(body.total_amount);
        if (totalAmount === null) throw createError('total_amount debe ser mayor que cero', 400);
        return totalAmount;
    }

    function validateApplications(value) {
        if (!Array.isArray(value) || !value.length) throw createError('applications debe contener al menos una aplicaci\u00f3n', 400);
        return value.map((application) => {
            if (!application || !isPositiveInteger(application.treasury_document_id)) {
                throw createError('treasury_document_id debe ser un entero positivo', 400);
            }
            if (application.installment_id !== undefined && application.installment_id !== null && !isPositiveInteger(application.installment_id)) {
                throw createError('installment_id debe ser un entero positivo', 400);
            }
            const appliedAmount = positiveAmount(application.applied_amount);
            if (appliedAmount === null) throw createError('applied_amount debe ser mayor que cero', 400);
            return {
                treasuryDocumentId: Number(application.treasury_document_id),
                installmentId: application.installment_id === undefined || application.installment_id === null ? null : Number(application.installment_id),
                appliedAmount
            };
        });
    }

    async function lockDocument(client, schema, documentId, counterpartyId) {
        const result = await client.query(
            `SELECT id, counterparty_id, total_amount, balance_amount, status
             FROM ${schema}.treasury_documents
             WHERE id = $1 AND direction = $2
             FOR UPDATE`,
            [documentId, direction]
        );
        if (!result.rows.length) throw createError('Documento financiero no encontrado para esta operaci\u00f3n', 404);
        const document = result.rows[0];
        if (document.status === 'void') throw createError('No se puede aplicar un documento anulado', 409);
        if (Number(document.counterparty_id) !== Number(counterpartyId)) {
            throw createError('El documento no corresponde a la contraparte del comprobante', 400);
        }
        return document;
    }

    async function lockInstallment(client, schema, installmentId, documentId) {
        const result = await client.query(
            `SELECT id, treasury_document_id, amount, balance_amount
             FROM ${schema}.treasury_installments
             WHERE id = $1 AND treasury_document_id = $2
             FOR UPDATE`,
            [installmentId, documentId]
        );
        if (!result.rows.length) throw createError('Cuota no encontrada para el documento indicado', 404);
        return result.rows[0];
    }

    const controller = {};

    controller.create = async (req, res) => {
        if (req.user && req.user.read_only) return res.status(403).json({ error: 'Operaci\u00f3n no permitida en modo solo lectura' });
        const client = await db.getClient();
        try {
            const totalAmount = validateHeader(req.body);
            const { schema, companyId } = await resolveSchema(req);
            await client.query('BEGIN');
            await findCounterparty(client, schema, Number(req.body.counterparty_id));
            if (req.body.cash_session_id !== undefined && req.body.cash_session_id !== null) {
                await findOpenCashSession(client, schema, Number(req.body.cash_session_id));
            }
            const result = await client.query(
                `INSERT INTO ${schema}.${entityTable}
                 (tenant_id, ${numberColumn}, counterparty_id, ${dateColumn}, cash_session_id, payment_method, total_amount, status, created_by)
                 VALUES ($1, $2, $3, COALESCE($4, CURRENT_TIMESTAMP), $5, $6, $7, 'active', $8)
                 RETURNING *`,
                [companyId, String(req.body[numberColumn]).trim(), Number(req.body.counterparty_id), req.body[dateColumn] || null,
                    req.body.cash_session_id === undefined || req.body.cash_session_id === null ? null : Number(req.body.cash_session_id),
                    req.body.payment_method || null, totalAmount, req.user.id]
            );
            await client.query('COMMIT');
            res.status(201).json(result.rows[0]);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`${entityName}.create error:`, err.message);
            res.status(err.statusCode || 500).json({ error: err.message || `No fue posible crear el ${entityName}` });
        } finally {
            client.release();
        }
    };

    controller.apply = async (req, res) => {
        if (req.user && req.user.read_only) return res.status(403).json({ error: 'Operaci\u00f3n no permitida en modo solo lectura' });
        const client = await db.getClient();
        try {
            const applications = validateApplications(req.body.applications);
            const requestTotal = applications.reduce((sum, application) => sum + application.appliedAmount, 0);
            const { schema, companyId } = await resolveSchema(req);
            await client.query('BEGIN');
            const entityResult = await client.query(
                `SELECT id, counterparty_id, total_amount, status
                 FROM ${schema}.${entityTable}
                 WHERE ${entityIdColumn} = $1
                 FOR UPDATE`,
                [req.params.id]
            );
            if (!entityResult.rows.length) throw createError(`${entityName} no encontrado`, 404);
            const entity = entityResult.rows[0];
            if (entity.status !== 'active') throw createError(`El ${entityName} no est\u00e1 activo`, 409);

            const alreadyApplied = await client.query(
                `SELECT COALESCE(SUM(applied_amount), 0) AS applied_amount
                 FROM ${schema}.${applicationTable}
                 WHERE ${applicationEntityColumn} = $1`,
                [entity.id]
            );
            if (Number(alreadyApplied.rows[0].applied_amount) + requestTotal > Number(entity.total_amount)) {
                throw createError(`Las aplicaciones superan el total disponible del ${entityName}`, 400);
            }

            const insertedApplications = [];
            for (const application of applications) {
                const document = await lockDocument(client, schema, application.treasuryDocumentId, entity.counterparty_id);
                if (application.appliedAmount > Number(document.balance_amount)) {
                    throw createError('El monto aplicado supera el saldo pendiente del documento', 400);
                }

                let installment = null;
                if (application.installmentId !== null) {
                    installment = await lockInstallment(client, schema, application.installmentId, document.id);
                    if (application.appliedAmount > Number(installment.balance_amount)) {
                        throw createError('El monto aplicado supera el saldo pendiente de la cuota', 400);
                    }
                    const installmentBalance = Number(installment.balance_amount) - application.appliedAmount;
                    await client.query(
                        `UPDATE ${schema}.treasury_installments
                         SET balance_amount = $1, status = $2
                         WHERE id = $3`,
                        [installmentBalance, installmentStatus(installmentBalance, installment.amount), installment.id]
                    );
                }

                const documentBalance = Number(document.balance_amount) - application.appliedAmount;
                await client.query(
                    `UPDATE ${schema}.treasury_documents
                     SET balance_amount = $1, status = $2, updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [documentBalance, documentStatus(documentBalance, document.total_amount), document.id]
                );
                const inserted = await client.query(
                    `INSERT INTO ${schema}.${applicationTable}
                     (tenant_id, ${applicationEntityColumn}, treasury_document_id, installment_id, applied_amount)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING *`,
                    [companyId, entity.id, document.id, installment ? installment.id : null, application.appliedAmount]
                );
                insertedApplications.push(inserted.rows[0]);
            }
            await client.query('COMMIT');

            await createNotification({
                userId: req.user.id,
                companyId,
                type: 'success',
                category: 'treasury_collections',
                title: notificationTitle,
                body: `Se aplicaron ${requestTotal.toFixed(2)} al ${entityName} ${entity.id}.`,
                actionUrl: `${routePath}/${entity.id}`
            });
            res.status(201).json({ entity, applications: insertedApplications });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error(`${entityName}.apply error:`, err.message);
            res.status(err.statusCode || 500).json({ error: err.message || `No fue posible aplicar el ${entityName}` });
        } finally {
            client.release();
        }
    };

    controller.list = async (req, res) => {
        try {
            const { schema } = await resolveSchema(req);
            const params = [];
            const conditions = [];
            if (req.query.status) {
                params.push(req.query.status);
                conditions.push(`p.status = $${params.length}`);
            }
            if (req.query.counterparty_id) {
                if (!isPositiveInteger(req.query.counterparty_id)) return res.status(400).json({ error: 'counterparty_id debe ser un entero positivo' });
                params.push(Number(req.query.counterparty_id));
                conditions.push(`p.counterparty_id = $${params.length}`);
            }
            const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
            const result = await db.query(
                `SELECT p.*, c.name_snapshot AS counterparty_name,
                        COALESCE(a.applied_amount, 0) AS applied_amount
                 FROM ${schema}.${entityTable} p
                 JOIN ${schema}.treasury_counterparties c ON c.id = p.counterparty_id
                 LEFT JOIN (
                     SELECT ${applicationEntityColumn}, SUM(applied_amount) AS applied_amount
                     FROM ${schema}.${applicationTable}
                     GROUP BY ${applicationEntityColumn}
                 ) a ON a.${applicationEntityColumn} = p.${entityIdColumn}
                 ${where}
                 ORDER BY p.${dateColumn} DESC, p.${entityIdColumn} DESC`,
                params
            );
            res.json(result.rows);
        } catch (err) {
            console.error(`${entityName}.list error:`, err.message);
            res.status(err.statusCode || 500).json({ error: err.message || `No fue posible listar los ${entityName}s` });
        }
    };

    controller.getById = async (req, res) => {
        try {
            const { schema } = await resolveSchema(req);
            const header = await db.query(
                `SELECT p.*, c.name_snapshot AS counterparty_name
                 FROM ${schema}.${entityTable} p
                 JOIN ${schema}.treasury_counterparties c ON c.id = p.counterparty_id
                 WHERE p.${entityIdColumn} = $1`,
                [req.params.id]
            );
            if (!header.rows.length) return res.status(404).json({ error: `${entityName} no encontrado` });
            const applications = await db.query(
                `SELECT a.*, d.internal_number, d.external_number, d.total_amount AS document_total_amount,
                        d.balance_amount AS document_balance_amount, d.status AS document_status,
                        i.installment_number, i.amount AS installment_amount, i.balance_amount AS installment_balance_amount,
                        i.status AS installment_status
                 FROM ${schema}.${applicationTable} a
                 JOIN ${schema}.treasury_documents d ON d.id = a.treasury_document_id
                 LEFT JOIN ${schema}.treasury_installments i ON i.id = a.installment_id
                 WHERE a.${applicationEntityColumn} = $1
                 ORDER BY a.id ASC`,
                [req.params.id]
            );
            res.json({ ...header.rows[0], applications: applications.rows });
        } catch (err) {
            console.error(`${entityName}.getById error:`, err.message);
            res.status(err.statusCode || 500).json({ error: err.message || `No fue posible obtener el ${entityName}` });
        }
    };

    return controller;
};
