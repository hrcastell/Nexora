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
    // Ejemplo para Core: Taller Mecánico (code='workshop')
    // {
    //   path: 'workshop/orders',
    //   name: 'workshop-orders',
    //   component: () => import('../views/workshop/screens_workshop_orders.vue'),
    //   meta: { requiresModule: 'workshop', requiresTransaction: 'workshop_orders' }
    // },
    // {
    //   path: 'workshop/orders/:id',
    //   name: 'workshop-order-detail',
    //   component: () => import('../views/workshop/screens_workshop_order_detail.vue'),
    //   meta: { requiresModule: 'workshop', requiresTransaction: 'workshop_orders' }
    // },
    //
    // Ejemplo para Core: Clientes (code='customers')
    // {
    //   path: 'customers',
    //   name: 'customers-list',
    //   component: () => import('../views/customers/screens_customers_list.vue'),
    //   meta: { requiresModule: 'customers', requiresTransaction: 'customers_list' }
    // },
    //
    // Para instalar un Core en una empresa: ModulesManagerView → toggle is_enabled
    // Para que aparezca en el menú: agregar transacciones en public.module_transactions
    // El sidebar en AdminLayout renderiza el módulo automáticamente cuando está habilitado.
    // ─────────────────────────────────────────────────────────────────────────────

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
