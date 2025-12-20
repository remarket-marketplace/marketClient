<script setup lang="ts">
</script>

<template>
    <div class="w-full h-full flex flex-col space-y-4 items-center justify-center">
        <p class="text-lg lg:text-2xl font-thin">
            {{ $t("pages.notFound.pageNotFound") }}
        </p>
        <button @click="$router.back()" class="px-4 py-2 bg-blue-600 rounded-lg">
            {{ $t('pages.notFound.back') }}
        </button>
    </div>
</template>