<script setup lang="ts">
defineProps<{ title?: string; sub?: string; flush?: boolean }>()
</script>

<template>
  <section class="card overflow-hidden">
    <header v-if="title || $slots.actions" class="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
      <div>
        <h2 class="text-sm font-semibold uppercase tracking-[0.1em] text-slate-900">{{ title }}</h2>
        <p v-if="sub" class="mt-0.5 text-xs text-muted">{{ sub }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </header>
    <div :class="flush ? '' : 'p-5'"><slot /></div>
  </section>
</template>
