const db = require('../../config/db');
const { resolveSchema } = require('../../utils/tenantResolver');

/**
 * GET /garage/vehicles/:id/history
 * Historial técnico completo del vehículo: todas las órdenes de trabajo con sus servicios y productos.
 */
exports.getVehicleHistory = async (req, res) => {
    try {
        const { schema } = await resolveSchema(req);
        const vehicleId = req.params.id;

        // Verificar que el vehículo existe
        const vehicleRes = await db.query(
            `SELECT v.*,
                    c.first_name || ' ' || COALESCE(c.last_name,'') AS customer_name,
                    c.phone AS customer_phone,
                    vb.name AS brand, vm.name AS model, v.version, v.plate, v.year
             FROM ${schema}.vehicles v
             LEFT JOIN ${schema}.customers c        ON c.id = v.customer_id
             LEFT JOIN ${schema}.vehicle_brands vb  ON vb.id = v.brand_id
             LEFT JOIN ${schema}.vehicle_models vm  ON vm.id = v.model_id
             WHERE v.id = $1`,
            [vehicleId]
        );
        if (vehicleRes.rows.length === 0) return res.status(404).json({ error: 'Vehículo no encontrado' });

        const vehicle = vehicleRes.rows[0];

        // Obtener todas las órdenes de trabajo del vehículo (excluyendo cancelled)
        const ordersRes = await db.query(
            `SELECT wo.id, wo.order_number, wo.status, wo.priority,
                    wo.entry_date, wo.delivery_date, wo.estimated_delivery_date,
                    wo.reported_issue, wo.diagnosis, wo.reception_notes,
                    wo.fuel_level, wo.vehicle_condition_notes,
                    wo.mileage_in, wo.mileage_out,
                    wo.subtotal_labor, wo.subtotal_products, wo.total_amount, wo.currency,
                    wo.internal_notes, wo.customer_notes,
                    wo.appointment_id,
                    e.first_name || ' ' || COALESCE(e.last_name,'') AS responsible_employee,
                    apts.appointment_number
             FROM ${schema}.work_orders wo
             LEFT JOIN ${schema}.employees e      ON e.id = wo.assigned_employee_id
             LEFT JOIN ${schema}.appointments apts ON apts.id = wo.appointment_id
             WHERE wo.vehicle_id = $1
               AND wo.status <> 'cancelled'
             ORDER BY wo.entry_date DESC`,
            [vehicleId]
        );

        // Para cada orden, cargar sus servicios y productos
        const orders = [];
        for (const order of ordersRes.rows) {
            const servicesRes = await db.query(
                `SELECT wos.id, wos.service_name, wos.description, wos.status,
                        wos.estimated_hours, wos.actual_hours, wos.hourly_rate,
                        wos.labor_total, wos.products_total, wos.service_total,
                        e.first_name || ' ' || COALESCE(e.last_name,'') AS mechanic_name
                 FROM ${schema}.work_order_services wos
                 LEFT JOIN ${schema}.employees e ON e.id = wos.assigned_employee_id
                 WHERE wos.work_order_id = $1
                 ORDER BY wos.id ASC`,
                [order.id]
            );

            const services = [];
            for (const svc of servicesRes.rows) {
                const productsRes = await db.query(
                    `SELECT product_name, quantity, unit, unit_price, total_price
                     FROM ${schema}.work_order_service_products
                     WHERE work_order_service_id = $1
                     ORDER BY id ASC`,
                    [svc.id]
                );
                services.push({ ...svc, products: productsRes.rows });
            }

            orders.push({ ...order, services });
        }

        // Resumen estadístico
        const summaryRes = await db.query(
            `SELECT
                COUNT(*)                                                      AS total_orders,
                COUNT(*) FILTER (WHERE status = 'delivered')                  AS delivered_orders,
                COUNT(*) FILTER (WHERE status IN ('draft','received','diagnosis','approved','in_progress','waiting_parts','completed')) AS active_orders,
                COALESCE(MAX(mileage_in), 0)                                  AS last_mileage,
                COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0) AS total_spent
             FROM ${schema}.work_orders
             WHERE vehicle_id = $1 AND status <> 'cancelled'`,
            [vehicleId]
        );

        res.json({
            vehicle,
            summary: summaryRes.rows[0],
            orders
        });
    } catch (err) {
        console.error('vehicleHistoryController.getVehicleHistory error:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Error al obtener historial del vehículo' });
    }
};
