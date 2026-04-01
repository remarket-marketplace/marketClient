<script setup lang="ts">
import { ArrowUpRight, BadgeCheck, CalendarDays, ShoppingBag, Star } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Product } from '@/validation/product/product'
import UserAvatar from '@/components/UserAvatar.vue'
import StyledUsername from '@/components/StyledUsername.vue'

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

const ratingCaption = computed(() => (
  props.product.seller.rating > 0
    ? t('pages.product.sellerTrust.ratingCaption')
    : t('pages.product.sellerTrust.noRating')
))

const successfulDealsValue = computed(() => {
  const successfulDealsPercent = props.product.seller_trust?.successful_deals_percent
  return typeof successfulDealsPercent === 'number'
    ? `${successfulDealsPercent}%`
    : '—'
})

const successfulDealsCaption = computed(() => (
  typeof props.product.seller_trust?.successful_deals_percent === 'number'
    ? t('pages.product.sellerTrust.successRateCaption')
    : t('pages.product.sellerTrust.noClosedDeals')
))

const totalDealsValue = computed(() => Intl.NumberFormat(locale.value).format(
  props.product.seller_trust?.total_deals_count ?? 0,
))
</script>

<template>
  <article
    class="rounded-2xl border border-dark-700 bg-dark-600/25 p-3.5 sm:p-4"
  >
    <div class="flex flex-col gap-3.5">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex items-center gap-3">
          <div class="relative h-11 w-11 shrink-0">
            <UserAvatar
              :avatar-url="product.seller.avatar_url"
              :alt="product.seller.username"
              class="h-11 w-11 rounded-full border border-dark-600 object-cover"
            />
            <div
              class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border border-dark-800"
              :class="product.seller.is_active ? 'bg-green-500' : 'bg-gray-500'"
            >
              <div
                v-if="product.seller.is_active"
                class="h-full w-full rounded-full bg-green-500 opacity-75"
              />
            </div>
          </div>

          <div class="min-w-0">
            <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
              {{ $t('pages.product.sellerTrust.eyebrow') }}
            </p>
            <div class="mt-1 min-w-0">
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
          class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-dark-600 bg-dark-700/50 px-2.5 text-[11px] font-medium text-gray-300 transition-colors hover:border-dark-500 hover:text-white"
        >
          {{ $t('pages.product.sellerTrust.profileCta') }}
          <ArrowUpRight class="h-3.5 w-3.5" />
        </router-link>
      </div>

      <div class="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <div class="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
            <Star class="h-3.5 w-3.5 text-amber-400/80" />
            {{ $t('pages.product.sellerTrust.ratingLabel') }}
          </div>
          <p class="mt-1.5 text-lg font-semibold text-white">
            {{ ratingValue }}
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            {{ ratingCaption }}
          </p>
        </div>

        <div class="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
            <BadgeCheck class="h-3.5 w-3.5 text-emerald-400/80" />
            {{ $t('pages.product.sellerTrust.successRateLabel') }}
          </div>
          <p class="mt-1.5 text-lg font-semibold text-white">
            {{ successfulDealsValue }}
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            {{ successfulDealsCaption }}
          </p>
        </div>

        <div class="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
            <ShoppingBag class="h-3.5 w-3.5 text-blue-400/80" />
            {{ $t('pages.product.sellerTrust.completedDealsLabel') }}
          </div>
          <p class="mt-1.5 text-lg font-semibold text-white">
            {{ totalDealsValue }}
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            {{ $t('pages.product.sellerTrust.completedDealsCaption') }}
          </p>
        </div>

        <div class="rounded-xl border border-white/5 bg-black/10 px-3 py-2.5">
          <div class="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gray-500">
            <CalendarDays class="h-3.5 w-3.5 text-gray-400" />
            {{ $t('pages.product.sellerTrust.memberSinceLabel') }}
          </div>
          <p class="mt-1.5 whitespace-nowrap text-sm font-semibold text-white sm:text-base">
            {{ formattedRegistrationDate }}
          </p>
          <p class="mt-0.5 text-[11px] leading-relaxed text-gray-500">
            {{ $t('pages.product.sellerTrust.memberSinceCaption') }}
          </p>
        </div>
      </div>

      <p class="text-[11px] leading-relaxed text-gray-500">
        {{ $t('pages.product.sellerTrust.footer') }}
      </p>
    </div>
  </article>
</template>
