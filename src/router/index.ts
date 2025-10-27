import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SignIn from '@/views/SignIn.vue'
import SignUp from '@/views/SignUp.vue'
import ProfileView from '@/views/ProfileView.vue'
import CreateProductView from '@/views/CreateProductView.vue'
import ProductPage from '@/views/ProductPage.vue'
import ChatsView from '@/views/ChatsView.vue'
import AdminHomeView from '@/views/admin/AdminHomeView.vue'
import { authService } from '@/api/auth/AuthService'
import NotAccess from '@/views/NotAccess.vue'
import AdminUsersView from '@/views/admin/AdminUsersView.vue'
import AdminProductsView from '@/views/admin/AdminProductsView.vue'
import AdminCategoriesView from '@/views/admin/AdminCategoriesView.vue'
import PasswordResetView from '@/views/PasswordResetView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/signin',
      name: 'signIn',
      component: SignIn,
    },
    {
      path: '/signup',
      name: 'signUp',
      component: SignUp,
    },
    {
      path: '/password-reset',
      name: 'password reset',
      component: PasswordResetView,
    },
    {
      path: '/profile/:username',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/product/create',
      name: 'create product',
      component: CreateProductView,
      meta: { requiredAuthorized: true }
    },
    {
      path: '/product/:productId',
      name: 'product page',
      component: ProductPage,
    },
    {
      path: '/chats',
      name: 'chats',
      component: ChatsView,
      meta: { requiredAuthorized: true }
    },
    {
      path: '/not-access',
      name: 'notAccess',
      component: NotAccess,
    },
    {
      path: '/admin',
      name: 'admin',
      component: AdminHomeView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/users',
      name: 'admin users',
      component: AdminUsersView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/products',
      name: 'products',
      component: AdminProductsView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/categories',
      name: 'categories',
      component: AdminCategoriesView,
      meta: { requiredAdmin: true }
    },
  ],
})


// проверка для роутов админки
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiredAdmin) {
    let userIsAdmin = false

    const user = await authService.getUser()

    if (user?.role === 'admin') {
      userIsAdmin = true
    }
    
    if (!userIsAdmin) {
      next('/not-access')
    } else {
      next()
    }
  } else if (to.meta.requiredAuthorized) {
      const user = await authService.getUser()

      if (user) {
        next()
      }
  }
  else {
    next()
  }
})

export default router
