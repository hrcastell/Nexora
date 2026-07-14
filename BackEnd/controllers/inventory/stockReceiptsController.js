const db = require("../../config/db");
const { resolveSchema } = require("../../utils/tenantResolver");
const { createNotification } = require("../../utils/notifications");

exports.list = async (req, res) => {
  try {
    const { schema } = await resolveSchema(req);
    const r = await db.query(
      `SELECT sr.*,pd.internal_number,w.name warehouse_name FROM ${schema}.stock_receipts sr JOIN ${schema}.purchase_documents pd ON pd.id=sr.purchase_document_id JOIN ${schema}.warehouses w ON w.id=sr.warehouse_id ORDER BY sr.created_at DESC`,
    );
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
exports.getById = async (req, res) => {
  try {
    const { schema } = await resolveSchema(req);
    const h = await db.query(
      `SELECT * FROM ${schema}.stock_receipts WHERE id=$1`,
      [req.params.id],
    );
    if (!h.rows.length)
      return res.status(404).json({ error: "Recepción no encontrada" });
    const l = await db.query(
      `SELECT * FROM ${schema}.stock_receipt_lines WHERE stock_receipt_id=$1`,
      [req.params.id],
    );
    res.json({ ...h.rows[0], lines: l.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
exports.create = async (req, res) => {
  try {
    if (req.user?.read_only)
      return res
        .status(403)
        .json({ error: "Operación no permitida en modo solo lectura" });
    const { schema } = await resolveSchema(req);
    const b = req.body;
    if (!b.purchase_document_id || !b.warehouse_id)
      return res
        .status(400)
        .json({ error: "purchase_document_id y warehouse_id son requeridos" });
    const doc = await db.query(
      `SELECT supplier_id FROM ${schema}.purchase_documents WHERE id=$1 AND status IN ('issued','partially_received')`,
      [b.purchase_document_id],
    );
    if (!doc.rows.length)
      return res
        .status(409)
        .json({ error: "El documento no está disponible para recepción" });
    const r = await db.query(
      `INSERT INTO ${schema}.stock_receipts (receipt_number,purchase_document_id,warehouse_id,reception_date,supplier_id,notes,created_by) VALUES ($1,$2,$3,COALESCE($4,NOW()),$5,$6,$7) RETURNING *`,
      [
        b.receipt_number || `REC-${Date.now()}`,
        b.purchase_document_id,
        b.warehouse_id,
        b.reception_date || null,
        doc.rows[0].supplier_id,
        b.notes || null,
        req.user.id,
      ],
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message });
  }
};
exports.confirm = async (req, res) => {
  const client = await db.getClient();
  try {
    if (req.user?.read_only)
      return res
        .status(403)
        .json({ error: "Operación no permitida en modo solo lectura" });
    const { schema } = await resolveSchema(req);
    const lines = req.body.lines;
    if (!Array.isArray(lines) || !lines.length)
      return res.status(400).json({ error: "Se requiere al menos una línea" });
    await client.query("BEGIN");
    const receipt = await client.query(
      `SELECT * FROM ${schema}.stock_receipts WHERE id=$1 FOR UPDATE`,
      [req.params.id],
    );
    if (!receipt.rows.length)
      throw Object.assign(new Error("Recepción no encontrada"), {
        statusCode: 404,
      });
    if (receipt.rows[0].status !== "draft")
      throw Object.assign(new Error("Solo se confirman recepciones draft"), {
        statusCode: 409,
      });
    for (const line of lines) {
      const qty = Number(line.quantity_received);
      if (!line.purchase_document_line_id || !line.product_id || !(qty > 0))
        throw Object.assign(new Error("Línea de recepción inválida"), {
          statusCode: 400,
        });
      const pl = await client.query(
        `SELECT * FROM ${schema}.purchase_document_lines WHERE id=$1 AND purchase_document_id=$2 FOR UPDATE`,
        [line.purchase_document_line_id, receipt.rows[0].purchase_document_id],
      );
      if (!pl.rows.length || qty > Number(pl.rows[0].pending_quantity))
        throw Object.assign(new Error("Cantidad recibida excede pendiente"), {
          statusCode: 409,
        });
      const cost = Number(line.unit_cost ?? pl.rows[0].unit_cost);
      await client.query(
        `INSERT INTO ${schema}.stock_receipt_lines (stock_receipt_id,purchase_document_line_id,product_id,quantity_received,unit_cost,unit,batch_number,serial_number,expiration_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          req.params.id,
          line.purchase_document_line_id,
          line.product_id,
          qty,
          cost,
          line.unit || pl.rows[0].unit,
          line.batch_number || null,
          line.serial_number || null,
          line.expiration_date || null,
        ],
      );
      await client.query(
        `INSERT INTO ${schema}.stock_movements (movement_type,product_id,warehouse_id,reference_table,reference_id,reference_number,quantity,unit_cost,total_cost,signed_quantity,notes,created_by) VALUES ('receipt',$1,$2,'stock_receipts',$3,$4,$5,$6,$7,$5,$8,$9)`,
        [
          line.product_id,
          receipt.rows[0].warehouse_id,
          req.params.id,
          receipt.rows[0].receipt_number,
          qty,
          cost,
          qty * cost,
          line.notes || null,
          req.user.id,
        ],
      );
      await client.query(
        `UPDATE ${schema}.purchase_document_lines SET received_quantity=received_quantity+$1,pending_quantity=pending_quantity-$1 WHERE id=$2`,
        [qty, line.purchase_document_line_id],
      );
      const p = await client.query(
        `SELECT COALESCE(SUM(signed_quantity),0) on_hand FROM ${schema}.stock_movements WHERE product_id=$1`,
        [line.product_id],
      );
      await client.query(
        `UPDATE ${schema}.products SET average_cost=CASE WHEN $1+$2=0 THEN average_cost ELSE (($1*average_cost)+($2*$3))/($1+$2) END,last_purchase_cost=$3 WHERE id=$4`,
        [Number(p.rows[0].on_hand) - qty, qty, cost, line.product_id],
      );
    }
    const pending = await client.query(
      `SELECT COUNT(*) count FROM ${schema}.purchase_document_lines WHERE purchase_document_id=$1 AND pending_quantity>0`,
      [receipt.rows[0].purchase_document_id],
    );
    await client.query(
      `UPDATE ${schema}.purchase_documents SET status=$1,updated_at=NOW() WHERE id=$2`,
      [
        Number(pending.rows[0].count) > 0 ? "partially_received" : "received",
        receipt.rows[0].purchase_document_id,
      ],
    );
    await client.query(
      `UPDATE ${schema}.stock_receipts SET status='confirmed' WHERE id=$1`,
      [req.params.id],
    );
    await client.query("COMMIT");
    for (const line of lines) {
      const stock = await db.query(
        `SELECT COALESCE(SUM(sm.signed_quantity),0) on_hand,p.reorder_point,p.name FROM ${schema}.stock_movements sm JOIN ${schema}.products p ON p.id=sm.product_id WHERE sm.product_id=$1 AND sm.warehouse_id=$2 GROUP BY p.reorder_point,p.name`,
        [line.product_id, receipt.rows[0].warehouse_id],
      );
      if (
        stock.rows.length &&
        Number(stock.rows[0].reorder_point) > 0 &&
        Number(stock.rows[0].on_hand) <= Number(stock.rows[0].reorder_point)
      )
        await createNotification({
          userId: req.user.id,
          companyId: req.user.company_id,
          type: "warning",
          category: "inventory",
          title: "Stock bajo",
          body: `${stock.rows[0].name} alcanzó su punto de reposición`,
        });
    }
    res.json({ id: Number(req.params.id), status: "confirmed" });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(e.statusCode || 500).json({ error: e.message });
  } finally {
    client.release();
  }
};
