/** @returns {Promise<{onHand:number, allowNegative:boolean}>} */
async function getAvailability(client, schema, { productId, warehouseId }) {
    const executor = client || require('../../config/db');
    const [stock, product] = await Promise.all([
        executor.query(`SELECT COALESCE(SUM(signed_quantity),0) AS on_hand FROM ${schema}.stock_movements WHERE product_id=$1 AND warehouse_id=$2`, [productId, warehouseId]),
        executor.query(`SELECT allow_negative_stock FROM ${schema}.products WHERE id=$1`, [productId])
    ]);
    return { onHand: Number(stock.rows[0].on_hand), allowNegative: Boolean(product.rows[0]?.allow_negative_stock) };
}
/** Contract stub for future Garage integration; caller owns the transaction. */
async function consumeStock() { throw new Error('Inventory consumption is not connected until Slice 3'); }
/** Contract stub for future Garage integration; caller owns the transaction. */
async function reverseConsumption() { throw new Error('Inventory consumption is not connected until Slice 3'); }
module.exports = { getAvailability, consumeStock, reverseConsumption };
