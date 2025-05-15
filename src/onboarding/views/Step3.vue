<template>
  <section class="card">
    <h2 class="title">2 · Import your passwords</h2>

    <FileDrop @file="onFile" />

    <p v-if="fileName" class="mt-4">✅ {{ fileName }} selected</p>

    <button class="btn w-full mt-6" :disabled="!csvText" @click="next">
      Analyze
    </button>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import FileDrop from '../components/FileDrop.vue'

const router = useRouter()
const csvText = ref<string | null>(null)
const fileName = ref('')

function onFile (txt: string, name: string) {
  csvText.value = txt
  fileName.value = name
}

function next () {
  if (csvText.value) {
    // передаём текст воркеру из Step4 через route query
    router.push({ path: '/analyze', query: { csv: btoa(csvText.value) } })
  }
}
</script>

<style scoped>
@applyStyles;
</style>

