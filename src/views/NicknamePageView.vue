<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AtSign, ChevronLeft, Clock3, Phone, ShieldCheck, Star, Zap } from 'lucide-vue-next'
import { demoProductsById, type DemoProductCard } from '@/data/demoProducts'

const route = useRoute()
const router = useRouter()
const numberFormatter = new Intl.NumberFormat('en-US')

const nicknameId = computed(() => String(route.params.nicknameId ?? ''))

const lot = computed<DemoProductCard | null>(() => {
  const item = demoProductsById[nicknameId.value]
  return item ?? null
})

const isNumberAsset = computed(() => {
  if (!lot.value) return false
  return lot.value.platform === 'numbers' || lot.value.title.trim().startsWith('+')
})

const handleName = computed(() => {
  if (!lot.value) return ''

  const rawTitle = lot.value.title.trim()

  if (isNumberAsset.value) {
    return rawTitle.startsWith('+') ? rawTitle : `+${rawTitle.replace(/^\+/, '')}`
  }

  if (rawTitle.startsWith('@')) {
    return rawTitle
  }

  return `@${rawTitle.replace(/^@/, '')}`
})

const symbolCount = computed(() => {
  if (!lot.value) return null

  if (isNumberAsset.value) {
    const digits = handleName.value.replace(/\D/g, '')
    return digits.length || null
  }

  return Math.max(0, handleName.value.replace(/^@/, '').length)
})

const platformLabel = computed(() => {
  if (!lot.value) return '-'
  if (lot.value.platform === 'numbers') return '+888 Numbers'
  if (lot.value.platform === 'x') return 'X Handles'
  return 'Telegram Usernames'
})

const listingTypeLabel = computed(() => {
  if (!lot.value) return '-'
  if (lot.value.listing_type === 'crypto') return 'Crypto / NFT'
  if (lot.value.listing_type === 'personal') return 'Personal / Names'
  return 'Dictionary Word'
})

const formattedPrice = computed(() => {
  if (!lot.value) return '-'

  const symbol = lot.value.currency_symbol ?? (lot.value.platform === 'numbers' ? '$' : '₽')
  const price = numberFormatter.format(lot.value.price)

  if (symbol === '$') return `${symbol}${price}`
  return `${price}${symbol}`
})

const sellerStatus = computed(() => {
  if (!lot.value) return 'Offline'
  return lot.value.seller.is_active ? 'Online' : 'Offline'
})

const snapshotItems = computed(() => {
  if (!lot.value) return []

  return [
    { label: 'Platform', value: platformLabel.value },
    { label: 'Type', value: listingTypeLabel.value },
    { label: 'Characters', value: symbolCount.value?.toString() ?? '-' },
    { label: 'Seller Status', value: sellerStatus.value },
    { label: 'Transfer ETA', value: lot.value.details.transfer_eta },
    { label: 'Price Range', value: lot.value.details.price_reference },
  ]
})

function backToCatalog() {
  router.push({ path: '/', hash: '#catalog-start' })
}
</script>

<template>
  <section class="w-full pb-12 pt-2">
    <button
      type="button"
      class="mb-5 inline-flex items-center gap-2 rounded-lg border border-dark-600 bg-dark-900 px-3 py-2 text-sm text-slate-200 transition hover:border-dark-500 hover:text-white"
      @click="backToCatalog"
    >
      <ChevronLeft class="h-4 w-4" />
      Back to catalog
    </button>

    <div
      v-if="!lot"
      class="rounded-2xl border border-dark-700 bg-dark-800/70 p-7 text-center text-slate-300"
    >
      <p class="text-lg font-semibold text-white">Nickname lot not found</p>
      <p class="mt-2 text-sm text-slate-400">The selected lot may have been removed from preview data.</p>
      <button
        type="button"
        class="mt-4 rounded-lg bg-button-main px-4 py-2 text-sm font-semibold text-white transition hover:bg-button-main/90"
        @click="backToCatalog"
      >
        Return to catalog
      </button>
    </div>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <article
          class="rounded-2xl border border-dark-700 bg-gradient-to-br from-dark-900 via-dark-900 to-dark-800 p-5"
        >
          <div class="mb-2 flex flex-wrap gap-2">
            <span
              class="rounded-full border border-sky-300/30 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-100"
            >
              {{ platformLabel }}
            </span>
            <span
              class="rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100"
            >
              {{ listingTypeLabel }}
            </span>
          </div>

          <div class="mb-4 flex items-center gap-2 text-white">
            <Phone v-if="isNumberAsset" class="h-5 w-5 text-amber-300" />
            <AtSign v-else class="h-5 w-5 text-sky-300" />
            <h1 class="text-2xl font-bold md:text-3xl">{{ handleName }}</h1>
          </div>

          <p class="rounded-xl border border-dark-600 bg-dark-800/70 p-3 text-sm leading-relaxed text-slate-300">
            {{ lot.description }}
          </p>

          <div class="mt-4 flex flex-wrap items-center gap-3">
            <div class="rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-4 py-2">
              <div class="text-[11px] uppercase tracking-[0.12em] text-emerald-200">Current price</div>
              <div class="text-xl font-bold text-white">{{ formattedPrice }}</div>
            </div>

            <div class="rounded-xl border border-dark-600 bg-dark-800 px-4 py-2 text-sm text-slate-300">
              Seller:
              <span class="font-semibold text-white">{{ lot.seller.username }}</span>
              <span
                class="ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="lot.seller.is_active ? 'bg-emerald-500/20 text-emerald-200' : 'bg-slate-500/25 text-slate-200'"
              >
                {{ sellerStatus }}
              </span>
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-dark-700 bg-dark-800/70 p-5">
          <h2 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">Market snapshot</h2>

          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="item in snapshotItems"
              :key="item.label"
              class="rounded-xl border border-dark-600 bg-dark-900/80 p-3"
            >
              <div class="text-[11px] uppercase tracking-[0.12em] text-slate-400">{{ item.label }}</div>
              <div class="mt-1 text-sm font-semibold leading-snug text-white">{{ item.value }}</div>
            </div>
          </div>

          <div v-if="lot.promo_badges?.length" class="mt-4">
            <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Promo signals</h3>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="badge in lot.promo_badges"
                :key="badge"
                class="rounded-full border border-rose-300/30 bg-rose-500/12 px-2 py-0.5 text-xs font-semibold text-rose-100"
              >
                {{ badge }}
              </span>
            </div>
          </div>

          <div v-if="lot.trust_badges?.length" class="mt-4">
            <h3 class="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Trust checks</h3>
            <div class="mt-2 flex flex-wrap gap-2">
              <span
                v-for="badge in lot.trust_badges"
                :key="badge"
                class="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-100"
              >
                <ShieldCheck class="h-3 w-3" />
                {{ badge }}
              </span>
            </div>
          </div>
        </article>
      </div>

      <div class="mt-4 grid gap-4 lg:grid-cols-3">
        <article class="rounded-2xl border border-dark-700 bg-dark-800/70 p-4">
          <div class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Zap class="h-4 w-4 text-amber-300" />
            Why this lot
          </div>
          <p class="text-sm leading-relaxed text-slate-300">{{ lot.details.market_comment }}</p>
        </article>

        <article class="rounded-2xl border border-dark-700 bg-dark-800/70 p-4">
          <div class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Clock3 class="h-4 w-4 text-sky-300" />
            Ownership and delivery
          </div>
          <p class="text-sm leading-relaxed text-slate-300">{{ lot.details.ownership_note }}</p>
        </article>

        <article class="rounded-2xl border border-dark-700 bg-dark-800/70 p-4">
          <div class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
            <Star class="h-4 w-4 text-violet-300" />
            Best use cases
          </div>
          <ul class="space-y-1.5 text-sm text-slate-300">
            <li v-for="item in lot.details.use_cases" :key="item">• {{ item }}</li>
          </ul>
        </article>
      </div>

      <article class="mt-4 rounded-2xl border border-dark-700 bg-dark-800/70 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">Deal flow</h2>
        <ol class="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-3">
          <li
            v-for="(step, index) in lot.details.deal_flow"
            :key="step"
            class="rounded-xl border border-dark-600 bg-dark-900/70 p-3"
          >
            <span class="text-xs font-semibold uppercase tracking-[0.12em] text-sky-300">Step {{ index + 1 }}</span>
            <p class="mt-1">{{ step }}</p>
          </li>
        </ol>
      </article>
    </template>
  </section>
</template>
