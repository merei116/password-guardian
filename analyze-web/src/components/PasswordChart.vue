<!-- src/components/PasswordChart.vue -->
<template>
  <div class="w-full">
    <canvas ref="canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import Chart from 'chart.js/auto'

/* ---------- props ---------- */
const props = defineProps<{
  /** полный объект patterns из patterns.json */
  patterns: Record<string, any> | null
  /** сколько баров показать (для password_counts) */
  topN?: number
}>()

/* ---------- refs / chart inst ---------- */
const canvas = ref<HTMLCanvasElement | null>(null)
let chart: Chart | null = null

/* ---------- build data ---------- */
function buildChartData () {
  if (!props.patterns) return { labels: [], data: [] }

  /* ① password_counts (детализированные повторы) */
  if (props.patterns.password_counts) {
    const entries = Object.entries(props.patterns.password_counts as Record<string, number>)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, props.topN ?? 5)

    return {
      labels: entries.map(([pwd])   => pwd),
      data  : entries.map(([, cnt]) => Number(cnt))
    }
  }

  /* ② запасной вариант — поле zigzag (одно число) */
  if (typeof props.patterns.zigzag === 'number') {
    return { labels: ['ZigZag'], data: [props.patterns.zigzag] }
  }

  return { labels: [], data: [] }
}

/* ---------- render ---------- */
function render () {
  const ctx = canvas.value
  if (!ctx) return
  const { labels, data } = buildChartData()

  // пере-рендер
  if (chart) chart.destroy()

  chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Повторы',
        data,
        backgroundColor: 'rgba(54, 162, 235, 0.6)'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title : {
          display: true,
          text   : labels.length > 1
            ? 'Самые частые пароли'
            : 'Общее число ZigZag-паролей'
        }
      },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  })
}

/* ---------- lifecycle ---------- */
onMounted(render)
watch(() => props.patterns, render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<style scoped>
canvas { max-height: 320px; }
</style>
