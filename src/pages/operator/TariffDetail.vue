<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Calculator, Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { QuoteBreakdown as QB, TariffPlan, TariffVersion } from '@/lib/types'
import { dateTime, naira, nairaToKobo, words } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useToast } from '@/stores/toast'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import QuoteBreakdown from '@/components/QuoteBreakdown.vue'

const s = useSession()
const toast = useToast()
const id = useRoute().params.id as string
const plan = ref<TariffPlan | null>(null)
const versions = ref<TariffVersion[]>([])
const error = ref('')
async function load() {
  error.value = ''
  try {
    const [ps, vs] = await Promise.all([get<{ plans: TariffPlan[] }>('/v1/operator/tariffs'), get<{ versions: TariffVersion[] }>(`/v1/operator/tariffs/${id}/versions`)])
    plan.value = ps.plans.find((p) => p.id === id) ?? null
    versions.value = vs.versions
    if (!plan.value) error.value = 'Tariff plan not found.'
  } catch (e) {
    error.value = message(e)
  }
}
load()

function priceText(v: TariffVersion) {
  if (v.kind === 'flat') return `${naira(v.structure.rate_kobo_per_kwh)}/kWh`
  if (v.kind === 'tiered') return (v.structure.blocks ?? []).map((b) => `${b.up_to_kwh == null ? 'then' : `up to ${b.up_to_kwh} kWh`} ${naira(b.rate_kobo_per_kwh)}`).join(', ')
  return (v.structure.periods ?? []).map((p) => `${p.name} ${p.start}–${p.end} ${naira(p.rate_kobo_per_kwh)}`).join(', ')
}

// ---- decisions ----
const busy = ref(false)
async function decide(v: TariffVersion, action: 'submit' | 'approve' | 'reject') {
  let reason = ''
  if (action === 'reject') {
    reason = window.prompt('Why are you rejecting this version?') ?? ''
    if (!reason.trim()) return
  }
  if (action === 'approve' && !window.confirm(`Approve version ${v.version}? It takes effect ${dateTime(v.effective_from)} and can never be edited.`)) return
  busy.value = true
  try {
    await post(`/v1/operator/tariff-versions/${v.id}/decision`, { action, reason })
    toast.ok(action === 'submit' ? 'Sent for approval' : action === 'approve' ? 'Version approved' : 'Version rejected')
    load()
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = false
  }
}

// ---- draft a version ----
const open = ref(false)
const formError = ref('')
const localNow = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  d.setMinutes(0, 0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}
const f = reactive({
  kind: 'flat' as 'flat' | 'tiered' | 'tou', rate: '', blocks: [{ upto: '50', rate: '' }, { upto: '', rate: '' }],
  periods: [{ name: 'Day', start: '06:00', end: '18:00', rate: '' }, { name: 'Night', start: '18:00', end: '06:00', rate: '' }],
  fixed: '0', fee: '0', vat: '7.5', min: '100', max: '500000', from: localNow(), ref: '', notes: '',
})
function openDraft() {
  formError.value = ''
  f.from = localNow()
  open.value = true
}
async function draft() {
  formError.value = ''
  const k = (v: string) => nairaToKobo(v || '0')
  let structure: Record<string, unknown>
  if (f.kind === 'flat') {
    const r = k(f.rate)
    if (!r) return (formError.value = 'Enter the price per kWh.')
    structure = { rate_kobo_per_kwh: r }
  } else if (f.kind === 'tiered') {
    const blocks = f.blocks.map((b, i) => ({ up_to_kwh: i === f.blocks.length - 1 ? null : Number(b.upto), rate_kobo_per_kwh: k(b.rate) }))
    if (blocks.some((b) => !b.rate_kobo_per_kwh || (b.up_to_kwh !== null && !(b.up_to_kwh > 0)))) return (formError.value = 'Every block needs a price, and every block but the last needs an upper limit.')
    structure = { blocks }
  } else {
    const periods = f.periods.map((p) => ({ name: p.name.trim(), start: p.start, end: p.end, rate_kobo_per_kwh: k(p.rate) }))
    if (periods.some((p) => !p.name || !p.rate_kobo_per_kwh)) return (formError.value = 'Every period needs a name and a price.')
    structure = { periods }
  }
  const vat = Number(f.vat)
  if (!(vat >= 0 && vat <= 50)) return (formError.value = 'VAT must be between 0 and 50%.')
  const [fixed, fee, min, max] = [k(f.fixed), k(f.fee), k(f.min), k(f.max)]
  if ([fixed, fee, min, max].some((x) => x === null)) return (formError.value = 'Amounts must be in naira, e.g. 100 or 100.50.')
  busy.value = true
  try {
    await post(`/v1/operator/tariffs/${id}/versions`, {
      kind: f.kind, structure, fixed_charge_kobo: fixed, service_fee_kobo: fee, vat_bps: Math.round(vat * 100), min_purchase_kobo: min, max_purchase_kobo: max,
      effective_from: new Date(f.from).toISOString(), regulatory_reference: f.ref, notes: f.notes,
    })
    toast.ok('Draft saved. Submit it for approval when ready.')
    open.value = false
    load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}

// ---- preview ----
const pv = reactive({ version: '', amount: '5000', model: 'energy', periodKwh: '0' })
const preview = ref<QB | null>(null)
const pvError = ref('')
const pvVersion = computed(() => versions.value.find((v) => v.id === pv.version) ?? versions.value[0])
async function runPreview() {
  pvError.value = ''
  preview.value = null
  const amount = nairaToKobo(pv.amount)
  if (!pvVersion.value || !amount) return (pvError.value = 'Choose a version and an amount.')
  try {
    preview.value = await post<QB>(`/v1/operator/tariff-versions/${pvVersion.value.id}/preview`, { amount_kobo: amount, credit_model: pv.model, period_wh: Math.round(Number(pv.periodKwh || 0) * 1000) })
  } catch (e) {
    pvError.value = message(e)
  }
}
</script>

<template>
  <RouterLink to="/app/tariffs" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft class="size-4" /> Tariffs</RouterLink>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <Loading v-if="!plan && !error" />
  <template v-if="plan">
    <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold">{{ plan.name }}</h1>
        <p class="mt-1 text-sm text-muted"><span class="font-mono">{{ plan.code }}</span> · {{ plan.customer_category ? words(plan.customer_category) : 'All categories' }}</p>
      </div>
      <button v-if="s.can('tariffs.draft')" type="button" class="btn-primary" @click="openDraft"><Plus class="size-4" /> Draft new version</button>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card title="Versions" sub="Approved versions are frozen. A new approved version closes the previous one at its start date." flush>
        <EmptyState v-if="!versions.length" title="No versions yet" text="Draft the first price for this plan." />
        <ul v-else class="divide-y divide-line">
          <li v-for="v in versions" :key="v.id" class="px-5 py-4">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-semibold">Version {{ v.version }}</span><Badge :value="v.status" /><span class="text-xs text-muted">{{ words(v.kind) }}</span>
              <span v-if="plan.current_version?.id === v.id" class="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-white">In force</span>
            </div>
            <p class="mt-1.5 text-sm">{{ priceText(v) }}</p>
            <p class="mt-1 text-xs text-muted">
              From {{ dateTime(v.effective_from) }}<span v-if="v.effective_to"> to {{ dateTime(v.effective_to) }}</span>
              · VAT {{ v.vat_bps / 100 }}%<span v-if="v.fixed_charge_kobo"> · fixed {{ naira(v.fixed_charge_kobo) }}</span><span v-if="v.service_fee_kobo"> · fee {{ naira(v.service_fee_kobo) }}</span>
              · {{ naira(v.min_purchase_kobo) }}–{{ naira(v.max_purchase_kobo) }}
            </p>
            <p v-if="v.regulatory_reference" class="mt-1 text-xs text-muted">Reference: {{ v.regulatory_reference }}</p>
            <p v-if="v.rejection_reason" class="mt-1 text-xs text-bad">Rejected: {{ v.rejection_reason }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button v-if="v.status === 'draft' && s.can('tariffs.draft')" type="button" class="btn-ghost h-8" :disabled="busy" @click="decide(v, 'submit')">Submit for approval</button>
              <template v-if="v.status === 'pending_approval' && s.can('tariffs.approve')">
                <button type="button" class="btn-primary h-8" :disabled="busy || v.created_by === s.user?.id" :title="v.created_by === s.user?.id ? 'You drafted this version; someone else must approve it' : ''" @click="decide(v, 'approve')">Approve</button>
                <button type="button" class="btn-ghost h-8" :disabled="busy" @click="decide(v, 'reject')">Reject</button>
              </template>
              <span v-if="v.status === 'pending_approval' && v.created_by === s.user?.id" class="self-center text-xs text-muted">Waiting for another owner to approve</span>
            </div>
          </li>
        </ul>
      </Card>
      <Card title="Price preview" sub="See what a version gives before approving it">
        <form class="grid gap-3" @submit.prevent="runPreview">
          <Field label="Version"><select v-model="pv.version" class="input"><option value="">Latest (v{{ versions[0]?.version }})</option><option v-for="v in versions" :key="v.id" :value="v.id">v{{ v.version }} · {{ words(v.status) }}</option></select></Field>
          <div class="grid grid-cols-2 gap-3">
            <Field label="Amount" hint="₦"><input v-model="pv.amount" inputmode="decimal" class="input" /></Field>
            <Field label="Meter credit"><select v-model="pv.model" class="input"><option value="energy">kWh</option><option value="money">₦ balance</option></select></Field>
          </div>
          <Field v-if="pvVersion?.kind === 'tiered'" label="Already bought this month" hint="kWh"><input v-model="pv.periodKwh" inputmode="decimal" class="input" /></Field>
          <button type="submit" class="btn-ghost" :disabled="!versions.length"><Calculator class="size-4" /> Calculate</button>
        </form>
        <ErrorBox v-if="pvError" :text="pvError" class="mt-4" />
        <QuoteBreakdown v-if="preview" :q="preview" class="mt-4" />
      </Card>
    </div>
  </template>

  <Modal v-if="open" title="Draft a tariff version" sub="Saved as a draft. Someone other than you must approve it before it applies." wide @close="open = false">
    <form id="ver-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="draft">
      <Field label="Tariff type" span>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="k in (['flat', 'tiered', 'tou'] as const)" :key="k" type="button" class="rounded-lg border px-3 py-2 text-sm font-semibold" :class="f.kind === k ? 'border-ink bg-ink text-white' : 'border-line'" @click="f.kind = k">
            {{ k === 'tou' ? 'Time of use' : words(k) }}
          </button>
        </div>
      </Field>
      <Field v-if="f.kind === 'flat'" label="Price" hint="₦ per kWh" span><input v-model="f.rate" inputmode="decimal" class="input" placeholder="200" /></Field>
      <div v-if="f.kind === 'tiered'" class="space-y-2 sm:col-span-2">
        <p class="text-sm font-medium">Monthly blocks</p>
        <div v-for="(b, i) in f.blocks" :key="i" class="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
          <input v-if="i < f.blocks.length - 1" v-model="b.upto" inputmode="numeric" class="input" :placeholder="'Up to kWh'" :aria-label="`Block ${i + 1} up to kWh`" />
          <span v-else class="px-1 text-sm text-muted">Everything above</span>
          <input v-model="b.rate" inputmode="decimal" class="input" placeholder="₦ per kWh" :aria-label="`Block ${i + 1} price`" />
          <button type="button" class="rounded-md p-2 text-slate-400 hover:text-bad disabled:opacity-30" :disabled="f.blocks.length <= 2" aria-label="Remove block" @click="f.blocks.splice(i, 1)"><Trash2 class="size-4" /></button>
        </div>
        <button type="button" class="text-sm font-semibold underline" :disabled="f.blocks.length >= 10" @click="f.blocks.splice(f.blocks.length - 1, 0, { upto: '', rate: '' })">Add block</button>
      </div>
      <div v-if="f.kind === 'tou'" class="space-y-2 sm:col-span-2">
        <p class="text-sm font-medium">Periods (must cover the whole day)</p>
        <div v-for="(p, i) in f.periods" :key="i" class="grid grid-cols-[1.2fr_1fr_1fr_1fr_auto] items-center gap-2">
          <input v-model="p.name" class="input" placeholder="Name" />
          <input v-model="p.start" type="time" class="input" aria-label="Start" />
          <input v-model="p.end" type="time" class="input" aria-label="End" />
          <input v-model="p.rate" inputmode="decimal" class="input" placeholder="₦/kWh" />
          <button type="button" class="rounded-md p-2 text-slate-400 hover:text-bad disabled:opacity-30" :disabled="f.periods.length <= 2" aria-label="Remove period" @click="f.periods.splice(i, 1)"><Trash2 class="size-4" /></button>
        </div>
        <button type="button" class="text-sm font-semibold underline" @click="f.periods.push({ name: '', start: '', end: '', rate: '' })">Add period</button>
        <p class="text-xs text-muted">Time-of-use prices apply only to meters that hold a naira balance; energy can’t be priced in advance by time of day.</p>
      </div>
      <Field label="Fixed charge per purchase" hint="₦"><input v-model="f.fixed" inputmode="decimal" class="input" /></Field>
      <Field label="Service fee per purchase" hint="₦"><input v-model="f.fee" inputmode="decimal" class="input" /></Field>
      <Field label="VAT" hint="% included in price"><input v-model="f.vat" inputmode="decimal" class="input" /></Field>
      <Field label="Takes effect"><input v-model="f.from" type="datetime-local" class="input" /></Field>
      <Field label="Minimum purchase" hint="₦"><input v-model="f.min" inputmode="decimal" class="input" /></Field>
      <Field label="Maximum purchase" hint="₦"><input v-model="f.max" inputmode="decimal" class="input" /></Field>
      <Field label="Regulatory reference" hint="e.g. order number" span><input v-model="f.ref" class="input" /></Field>
      <Field label="Notes" span><input v-model="f.notes" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="ver-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save draft</button>
    </template>
  </Modal>
</template>
