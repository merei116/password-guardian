<template>
  <section class="card text-center">
    <h2 class="title">All set! 🎉</h2>
    <p class="mb-6">Password Guardian is now active.<br>Try typing a password on any site.</p>
    <button class="btn" @click="close">Close</button>
  </section>
</template>

<script setup>
function close () { window.close() }
</script>

<style scoped>
@applyStyles;
</style>

