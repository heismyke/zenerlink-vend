import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToast = defineStore('toast', () => {
  const items = ref<{ id: number; text: string; tone: 'ok' | 'bad' }[]>([])
  let n = 0
  function push(text: string, tone: 'ok' | 'bad' = 'ok') {
    const id = ++n
    items.value.push({ id, text, tone })
    setTimeout(() => (items.value = items.value.filter((t) => t.id !== id)), 4500)
  }
  return { items, ok: (t: string) => push(t, 'ok'), bad: (t: string) => push(t, 'bad') }
})
