<template>
  <div
    class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer"
    @drop.prevent="drop"
    @dragover.prevent
  >
    <p class="text-gray-500">Drag & drop CSV / JSON here<br>or click to browse</p>
    <input ref="file" type="file" accept=".csv,.json" hidden @change="pick" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const emits = defineEmits<{ file: [txt: string, name: string] }>()
const file = ref<HTMLInputElement>()

function pick (e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) read(f)
}

function drop (e: DragEvent) {
  const f = e.dataTransfer?.files?.[0]
  if (f) read(f)
}

function read (f: File) {
  const reader = new FileReader()
  reader.onload = () => emits('file', reader.result as string, f.name)
  reader.readAsText(f)
}
</script>
