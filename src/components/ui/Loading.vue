<script setup lang="ts">
defineProps<{ rows?: number }>()
</script>

<template>
  <div class="space-y-3 p-5" aria-busy="true" aria-label="Loading">
    <div v-for="i in rows ?? 5" :key="i" class="h-9 animate-pulse rounded-lg bg-slate-100" />
  </div>
</template>
