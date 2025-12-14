<template>
  <vue-hcaptcha
    sitekey="f05452e0-4210-4abe-9f80-6048d81a0218"
    @verify="onVerify"
    @expired="onExpire"
  />
</template>

<script setup lang="ts">
import VueHcaptcha from '@hcaptcha/vue3-hcaptcha'

const emit = defineEmits<{
  verified: [token: string]
}>()

function onVerify(token: string) {
  emit('verified', token)
}

function onExpire() {
  emit('verified', '')
}
</script>
