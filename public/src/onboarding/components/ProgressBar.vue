<template>
  <div class="w-full h-3 bg-gray-200 rounded">
    <div class="h-full bg-indigo-600 rounded" :style="{ width: pct + '%' }"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ pct: number }>()
</script>
