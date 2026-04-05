<template>
  <div class="h-full w-full overflow-y-auto px-4 pb-20 pt-4 sm:px-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <div class="flex items-center gap-3">
        <div class="h-11 w-11 animate-pulse rounded-2xl bg-dark-700/80"></div>
        <div class="h-8 w-44 max-w-[65%] animate-pulse rounded-2xl bg-dark-700/80 sm:h-10 sm:w-64"></div>
      </div>

      <div class="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div class="space-y-4">
          <div class="h-60 animate-pulse rounded-3xl bg-dark-700/70 sm:h-72"></div>
          <div class="h-28 animate-pulse rounded-3xl bg-dark-700/60"></div>
          <div class="h-28 animate-pulse rounded-3xl bg-dark-700/50"></div>
        </div>

        <div class="space-y-4">
          <div class="h-20 animate-pulse rounded-3xl bg-dark-700/60"></div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="n in 6"
              :key="n"
              class="h-56 animate-pulse rounded-3xl bg-dark-700/55"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
