import { createRouter, createWebHistory, createMemoryHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import SignIn from "@/views/SignIn.vue";
import SignUp from "@/views/SignUp.vue";
import ProfileView from "@/views/ProfileView.vue";
import CreateProductView from "@/views/CreateProductView.vue";
import ProductPage from "@/views/ProductPage.vue";
import ChatsView from "@/views/ChatsView.vue";
import AdminHomeView from "@/views/admin/AdminHomeView.vue";
import { authService } from "@/api/auth/AuthService";
import NotAccess from "@/views/NotAccess.vue";
import AdminUsersView from "@/views/admin/AdminUsersView.vue";
import AdminProductsView from "@/views/admin/AdminProductsView.vue";
import AdminCategoriesView from "@/views/admin/AdminCategoriesView.vue";
import AdminEditUserView from "@/views/admin/AdminEditUserView.vue";
import AdminDealsView from "@/views/admin/AdminDealsView.vue";
import WalletView from "@/views/WalletView.vue";
import SettingsView from "@/views/SettingsView.vue";
import UpdateProductView from "@/views/UpdateProductView.vue";
import EnterResetEmailView from "@/views/resetPassword/EnterResetEmailView.vue";
import ResetPasswordView from "@/views/resetPassword/ResetPasswordView.vue";
import AdminEditCategoryView from "@/views/admin/AdminEditCategoryView.vue";
import FavoritesProductsView from "@/views/FavoritesProductsView.vue";
import AdminDealView from "@/views/admin/AdminDealView.vue";
import PaymentSuccessView from "@/views/PaymentSuccessView.vue";
import PaymentFailedView from "@/views/PaymentFailedView.vue";
import AdminChatView from "@/views/admin/AdminChatView.vue";
import AdminChatsView from "@/views/admin/AdminChatsView.vue";
import FeedbackView from "@/views/FeedbackView.vue";
import AdminFeedbacksView from "@/views/admin/AdminFeedbacksView.vue";
import AdminFeedbackView from "@/views/admin/AdminFeedbackView.vue";
import BecomeSellerView from "@/views/BecomeSellerView.vue";
import AboutView from "@/views/AboutView.vue";

const YANDEX_METRIKA_COUNTER_ID = 106722008;

const routes = [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/signin",
      name: "signIn",
      component: SignIn,
      meta: { requiredGuest: true },
    },
    {
      path: "/signup",
      name: "signUp",
      component: SignUp,
      meta: { requiredGuest: true },
    },
    {
      path: "/password-reset-email",
      name: "password reset email",
      component: EnterResetEmailView,
    },
    {
      path: "/password-reset-code",
      name: "password reset code",
      component: ResetPasswordView,
    },
    {
      path: "/user/:username",
      name: "profile",
      component: ProfileView,
    },
    {
      path: "/user/products/favorites",
      name: "favorites products",
      component: FavoritesProductsView,
    },
    {
      path: "/product/create",
      name: "create product",
      component: CreateProductView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/product/edit/:productId",
      name: "edit product",
      component: UpdateProductView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/product/:productId",
      name: "product page",
      component: ProductPage,
    },
    {
      path: "/chats/:chatId?",
      name: "chats",
      component: ChatsView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/not-access",
      name: "notAccess",
      component: NotAccess,
    },
    {
      path: "/admin",
      name: "admin",
      component: AdminHomeView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/users",
      name: "admin users",
      component: AdminUsersView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/users/edit/:id",
      name: "admin edit user",
      component: AdminEditUserView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/products",
      name: "products",
      component: AdminProductsView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/deals",
      name: "deals",
      component: AdminDealsView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/deal/:id",
      name: "deal",
      component: AdminDealView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/categories",
      name: "categories",
      component: AdminCategoriesView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/support/chats",
      name: "support chats",
      component: AdminChatsView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/feedback",
      name: "admin feedbacks",
      component: AdminFeedbacksView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/feedback/:feedbackId",
      name: "admin feedback",
      component: AdminFeedbackView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/categories/edit/:id",
      name: "edit category",
      component: AdminEditCategoryView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/admin/chats/:chatId",
      name: "adminChatView",
      component: AdminChatView,
      meta: { requiredAdmin: true },
    },
    {
      path: "/wallet",
      name: "wallet",
      component: WalletView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/payment/success",
      name: "success payment",
      component: PaymentSuccessView,
    },
    {
      path: "/payment/failed",
      name: "failed payment",
      component: PaymentFailedView,
    },
    {
      path: "/feedback",
      name: "feedback",
      component: FeedbackView,
      meta: { requiredAuthorized: true },
    },
    {
      path: "/become-seller",
      name: "become seller",
      component: BecomeSellerView,
    },
    {
      path: "/about",
      name: "about",
      component: AboutView,
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: NotAccess,
    },
  ]

export function createAppRouter(isSSR = false) {
  const history = isSSR ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL)
  const router = createRouter({
    history,
    routes,
  })

  router.beforeEach(async (to, from, next) => {
  const { requiredAdmin, requiredAuthorized, requiredGuest } = to.meta;
  
  if (!requiredAdmin && !requiredAuthorized && !requiredGuest) {
    return next();
  }

  const user = await authService.getUser();

  if (requiredAdmin) {
    return user?.role === 'admin' ? next() : next('/not-access');
  }

  if (requiredAuthorized) {
    return user ? next() : next('/signin');
  }

  if (requiredGuest) {
    return user ? next('/') : next();
  }

  next();
  });

  router.afterEach((to, from) => {
    if (typeof window === 'undefined' || typeof (window as any).ym !== 'function') {
      return;
    }

    (window as any).ym(
      YANDEX_METRIKA_COUNTER_ID,
      'hit',
      window.location.href,
      {
        title: document.title,
        referer: from.fullPath
          ? `${window.location.origin}${from.fullPath}`
          : document.referrer,
      }
    );
  });

  return router
}
