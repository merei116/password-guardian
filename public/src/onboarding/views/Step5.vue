<script setup lang="ts">
import { set } from '../../shared/storage'
import { useRouter } from 'vue-router'

const router = useRouter()
function finish() {
  set({ pg_done: true })         // mark onboarding complete
  window.close()                 // close the popup
}
</script>

<template>
  <section class="card text-center">
    <h2 class="title">All set! 🎉</h2>
    <button class="btn" @click="finish">Finish</button>
  </section>
</template>

<script setup>
function close () { window.close() }
</script>

<style scoped>
@applyStyles;
</style>

