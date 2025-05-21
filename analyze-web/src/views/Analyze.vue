<template>
  <div class="container">
    <h1 class="title">Password Strength Analyzer</h1>

    <input
      v-model="password"
      type="text"
      placeholder="Type your passwords"
    />
    <button @click="analyzePassword">
      🔍 Check
    </button>

    <div v-if="password" class="results">
      <div :class="`badge ${badgeClass}`">
        {{ strengthLabel }}
      </div>

      <div v-if="matchedPatterns.length" class="warning">
        <b>Pattern matches:</b>
        <ul>
          <li v-for="pat in matchedPatterns" :key="pat">⚠️ {{ pat }}</li>
        </ul>
      </div>

      <div v-if="modelScore !== null" class="stat">
        <b>avg (-log P):</b> {{ modelScore.toFixed(3) }}
      </div>
      <div v-if="strengthPercent !== null" class="stat">
        <b>Password's strength:</b> {{ strengthPercent }} %
      </div>
    </div>

    <PasswordChart :patterns="patterns" :top-n="7" />

    <hr />

    <h2 class="section-title">Masks that make passwords easy to guess:</h2>
    <ul class="grid-list">
      <li v-for="m in topMasks" :key="m.mask">
        <code>{{ m.mask }}</code>: <b>{{ m.count }}</b>
      </li>
    </ul>

    <h2 class="section-title">❗Recommended to avoid</h2>
    <ul>
      <li v-for="bad in avoidPatterns" :key="bad">🚫 {{ bad }}</li>
    </ul>
  </div>
</template>


<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { loadModel, predictStrength } from '../model.ts'
import PasswordChart from '../components/PasswordChart.vue'

/* ─────────── state ─────────── */
const password        = ref('')
const modelScore      = ref<number | null>(null)      // raw avg
const strengthPercent = ref<number | null>(null)      // 0-100
const matchedPatterns = ref<string[]>([])

const patterns   = ref<any>({})
const topMasks   = ref<{mask:string, count:number}[]>([])
const avoidPatterns = ref<string[]>([])

/* ─────────── визуальные метки ─────────── */
const strengthLabel = computed(() => {
  if (strengthPercent.value === null) return '—'
  if (strengthPercent.value < 40) return 'WEAK'
  if (strengthPercent.value < 70) return 'MED'
  return 'STRONG'
})
const badgeClass = computed(() =>
  strengthLabel.value === 'WEAK' ? 'bg-red-500'
  : strengthLabel.value === 'MED' ? 'bg-yellow-500'
  : 'bg-green-500'
)

/* ─────────── загрузка модели и patterns ─────────── */
onMounted(async () => {
  await loadModel()

  try {
    const res = await fetch('/assets/patterns.json')
    patterns.value = await res.json()

    /* ── TOP-5 масок для графика ─────────────────────────────── */
    const masksEntries = Object.entries(patterns.value.masks ?? {})
    topMasks.value = masksEntries
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 5)
      .map(([mask, count]) => ({ mask, count: Number(count) }))

    /* ── Рекомендуется избегать: самые частые СЛОВА/подстроки ─ */
    const wordEntries = Object.entries(patterns.value.words ?? {})
    avoidPatterns.value = wordEntries          // уже слова длиной 3-7
      .filter(([, v]) => Number(v) >= 10)      // ≥10 в истории = опасно
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 10)
      .map(([w]) => w)

  } catch (e) {
    console.error('[Analyze] cannot load patterns.json', e)
  }
})

/* ─────────── кнопка «Проверить» ─────────── */
async function analyzePassword () {
  if (!password.value) {
    modelScore.value = strengthPercent.value = null
    matchedPatterns.value = []
    console.warn('[Analyze] пустой пароль')
    return
  }

  console.log('[Analyze] пароль:', password.value)
  const { avg, percent } = await predictStrength(password.value)
  modelScore.value      = avg
  strengthPercent.value = percent
  console.log('[Analyze] avg:', avg, 'percent:', percent)

  // mask-match
  const mask = password.value.split('').map(c =>
    /[A-Za-z]/.test(c)?'X' : /\d/.test(c)?'D'
    : /[!@#$%^&*()\-_=+]/.test(c)?'S' : '_'
  ).join('')
  matchedPatterns.value = patterns.value.masks?.[mask]
    ? [`Маска "${mask}"`] : []
}
</script>

<style scoped>
input[type="password"]{ font-size:1.1rem; }
</style>
