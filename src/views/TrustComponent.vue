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
    month: 'short',
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

const completedDealsValue = computed(() => Intl.NumberFormat(locale.value).format(
  props.product.seller_trust?.completed_deals_count ?? 0,
))
</script>

<template>
  <article
    class="rounded-[28px] border border-blue-500/15 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(180deg,rgba(23,30,45,0.96),rgba(13,18,29,0.98))] p-4 shadow-[0_24px_60px_-40px_rgba(59,130,246,0.65)] sm:p-5 lg:p-6"
  >
    <div class="flex flex-col gap-5">
      <div class="space-y-2">
        <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200/70">
          {{ $t('pages.product.sellerTrust.eyebrow') }}
        </p>
        <div class="space-y-1">
          <h2 class="text-lg font-semibold text-white sm:text-xl">
            {{ $t('pages.product.sellerTrust.title') }}
          </h2>
          <p class="max-w-2xl text-sm leading-relaxed text-gray-400">
            {{ $t('pages.product.sellerTrust.subtitle') }}
          </p>
        </div>
      </div>

      <router-link
        :to="sellerProfilePath"
        class="group flex items-center gap-4 rounded-2xl border border-white/5 bg-black/10 p-4 transition-all duration-200 hover:border-blue-400/30 hover:bg-white/[0.03]"
      >
        <UserAvatar
          :avatar-url="product.seller.avatar_url"
          :alt="product.seller.username"
          class="h-14 w-14 rounded-2xl border border-white/10 object-cover"
        />

        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">
            {{ $t('common.seller') }}
          </p>
          <StyledUsername
            :username="product.seller.username"
            :style-id="product.seller.nickname_style_id"
            class="mt-1 block truncate text-lg font-semibold"
          />
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="product.seller.is_active ? 'bg-emerald-400' : 'bg-gray-500'"
              />
              {{ product.seller.is_active ? $t('common.online') : $t('common.offline') }}
            </span>
            <span class="inline-flex items-center gap-1 text-blue-200 transition-colors group-hover:text-blue-100">
              {{ $t('pages.product.sellerTrust.profileCta') }}
              <ArrowUpRight class="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </router-link>

      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 sm:p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
            <Star class="h-5 w-5 fill-current" />
          </div>
          <p class="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-100/70">
            {{ $t('pages.product.sellerTrust.ratingLabel') }}
          </p>
          <p class="mt-2 text-2xl font-semibold text-white">
            {{ ratingValue }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-amber-100/75">
            {{ ratingCaption }}
          </p>
        </div>

        <div class="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 sm:p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
            <BadgeCheck class="h-5 w-5" />
          </div>
          <p class="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-100/70">
            {{ $t('pages.product.sellerTrust.successRateLabel') }}
          </p>
          <p class="mt-2 text-2xl font-semibold text-white">
            {{ successfulDealsValue }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-emerald-100/75">
            {{ successfulDealsCaption }}
          </p>
        </div>

        <div class="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5 sm:p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300">
            <ShoppingBag class="h-5 w-5" />
          </div>
          <p class="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-blue-100/70">
            {{ $t('pages.product.sellerTrust.completedDealsLabel') }}
          </p>
          <p class="mt-2 text-2xl font-semibold text-white">
            {{ completedDealsValue }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-blue-100/75">
            {{ $t('pages.product.sellerTrust.completedDealsCaption') }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-400/15 bg-slate-400/10 p-3.5 sm:p-4">
          <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-400/15 text-slate-200">
            <CalendarDays class="h-5 w-5" />
          </div>
          <p class="mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-200/70">
            {{ $t('pages.product.sellerTrust.memberSinceLabel') }}
          </p>
          <p class="mt-2 text-base font-semibold text-white sm:text-lg">
            {{ formattedRegistrationDate }}
          </p>
          <p class="mt-1 text-xs leading-relaxed text-slate-200/70">
            {{ $t('pages.product.sellerTrust.memberSinceCaption') }}
          </p>
        </div>
      </div>

      <p class="text-xs leading-relaxed text-gray-500">
        {{ $t('pages.product.sellerTrust.footer') }}
      </p>
    </div>
  </article>
</template>
