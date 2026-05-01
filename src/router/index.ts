import { createRouter, createWebHistory, createMemoryHistory, type RouteRecordRaw } from "vue-router";
import { useNavigationStore } from "@/stores/navigation";
import { useUserStore } from "@/stores/user";
import { buildAuthRedirectQuery, getAuthRedirectFromRoute } from "@/utils/authRedirect";

const YANDEX_METRIKA_COUNTER_ID = 106828907;

const routes: RouteRecordRaw[] = [
    {
      path: "/",
      name: "home",
      component: () => import("../views/HomeView.vue"),
    },
    {
      path: "/signin",
      name: "signIn",
      redirect: (to) => ({
        path: "/",
        query: {
          ...to.query,
          auth: "signin",
        },
      }),
    },
    {
      path: "/signup",
      name: "signUp",
      redirect: (to) => ({
        path: "/",
        query: {
          ...to.query,
          auth: "signup",
        },
      }),
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
      meta: { requiredAuthorized: true },
    },
    {
      path: "/user/products/archive",
      name: "archived products",
      component: () => import("@/views/ArchivedProductsView.vue"),
      meta: { requiredAuthorized: true },
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
      path: "/official",
      name: "official store",
      component: () => import("@/views/OfficialStoreView.vue"),
    },
    {
      path: "/page/test",
      name: "order success test",
      component: () => import("@/views/OrderSuccessTestView.vue"),
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
      path: "/admin/withdrawals",
      name: "admin withdrawals",
      component: () => import("@/views/admin/AdminWithdrawalsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/promo-codes",
      name: "admin promo codes",
      component: () => import("@/views/admin/AdminPromoCodesView.vue"),
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
      path: "/admin/complaints",
      name: "admin complaints",
      component: () => import("@/views/admin/AdminComplaintsView.vue"),
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/complaints/:complaintId",
      name: "admin complaint",
      component: () => import("@/views/admin/AdminComplaintView.vue"),
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
      meta: { requiredAdmin: true },
    },
    {
      path: "/admin/categories/create",
      name: "create category",
      component: () => import("@/views/admin/AdminCreateCategoryView.vue"),
      meta: { requiredAdmin: true },
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
      meta: { requiredPartner: true, partnerType: 'raika' },
    },
    {
      path: "/partner/vpn-stats",
      name: "partner vpn stats",
      component: () => import("@/views/partner/PartnerScopeVpnStatsView.vue"),
      meta: { requiredPartner: true, partnerType: 'vpn' },
    },
    {
      path: "/wallet",
      name: "wallet",
      component: () => import("@/views/WalletView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/steam-topup",
      name: "steam topup",
      component: () => import("@/views/SteamTopUpView.vue"),
      meta: { requiredAuthorized: true },
    },
    {
      path: "/vpn",
      alias: "/remarket-vpn",
      name: "scope vpn",
      component: () => import("@/views/VpnServiceView.vue"),
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

const getPartnerType = (user: { partner_type?: string | null; username?: string | null } | null | undefined) => {
  if (!user) return null
  if (user.partner_type) return user.partner_type
  return user.username?.toLowerCase() === 'scopevpn' ? 'vpn' : 'raika'
}

export function createAppRouter(isSSR = false) {
  const history = isSSR ? createMemoryHistory() : createWebHistory(import.meta.env.BASE_URL)

  const isProfileTabSwitch = (to: any, from: any) => (
    to.name === 'profile'
    && from.name === 'profile'
    && to.path === from.path
    && to.query.tab !== from.query.tab
  )

  const getHashScrollContainer = (target: HTMLElement): HTMLElement | null => {
    let current = target.parentElement

    while (current && current !== document.body) {
      const styles = window.getComputedStyle(current)
      const canScrollY = ['auto', 'scroll', 'overlay'].includes(styles.overflowY)

      if (canScrollY && current.scrollHeight > current.clientHeight) {
        return current
      }

      current = current.parentElement
    }

    return null
  }

  const scrollToHashTarget = (hash: string) => {
    if (!hash) return

    const targetId = decodeURIComponent(hash.slice(1))
    const target = document.getElementById(targetId)
    if (!target) return

    const scrollContainer = getHashScrollContainer(target)
    if (scrollContainer) {
      const containerRect = scrollContainer.getBoundingClientRect()
      const targetRect = target.getBoundingClientRect()
      scrollContainer.scrollTo({
        top: scrollContainer.scrollTop + targetRect.top - containerRect.top - 16,
        left: 0,
        behavior: 'auto',
      })
      return
    }

    window.scrollTo({
      left: 0,
      top: window.scrollY + target.getBoundingClientRect().top - 96,
      behavior: 'auto',
    })
  }

  const router = createRouter({
    history,
    routes,
    scrollBehavior(to, from) {
      if (isProfileTabSwitch(to, from)) {
        return false
      }

      // Always open next page from the top.
      return { left: 0, top: 0, behavior: "auto" }
    },
  })

  router.beforeEach(async (to) => {
    const navigationStore = useNavigationStore()
    const userStore = useUserStore()
    const { requiredAdmin, requiredAuthorized, requiredGuest, requiredPartner } = to.meta
    const partnerType = to.meta.partnerType as string | undefined

    navigationStore.startRoutePending()

    if (!requiredAdmin && !requiredAuthorized && !requiredGuest && !requiredPartner) {
      return true
    }

    if (!userStore.isResolved) {
      await userStore.ensureUserLoaded()
    }

    const user = userStore.user

    if (requiredAdmin) {
      if (!user) {
        return {
          path: '/signin',
          query: buildAuthRedirectQuery(to.fullPath),
        }
      }

      return user.role === 'admin' ? true : '/not-access'
    }

    if (requiredPartner) {
      if (!user) {
        return {
          path: '/signin',
          query: buildAuthRedirectQuery(to.fullPath),
        }
      }

      // Admins always have access
      if (user.role === 'admin') {
        return true
      }
      // Check if user is partner and has correct partner type
      if (user.role === 'partner') {
        const actualPartnerType = getPartnerType(user)
        
        if (partnerType && actualPartnerType !== partnerType) {
          // Partner trying to access wrong panel
          return '/not-access'
        }
        return true
      }
      // Not a partner or admin
      return '/not-access'
    }

    if (requiredAuthorized) {
      return user
        ? true
        : {
          path: '/signin',
          query: buildAuthRedirectQuery(to.fullPath),
        }
    }

    if (requiredGuest) {
      return user ? getAuthRedirectFromRoute(to) : true
    }

    return true
  });

  router.afterEach((to, from) => {
    useNavigationStore().finishRoutePending()

    if (typeof window === 'undefined') {
      return
    }

    if (isProfileTabSwitch(to, from)) {
      return
    }

    if (to.hash) {
      const runHashScrollSequence = () => {
        scrollToHashTarget(to.hash)
        window.requestAnimationFrame(() => scrollToHashTarget(to.hash))
      }

      window.requestAnimationFrame(runHashScrollSequence)
      window.setTimeout(runHashScrollSequence, 80)
      window.setTimeout(runHashScrollSequence, 180)
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

  router.onError(() => {
    useNavigationStore().finishRoutePending()
  })

  return router
}
