<template>
  <section class="card">
    <h2 class="title">1 · Who are you?</h2>

    <label class="field">
      Full name
      <input v-model="full" class="input" />
    </label>

    <label class="field">
      City
      <input v-model="city" class="input" />
    </label>

    <button class="btn w-full mt-4" :disabled="!valid" @click="next">
      Continue
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { set } from '../../shared/storage'

const full = ref(''), city = ref('')
const valid = computed(() => full.value && city.value)
const router = useRouter()

async function next () {
  await set({ fullName: full.value, city: city.value })
  router.push('/import')
}
</script>

<style scoped>
@applyStyles;
</style>
