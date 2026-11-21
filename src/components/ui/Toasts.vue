<script setup lang="ts">
import { CheckCircle2, XCircle } from 'lucide-vue-next'
import { useToast } from '@/stores/toast'
const t = useToast()
</script>

<template>
  <div class="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6" aria-live="polite">
    <div v-for="m in t.items" :key="m.id" class="pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-2xl">
      <CheckCircle2 v-if="m.tone === 'ok'" class="mt-0.5 size-4 shrink-0 text-emerald-400" />
      <XCircle v-else class="mt-0.5 size-4 shrink-0 text-red-400" />
      <span>{{ m.text }}</span>
    </div>
  </div>
</template>
