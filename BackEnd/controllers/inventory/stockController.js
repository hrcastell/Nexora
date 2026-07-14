const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

exports.getStockByProduct = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT sm.product_id, p.name AS product_name, sm.warehouse_id, w.name AS warehouse_name, SUM(sm.signed_quantity) AS on_hand FROM ${schema}.stock_movements sm JOIN ${schema}.products p ON p.id=sm.product_id JOIN ${schema}.warehouses w ON w.id=sm.warehouse_id WHERE ($1::int IS NULL OR sm.product_id=$1) GROUP BY sm.product_id,p.name,sm.warehouse_id,w.name ORDER BY p.name,w.name`, [req.query.product_id || null]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message || 'Error al consultar stock' }); }
};

exports.getStockByWarehouse = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const result = await db.query(`SELECT sm.warehouse_id, w.name AS warehouse_name, sm.product_id, p.name AS product_name, SUM(sm.signed_quantity) AS on_hand FROM ${schema}.stock_movements sm JOIN ${schema}.warehouses w ON w.id=sm.warehouse_id JOIN ${schema}.products p ON p.id=sm.product_id WHERE ($1::int IS NULL OR sm.warehouse_id=$1) GROUP BY sm.warehouse_id,w.name,sm.product_id,p.name ORDER BY w.name,p.name`, [req.query.warehouse_id || null]);
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message || 'Error al consultar stock' }); }
};
