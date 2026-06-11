const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * Recalculates total_amount and final_amount on dental_quotes.
 * Must be called inside a transaction (client is required).
 * Returns the updated quote row.
 */
async function recalcQuoteTotal(client, schema, quoteId, companyId) {
    const items = await client.query(
        `SELECT COALESCE(SUM(subtotal), 0) AS total
         FROM ${schema}.dental_quote_items
         WHERE quote_id = $1 AND tenant_id = $2`,
        [quoteId, companyId]
    );
    const total = parseFloat(items.rows[0].total || 0);
    await client.query(
        `UPDATE ${schema}.dental_quotes
         SET total_amount = $1, final_amount = $1 - discount_amount, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [total, quoteId, companyId]
    );
    const q = await client.query(
        `SELECT * FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
        [quoteId, companyId]
    );
    return q.rows[0];
}

/**
 * Fetches full quote (with items) using a pool query (outside transaction).
 */
async function fetchFullQuote(schema, quoteId, companyId) {
    const qResult = await db.query(
        `SELECT dq.*,
                c.first_name  AS customer_first_name,
                c.last_name   AS customer_last_name,
                c.document_type AS customer_document_type,
                c.document_number AS customer_document_number,
                c.phone       AS customer_phone,
                c.address     AS customer_address,
                c.city        AS customer_city
         FROM ${schema}.dental_quotes dq
         LEFT JOIN ${schema}.customers c ON c.id = dq.customer_id
         WHERE dq.id = $1 AND dq.tenant_id = $2`,
        [quoteId, companyId]
    );
    if (qResult.rows.length === 0) return null;
    const quote = qResult.rows[0];

    const iResult = await db.query(
        `SELECT * FROM ${schema}.dental_quote_items
         WHERE quote_id = $1 AND tenant_id = $2
         ORDER BY sort_order ASC, id ASC`,
        [quoteId, companyId]
    );
    quote.items = iResult.rows;
    return quote;
}

/**
 * GET /dental/quotes
 * Query: ?customer_id=, ?status=, ?page=1, ?limit=20
 */
exports.list = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const { customer_id, status, page = 1, limit = 20 } = req.query;

        const params = [companyId];
        const conditions = ['dq.tenant_id = $1'];

        if (customer_id) {
            params.push(parseInt(customer_id));
            conditions.push(`dq.customer_id = $${params.length}`);
        }
        if (status) {
            params.push(status);
            conditions.push(`dq.status = $${params.length}`);
        }

        const where = `WHERE ${conditions.join(' AND ')}`;
        const pageNum  = Math.max(1, parseInt(page) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
        const offset   = (pageNum - 1) * limitNum;
        params.push(limitNum, offset);

        const result = await db.query(
            `SELECT dq.*,
                    c.first_name AS customer_first_name,
                    c.last_name  AS customer_last_name
             FROM ${schema}.dental_quotes dq
             LEFT JOIN ${schema}.customers c ON c.id = dq.customer_id
             ${where}
             ORDER BY dq.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        const countParams = params.slice(0, params.length - 2);
        const countResult = await db.query(
            `SELECT COUNT(*) FROM ${schema}.dental_quotes dq ${where}`,
            countParams
        );

        res.json({ data: result.rows, total: parseInt(countResult.rows[0].count) });
    } catch (err) {
        console.error('quotesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar presupuestos') });
    }
};

/**
 * GET /dental/quotes/:id
 */
exports.getById = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);
        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        if (!quote) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        res.json({ data: quote });
    } catch (err) {
        console.error('quotesController.getById error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener presupuesto') });
    }
};

/**
 * POST /dental/quotes
 * Body: { customer_id, valid_until?, notes?, conditions_text?, professional_id?, items?: [...] }
 */
exports.create = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);
        const {
            customer_id,
            valid_until = null,
            notes = null,
            conditions_text = null,
            professional_id = null,
            items = [],
        } = req.body;

        if (!customer_id) return res.status(400).json({ error: 'customer_id es requerido' });

        const txClient = await db.getClient();
        let quoteId;
        try {
            await txClient.query('BEGIN');

            // Generate quote number
            const seqResult = await txClient.query(
                `SELECT lpad(nextval('${schema}.dental_quote_number_seq')::text, 6, '0') AS num`
            );
            const quoteNumber = 'P-' + seqResult.rows[0].num;

            const insertResult = await txClient.query(
                `INSERT INTO ${schema}.dental_quotes
                 (tenant_id, customer_id, quote_number, valid_until, notes, conditions_text, professional_id, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft')
                 RETURNING id`,
                [companyId, customer_id, quoteNumber, valid_until, notes, conditions_text, professional_id || null]
            );
            quoteId = insertResult.rows[0].id;

            // Insert items if provided
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const unitPrice = parseFloat(item.unit_price);
                const quantity  = parseInt(item.quantity);
                if (isNaN(unitPrice) || unitPrice < 0) throw Object.assign(new Error('unit_price debe ser un número >= 0'), { statusCode: 400 });
                if (isNaN(quantity)  || quantity  < 1) throw Object.assign(new Error('quantity debe ser un entero >= 1'),  { statusCode: 400 });
                const subtotal  = unitPrice * quantity;
                await txClient.query(
                    `INSERT INTO ${schema}.dental_quote_items
                     (tenant_id, quote_id, treatment_id, treatment_name_snapshot, description, tooth_reference, unit_price, quantity, subtotal, sort_order)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        companyId, quoteId,
                        item.treatment_id || null,
                        item.treatment_name_snapshot,
                        item.description || null,
                        item.tooth_reference || null,
                        unitPrice, quantity, subtotal,
                        item.sort_order !== undefined ? item.sort_order : i,
                    ]
                );
            }

            await recalcQuoteTotal(txClient, schema, quoteId, companyId);

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, quoteId, companyId);
        res.status(201).json({ data: quote });
    } catch (err) {
        console.error('quotesController.create error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al crear presupuesto') });
    }
};

/**
 * PUT /dental/quotes/:id
 * Body: { valid_until?, notes?, conditions_text?, discount_amount?, professional_id? }
 */
exports.update = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT * FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (existing.rows[0].status !== 'draft') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_NOT_DRAFT', error: 'Solo se puede editar un presupuesto en estado borrador' });
        }

        const { valid_until, notes, conditions_text, discount_amount, professional_id } = req.body;

        if (discount_amount !== undefined) {
            const disc = parseFloat(discount_amount);
            if (isNaN(disc) || disc < 0) return res.status(400).json({ error: 'discount_amount debe ser un número >= 0' });
            if (disc > parseFloat(existing.rows[0].total_amount)) return res.status(400).json({ error: 'discount_amount no puede superar el total del presupuesto' });
        }

        const txClient = await db.getClient();
        try {
            await txClient.query('BEGIN');

            await txClient.query(
                `UPDATE ${schema}.dental_quotes
                 SET valid_until      = CASE WHEN $1::TEXT IS NOT NULL THEN $1::DATE     ELSE valid_until      END,
                     notes            = CASE WHEN $2::TEXT IS NOT NULL THEN $2           ELSE notes            END,
                     conditions_text  = CASE WHEN $3::TEXT IS NOT NULL THEN $3           ELSE conditions_text  END,
                     discount_amount  = CASE WHEN $4::TEXT IS NOT NULL THEN $4::NUMERIC  ELSE discount_amount  END,
                     professional_id  = CASE WHEN $5::TEXT IS NOT NULL THEN $5::INTEGER  ELSE professional_id  END,
                     updated_at       = NOW()
                 WHERE id = $6 AND tenant_id = $7`,
                [
                    valid_until !== undefined ? valid_until : null,
                    notes !== undefined ? notes : null,
                    conditions_text !== undefined ? conditions_text : null,
                    discount_amount !== undefined ? String(discount_amount) : null,
                    professional_id !== undefined ? String(professional_id) : null,
                    req.params.id, companyId,
                ]
            );

            // Recalc final_amount whenever discount may have changed
            await recalcQuoteTotal(txClient, schema, req.params.id, companyId);

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        res.json({ data: quote });
    } catch (err) {
        console.error('quotesController.update error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar presupuesto') });
    }
};

/**
 * POST /dental/quotes/:id/items
 * Body: { treatment_id?, treatment_name_snapshot, description?, tooth_reference?, unit_price, quantity, sort_order? }
 */
exports.addItem = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (existing.rows[0].status !== 'draft') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_NOT_DRAFT', error: 'Solo se puede modificar un presupuesto en estado borrador' });
        }

        const {
            treatment_id = null,
            treatment_name_snapshot,
            description = null,
            tooth_reference = null,
            unit_price,
            quantity = 1,
            sort_order = 0,
        } = req.body;

        if (!treatment_name_snapshot) return res.status(400).json({ error: 'treatment_name_snapshot es requerido' });

        const unitPrice = parseFloat(unit_price);
        const qty       = parseInt(quantity);
        if (isNaN(unitPrice) || unitPrice < 0) return res.status(400).json({ error: 'unit_price debe ser un número >= 0' });
        if (isNaN(qty)       || qty       < 1) return res.status(400).json({ error: 'quantity debe ser un entero >= 1' });
        const subtotal  = unitPrice * qty;

        const txClient = await db.getClient();
        try {
            await txClient.query('BEGIN');

            await txClient.query(
                `INSERT INTO ${schema}.dental_quote_items
                 (tenant_id, quote_id, treatment_id, treatment_name_snapshot, description, tooth_reference, unit_price, quantity, subtotal, sort_order)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [companyId, req.params.id, treatment_id, treatment_name_snapshot, description, tooth_reference, unitPrice, qty, subtotal, sort_order]
            );

            await recalcQuoteTotal(txClient, schema, req.params.id, companyId);

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        res.status(201).json({ data: quote });
    } catch (err) {
        console.error('quotesController.addItem error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al agregar ítem al presupuesto') });
    }
};

/**
 * PUT /dental/quotes/:id/items/:iid
 * Body: { treatment_name_snapshot?, description?, tooth_reference?, unit_price?, quantity?, sort_order? }
 */
exports.updateItem = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const quoteCheck = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (quoteCheck.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (quoteCheck.rows[0].status !== 'draft') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_NOT_DRAFT', error: 'Solo se puede modificar un presupuesto en estado borrador' });
        }

        const itemCheck = await db.query(
            `SELECT * FROM ${schema}.dental_quote_items WHERE id = $1 AND quote_id = $2 AND tenant_id = $3`,
            [req.params.iid, req.params.id, companyId]
        );
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_ITEM_NOT_FOUND', error: 'Ítem no encontrado' });
        }

        const row = itemCheck.rows[0];
        const rawUnitPrice = req.body.unit_price !== undefined ? parseFloat(req.body.unit_price) : parseFloat(row.unit_price);
        const rawQty       = req.body.quantity   !== undefined ? parseInt(req.body.quantity)     : parseInt(row.quantity);
        if (req.body.unit_price !== undefined && (isNaN(rawUnitPrice) || rawUnitPrice < 0)) return res.status(400).json({ error: 'unit_price debe ser un número >= 0' });
        if (req.body.quantity   !== undefined && (isNaN(rawQty)       || rawQty       < 1)) return res.status(400).json({ error: 'quantity debe ser un entero >= 1' });
        const unitPrice = rawUnitPrice;
        const qty       = rawQty;
        const subtotal  = unitPrice * qty;

        const txClient = await db.getClient();
        try {
            await txClient.query('BEGIN');

            await txClient.query(
                `UPDATE ${schema}.dental_quote_items
                 SET treatment_name_snapshot = COALESCE($1, treatment_name_snapshot),
                     description             = COALESCE($2, description),
                     tooth_reference         = COALESCE($3, tooth_reference),
                     unit_price              = $4,
                     quantity                = $5,
                     subtotal                = $6,
                     sort_order              = COALESCE($7, sort_order)
                 WHERE id = $8 AND quote_id = $9 AND tenant_id = $10`,
                [
                    req.body.treatment_name_snapshot !== undefined ? req.body.treatment_name_snapshot : null,
                    req.body.description             !== undefined ? req.body.description             : null,
                    req.body.tooth_reference         !== undefined ? req.body.tooth_reference         : null,
                    unitPrice, qty, subtotal,
                    req.body.sort_order !== undefined ? req.body.sort_order : null,
                    req.params.iid, req.params.id, companyId,
                ]
            );

            await recalcQuoteTotal(txClient, schema, req.params.id, companyId);

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        res.json({ data: quote });
    } catch (err) {
        console.error('quotesController.updateItem error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al actualizar ítem del presupuesto') });
    }
};

/**
 * DELETE /dental/quotes/:id/items/:iid
 */
exports.removeItem = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const quoteCheck = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (quoteCheck.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (quoteCheck.rows[0].status !== 'draft') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_NOT_DRAFT', error: 'Solo se puede modificar un presupuesto en estado borrador' });
        }

        const txClient = await db.getClient();
        try {
            await txClient.query('BEGIN');

            const del = await txClient.query(
                `DELETE FROM ${schema}.dental_quote_items WHERE id = $1 AND quote_id = $2 AND tenant_id = $3`,
                [req.params.iid, req.params.id, companyId]
            );
            if (del.rowCount === 0) {
                await txClient.query('ROLLBACK');
                return res.status(404).json({ code: 'DENTAL_QUOTE_ITEM_NOT_FOUND', error: 'Ítem no encontrado' });
            }

            await recalcQuoteTotal(txClient, schema, req.params.id, companyId);

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        res.json({ data: quote });
    } catch (err) {
        console.error('quotesController.removeItem error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al eliminar ítem del presupuesto') });
    }
};

/**
 * POST /dental/quotes/:id/send
 */
exports.send = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (existing.rows[0].status !== 'draft') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: `No se puede enviar un presupuesto en estado '${existing.rows[0].status}'` });
        }

        const result = await db.query(
            `UPDATE ${schema}.dental_quotes SET status = 'sent', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'draft' RETURNING *`,
            [req.params.id, companyId]
        );
        if (result.rowCount === 0) return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: 'Estado del presupuesto ya fue modificado' });
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('quotesController.send error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al enviar presupuesto') });
    }
};

/**
 * POST /dental/quotes/:id/accept
 * Body: { accepted_by_name, acceptance_notes? }
 */
exports.accept = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (!['draft', 'sent'].includes(existing.rows[0].status)) {
            return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: `No se puede aceptar un presupuesto en estado '${existing.rows[0].status}'` });
        }

        const { accepted_by_name, acceptance_notes = null } = req.body;
        if (!accepted_by_name) return res.status(400).json({ error: 'accepted_by_name es requerido' });

        const result = await db.query(
            `UPDATE ${schema}.dental_quotes
             SET status = 'accepted', accepted_at = NOW(), accepted_by_name = $1, acceptance_notes = $2, updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4 AND status IN ('draft', 'sent')
             RETURNING *`,
            [accepted_by_name, acceptance_notes, req.params.id, companyId]
        );
        if (result.rowCount === 0) return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: 'Estado del presupuesto ya fue modificado' });
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('quotesController.accept error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al aceptar presupuesto') });
    }
};

/**
 * POST /dental/quotes/:id/reject
 * Body: { rejection_reason? }
 */
exports.reject = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (!['draft', 'sent', 'accepted'].includes(existing.rows[0].status)) {
            return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: `No se puede rechazar un presupuesto en estado '${existing.rows[0].status}'` });
        }

        const { rejection_reason = null } = req.body;

        const result = await db.query(
            `UPDATE ${schema}.dental_quotes
             SET status = 'rejected', rejected_at = NOW(), rejection_reason = $1, updated_at = NOW()
             WHERE id = $2 AND tenant_id = $3 AND status IN ('draft', 'sent', 'accepted')
             RETURNING *`,
            [rejection_reason, req.params.id, companyId]
        );
        if (result.rowCount === 0) return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: 'Estado del presupuesto ya fue modificado' });
        res.json({ data: result.rows[0] });
    } catch (err) {
        console.error('quotesController.reject error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al rechazar presupuesto') });
    }
};

/**
 * POST /dental/quotes/:id/convert
 * Converts an accepted quote into a consultation + consultation treatments.
 */
exports.convertToConsultation = async (req, res) => {
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema, companyId } = await resolveSchema(req);

        const existing = await db.query(
            `SELECT status FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (existing.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        if (existing.rows[0].status !== 'accepted') {
            return res.status(400).json({ code: 'DENTAL_QUOTE_INVALID_TRANSITION', error: 'Solo se puede convertir un presupuesto aceptado' });
        }

        const txClient = await db.getClient();
        let consultationId;
        try {
            await txClient.query('BEGIN');

            // Lock the quote
            const quoteResult = await txClient.query(
                `SELECT * FROM ${schema}.dental_quotes WHERE id = $1 AND tenant_id = $2 FOR UPDATE`,
                [req.params.id, companyId]
            );
            const quote = quoteResult.rows[0];

            const itemsResult = await txClient.query(
                `SELECT * FROM ${schema}.dental_quote_items WHERE quote_id = $1 AND tenant_id = $2 ORDER BY sort_order ASC`,
                [req.params.id, companyId]
            );
            const items = itemsResult.rows;

            // Create consultation
            const consResult = await txClient.query(
                `INSERT INTO ${schema}.dental_consultations
                 (tenant_id, customer_id, professional_id, status, total_amount, reason, created_by)
                 VALUES ($1, $2, $3, 'aceptada', 0, $4, $5)
                 RETURNING id`,
                [companyId, quote.customer_id, quote.professional_id || null, quote.notes || null, req.user?.id || null]
            );
            consultationId = consResult.rows[0].id;

            // Insert consultation treatments from quote items with price > 0
            for (const item of items) {
                if (parseFloat(item.unit_price) > 0) {
                    const subtotal = parseFloat(item.unit_price) * parseInt(item.quantity);
                    await txClient.query(
                        `INSERT INTO ${schema}.dental_consultation_treatments
                         (tenant_id, consultation_id, treatment_id, treatment_name_snapshot, unit_price, quantity, subtotal, status, tooth_reference, clinical_notes, created_by)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9, $10)`,
                        [
                            companyId, consultationId,
                            item.treatment_id || null,
                            item.treatment_name_snapshot,
                            parseFloat(item.unit_price),
                            parseInt(item.quantity),
                            subtotal,
                            item.tooth_reference || null,
                            item.description || null,
                            req.user?.id || null,
                        ]
                    );
                }
            }

            // Recalc consultation total
            await txClient.query(
                `UPDATE ${schema}.dental_consultations
                 SET total_amount = (
                     SELECT COALESCE(SUM(subtotal), 0)
                     FROM ${schema}.dental_consultation_treatments
                     WHERE consultation_id = $1 AND tenant_id = $2 AND status = 'active'
                 ), updated_at = NOW()
                 WHERE id = $1 AND tenant_id = $2`,
                [consultationId, companyId]
            );

            // Mark quote as converted
            await txClient.query(
                `UPDATE ${schema}.dental_quotes
                 SET status = 'converted', consultation_id = $1, converted_at = NOW(), updated_at = NOW()
                 WHERE id = $2 AND tenant_id = $3`,
                [consultationId, req.params.id, companyId]
            );

            await txClient.query('COMMIT');
        } catch (txErr) {
            await txClient.query('ROLLBACK');
            throw txErr;
        } finally {
            txClient.release();
        }

        const quote = await fetchFullQuote(schema, req.params.id, companyId);
        res.json({ data: { quote, consultation_id: consultationId } });
    } catch (err) {
        console.error('quotesController.convertToConsultation error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al convertir presupuesto') });
    }
};

/**
 * GET /dental/quotes/:id/print
 */
exports.getPrintData = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const quoteResult = await db.query(
            `SELECT dq.*,
                    c.first_name      AS customer_first_name,
                    c.last_name       AS customer_last_name,
                    c.document_type   AS customer_document_type,
                    c.document_number AS customer_document_number,
                    c.phone           AS customer_phone,
                    c.address         AS customer_address,
                    c.city            AS customer_city
             FROM ${schema}.dental_quotes dq
             LEFT JOIN ${schema}.customers c ON c.id = dq.customer_id
             WHERE dq.id = $1 AND dq.tenant_id = $2`,
            [req.params.id, companyId]
        );
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ code: 'DENTAL_QUOTE_NOT_FOUND', error: 'Presupuesto no encontrado' });
        }
        const quoteRow = quoteResult.rows[0];

        const itemsResult = await db.query(
            `SELECT * FROM ${schema}.dental_quote_items
             WHERE quote_id = $1 AND tenant_id = $2
             ORDER BY sort_order ASC, id ASC`,
            [req.params.id, companyId]
        );

        const configResult = await db.query(
            `SELECT * FROM ${schema}.config_company LIMIT 1`
        );

        // Extract customer fields for a clean response object
        const customer = {
            first_name:      quoteRow.customer_first_name,
            last_name:       quoteRow.customer_last_name,
            document_type:   quoteRow.customer_document_type,
            document_number: quoteRow.customer_document_number,
            phone:           quoteRow.customer_phone,
            address:         quoteRow.customer_address,
            city:            quoteRow.customer_city,
        };

        res.json({
            data: {
                quote:    quoteRow,
                customer,
                items:    itemsResult.rows,
                config:   configResult.rows[0] || {},
            }
        });
    } catch (err) {
        console.error('quotesController.getPrintData error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al obtener datos de impresión') });
    }
};

/**
 * GET /dental/patients/:customerId/quotes
 */
exports.getForPatient = async (req, res) => {
    try {
        const { schema, companyId } = await resolveSchema(req);

        const result = await db.query(
            `SELECT * FROM ${schema}.dental_quotes
             WHERE customer_id = $1 AND tenant_id = $2
             ORDER BY created_at DESC`,
            [req.params.customerId, companyId]
        );

        res.json({ data: result.rows });
    } catch (err) {
        console.error('quotesController.getForPatient error:', err.message);
        res.status(err.statusCode || 500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : (err.message || 'Error al listar presupuestos del paciente') });
    }
};
