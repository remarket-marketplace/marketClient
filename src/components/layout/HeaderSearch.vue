<script setup lang="ts">
import { categoryService } from '@/api/category/CategoryService'
import SearchField from '@/components/SearchField.vue'
import { buildCategoryKey } from '@/utils/urlKeys'
import type { Category } from '@/validation/category/category'
import { Folder } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const API_HOST = import.meta.env.VITE_API_HOST

const searchQuery = ref(getRouteSearchQuery())
const searchableCategories = ref<Category[]>([])
const hasLoadedSearchableCategories = ref(false)
const isSearchableCategoriesLoading = ref(false)
const isDropdownOpen = ref(false)
const highlightedIndex = ref(-1)
const searchRootRef = ref<HTMLElement | null>(null)
const floatingDropdownRef = ref<HTMLElement | null>(null)
const dropdownStyle = ref<Record<string, string>>({})
const brokenCategoryImages = ref<Record<string, true>>({})

let routeSearchTimeout: ReturnType<typeof setTimeout> | null = null
let onDocumentClick: ((event: MouseEvent) => void) | null = null
let onWindowChange: (() => void) | null = null

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const categorySearchResults = computed(() => {
  if (!normalizedSearchQuery.value) return []
  return searchableCategories.value
    .filter((category) => category.name.toLowerCase().includes(normalizedSearchQuery.value))
    .slice(0, 8)
})
const hasCategorySearchResults = computed(() => categorySearchResults.value.length > 0)

function normalizeQueryValue(value: unknown): string {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : ''
  return typeof value === 'string' ? value : ''
}

function getRouteSearchQuery(): string {
  return route.path === '/' ? normalizeQueryValue(route.query.search) : ''
}

function isCategoryImageAvailable(categoryId: string, imageUrl: string | null): boolean {
  return Boolean(imageUrl) && !brokenCategoryImages.value[categoryId]
}

function markCategoryImageBroken(categoryId: string): void {
  brokenCategoryImages.value = {
    ...brokenCategoryImages.value,
    [categoryId]: true,
  }
}

function resolveCategoryImageUrl(imageUrl: string | null): string {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  return `${API_HOST}${imageUrl}`
}

async function loadSearchableCategories() {
  const categories = await categoryService.getAllCategoriesFlat(100, 20)
  searchableCategories.value = categories.filter((category) => category.is_active)
  hasLoadedSearchableCategories.value = true
}

async function ensureSearchableCategoriesLoaded() {
  if (hasLoadedSearchableCategories.value || isSearchableCategoriesLoading.value) return
  isSearchableCategoriesLoading.value = true
  try {
    await loadSearchableCategories()
  } finally {
    isSearchableCategoriesLoading.value = false
  }
}

function updateDropdownPosition() {
  if (typeof window === 'undefined') return
  const anchor = searchRootRef.value
  if (!anchor) return

  const rect = anchor.getBoundingClientRect()
  const viewportPadding = 12
  const width = Math.min(Math.max(rect.width, 280), window.innerWidth - viewportPadding * 2)
  const left = Math.min(
    Math.max(rect.left, viewportPadding),
    window.innerWidth - viewportPadding - width,
  )
  const top = rect.bottom + 8
  const maxHeight = Math.max(window.innerHeight - top - viewportPadding, 160)

  dropdownStyle.value = {
    top: `${top}px`,
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
  }
}

function openDropdown() {
  void ensureSearchableCategoriesLoaded()
  if (!normalizedSearchQuery.value || !hasCategorySearchResults.value) return
  isDropdownOpen.value = true
  if (highlightedIndex.value < 0) {
    highlightedIndex.value = 0
  }
  void nextTick(() => updateDropdownPosition())
}

function closeDropdown() {
  isDropdownOpen.value = false
  highlightedIndex.value = -1
}

function moveHighlight(direction: 1 | -1) {
  const total = categorySearchResults.value.length
  if (!total) {
    highlightedIndex.value = -1
    return
  }
  if (!isDropdownOpen.value) {
    openDropdown()
    return
  }
  const current = highlightedIndex.value < 0 ? 0 : highlightedIndex.value
  highlightedIndex.value = (current + direction + total) % total
}

function goToCategory(category: Category) {
  closeDropdown()
  searchQuery.value = ''
  const categoryKey = buildCategoryKey(category)
  if (!categoryKey) return
  router.push({ path: `/category/${categoryKey}` })
}

function buildHomeSearchQuery(value: string) {
  const trimmedQuery = value.trim()
  const nextQuery = route.path === '/' ? { ...route.query } : {}
  if (trimmedQuery) {
    nextQuery.search = trimmedQuery
  } else {
    delete nextQuery.search
  }
  return nextQuery
}

function navigateToSearch(value = searchQuery.value, replace = false) {
  const nextQuery = buildHomeSearchQuery(value)
  const nextSearch = normalizeQueryValue(nextQuery.search)
  const currentSearch = route.path === '/' ? normalizeQueryValue(route.query.search) : ''
  if (route.path === '/' && nextSearch === currentSearch) return

  const location = { path: '/', query: nextQuery }
  if (replace && route.path === '/') {
    router.replace(location)
    return
  }
  router.push(location)
}

function scheduleHomeSearchRouteUpdate(value: string) {
  if (route.path !== '/') return
  if (routeSearchTimeout) clearTimeout(routeSearchTimeout)
  routeSearchTimeout = setTimeout(() => {
    navigateToSearch(value, true)
  }, 300)
}

function onSearchChange(value: string) {
  searchQuery.value = value
  void ensureSearchableCategoriesLoaded()
  scheduleHomeSearchRouteUpdate(value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeDropdown()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
    return
  }

  if (event.key !== 'Enter') return

  if (isDropdownOpen.value && highlightedIndex.value >= 0) {
    const category = categorySearchResults.value[highlightedIndex.value]
    if (category) {
      event.preventDefault()
      goToCategory(category)
      return
    }
  }

  if (searchQuery.value.trim()) {
    event.preventDefault()
    closeDropdown()
    navigateToSearch()
  }
}

watch(
  () => route.fullPath,
  () => {
    const nextQuery = getRouteSearchQuery()
    if (searchQuery.value !== nextQuery) {
      searchQuery.value = nextQuery
    }
    closeDropdown()
  },
)

watch([normalizedSearchQuery, hasCategorySearchResults], ([query, hasResults]) => {
  if (query) {
    void ensureSearchableCategoriesLoaded()
  }
  if (!query || !hasResults) {
    closeDropdown()
    return
  }
  isDropdownOpen.value = true
  if (highlightedIndex.value < 0) {
    highlightedIndex.value = 0
  }
  void nextTick(() => updateDropdownPosition())
})

watch(isDropdownOpen, (isOpen) => {
  if (!isOpen) return
  void nextTick(() => updateDropdownPosition())
})

onMounted(() => {
  onDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null
    if (!target) return
    if (searchRootRef.value?.contains(target)) return
    if (floatingDropdownRef.value?.contains(target)) return
    closeDropdown()
  }
  document.addEventListener('click', onDocumentClick)

  onWindowChange = () => {
    if (!isDropdownOpen.value) return
    updateDropdownPosition()
  }
  window.addEventListener('resize', onWindowChange)
  window.addEventListener('scroll', onWindowChange, true)
})

onBeforeUnmount(() => {
  if (routeSearchTimeout) clearTimeout(routeSearchTimeout)
  if (onDocumentClick) {
    document.removeEventListener('click', onDocumentClick)
    onDocumentClick = null
  }
  if (onWindowChange) {
    window.removeEventListener('resize', onWindowChange)
    window.removeEventListener('scroll', onWindowChange, true)
    onWindowChange = null
  }
})
</script>

<template>
  <div
    ref="searchRootRef"
    class="header-search relative min-w-0 flex-1"
    @focusin="openDropdown"
    @keydown="onKeydown"
  >
    <SearchField
      v-model="searchQuery"
      :placeholder="t('pages.index.searchPlaceholder')"
      class="header-search-field"
      @search-change="onSearchChange"
    />
  </div>

  <Teleport to="body">
    <div
      v-if="hasCategorySearchResults && isDropdownOpen"
      ref="floatingDropdownRef"
      class="header-category-search-dropdown fixed z-[180] overflow-y-auto rounded-2xl border p-2 backdrop-blur-xl"
      :style="dropdownStyle"
    >
      <p class="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted-rgb)/0.85)]">
        {{ t('pages.index.categoriesFound') }}
      </p>
      <button
        v-for="(category, index) in categorySearchResults"
        :key="`header-search-category-${category.id}`"
        type="button"
        class="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm text-[var(--text-title)] transition duration-200"
        :class="{
          'bg-[rgb(var(--palette-white)/0.07)]': highlightedIndex === index,
          'hover:bg-[rgb(var(--palette-white)/0.05)]': highlightedIndex !== index,
        }"
        @mouseenter="highlightedIndex = index"
        @click="goToCategory(category)"
      >
        <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-dark-800)/0.8)]">
          <img
            v-if="isCategoryImageAvailable(category.id, category.image_url)"
            :src="resolveCategoryImageUrl(category.image_url)"
            :alt="category.name"
            class="h-6 w-6 rounded-md object-cover"
            @error="markCategoryImageBroken(category.id)"
          />
          <Folder v-else class="h-4 w-4 text-[var(--text-muted)]" />
        </span>
        <span class="truncate text-sm leading-5">{{ category.name }}</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.header-search {
  width: 100%;
}

.header-search-field :deep(input) {
  min-height: 2.75rem;
  border-color: rgb(var(--palette-white) / 0.08);
  border-radius: 0.75rem;
  background: rgb(var(--palette-white) / 0.035);
  padding-top: 0.625rem;
  padding-bottom: 0.625rem;
  padding-left: 2.85rem;
  padding-right: 1rem;
  font-size: 0.875rem;
  color: var(--text-title);
  transition:
    border-color 180ms ease,
    background-color 180ms ease;
}

.header-search-field :deep(input:focus) {
  border-color: rgb(var(--palette-white) / 0.16);
  background: rgb(var(--palette-white) / 0.055);
}

.header-search-field :deep(svg) {
  left: 1.05rem;
  width: 1.125rem;
  height: 1.125rem;
}

.header-category-search-dropdown {
  border-color: rgb(var(--palette-white) / 0.08);
  background: rgb(var(--palette-white) / 0.045);
  box-shadow: none;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

@media (max-width: 767px) {
  .header-search {
    width: 100%;
  }

  .header-search-field :deep(input) {
    min-height: 2.375rem;
    border-radius: 0.65rem;
    padding-left: 2.45rem;
    padding-right: 0.85rem;
    font-size: 0.8125rem;
  }

  .header-search-field :deep(svg) {
    left: 0.9rem;
    width: 1rem;
    height: 1rem;
  }
}
</style>
