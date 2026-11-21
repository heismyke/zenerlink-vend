<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
const props = defineProps<{ status: string }>()
const steps = [
  { v: 'draft', label: 'Draft' },
  { v: 'documents_submitted', label: 'Submitted' },
  { v: 'under_review', label: 'Under review' },
  { v: 'approved', label: 'Approved' },
  { v: 'active', label: 'Active' },
]
const at = computed(() => steps.findIndex((s) => s.v === (props.status === 'suspended' ? 'active' : props.status)))
</script>

<template>
  <ol class="flex flex-wrap items-center gap-y-3" aria-label="Onboarding progress">
    <li v-for="(s, i) in steps" :key="s.v" class="flex items-center">
      <span class="flex items-center gap-2">
        <span
          class="grid size-7 place-items-center rounded-full border text-xs font-bold"
          :class="i < at || (i === at && s.v === 'active') ? 'border-ok bg-ok text-white' : i === at ? 'border-ink bg-ink text-white' : 'border-line bg-white text-slate-400'"
        >
          <Check v-if="i < at || (i === at && s.v === 'active')" class="size-3.5" /><template v-else>{{ i + 1 }}</template>
        </span>
        <span class="text-sm" :class="i <= at ? 'font-semibold text-slate-900' : 'text-muted'">{{ s.label }}</span>
      </span>
      <span v-if="i < steps.length - 1" class="mx-3 h-px w-6 bg-line sm:w-10" />
    </li>
    <li v-if="status === 'suspended'" class="ml-4"><span class="rounded-full bg-bad-soft px-2.5 py-1 text-xs font-semibold text-bad">Suspended</span></li>
  </ol>
</template>
