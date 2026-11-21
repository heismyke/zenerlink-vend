<script setup lang="ts">
import type { Component } from 'vue'
defineProps<{ label: string; value: string | number; hint?: string; icon?: Component; tone?: 'ok' | 'bad' | 'warn' | 'plain' }>()
</script>

<template>
  <div class="card p-5">
    <div class="flex items-center gap-2">
      <span
        v-if="icon"
        class="grid size-6 place-items-center rounded-full"
        :class="{ 'bg-ok-soft text-ok': tone === 'ok', 'bg-bad-soft text-bad': tone === 'bad', 'bg-warn-soft text-warn': tone === 'warn', 'bg-slate-100 text-slate-600': !tone || tone === 'plain' }"
      >
        <component :is="icon" class="size-3.5" />
      </span>
      <span class="label-caps">{{ label }}</span>
    </div>
    <p class="mt-3 text-[28px] font-semibold leading-none tracking-tight" :class="{ 'text-ok': tone === 'ok', 'text-bad': tone === 'bad', 'text-warn': tone === 'warn' }">{{ value }}</p>
    <p v-if="hint" class="mt-2 text-xs text-muted">{{ hint }}</p>
  </div>
</template>
