<template>
  <div class="container">
    <h1 class="title">Password Strength Analyzer</h1>

    <input
    v-model="password"
    :type="showPassword ? 'text' : 'password'"
    placeholder="Type your passwords"
    />
    <button @click="showPassword = !showPassword" type="button">
      {{ showPassword ? '🙈 Hide' : '👁 Show' }}
    </button>
    <button @click="analyzePassword">
      🔍 Check
    </button>

    <div v-if="password" class="results">
      <div :class="`badge ${badgeClass}`">
        {{ strengthLabel }}
      </div>
      <div v-if="breachesCount !== null" class="stat">
        <b>Data-breach check:</b>
        <span v-if="breachesCount === 0">✅ Not found</span>
        <span v-else>❌ Found {{ breachesCount }} times!</span>
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
const showPassword = ref(false)
import { ref, computed, onMounted } from 'vue'
import { loadModel, predictStrength } from '../model.ts'
import PasswordChart from '../components/PasswordChart.vue'
const breachesCount = ref<number | null>(null)

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
  if (breachesCount.value !== null && breachesCount.value > 0) return 'WEAK'
  if (strengthPercent.value < 70) return 'MED'
  return 'STRONG'
})
const badgeClass = computed(() =>
  strengthLabel.value === 'WEAK' ? 'bg-red-500'
  : strengthLabel.value === 'MED' ? 'bg-yellow-500'
  : 'bg-green-500'
)

async function checkPwnedPassword (pwd: string): Promise<number> {
  // k-Anonymity запрос к HIBP
  const buf    = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(pwd))
  const hash   = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
  if (!res.ok) return -1                        // сеть упала — не ругаемся
  const hit = res.textSync ? res.textSync() : await res.text()
  const line = hit.split('\n').find(l => l.startsWith(suffix))
  return line ? parseInt(line.split(':')[1], 10) : 0
}

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
    modelScore.value = strengthPercent.value =  breachesCount.value = null
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
  breachesCount.value = await checkPwnedPassword(password.value)

}
</script>

<style scoped>
input[type="password"]{ font-size:1.1rem; }
</style>
