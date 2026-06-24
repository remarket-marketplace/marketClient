<script setup lang="ts">
import { ArrowUpRight, BadgeCheck, CalendarDays, Clock3, ShoppingBag, Star } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/validation/product/product'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'
import { formatAverageResponseTime, formatLastSeen } from '@/utils/presence'

const props = defineProps<{
  product: Product
}>()

const { locale, t } = useI18n()

const sellerProfilePath = computed(() => `/user/${props.product.seller.username}`)

const formattedRegistrationDate = computed(() => {
  const parsedDate = new Date(props.product.seller.created_at)
  if (Number.isNaN(parsedDate.getTime())) {
    return t('common.notSpecified')
  }

  return parsedDate.toLocaleDateString(locale.value, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
})

const ratingValue = computed(() => (
  props.product.seller.rating > 0
    ? props.product.seller.rating.toFixed(1)
    : '—'
))

const successfulDealsValue = computed(() => {
  const successfulDealsPercent = props.product.seller_trust?.successful_deals_percent
  return typeof successfulDealsPercent === 'number'
    ? `${successfulDealsPercent}%`
    : '—'
})

const totalDealsValue = computed(() => Intl.NumberFormat(locale.value).format(
  props.product.seller_trust?.total_deals_count ?? 0,
))

const averageResponseTimeValue = computed(() => formatAverageResponseTime(
  props.product.seller.average_first_response_time_seconds,
  locale.value,
  t('common.notSpecified'),
))

const lastSeenValue = computed(() => formatLastSeen(
  props.product.seller.last_seen_at,
  props.product.seller.is_active,
  locale.value,
  t('common.notSpecified'),
  t('common.online'),
))
</script>

<template>
  <article
    class="rounded-2xl border border-[rgb(var(--palette-dark-700))] bg-[rgb(var(--palette-dark-600)/0.25)] p-3 sm:p-3.5"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-start justify-between gap-2.5">
        <div class="min-w-0 flex items-center gap-3">
          <div class="relative h-10 w-10 shrink-0">
            <UserAvatar
              :avatar-url="product.seller.avatar_url"
              :alt="product.seller.username"
              class="h-10 w-10 rounded-full border border-[rgb(var(--palette-dark-600))] object-cover"
            />
            <div
              class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-[rgb(var(--palette-dark-800))]"
              :class="product.seller.is_active ? 'bg-[rgb(var(--palette-green-500))]' : 'bg-[rgb(var(--palette-gray-500))]'"
            >
              <div
                v-if="product.seller.is_active"
                class="h-full w-full rounded-full bg-[rgb(var(--palette-green-500))] opacity-75"
              />
            </div>
          </div>

          <div class="min-w-0">
            <p class="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--text-meta)]">
              {{ $t('pages.product.sellerTrust.eyebrow') }}
            </p>
            <div class="mt-0.5 min-w-0">
              <StyledUsername
                :username="product.seller.username"
                :style-id="product.seller.nickname_style_id"
                class="truncate text-sm font-semibold"
              />
            </div>
          </div>
        </div>

        <router-link
          :to="sellerProfilePath"
          class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-[rgb(var(--palette-dark-600))] bg-[rgb(var(--palette-dark-700)/0.5)] px-2.5 text-[10px] font-medium text-[var(--text-body)] transition-colors hover:border-[rgb(var(--palette-dark-500))] hover:text-[var(--text-title)]"
        >
          {{ $t('pages.product.sellerTrust.profileCta') }}
          <ArrowUpRight class="h-3.5 w-3.5" />
        </router-link>
      </div>

      <div class="grid grid-cols-2 gap-2 xl:grid-cols-3">
        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <Star class="metric-icon text-[rgb(var(--text-warning-strong-rgb)/0.8)]" />
            </span>
            {{ $t('pages.product.sellerTrust.ratingLabel') }}
          </div>
          <p class="metric-value text-lg font-semibold text-[var(--text-title)]">
            {{ ratingValue }}
          </p>
        </div>

        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <BadgeCheck class="metric-icon text-[rgb(var(--text-success-strong-rgb)/0.8)]" />
            </span>
            {{ $t('pages.product.sellerTrust.successRateLabel') }}
          </div>
          <p class="metric-value text-lg font-semibold text-[var(--text-title)]">
            {{ successfulDealsValue }}
          </p>
        </div>

        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <ShoppingBag class="metric-icon text-[rgb(var(--text-link-rgb)/0.8)]" />
            </span>
            {{ $t('pages.product.sellerTrust.completedDealsLabel') }}
          </div>
          <p class="metric-value text-lg font-semibold text-[var(--text-title)]">
            {{ totalDealsValue }}
          </p>
        </div>

        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <Clock3 class="metric-icon text-[rgb(var(--text-link-rgb)/0.8)]" />
            </span>
            {{ $t('common.avgResponseTime') }}
          </div>
          <p class="metric-value text-sm font-semibold text-[var(--text-title)] sm:text-base">
            {{ averageResponseTimeValue }}
          </p>
        </div>

        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <Clock3 class="metric-icon text-[rgb(var(--text-success-strong-rgb)/0.8)]" />
            </span>
            {{ $t('common.lastSeen') }}
          </div>
          <p class="metric-value text-sm font-semibold sm:text-base" :class="product.seller.is_active ? 'text-[var(--text-success)]' : 'text-[var(--text-title)]'">
            {{ lastSeenValue }}
          </p>
        </div>

        <div class="metric-card rounded-xl border border-[rgb(var(--palette-white)/0.05)] bg-[rgb(var(--palette-black)/0.1)] px-3 py-2">
          <div class="metric-head flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-[var(--text-meta)]">
            <span class="metric-icon-slot">
              <CalendarDays class="metric-icon text-[var(--text-muted)]" />
            </span>
            {{ $t('pages.product.sellerTrust.memberSinceLabel') }}
          </div>
          <p class="metric-value whitespace-nowrap text-sm font-semibold text-[var(--text-title)] sm:text-base">
            {{ formattedRegistrationDate }}
          </p>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.metric-head {
  min-height: 1rem;
}

.metric-icon-slot {
  display: inline-flex;
  height: 0.875rem;
  width: 0.875rem;
  flex: 0 0 0.875rem;
  align-items: center;
  justify-content: center;
}

.metric-icon {
  height: 0.875rem;
  width: 0.875rem;
  flex-shrink: 0;
}

.metric-card {
  min-height: 82px;
  display: flex;
  flex-direction: column;
}

.metric-value {
  margin-top: auto;
  padding-top: 0.55rem;
  line-height: 1.05;
}
</style>
