const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

function computedPrice(averageCost, marginPct) {
    return Number(averageCost) * (1 + Number(marginPct) / 100);
}

/**
 * GET /garage/products/:id/prices
 * Returns every active price level joined with this product's margin (falling
 * back to the level's default_margin_pct when the product has no row yet),
 * plus the price computed live from products.average_cost.
 */
exports.list = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);

        const product = await db.query(`SELECT id, average_cost FROM ${schema}.products WHERE id = $1`, [req.params.id]);
        if (product.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
        const averageCost = Number(product.rows[0].average_cost || 0);

        const levels = await db.query(
            `SELECT pl.id AS price_level_id, pl.name, pl.display_order, pl.default_margin_pct,
                    pp.margin_pct AS product_margin_pct
             FROM ${schema}.product_price_levels pl
             LEFT JOIN ${schema}.product_prices pp ON pp.price_level_id = pl.id AND pp.product_id = $1
             WHERE pl.status = 'active'
             ORDER BY pl.display_order ASC, pl.name ASC`,
            [req.params.id]
        );

        const rows = levels.rows.map((row) => {
            const marginPct = row.product_margin_pct !== null ? Number(row.product_margin_pct) : Number(row.default_margin_pct);
            return {
                price_level_id: row.price_level_id,
                name: row.name,
                margin_pct: marginPct,
                price: computedPrice(averageCost, marginPct),
            };
        });

        res.json({ average_cost: averageCost, prices: rows });
    } catch (err) {
        console.error('productPricesController.list error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener los precios del producto' });
    }
};

/**
 * PUT /garage/products/:id/prices
 * Body: { prices: [{ price_level_id, margin_pct }] } — replaces this
 * product's full set of margins in one shot (delete + reinsert).
 */
exports.save = async (req, res) => {
    const client = await db.getClient();
    try {
        if (req.user?.read_only) return res.status(403).json({ error: 'Operación no permitida en modo solo lectura' });

        const { schema } = await resolveSchema(req);
        const prices = Array.isArray(req.body.prices) ? req.body.prices : [];

        await client.query('BEGIN');

        const product = await client.query(`SELECT id FROM ${schema}.products WHERE id = $1 FOR UPDATE`, [req.params.id]);
        if (product.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        await client.query(`DELETE FROM ${schema}.product_prices WHERE product_id = $1`, [req.params.id]);

        for (const row of prices) {
            const priceLevelId = Number(row.price_level_id);
            const marginPct = Number(row.margin_pct);
            if (!priceLevelId || !Number.isFinite(marginPct)) continue;
            await client.query(
                `INSERT INTO ${schema}.product_prices (product_id, price_level_id, margin_pct) VALUES ($1, $2, $3)`,
                [req.params.id, priceLevelId, marginPct]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Precios guardados' });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => undefined);
        console.error('productPricesController.save error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al guardar los precios del producto' });
    } finally {
        client.release();
    }
};
