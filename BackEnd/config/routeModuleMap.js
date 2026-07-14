/**
 * routeModuleMap.js
 *
 * Mapeo central de rutas del backend a su módulo/transacción correspondiente
 * según el catálogo global (public.module_catalog + public.module_transactions).
 *
 * Usado por el middleware `requireModule` para validar (en modo log-only
 * durante la fase 3) que el usuario tenga acceso al módulo de la compañía
 * antes de ejecutar el controller.
 *
 * Formato: { 'METHOD /path': { module: 'code', transaction: 'code' } }
 * - module:      código en public.module_catalog
 * - transaction: código en public.module_transactions (opcional)
 *
 * Las rutas usan el path base después de /api/... y aceptan comodines
 * básicos mediante path-to-regex style: `:id`, `:userId`, etc.
 *
 * Si una ruta NO está en el mapa, el middleware no valida (default-permit).
 */

const ROUTE_MODULE_MAP = {
    // ── Catálogo y menú (accesibles para todo user autenticado) ──
    // No se mapean → default-permit

    // ── Configuration: Companies ──
    'GET    /companies':                   { module: 'configuration', transaction: 'companies' },
    'POST   /companies':                   { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'PUT    /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'DELETE /companies/:id':               { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id/config':        { module: 'configuration', transaction: 'companies' },
    'PUT    /companies/:id/config':        { module: 'configuration', transaction: 'companies' },
    'GET    /companies/:id/roles':         { module: 'configuration', transaction: 'companies' },

    // ── Configuration: Users ──
    'GET    /companies/:id/users':                           { module: 'configuration', transaction: 'users' },
    'POST   /companies/:id/users':                           { module: 'configuration', transaction: 'users' },
    'PUT    /companies/:id/users/:userId':                   { module: 'configuration', transaction: 'users' },
    'PATCH  /companies/:id/users/:userId/status':            { module: 'configuration', transaction: 'users' },
    'POST   /companies/:id/users/:userId/profiles':          { module: 'configuration', transaction: 'users' },
    'DELETE /companies/:id/users/:userId/profiles/:profileId': { module: 'configuration', transaction: 'users' },
    'DELETE /companies/:id/users/:userId':                   { module: 'configuration', transaction: 'users' },
    'GET    /users':                                         { module: 'configuration', transaction: 'users' },
    'POST   /users/avatar':                                  { module: 'configuration', transaction: 'users' },

    // ── Configuration: Profiles (company-scoped, super_admin) ──
    'GET    /companies/:id/profiles':                              { module: 'configuration', transaction: 'profiles' },
    'POST   /companies/:id/profiles':                             { module: 'configuration', transaction: 'profiles' },
    'PUT    /companies/:id/profiles/:profileId':                  { module: 'configuration', transaction: 'profiles' },
    'DELETE /companies/:id/profiles/:profileId':                  { module: 'configuration', transaction: 'profiles' },
    'GET    /companies/:id/profiles/:profileId/permissions-full': { module: 'configuration', transaction: 'profiles' },
    'PUT    /companies/:id/profiles/:profileId/permissions-full': { module: 'configuration', transaction: 'profiles' },

    // ── Configuration: Profiles ──
    'GET    /profiles':                    { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id':                { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id/permissions':         { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id/permissions':         { module: 'configuration', transaction: 'profiles' },
    'GET    /profiles/:id/permissions-full':    { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id/permissions-full':    { module: 'configuration', transaction: 'profiles' },
    'POST   /profiles':                    { module: 'configuration', transaction: 'profiles' },
    'PUT    /profiles/:id':                { module: 'configuration', transaction: 'profiles' },
    'DELETE /profiles/:id':                { module: 'configuration', transaction: 'profiles' },

    // ── Configuration: Modules (catálogo y tenant legacy) ──
    'GET    /modules':                     { module: 'configuration', transaction: 'modules' },
    'GET    /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'POST   /modules':                     { module: 'configuration', transaction: 'modules' },
    'PUT    /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'PATCH  /modules/:id/status':          { module: 'configuration', transaction: 'modules' },
    'DELETE /modules/:id':                 { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/modules':             { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/modules/:id':         { module: 'configuration', transaction: 'modules' },
    'PUT    /catalog/modules/:id':         { module: 'configuration', transaction: 'modules' },
    'GET    /catalog/transactions':        { module: 'configuration', transaction: 'modules' },
    'PUT    /catalog/transactions/:id':    { module: 'configuration', transaction: 'modules' },
    'GET    /companies/:id/modules':       { module: 'configuration', transaction: 'modules' },
    'PUT    /companies/:id/modules/:moduleCode': { module: 'configuration', transaction: 'modules' },

    // ── Configuration: Reports ──
    'GET    /stats':                       { module: 'configuration', transaction: 'reports' },

    // ── Configuration: Commercial ──
    'PATCH  /companies/:id/commercial-status':               { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/agreements':                      { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/agreements':                      { module: 'configuration', transaction: 'commercial' },
    'PUT    /companies/:id/agreements/:aId':                 { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/agreements/:aId/generate-invoice': { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/invoices':                        { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/invoices':                        { module: 'configuration', transaction: 'commercial' },
    'PUT    /companies/:id/invoices/:iId':                   { module: 'configuration', transaction: 'commercial' },
    'POST   /companies/:id/invoices/:iId/payment':           { module: 'configuration', transaction: 'commercial' },
    'GET    /companies/:id/payments':                        { module: 'configuration', transaction: 'commercial' },

    // ── Configuration: Subscriptions ──
    'GET    /subscriptions/company/:companyId':              { module: 'configuration', transaction: 'subscriptions' },
    'GET    /subscriptions/company/:companyId/payments':     { module: 'configuration', transaction: 'subscriptions' },
    'POST   /subscriptions':                                 { module: 'configuration', transaction: 'subscriptions' },
    'PUT    /subscriptions/:id':                             { module: 'configuration', transaction: 'subscriptions' },
    'POST   /subscriptions/:id/payment':                     { module: 'configuration', transaction: 'subscriptions' },

    // ── Configuration: Requests (Solicitudes) ──
    'GET    /solicitudes':                 { module: 'configuration', transaction: 'requests' },
    'PUT    /solicitudes/:id':             { module: 'configuration', transaction: 'requests' },
    // POST /solicitudes/public is public — no mapeo

    // ── Garage Operations: Dashboard ──
    'GET    /garage/dashboard':            { module: 'garage_operations', transaction: 'garage_dashboard' },

    // ── Garage Operations: Catálogos ──
    'GET    /garage/catalogs/:type':            { module: 'garage_operations', transaction: 'garage_dashboard' },
    'POST   /garage/catalogs/:type':            { module: 'garage_operations', transaction: 'garage_dashboard' },
    'PUT    /garage/catalogs/:type/:id':        { module: 'garage_operations', transaction: 'garage_dashboard' },
    'PATCH  /garage/catalogs/:type/:id/status': { module: 'garage_operations', transaction: 'garage_dashboard' },

    // ── Garage Operations: Clientes ──
    'GET    /garage/customers':                  { module: 'garage_operations', transaction: 'garage_customers' },
    'POST   /garage/customers':                  { module: 'garage_operations', transaction: 'garage_customers' },
    'GET    /garage/customers/:id':              { module: 'garage_operations', transaction: 'garage_customers' },
    'PUT    /garage/customers/:id':              { module: 'garage_operations', transaction: 'garage_customers' },
    'PATCH  /garage/customers/:id/status':       { module: 'garage_operations', transaction: 'garage_customers' },
    'POST   /garage/customers/:id/photo':        { module: 'garage_operations', transaction: 'garage_customers' },
    'DELETE /garage/customers/:id/photo':        { module: 'garage_operations', transaction: 'garage_customers' },

    // ── Garage Operations: Vehículos ──
    'GET    /garage/vehicles':                           { module: 'garage_operations', transaction: 'garage_vehicles' },
    'POST   /garage/vehicles':                           { module: 'garage_operations', transaction: 'garage_vehicles' },
    'GET    /garage/vehicles/:id':                       { module: 'garage_operations', transaction: 'garage_vehicles' },
    'PUT    /garage/vehicles/:id':                       { module: 'garage_operations', transaction: 'garage_vehicles' },
    'PATCH  /garage/vehicles/:id/status':                { module: 'garage_operations', transaction: 'garage_vehicles' },
    'GET    /garage/vehicles/:id/history':               { module: 'garage_operations', transaction: 'garage_vehicle_history' },
    'GET    /garage/vehicles/:id/photos':                { module: 'garage_operations', transaction: 'garage_vehicles' },
    'POST   /garage/vehicles/:id/photos':                { module: 'garage_operations', transaction: 'garage_vehicles' },
    'DELETE /garage/vehicles/:id/photos/:photoId':       { module: 'garage_operations', transaction: 'garage_vehicles' },
    'GET    /garage/customers/:id/vehicles':             { module: 'garage_operations', transaction: 'garage_vehicles' },

    // ── Garage Operations: Empleados ──
    'GET    /garage/employees':              { module: 'garage_operations', transaction: 'garage_employees' },
    'POST   /garage/employees':              { module: 'garage_operations', transaction: 'garage_employees' },
    'GET    /garage/employees/:id':          { module: 'garage_operations', transaction: 'garage_employees' },
    'PUT    /garage/employees/:id':          { module: 'garage_operations', transaction: 'garage_employees' },
    'PATCH  /garage/employees/:id/status':   { module: 'garage_operations', transaction: 'garage_employees' },
    'POST   /garage/employees/:id/photo':    { module: 'garage_operations', transaction: 'garage_employees' },
    'DELETE /garage/employees/:id/photo':    { module: 'garage_operations', transaction: 'garage_employees' },

    // ── Garage Operations: Tarifas ──
    'GET    /garage/labor-rates':                          { module: 'garage_operations', transaction: 'garage_labor_rates' },
    'POST   /garage/labor-rates':                          { module: 'garage_operations', transaction: 'garage_labor_rates' },
    'GET    /garage/labor-rates/:id':                      { module: 'garage_operations', transaction: 'garage_labor_rates' },
    'PUT    /garage/labor-rates/:id':                      { module: 'garage_operations', transaction: 'garage_labor_rates' },
    'PATCH  /garage/labor-rates/:id/status':               { module: 'garage_operations', transaction: 'garage_labor_rates' },
    'GET    /garage/employees/:employeeId/labor-rates':    { module: 'garage_operations', transaction: 'garage_labor_rates' },

    // ── Garage Operations: Productos ──
    'GET    /garage/products':              { module: 'garage_operations', transaction: 'garage_products' },
    'POST   /garage/products':              { module: 'garage_operations', transaction: 'garage_products' },
    'GET    /garage/products/:id':          { module: 'garage_operations', transaction: 'garage_products' },
    'PUT    /garage/products/:id':          { module: 'garage_operations', transaction: 'garage_products' },
    'PATCH  /garage/products/:id/status':   { module: 'garage_operations', transaction: 'garage_products' },

    // ── Inventory: Proveedores ──
    'GET    /inventory/suppliers':            { module: 'inventory', transaction: 'inventory_suppliers' },
    'POST   /inventory/suppliers':            { module: 'inventory', transaction: 'inventory_suppliers' },
    'GET    /inventory/suppliers/:id':        { module: 'inventory', transaction: 'inventory_suppliers' },
    'PUT    /inventory/suppliers/:id':        { module: 'inventory', transaction: 'inventory_suppliers' },
    'PATCH  /inventory/suppliers/:id/status': { module: 'inventory', transaction: 'inventory_suppliers' },

    // ── Inventory: Bodegas ──
    'GET    /inventory/warehouses':            { module: 'inventory', transaction: 'inventory_warehouses' },
    'POST   /inventory/warehouses':            { module: 'inventory', transaction: 'inventory_warehouses' },
    'GET    /inventory/warehouses/:id':        { module: 'inventory', transaction: 'inventory_warehouses' },
    'PUT    /inventory/warehouses/:id':        { module: 'inventory', transaction: 'inventory_warehouses' },
    'PATCH  /inventory/warehouses/:id/status': { module: 'inventory', transaction: 'inventory_warehouses' },

    // ── Inventory: Documentos de compra ──
    'GET    /inventory/purchase-documents':            { module: 'inventory', transaction: 'inventory_purchase_documents' },
    'POST   /inventory/purchase-documents':            { module: 'inventory', transaction: 'inventory_purchase_documents' },
    'GET    /inventory/purchase-documents/:id':        { module: 'inventory', transaction: 'inventory_purchase_documents' },
    'PUT    /inventory/purchase-documents/:id':        { module: 'inventory', transaction: 'inventory_purchase_documents' },
    'PATCH  /inventory/purchase-documents/:id/status': { module: 'inventory', transaction: 'inventory_purchase_documents' },
    'GET    /inventory/stock-receipts':            { module: 'inventory', transaction: 'inventory_receipts' },
    'POST   /inventory/stock-receipts':            { module: 'inventory', transaction: 'inventory_receipts' },
    'GET    /inventory/stock-receipts/:id':        { module: 'inventory', transaction: 'inventory_receipts' },
    'POST   /inventory/stock-receipts/:id/confirm': { module: 'inventory', transaction: 'inventory_receipts' },
    'GET    /inventory/stock-by-product':          { module: 'inventory', transaction: 'inventory_stock' },
    'GET    /inventory/stock-by-warehouse':        { module: 'inventory', transaction: 'inventory_stock' },

    // ── Garage Operations: Servicios configurables ──
    'GET    /garage/service-templates':                            { module: 'garage_operations', transaction: 'garage_service_templates' },
    'POST   /garage/service-templates':                            { module: 'garage_operations', transaction: 'garage_service_templates' },
    'GET    /garage/service-templates/:id':                        { module: 'garage_operations', transaction: 'garage_service_templates' },
    'PUT    /garage/service-templates/:id':                        { module: 'garage_operations', transaction: 'garage_service_templates' },
    'PATCH  /garage/service-templates/:id/status':                 { module: 'garage_operations', transaction: 'garage_service_templates' },
    'POST   /garage/service-templates/:id/products':               { module: 'garage_operations', transaction: 'garage_service_templates' },
    'DELETE /garage/service-templates/:id/products/:productId':    { module: 'garage_operations', transaction: 'garage_service_templates' },

    // ── Garage Operations: Citas ──
    'GET    /garage/appointments':                               { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments':                               { module: 'garage_operations', transaction: 'garage_appointments' },
    'GET    /garage/appointments/:id':                           { module: 'garage_operations', transaction: 'garage_appointments' },
    'PUT    /garage/appointments/:id':                           { module: 'garage_operations', transaction: 'garage_appointments' },
    'PATCH  /garage/appointments/:id/status':                    { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments/:id/confirm':                   { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments/:id/mark-arrived':              { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments/:id/cancel':                    { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments/:id/reschedule':                { module: 'garage_operations', transaction: 'garage_appointments' },
    'POST   /garage/appointments/:id/convert-to-work-order':     { module: 'garage_operations', transaction: 'garage_appointments' },

    // ── Garage Operations: Órdenes de trabajo ──
    'GET    /garage/work-orders':                                        { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders':                                        { module: 'garage_operations', transaction: 'garage_work_orders' },
    'GET    /garage/work-orders/:id':                                    { module: 'garage_operations', transaction: 'garage_work_orders' },
    'PUT    /garage/work-orders/:id':                                    { module: 'garage_operations', transaction: 'garage_work_orders' },
    'PATCH  /garage/work-orders/:id/status':                             { module: 'garage_operations', transaction: 'garage_work_orders' },
    'PATCH  /garage/work-orders/:id/assign':                             { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/recalculate':                        { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/close':                              { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/cancel':                             { module: 'garage_operations', transaction: 'garage_work_orders' },
    'GET    /garage/work-orders/:id/services':                           { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/services':                           { module: 'garage_operations', transaction: 'garage_work_orders' },
    'GET    /garage/work-orders/:id/services/:serviceId':                { module: 'garage_operations', transaction: 'garage_work_orders' },
    'PUT    /garage/work-orders/:id/services/:serviceId':                { module: 'garage_operations', transaction: 'garage_work_orders' },
    'DELETE /garage/work-orders/:id/services/:serviceId':                { module: 'garage_operations', transaction: 'garage_work_orders' },
    'PATCH  /garage/work-orders/:id/services/:serviceId/status':         { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/services/:serviceId/products':       { module: 'garage_operations', transaction: 'garage_work_orders' },
    'DELETE /garage/work-orders/:id/services/:serviceId/products/:productLineId': { module: 'garage_operations', transaction: 'garage_work_orders' },

    // ── Garage Operations: Fotos de orden ──
    'GET    /garage/work-orders/:id/photos':                { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/photos':                { module: 'garage_operations', transaction: 'garage_work_orders' },
    'DELETE /garage/work-orders/:id/photos/:photoId':       { module: 'garage_operations', transaction: 'garage_work_orders' },

    // ── Garage Operations: Pagos de orden ──
    'GET    /garage/work-orders/:id/payments':              { module: 'garage_operations', transaction: 'garage_work_orders' },
    'POST   /garage/work-orders/:id/payments':              { module: 'garage_operations', transaction: 'garage_work_orders' },
    'DELETE /garage/work-orders/:id/payments/:paymentId':   { module: 'garage_operations', transaction: 'garage_work_orders' },

    // Treasury and Collections: Master data
    'GET    /treasury/counterparties':             { module: 'treasury_collections', transaction: 'treasury_settings' },
    'POST   /treasury/counterparties':             { module: 'treasury_collections', transaction: 'treasury_settings' },
    'GET    /treasury/counterparties/:id':         { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PUT    /treasury/counterparties/:id':         { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PATCH  /treasury/counterparties/:id/status':  { module: 'treasury_collections', transaction: 'treasury_settings' },
    'GET    /treasury/payment-terms':              { module: 'treasury_collections', transaction: 'treasury_settings' },
    'POST   /treasury/payment-terms':              { module: 'treasury_collections', transaction: 'treasury_settings' },
    'GET    /treasury/payment-terms/:id':          { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PUT    /treasury/payment-terms/:id':          { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PATCH  /treasury/payment-terms/:id/status':   { module: 'treasury_collections', transaction: 'treasury_settings' },
    'GET    /treasury/cash-registers':             { module: 'treasury_collections', transaction: 'treasury_settings' },
    'POST   /treasury/cash-registers':             { module: 'treasury_collections', transaction: 'treasury_settings' },
    'GET    /treasury/cash-registers/:id':         { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PUT    /treasury/cash-registers/:id':         { module: 'treasury_collections', transaction: 'treasury_settings' },
    'PATCH  /treasury/cash-registers/:id/status':  { module: 'treasury_collections', transaction: 'treasury_settings' },
    // ── Financial Core: Períodos ──
    'POST   /financial/periods':                                  { module: 'financial_core', transaction: 'financial_periods' },
    'GET    /financial/periods':                                  { module: 'financial_core', transaction: 'financial_periods' },
    'GET    /financial/periods/current':                          { module: 'financial_core', transaction: 'financial_periods' },
    'GET    /financial/periods/:periodId':                        { module: 'financial_core', transaction: 'financial_periods' },
    'POST   /financial/periods/:periodId/close':                  { module: 'financial_core', transaction: 'financial_periods' },

    // ── Financial Core: Categorías ──
    'POST   /financial/categories/seed':                          { module: 'financial_core', transaction: 'financial_categories' },
    'POST   /financial/categories':                               { module: 'financial_core', transaction: 'financial_categories' },
    'GET    /financial/categories':                               { module: 'financial_core', transaction: 'financial_categories' },
    'GET    /financial/categories/:categoryId':                   { module: 'financial_core', transaction: 'financial_categories' },
    'PUT    /financial/categories/:categoryId':                   { module: 'financial_core', transaction: 'financial_categories' },
    'PATCH  /financial/categories/:categoryId/status':            { module: 'financial_core', transaction: 'financial_categories' },
    'DELETE /financial/categories/:categoryId':                   { module: 'financial_core', transaction: 'financial_categories' },

    // ── Financial Core: Presupuesto ──
    'POST   /financial/periods/:periodId/budget-plans':           { module: 'financial_core', transaction: 'financial_budget' },
    'GET    /financial/periods/:periodId/budget-plans':           { module: 'financial_core', transaction: 'financial_budget' },
    'PUT    /financial/budget-plans/:budgetPlanId':               { module: 'financial_core', transaction: 'financial_budget' },
    'DELETE /financial/budget-plans/:budgetPlanId':               { module: 'financial_core', transaction: 'financial_budget' },

    // ── Financial Core: Transacciones ──
    'POST   /financial/periods/:periodId/transactions':           { module: 'financial_core', transaction: 'financial_transactions' },
    'GET    /financial/periods/:periodId/transactions':           { module: 'financial_core', transaction: 'financial_transactions' },
    'GET    /financial/transactions/:transactionId':              { module: 'financial_core', transaction: 'financial_transactions' },
    'PATCH  /financial/transactions/:transactionId':              { module: 'financial_core', transaction: 'financial_transactions' },
    'DELETE /financial/transactions/:transactionId':              { module: 'financial_core', transaction: 'financial_transactions' },

    // ── Financial Core: Resumen ──
    'GET    /financial/periods/:periodId/summary':                { module: 'financial_core', transaction: 'financial_summary' },
    'GET    /financial/periods/:periodId/breakdown':              { module: 'financial_core', transaction: 'financial_summary' },
    'GET    /financial/periods/:periodId/deviations':             { module: 'financial_core', transaction: 'financial_summary' },

    // ── Dental Core: Dashboard ──
    'GET    /dental/dashboard':                                   { module: 'dental_core', transaction: 'dental_dashboard' },
    'GET    /dental/dashboard/today':                             { module: 'dental_core', transaction: 'dental_dashboard' },
    'GET    /dental/dashboard/finance':                           { module: 'dental_core', transaction: 'dental_dashboard' },

    // ── Dental Core: Pacientes ──
    'GET    /dental/patients':                                    { module: 'dental_core', transaction: 'dental_patients' },
    'POST   /dental/patients':                                    { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id':                                { module: 'dental_core', transaction: 'dental_patients' },
    'PATCH  /dental/patients/:id':                                { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id/clinical-history':               { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id/medical-history':                { module: 'dental_core', transaction: 'dental_patients' },
    'POST   /dental/patients/:id/medical-history':                { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id/consultations':                  { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id/payments':                       { module: 'dental_core', transaction: 'dental_patients' },
    'GET    /dental/patients/:id/debt':                           { module: 'dental_core', transaction: 'dental_patients' },

    // ── Dental Core: Tratamientos ──
    'GET    /dental/treatments':                                  { module: 'dental_core', transaction: 'dental_treatments' },
    'POST   /dental/treatments':                                  { module: 'dental_core', transaction: 'dental_treatments' },
    'PATCH  /dental/treatments/:id':                              { module: 'dental_core', transaction: 'dental_treatments' },
    'DELETE /dental/treatments/:id':                              { module: 'dental_core', transaction: 'dental_treatments' },

    // ── Dental Core: Servicios ──
    'GET    /dental/services':                                    { module: 'dental_core', transaction: 'dental_services' },
    'POST   /dental/services':                                    { module: 'dental_core', transaction: 'dental_services' },
    'GET    /dental/services/:id':                                { module: 'dental_core', transaction: 'dental_services' },
    'PATCH  /dental/services/:id':                                { module: 'dental_core', transaction: 'dental_services' },
    'DELETE /dental/services/:id':                                { module: 'dental_core', transaction: 'dental_services' },
    'POST   /dental/services/:id/treatments':                     { module: 'dental_core', transaction: 'dental_services' },

    // ── Dental Core: Citas ──
    'GET    /dental/appointments':                                { module: 'dental_core', transaction: 'dental_appointments' },
    'GET    /dental/appointments/day':                            { module: 'dental_core', transaction: 'dental_appointments' },
    'GET    /dental/appointments/month':                          { module: 'dental_core', transaction: 'dental_appointments' },
    'POST   /dental/appointments':                                { module: 'dental_core', transaction: 'dental_appointments' },
    'GET    /dental/appointments/:id':                            { module: 'dental_core', transaction: 'dental_appointments' },
    'PATCH  /dental/appointments/:id':                            { module: 'dental_core', transaction: 'dental_appointments' },
    'POST   /dental/appointments/:id/confirm':                    { module: 'dental_core', transaction: 'dental_appointments' },
    'POST   /dental/appointments/:id/cancel':                     { module: 'dental_core', transaction: 'dental_appointments' },
    'POST   /dental/appointments/:id/no-show':                    { module: 'dental_core', transaction: 'dental_appointments' },
    'POST   /dental/appointments/:id/convert-to-consultation':    { module: 'dental_core', transaction: 'dental_appointments' },

    // ── Dental Core: Consultas ──
    'GET    /dental/consultations':                               { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations':                               { module: 'dental_core', transaction: 'dental_consultations' },
    'GET    /dental/consultations/:id':                           { module: 'dental_core', transaction: 'dental_consultations' },
    'PATCH  /dental/consultations/:id':                           { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/clinical-history':          { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/treatments':                { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/complete':                  { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/cancel':                    { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/create-charge':             { module: 'dental_core', transaction: 'dental_consultations' },
    'GET    /dental/consultations/:id/photos':                    { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/photos':                    { module: 'dental_core', transaction: 'dental_consultations' },
    'DELETE /dental/consultations/:id/photos/:photoId':           { module: 'dental_core', transaction: 'dental_consultations' },

    // ── Dental Core: Servicios por consulta ──
    'GET    /dental/consultations/:id/services':                  { module: 'dental_core', transaction: 'dental_consultations' },
    'GET    /dental/consultations/:id/services/total':            { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/services':                  { module: 'dental_core', transaction: 'dental_consultations' },
    'PATCH  /dental/consultations/:id/services/:sid':             { module: 'dental_core', transaction: 'dental_consultations' },
    'DELETE /dental/consultations/:id/services/:sid':             { module: 'dental_core', transaction: 'dental_consultations' },

    // ── Dental Core: Sesiones por consulta ──
    'GET    /dental/consultations/:id/sessions':                  { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/sessions':                  { module: 'dental_core', transaction: 'dental_consultations' },
    'GET    /dental/consultations/:id/sessions/:sid':             { module: 'dental_core', transaction: 'dental_consultations' },
    'PATCH  /dental/consultations/:id/sessions/:sid':             { module: 'dental_core', transaction: 'dental_consultations' },
    'POST   /dental/consultations/:id/sessions/:sid/complete':    { module: 'dental_core', transaction: 'dental_consultations' },

    // ── Dental Core: Estado de consulta ──
    'POST   /dental/consultations/:id/status':                    { module: 'dental_core', transaction: 'dental_consultations' },

    // ── Dental Core: Cobros ──
    'GET    /dental/charges':                                     { module: 'dental_core', transaction: 'dental_charges' },
    'POST   /dental/charges':                                     { module: 'dental_core', transaction: 'dental_charges' },
    'GET    /dental/charges/:id':                                 { module: 'dental_core', transaction: 'dental_charges' },
    'DELETE /dental/charges/:id':                                 { module: 'dental_core', transaction: 'dental_charges' },
    'POST   /dental/charges/:id/payments':                        { module: 'dental_core', transaction: 'dental_charges' },
    'POST   /dental/charges/:id/installments':                    { module: 'dental_core', transaction: 'dental_charges' },

    // ── Dental Core: Cuotas ──
    'GET    /dental/installments/overdue':                        { module: 'dental_core', transaction: 'dental_charges' },
    'POST   /dental/installments/:id/pay':                        { module: 'dental_core', transaction: 'dental_charges' },

    // ── Dental Core: Pagos ──
    'GET    /dental/payments':                                    { module: 'dental_core', transaction: 'dental_charges' },
    'DELETE /dental/payments/:id':                                { module: 'dental_core', transaction: 'dental_charges' },

    // ── Dental Core: Resumen financiero ──
    'GET    /dental/finance/summary':                             { module: 'dental_core', transaction: 'dental_dashboard' },
    // Human Resources: Organization masters
    'GET    /hr/departments':              { module: 'human_resources', transaction: 'hr_org_settings' },
    'POST   /hr/departments':              { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/departments/:id':          { module: 'human_resources', transaction: 'hr_org_settings' },
    'PUT    /hr/departments/:id':          { module: 'human_resources', transaction: 'hr_org_settings' },
    'PATCH  /hr/departments/:id/status':   { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/positions':                { module: 'human_resources', transaction: 'hr_org_settings' },
    'POST   /hr/positions':                { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/positions/:id':            { module: 'human_resources', transaction: 'hr_org_settings' },
    'PUT    /hr/positions/:id':            { module: 'human_resources', transaction: 'hr_org_settings' },
    'PATCH  /hr/positions/:id/status':     { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/cost-centers':             { module: 'human_resources', transaction: 'hr_org_settings' },
    'POST   /hr/cost-centers':             { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/cost-centers/:id':         { module: 'human_resources', transaction: 'hr_org_settings' },
    'PUT    /hr/cost-centers/:id':         { module: 'human_resources', transaction: 'hr_org_settings' },
    'PATCH  /hr/cost-centers/:id/status':  { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/work-shifts':              { module: 'human_resources', transaction: 'hr_org_settings' },
    'POST   /hr/work-shifts':              { module: 'human_resources', transaction: 'hr_org_settings' },
    'GET    /hr/work-shifts/:id':          { module: 'human_resources', transaction: 'hr_org_settings' },
    'PUT    /hr/work-shifts/:id':          { module: 'human_resources', transaction: 'hr_org_settings' },
    'PATCH  /hr/work-shifts/:id/status':   { module: 'human_resources', transaction: 'hr_org_settings' },

    // Human Resources: Employees
    'GET    /hr/employees':                { module: 'human_resources', transaction: 'hr_employees' },
    'GET    /hr/employees/:id':            { module: 'human_resources', transaction: 'hr_employee_profile' },
    'PUT    /hr/employees/:id':            { module: 'human_resources', transaction: 'hr_employees' },

    // Human Resources: Requests and approvals
    'GET    /hr/request-types':            { module: 'human_resources', transaction: 'hr_requests' },
    'GET    /hr/requests':                 { module: 'human_resources', transaction: 'hr_requests' },
    'POST   /hr/requests':                 { module: 'human_resources', transaction: 'hr_requests' },
    'GET    /hr/requests/:id':             { module: 'human_resources', transaction: 'hr_requests' },
    'POST   /hr/requests/:id/approve':     { module: 'human_resources', transaction: 'hr_request_approvals' },
    'POST   /hr/requests/:id/reject':      { module: 'human_resources', transaction: 'hr_request_approvals' },
    'POST   /hr/requests/:id/annul':       { module: 'human_resources', transaction: 'hr_request_approvals' },

};

/**
 * Convierte un path con parámetros (ej: /companies/:id) en una regex.
 */
function pathToRegex(path) {
    const escaped = path
        .replace(/[-/\\^$*+?.()|[\]{}]/g, (c) => c === '/' ? '/' : `\\${c}`)
        // Route parameters are escaped above; match the literal colon so dynamic routes resolve correctly.
        .replace(/:(\w+)/g, '[^/]+');
    return new RegExp(`^${escaped}$`);
}

// Pre-compile regex para todas las rutas del mapa
const COMPILED = Object.entries(ROUTE_MODULE_MAP).map(([key, value]) => {
    const [method, path] = key.trim().split(/\s+/);
    return {
        method: method.toUpperCase(),
        regex:  pathToRegex(path),
        path,
        ...value
    };
});

/**
 * Resuelve módulo/transacción para una ruta + método.
 * Retorna null si la ruta no está mapeada (default-permit).
 */
function resolveRouteModule(method, path) {
    const m = method.toUpperCase();
    for (const entry of COMPILED) {
        if (entry.method === m && entry.regex.test(path)) {
            return { module: entry.module, transaction: entry.transaction };
        }
    }
    return null;
}

module.exports = {
    ROUTE_MODULE_MAP,
    resolveRouteModule
};
