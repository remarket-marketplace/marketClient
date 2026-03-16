import { createRouter, createWebHistory, createMemoryHistory } from "vue-router";
import { authService } from "@/api/auth/AuthService";

const YANDEX_METRIKA_COUNTER_ID = 106828907;

const routes = [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/signin",
      name: "signIn",
      component: () => import("@/views/SignIn.vue"),
      meta: { requiredGuest: true },
    },
    {
      path: "/signup",
      name: "signUp",
      component: () => import("@/views/SignUp.vue"),
      meta: { requiredGuest: true },
    },
    {
      path: "/password-reset",
      alias: "/password-reset-email",
      name: "password reset email",
      component: () => import("@/views/resetPassword/EnterResetEmailView.vue"),
    },
    {
      path: "/password-reset-code",
      name: "password reset code",
      component: () => import("@/views/resetPassword/ResetPasswordView.vue"),
    },
    {
      path: "/user/:username",
      name: "profile",
      component: () => import("@/views/ProfileView.vue"),
    },
    {
      path: "/user/products/favorites",
      name: "favorites products",
      component: () => import("@/views/FavoritesProductsView.vue"),
    },
    {
      path: "/product/create",
      name: "create product",
      component: () => import("@/views/CreateProductView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/product/edit/:productId",
      name: "edit product",
      component: () => import("@/views/UpdateProductView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/product/:productId",
      name: "product page",
      component: () => import("@/views/ProductPage.vue"),
    },
    {
      path: "/category/:categoryId",
      name: "category page",
      component: () => import("@/views/CategoryView.vue"),
    },
    {
      path: "/chats/:chatId?",
      name: "chats",
      component: () => import("@/views/ChatsView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/not-access",
      name: "notAccess",
      component: () => import("@/views/NotAccess.vue"),
    },
    {
      path: "/banned",
      name: "banned",
      component: () => import("@/views/BannedView.vue"),
    },
    {
      path: "/admin",
      name: "admin",
      component: () => import("@/views/admin/AdminHomeView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/users",
      name: "admin users",
      component: () => import("@/views/admin/AdminUsersView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/users/edit/:id",
      name: "admin edit user",
      component: () => import("@/views/admin/AdminEditUserView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/products",
      name: "products",
      component: () => import("@/views/admin/AdminProductsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/deals",
      name: "deals",
      component: () => import("@/views/admin/AdminDealsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/payments",
      name: "admin payments",
      component: () => import("@/views/admin/AdminPaymentsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/deal/:id",
      name: "deal",
      component: () => import("@/views/admin/AdminDealView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/categories",
      name: "categories",
      component: () => import("@/views/admin/AdminCategoriesView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/support/chats",
      name: "support chats",
      component: () => import("@/views/admin/AdminChatsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/feedback",
      name: "admin feedbacks",
      component: () => import("@/views/admin/AdminFeedbacksView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/feedback/:feedbackId",
      name: "admin feedback",
      component: () => import("@/views/admin/AdminFeedbackView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/activity-logs",
      name: "admin activity logs",
      component: () => import("@/views/admin/AdminActivityLogsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/categories/edit/:id",
      name: "edit category",
      component: () => import("@/views/admin/AdminEditCategoryView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/admin/chats/:chatId",
      name: "adminChatView",
      component: () => import("@/views/admin/AdminChatView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/partner/fortnite-stats",
      name: "partner fortnite stats",
      component: () => import("@/views/partner/PartnerFortniteStatsView.vue"),
      meta: { requiredPartner: true },
    },
    {
      path: "/wallet",
      name: "wallet",
      component: () => import("@/views/WalletView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("@/views/SettingsView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/payment/success",
      name: "success payment",
      component: () => import("@/views/PaymentSuccessView.vue"),
    },
    {
      path: "/payment/failed",
      name: "failed payment",
      component: () => import("@/views/PaymentFailedView.vue"),
    },
    {
      path: "/feedback",
      name: "feedback",
      component: () => import("@/views/FeedbackView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/become-seller",
      name: "become seller",
      component: () => import("@/views/BecomeSellerView.vue"),
    },
    {
      path: "/about",
      name: "about",
      component: () => import("@/views/AboutView.vue"),
    },
    {
      path: "/rules",
      name: "market rules",
      component: () => import("@/views/MarketplaceRulesView.vue"),
    },
    {
      path: "/terms",
      name: "terms",
      component: () => import("@/views/TermsOfServiceView.vue"),
    },
    {
      path: "/privacy-policy",
      alias: "/privacy",
      name: "privacy policy",
      component: () => import("@/views/PrivacyPolicyView.vue"),
    },
    {
      path: "/:pathMatch(.*)*",
      name: "notFound",
      component: () => import("@/views/NotAccess.vue"),
    },
  ]

export function createAppRouter(isSSR = false) {
  const history = isSSR ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL)
  const router = createRouter({
    history,
    routes,
    scrollBehavior() {
      // Always open next page from the top.
      return { left: 0, top: 0, behavior: "auto" }
    },
  })

  router.beforeEach(async (to, from, next) => {
  const { requiredAdmin, requiredAuthorized, requiredGuest, requiredPartner } = to.meta;
  
  if (!requiredAdmin && !requiredAuthorized && !requiredGuest && !requiredPartner) {
    return next();
  }

  const user = await authService.getUser();

  if (requiredAdmin) {
    return user?.role === 'admin' ? next() : next('/not-access');
  }

  if (requiredPartner) {
    return user && (user.role === 'partner' || user.role === 'admin')
      ? next()
      : next('/not-access');
  }

  if (requiredAuthorized) {
    return user ? next() : next('/signin');
  }

  if (requiredGuest) {
    return user ? next('/') : next();
  }

  next();
  });

  router.afterEach(() => {
    if (typeof window === 'undefined') {
      return
    }

    const resetNestedScroll = () => {
      window.scrollTo({ left: 0, top: 0, behavior: "auto" })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0

      const scrollableContainers = document.querySelectorAll<HTMLElement>(
        'main.overflow-scroll, main.overflow-y-auto, main.overflow-y-scroll, main .overflow-scroll, main .overflow-y-auto, main .overflow-y-scroll'
      )

      scrollableContainers.forEach((el) => {
        el.scrollTo({ top: 0, left: 0, behavior: "auto" })
        el.scrollTop = 0
        el.scrollLeft = 0
      })
    }

    const runResetSequence = () => {
      resetNestedScroll()
      window.requestAnimationFrame(resetNestedScroll)
    }

    window.requestAnimationFrame(runResetSequence)
    window.setTimeout(runResetSequence, 80)
    window.setTimeout(runResetSequence, 180)
  })

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
