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
  SlidersHorizontal,
  ChevronDown,
  Pencil,
} from 'lucide-vue-next';
import { useI18n } from 'vue-i18n';
import ProductStatusTag from '@/components/ProductStatusTag.vue';
import BackButton from '@/components/navigation/BackButton.vue';
import SearchField from '@/components/SearchField.vue';
import CustomSelect from '@/components/CustomSelect.vue';
import ConfirmWindow from '@/components/ConfirmWindow.vue';
import { formatCurrencyAmount } from '@/utils/currency';
import { buildSlugKey } from '@/utils/urlKeys';
import type { AuditLog } from '@/validation/audit/activityLog';

const { t } = useI18n();
const router = useRouter();
const products = ref<Product[]>([]);
const isLoading = ref(true);
const processingProductId = ref<string | null>(null);
const API_HOST = import.meta.env.VITE_API_HOST;
const searchQuery = ref('');
const sortBy = ref('created_desc');
const statusFilter = ref('all');
const isMobileFiltersOpen = ref(false);
const isFiltersHiddenOnScroll = ref(false);
const lastListScrollTop = ref(0);
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
const productUpdatesById = ref<Record<string, AuditLog>>({});
const productActivityById = ref<Record<string, number>>({});
const expandedChangesByProductId = ref<Record<string, boolean>>({});
let observer: IntersectionObserver | null = null;

type ProductChangeItem = {
  field: string;
  before: unknown;
  after: unknown;
};

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
    await loadProductChangeLogs();
  } catch (error) {
    console.error('Error loading products:', error);
  } finally {
    isLoading.value = false;
    isLoadingMore.value = false;
    nextTick(setupObserver);
  }
}

async function loadProductChangeLogs() {
  try {
    const response = await adminService.getActivityLogs(1, 200, {
      action_type: 'product_updated',
    });
    const latestByProductId: Record<string, AuditLog> = {};
    const activityByProductId: Record<string, number> = {};

    for (const log of response.logs) {
      if (!log.product_id) continue;

      const logTimestamp = Date.parse(log.created_at);
      if (Number.isFinite(logTimestamp)) {
        const currentTimestamp = activityByProductId[log.product_id] ?? 0;
        activityByProductId[log.product_id] = Math.max(currentTimestamp, logTimestamp);
      }

      if (!log.details || typeof log.details !== 'object') continue;

      const details = log.details as Record<string, unknown>;
      const hasBefore = !!details.before && typeof details.before === 'object';
      const hasAfter = !!details.after && typeof details.after === 'object';
      if (!hasBefore || !hasAfter) continue;

      if (!latestByProductId[log.product_id]) {
        latestByProductId[log.product_id] = log;
      }
    }

    productUpdatesById.value = latestByProductId;
    productActivityById.value = activityByProductId;
  } catch (error) {
    console.error('Error loading product change logs:', error);
    productUpdatesById.value = {};
    productActivityById.value = {};
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

function navigateToProduct(productId: string, productSlug?: string | null) {
  const productKey = buildSlugKey(productSlug, productId, 'product');
  if (!productKey) return;
  router.push(`/product/${productKey}`);
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
    const response = await adminService.rejectProduct(productToReject.value, reasonCode, reasonText);
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

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  return value;
}

function isValueChanged(before: unknown, after: unknown): boolean {
  return JSON.stringify(normalizeValue(before)) !== JSON.stringify(normalizeValue(after));
}

function getProductChanges(productId: string): ProductChangeItem[] {
  const log = productUpdatesById.value[productId];
  if (!log?.details || typeof log.details !== 'object') return [];

  const details = log.details as Record<string, unknown>;
  const beforeRaw = details.before;
  const afterRaw = details.after;

  if (!beforeRaw || typeof beforeRaw !== 'object' || !afterRaw || typeof afterRaw !== 'object') {
    return [];
  }

  const before = beforeRaw as Record<string, unknown>;
  const after = afterRaw as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys
    .filter((key) => key !== 'status')
    .filter((key) => isValueChanged(before[key], after[key]))
    .map((key) => ({
      field: key,
      before: before[key],
      after: after[key],
    }));
}

function hasProductChanges(productId: string): boolean {
  return getProductChanges(productId).length > 0;
}

function toggleChanges(productId: string) {
  expandedChangesByProductId.value[productId] = !expandedChangesByProductId.value[productId];
}

function isChangesExpanded(productId: string): boolean {
  return !!expandedChangesByProductId.value[productId];
}

function getChangesPanelId(productId: string): string {
  return `product-changes-${productId}`;
}

function getChangeFieldLabel(field: string): string {
  const key = `pages.admin.productsPage.changeFields.${field}`;
  const translated = t(key);
  return translated === key ? field : translated;
}

function formatChangeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return t('common.notSpecified');
  }
  if (typeof value === 'boolean') {
    return value ? t('common.yes') : t('common.no');
  }
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : t('common.notSpecified');
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return false;
    return !Number.isNaN(Number(normalized));
  }
  return false;
}

function getProductActivityTimestamp(product: Product): number {
  const createdAtTimestamp = Date.parse(product.created_at);
  const fallbackCreatedAt = Number.isFinite(createdAtTimestamp) ? createdAtTimestamp : 0;
  const updatedTimestamp = productActivityById.value[product.id] ?? 0;
  return Math.max(fallbackCreatedAt, updatedTimestamp);
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
      return data.sort(
        (a, b) => getProductActivityTimestamp(b) - getProductActivityTimestamp(a)
      );
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

const mobileFiltersCount = computed(
  () => Number(sortBy.value !== 'created_desc') + Number(statusFilter.value !== 'all')
);

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

function resetFilters() {
  sortBy.value = 'created_desc';
  statusFilter.value = 'all';
}

function handleListScroll(event: Event) {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  const nextTop = target.scrollTop;
  const delta = nextTop - lastListScrollTop.value;

  if (nextTop <= 8) {
    isFiltersHiddenOnScroll.value = false;
  } else if (delta > 8) {
    isFiltersHiddenOnScroll.value = true;
    isMobileFiltersOpen.value = false;
  } else if (delta < -8) {
    isFiltersHiddenOnScroll.value = false;
  }

  lastListScrollTop.value = nextTop;
}

const rejectReasonOptions = computed(() => [
  { value: 'invalidDescription', label: t('common.productRejectReasons.invalidDescription') },
  { value: 'prohibitedContent', label: t('common.productRejectReasons.prohibitedContent') },
  { value: 'misleadingInfo', label: t('common.productRejectReasons.misleadingInfo') },
  { value: 'termsViolation', label: t('common.productRejectReasons.termsViolation') },
  { value: 'otherReason', label: t('common.productRejectReasons.otherReason') },
]);

const rejectConfirmMessage = computed(() => t('pages.admin.productsPage.confirmRejectMessage'));

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
  isFiltersHiddenOnScroll.value = false;
  lastListScrollTop.value = 0;
  nextTick(setupObserver);
});
</script>

<template>
  <section class="h-full w-full flex flex-col gap-3 sm:gap-6 overflow-hidden pt-3 md:pt-4">
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

    <div
      class="sticky top-0 z-20 -mx-1 px-1 pb-2 admin-filters-sticky filters-shell"
      :class="{ 'filters-hidden': isFiltersHiddenOnScroll && !isMobileFiltersOpen }"
    >
      <div class="flex flex-col gap-2">
      <SearchField v-model="searchQuery" :placeholder="$t('common.search')" />
      <div class="sm:hidden">
        <button
          type="button"
          class="admin-btn admin-btn-ghost w-full justify-center"
          :class="{ 'border-blue-500/40 text-blue-300': isMobileFiltersOpen }"
          @click="isMobileFiltersOpen = !isMobileFiltersOpen"
        >
          <SlidersHorizontal class="w-4 h-4" />
          <span>
            {{
              isMobileFiltersOpen
                ? $t('pages.admin.activityLogs.hideFilters')
                : $t('common.filtersLabel')
            }}
            <template v-if="!isMobileFiltersOpen && mobileFiltersCount"> ({{ mobileFiltersCount }})</template>
          </span>
        </button>
      </div>
      <div
        class="grid grid-cols-1 sm:grid-cols-2 gap-2 mobile-filter-panel"
        :class="{ 'mobile-filter-panel-collapsed': !isMobileFiltersOpen }"
      >
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
      <div
        class="sm:hidden flex gap-2 mobile-filter-actions"
        :class="{ 'mobile-filter-actions-collapsed': !isMobileFiltersOpen }"
      >
        <button type="button" class="admin-btn admin-btn-ghost flex-1 justify-center" @click="resetFilters">
          {{ $t('common.reset') }}
        </button>
        <button type="button" class="admin-btn admin-btn-primary flex-1 justify-center" @click="isMobileFiltersOpen = false">
          {{ $t('common.apply') }}
        </button>
      </div>
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

      <div ref="listRef" v-else class="h-full overflow-y-auto space-y-2" @scroll="handleListScroll">
        <!-- Карточка товара -->
        <div
          v-for="product in sortedProducts"
          :key="product.id"
          class="admin-surface-card product-list-card rounded-[1.2rem] p-2.5 sm:p-3"
          :class="{ 'product-has-changes': product.status === 'moderation' && hasProductChanges(product.id) }"
        >
          <!-- Основной контент -->
          <div class="flex flex-col gap-2">
            <!-- Верхняя часть: изображение и заголовок -->
            <div class="flex items-start justify-between gap-2 sm:gap-3.5">
              <!-- Изображение товара -->
              <div class="flex-shrink-0">
                <div class="relative">
                  <img
                    :src="`${API_HOST}${product.images[0]?.image_url}`"
                    :alt="product.title"
                    class="w-12 h-12 sm:w-20 sm:h-20 rounded-lg object-cover border border-white/10 cursor-pointer"
                    @click="navigateToProduct(product.id, product.slug)"
                  />
                </div>
              </div>

              <!-- Информация о товаре -->
              <div class="flex-1 min-w-0">
                <div class="flex flex-col gap-1.5">
                  <!-- Заголовок и статус -->
                  <div class="flex flex-col gap-1">
                    <h3 
                      class="text-sm sm:text-[1.45rem] leading-tight font-semibold text-mainText line-clamp-2 cursor-pointer"
                      @click="navigateToProduct(product.id, product.slug)"
                    >
                      {{ product.title }}
                    </h3>
                    <div class="flex gap-1 flex-wrap">
                      <ProductStatusTag :product-status="product.status" />
                      <span
                        v-if="product.status === 'moderation' && hasProductChanges(product.id)"
                        class="inline-flex items-center gap-1 rounded-full border border-white/7 bg-transparent px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-gray-500"
                      >
                        <Pencil class="h-2.5 w-2.5 opacity-70" />
                        {{ $t('pages.admin.productsPage.changedStatus') }}
                      </span>
                    </div>
                  </div>

                  <!-- Цена и продавец -->
                  <div class="flex flex-col gap-0.5 text-xs sm:text-sm">
                    <div class="flex items-center gap-1 text-green-400 font-semibold leading-none">
                      <span>{{ formatPrice(product.price) }}</span>
                    </div>
                    
                    <div class="flex items-center gap-1 text-text-secondary leading-tight">
                      <User class="w-3 h-3 sm:w-4 sm:h-4" />
                      <span 
                        class="cursor-pointer truncate"
                        @click="navigateToProfile(product.seller.username)"
                      >
                        {{ product.seller.username }}
                      </span>
                    </div>
                  </div>

                  <p class="text-xs text-text-secondary/90 line-clamp-2 leading-[1.25]">
                    {{ product.description }}
                  </p>
                </div>
              </div>

              <div class="hidden lg:flex h-[max-content] self-start pt-0.5 flex-col items-end gap-2">
                <div class="flex flex-wrap justify-end gap-1.5 admin-actions-group">
                  <button
                    @click="navigateToProduct(product.id, product.slug)"
                    class="admin-btn admin-btn-ghost px-3.5 py-2.5 text-xs text-gray-200 border-white/12 hover:border-white/25 hover:bg-white/5 admin-action-btn"
                  >
                    <Search class="w-4 h-4" />
                    <span>{{ $t('common.view') }}</span>
                  </button>
                  <button
                    @click="openStatusConfirm(product)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-primary px-3.5 py-2.5 text-xs admin-btn-primary-soft admin-action-btn"
                  >
                    <span class="whitespace-nowrap">{{ $t('pages.admin.productsPage.changeStatusAction') }}</span>
                  </button>

                  <template v-if="product.status === 'moderation'">
                  <button
                    @click="approveProduct(product.id)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-ghost px-3.5 py-2.5 text-xs admin-btn-moderation-approve admin-action-btn"
                  >
                    <ThumbsUp class="w-4 h-4" />
                    <span>{{ $t('common.approve') }}</span>
                  </button>
                  
                  <button
                    @click="openRejectConfirm(product.id)"
                    :disabled="processingProductId === product.id"
                    class="admin-btn admin-btn-ghost px-3.5 py-2.5 text-xs admin-btn-moderation-reject admin-action-btn"
                  >
                    <ThumbsDown class="w-4 h-4" />
                    <span>{{ $t('common.reject') }}</span>
                  </button>
                  </template>
                </div>
                <div class="text-[11px] text-text-secondary/80 text-right leading-tight flex flex-col items-end gap-0.5">
                  <div>{{ $t('common.created') }}: {{ new Date(product.created_at).toLocaleDateString('ru-RU') }}</div>
                  <div class="flex items-center justify-end gap-1">
                    <Image class="w-3 h-3" />
                    <span>{{ $t('common.images') }}: {{ product.images.length }}</span>
                  </div>
                  <div class="flex items-center justify-end gap-1">
                    <Folder class="w-3 h-3" />
                    <span>{{ product.category.name }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="product.status === 'moderation' && hasProductChanges(product.id)"
              class="change-panel rounded-xl overflow-hidden"
            >
              <button
                type="button"
                class="change-panel-header flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                @click="toggleChanges(product.id)"
                :aria-expanded="isChangesExpanded(product.id)"
                :aria-controls="getChangesPanelId(product.id)"
              >
                <div class="flex min-w-0 items-center gap-2.5">
                  <div class="change-panel-dot">
                    <Pencil class="h-3 w-3 text-slate-300" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-[10px] uppercase tracking-[0.16em] text-gray-400">
                      {{ $t('pages.admin.productsPage.changedStatus') }}
                    </p>
                    <p class="truncate text-xs sm:text-sm font-medium text-mainText">
                      {{ $t('pages.admin.productsPage.showChanges') }} ({{ getProductChanges(product.id).length }})
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <span class="change-panel-count">
                    {{ getProductChanges(product.id).length }}
                  </span>
                  <ChevronDown
                    class="h-4 w-4 text-gray-300 transition-transform duration-200"
                    :class="{ 'rotate-180': isChangesExpanded(product.id) }"
                  />
                </div>
              </button>
              <div
                v-if="isChangesExpanded(product.id)"
                :id="getChangesPanelId(product.id)"
                class="border-t border-white/10 px-3 py-2"
              >
                <div class="space-y-1.5">
                  <div class="hidden sm:grid grid-cols-[170px_1fr_1fr] gap-1.5 px-2 text-[10px] uppercase tracking-[0.1em] text-gray-500">
                    <span>{{ $t('pages.admin.productsPage.changeTableField') }}</span>
                    <span>{{ $t('pages.admin.productsPage.changeTableBefore') }}</span>
                    <span>{{ $t('pages.admin.productsPage.changeTableAfter') }}</span>
                  </div>
                  <div
                    v-for="change in getProductChanges(product.id)"
                    :key="`${product.id}-${change.field}`"
                    class="change-table-row grid grid-cols-1 sm:grid-cols-[170px_1fr_1fr] gap-1.5 rounded-lg px-2.5 py-1.5"
                  >
                    <div class="change-cell change-cell-field text-[11px] sm:text-xs font-semibold text-gray-100">
                      {{ getChangeFieldLabel(change.field) }}
                    </div>
                    <div class="change-cell change-value change-value-before rounded-md px-2 py-1.5 text-text-secondary text-[11px] sm:text-xs">
                      <span class="sm:hidden text-gray-500 mr-1">{{ $t('common.before') }}:</span>
                      <span :class="{ 'change-value-number': isNumericValue(change.before) }">
                        {{ formatChangeValue(change.before) }}
                      </span>
                    </div>
                    <div class="change-cell change-value change-value-after rounded-md px-2 py-1.5 text-mainText text-[11px] sm:text-xs">
                      <span class="sm:hidden text-gray-500 mr-1">{{ $t('common.after') }}:</span>
                      <span class="hidden sm:inline text-slate-500 mr-1">→</span>
                      <span :class="{ 'change-value-number': isNumericValue(change.after) }">
                        {{ formatChangeValue(change.after) }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Действия модерации -->
            <div class="flex lg:hidden flex-col gap-1 sm:gap-2">
              <!-- Кнопка просмотра -->
              <button
                @click="navigateToProduct(product.id, product.slug)"
                class="admin-btn admin-btn-ghost admin-btn-xs justify-center flex-1 text-gray-200 border-white/12 hover:border-white/25 hover:bg-white/5"
              >
                <Search class="w-3 h-3" />
                <span>{{ $t('common.view') }}</span>
              </button>

              <button
                @click="openStatusConfirm(product)"
                :disabled="processingProductId === product.id"
                class="admin-btn admin-btn-primary admin-btn-xs justify-center flex-1 admin-btn-primary-soft"
              >
                <span class="whitespace-nowrap">{{ $t('common.status') }}</span>
              </button>

              <!-- Кнопки модерации (только для товаров на модерации) -->
              <div v-if="product.status === 'moderation'" class="flex gap-2 flex-1">
                <button
                  @click="approveProduct(product.id)"
                  :disabled="processingProductId === product.id"
                  class="admin-btn admin-btn-ghost admin-btn-xs justify-center flex-1 admin-btn-moderation-approve"
                >
                  <ThumbsUp class="w-3 h-3" />
                  <span>{{ $t('common.approve') }}</span>
                </button>
                
                <button
                  @click="openRejectConfirm(product.id)"
                  :disabled="processingProductId === product.id"
                  class="admin-btn admin-btn-ghost admin-btn-xs justify-center flex-1 admin-btn-moderation-reject"
                >
                  <ThumbsDown class="w-3 h-3" />
                  <span>{{ $t('common.reject') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Дополнительная информация -->
          <div class="mt-1.5 pt-1.5 border-t border-white/8 text-[10px] sm:text-xs text-text-secondary/90 lg:hidden">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span class="truncate">{{ $t('common.created') }}: {{ new Date(product.created_at).toLocaleDateString('ru-RU') }}</span>
              <span class="text-white/20">•</span>
              <span class="inline-flex items-center gap-1">
                <Image class="w-2 h-2 sm:w-3 sm:h-3" />
                {{ $t('common.images') }}: {{ product.images.length }}
              </span>
              <span class="text-white/20 sm:hidden">•</span>
              <span class="inline-flex items-center gap-1 sm:hidden">
                <Folder class="w-2 h-2" />
                <span class="truncate">{{ product.category.name }}</span>
              </span>
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
      :message="rejectConfirmMessage"
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
              class="admin-input-surface w-full rounded-lg text-white px-3 py-2 resize-none min-h-[110px]"
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
      :message="$t('pages.admin.productsPage.statusModalMessage')"
      :confirm-text="$t('common.save')"
      :cancel-text="$t('common.cancel')"
      :is-loading="isUpdatingStatus"
      :allow-overflow-visible="true"
      @confirm="confirmStatusUpdate"
      @cancel="cancelStatusUpdate"
    >
      <template #body>
        <div class="space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-300">
              {{ $t('common.status') }}
            </label>
            <CustomSelect
              v-model="selectedProductStatus"
              :options="productStatusOptions"
              :placeholder="$t('common.filters.status')"
            />
          </div>
          <template v-if="selectedProductStatus === 'rejected'">
            <div class="space-y-2">
              <label class="block text-sm font-medium text-gray-300">
                {{ $t('pages.admin.productsPage.rejectReasonLabel') }}
              </label>
              <CustomSelect
                v-model="selectedStatusReasonCode"
                :options="rejectReasonOptions"
                :placeholder="$t('pages.admin.productsPage.selectRejectReason')"
              />
            </div>
            <div v-if="selectedStatusReasonCode === 'otherReason'" class="space-y-2">
              <textarea
                v-model="customStatusReason"
                class="admin-input-surface w-full rounded-lg text-white px-3 py-2 resize-none min-h-[110px]"
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

.admin-btn:focus-visible,
.change-panel-header:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 1px rgba(148, 163, 184, 0.55),
    0 0 0 3px rgba(56, 189, 248, 0.22);
}

/* Убедимся что текст не выходит за пределы */
.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-filters-sticky {
  background: linear-gradient(to bottom, rgba(5, 8, 15, 0.96), rgba(5, 8, 15, 0.78) 70%, transparent);
  backdrop-filter: blur(2px);
}

.filters-shell {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1), opacity 260ms ease, max-height 260ms ease, margin 260ms ease;
}

.mobile-filter-panel {
  transition: max-height 240ms ease, opacity 220ms ease, transform 220ms ease, margin 220ms ease;
}

@media (max-width: 639px) {
  .mobile-filter-panel {
    max-height: 220px;
    opacity: 1;
    transform: translateY(0);
    overflow: hidden;
  }

  .mobile-filter-panel-collapsed {
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
    margin-top: -0.15rem;
    pointer-events: none;
  }

  .mobile-filter-actions {
    max-height: 64px;
    opacity: 1;
    transform: translateY(0);
    overflow: hidden;
    transition: max-height 240ms ease, opacity 220ms ease, transform 220ms ease, margin 220ms ease;
  }

  .mobile-filter-actions-collapsed {
    max-height: 0;
    opacity: 0;
    transform: translateY(-6px);
    margin-top: -0.15rem;
    pointer-events: none;
  }
}

.filters-hidden {
  transform: translateY(-10px);
  opacity: 0;
  max-height: 0;
  margin-bottom: -0.25rem;
  overflow: hidden;
  pointer-events: none;
}

.product-list-card {
  position: relative;
  transition: border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease;
}

.product-list-card:hover {
  border-color: rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.012);
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.3);
}

.product-has-changes::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 14px;
  bottom: 14px;
  width: 2px;
  border-radius: 9999px;
  background: rgba(99, 102, 241, 0.45);
}

.change-panel {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(1px);
  box-shadow: none;
}

.change-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: none;
}

.change-panel-header {
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  transition: background-color 180ms ease;
}

.change-panel-header:hover {
  background: rgba(255, 255, 255, 0.02);
}

.change-panel-header {
  color: rgba(241, 245, 249, 0.96);
}

.change-panel-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.6rem;
  width: 1.6rem;
  border-radius: 9999px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(148, 163, 184, 0.08);
}

.change-panel-count {
  display: inline-flex;
  min-width: 1.7rem;
  justify-content: center;
  border-radius: 9999px;
  border: none;
  background: rgba(148, 163, 184, 0.08);
  padding: 0.08rem 0.45rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #cbd5e1;
}

.change-table-row {
  border: none;
  background: rgba(255, 255, 255, 0.02);
}

.change-cell {
  min-width: 0;
}

.change-cell-field {
  align-self: center;
}

.change-value {
  border: none;
  background: rgba(255, 255, 255, 0.014);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.change-value-before {
  border-left: 2px solid rgba(148, 163, 184, 0.2);
}

.change-value-after {
  border-left: 2px solid rgba(148, 163, 184, 0.26);
  background: rgba(255, 255, 255, 0.02);
}

.change-value-number {
  font-weight: 700;
  color: rgba(241, 245, 249, 0.96);
}

.admin-actions-group .admin-btn {
  min-height: 38px;
}

.admin-action-btn {
  width: 148px;
  justify-content: center;
}

.admin-btn-primary-soft {
  border-color: rgba(59, 130, 246, 0.38);
  background: rgba(37, 99, 235, 0.18);
  color: rgb(219 234 254);
}

.admin-btn-primary-soft:hover {
  border-color: rgba(96, 165, 250, 0.5);
  background: rgba(37, 99, 235, 0.26);
}

.admin-btn-moderation-approve {
  color: rgb(219 234 254);
  border-color: rgba(59, 130, 246, 0.38);
  background: rgba(37, 99, 235, 0.18);
}

.admin-btn-moderation-approve:hover,
.admin-btn-moderation-approve:focus-visible {
  color: rgb(239 246 255);
  border-color: rgba(96, 165, 250, 0.5);
  background: rgba(37, 99, 235, 0.26);
}

.admin-btn-moderation-reject {
  color: rgb(229 231 235);
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.admin-btn-moderation-reject:hover,
.admin-btn-moderation-reject:focus-visible {
  color: rgb(255 255 255);
  border-color: rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
}
</style>
