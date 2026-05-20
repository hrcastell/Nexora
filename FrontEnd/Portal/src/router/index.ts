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

  // Module/transaction guard (aditivo) — super_admin bypass; también bypass si
  // el menú aún no cargó (evita falsos negativos durante el bootstrap).
  if (!isSuperAdmin && hasCompany && menuStore.loaded) {
    const requiredModule = to.meta.requiresModule as string | undefined
    const requiredTransaction = to.meta.requiresTransaction as string | undefined

    if (requiredModule && !menuStore.hasModule(requiredModule)) {
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
