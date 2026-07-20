import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMenuStore } from '../stores/menu'
import LoginView from '../views/LoginView.vue'
import SelectCompanyView from '../views/SelectCompanyView.vue'
import DashboardView from '../views/DashboardView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import CompaniesListView from '../views/admin/CompaniesListView.vue'
import CompanyDetailsView from '../views/admin/CompanyDetailsView.vue'
import SolicitudesListView from '../views/admin/SolicitudesListView.vue'
import VisualConfigView from '../views/VisualConfigView.vue'
import UsersView from '../views/admin/UsersView.vue'
import ReportsView from '../views/admin/ReportsView.vue'
import ModulesManagerView from '../views/admin/ModulesManagerView.vue'
import ProfilesView from '../views/admin/ProfilesView.vue'
import CommercialView from '../views/admin/CommercialView.vue'
import SubscriptionsView from '../views/admin/SubscriptionsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/select-company',
      name: 'select-company',
      component: SelectCompanyView,
      meta: { requiresAuth: true }
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView
        },
        {
          path: 'admin/config',
          name: 'admin-config',
          component: VisualConfigView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'visual_config' }
        },
        {
          path: 'admin/companies',
          name: 'admin-companies',
          component: CompaniesListView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'companies' }
        },
        {
          path: 'admin/companies/:id',
          name: 'admin-company-details',
          component: CompanyDetailsView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'companies' }
        },
        {
          path: 'admin/requests',
          name: 'admin-requests',
          component: SolicitudesListView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'requests' }
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: UsersView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'users' }
        },
        {
          path: 'admin/profiles',
          name: 'admin-profiles',
          component: ProfilesView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'profiles' }
        },
        {
          path: 'admin/modules',
          name: 'admin-modules',
          component: ModulesManagerView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'modules' }
        },
        {
          path: 'admin/modules-manager',
          redirect: '/admin/modules'
        },
        {
          path: 'admin/commercial',
          name: 'admin-commercial',
          component: CommercialView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'commercial' }
        },
        {
          path: 'admin/subscriptions',
          name: 'admin-subscriptions',
          component: SubscriptionsView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'subscriptions' }
        },
        {
          path: 'admin/reports',
          name: 'admin-reports',
          component: ReportsView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'reports' }
        },
        {
          path: 'admin/notifications',
          name: 'admin-notifications',
          component: () => import('../views/admin/screens_notifications_center.vue'),
          meta: { requiresModule: 'configuration', requiresTransaction: 'notifications' }
        },
        {
          path: 'admin/notifications/settings',
          name: 'admin-notifications-settings',
          component: () => import('../views/admin/screens_notification_preferences.vue'),
          meta: { requiresModule: 'configuration', requiresTransaction: 'notification_settings' }
        }
      ]
    },
    // ── Business Cores ────────────────────────────────────────────────────────
    // Patrón estándar para registrar un Core de negocio futuro.
    // Cada Core corresponde a un módulo en public.module_catalog con
    // category='business_core'. El guard `requiresModule` asegura que la
    // empresa tenga el módulo habilitado en company_modules.
    //
    // Para instalar un Core en una empresa: ModulesManagerView → toggle is_enabled
    // Para que aparezca en el menú: agregar transacciones en public.module_transactions
    // El sidebar en AdminLayout renderiza el módulo automáticamente cuando está habilitado.
    // ─────────────────────────────────────────────────────────────────────────────

    // ── Core 1: Garage Operations (code='garage_operations') ─────────────────
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'garage',
          name: 'garage-dashboard',
          component: () => import('../views/garage/screens_garage_dashboard.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_dashboard' }
        },
        {
          path: 'garage/dashboard',
          redirect: '/garage'
        },
        {
          path: 'garage/customers',
          name: 'garage-customers',
          component: () => import('../views/garage/screens_garage_customers.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_customers' }
        },
        {
          path: 'garage/customers/:id',
          name: 'garage-customer-detail',
          component: () => import('../views/garage/screens_garage_customer_detail.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_customers' }
        },
        {
          path: 'garage/vehicles',
          name: 'garage-vehicles',
          component: () => import('../views/garage/screens_garage_vehicles.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_vehicles' }
        },
        {
          path: 'garage/vehicles/:id',
          name: 'garage-vehicle-detail',
          component: () => import('../views/garage/screens_garage_vehicle_detail.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_vehicles' }
        },
        {
          path: 'garage/vehicles/search',
          name: 'garage-vehicle-search',
          component: () => import('../views/garage/screens_garage_vehicle_search.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_vehicles' }
        },
        {
          path: 'garage/appointments',
          name: 'garage-appointments',
          component: () => import('../views/garage/screens_garage_appointments.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_appointments' }
        },
        {
          path: 'garage/work-orders',
          name: 'garage-work-orders',
          component: () => import('../views/garage/screens_garage_work_orders.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_work_orders' }
        },
        {
          path: 'garage/work-orders/:id',
          name: 'garage-work-order-detail',
          component: () => import('../views/garage/screens_garage_work_order_detail.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_work_orders' }
        },
        {
          path: 'garage/work-orders/:id/payments',
          name: 'garage-work-order-payments',
          component: () => import('../views/garage/screens_garage_work_order_payments.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_work_orders' }
        },
        {
          path: 'garage/employees',
          name: 'garage-employees',
          component: () => import('../views/garage/screens_garage_employees.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_employees' }
        },
        {
          path: 'garage/labor-rates',
          name: 'garage-labor-rates',
          component: () => import('../views/garage/screens_garage_labor_rates.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_labor_rates' }
        },
        {
          path: 'garage/products',
          name: 'garage-products',
          component: () => import('../views/garage/screens_garage_products.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_products' }
        },
        {
          path: 'garage/service-templates',
          name: 'garage-service-templates',
          component: () => import('../views/garage/screens_garage_service_templates.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_service_templates' }
        },
        {
          path: 'garage/catalogs',
          name: 'garage-catalogs',
          component: () => import('../views/garage/screens_garage_catalogs.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_catalogs' }
        },
        {
          path: 'garage/settings',
          name: 'garage-settings',
          component: () => import('../views/garage/screens_garage_settings.vue'),
          meta: { requiresModule: 'garage_operations', requiresTransaction: 'garage_settings' }
        },
      ]
    },
    // ─────────────────────────────────────────────────────────────────────────

    // ── Neutral Products catalog (code='products', virtual OR enablement) ────
    // design §1 ADR-1 + §8: same screen as garage-products, reached via the
    // neutral top-level route (matches public.module_transactions route
    // '/products' seeded in migration 51, so the dynamic sidebar link lands
    // on a working page). The legacy 'garage-products' route above is kept
    // alive unchanged (no broken bookmarks/menus).
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'products',
          name: 'products-catalog',
          component: () => import('../views/garage/screens_garage_products.vue'),
          meta: { requiresAnyModule: ['garage_operations', 'inventory'], requiresTransaction: 'products' }
        },
      ]
    },
    // ─────────────────────────────────────────────────────────────────────────

    // ── Core 2: Financial Core (code='financial_core') ───────────────────────
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'financial',
          name: 'financial-dashboard',
          component: () => import('../views/financial/screens_financial_dashboard.vue'),
          meta: { requiresModule: 'financial_core', requiresTransaction: 'financial_dashboard' }
        },
        {
          path: 'financial/periods',
          name: 'financial-periods',
          component: () => import('../views/financial/screens_financial_periods.vue'),
          meta: { requiresModule: 'financial_core', requiresTransaction: 'financial_periods' }
        },
        {
          path: 'financial/periods/:periodId',
          name: 'financial-period-detail',
          component: () => import('../views/financial/screens_financial_period_detail.vue'),
          meta: { requiresModule: 'financial_core', requiresTransaction: 'financial_summary' }
        },
        {
          path: 'financial/categories',
          name: 'financial-categories',
          component: () => import('../views/financial/screens_financial_categories.vue'),
          meta: { requiresModule: 'financial_core', requiresTransaction: 'financial_categories' }
        },
      ]
    },
    // ─────────────────────────────────────────────────────────────────────────

    // ── Core 3: Dental Core (code='dental_core') ─────────────────────────────
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'dental',
          name: 'dental-dashboard',
          component: () => import('../views/dental/screens_dental_dashboard.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_dashboard' }
        },
        {
          path: 'dental/patients',
          name: 'dental-patients',
          component: () => import('../views/dental/screens_dental_patients.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_patients' }
        },
        {
          path: 'dental/patients/:id',
          name: 'dental-patient-detail',
          component: () => import('../views/dental/screens_dental_patient_detail.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_patients' }
        },
        {
          path: 'dental/appointments',
          name: 'dental-appointments',
          component: () => import('../views/dental/screens_dental_appointments.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_appointments' }
        },
        {
          path: 'dental/consultations',
          name: 'dental-consultations',
          component: () => import('../views/dental/screens_dental_consultations.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_consultations' }
        },
        {
          path: 'dental/consultations/:id',
          name: 'dental-consultation-detail',
          component: () => import('../views/dental/screens_dental_consultation_detail.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_consultations' }
        },
        {
          path: 'dental/finance',
          name: 'dental-finance',
          component: () => import('../views/dental/screens_dental_finance.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_finance' }
        },
        {
          path: 'dental/config/treatments',
          name: 'dental-treatments',
          component: () => import('../views/dental/screens_dental_treatments.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_treatments' }
        },
        {
          path: 'dental/quotes',
          name: 'dental-quotes',
          component: () => import('../views/dental/screens_dental_quotes.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_consultations' }
        },
        {
          path: 'dental/quotes/:id',
          name: 'dental-quote-detail',
          component: () => import('../views/dental/screens_dental_quote_detail.vue'),
          meta: { requiresModule: 'dental_core', requiresTransaction: 'dental_consultations' }
        },
      ]
    },
    // ─────────────────────────────────────────────────────────────────────────

    // Core 4: Inventory (code='inventory')
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'inventory',
          name: 'inventory-home',
          component: () => import('../views/inventory/InventoryHomeView.vue'),
          meta: { requiresModule: 'inventory' }
        },
        {
          path: 'inventory/suppliers',
          name: 'inventory-suppliers',
          component: () => import('../views/inventory/screens_inventory_suppliers.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_suppliers' }
        },
        {
          path: 'inventory/warehouses',
          name: 'inventory-warehouses',
          component: () => import('../views/inventory/screens_inventory_warehouses.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_warehouses' }
        },
        {
          path: 'inventory/purchase-documents',
          name: 'inventory-purchase-documents',
          component: () => import('../views/inventory/screens_inventory_purchase_documents.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_purchase_documents' }
        },
        {
          path: 'inventory/purchase-documents/new',
          name: 'inventory-purchase-document-new',
          component: () => import('../views/inventory/screens_inventory_purchase_documents.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_purchase_documents' }
        },
        {
          path: 'inventory/purchase-documents/:id',
          name: 'inventory-purchase-document-detail',
          component: () => import('../views/inventory/screens_inventory_purchase_documents.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_purchase_documents' }
        },
        {
          path: 'inventory/receptions',
          name: 'inventory-receptions',
          component: () => import('../views/inventory/screens_inventory_receptions.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_receipts' }
        },
        {
          path: 'inventory/receptions/new',
          name: 'inventory-reception-new',
          component: () => import('../views/inventory/screens_inventory_receptions.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_receipts' }
        },
        {
          path: 'inventory/receptions/:id',
          name: 'inventory-reception-detail',
          component: () => import('../views/inventory/screens_inventory_receptions.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_receipts' }
        },
        {
          path: 'inventory/stock',
          name: 'inventory-stock',
          component: () => import('../views/inventory/screens_inventory_stock.vue'),
          meta: { requiresModule: 'inventory', requiresTransaction: 'inventory_stock' }
        },
      ]
    },

    // Core 5: Human Resources (code='human_resources')
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'hr/organization',
          name: 'hr-organization',
          component: () => import('../views/hr/screens_hr_org_settings.vue'),
          meta: { requiresModule: 'human_resources', requiresTransaction: 'hr_org_settings' }
        },
        {
          path: 'hr/employees',
          name: 'hr-employees',
          component: () => import('../views/hr/screens_hr_employees.vue'),
          meta: { requiresModule: 'human_resources', requiresTransaction: 'hr_employees' }
        },
        {
          path: 'hr/employees/:id',
          name: 'hr-employee-profile',
          component: () => import('../views/hr/screens_hr_employee_profile.vue'),
          meta: { requiresModule: 'human_resources', requiresTransaction: 'hr_employee_profile' }
        },
        {
          path: 'hr/requests',
          name: 'hr-requests',
          component: () => import('../views/hr/screens_hr_requests.vue'),
          meta: { requiresModule: 'human_resources', requiresTransaction: 'hr_requests' }
        },
        {
          path: 'hr/approvals',
          name: 'hr-request-approvals',
          component: () => import('../views/hr/screens_hr_request_approvals.vue'),
          meta: { requiresModule: 'human_resources', requiresTransaction: 'hr_request_approvals' }
        },
      ]
    },

    // Core 6: Treasury and Collections (code='treasury_collections')
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        {
          path: 'treasury/settings',
          name: 'treasury-settings',
          component: () => import('../views/treasury/screens_treasury_settings.vue'),
          meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_settings' }
        },
        {
          path: 'treasury/cash-sessions',
          name: 'treasury-cash-sessions',
          component: () => import('../views/treasury/screens_treasury_cash_sessions.vue'),
          meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_cash_sessions' }
        },
        { path: 'treasury/receipts', name: 'treasury-receipts', component: () => import('../views/treasury/screens_treasury_receipts.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_receipts' } },
        { path: 'treasury/disbursements', name: 'treasury-disbursements', component: () => import('../views/treasury/screens_treasury_disbursements.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_disbursements' } },
        { path: 'treasury/receivables', name: 'treasury-receivables', component: () => import('../views/treasury/screens_treasury_receivables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_receivables' } },
        { path: 'treasury/receivables/new', name: 'treasury-receivables-new', component: () => import('../views/treasury/screens_treasury_receivables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_receivables' } },
        { path: 'treasury/receivables/:id', name: 'treasury-receivables-detail', component: () => import('../views/treasury/screens_treasury_receivables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_receivables' } },
        { path: 'treasury/payables', name: 'treasury-payables', component: () => import('../views/treasury/screens_treasury_payables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_payables' } },
        { path: 'treasury/payables/new', name: 'treasury-payables-new', component: () => import('../views/treasury/screens_treasury_payables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_payables' } },
        { path: 'treasury/payables/:id', name: 'treasury-payables-detail', component: () => import('../views/treasury/screens_treasury_payables.vue'), meta: { requiresModule: 'treasury_collections', requiresTransaction: 'treasury_payables' } },
      ]
    },

    // Core 7: Cotizaciones (code='cotizaciones', standalone module — design §1 ADR-6)
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true, requiresCompany: true },
      children: [
        { path: 'cotizaciones', name: 'cotizaciones-list', component: () => import('../views/cotizaciones/screens_cotizaciones_list.vue'), meta: { requiresModule: 'cotizaciones', requiresTransaction: 'quotes' } },
        { path: 'cotizaciones/new', name: 'cotizaciones-new', component: () => import('../views/cotizaciones/screens_cotizaciones_detail.vue'), meta: { requiresModule: 'cotizaciones', requiresTransaction: 'quotes' } },
        { path: 'cotizaciones/:id', name: 'cotizaciones-detail', component: () => import('../views/cotizaciones/screens_cotizaciones_detail.vue'), meta: { requiresModule: 'cotizaciones', requiresTransaction: 'quotes' } },
      ]
    },

    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

// Shared promise for the initial token validation.
// Using a Promise instead of a boolean flag prevents race conditions on
// mobile where multiple navigations can fire during bootstrap and each
// would call checkAuth() independently, causing intermittent logouts.
let authCheckPromise: Promise<boolean> | null = null

// Called by selectCompany() after a new company-scoped token is stored,
// so the next beforeEach re-runs checkAuth() with the definitive token.
export function resetAuthCheckPromise() {
  authCheckPromise = null
}

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const menuStore = useMenuStore()

  // On first navigation, validate persisted token against the server.
  // All concurrent navigations share the same promise so checkAuth() runs once.
  if (authStore.token && !authCheckPromise) {
    authCheckPromise = authStore.checkAuth()
  }
  if (authCheckPromise) {
    await authCheckPromise
  }

  const isAuthenticated = authStore.isAuthenticated
  const hasCompany = !!authStore.currentCompany
  const isSuperAdmin = !!authStore.user?.is_super_admin

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/login')
  }
  if (to.meta.requiresGuest && isAuthenticated) {
    return next(hasCompany ? '/dashboard' : '/select-company')
  }
  if (to.meta.requiresCompany && !hasCompany) {
    return next('/select-company')
  }
  if (to.meta.requiresSuperAdmin && !isSuperAdmin) {
    return next('/dashboard')
  }

  // Module/transaction guard (aditivo) — super_admin bypass.
  // Si el menú no cargó y la ruta requiere validación de transacción, esperar a que cargue.
  if (!isSuperAdmin && hasCompany) {
    const requiredModule = to.meta.requiresModule as string | undefined
    const requiredAnyModule = to.meta.requiresAnyModule as string[] | undefined
    const requiredTransaction = to.meta.requiresTransaction as string | undefined

    // Await menu load if transaction check is needed and menu not loaded
    if (requiredTransaction && !menuStore.loaded) {
      await menuStore.loadMenu()
    }

    if (requiredModule && !menuStore.hasModule(requiredModule)) {
      return next('/dashboard')
    }
    // OR-semantics module guard (products-catalog-transversal design §1):
    // route is reachable when ANY of the listed modules is enabled.
    if (requiredAnyModule && !menuStore.hasAnyModule(requiredAnyModule)) {
      return next('/dashboard')
    }
    // Validación por transacción: buscar por ruta exacta en el índice del menú.
    // Si el path existe en las transacciones habilitadas, se permite.
    if (requiredTransaction) {
      const route = to.path
      if (!menuStore.hasTransaction(route)) {
        // Permitir rutas dinámicas (ej: /admin/companies/:id) cuyo padre sí está habilitado
        const hasParent = Array.from(menuStore.routeIndex.keys()).some(r => r !== route && route.startsWith(r + '/'))
        if (!hasParent) return next('/dashboard')
      }
    }
  }

  return next()
})

export default router
