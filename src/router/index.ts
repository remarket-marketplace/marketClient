import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SignIn from '@/views/SignIn.vue'
import SignUp from '@/views/SignUp.vue'
import ProfileView from '@/views/ProfileView.vue'
import CreateProductView from '@/views/CreateProductView.vue'
import ProductPage from '@/views/ProductPage.vue'
import ChatsView from '@/views/ChatsView.vue'

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
      path: '/profile/:username',
      name: 'profile',
      component: ProfileView,
    },
    {
      path: '/product/create',
      name: 'create product',
      component: CreateProductView,
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
    }
  ],
})

export default router
