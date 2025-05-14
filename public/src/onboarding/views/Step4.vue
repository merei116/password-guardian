<template>
  <section class="card text-center">
    <h2 class="title">3 · Analyzing…</h2>
    <ProgressBar :pct="pct" class="mt-8" />
    <p class="mt-2">{{ pct }} % </p>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ProgressBar from '../components/ProgressBar.vue'

const pct = ref(0)
const router = useRouter()
const route = useRoute()

onMounted(() => {
  const csv = atob(route.query.csv as string)
  const worker = new Worker(new URL('../../worker/train.worker.ts', import.meta.url), { type: 'module' })
  worker.postMessage({ csvText: csv })

  worker.onmessage = ({ data }) => {
    if (data.progress) pct.value = data.progress
    if (data.done) router.push('/done')
  }
})
</script>
<style scoped>
@applyStyles;
</style>

