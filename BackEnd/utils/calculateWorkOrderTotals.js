/**
 * calculateWorkOrderTotals.js
 *
 * Recalcula los totales de una orden de trabajo y sus servicios.
 * Siempre opera dentro de una transacción existente (client).
 *
 * Fórmulas:
 *   service.labor_total    = actual_hours * hourly_rate
 *   service.products_total = SUM(wosp.total_price)
 *   service.service_total  = labor_total + products_total
 *   order.subtotal_labor   = SUM(wos.labor_total)
 *   order.subtotal_products= SUM(wos.products_total)
 *   order.total_amount     = subtotal_labor + subtotal_products
 */

/**
 * Recalcula totales de todos los servicios de una orden y luego el total de la orden.
 *
 * @param {number} workOrderId
 * @param {string} schema      - schema name del tenant (ya validado por tenantResolver)
 * @param {object} client      - cliente de pg dentro de una transacción BEGIN/COMMIT
 * @returns {Promise<{ subtotal_labor: number, subtotal_products: number, total_amount: number }>}
 */
async function recalculateTotals(workOrderId, schema, client) {
    // 1. Recalcular products_total por servicio
    await client.query(
        `UPDATE ${schema}.work_order_services wos
         SET products_total = COALESCE((
             SELECT SUM(total_price)
             FROM ${schema}.work_order_service_products
             WHERE work_order_service_id = wos.id
         ), 0),
         updated_at = CURRENT_TIMESTAMP
         WHERE wos.work_order_id = $1`,
        [workOrderId]
    );

    // 2. Recalcular labor_total y service_total por servicio
    await client.query(
        `UPDATE ${schema}.work_order_services
         SET labor_total   = ROUND(actual_hours * hourly_rate, 2),
             service_total = ROUND((actual_hours * hourly_rate) + products_total, 2),
             updated_at    = CURRENT_TIMESTAMP
         WHERE work_order_id = $1`,
        [workOrderId]
    );

    // 3. Recalcular totales de la orden
    const result = await client.query(
        `UPDATE ${schema}.work_orders wo
         SET subtotal_labor    = COALESCE((
                 SELECT SUM(labor_total)
                 FROM ${schema}.work_order_services
                 WHERE work_order_id = wo.id
             ), 0),
             subtotal_products = COALESCE((
                 SELECT SUM(products_total)
                 FROM ${schema}.work_order_services
                 WHERE work_order_id = wo.id
             ), 0),
             total_amount      = COALESCE((
                 SELECT SUM(service_total)
                 FROM ${schema}.work_order_services
                 WHERE work_order_id = wo.id
             ), 0),
             updated_at        = CURRENT_TIMESTAMP
         WHERE wo.id = $1
         RETURNING subtotal_labor, subtotal_products, total_amount`,
        [workOrderId]
    );

    return result.rows[0] || { subtotal_labor: 0, subtotal_products: 0, total_amount: 0 };
}

/**
 * Recalcula solo los totales de un servicio específico (sin tocar la orden completa).
 * Útil cuando se agrega/edita un producto dentro de un servicio.
 *
 * @param {number} workOrderServiceId
 * @param {string} schema
 * @param {object} client
 */
async function recalculateServiceTotals(workOrderServiceId, schema, client) {
    await client.query(
        `UPDATE ${schema}.work_order_services
         SET products_total = COALESCE((
                 SELECT SUM(total_price)
                 FROM ${schema}.work_order_service_products
                 WHERE work_order_service_id = $1
             ), 0),
             updated_at     = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [workOrderServiceId]
    );

    await client.query(
        `UPDATE ${schema}.work_order_services
         SET labor_total   = ROUND(actual_hours * hourly_rate, 2),
             service_total = ROUND((actual_hours * hourly_rate) + products_total, 2),
             updated_at    = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [workOrderServiceId]
    );
}

module.exports = { recalculateTotals, recalculateServiceTotals };
