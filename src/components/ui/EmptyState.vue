<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ title: string; text?: string; icon?: Component }>()
</script>

<template>
  <div class="flex flex-col items-center px-6 py-14 text-center">
    <span v-if="icon" class="mb-4 grid size-11 place-items-center rounded-xl bg-slate-100 text-slate-500"><component :is="icon" class="size-5" /></span>
    <p class="font-semibold text-slate-800">{{ title }}</p>
    <p v-if="text" class="mt-1 max-w-sm text-sm text-muted">{{ text }}</p>
    <div class="mt-5 flex gap-2"><slot /></div>
  </div>
</template>
