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
import ModulesView from '../views/admin/ModulesView.vue'
import ModulesManagerView from '../views/admin/ModulesManagerView.vue'
import ProfilesView from '../views/admin/ProfilesView.vue'
import CommercialView from '../views/admin/CommercialView.vue'

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
          component: ModulesView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'modules' }
        },
        {
          path: 'admin/modules-manager',
          name: 'admin-modules-manager',
          component: ModulesManagerView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'modules' }
        },
        {
          path: 'admin/commercial',
          name: 'admin-commercial',
          component: CommercialView,
          meta: { requiresModule: 'configuration', requiresTransaction: 'commercial' }
        },
        {
          path: 'admin/reports',
          name: 'admin-reports',
          component: ReportsView,
          meta: { requiresSuperAdmin: true, requiresModule: 'configuration', requiresTransaction: 'reports' }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

let authChecked = false

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  const menuStore = useMenuStore()

  // On first navigation, validate persisted token against the server
  if (!authChecked && authStore.token) {
    authChecked = true
    await authStore.checkAuth()
  } else {
    authChecked = true
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
