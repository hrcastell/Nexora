import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
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
          component: VisualConfigView
        },
        {
          path: 'admin/companies',
          name: 'admin-companies',
          component: CompaniesListView
        },
        {
          path: 'admin/companies/:id',
          name: 'admin-company-details',
          component: CompanyDetailsView
        },
        {
          path: 'admin/requests',
          name: 'admin-requests',
          component: SolicitudesListView,
          meta: { requiresSuperAdmin: true }
        },
        {
          path: 'admin/users',
          name: 'admin-users',
          component: UsersView
        },
        {
          path: 'admin/profiles',
          name: 'admin-profiles',
          component: ProfilesView
        },
        {
          path: 'admin/modules',
          name: 'admin-modules',
          component: ModulesView
        },
        {
          path: 'admin/commercial',
          name: 'admin-commercial',
          component: CommercialView
        },
        {
          path: 'admin/reports',
          name: 'admin-reports',
          component: ReportsView,
          meta: { requiresSuperAdmin: true }
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

  // On first navigation, validate persisted token against the server
  if (!authChecked && authStore.token) {
    authChecked = true
    await authStore.checkAuth()
  } else {
    authChecked = true
  }

  const isAuthenticated = authStore.isAuthenticated
  const hasCompany = !!authStore.currentCompany

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    if (hasCompany) {
      next('/dashboard')
    } else {
      next('/select-company')
    }
  } else if (to.meta.requiresCompany && !hasCompany) {
    next('/select-company')
  } else if (to.meta.requiresSuperAdmin && !authStore.user?.is_super_admin) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
