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
import AdminEditUserView from '@/views/admin/AdminEditUserView.vue'
import AdminDealsView from '@/views/admin/AdminDealsView.vue'
import WalletView from '@/views/WalletView.vue'
import SettingsView from '@/views/SettingsView.vue'
import UpdateProductView from '@/views/UpdateProductView.vue'
import EnterResetEmailView from '@/views/resetPassword/EnterResetEmailView.vue'
import ResetPasswordView from '@/views/resetPassword/ResetPasswordView.vue'
import AdminEditCategoryView from '@/views/admin/AdminEditCategoryView.vue'

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
      path: '/password-reset-email',
      name: 'password reset email',
      component: EnterResetEmailView,
    },
    {
      path: '/password-reset-code',
      name: 'password reset code',
      component: ResetPasswordView,
    },
    {
      path: '/user/:username',
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
      path: '/product/edit/:productId',
      name: 'edit product',
      component: UpdateProductView,
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
      path: '/admin/users/edit/:id',
      name: 'admin edit user',
      component: AdminEditUserView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/products',
      name: 'products',
      component: AdminProductsView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/deals',
      name: 'deals',
      component: AdminDealsView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/categories',
      name: 'categories',
      component: AdminCategoriesView,
      meta: { requiredAdmin: true }
    },
    {
      path: '/admin/categories/edit/:id',
      name: 'edit category',
      component: AdminEditCategoryView,
      meta: { requiredAuthorized: true }
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: WalletView,
      meta: { requiredAuthorized: true }
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsView,
      meta: { requiredAuthorized: true }
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: NotAccess,
    }
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
