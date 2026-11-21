<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, FileUp, Gauge, Loader2, Plus, Search } from 'lucide-vue-next'
import { ApiError, get, message, post } from '@/lib/api'
import type { Customer, Meter, MeterModel, Site } from '@/lib/types'
import { ago, downloadCSV, num, words } from '@/lib/format'
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
const route = useRoute()
const router = useRouter()
const PAGE = 50
const q = ref('')
const status = ref('')
const siteId = ref((route.query.site_id as string) ?? '')
const offset = ref(0)
const rows = ref<Meter[] | null>(null)
const total = ref(0)
const loading = ref(false)
const error = ref('')
const sites = ref<Site[]>([])
const models = ref<MeterModel[]>([])
get<{ sites: Site[] }>('/v1/operator/sites').then((r) => (sites.value = r.sites)).catch(() => undefined)
get<{ models: MeterModel[] }>('/v1/operator/meter-models').then((r) => (models.value = r.models)).catch(() => undefined)
const siteName = (id?: string) => sites.value.find((g) => g.id === id)?.name ?? '—'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset.value) })
    if (q.value.trim()) p.set('q', q.value.trim())
    if (status.value) p.set('status', status.value)
    if (siteId.value) p.set('site_id', siteId.value)
    const r = await get<{ meters: Meter[]; total: number }>(`/v1/operator/meters?${p}`)
    rows.value = r.meters
    total.value = r.total
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}
let t: number | undefined
watch(q, () => {
  clearTimeout(t)
  t = window.setTimeout(() => ((offset.value = 0), load()), 300)
})
watch([status, siteId, offset], load, { immediate: true })

// ---- Register one ----
const regOpen = ref(route.query.new === '1')
const busy = ref(false)
const formError = ref('')
const customers = ref<Customer[]>([])
watch(regOpen, (o) => o && !customers.value.length && get<{ customers: Customer[] }>('/v1/operator/customers?limit=200').then((r) => (customers.value = r.customers)).catch(() => undefined), { immediate: true })
const f = reactive({ meter_number: '', modelId: '', serial_number: '', firmware_version: '', gateway_id: '', mini_grid_id: '', customer_account_id: '',
  meter_type: 'prepaid', comms_mode: 'none', install_location: '', vending_mechanism: 'none', credit_model: 'energy', sgc: '', krn: '1', ti: '1' })
const model = computed(() => models.value.find((m) => m.id === f.modelId))
const supports = (cap: string) => ['documented', 'verified'].includes(model.value?.capabilities[cap] ?? '')
watch(model, (m) => {
  if (!m) return
  if (f.vending_mechanism === 'sts_token' && !supports('sts_token')) f.vending_mechanism = 'none'
  if (f.vending_mechanism === 'remote_credit' && !supports('remote_credit')) f.vending_mechanism = 'none'
  if (m.manufacturer === 'acrel') f.comms_mode = 'gsm'
})
async function register() {
  formError.value = ''
  if (!f.meter_number.trim() || !model.value) return (formError.value = 'Meter number and model are required.')
  busy.value = true
  try {
    const m = await post<Meter>('/v1/operator/meters', {
      meter_number: f.meter_number.trim(), manufacturer: model.value.manufacturer, model: model.value.model, serial_number: f.serial_number.trim(),
      firmware_version: f.firmware_version.trim(), gateway_id: f.gateway_id.trim(), mini_grid_id: f.mini_grid_id || undefined,
      customer_account_id: f.customer_account_id || undefined, meter_type: f.meter_type, comms_mode: f.comms_mode, install_location: f.install_location,
      vending_mechanism: f.vending_mechanism, credit_model: f.vending_mechanism === 'sts_token' ? 'energy' : f.credit_model,
      sts: f.vending_mechanism === 'sts_token' ? { sgc: f.sgc.trim(), krn: Number(f.krn), ti: Number(f.ti) } : undefined,
    })
    toast.ok(`Meter ${m.meter_number} registered`)
    regOpen.value = false
    router.push(`/app/meters/${m.id}`)
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}

// ---- CSV import ----
type ImportResult = { dry_run: boolean; rows: number; imported: number; errors: { row: number; code: string; message: string }[] }
const impOpen = ref(false)
const csv = ref('')
const fileName = ref('')
const result = ref<ImportResult | null>(null)
const template = 'meter_number,manufacturer,model,serial_number,mini_grid_code,customer_account_number,comms_mode,gateway_id,vending_mechanism,credit_model,sts_sgc,sts_krn,sts_ti\n'
async function pick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 900_000) return toast.bad('The file is too large; split it into files of up to 5,000 meters.')
  fileName.value = file.name
  csv.value = await file.text()
  result.value = null
}
async function runImport(dry: boolean) {
  busy.value = true
  formError.value = ''
  try {
    result.value = await post<ImportResult>('/v1/operator/meters/import', { csv: csv.value, dry_run: dry })
    if (!dry) {
      toast.ok(`${result.value.imported} meters imported`)
      impOpen.value = false
      load()
    }
  } catch (e) {
    // 422 carries the per-row report.
    if (e instanceof ApiError && e.status === 422 && (e.body as ImportResult)?.errors) {
      result.value = e.body as ImportResult
    } else formError.value = message(e)
  } finally {
    busy.value = false
  }
}
function exportCSV() {
  if (!rows.value) return
  downloadCSV('meters.csv', [
    ['meter_number', 'manufacturer', 'model', 'serial_number', 'site', 'status', 'connectivity', 'vending_mechanism', 'credit_model', 'operating_rights'],
    ...rows.value.map((m) => [m.meter_number, m.manufacturer, m.model, m.serial_number, siteName(m.mini_grid_id), m.status, m.connectivity, m.vending_mechanism, m.credit_model, m.operating_rights]),
  ])
}
</script>

<template>
  <PageHeader title="Meters" :sub="`${num(total)} meters in the registry`">
    <button type="button" class="btn-ghost" :disabled="!rows?.length" @click="exportCSV"><Download class="size-4" /> Export page</button>
    <template v-if="s.can('meters.write')">
      <button type="button" class="btn-ghost" @click="(impOpen = true), (result = null), (csv = ''), (fileName = '')"><FileUp class="size-4" /> Import CSV</button>
      <button type="button" class="btn-primary" @click="(formError = ''), (regOpen = true)"><Plus class="size-4" /> Register meter</button>
    </template>
  </PageHeader>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row">
    <label class="relative flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input v-model="q" class="input pl-9" placeholder="Search meter number, serial or gateway" aria-label="Search meters" />
    </label>
    <select v-model="siteId" class="input sm:w-48" aria-label="Filter by site"><option value="">All sites</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select>
    <select v-model="status" class="input sm:w-44" aria-label="Filter by status">
      <option value="">All statuses</option>
      <option v-for="x in ['inventory', 'assigned', 'active', 'suspended', 'decommissioned']" :key="x" :value="x">{{ words(x) }}</option>
    </select>
  </div>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !rows" />
    <EmptyState v-else-if="rows && !rows.length" :icon="Gauge" :title="q || status || siteId ? 'No matching meters' : 'No meters yet'" :text="q || status || siteId ? 'Try another filter.' : 'Register meters one by one or import a CSV.'" />
    <div v-else-if="rows" class="overflow-x-auto">
      <table class="table min-w-[920px]">
        <thead><tr><th>Meter</th><th>Model</th><th>Site</th><th>Vending</th><th>Status</th><th>Connectivity</th><th>Last report</th><th>Rights</th></tr></thead>
        <tbody>
          <tr v-for="m in rows" :key="m.id" class="cursor-pointer" @click="router.push(`/app/meters/${m.id}`)">
            <td><p class="font-mono font-semibold">{{ m.meter_number }}</p><p class="text-xs text-muted">{{ m.serial_number || '—' }}</p></td>
            <td><span class="capitalize">{{ m.manufacturer }}</span> <span class="text-muted">{{ m.model }}</span></td>
            <td>{{ siteName(m.mini_grid_id) }}</td>
            <td>{{ words(m.vending_mechanism) }}<span v-if="m.vending_mechanism !== 'none'" class="text-xs text-muted"> · {{ m.credit_model === 'money' ? '₦ balance' : 'kWh' }}</span></td>
            <td><Badge :value="m.status" /></td>
            <td><Badge :value="m.connectivity" /></td>
            <td class="text-muted">{{ ago(m.last_seen_at) }}</td>
            <td><Badge :value="m.operating_rights" /></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-if="total > PAGE" class="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
      <span class="text-muted">{{ offset + 1 }}–{{ Math.min(offset + PAGE, total) }} of {{ num(total) }}</span>
      <span class="flex gap-2">
        <button type="button" class="btn-ghost h-8" :disabled="offset === 0" @click="offset -= PAGE">Previous</button>
        <button type="button" class="btn-ghost h-8" :disabled="offset + PAGE >= total" @click="offset += PAGE">Next</button>
      </span>
    </div>
  </div>

  <Modal v-if="regOpen" title="Register a meter" wide @close="regOpen = false">
    <form id="reg-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="register">
      <Field label="Meter model">
        <select v-model="f.modelId" class="input"><option value="" disabled>Choose a model</option><option v-for="m in models" :key="m.id" :value="m.id">{{ m.manufacturer }} — {{ m.model }}</option></select>
      </Field>
      <Field label="Meter number"><input v-model="f.meter_number" class="input font-mono" /></Field>
      <div v-if="model" class="rounded-xl bg-canvas p-4 text-sm sm:col-span-2">
        <p class="font-medium">{{ model.description }}</p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <Badge v-for="(lvl, cap) in model.capabilities" :key="cap" :value="lvl" :label="`${words(String(cap))}: ${lvl}`" />
        </div>
        <p v-if="model.notes" class="mt-2 text-xs text-muted">{{ model.notes }}</p>
      </div>
      <Field label="Serial number" :hint="model?.manufacturer === 'acrel' ? 'Acrel meterNo: <gateway>_<address>' : 'Optional'"><input v-model="f.serial_number" class="input font-mono" /></Field>
      <Field label="Gateway ID" :hint="model?.manufacturer === 'acrel' ? 'Acrel gatewaySn' : 'Optional'"><input v-model="f.gateway_id" class="input font-mono" /></Field>
      <Field label="Site"><select v-model="f.mini_grid_id" class="input"><option value="">Not yet</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select></Field>
      <Field label="Customer"><select v-model="f.customer_account_id" class="input"><option value="">In inventory</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.account_number }} · {{ c.name }}</option></select></Field>
      <Field label="Vending method">
        <select v-model="f.vending_mechanism" class="input">
          <option value="none">None (monitoring or not yet)</option>
          <option value="sts_token" :disabled="!supports('sts_token')">STS token{{ supports('sts_token') ? '' : ' — not supported by this model' }}</option>
          <option value="remote_credit" :disabled="!supports('remote_credit')">Remote recharge{{ supports('remote_credit') ? '' : ' — not supported by this model' }}</option>
        </select>
      </Field>
      <Field label="Credit held by the meter">
        <select v-model="f.credit_model" class="input" :disabled="f.vending_mechanism === 'sts_token'"><option value="energy">Energy (kWh)</option><option value="money">Money (₦ balance)</option></select>
      </Field>
      <template v-if="f.vending_mechanism === 'sts_token'">
        <Field label="Supply group code" hint="6 digits"><input v-model="f.sgc" inputmode="numeric" class="input font-mono" /></Field>
        <div class="grid grid-cols-2 gap-4">
          <Field label="Key revision"><input v-model="f.krn" inputmode="numeric" class="input" /></Field>
          <Field label="Tariff index"><input v-model="f.ti" inputmode="numeric" class="input" /></Field>
        </div>
        <p class="text-xs text-muted sm:col-span-2">Only STS identifiers are stored. Keys stay with your authorised STS vending provider.</p>
      </template>
      <Field label="Meter type"><select v-model="f.meter_type" class="input"><option value="prepaid">Prepaid</option><option value="postpaid">Postpaid</option></select></Field>
      <Field label="Communication"><select v-model="f.comms_mode" class="input"><option v-for="x in ['none', 'gsm', 'wifi', 'mqtt', 'lorawan']" :key="x" :value="x">{{ x === 'gsm' ? '4G / GSM' : words(x) }}</option></select></Field>
      <Field label="Firmware"><input v-model="f.firmware_version" class="input" /></Field>
      <Field label="Installation location"><input v-model="f.install_location" class="input" placeholder="e.g. House 12, pole 4" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="regOpen = false">Cancel</button>
      <button type="submit" form="reg-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Register</button>
    </template>
  </Modal>

  <Modal v-if="impOpen" title="Import meters from CSV" sub="Every row is checked first. If any row is wrong, nothing is imported." wide @close="impOpen = false">
    <div class="space-y-4 text-sm">
      <p class="text-muted">Required columns: <code class="rounded bg-slate-100 px-1">meter_number</code>, <code class="rounded bg-slate-100 px-1">manufacturer</code>. Refer to sites and customers by their codes. Up to 5,000 rows.</p>
      <button type="button" class="font-semibold text-slate-900 underline" @click="downloadCSV('meters-template.csv', [template.trim().split(',')])">Download the template</button>
      <label class="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-line px-6 py-8 text-center hover:border-gold">
        <FileUp class="size-6 text-slate-400" />
        <span class="font-medium">{{ fileName || 'Choose a CSV file' }}</span>
        <input type="file" accept=".csv,text/csv" class="sr-only" @change="pick" />
      </label>
      <div v-if="result" class="rounded-xl border p-4" :class="result.errors.length ? 'border-bad/30 bg-bad-soft' : 'border-ok/30 bg-ok-soft'">
        <p class="font-semibold" :class="result.errors.length ? 'text-bad' : 'text-ok'">
          {{ result.errors.length ? `${result.errors.length} problem${result.errors.length > 1 ? 's' : ''} in ${result.rows} rows — nothing imported` : `All ${result.rows} rows are valid` }}
        </p>
        <ul v-if="result.errors.length" class="mt-2 max-h-56 space-y-1 overflow-y-auto text-xs text-slate-700">
          <li v-for="e in result.errors" :key="e.row + e.code">Row {{ e.row }}: {{ e.message }}</li>
        </ul>
      </div>
      <ErrorBox v-if="formError" :text="formError" />
    </div>
    <template #footer>
      <button type="button" class="btn-ghost" :disabled="!csv || busy" @click="runImport(true)">Check file</button>
      <button type="button" class="btn-primary" :disabled="!csv || busy || !result || result.errors.length > 0" @click="runImport(false)">
        <Loader2 v-if="busy" class="size-4 animate-spin" /> Import {{ result?.rows ?? '' }} meters
      </button>
    </template>
  </Modal>
</template>
