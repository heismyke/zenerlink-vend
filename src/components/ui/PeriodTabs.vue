<script setup lang="ts">
const model = defineModel<number>({ required: true })
const opts = [
  { label: 'Today', v: 1 },
  { label: '7 days', v: 7 },
  { label: '30 days', v: 30 },
  { label: '90 days', v: 90 },
  { label: 'All time', v: 3650 },
]
</script>

<template>
  <div class="inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-white p-1 text-xs font-semibold uppercase tracking-wide" role="tablist">
    <button
      v-for="o in opts"
      :key="o.v"
      type="button"
      role="tab"
      :aria-selected="model === o.v"
      class="whitespace-nowrap rounded-md px-2.5 py-1.5 transition sm:px-3"
      :class="model === o.v ? 'bg-ink text-white' : 'text-slate-500 hover:text-slate-900'"
      @click="model = o.v"
    >
      {{ o.label }}
    </button>
  </div>
</template>
