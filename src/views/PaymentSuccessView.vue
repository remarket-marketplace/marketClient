<script setup>
import { CheckCircle } from 'lucide-vue-next'
</script>

<template>
    <div class="h-full w-full flex items-center justify-center px-4">
        <div class="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
            <div class="flex justify-center mb-6">
                <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle class="w-10 h-10 text-green-500" />
                </div>
            </div>

            <h1 class="text-2xl font-bold text-white mb-2">
                {{ $t('pages.paymentSuccess.title') }}
            </h1>

            <p class="text-gray-400 text-sm leading-relaxed">
                {{ $t('pages.paymentSuccess.description') }}
            </p>

            <button @click="$router.push('/wallet')"
                class="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-all duration-200">
                {{ $t('pages.paymentSuccess.toWallet') }}
            </button>

            <p class="mt-4 text-xs text-gray-500">
                {{ $t('pages.paymentSuccess.hint') }}
            </p>
        </div>
    </div>
</template>
