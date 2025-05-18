<template>
  <div class="max-w-xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-lg">
    <h1 class="text-2xl font-bold mb-4">Проверка силы пароля</h1>

    <!-- ─────────── input ─────────── -->
    <input
      v-model="password"
      type="password"
      placeholder="Введите пароль"
      class="w-full p-3 border rounded-xl mb-4"
    />
    <button
      @click="analyzePassword"
      class="w-full bg-blue-500 text-white py-2 rounded-xl mb-4 hover:bg-blue-600"
    >
      🔍 Проверить пароль
    </button>

    <!-- ─────────── результаты ─────────── -->
    <div v-if="password" class="mb-4">
      <div :class="`inline-block px-3 py-1 rounded-full font-semibold text-white ${badgeClass}`">
        {{ strengthLabel }}
      </div>

      <div v-if="matchedPatterns.length" class="text-yellow-700 mt-2">
        <b>Совпадения с паттернами:</b>
        <ul>
          <li v-for="pat in matchedPatterns" :key="pat">⚠️ {{ pat }}</li>
        </ul>
      </div>

      <div v-if="modelScore !== null" class="text-gray-700 mt-2">
        <b>avg (-log P):</b> {{ modelScore.toFixed(3) }}
      </div>
      <div v-if="strengthPercent !== null" class="text-gray-700">
        <b>Сила пароля:</b> {{ strengthPercent }} %
      </div>
    </div>

    <!-- график -->
    <PasswordChart
      :patterns="patterns"   
      :top-n="7"          
      />

    <hr class="my-6" />

    <h2 class="text-lg font-semibold mb-2">Маски, по которым пароли легко угадывают</h2>
    <ul class="mb-4 grid grid-cols-2 gap-2">
      <li v-for="m in topMasks" :key="m.mask">
        <code>{{ m.mask }}</code>: <b>{{ m.count }}</b>
      </li>
    </ul>

    <h2 class="text-lg font-semibold mb-2">❗ Рекомендуется избегать</h2>
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
