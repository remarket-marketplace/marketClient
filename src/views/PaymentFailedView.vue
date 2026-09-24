<script setup lang="ts">
import { XCircle } from 'lucide-vue-next'
</script>

<template>
    <div class="w-full min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-4">
        <div class="max-w-md w-full bg-[rgb(var(--palette-zinc-900)/0.7)] border border-[rgb(var(--palette-zinc-800))] rounded-2xl p-8 text-center shadow-xl">
            <div class="flex justify-center mb-6">
                <div class="w-16 h-16 rounded-full bg-[rgb(var(--palette-red-500)/0.1)] flex items-center justify-center">
                    <XCircle class="w-10 h-10 text-[var(--text-danger)]" />
                </div>
            </div>

            <h1 class="text-2xl font-bold text-[var(--text-title)] mb-2">
                Платёж не завершён
            </h1>

            <p class="text-[var(--text-muted)] text-sm leading-relaxed">
                Платёж был отменён или произошла ошибка.
                Средства не были зачислены на баланс.
            </p>

            <div class="mt-6 space-y-3">
                <button @click="$router.push('/wallet')"
                    class="w-full bg-[rgb(var(--palette-zinc-700))] hover:bg-[rgb(var(--palette-zinc-600))] text-[var(--text-title)] font-semibold py-3 rounded-xl transition-all duration-200">
                    Вернуться в кошелёк
                </button>
            </div>

            <p class="mt-4 text-xs text-[var(--text-meta)]">
                Если средства были списаны — они будут автоматически возвращены
            </p>
        </div>
    </div>
</template>
