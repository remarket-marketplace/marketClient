<script setup lang="ts">
    import { ShieldCheck, Headset, Users, Zap } from 'lucide-vue-next'
</script>

<template>
	<div class="mt-6 rounded-2xl border border-dark-700 bg-dark-600/40 p-4 lg:p-6">
	          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 lg:gap-4">
	            <div class="flex flex-col gap-1 p-3 sm:p-4 rounded-xl lg:bg-transparent lg:p-0">
	              <div class="flex items-center gap-3">
	                <div
	                  class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
	                  <ShieldCheck class="w-4 h-4 sm:w-5 sm:h-5" />
	                </div>
	                <p class="text-xs sm:text-xs font-semibold text-white whitespace-pre-line">
	                  {{ $t('common.trust.guaranteeTitle') }}
	                </p>
	              </div>
	              <p class="text-xs sm:text-xs text-gray-400 leading-snug whitespace-pre-line mt-1 sm:mt-0">
	                {{ $t('common.trust.guaranteeText') }}
	              </p>
	            </div>
	
	            <div class="flex flex-col gap-1 p-3 sm:p-4 rounded-xl lg:bg-transparent lg:p-0">
	              <div class="flex items-center gap-3">
	                <div
	                  class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
	                  <Headset class="w-4 h-4 sm:w-5 sm:h-5" />
	                </div>
	                <p class="text-xs sm:text-xs font-semibold text-white">
	                  {{ $t('common.trust.supportTitle') }}
	                </p>
	              </div>
	              <p class="text-xs sm:text-xs text-gray-400 leading-snug mt-1 sm:mt-0">
	                {{ $t('common.trust.supportText') }}
	              </p>
	            </div>
	
	            <div class="flex flex-col gap-1 p-3 sm:p-4 rounded-xl lg:bg-transparent lg:p-0">
	              <div class="flex items-center gap-3">
	                <div
	                  class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
	                  <Users class="w-4 h-4 sm:w-5 sm:h-5" />
	                </div>
	                <p class="text-xs sm:text-xs font-semibold text-white">
	                  {{ $t('common.trust.sellersTitle') }}
	                </p>
	              </div>
	              <p class="text-xs sm:text-xs text-gray-400 leading-snug mt-1 sm:mt-0">
	                {{ $t('common.trust.sellersText') }}
	              </p>
	            </div>
	
	            <div class="flex flex-col gap-1 p-3 sm:p-4 rounded-xl lg:bg-transparent lg:p-0">
	              <div class="flex items-center gap-3">
	                <div
	                  class="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-blue-600/20 text-blue-400">
	                  <Zap class="w-4 h-4 sm:w-5 sm:h-5" />
	                </div>
	                <p class="text-xs sm:text-xs font-semibold text-white">
	                  {{ $t('common.trust.disputesTitle') }}
	                </p>
	              </div>
	              <p class="text-xs sm:text-xs text-gray-400 leading-snug mt-1 sm:mt-0">
	                {{ $t('common.trust.disputesText') }}
	              </p>
	            </div>
	          </div>
	        </div>
</template>
