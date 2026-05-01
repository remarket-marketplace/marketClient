<script setup lang="ts">
import { ArrowRight, CheckCircle2, HelpCircle, MessageCircle, PartyPopper, Send, Star } from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'

const order = {
  id: 'RM1234567',
  status: 'Ожидание',
  email: 'user@mail.ru',
  title: '50 STARS ПО USERNAME | БЫСТРО',
  deliveryType: 'ручной',
  amount: '79 ₽',
  createdAt: '30.04.26 22:40',
}

const seller = {
  username: 'Parallax',
  rating: '5.0',
  sales: 67,
  avatarUrl: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=120&q=80',
}
</script>

<template>
  <main class="order-success-page min-h-[calc(100dvh-3.5rem)] w-full bg-[rgb(var(--palette-black))] px-4 py-10 text-[var(--text-title)] sm:py-14">
    <div class="mx-auto w-full max-w-[920px]">
      <header class="mb-6 text-center sm:mb-7">
        <div class="inline-flex items-center gap-2">
          <h1 class="text-[1.7rem] font-extrabold leading-tight sm:text-[2rem]">
            Поздравляем с покупкой
          </h1>
          <PartyPopper class="h-7 w-7 text-[rgb(var(--palette-blue-400))]" />
        </div>
        <p class="mt-1 text-sm font-medium text-[var(--text-meta)]">
          Отправили данные о заказе на <span class="underline decoration-[rgb(var(--palette-white)/0.24)] underline-offset-2">{{ order.email }}</span>
        </p>
      </header>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section class="order-panel min-w-0 p-5 sm:p-6">
          <div class="mb-6 flex flex-wrap items-center gap-x-7 gap-y-2">
            <h2 class="text-2xl font-extrabold leading-tight sm:text-[1.8rem]">
              Заказ #{{ order.id }}
            </h2>
            <span class="text-sm font-medium text-[rgb(var(--palette-amber-300))]">{{ order.status }}</span>
          </div>

          <div class="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-5">
            <div class="product-preview flex aspect-square min-h-[190px] flex-col justify-between overflow-hidden rounded-lg p-5">
              <div>
                <p class="text-center text-2xl font-extrabold tracking-tight text-[rgb(var(--palette-blue-300))]">Telegram</p>
                <p class="mt-1 text-center text-sm font-bold text-[rgb(var(--palette-white)/0.9)]">Stars по @username</p>
              </div>
              <div class="flex items-center justify-center gap-2">
                <span class="text-[3.75rem] font-extrabold leading-none text-[rgb(var(--palette-blue-400))]">50</span>
                <Star class="h-14 w-14 text-[rgb(var(--palette-blue-400))]" />
              </div>
              <div class="mx-auto h-px w-20 rotate-[-38deg] bg-[rgb(var(--palette-white)/0.4)]"></div>
            </div>

            <div class="flex min-w-0 flex-col justify-between gap-8">
              <div class="space-y-3">
                <p class="break-words text-base font-medium uppercase leading-6 text-[rgb(var(--text-title-rgb)/0.94)]">
                  {{ order.title }}
                </p>
                <p class="text-base text-[rgb(var(--text-title-rgb)/0.88)]">
                  Тип доставки: {{ order.deliveryType }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-[2rem] font-extrabold leading-none">Сумма: {{ order.amount }}</p>
                <p class="mt-3 text-sm text-[var(--text-meta)]">{{ order.createdAt }}</p>
              </div>
            </div>
          </div>
        </section>

        <aside class="space-y-4">
          <section class="order-panel p-5">
            <h2 class="mb-3 text-[1.35rem] font-extrabold">Продавец</h2>
            <button
              type="button"
              class="group flex w-full items-center gap-3 rounded-lg text-left transition hover:text-[var(--text-accent-strong)]"
            >
              <div class="relative">
                <UserAvatar
                  :avatar-url="seller.avatarUrl"
                  :alt="seller.username"
                  class="h-12 w-12 rounded-full object-cover"
                />
                <span class="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[rgb(var(--palette-dark-900))] bg-[rgb(var(--palette-green-500))]"></span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex min-w-0 items-center gap-1.5">
                  <span class="truncate text-sm font-bold">{{ seller.username }}</span>
                  <Star class="h-3.5 w-3.5 fill-current text-[var(--text-title)]" />
                  <span class="text-sm font-semibold">{{ seller.rating }}</span>
                </div>
                <p class="text-xs text-[var(--text-meta)]">{{ seller.sales }} продаж</p>
              </div>
              <ArrowRight class="h-5 w-5 shrink-0 transition group-hover:translate-x-0.5" />
            </button>

            <p class="mt-5 text-base leading-6 text-[rgb(var(--text-title-rgb)/0.9)]">
              Если у вас есть вопросы, напишите продавцу
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]">
              <MessageCircle class="mr-2 h-4 w-4" />
              Перейти в чат
            </button>
          </section>

          <section class="order-panel p-5">
            <p class="text-base leading-6 text-[rgb(var(--text-title-rgb)/0.9)]">
              Заказ должен быть обработан в течение 24 часов, если этого не произошло - обратитесь в поддержку.
            </p>
            <button type="button" class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[rgb(var(--palette-blue-600))] px-4 text-sm font-bold transition hover:bg-[rgb(var(--palette-blue-500))]">
              Поддержка
              <Send class="ml-2 h-4 w-4" />
            </button>
          </section>

          <section class="order-panel min-h-[224px] p-5">
            <div class="flex items-center gap-2 text-base font-medium">
              <HelpCircle class="h-4 w-4 text-[var(--text-meta)]" />
              Частозадаваемые вопросы
            </div>
          </section>
        </aside>

        <section class="order-panel min-w-0 p-5 sm:p-6 lg:col-start-1">
          <h2 class="mb-5 text-xl font-extrabold">Ваш товар</h2>
          <div class="product-delivery-box min-h-[230px] rounded-lg p-4">
            <div class="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--palette-green-500)/0.2)] bg-[rgb(var(--palette-green-500)/0.1)] px-3 py-1 text-xs font-semibold text-[var(--text-success)]">
              <CheckCircle2 class="h-3.5 w-3.5" />
              Ожидает выдачи продавцом
            </div>
          </div>
        </section>

        <section class="order-panel min-w-0 p-5 sm:p-6 lg:col-span-2">
          <h2 class="mb-4 text-xl font-extrabold">Оставить отзыв о продавце</h2>
          <div class="review-placeholder h-16 w-full max-w-[320px] rounded-lg"></div>
        </section>
      </div>
    </div>
  </main>
</template>

<style scoped>
.order-success-page {
  --order-panel-bg: rgb(var(--palette-dark-900) / 0.86);
  --order-panel-border: rgb(var(--palette-white) / 0.035);
}

.order-panel {
  border: 1px solid var(--order-panel-border);
  border-radius: 8px;
  background: var(--order-panel-bg);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.18);
}

.product-preview {
  border: 1px solid rgb(var(--palette-blue-500) / 0.12);
  background:
    radial-gradient(circle at 72% 20%, rgb(var(--palette-blue-400) / 0.24), transparent 32%),
    linear-gradient(145deg, rgb(5 9 22) 0%, rgb(8 18 39) 54%, rgb(3 6 18) 100%);
}

.product-delivery-box,
.review-placeholder {
  background: rgb(var(--palette-dark-800) / 0.72);
}

@media (max-width: 640px) {
  .order-success-page {
    padding-top: 2rem;
  }
}
</style>
