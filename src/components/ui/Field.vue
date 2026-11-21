<script setup lang="ts">
defineProps<{ label: string; hint?: string; error?: string; span?: boolean }>()
</script>

<template>
  <label class="block" :class="span ? 'sm:col-span-2' : ''">
    <span class="mb-1.5 flex items-baseline justify-between gap-2 text-sm font-medium text-slate-700">
      {{ label }}
      <span v-if="hint" class="text-xs font-normal text-muted">{{ hint }}</span>
    </span>
    <slot />
    <span v-if="error" class="mt-1 block text-xs text-bad">{{ error }}</span>
  </label>
</template>
