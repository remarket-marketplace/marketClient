<template>
  <button @click="goBack" class="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 transition-colors">
    <ArrowLeft class="w-5 h-5 text-white" />
  </button>
</template>

<script setup lang="ts">
  import { useRouter } from 'vue-router'
  import { ArrowLeft } from 'lucide-vue-next'

  const router = useRouter()

  function goBack() {
    router.back()
  }
</script>