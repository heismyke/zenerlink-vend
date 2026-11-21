import { ref } from 'vue'
import { message } from './api'

// useLoad runs a loader with loading and error state.
export function useLoad<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref('')
  async function run() {
    loading.value = true
    error.value = ''
    try {
      data.value = (await fn()) as never
    } catch (e) {
      error.value = message(e)
    } finally {
      loading.value = false
    }
  }
  return { data, loading, error, run }
}
