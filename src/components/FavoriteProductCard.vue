<script setup lang="ts">
import { Heart } from 'lucide-vue-next'
import router from '@/router'
import type { Product } from '@/validation/product/product'
import { useI18n } from 'vue-i18n'
import ProductStatusTag from './ProductStatusTag.vue'
import { productService } from '@/api/product/ProductService'

const { t } = useI18n()

const props = defineProps<{
    product: Product
    isOwner: boolean
}>()

const emit = defineEmits<{
    removed: [id: string]
}>()

const API_HOST = import.meta.env.VITE_API_HOST

function onClick() {
    router.push(`/product/${props.product.id}`)
}

function goToSeller() {
    if (!props.isOwner) {
        router.push(`/user/${props.product.seller.username}`)
    }
}

async function removeProductLike(productId: string) {
    try {
        const result = await productService.removeProductLike(productId)
        if (result) {
            emit('removed', productId)
        }
    } catch (e) {
        console.error('Failed to remove product like', e)
    }
}
</script>

<template>
    <div class="flex space-x-4 p-4 cursor-pointer" @click="onClick">
        <div class="flex-shrink-0">
            <img v-if="product.images.length" :src="`${API_HOST}${product.images[0]?.image_url}`"
                class="h-24 w-24 sm:h-32 sm:w-32 object-cover rounded-lg border border-dark-600" alt="product image" />
            <div v-else
                class="h-24 w-24 sm:h-32 sm:w-32 flex items-center justify-center rounded-lg bg-dark-800 border border-dark-600 text-xs text-text-secondaryDark">
                {{ $t('common.noImage') }}
            </div>
        </div>

        <div class="flex flex-col justify-between flex-grow min-w-0">
            <div class="flex justify-between items-start">
                <h3 class="truncate text-lg text-mainText font-bold">
                    {{ product.title }}
                </h3>

                <div class="flex space-x-3">
                    <ProductStatusTag :product-status="product.status" />

                    <Heart class="w-6 h-6 text-red-500 cursor-pointer" :style="{ fill: 'currentColor' }"
                        @click.stop="removeProductLike(product.id)" />
                </div>
            </div>

            <p class="text-sm text-gray-400 line-clamp-2 mt-1 mb-2">
                {{ product.description }}
            </p>

            <div class="flex items-end justify-between mt-auto">
                <div v-if="!isOwner" class="text-sm">
                    <p class="text-blue-400 transition hover:text-blue-300" @click.stop="goToSeller">
                        {{ product.seller.username }}
                    </p>
                </div>

                <span class="text-xl text-mainText font-semibold">
                    {{ product.price }}₽
                </span>
            </div>
        </div>
    </div>
</template>
