<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { X } from 'lucide-vue-next'
const props = defineProps<{ title: string; sub?: string; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
void props
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 backdrop-blur-[2px] sm:items-center sm:p-6" @click.self="emit('close')">
      <div
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        :class="wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'"
      >
        <div class="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
          <div>
            <h2 class="text-base font-semibold">{{ title }}</h2>
            <p v-if="sub" class="mt-0.5 text-sm text-muted">{{ sub }}</p>
          </div>
          <button type="button" class="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close" @click="emit('close')"><X class="size-5" /></button>
        </div>
        <div class="px-6 py-5"><slot /></div>
        <div v-if="$slots.footer" class="sticky bottom-0 flex justify-end gap-2 border-t border-line bg-white px-6 py-4"><slot name="footer" /></div>
      </div>
    </div>
  </Teleport>
</template>
