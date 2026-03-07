<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminService } from '@/api/admin/AdminService'
import type { AuditLog } from '@/validation/audit/activityLog'
import BackButton from '@/components/navigation/BackButton.vue'
import SearchField from '@/components/SearchField.vue'
import CustomSelect from '@/components/CustomSelect.vue'
import { Loader2, Link2, History } from 'lucide-vue-next'

const { t } = useI18n()

const logs = ref<AuditLog[]>([])
const isLoading = ref(true)
const isLoadingMore = ref(false)
const errorMessage = ref('')

const currentPage = ref(1)
const totalPages = ref(1)
const total = ref(0)
const perPage = 30

const userIdQuery = ref('')
const usernameQuery = ref('')
const actionType = ref('all')
const ipAddress = ref('')
const countryCode = ref('')
const dateFrom = ref('')
const dateTo = ref('')

const actionTypes = ref<string[]>([])
let filterDebounce: ReturnType<typeof setTimeout> | null = null

const actionOptions = computed(() => {
  const base = [{ value: 'all', label: t('common.all') }]
  const dynamic = actionTypes.value.map((action) => ({
    value: action,
    label: getActionLabel(action),
  }))
  return [...base, ...dynamic]
})

const hasMore = computed(() => currentPage.value < totalPages.value)

function toIsoDate(value: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

function toUserIdFilter(value: string): string | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(normalized) ? normalized : undefined
}

function getActionLabel(action: string): string {
  const key = `pages.admin.activityLogs.actions.${action}`
  const translated = t(key)
  return translated === key ? action : translated
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function buildFilters() {
  return {
    user_id: toUserIdFilter(userIdQuery.value),
    username: usernameQuery.value.trim() || undefined,
    action_type: actionType.value === 'all' ? undefined : actionType.value,
    ip_address: ipAddress.value.trim() || undefined,
    country_code: countryCode.value.trim().toUpperCase() || undefined,
    date_from: toIsoDate(dateFrom.value),
    date_to: toIsoDate(dateTo.value),
  }
}

async function loadActionTypes() {
  actionTypes.value = await adminService.getActivityLogActionTypes()
}

async function loadLogs(reset = false) {
  if (reset) {
    isLoading.value = true
    currentPage.value = 1
  } else {
    isLoadingMore.value = true
  }

  errorMessage.value = ''
  const page = reset ? 1 : currentPage.value + 1

  try {
    const response = await adminService.getActivityLogs(page, perPage, buildFilters())
    if (reset) {
      logs.value = response.logs
    } else {
      logs.value.push(...response.logs)
    }
    currentPage.value = response.currentPage
    totalPages.value = response.totalPages
    total.value = response.total
  } catch {
    errorMessage.value = t('pages.admin.activityLogs.loadError')
  } finally {
    isLoading.value = false
    isLoadingMore.value = false
  }
}

function openLink(url: string | null | undefined) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function getDisplayUsername(log: AuditLog): string {
  return log.current_username || log.username || '-'
}

function getUserProfileLink(log: AuditLog): string | null {
  return log.links.user_profile || log.links.admin_user || null
}

type ContextLink = {
  key: string
  url: string
  label: string
}

function getContextLinks(log: AuditLog): ContextLink[] {
  const links: ContextLink[] = []

  if (log.links.admin_chat) {
    links.push({
      key: 'chat',
      url: log.links.admin_chat,
      label: t('pages.admin.activityLogs.openChat'),
    })
  }

  if (log.links.admin_deal) {
    links.push({
      key: 'deal',
      url: log.links.admin_deal,
      label: t('pages.admin.activityLogs.openDeal'),
    })
  }

  if (log.links.product) {
    links.push({
      key: 'product',
      url: log.links.product,
      label: t('pages.admin.activityLogs.openProduct'),
    })
  }

  return links
}

function getPrimaryContextLink(log: AuditLog): ContextLink | null {
  const links = getContextLinks(log)
  return links.length > 0 ? links[0]! : null
}

function getSecondaryContextLinks(log: AuditLog): ContextLink[] {
  return getContextLinks(log).slice(1)
}

function detailsPreview(details: Record<string, any> | null | undefined): string {
  if (!details) return ''
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return ''
  }
}

watch([userIdQuery, usernameQuery, actionType, ipAddress, countryCode, dateFrom, dateTo], () => {
  if (filterDebounce) clearTimeout(filterDebounce)
  filterDebounce = setTimeout(() => {
    loadLogs(true)
  }, 350)
})

onMounted(async () => {
  await loadActionTypes()
  await loadLogs(true)
})
</script>

<template>
  <section class="h-full w-full flex flex-col gap-4 sm:gap-6 overflow-hidden pt-3 md:pt-4">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <BackButton />
        <div>
          <h1 class="text-xl sm:text-2xl font-bold text-mainText">
            {{ $t('pages.admin.activityLogs.title') }}
          </h1>
          <p class="text-xs sm:text-sm text-gray-400">
            {{ $t('pages.admin.activityLogs.subtitle') }}
          </p>
        </div>
      </div>
      <div class="inline-flex items-center gap-2 text-xs sm:text-base text-text-secondary">
        <History class="h-4 w-4" />
        <span>{{ $t('common.total') }} {{ total }}</span>
      </div>
    </div>

    <SearchField
      v-model="usernameQuery"
      :placeholder="$t('pages.admin.activityLogs.searchByUsername')"
    />

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      <input
        v-model="userIdQuery"
        class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
        :placeholder="$t('pages.admin.activityLogs.searchByUserId')"
      />

      <CustomSelect
        v-model="actionType"
        :options="actionOptions"
        :placeholder="$t('pages.admin.activityLogs.actionType')"
      />

      <input
        v-model="ipAddress"
        class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
        :placeholder="$t('pages.admin.activityLogs.ipAddress')"
      />

      <input
        v-model="countryCode"
        maxlength="3"
        class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm uppercase text-mainText focus:border-blue-500 focus:outline-none"
        :placeholder="$t('pages.admin.activityLogs.countryCode')"
      />

      <input
        v-model="dateFrom"
        type="datetime-local"
        class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
      />

      <input
        v-model="dateTo"
        type="datetime-local"
        class="h-10 rounded-lg border border-dark-700 bg-dark-700/40 px-3 text-sm text-mainText focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div class="flex-1 overflow-hidden">
      <div v-if="isLoading" class="flex h-32 items-center justify-center">
        <Loader2 class="h-6 w-6 animate-spin text-blue-500" />
        <span class="ml-2 text-gray-400">{{ $t('common.loading') }}</span>
      </div>

      <div v-else-if="errorMessage" class="flex h-32 items-center justify-center">
        <p class="text-red-400">{{ errorMessage }}</p>
      </div>

      <div v-else-if="logs.length === 0" class="flex h-32 items-center justify-center">
        <p class="text-gray-400">{{ $t('pages.admin.activityLogs.empty') }}</p>
      </div>

      <div v-else class="h-full overflow-y-auto space-y-3 pr-1 pb-4">
        <article
          v-for="log in logs"
          :key="log.id"
          class="rounded-xl border border-dark-700 bg-dark-600 p-3 sm:p-4"
        >
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-2">
              <span class="rounded-full border border-blue-500/30 bg-blue-500/15 px-2 py-1 text-xs text-blue-200">
                {{ getActionLabel(log.action_type) }}
              </span>
              <span class="text-xs text-gray-400">{{ formatDate(log.created_at) }}</span>
            </div>
            <span class="text-[11px] text-gray-500">{{ log.http_method }} {{ log.endpoint }}</span>
          </div>

          <div class="mt-3 grid grid-cols-1 gap-2 text-sm text-gray-200 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <span class="text-gray-400">{{ $t('common.username') }}:</span>
              <button
                v-if="getUserProfileLink(log)"
                type="button"
                class="ml-1 font-medium text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
                @click="openLink(getUserProfileLink(log))"
              >
                {{ getDisplayUsername(log) }}
              </button>
              <span v-else class="ml-1 font-medium">{{ getDisplayUsername(log) }}</span>
              <div class="mt-1 text-[11px] text-gray-500">
                {{ $t('common.userId') }}: {{ log.user_id || '-' }}
              </div>
            </div>
            <div>
              <span class="text-gray-400">{{ $t('pages.admin.activityLogs.ipAddress') }}:</span>
              <span class="ml-1 font-medium">{{ log.ip_address || '-' }}</span>
            </div>
            <div>
              <span class="text-gray-400">{{ $t('pages.admin.activityLogs.country') }}:</span>
              <span class="ml-1 font-medium">{{ log.country_name || log.country_code || '-' }}</span>
            </div>
            <div>
              <span class="text-gray-400">{{ $t('pages.admin.activityLogs.device') }}:</span>
              <span class="ml-1 font-medium">{{ log.device || '-' }}</span>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-2">
            <button
              v-if="getUserProfileLink(log)"
              type="button"
              class="admin-btn admin-btn-sm text-xs"
              @click="openLink(getUserProfileLink(log))"
            >
              <Link2 class="h-3.5 w-3.5" />
              {{ $t('pages.admin.activityLogs.openProfile') }}
            </button>

            <button
              v-if="getPrimaryContextLink(log)"
              type="button"
              class="admin-btn admin-btn-sm text-xs"
              @click="openLink(getPrimaryContextLink(log)?.url)"
            >
              <Link2 class="h-3.5 w-3.5" />
              {{ getPrimaryContextLink(log)?.label }}
            </button>

            <button
              v-for="contextLink in getSecondaryContextLinks(log)"
              :key="`${log.id}-${contextLink.key}`"
              type="button"
              class="admin-btn admin-btn-sm text-xs"
              @click="openLink(contextLink.url)"
            >
              <Link2 class="h-3.5 w-3.5" />
              {{ contextLink.label }}
            </button>
          </div>

          <pre
            v-if="log.details"
            class="mt-3 max-h-52 overflow-auto rounded-lg border border-dark-700 bg-dark-800/80 p-2 text-xs text-gray-300"
          >{{ detailsPreview(log.details) }}</pre>
        </article>

        <div v-if="hasMore" class="flex justify-center pt-2">
          <button
            type="button"
            class="admin-btn admin-btn-primary"
            :disabled="isLoadingMore"
            @click="loadLogs(false)"
          >
            <Loader2 v-if="isLoadingMore" class="h-4 w-4 animate-spin" />
            <span>{{ $t('common.loadMore') }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
