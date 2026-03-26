import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import LoginView from '../views/LoginView.vue'
import SelectCompanyView from '../views/SelectCompanyView.vue'
import DashboardView from '../views/DashboardView.vue'
import AdminLayout from '../layouts/AdminLayout.vue'
import CompaniesListView from '../views/admin/CompaniesListView.vue'
import CompanyDetailsView from '../views/admin/CompanyDetailsView.vue'
import SolicitudesListView from '../views/admin/SolicitudesListView.vue'

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
          component: SolicitudesListView
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  
  // Check auth state
  // In a real app we might await a checkAuth() call here if persisting token
  // but for now relying on Pinia state initialized from localStorage
  
  const isAuthenticated = authStore.isAuthenticated
  const hasCompany = !!authStore.currentCompany

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    // If guest tries to go to login but is auth, redirect depending on state
    if (hasCompany) {
      next('/dashboard')
    } else {
      next('/select-company')
    }
  } else if (to.meta.requiresCompany && !hasCompany) {
    // If trying to access dashboard without company selected
    next('/select-company')
  } else {
    next()
  }
})

export default router
