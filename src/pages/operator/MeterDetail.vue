<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Loader2, Power, PowerOff, RefreshCw, ShieldAlert } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { Customer, Meter, MeterDetail, MeterEvent, Site, Telemetry } from '@/lib/types'
import { ago, dateTime, kwh, num, words } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useToast } from '@/stores/toast'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const s = useSession()
const toast = useToast()
const route = useRoute()
const id = computed(() => route.params.id as string)
const m = ref<MeterDetail | null>(null)
const tel = ref<Telemetry[]>([])
const events = ref<MeterEvent[]>([])
const sites = ref<Site[]>([])
const customers = ref<Customer[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    const [meter, t, g] = await Promise.all([
      get<MeterDetail>(`/v1/operator/meters/${id.value}`),
      get<{ telemetry: Telemetry[]; events: MeterEvent[] }>(`/v1/operator/meters/${id.value}/telemetry?limit=20`),
      get<{ sites: Site[] }>('/v1/operator/sites'),
    ])
    m.value = meter
    if (meter.customer_account_id && !customers.value.some((c) => c.id === meter.customer_account_id))
      get<Customer>(`/v1/operator/customers/${meter.customer_account_id}`).then((c) => customers.value.push(c)).catch(() => undefined)
    tel.value = t.telemetry
    events.value = t.events
    sites.value = g.sites
  } catch (e) {
    error.value = message(e)
  }
}
watch(id, load, { immediate: true })
const siteName = (sid?: string) => sites.value.find((g) => g.id === sid)?.name ?? '—'
const custName = (cid?: string) => customers.value.find((c) => c.id === cid)?.name
const can = (cap: string) => ['documented', 'verified'].includes(m.value?.capabilities[cap] ?? '')
const latest = computed(() => tel.value[0])
const mv = (v?: number | null) => (v == null ? '—' : (v / 1000).toFixed(1) + ' V')
const ma = (v?: number | null) => (v == null ? '—' : (v / 1000).toFixed(2) + ' A')

// ---- actions ----
const busy = ref(false)
const formError = ref('')
type Dialog = '' | 'assign' | 'replace' | 'lifecycle' | 'commission' | 'maintenance' | 'disconnect'
const dialog = ref<Dialog>('')
const af = reactive({ customer: '', site: '', notes: '', replacement: '', action: '' })
const spares = ref<Meter[]>([])
async function openDialog(d: Dialog, action = '') {
  formError.value = ''
  Object.assign(af, { customer: m.value?.customer_account_id ?? '', site: m.value?.mini_grid_id ?? '', notes: '', replacement: '', action })
  dialog.value = d
  if (d === 'assign') customers.value = (await get<{ customers: Customer[] }>('/v1/operator/customers?limit=200')).customers
  if (d === 'replace') spares.value = (await get<{ meters: Meter[] }>('/v1/operator/meters?status=inventory&limit=200')).meters.filter((x) => x.id !== id.value)
}
async function act(path: string, body: unknown, done: string) {
  busy.value = true
  formError.value = ''
  try {
    await post(`/v1/operator/meters/${id.value}/${path}`, body)
    toast.ok(done)
    dialog.value = ''
    load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
async function control(action: string) {
  busy.value = true
  try {
    const r = await post<{ status: string; note: string }>(`/v1/operator/meters/${id.value}/control`, { action })
    toast.ok(r.status === 'unknown' ? r.note : `${words(action)} sent. ${r.note}`)
    load()
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = false
  }
}
async function requestDisconnect() {
  if (!af.notes.trim()) return (formError.value = 'Give a reason.')
  busy.value = true
  formError.value = ''
  try {
    await post(`/v1/operator/meters/${id.value}/control`, { action: 'switch_off', reason: af.notes.trim() })
    toast.ok('Disconnection requested. Another owner or admin must approve it in Meter Monitoring.')
    dialog.value = ''
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <RouterLink to="/app/meters" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft class="size-4" /> Meters</RouterLink>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <Loading v-if="!m && !error" />
  <template v-if="m">
    <div class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2.5">
          <h1 class="font-mono text-xl font-semibold">{{ m.meter_number }}</h1>
          <Badge :value="m.status" /><Badge :value="m.connectivity" />
          <Badge :value="m.operating_rights" :label="m.operating_rights === 'verified' ? 'Rights verified' : 'Rights unverified'" />
        </div>
        <p class="mt-1 text-sm text-muted"><span class="capitalize">{{ m.manufacturer }}</span> {{ m.model }} · last report {{ ago(m.last_seen_at) }}</p>
      </div>
      <div v-if="m.status !== 'decommissioned'" class="flex flex-wrap gap-2">
        <template v-if="s.can('meters.write')">
          <button type="button" class="btn-ghost h-9" @click="openDialog('assign')">{{ m.customer_account_id ? 'Transfer' : 'Assign' }}</button>
          <button type="button" class="btn-ghost h-9" @click="openDialog('replace')">Replace</button>
          <button v-if="m.status === 'suspended'" type="button" class="btn-ghost h-9" @click="openDialog('lifecycle', 'reactivate')">Reactivate</button>
          <button v-else type="button" class="btn-ghost h-9" @click="openDialog('lifecycle', 'suspend')">Suspend</button>
          <button type="button" class="btn-ghost h-9 text-bad" @click="openDialog('lifecycle', 'decommission')">Decommission</button>
        </template>
        <template v-if="s.can('meters.commission')">
          <button v-if="!m.commissioned_at" type="button" class="btn-primary h-9" @click="openDialog('commission')">Commission</button>
          <button v-else type="button" class="btn-ghost h-9" @click="openDialog('maintenance')">Log maintenance</button>
        </template>
      </div>
    </div>

    <!-- Remote control -->
    <Card v-if="s.can('meters.control') && (can('refresh') || can('remote_switch'))" title="Remote control" sub="Commands go through the manufacturer's platform. Accepted does not mean the meter acted: check the next reading." class="mb-6">
      <div v-if="m.operating_rights !== 'verified'" class="flex items-start gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
        <ShieldAlert class="mt-0.5 size-4 shrink-0" /> Zenerlink has not verified your right to operate this meter yet, so commands are blocked.
      </div>
      <div v-else class="flex flex-wrap gap-2">
        <button v-if="can('refresh')" type="button" class="btn-ghost" :disabled="busy" @click="control('refresh')"><RefreshCw class="size-4" /> Refresh readings</button>
        <button v-if="can('remote_switch')" type="button" class="btn-ghost" :disabled="busy" @click="control('switch_on')"><Power class="size-4" /> Switch on</button>
        <button v-if="can('remote_switch')" type="button" class="btn-ghost text-bad" :disabled="busy" @click="openDialog('disconnect')"><PowerOff class="size-4" /> Request disconnection</button>
      </div>
      <p class="mt-3 text-xs text-muted">Switching on restores supply; it is never a recharge.</p>
    </Card>

    <div class="grid gap-6 lg:grid-cols-3">
      <Card title="Registry">
        <dl class="space-y-2.5 text-sm">
          <div v-for="[k, v] in [
            ['Customer', m.customer_account_id ? (custName(m.customer_account_id) ?? 'Assigned') : 'None'],
            ['Site', siteName(m.mini_grid_id)],
            ['Serial / meterNo', m.serial_number || '—'],
            ['Gateway', m.gateway_id || '—'],
            ['Meter type', words(m.meter_type)],
            ['Communication', m.comms_mode === 'gsm' ? '4G / GSM' : words(m.comms_mode)],
            ['Vending', words(m.vending_mechanism)],
            ['Credit held as', m.credit_model === 'money' ? 'Naira balance' : 'Energy (kWh)'],
            ['Firmware', m.firmware_version || '—'],
            ['Location', m.install_location || '—'],
            ['Commissioned', m.commissioned_at ? dateTime(m.commissioned_at) : 'Not yet'],
          ]" :key="k" class="flex justify-between gap-4"><dt class="text-muted">{{ k }}</dt><dd class="text-right font-medium">{{ v }}</dd></div>
          <div v-if="m.sts" class="flex justify-between gap-4"><dt class="text-muted">STS</dt><dd class="font-mono font-medium">SGC {{ m.sts.sgc }} · KRN {{ m.sts.krn }} · TI {{ m.sts.ti }}</dd></div>
        </dl>
        <RouterLink v-if="m.customer_account_id" :to="`/app/customers/${m.customer_account_id}`" class="mt-4 inline-block text-sm font-semibold underline">Open customer</RouterLink>
      </Card>
      <Card title="Latest reading" :sub="latest ? `Reported ${dateTime(latest.reported_at)}` : undefined">
        <EmptyState v-if="!latest" title="No readings yet" text="Readings appear when the manufacturer's platform sends them." />
        <dl v-else class="space-y-2.5 text-sm">
          <div class="flex justify-between"><dt class="text-muted">Energy (import)</dt><dd class="font-semibold">{{ kwh(latest.energy_import_wh) }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Power</dt><dd class="font-medium">{{ latest.power_w == null ? '—' : num(latest.power_w) + ' W' }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Voltage</dt><dd class="font-medium">{{ (latest.voltage_mv ?? []).filter((x) => x != null).map(mv).join(' / ') || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Current</dt><dd class="font-medium">{{ (latest.current_ma ?? []).filter((x) => x != null).map(ma).join(' / ') || '—' }}</dd></div>
          <div class="flex justify-between"><dt class="text-muted">Supply switch</dt><dd><Badge v-if="latest.switch_on != null" :value="latest.switch_on ? 'on' : 'off'" :tone="latest.switch_on ? 'ok' : 'bad'" /><span v-else>—</span></dd></div>
          <div class="flex justify-between"><dt class="text-muted">Balance (as reported)</dt><dd class="font-medium" title="Acrel sends this without a unit, so it is shown as reported.">{{ latest.balance_raw ?? '—' }}</dd></div>
        </dl>
        <p v-if="latest" class="mt-3 text-xs text-muted">Reported values, not estimates.</p>
      </Card>
      <Card title="Capabilities" sub="From the manufacturer's documents; 'verified' only after hardware tests">
        <ul class="space-y-2 text-sm">
          <li v-for="(lvl, cap) in m.capabilities" :key="cap" class="flex items-center justify-between gap-3"><span>{{ words(String(cap)) }}</span><Badge :value="lvl" /></li>
        </ul>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <Card title="Alarms" flush>
        <EmptyState v-if="!events.length" title="No alarms" />
        <ul v-else class="divide-y divide-line">
          <li v-for="(e, i) in events" :key="i" class="flex items-center gap-3 px-5 py-3 text-sm">
            <Badge :value="e.code" :label="e.code" tone="warn" /><span class="flex-1">{{ e.message || 'Alarm' }}</span><span class="text-xs text-muted">{{ dateTime(e.reported_at) }}</span>
          </li>
        </ul>
      </Card>
      <Card title="History" sub="Append-only record of everything done to this meter" flush>
        <ul class="divide-y divide-line">
          <li v-for="(h, i) in m.history" :key="i" class="px-5 py-3 text-sm">
            <div class="flex items-center justify-between gap-3"><span class="font-medium">{{ words(h.kind) }}</span><span class="text-xs text-muted">{{ dateTime(h.created_at) }}</span></div>
            <p v-if="h.notes" class="mt-0.5 text-muted">{{ h.notes }}</p>
            <RouterLink v-if="h.related_meter_id" :to="`/app/meters/${h.related_meter_id}`" class="text-xs font-semibold underline">Linked meter</RouterLink>
          </li>
        </ul>
      </Card>
    </div>
    <div v-if="tel.length > 1" class="mt-6">
      <Card title="Recent readings" flush>
        <div class="overflow-x-auto">
          <table class="table min-w-[640px]">
            <thead><tr><th>Reported</th><th>Energy</th><th>Power</th><th>Voltage</th><th>Switch</th><th>State</th></tr></thead>
            <tbody>
              <tr v-for="(t, i) in tel" :key="i">
                <td>{{ dateTime(t.reported_at) }}</td><td>{{ kwh(t.energy_import_wh) }}</td><td>{{ t.power_w == null ? '—' : num(t.power_w) + ' W' }}</td>
                <td>{{ mv(t.voltage_mv?.[0]) }}</td><td>{{ t.switch_on == null ? '—' : t.switch_on ? 'On' : 'Off' }}</td>
                <td><Badge v-if="t.online != null" :value="t.online ? 'online' : 'offline'" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </template>

  <Modal v-if="dialog === 'assign'" :title="m?.customer_account_id ? 'Transfer meter' : 'Assign meter'" @close="dialog = ''">
    <div class="grid gap-4">
      <Field label="Customer"><select v-model="af.customer" class="input"><option value="">Keep current</option><option v-for="c in customers" :key="c.id" :value="c.id">{{ c.account_number }} · {{ c.name }}</option></select></Field>
      <Field label="Site"><select v-model="af.site" class="input"><option value="">Keep current</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select></Field>
      <Field label="Notes"><input v-model="af.notes" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" />
    </div>
    <template #footer>
      <button v-if="m?.customer_account_id" type="button" class="btn-ghost mr-auto" :disabled="busy" @click="act('unassign', { notes: af.notes }, 'Customer removed from meter')">Unassign customer</button>
      <button type="button" class="btn-ghost" @click="dialog = ''">Cancel</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="act('assign', { customer_account_id: af.customer || undefined, mini_grid_id: af.site || undefined, notes: af.notes }, 'Meter updated')">Save</button>
    </template>
  </Modal>
  <Modal v-if="dialog === 'replace'" title="Replace meter" sub="The customer and site move to the replacement; this meter is decommissioned." @close="dialog = ''">
    <div class="grid gap-4">
      <Field label="Replacement (from inventory)"><select v-model="af.replacement" class="input"><option value="" disabled>Choose a meter</option><option v-for="x in spares" :key="x.id" :value="x.id">{{ x.meter_number }} · {{ x.manufacturer }} {{ x.model }}</option></select></Field>
      <p v-if="!spares.length" class="text-sm text-muted">No unassigned meters in inventory. Register the replacement first.</p>
      <Field label="Reason"><input v-model="af.notes" class="input" placeholder="e.g. Keypad fault" /></Field>
      <ErrorBox v-if="formError" :text="formError" />
    </div>
    <template #footer>
      <button type="button" class="btn-ghost" @click="dialog = ''">Cancel</button>
      <button type="button" class="btn-danger" :disabled="busy || !af.replacement" @click="act('replace', { replacement_meter_id: af.replacement, notes: af.notes }, 'Meter replaced')">Replace</button>
    </template>
  </Modal>
  <Modal v-if="dialog === 'lifecycle'" :title="`${words(af.action)} meter`" :sub="af.action === 'decommission' ? 'This is permanent: the meter leaves service and its customer is unassigned.' : undefined" @close="dialog = ''">
    <Field label="Reason"><input v-model="af.notes" class="input" /></Field>
    <ErrorBox v-if="formError" :text="formError" class="mt-4" />
    <template #footer>
      <button type="button" class="btn-ghost" @click="dialog = ''">Cancel</button>
      <button type="button" :class="af.action === 'reactivate' ? 'btn-primary' : 'btn-danger'" :disabled="busy" @click="act('lifecycle', { action: af.action, notes: af.notes }, `Meter ${af.action === 'reactivate' ? 'reactivated' : af.action === 'suspend' ? 'suspended' : 'decommissioned'}`)">{{ words(af.action) }}</button>
    </template>
  </Modal>
  <Modal v-if="dialog === 'commission' || dialog === 'maintenance'" :title="dialog === 'commission' ? 'Commission meter' : 'Log maintenance'" :sub="dialog === 'commission' ? 'Confirm the meter is installed, sealed and tested on site.' : undefined" @close="dialog = ''">
    <Field label="Notes"><textarea v-model="af.notes" rows="3" class="input h-auto py-2" placeholder="What was checked or done" /></Field>
    <ErrorBox v-if="formError" :text="formError" class="mt-4" />
    <template #footer>
      <button type="button" class="btn-ghost" @click="dialog = ''">Cancel</button>
      <button type="button" class="btn-primary" :disabled="busy" @click="act(dialog, { notes: af.notes }, dialog === 'commission' ? 'Meter commissioned' : 'Maintenance logged')"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save</button>
    </template>
  </Modal>
  <Modal v-if="dialog === 'disconnect'" title="Request disconnection" sub="Another owner or admin must approve before anything is sent to the meter." @close="dialog = ''">
    <Field label="Reason"><input v-model="af.notes" class="input" placeholder="e.g. Account in arrears" /></Field>
    <ErrorBox v-if="formError" :text="formError" class="mt-4" />
    <template #footer>
      <button type="button" class="btn-ghost" @click="dialog = ''">Cancel</button>
      <button type="button" class="btn-danger" :disabled="busy" @click="requestDisconnect">Request</button>
    </template>
  </Modal>
</template>
