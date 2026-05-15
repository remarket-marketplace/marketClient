<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronLeft, RotateCcw } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { formatChatTime } from '@/utils/chatDate'

type FaqNode = {
  id: string
  label: string
  reply: string
  children?: FaqNode[]
}

type FaqMessage = {
  id: string
  role: 'bot' | 'user'
  text: string
  created_at: string
}

const props = defineProps<{
  chatId: string | null
}>()

const { locale } = useI18n()
const localSequence = ref(0)
const navigationStack = ref<FaqNode[]>([])
const messages = ref<FaqMessage[]>([])

const RU_ROOT: FaqNode[] = [
  {
    id: 'balance',
    label: 'Balance',
    reply: 'Выберите вопрос по балансу ниже.',
    children: [
      {
        id: 'balance-topup',
        label: 'Пополнение баланса',
        reply: 'Откройте Профиль -> Баланс -> введите сумму -> выберите способ оплаты и завершите платеж.',
      },
      {
        id: 'balance-currency',
        label: 'Валюта операций',
        reply: 'Все операции на сайте проходят в RUB. Если карта в другой валюте, конвертация выполняется платежной системой.',
      },
      {
        id: 'balance-not-credited',
        label: 'Деньги не зачислились',
        reply: 'Если платеж прошел, но баланс не обновился, дождитесь до 15 минут и проверьте историю. Если не помогло, откройте спор из сделки с подтверждением оплаты.',
      },
      {
        id: 'balance-methods',
        label: 'Способы оплаты',
        reply: 'Актуальные способы оплаты показываются в момент пополнения. Список может меняться по региону и провайдеру.',
      },
    ],
  },
  {
    id: 'buyers',
    label: 'Для покупателей',
    reply: 'Выберите вопрос по покупке товара.',
    children: [
      {
        id: 'buyers-how-buy',
        label: 'Как купить товар',
        reply: 'Откройте карточку товара, нажмите Купить, оплатите заказ, затем получите выдачу в чате сделки.',
      },
      {
        id: 'buyers-no-delivery',
        label: 'Товар не выдали',
        reply: 'Если продавец не выдал товар, не подтверждайте получение и откройте спор по сделке через кнопку Пожаловаться.',
      },
      {
        id: 'buyers-refund',
        label: 'Возврат средств',
        reply: 'Возврат рассматривается по истории сделки. Для запуска проверки обратитесь в поддержку из конкретной сделки.',
      },
    ],
  },
  {
    id: 'sellers',
    label: 'Для продавцов',
    reply: 'Выберите вопрос по продажам.',
    children: [
      {
        id: 'sellers-payout',
        label: 'Когда зачисляются средства',
        reply: 'Средства зачисляются после успешного завершения сделки и подтверждения получения покупателем.',
      },
      {
        id: 'sellers-dispute',
        label: 'Спор с покупателем',
        reply: 'В споре важно сохранять общение и выдачу в рамках чата сделки. Поддержка рассматривает логи и статусные события.',
      },
      {
        id: 'sellers-listing',
        label: 'Модерация товара',
        reply: 'Проверьте, что описание, цена и условия выдачи прозрачны и соответствуют товару. Это ускоряет публикацию.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Аккаунт и безопасность',
    reply: 'Выберите вопрос по аккаунту.',
    children: [
      {
        id: 'account-reset',
        label: 'Сброс пароля',
        reply: 'Используйте восстановление пароля на странице входа. Ссылка придет на привязанную почту.',
      },
      {
        id: 'account-2fa',
        label: 'Защита аккаунта',
        reply: 'Рекомендуем включить 2FA, использовать сложный пароль и не передавать коды подтверждения третьим лицам.',
      },
      {
        id: 'account-block',
        label: 'Блокировка аккаунта',
        reply: 'Если считаете блокировку ошибочной, оставьте обращение через feedback или напишите из сделки, где возникла проблема.',
      },
    ],
  },
  {
    id: 'site',
    label: 'Сайт и функционал',
    reply: 'Выберите вопрос по работе сайта.',
    children: [
      {
        id: 'site-slow',
        label: 'Сайт работает медленно',
        reply: 'Обновите страницу, отключите VPN/прокси, попробуйте другой браузер. При массовом сбое информация обычно появляется в каналах проекта.',
      },
      {
        id: 'site-notifications',
        label: 'Не приходят уведомления',
        reply: 'Проверьте настройки уведомлений в профиле и разрешения браузера на push-уведомления.',
      },
      {
        id: 'site-images',
        label: 'Ошибка загрузки изображений',
        reply: 'Проверьте формат и размер файла, затем повторите загрузку. Для JPG/PNG обычно проблем не возникает.',
      },
    ],
  },
]

const EN_ROOT: FaqNode[] = [
  {
    id: 'balance',
    label: 'Balance',
    reply: 'Choose a balance-related question below.',
    children: [
      {
        id: 'balance-topup',
        label: 'Top up balance',
        reply: 'Open Profile -> Balance -> enter amount -> choose payment method and complete payment.',
      },
      {
        id: 'balance-currency',
        label: 'Operation currency',
        reply: 'All operations are processed in RUB. If your card uses another currency, conversion is done by the payment provider.',
      },
      {
        id: 'balance-not-credited',
        label: 'Funds not credited',
        reply: 'If payment succeeded but balance did not update, wait up to 15 minutes and check history. If still missing, open support from the related deal with payment proof.',
      },
    ],
  },
  {
    id: 'buyers',
    label: 'For buyers',
    reply: 'Choose a question about buying.',
    children: [
      {
        id: 'buyers-how-buy',
        label: 'How to buy',
        reply: 'Open product page, click Buy, complete payment, then receive delivery inside deal chat.',
      },
      {
        id: 'buyers-no-delivery',
        label: 'No delivery from seller',
        reply: 'Do not confirm receipt. Open a dispute from the deal using the Report button.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account and security',
    reply: 'Choose an account question.',
    children: [
      {
        id: 'account-reset',
        label: 'Password reset',
        reply: 'Use password recovery on sign-in page. A reset link will be sent to your email.',
      },
      {
        id: 'account-2fa',
        label: 'Account protection',
        reply: 'Enable 2FA, use a strong password, and never share verification codes.',
      },
    ],
  },
]

const isRu = computed(() => String(locale.value).toLowerCase().startsWith('ru'))
const rootNodes = computed<FaqNode[]>(() => (isRu.value ? RU_ROOT : EN_ROOT))

const rootIntro = computed(() => (
  isRu.value
    ? 'Бот поддержки поможет найти быстрый ответ.\n\nВыберите тему ниже. Если вопрос касается конкретного товара или оплаты по сделке, обращайтесь в поддержку из этой сделки.'
    : 'Support bot helps you find quick answers.\n\nChoose a topic below. If your issue is about a specific product or deal payment, contact support from that deal.'
))

const currentNode = computed<FaqNode | null>(() => navigationStack.value[navigationStack.value.length - 1] ?? null)
const currentOptions = computed<FaqNode[]>(() => currentNode.value?.children ?? rootNodes.value)
const canGoBack = computed(() => navigationStack.value.length > 0)

function nowIso(): string {
  return new Date().toISOString()
}

function nextMessageId(prefix: string): string {
  localSequence.value += 1
  return `${prefix}-${Date.now()}-${localSequence.value}`
}

function pushBotMessage(text: string) {
  messages.value.push({
    id: nextMessageId('faq-bot'),
    role: 'bot',
    text,
    created_at: nowIso(),
  })
}

function pushUserMessage(text: string) {
  messages.value.push({
    id: nextMessageId('faq-user'),
    role: 'user',
    text,
    created_at: nowIso(),
  })
}

function resetFaq() {
  navigationStack.value = []
  messages.value = []
  pushBotMessage(rootIntro.value)
}

function handleSelectNode(node: FaqNode) {
  pushUserMessage(node.label)
  pushBotMessage(node.reply)

  if (node.children && node.children.length > 0) {
    navigationStack.value = [...navigationStack.value, node]
  }
}

function goBack() {
  if (!canGoBack.value) return
  navigationStack.value = navigationStack.value.slice(0, -1)
  pushBotMessage(isRu.value ? 'Возвращаюсь на уровень выше.' : 'Going one level up.')
}

function goRoot() {
  if (!canGoBack.value) return
  navigationStack.value = []
  pushBotMessage(isRu.value ? 'Открываю главное меню FAQ.' : 'Opening the main FAQ menu.')
}

function formatFaqTime(dateInput: string): string {
  return formatChatTime(dateInput, locale.value)
}

watch(
  () => props.chatId,
  () => {
    resetFaq()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto w-full max-w-4xl rounded-2xl border border-[rgb(var(--palette-dark-700)/0.7)] bg-[rgb(var(--palette-dark-900)/0.62)] p-3 md:p-4">
    <div class="space-y-3">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex"
        :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <div v-if="message.role === 'bot'" class="w-full max-w-3xl">
          <p class="mb-1 text-xs font-medium text-[rgb(var(--text-body-rgb)/0.78)]">Bot</p>
          <div class="rounded-2xl rounded-bl-md border border-[rgb(var(--palette-dark-600)/0.8)] bg-[rgb(var(--palette-dark-800)/0.72)] px-3 py-2.5">
            <p class="whitespace-pre-wrap text-sm leading-6 text-[var(--text-body-strong)]">{{ message.text }}</p>
            <p class="mt-2 text-right text-xs text-[rgb(var(--text-body-rgb)/0.58)]">{{ formatFaqTime(message.created_at) }}</p>
          </div>
        </div>

        <div v-else class="max-w-[85%] rounded-2xl rounded-br-md border border-[rgb(var(--palette-blue-400)/0.45)] bg-[rgb(var(--palette-blue-600)/0.82)] px-3 py-2.5 text-sm text-[var(--text-title)]">
          <p class="whitespace-pre-wrap">{{ message.text }}</p>
          <p class="mt-1 text-right text-xs text-[rgb(var(--palette-white)/0.65)]">{{ formatFaqTime(message.created_at) }}</p>
        </div>
      </div>
    </div>

    <div class="mt-3 border-t border-[rgb(var(--palette-dark-700)/0.8)] pt-3">
      <div class="mb-2 flex flex-wrap items-center gap-2">
        <button
          v-if="canGoBack"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:text-[var(--text-title)]"
          @click="goBack"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          {{ isRu ? 'Назад' : 'Back' }}
        </button>
        <button
          v-if="canGoBack"
          type="button"
          class="inline-flex items-center gap-1 rounded-lg border border-[rgb(var(--palette-white)/0.12)] bg-[rgb(var(--palette-white)/0.03)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-body)] transition hover:text-[var(--text-title)]"
          @click="goRoot"
        >
          <RotateCcw class="h-3.5 w-3.5" />
          {{ isRu ? 'В начало' : 'Main menu' }}
        </button>
        <span class="ml-auto text-xs text-[rgb(var(--text-body-rgb)/0.7)]">
          {{ currentNode ? currentNode.label : (isRu ? 'Главные темы' : 'Main topics') }}
        </span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button
          v-for="node in currentOptions"
          :key="node.id"
          type="button"
          class="rounded-xl border border-[rgb(var(--palette-white)/0.1)] bg-[rgb(var(--palette-white)/0.03)] px-3 py-2 text-left text-sm font-medium text-[rgb(var(--palette-blue-300))] transition hover:border-[rgb(var(--palette-blue-500)/0.45)] hover:bg-[rgb(var(--palette-blue-600)/0.12)] hover:text-[var(--text-title)]"
          @click="handleSelectNode(node)"
        >
          {{ node.label }}
        </button>
      </div>
    </div>
  </div>
</template>
