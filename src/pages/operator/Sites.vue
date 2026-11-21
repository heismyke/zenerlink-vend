<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Loader2, Plus, Sun } from 'lucide-vue-next'
import { get, message, patch, post } from '@/lib/api'
import type { Site } from '@/lib/types'
import { num, words } from '@/lib/format'
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
const { data, loading, error, run } = useLoad(() => get<{ sites: Site[] }>('/v1/operator/sites').then((r) => r.sites))
run()

const types = ['solar', 'solar_hybrid', 'hydro', 'gas', 'grid_connected', 'estate', 'other']
const statuses = ['planned', 'commissioning', 'operational', 'maintenance', 'decommissioned']
const editing = ref<Site | null>(null)
const open = ref(false)
const busy = ref(false)
const formError = ref('')
const f = reactive({ code: '', name: '', state: '', lga: '', community: '', address: '', project_type: 'solar_hybrid', status: 'planned', kwp: '', kwh: '' })

function openNew() {
  editing.value = null
  Object.assign(f, { code: '', name: '', state: '', lga: '', community: '', address: '', project_type: 'solar_hybrid', status: 'planned', kwp: '', kwh: '' })
  formError.value = ''
  open.value = true
}
function openEdit(g: Site) {
  editing.value = g
  Object.assign(f, { code: g.code, name: g.name, state: g.state, lga: g.lga, community: g.community, address: g.address, project_type: g.project_type, status: g.status,
    kwp: g.generation_capacity_w ? String(g.generation_capacity_w / 1000) : '', kwh: g.battery_capacity_wh ? String(g.battery_capacity_wh / 1000) : '' })
  formError.value = ''
  open.value = true
}
// kW and kWh are typed; the API stores whole watts and watt-hours.
const toMilli = (v: string) => (v.trim() ? Math.round(Number(v) * 1000) : 0)

async function save() {
  formError.value = ''
  if (!f.name.trim() || (!editing.value && !f.code.trim())) return (formError.value = 'Code and name are required.')
  if ([f.kwp, f.kwh].some((v) => v.trim() && !(Number(v) >= 0))) return (formError.value = 'Capacities must be numbers.')
  busy.value = true
  const body = { name: f.name, state: f.state, lga: f.lga, community: f.community, address: f.address, project_type: f.project_type, status: f.status,
    generation_capacity_w: toMilli(f.kwp), battery_capacity_wh: toMilli(f.kwh) }
  try {
    if (editing.value) await patch(`/v1/operator/sites/${editing.value.id}`, body)
    else await post('/v1/operator/sites', { code: f.code.trim(), ...body })
    toast.ok(editing.value ? 'Site updated' : 'Site added')
    open.value = false
    run()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Mini-grids" sub="Generation and distribution sites on your network.">
    <button v-if="s.can('sites.write')" type="button" class="btn-primary" @click="openNew"><Plus class="size-4" /> Add site</button>
  </PageHeader>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !data" />
    <EmptyState v-else-if="data && !data.length" :icon="Sun" title="No sites yet" text="Add your first mini-grid to start registering customers and meters.">
      <button v-if="s.can('sites.write')" type="button" class="btn-primary" @click="openNew"><Plus class="size-4" /> Add site</button>
    </EmptyState>
    <div v-else-if="data" class="overflow-x-auto">
      <table class="table min-w-[860px]">
        <thead><tr><th>Site</th><th>Location</th><th>Type</th><th>Generation</th><th>Battery</th><th>Meters</th><th>Customers</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="g in data" :key="g.id">
            <td><p class="font-semibold">{{ g.name }}</p><p class="text-xs text-muted">{{ g.code }}</p></td>
            <td class="text-slate-600">{{ [g.community, g.lga, g.state].filter(Boolean).join(', ') || '—' }}</td>
            <td>{{ words(g.project_type) }}</td>
            <td>{{ g.generation_capacity_w ? num(g.generation_capacity_w / 1000) + ' kWp' : '—' }}</td>
            <td>{{ g.battery_capacity_wh ? num(g.battery_capacity_wh / 1000) + ' kWh' : '—' }}</td>
            <td><RouterLink :to="`/app/meters?site_id=${g.id}`" class="font-medium hover:underline">{{ num(g.meter_count) }}</RouterLink></td>
            <td><RouterLink :to="`/app/customers?site_id=${g.id}`" class="font-medium hover:underline">{{ num(g.customer_count) }}</RouterLink></td>
            <td><Badge :value="g.status" /></td>
            <td class="text-right"><button v-if="s.can('sites.write')" type="button" class="text-sm font-semibold text-slate-600 hover:text-slate-900" @click="openEdit(g)">Edit</button></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <p class="mt-3 text-xs text-muted">Generation and battery telemetry will show here only when a real data source is connected.</p>

  <Modal v-if="open" :title="editing ? `Edit ${editing.name}` : 'Add a mini-grid'" @close="open = false">
    <form id="site-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
      <Field label="Site code" :hint="editing ? 'Cannot change' : 'Short ID, e.g. KUJ'"><input v-model="f.code" class="input" :disabled="!!editing" /></Field>
      <Field label="Name"><input v-model="f.name" class="input" /></Field>
      <Field label="State"><input v-model="f.state" class="input" /></Field>
      <Field label="LGA"><input v-model="f.lga" class="input" /></Field>
      <Field label="Community"><input v-model="f.community" class="input" /></Field>
      <Field label="Address"><input v-model="f.address" class="input" /></Field>
      <Field label="Project type"><select v-model="f.project_type" class="input"><option v-for="t in types" :key="t" :value="t">{{ words(t) }}</option></select></Field>
      <Field label="Status"><select v-model="f.status" class="input"><option v-for="t in statuses" :key="t" :value="t">{{ words(t) }}</option></select></Field>
      <Field label="Generation capacity" hint="kWp"><input v-model="f.kwp" inputmode="decimal" class="input" /></Field>
      <Field label="Battery storage" hint="kWh"><input v-model="f.kwh" inputmode="decimal" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="site-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save</button>
    </template>
  </Modal>
</template>
