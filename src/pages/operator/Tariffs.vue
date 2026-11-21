<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Plus, ScrollText } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { Site, TariffPlan } from '@/lib/types'
import { date, naira, words } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
import { useSession } from '@/stores/session'
import { useToast } from '@/stores/toast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const s = useSession()
const toast = useToast()
const router = useRouter()
const { data, loading, error, run } = useLoad(() => get<{ plans: TariffPlan[] }>('/v1/operator/tariffs').then((r) => r.plans))
run()
const sites = ref<Site[]>([])
get<{ sites: Site[] }>('/v1/operator/sites').then((r) => (sites.value = r.sites)).catch(() => undefined)
const siteName = (id?: string) => (id ? (sites.value.find((g) => g.id === id)?.name ?? '—') : 'All sites')

function rateText(p: TariffPlan) {
  const v = p.current_version
  if (!v) return 'No approved version in force'
  if (v.kind === 'flat') return `${naira(v.structure.rate_kobo_per_kwh)}/kWh`
  if (v.kind === 'tiered') return `${v.structure.blocks?.length} blocks from ${naira(v.structure.blocks?.[0]?.rate_kobo_per_kwh)}/kWh`
  return `${v.structure.periods?.length} time-of-use periods`
}

const cats = ['residential', 'commercial', 'industrial', 'public', 'productive_use', 'other']
const open = ref(false)
const busy = ref(false)
const formError = ref('')
const f = reactive({ code: '', name: '', description: '', mini_grid_id: '', customer_category: '' })
async function create() {
  formError.value = ''
  if (!f.code.trim() || !f.name.trim()) return (formError.value = 'Code and name are required.')
  busy.value = true
  try {
    const p = await post<TariffPlan>('/v1/operator/tariffs', { code: f.code.trim(), name: f.name.trim(), description: f.description,
      mini_grid_id: f.mini_grid_id || undefined, customer_category: f.customer_category || undefined })
    toast.ok('Plan created. Add its first version.')
    router.push(`/app/tariffs/${p.id}`)
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Tariffs" sub="Each plan covers a site and customer category. Prices live in versions that someone else must approve.">
    <button v-if="s.can('tariffs.draft')" type="button" class="btn-primary" @click="open = true"><Plus class="size-4" /> New plan</button>
  </PageHeader>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !data" />
    <EmptyState v-else-if="data && !data.length" :icon="ScrollText" title="No tariff plans" text="Create a plan for your regulator-approved or lawfully applicable tariff." />
    <div v-else-if="data" class="overflow-x-auto">
      <table class="table min-w-[760px]">
        <thead><tr><th>Plan</th><th>Applies to</th><th>Price in force</th><th>Version</th><th>Since</th></tr></thead>
        <tbody>
          <tr v-for="p in data" :key="p.id" class="cursor-pointer" @click="router.push(`/app/tariffs/${p.id}`)">
            <td><p class="font-semibold">{{ p.name }}</p><p class="font-mono text-xs text-muted">{{ p.code }}</p></td>
            <td>{{ siteName(p.mini_grid_id) }} · {{ p.customer_category ? words(p.customer_category) : 'All categories' }}</td>
            <td :class="p.current_version ? 'font-medium' : 'text-warn'">{{ rateText(p) }}</td>
            <td><Badge v-if="p.current_version" value="approved" :label="`v${p.current_version.version} ${words(p.current_version.kind)}`" /><span v-else>—</span></td>
            <td class="text-muted">{{ p.current_version ? date(p.current_version.effective_from) : '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <Modal v-if="open" title="New tariff plan" sub="Only one active plan may cover the same site and customer category." @close="open = false">
    <form id="plan-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="create">
      <Field label="Code"><input v-model="f.code" class="input font-mono" placeholder="RES-KUJ" /></Field>
      <Field label="Name"><input v-model="f.name" class="input" placeholder="Residential, Kuje" /></Field>
      <Field label="Site"><select v-model="f.mini_grid_id" class="input"><option value="">All sites</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select></Field>
      <Field label="Customer category"><select v-model="f.customer_category" class="input"><option value="">All categories</option><option v-for="c in cats" :key="c" :value="c">{{ words(c) }}</option></select></Field>
      <Field label="Description" span><input v-model="f.description" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="plan-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Create plan</button>
    </template>
  </Modal>
</template>
