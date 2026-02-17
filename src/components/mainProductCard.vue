<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { AtSign, Phone, ShieldCheck } from 'lucide-vue-next'

type PlatformKey = 'telegram' | 'numbers' | 'x'

type CardSeller = {
  username: string
  is_active: boolean
}

interface MarketplaceCardItem {
  id: string
  title: string
  description?: string
  price: number
  seller: CardSeller
  category?: {
    name?: string | null
  } | null
  platform?: PlatformKey
  is_demo?: boolean
  promo_badges?: string[]
  trust_badges?: string[]
  currency_symbol?: string
}

const router = useRouter()
const numberFormatter = new Intl.NumberFormat('en-US')

const props = defineProps<{
  product: MarketplaceCardItem
}>()

const emit = defineEmits<{
  click: [item: MarketplaceCardItem]
}>()

const isDemo = computed(() => Boolean(props.product.is_demo))

const detectedPlatform = computed<PlatformKey | null>(() => {
  if (props.product.platform) return props.product.platform

  const categoryName = props.product.category?.name?.toLowerCase() ?? ''

  if (
    categoryName.includes('+888')
    || categoryName.includes('888')
    || categoryName.includes('anonymous')
    || categoryName.includes('аноним')
    || categoryName.includes('номер')
    || categoryName.includes('number')
    || categoryName.includes('phone')
  ) {
    return 'numbers'
  }

  if (
    categoryName.includes('telegram')
    || categoryName.includes('телеграм')
    || categoryName.includes('тг')
  ) {
    return 'telegram'
  }

  if (
    categoryName === 'x'
    || categoryName.includes('twitter')
    || categoryName.includes('твиттер')
    || categoryName.includes('икс')
  ) {
    return 'x'
  }

  return null
})

const isNumberAsset = computed(() => {
  return detectedPlatform.value === 'numbers' || props.product.title.trim().startsWith('+')
})

const assetName = computed(() => {
  const rawTitle = props.product.title.trim()

  if (isNumberAsset.value) {
    return rawTitle.startsWith('+') ? rawTitle : `+${rawTitle.replace(/^\+/, '')}`
  }

  if (rawTitle.startsWith('@')) {
    return rawTitle
  }

  if (isDemo.value) {
    return `@${rawTitle.replace(/^@/, '')}`
  }

  return rawTitle
})

const symbolCount = computed(() => {
  if (isNumberAsset.value) {
    const digits = assetName.value.replace(/\D/g, '')
    return digits.length || null
  }

  if (!assetName.value.startsWith('@')) return null
  return Math.max(0, assetName.value.length - 1)
})

const platformClass = computed(() => {
  if (detectedPlatform.value === 'numbers') {
    return 'border-amber-300/35 bg-amber-500/15 text-amber-100'
  }

  if (detectedPlatform.value === 'x') {
    return 'border-slate-400/30 bg-slate-500/15 text-slate-200'
  }

  return 'border-sky-300/30 bg-sky-500/15 text-sky-100'
})

const platformLabel = computed(() => {
  if (detectedPlatform.value === 'numbers') return '+888'
  if (detectedPlatform.value === 'x') return 'X'
  if (detectedPlatform.value === 'telegram') return 'Telegram'
  return null
})

const cardClass = computed(() => {
  if (detectedPlatform.value === 'numbers') {
    return 'border-amber-200/35 bg-gradient-to-br from-amber-500/12 via-dark-900 to-violet-500/14 hover:border-amber-200/55'
  }

  if (detectedPlatform.value === 'x') {
    return 'border-slate-500/40 bg-gradient-to-br from-dark-900 via-slate-950 to-slate-900 hover:border-slate-300/55'
  }

  return 'border-dark-700 bg-dark-900 hover:border-dark-500'
})

const titleBlockClass = computed(() => {
  if (detectedPlatform.value === 'numbers') {
    return 'border-amber-200/30 bg-gradient-to-br from-amber-200/12 via-amber-500/6 to-violet-500/12'
  }

  return 'border-dark-700 bg-dark-800/70'
})

const trustBadges = computed(() => {
  if (props.product.trust_badges?.length) return props.product.trust_badges

  if (detectedPlatform.value === 'x') {
    return ['Original Email Included', 'Escrow Protection 24h', 'Audit Passed']
  }

  return []
})

const promoBadges = computed(() => {
  if (props.product.promo_badges?.length) return props.product.promo_badges

  const badges: string[] = []

  if (props.product.price <= 100) badges.push('🔥 Hot Deal')
  if ((symbolCount.value ?? 99) <= 4) badges.push('💎 Rare Gem')
  if (detectedPlatform.value === 'telegram' && props.product.price <= 2000) badges.push('📉 -20% from Floor')

  return badges.slice(0, 2)
})

const formattedPrice = computed(() => {
  const currencySymbol = props.product.currency_symbol ?? (detectedPlatform.value === 'numbers' ? '$' : '₽')
  const price = numberFormatter.format(props.product.price)

  if (currencySymbol === '$') return `${currencySymbol}${price}`
  return `${price}${currencySymbol}`
})

function onClick() {
  emit('click', props.product)
}

function goToSeller() {
  if (isDemo.value) return
  router.push(`/user/${props.product.seller.username}`)
}
</script>

<template>
  <div
    class="flex h-full cursor-pointer flex-col rounded-2xl border p-3 transition duration-200 hover:shadow-xl"
    :class="cardClass"
    @click="onClick"
  >
    <div class="mb-2 flex items-center justify-between gap-2">
      <span
        v-if="platformLabel"
        class="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
        :class="platformClass"
      >
        {{ platformLabel }}
      </span>
      <span
        v-if="isDemo"
        class="rounded-full border border-amber-300/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-200"
      >
        Preview
      </span>
    </div>

    <div v-if="promoBadges.length" class="mb-2 flex flex-wrap gap-1.5">
      <span
        v-for="badge in promoBadges"
        :key="badge"
        class="rounded-full border border-rose-300/30 bg-rose-500/12 px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-rose-100"
      >
        {{ badge }}
      </span>
    </div>

    <div v-if="trustBadges.length" class="mb-2 flex flex-wrap gap-1.5">
      <span
        v-for="badge in trustBadges"
        :key="badge"
        class="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.02em] text-emerald-100"
      >
        <ShieldCheck class="h-3 w-3" />
        {{ badge }}
      </span>
    </div>

    <div class="mb-3 rounded-xl border p-3" :class="titleBlockClass">
      <div class="flex items-center gap-2">
        <Phone v-if="isNumberAsset" class="h-4 w-4 text-amber-300" />
        <AtSign v-else class="h-4 w-4 text-sky-300" />
        <h3 class="line-clamp-2 text-sm font-bold leading-tight text-mainText sm:text-base">
          {{ assetName }}
        </h3>
      </div>
      <p class="line-clamp-2 mt-2 min-h-[34px] text-xs text-gray-400 sm:text-sm">
        {{ product.description || 'Great lot for a fast launch and secure escrow settlement.' }}
      </p>
    </div>

    <div class="space-y-1.5">
      <p v-if="symbolCount !== null" class="text-[11px] uppercase tracking-[0.12em] text-slate-400">
        {{ symbolCount }} chars
      </p>
    </div>

    <hr class="my-2 border-dark-700 opacity-80">

    <div class="mt-auto flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-2">
        <p
          class="truncate text-xs text-blue-400 transition sm:text-sm"
          :class="isDemo
            ? 'cursor-default text-blue-300/70'
            : 'hover:text-blue-300 underline decoration-transparent hover:decoration-blue-300'"
          @click.stop="goToSeller"
        >
          {{ product.seller.username }}
        </p>

        <span
          v-if="product.seller.is_active"
          class="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500"
          title="Online"
        />
      </div>

      <button
        type="button"
        class="relative flex flex-1 cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-white transition sm:flex-none sm:px-3 sm:py-2 sm:text-sm"
        :class="isDemo
          ? 'bg-slate-600/80 hover:bg-slate-500'
          : 'bg-blue-600 hover:bg-blue-700'"
        @click.stop="onClick"
      >
        <span class="block">
          {{ formattedPrice }}
        </span>
      </button>
    </div>
  </div>
</template>
