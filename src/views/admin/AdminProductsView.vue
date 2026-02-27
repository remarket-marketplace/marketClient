<script setup lang="ts">
import { adminService } from '@/api/admin/AdminService';
import type { Product } from '@/validation/product/product';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { 
  User, 
  Image, 
  Folder,
  Loader2,
  Package,
  Search,
  ThumbsUp,
  ThumbsDown,
  Edit
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import ProductStatusTag from '@/components/ProductStatusTag.vue';
import BackButton from '@/components/navigation/BackButton.vue';
import SearchField from '@/components/SearchField.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import ConfirmWindow from '@/components/ConfirmWindow.vue';
import { formatCurrencyAmount } from '@/utils/currency';

const { t } = useI18n();
const router = useRouter();
const products = ref<Product[]>([]);
const isLoading = ref(true);
const processingProductId = ref<string | null>(null);
const API_HOST = import.meta.env.VITE_API_HOST;
const searchQuery = ref('');
const sortBy = ref('created_desc');
const statusFilter = ref('all');
const pageSize = 20;
const currentPage = ref(1);
const totalPages = ref(1);
const totalProducts = ref(0);
const isLoadingMore = ref(false);
const listRef = ref<HTMLElement | null>(null);
const sentinelRef = ref<HTMLElement | null>(null);
const confirmRejectWindowOpen = ref(false);
const productToReject = ref<string | null>(null);
const selectedRejectReasonCode = ref('invalidDescription');
const customRejectReason = ref('');
const rejectReasonError = ref('');
const isRejecting = ref(false);
const confirmStatusWindowOpen = ref(false);
const productToUpdateStatus = ref<Product | null>(null);
const selectedProductStatus = ref<string>('active');
const selectedStatusReasonCode = ref('invalidDescription');
const customStatusReason = ref('');
const statusUpdateError = ref('');
const isUpdatingStatus = ref(false);
let observer: IntersectionObserver | null = null;

async function loadProducts(page = 1, append = false) {
  try {
    if (!append) {
      isLoading.value = true;
    } else {
      isLoadingMore.value = true;
    }

    const data = await adminService.getAdminProductList(page, pageSize);
    if (append) {
      products.value = [...products.value, ...data.products];
    } else {
      products.value = data.products;
    }
    currentPage.value = data.currentPage;
    totalPages.value = data.totalPages;
    totalProducts.value = data.total;
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
    nextTick(setupObserver);
  }
}

onMounted(async () => {
  await loadProducts();
  nextTick(setupObserver);
});

onUnmounted(() => {
  observer?.disconnect();
});

function navigateToProfile(username: string) {
  router.push(`/user/${username}`);
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

function openRejectConfirm(productId: string) {
  productToReject.value = productId;
  selectedRejectReasonCode.value = 'invalidDescription';
  customRejectReason.value = '';
  rejectReasonError.value = '';
  confirmRejectWindowOpen.value = true;
}

async function confirmRejectProduct() {
  if (!productToReject.value) return;

  const reasonCode = selectedRejectReasonCode.value;
  if (!reasonCode) {
    rejectReasonError.value = t('pages.admin.productsPage.rejectReasonRequired');
    return;
  }

  let reasonText: string | null = null;
  if (reasonCode === 'otherReason') {
    const customReason = customRejectReason.value.trim();
    if (customReason.length < 5) {
      rejectReasonError.value = t('pages.admin.productsPage.customRejectReasonRequired');
      return;
    }
    reasonText = customReason;
  }

  rejectReasonError.value = '';
  processingProductId.value = productToReject.value;
  isRejecting.value = true;

  try {
    const response = await adminService.rejectProduct(
      productToReject.value,
      reasonCode,
      reasonText,
    );
    if (response) {
      await loadProducts();
    }
  } catch (error) {
    console.error('Error rejecting product:', error);
  } finally {
    processingProductId.value = null;
    isRejecting.value = false;
    confirmRejectWindowOpen.value = false;
    productToReject.value = null;
    customRejectReason.value = '';
    rejectReasonError.value = '';
  }
}

function cancelRejectProduct() {
  confirmRejectWindowOpen.value = false;
  productToReject.value = null;
  customRejectReason.value = '';
  rejectReasonError.value = '';
}

function formatPrice(price: number) {
  return formatCurrencyAmount(price);
}

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase());

const filteredProducts = computed(() => {
  return products.value.filter(product => {
    const matchesQuery = normalizedQuery.value
      ? [
          product.title,
          product.description,
          product.seller?.username ?? '',
          product.category?.name ?? '',
          product.id,
        ]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery.value)
      : true;

    const matchesStatus =
      statusFilter.value === 'all' ? true : product.status === statusFilter.value;

    return matchesQuery && matchesStatus;
  });
});

const sortedProducts = computed(() => {
  const data = [...filteredProducts.value];
  switch (sortBy.value) {
    case 'created_desc':
      return data;
    case 'created_asc':
      return data.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    case 'price_desc':
      return data.sort((a, b) => b.price - a.price);
    case 'price_asc':
      return data.sort((a, b) => a.price - b.price);
    case 'name_desc':
      return data.sort((a, b) => b.title.localeCompare(a.title));
    case 'name_asc':
      return data.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return data;
  }
});

const displayTotal = computed(() => {
  if (normalizedQuery.value || statusFilter.value !== 'all') {
    return filteredProducts.value.length;
  }
  return totalProducts.value;
});

const statusOptions = computed(() => {
  const uniqueStatuses = Array.from(new Set(products.value.map(product => product.status)));
  return [
    { value: 'all', label: t('common.all') },
    ...uniqueStatuses.map(status => ({
      value: status,
      label: t(`common.productStatuses.${status}`) ?? status,
    })),
  ];
});

const rejectReasonOptions = computed(() => [
  { value: 'invalidDescription', label: t('common.productRejectReasons.invalidDescription') },
  { value: 'prohibitedContent', label: t('common.productRejectReasons.prohibitedContent') },
  { value: 'misleadingInfo', label: t('common.productRejectReasons.misleadingInfo') },
  { value: 'termsViolation', label: t('common.productRejectReasons.termsViolation') },
  { value: 'otherReason', label: t('common.productRejectReasons.otherReason') },
]);

const productStatusOptions = computed(() => ([
  { value: 'active', label: t('common.productStatuses.active') },
  { value: 'moderation', label: t('common.productStatuses.moderation') },
  { value: 'rejected', label: t('common.productStatuses.rejected') },
  { value: 'purchased', label: t('common.productStatuses.purchased') },
  { value: 'completed', label: t('common.productStatuses.completed') },
  { value: 'cancelled', label: t('common.productStatuses.cancelled') },
  { value: 'disputed', label: t('common.productStatuses.disputed') },
  { value: 'deleted', label: t('common.productStatuses.deleted') },
]));

function openStatusConfirm(product: Product) {
  productToUpdateStatus.value = product;
  selectedProductStatus.value = product.status;
  selectedStatusReasonCode.value = 'invalidDescription';
  customStatusReason.value = '';
  statusUpdateError.value = '';
  confirmStatusWindowOpen.value = true;
}

function cancelStatusUpdate() {
  confirmStatusWindowOpen.value = false;
  productToUpdateStatus.value = null;
  customStatusReason.value = '';
  statusUpdateError.value = '';
}

async function confirmStatusUpdate() {
  if (!productToUpdateStatus.value) return;

  statusUpdateError.value = '';
  let reasonCode: string | null = null;
  let reasonText: string | null = null;

  if (selectedProductStatus.value === 'rejected') {
    reasonCode = selectedStatusReasonCode.value;
    if (!reasonCode) {
      statusUpdateError.value = t('pages.admin.productsPage.rejectReasonRequired');
      return;
    }

    if (reasonCode === 'otherReason') {
      const customReason = customStatusReason.value.trim();
      if (customReason.length < 5) {
        statusUpdateError.value = t('pages.admin.productsPage.customRejectReasonRequired');
        return;
      }
      reasonText = customReason;
    }
  }

  processingProductId.value = productToUpdateStatus.value.id;
  isUpdatingStatus.value = true;

  try {
    const ok = await adminService.updateProductStatus(
      productToUpdateStatus.value.id,
      selectedProductStatus.value,
      reasonCode,
      reasonText,
    );
    if (ok) {
      await loadProducts();
      confirmStatusWindowOpen.value = false;
      productToUpdateStatus.value = null;
      customStatusReason.value = '';
      statusUpdateError.value = '';
    }
  } catch (error) {
    console.error('Error updating product status:', error);
  } finally {
    processingProductId.value = null;
    isUpdatingStatus.value = false;
  }
}

async function loadMoreProducts() {
  if (isLoading.value || isLoadingMore.value) return;
  if (currentPage.value >= totalPages.value) return;
  await loadProducts(currentPage.value + 1, true);
}

function setupObserver() {
  if (!sentinelRef.value) return;
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        void loadMoreProducts();
      }
    },
    { root: listRef.value, threshold: 0.1 }
  );
  observer.observe(sentinelRef.value);
}

watch([searchQuery, sortBy, statusFilter], () => {
  if (listRef.value) listRef.value.scrollTop = 0;
  nextTick(setupObserver);
});
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden">
    <!-- Заголовок -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="flex gap-2">
          <BackButton/>
          <h1 class="text-lg sm:text-2xl font-bold text-mainText">{{ $t('pages.admin.productsPage.title') }}</h1>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs sm:text-base text-text-secondary">
        <Package class="h-4 w-4" />
        <span>{{ $t('common.total') }} {{ displayTotal }}</span>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <SearchField v-model="searchQuery" :placeholder="$t('common.search')" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <CustomSelect
          v-model="sortBy"
          :options="[
            { value: 'created_desc', label: t('common.sortOptions.newest') },
            { value: 'created_asc', label: t('common.sortOptions.oldest') },
            { value: 'price_desc', label: t('common.sortOptions.priceHigh') },
            { value: 'price_asc', label: t('common.sortOptions.priceLow') },
            { value: 'name_asc', label: t('common.sortOptions.nameAsc') },
            { value: 'name_desc', label: t('common.sortOptions.nameDesc') },
          ]"
          :placeholder="$t('common.sortBy')"
        />
        <CustomSelect
          v-model="statusFilter"
          :options="statusOptions"
          :placeholder="$t('common.filters.status')"
        />
      </div>
    </div>

    <!-- Список товаров -->
    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex items-center justify-center h-32">
        <Loader2 class="h-5 w-5 sm:h-8 sm:w-8 animate-spin text-blue-500" />
        <span class="ml-2 text-sm sm:text-lg text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="sortedProducts.length === 0" class="flex items-center justify-center h-32">
        <div class="text-center">
          <Package class="h-6 w-6 sm:h-12 sm:w-12 text-gray-500 mx-auto mb-1" />
          <p class="text-text-secondary text-xs sm:text-base">{{ $t('common.noData') }}</p>
        </div>
      </div>

      <div ref="listRef" v-else class="h-full overflow-y-auto space-y-2">
        <!-- Карточка товара -->
        <div
          v-for="product in sortedProducts"
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
                      <span>{{ formatPrice(product.price) }}</span>
                    </div>
                    
                    <div class="flex items-center gap-1 text-text-secondary">
                      <User class="w-3 h-3 sm:w-4 sm:h-4" />
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
                <div class="flex gap-2">
                  <button
                    @click="navigateToProduct(product.id)"
                    class="admin-btn admin-btn-primary px-4 py-3 text-xs"
                  >
                    <Search class="w-4 h-4" />
                    <span>{{ $t('common.view') }}</span>
                  </button>
                  <button
                    @click="openStatusConfirm(product)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-ghost px-4 py-3 text-xs"
                  >
                    <Edit class="w-4 h-4" />
                    <span>{{ $t('common.status') }}</span>
                  </button>

                  <template v-if="product.status === 'moderation'">
                  <button
                    @click="approveProduct(product.id)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-success px-4 py-3 text-xs"
                  >
                    <ThumbsUp class="w-4 h-4" />
                    <span>{{ $t('common.approve') }}</span>
                  </button>
                  
                  <button
                    @click="openRejectConfirm(product.id)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-danger px-4 py-3 text-xs"
                  >
                    <ThumbsDown class="w-4 h-4" />
                    <span>{{ $t('common.reject') }}</span>
                  </button>
                  </template>
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
                class="admin-btn admin-btn-primary admin-btn-xs justify-center flex-1"
              >
                <Search class="w-3 h-3" />
                <span>{{ $t('common.view') }}</span>
              </button>

              <button
                @click="openStatusConfirm(product)"
                :disabled="processingProductId === product.id"
                class="admin-btn admin-btn-ghost admin-btn-xs justify-center flex-1"
              >
                <Edit class="w-3 h-3" />
                <span>{{ $t('common.status') }}</span>
              </button>

              <!-- Кнопки модерации (только для товаров на модерации) -->
              <div v-if="product.status === 'moderation'" class="flex gap-2 flex-1">
                <button
                  @click="approveProduct(product.id)"
                  :disabled="processingProductId === product.id"
                  class="admin-btn admin-btn-success admin-btn-xs justify-center flex-1"
                >
                  <ThumbsUp class="w-3 h-3" />
                  <span>{{ $t('common.approve') }}</span>
                </button>
                
                <button
                  @click="openRejectConfirm(product.id)"
                  :disabled="processingProductId === product.id"
                  class="admin-btn admin-btn-danger admin-btn-xs justify-center flex-1"
                >
                  <ThumbsDown class="w-3 h-3" />
                  <span>{{ $t('common.reject') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Дополнительная информация -->
          <div class="mt-2 pt-2 border-t border-dark-700 text-[10px] sm:text-xs text-text-secondary">
            <div class="flex flex-col xs:flex-row gap-1 xs:gap-2">
              <div class="truncate">{{ $t('common.created') }}: {{ new Date(product.created_at).toLocaleDateString('ru-RU') }}</div>
              <div class="flex items-center gap-1">
                <Image class="w-2 h-2 sm:w-3 sm:h-3" />
                <span>{{ $t('common.images') }}: {{ product.images.length }}</span>
              </div>
              <div class="flex items-center gap-1 sm:hidden">
                <Folder class="w-2 h-2" />
                <span class="truncate">{{ product.category.name }}</span>
              </div>
            </div>
            
            <!-- Дополнительные данные (только на десктопе) -->
            <div v-if="product.product_data_string" class="hidden sm:block mt-1">
              {{ $t('common.additionalData') }}: {{ product.product_data_string }}
            </div>
          </div>
        </div>

        <div v-if="isLoadingMore" class="flex items-center justify-center py-4">
          <Loader2 class="h-5 w-5 animate-spin text-blue-500" />
        </div>
        <div ref="sentinelRef" class="h-4 w-full"></div>
      </div>
    </div>

    <ConfirmWindow
      :is-open="confirmRejectWindowOpen"
      :title="$t('common.reject')"
      :message="$t('pages.admin.productsPage.confirmRejectMessage')"
      :confirm-text="$t('common.reject')"
      :cancel-text="$t('common.cancel')"
      :is-loading="isRejecting"
      @confirm="confirmRejectProduct"
      @cancel="cancelRejectProduct"
    >
      <template #body>
        <div class="space-y-3">
          <label class="block text-sm text-gray-300">
            {{ $t('pages.admin.productsPage.rejectReasonLabel') }}
          </label>
          <CustomSelect
            v-model="selectedRejectReasonCode"
            :options="rejectReasonOptions"
            :placeholder="$t('pages.admin.productsPage.selectRejectReason')"
          />
          <div v-if="selectedRejectReasonCode === 'otherReason'" class="space-y-2">
            <textarea
              v-model="customRejectReason"
              class="w-full rounded-lg bg-dark-900 border border-dark-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[110px]"
              :placeholder="$t('pages.admin.productsPage.customRejectReasonPlaceholder')"
            />
          </div>
          <p v-if="rejectReasonError" class="text-red-400 text-sm">
            {{ rejectReasonError }}
          </p>
        </div>
      </template>
    </ConfirmWindow>

    <ConfirmWindow
      :is-open="confirmStatusWindowOpen"
      :title="$t('common.status')"
      :message="$t('common.edit')"
      :confirm-text="$t('common.save')"
      :cancel-text="$t('common.cancel')"
      :is-loading="isUpdatingStatus"
      @confirm="confirmStatusUpdate"
      @cancel="cancelStatusUpdate"
    >
      <template #body>
        <div class="space-y-3">
          <CustomSelect
            v-model="selectedProductStatus"
            :options="productStatusOptions"
            :placeholder="$t('common.filters.status')"
          />
          <template v-if="selectedProductStatus === 'rejected'">
            <CustomSelect
              v-model="selectedStatusReasonCode"
              :options="rejectReasonOptions"
              :placeholder="$t('pages.admin.productsPage.selectRejectReason')"
            />
            <div v-if="selectedStatusReasonCode === 'otherReason'" class="space-y-2">
              <textarea
                v-model="customStatusReason"
                class="w-full rounded-lg bg-dark-900 border border-dark-700 text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[110px]"
                :placeholder="$t('pages.admin.productsPage.customRejectReasonPlaceholder')"
              />
            </div>
          </template>
          <p v-if="statusUpdateError" class="text-red-400 text-sm">
            {{ statusUpdateError }}
          </p>
        </div>
      </template>
    </ConfirmWindow>
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
  background: var(--scrollbar-thumb);
  border-radius: 1px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--scrollbar-thumb-hover);
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
