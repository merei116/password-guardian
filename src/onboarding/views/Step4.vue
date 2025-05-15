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
import TrainWorker from '../../worker/train.worker.ts?worker';

const pct = ref(0)
const router = useRouter()
const route = useRoute()
const worker = new TrainWorker()

onMounted(() => {
  const csv = atob(route.query.csv as string)
  const worker = new TrainWorker()
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