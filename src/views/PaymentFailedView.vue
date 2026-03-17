<script setup lang="ts">
import { XCircle } from 'lucide-vue-next'
</script>

<template>
    <div class="w-full min-h-[calc(100dvh-7rem)] md:min-h-[calc(100dvh-3.5rem)] flex items-center justify-center px-4">
        <div class="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
            <div class="flex justify-center mb-6">
                <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                    <XCircle class="w-10 h-10 text-red-500" />
                </div>
            </div>

            <h1 class="text-2xl font-bold text-white mb-2">
                Платёж не завершён
            </h1>

            <p class="text-gray-400 text-sm leading-relaxed">
                Платёж был отменён или произошла ошибка.
                Средства не были зачислены на баланс.
            </p>

            <div class="mt-6 space-y-3">
                <button @click="$router.push('/wallet')"
                    class="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-xl transition-all duration-200">
                    Вернуться в кошелёк
                </button>
            </div>

            <p class="mt-4 text-xs text-gray-500">
                Если средства были списаны — они будут автоматически возвращены
            </p>
        </div>
    </div>
</template>
