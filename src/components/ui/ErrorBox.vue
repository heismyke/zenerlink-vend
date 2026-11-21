<script setup lang="ts">
import { AlertTriangle } from 'lucide-vue-next'
defineProps<{ text: string }>()
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="flex items-start gap-3 rounded-xl border border-bad/20 bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">
    <AlertTriangle class="mt-0.5 size-4 shrink-0" />
    <span class="flex-1">{{ text }}</span>
    <button v-if="$attrs.onRetry" type="button" class="font-semibold underline" @click="$emit('retry')">Retry</button>
  </div>
</template>
