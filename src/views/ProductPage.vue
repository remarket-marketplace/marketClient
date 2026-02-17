<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { AtSign, Hash, Heart, Trash2 } from 'lucide-vue-next'

import { productService } from '@/api/product/ProductService'
import ConfirmWindow from '@/components/ConfirmWindow.vue'
import Loader from '@/components/Loader.vue'
import ProductStatusTag from '@/components/ProductStatusTag.vue'
import BackButton from '@/components/navigation/BackButton.vue'
import type { Product } from '@/validation/product/product'
import { useUserStore } from '@/stores/user'
import TrustComponent from './TrustComponent.vue'
import { getErrorMessage } from '@/utils/errorsMap'

const route = useRoute('/product/[productId]')
const router = useRouter()
const { locale, t } = useI18n()
const productId = route.params.productId as string

const store = useUserStore()
const user = await store.getUser()

const product = ref<Product | null>(null)
const showDeleteConfirm = ref(false)
const showBuyConfirm = ref(false)
const buyError = ref<string | null>(null)

const nickname = computed(() => {
  const value = product.value?.title?.trim() ?? ''
  if (!value) return ''
  return value.startsWith('@') ? value : `@${value.replace(/^@/, '')}`
})

const symbolCount = computed(() => {
  if (!nickname.value.startsWith('@')) return null
  return Math.max(0, nickname.value.length - 1)
})

const platformLabel = computed(() => {
  const categoryName = product.value?.category?.name?.toLowerCase() ?? ''

  if (
    categoryName.includes('telegram')
    || categoryName.includes('телеграм')
    || categoryName.includes('тг')
  ) {
    return 'Telegram'
  }

  if (
    categoryName === 'x'
    || categoryName.includes('twitter')
    || categoryName.includes('твиттер')
    || categoryName.includes('икс')
  ) {
    return 'X'
  }

  return null
})

const platformBadgeClass = computed(() => {
  if (platformLabel.value === 'X') {
    return 'border-slate-400/35 bg-slate-400/10 text-slate-200'
  }

  return 'border-sky-300/35 bg-sky-500/10 text-sky-100'
})

onMounted(async () => {
  try {
    product.value = await productService.getProductById(productId) ?? null
  } catch (error: any) {
    if (error?.response?.status === 404) {
      await router.replace({ name: 'notAccess' })
      return
    }

    console.error('Failed to load product:', error)
  }
})

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function editProduct() {
  router.push(`/product/edit/${product.value?.id}`)
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true
}

async function handleDeleteConfirm() {
  if (product.value) {
    const success = await productService.deleteProduct(product.value.id)
    if (success) {
      router.push('/')
    }
  }
  showDeleteConfirm.value = false
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
}

function openBuyConfirm() {
  showBuyConfirm.value = true
}

async function handleBuyConfirm() {
  if (!product.value) return

  buyError.value = null

  const result = await productService.buyProduct(product.value.id)

  if (result.success) {
    if (user?.username) {
      router.push(`/user/${user.username}`)
    } else {
      router.push('/')
    }
  } else if (result.error) {
    buyError.value = getErrorMessage(result.error, t)
  }

  showBuyConfirm.value = false
}

function closeBuyConfirm() {
  showBuyConfirm.value = false
}

async function likeProduct() {
  if (!product.value) return

  const result = await productService.addProductLike(product.value.id)
  if (result) {
    product.value.is_liked = true
  }
}

async function removeProductLike() {
  if (!product.value) return

  const result = await productService.removeProductLike(product.value.id)
  if (result) {
    product.value.is_liked = false
  }
}
</script>

<template>
  <section
    v-if="product"
    class="h-full w-full flex flex-col items-start gap-4 overflow-scroll pb-36 text-mainText lg:px-0 lg:pb-6 px-4 lg:pt-2"
  >
    <div class="pt-1">
      <BackButton />
    </div>

    <div class="w-full grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div class="space-y-4">
        <div class="rounded-2xl border border-dark-700 bg-dark-800/70 p-5 lg:p-6">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <span
              v-if="platformLabel"
              class="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
              :class="platformBadgeClass"
            >
              {{ platformLabel }}
            </span>

            <span
              v-if="symbolCount !== null"
              class="rounded-full border border-dark-600 bg-dark-700/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300"
            >
              <Hash class="inline w-3 h-3 mr-1" />
              {{ symbolCount }} symbols
            </span>

            <ProductStatusTag
              v-if="product.is_owner || user?.role === 'admin'"
              :product-status="product.status"
            />
          </div>

          <div class="flex items-start gap-3">
            <div class="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-sky-300/35 bg-sky-500/10 text-sky-200">
              <AtSign class="w-5 h-5" />
            </div>

            <div class="min-w-0">
              <h1 class="text-2xl lg:text-4xl font-bold text-white leading-tight break-all">
                {{ nickname }}
              </h1>
              <p class="mt-2 text-2xl lg:text-3xl font-bold text-green-400">
                {{ product.price }}₽
              </p>
            </div>
          </div>

          <div class="mt-5 rounded-xl border border-dark-700 bg-dark-900/60 p-4">
            <h2 class="text-sm font-semibold text-slate-200 mb-2">{{ $t('common.description') }}</h2>
            <p class="text-sm lg:text-base text-gray-300 leading-relaxed whitespace-pre-line">
              {{ product.description || $t('pages.product.descriptionMissing') }}
            </p>
          </div>
        </div>

        <div class="rounded-2xl border border-dark-700 bg-dark-800/60 p-5 space-y-3">
          <h2 class="text-sm font-semibold uppercase tracking-[0.12em] text-slate-300">{{ $t('common.information') }}</h2>

          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="text-gray-400">{{ $t('common.published') }}</span>
            <span class="text-white text-right">{{ formatFullDate(product.created_at) }}</span>
          </div>

          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="text-gray-400">{{ $t('common.category') }}</span>
            <span class="text-white text-right">{{ product.category?.name ?? $t('common.notSpecified') }}</span>
          </div>

          <div class="flex items-center justify-between gap-3 text-sm">
            <span class="text-gray-400">{{ $t('common.remaining') }}</span>
            <span class="text-white text-right">{{ product.count }}</span>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div
          class="flex items-center gap-4 p-4 rounded-xl border border-dark-700 bg-dark-800/80 cursor-pointer transition-all duration-200 hover:bg-dark-700/80 group"
          @click="router.push(`/user/${product.seller.username}`)"
        >
          <div class="w-11 h-11 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-white font-bold">
            {{ product.seller.username.charAt(0).toUpperCase() }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="truncate text-white font-semibold">
              {{ product.seller.username }}
            </p>
            <p class="text-xs text-gray-400">{{ $t('common.seller') }}</p>
          </div>

          <div class="text-gray-400 text-xl transition-transform duration-200 group-hover:translate-x-1">
            →
          </div>
        </div>

        <div class="rounded-2xl border border-dark-700 bg-dark-800/70 p-4">
          <div v-if="!product.is_sold" class="flex flex-col gap-3">
            <div v-if="product.is_owner" class="flex items-center gap-4">
              <button
                class="rounded-lg flex-1 bg-blue-600 px-4 py-3 text-sm text-white font-semibold transition hover:bg-blue-700"
                @click="editProduct"
              >
                {{ $t('common.edit') }}
              </button>
              <Trash2 @click="openDeleteConfirm" class="cursor-pointer w-6 h-6 text-red-300" />
            </div>

            <div v-else class="space-y-2">
              <span v-if="user === null" class="text-sm text-gray-400">
                {{ $t('pages.product.authRequired') }}
              </span>

              <button
                v-if="product.status === 'active'"
                :disabled="user === null"
                @click="user !== null && openBuyConfirm()"
                class="w-full rounded-lg px-4 py-3 text-sm font-semibold transition
                  bg-blue-600 text-white hover:bg-blue-700
                  disabled:bg-blue-600/40 disabled:text-white/60
                  disabled:cursor-not-allowed disabled:hover:bg-blue-600/40"
              >
                {{ $t('pages.product.buy') }}
              </button>

              <button
                v-if="product.status === 'active'"
                class="w-full rounded-lg px-4 py-2.5 text-sm font-semibold border border-dark-600 bg-dark-900/70 text-gray-200 hover:bg-dark-700 transition"
                @click="product.is_liked ? removeProductLike() : likeProduct()"
              >
                <span class="inline-flex items-center gap-2">
                  <Heart
                    class="w-4 h-4"
                    :class="product.is_liked ? 'text-red-500' : 'text-gray-400'"
                    :style="product.is_liked ? { fill: 'currentColor' } : {}"
                  />
                  {{ product.is_liked ? 'Убрать из избранного' : 'В избранное' }}
                </span>
              </button>
            </div>

            <div v-if="buyError" class="text-sm text-red-400">
              {{ buyError }}
            </div>
          </div>

          <div
            v-else
            class="w-full py-3 text-center bg-dark-900/60 border border-dark-700 text-gray-400 rounded-xl font-semibold"
          >
            {{ $t('pages.product.sold') }}
          </div>
        </div>

        <TrustComponent v-if="!product.is_owner" />

        <div v-else class="w-full flex justify-end gap-2 text-gray-400 text-sm">
          <Heart class="w-4 h-4" />
          <span>{{ product.likes }}</span>
        </div>
      </div>
    </div>

    <ConfirmWindow
      :is-open="showDeleteConfirm"
      :title="$t('pages.product.deleteConfirm.title')"
      :message="$t('pages.product.deleteConfirm.message')"
      :confirm-text="$t('pages.product.deleteConfirm.confirm')"
      :cancel-text="$t('pages.product.deleteConfirm.cancel')"
      @confirm="handleDeleteConfirm"
      @cancel="closeDeleteConfirm"
    />

    <ConfirmWindow
      :is-open="showBuyConfirm"
      :title="$t('pages.product.buyConfirm.title')"
      :message="$t('pages.product.buyConfirm.message')"
      :confirm-text="$t('pages.product.buyConfirm.confirm')"
      :cancel-text="$t('pages.product.buyConfirm.cancel')"
      @confirm="handleBuyConfirm"
      @cancel="closeBuyConfirm"
    />
  </section>

  <div v-else class="w-full h-full flex items-center justify-center">
    <Loader />
  </div>
</template>
