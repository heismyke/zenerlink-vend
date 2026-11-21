<script setup lang="ts">
import { computed } from 'vue'
import { words } from '@/lib/format'

// Status words map to one of four tones; unknown words are neutral.
const tones: Record<string, string> = {
  active: 'ok', operational: 'ok', online: 'ok', approved: 'ok', verified: 'ok', accepted: 'ok', documented: 'warn',
  assigned: 'info', inventory: 'plain', draft: 'plain', planned: 'plain', commissioning: 'info', documents_submitted: 'info',
  under_review: 'warn', pending: 'warn', pending_approval: 'warn', pending_approval_: 'warn', unverified: 'warn', unknown: 'warn',
  maintenance: 'warn', sandbox: 'warn', open: 'warn',
  suspended: 'bad', offline: 'bad', rejected: 'bad', failed: 'bad', decommissioned: 'bad', closed: 'bad', unsupported: 'bad', expired: 'bad',
  live: 'ok', retired: 'plain', settled: 'ok',
}
const props = defineProps<{ value: string; tone?: string; label?: string }>()
const t = computed(() => props.tone ?? tones[props.value] ?? 'plain')
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium"
    :class="{
      'bg-ok-soft text-ok': t === 'ok',
      'bg-bad-soft text-bad': t === 'bad',
      'bg-warn-soft text-warn': t === 'warn',
      'bg-sky-50 text-sky-700': t === 'info',
      'bg-slate-100 text-slate-600': t === 'plain',
    }"
  >
    <span class="size-1.5 rounded-full bg-current opacity-70" />
    {{ label ?? words(value) }}
  </span>
</template>
