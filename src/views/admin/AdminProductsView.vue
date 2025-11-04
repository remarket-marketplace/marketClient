<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import type { Product } from '@/validation/product/product';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useI18n } from 'vue-i18n';
import ProductStatusTag from '@/components/ProductStatusTag.vue';

const { t } = useI18n();
const router = useRouter();
const products = ref<Product[]>([]);
const isLoading = ref(true);
const processingProductId = ref<string | null>(null);
const API_HOST = import.meta.env.VITE_API_HOST;

async function loadProducts() {
  try {
    const data = await adminService.getAdminProductList();
    products.value = Array.isArray(data) ? data : [data];
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  await loadProducts();
});

function navigateToProfile(username: string) {
  router.push(`/profile/${username}`);
}

function navigateToProduct(productId: string) {
  router.push(`/product/${productId}`);
}

async function approveProduct(productId: string) {
  processingProductId.value = productId;
  try {
    const response = await adminService.approveProduct(productId);
    if (response) {
      await loadProducts();
    }
  } catch (error) {
    console.error('Error approving product:', error);
  } finally {
    processingProductId.value = null;
  }
}

async function rejectProduct(productId: string) {
  processingProductId.value = productId;
  try {
    const response = await adminService.rejectProduct(productId);
    if (response) {
      await loadProducts();
    }
  } catch (error) {
    console.error('Error rejecting product:', error);
  } finally {
    processingProductId.value = null;
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(price);
}
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden">
    <!-- Заголовок -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h1 class="text-lg sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.productsPage.title') }}</h1>
      <div class="text-xs sm:text-base text-text-secondary">
        {{ $t('common.total') }} {{ products.length }}
      </div>
    </div>

    <!-- Список товаров -->
    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Icon icon="eos-icons:loading" class="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 text-sm sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="products.length === 0" class="flex items-center justify-center h-32">
        <div class="text-center">
          <Icon icon="mdi:package-variant-closed" class="h-6 w-6 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-1" />
          <p class="text-text-secondary text-xs sm:text-base">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div v-else class="h-full overflow-y-auto no-scrollbar space-y-2">
        <!-- Карточка товара -->
        <div
          v-for="product in products"
          :key="product.id"
          class="bg-dark-600 border border-dark-700 rounded-lg p-2 sm:p-4 hover:border-dark-500 transition-all duration-200"
        >
          <!-- Основной контент -->
          <div class="flex flex-col gap-2">
            <!-- Верхняя часть: изображение и заголовок -->
            <div class="flex justify-between gap-2 sm:gap-4">
              <!-- Изображение товара -->
              <div class="flex-shrink-0">
                <div class="relative">
                  <img
                    :src="`${API_HOST}${product.images[0]?.image_url}`"
                    :alt="product.title"
                    class="w-12 h-12 sm:w-20 sm:h-20 rounded-lg object-cover border border-dark-400 cursor-pointer"
                    @click="navigateToProduct(product.id)"
                  />
                </div>
              </div>

              <!-- Информация о товаре -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-col gap-1 sm:gap-2">
                  <!-- Заголовок и статус -->
                  <div class="flex flex-col gap-1">
                    <h3 
                      class="text-sm sm:text-lg font-semibold text-mainText line-clamp-2 cursor-pointer"
                      @click="navigateToProduct(product.id)"
                    >
                      {{ product.title }}
                    </h3>
                    <div class="flex gap-1 flex-wrap">
                      <ProductStatusTag :product-status="product.status" />
                    </div>
                  </div>

                  <!-- Цена и продавец -->
                  <div class="flex flex-col gap-1 text-xs sm:text-sm">
                    <div class="flex items-center gap-1 text-green-400 font-semibold">
                      <Icon icon="mdi:currency-usd" class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>{{ formatPrice(product.price) }}</span>
                    </div>
                    
                    <div class="flex items-center gap-1 text-text-secondary">
                      <Icon icon="mdi:account-outline" class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span 
                        class="cursor-pointer truncate"
                        @click="navigateToProfile(product.seller.username)"
                      >
                        {{ product.seller.username }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="hidden lg:flex h-[max-content]">
                <!-- Кнопки модерации (только для товаров на модерации) -->
                <div v-if="product.status === 'moderation'" class="flex gap-1">
                    <button
                        @click="navigateToProduct(product.id)"
                        class="flex items-center justify-center gap-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs flex-1"
                    >
                        <span>{{ $t('common.view') }}</span>
                    </button>
                    <button
                        @click="approveProduct(product.id)"
                        :disabled="processingProductId === product.id"
                        class="flex items-center justify-center px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-xs"
                    >
                        <span>{{ $t('common.approve') }}</span>
                    </button>
                    
                    <button
                        @click="rejectProduct(product.id)"
                        :disabled="processingProductId === product.id"
                        class="flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-xs"
                    >
                        <span>{{ $t('common.reject') }}</span>
                    </button>
                </div>
              </div>
            </div>

            <!-- Описание (только на мобилках если есть место) -->
            <p class="text-xs text-text-secondary line-clamp-2 sm:hidden">
              {{ product.description }}
            </p>

            <!-- Действия модерации -->
            <div class="flex lg:hidden flex-col gap-1 sm:gap-2">
              <!-- Кнопка просмотра -->
              <button
                @click="navigateToProduct(product.id)"
                class="flex items-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs justify-center flex-1"
              >
                <Icon icon="mdi:eye-outline" class="w-3 h-3" />
                <span>{{ $t('common.view') }}</span>
              </button>

              <!-- Кнопки модерации (только для товаров на модерации) -->
              <div v-if="product.status === 'moderation'" class="flex gap-1 flex-1">
                <button
                  @click="approveProduct(product.id)"
                  :disabled="processingProductId === product.id"
                  class="flex items-center gap-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg transition-colors text-xs justify-center flex-1"
                >
                  <span>{{ $t('common.approve') }}</span>
                </button>
                
                <button
                  @click="rejectProduct(product.id)"
                  :disabled="processingProductId === product.id"
                  class="flex items-center gap-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white rounded-lg transition-colors text-xs justify-center flex-1"
                >
                  <span>{{ $t('common.reject') }}</span>
                </button>
              </div>

              <!-- Статус для уже промодерированных товаров -->
              <div v-else class="flex items-center justify-center px-2 py-1.5 rounded-lg bg-dark-700 text-text-secondary text-xs flex-1">
                <span v-if="product.status === 'approved'" class="text-green-400 text-xs">✓ {{ $t('common.approved') }}</span>
                <span v-else-if="product.status === 'rejected'" class="text-red-400 text-xs">✗ {{ $t('common.rejected') }}</span>
                <span v-else class="text-xs">{{ product.status }}</span>
              </div>
            </div>
          </div>

          <!-- Дополнительная информация -->
          <div class="mt-2 pt-2 border-t border-dark-700 text-[10px] sm:text-xs text-text-secondary">
            <div class="flex flex-col xs:flex-row gap-1 xs:gap-2">
              <div class="truncate">{{ $t('common.created') }}: {{ new Date(product.created_at).toLocaleDateString('ru-RU') }}</div>
              <div class="flex items-center gap-1">
                <Icon icon="mdi:image-multiple" class="w-2 h-2 sm:w-3 sm:h-3" />
                <span>{{ $t('common.images') }}: {{ product.images.length }}</span>
              </div>
              <div class="flex items-center gap-1 sm:hidden">
                <Icon icon="mdi:folder-outline" class="w-2 h-2" />
                <span class="truncate">{{ product.category.name }}</span>
              </div>
            </div>
            
            <!-- Дополнительные данные (только на десктопе) -->
            <div v-if="product.product_data_string" class="hidden sm:block mt-1">
              {{ $t('common.additionalData') }}: {{ product.product_data_string }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Стили для скроллбара */
::-webkit-scrollbar {
  width: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #4B5563;
  border-radius: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background: #6B7280;
}

/* Улучшенная адаптация для очень маленьких экранов */
@media (max-width: 360px) {
  .text-xs {
    font-size: 0.65rem;
  }
  
  .text-\[10px\] {
    font-size: 0.6rem;
  }
}

/* Плавные переходы для кнопок */
button {
  min-height: 32px;
}

/* Убедимся что текст не выходит за пределы */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>