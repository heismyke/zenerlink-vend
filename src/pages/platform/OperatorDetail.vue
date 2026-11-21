<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Copy, KeyRound, Loader2 } from 'lucide-vue-next'
import { get, message, post, put } from '@/lib/api'
import type { Integration, Meter, PlatformOperator, PlatformOverview, Profile } from '@/lib/types'
import { ago, date, words } from '@/lib/format'
import { useToast } from '@/stores/toast'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import OnboardingSteps from '@/components/OnboardingSteps.vue'
import ProfileForm from '@/components/ProfileForm.vue'

const toast = useToast()
const id = useRoute().params.id as string
const op = ref<PlatformOperator | null>(null)
const p = ref<Profile | null>(null)
const integrations = ref<Integration[]>([])
const meters = ref<Meter[]>([])
const error = ref('')
async function load() {
  error.value = ''
  try {
    const [o, prof, ints, ms] = await Promise.all([
      get<PlatformOverview>('/v1/platform/vends/overview'),
      get<Profile>(`/v1/platform/operators/${id}/profile`),
      get<{ integrations: Integration[] }>(`/v1/platform/operators/${id}/integrations`),
      get<{ meters: Meter[] }>(`/v1/platform/operators/${id}/meters?limit=500`),
    ])
    op.value = o.list.find((x) => x.tenant_id === id) ?? null
    p.value = prof
    integrations.value = ints.integrations
    meters.value = ms.meters
  } catch (e) {
    error.value = message(e)
  }
}
load()

// Moves Zenerlink may make from each stage (mirrors the backend).
const moves: Record<string, { to: string; label: string; tone: string; notes?: boolean }[]> = {
  documents_submitted: [{ to: 'under_review', label: 'Start review', tone: 'btn-primary' }, { to: 'draft', label: 'Return to operator', tone: 'btn-ghost', notes: true }],
  under_review: [{ to: 'approved', label: 'Approve', tone: 'btn-primary' }, { to: 'draft', label: 'Return to operator', tone: 'btn-ghost', notes: true }],
  approved: [{ to: 'active', label: 'Activate', tone: 'btn-gold' }],
  active: [{ to: 'suspended', label: 'Suspend', tone: 'btn-danger', notes: true }],
  suspended: [{ to: 'active', label: 'Reactivate', tone: 'btn-primary' }],
}
const busy = ref(false)
async function move(to: string, needsNotes?: boolean) {
  let notes = ''
  if (needsNotes) {
    notes = window.prompt('Note for the operator (shown on their onboarding page):') ?? ''
    if (!notes.trim()) return
  } else if (!window.confirm(`Move ${op.value?.name} to "${words(to)}"?`)) return
  busy.value = true
  try {
    p.value = await post<Profile>(`/v1/platform/operators/${id}/onboarding`, { to, notes })
    toast.ok(`Onboarding: ${words(to)}`)
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = false
  }
}
async function decidePermit(permitId: string, decision: 'verified' | 'rejected') {
  let evidence = ''
  if (decision === 'verified') {
    evidence = window.prompt('Where is the reviewed document kept? (link or file reference)') ?? ''
    if (!evidence.trim()) return
  } else if (!window.confirm('Reject this permit?')) return
  try {
    await post(`/v1/platform/operators/${id}/permits/${permitId}/decision`, { decision, evidence_ref: evidence })
    toast.ok(decision === 'verified' ? 'Permit verified' : 'Permit rejected')
    load()
  } catch (e) {
    toast.bad(message(e))
  }
}

// ---- operating rights ----
const unverified = computed(() => meters.value.filter((m) => m.operating_rights === 'unverified' && m.status !== 'decommissioned'))
const picked = ref<string[]>([])
const rightsRef = ref('')
async function verifyRights() {
  if (!picked.value.length || !rightsRef.value.trim()) return toast.bad('Choose meters and record where the evidence is kept.')
  busy.value = true
  try {
    const r = await post<{ verified: number }>(`/v1/platform/operators/${id}/meters/operating-rights`, { meter_ids: picked.value, evidence_ref: rightsRef.value.trim() })
    toast.ok(`${r.verified} meters cleared for control`)
    picked.value = []
    rightsRef.value = ''
    load()
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = false
  }
}

// ---- Acrel ----
const acrelOpen = ref(false)
const af = reactive({ base_url: '', login_name: '', password: '', aes_key: '', aes_iv: '', timezone: 'Africa/Lagos', rotate: false })
const formError = ref('')
const issued = ref('')
const acrel = computed(() => integrations.value.find((i) => i.manufacturer === 'acrel'))
function openAcrel() {
  formError.value = ''
  Object.assign(af, { base_url: acrel.value?.base_url ?? '', login_name: '', password: '', aes_key: '', aes_iv: '', timezone: acrel.value?.timezone ?? 'Africa/Lagos', rotate: false })
  acrelOpen.value = true
}
async function saveAcrel() {
  formError.value = ''
  busy.value = true
  try {
    const r = await put<Integration>(`/v1/platform/operators/${id}/integrations/acrel`, { base_url: af.base_url, login_name: af.login_name, password: af.password,
      aes_key: af.aes_key, aes_iv: af.aes_iv, timezone: af.timezone, rotate_ingest_token: af.rotate })
    acrelOpen.value = false
    if (r.ingest_token) issued.value = `${location.origin.replace(/:\d+$/, '')}/v1/integrations/acrel/${r.ingest_token}/`
    toast.ok('Acrel integration saved')
    load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.ok('Copied'))
</script>

<template>
  <RouterLink to="/admin/operators" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft class="size-4" /> Operators</RouterLink>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <Loading v-if="!p && !error" />
  <template v-if="p">
    <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-xl font-semibold">{{ op?.name ?? p.legal_name }}</h1>
        <p class="mt-1 text-sm text-muted"><span class="font-mono">{{ op?.slug }}</span> · {{ p.legal_name || 'No legal name yet' }}</p>
      </div>
      <div class="flex gap-2"><Badge v-if="op" :value="op.vending_mode" /><Badge :value="p.regulatory_status" :label="`Regulatory: ${p.regulatory_status}`" /></div>
    </div>

    <section class="card mb-6 p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <OnboardingSteps :status="p.onboarding_status" />
        <div class="flex flex-wrap gap-2">
          <button v-for="m in moves[p.onboarding_status] ?? []" :key="m.to" type="button" :class="m.tone" :disabled="busy" @click="move(m.to, m.notes)">{{ m.label }}</button>
          <span v-if="p.onboarding_status === 'draft'" class="self-center text-sm text-muted">Waiting for the operator to submit</span>
        </div>
      </div>
      <p v-if="p.review_notes" class="mt-4 text-sm text-muted"><b>Last note:</b> {{ p.review_notes }}</p>
    </section>

    <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card title="Business details" sub="Zenerlink can edit at any stage; edits are audited">
        <ProfileForm :profile="p" :endpoint="`/v1/platform/operators/${id}/profile`" platform @saved="(x) => ((p = x), toast.ok('Saved'))" />
      </Card>
      <div class="space-y-6">
        <Card title="Permits" sub="Verify only against the actual document" flush>
          <EmptyState v-if="!p.permits.length" title="No permits submitted" />
          <ul v-else class="divide-y divide-line">
            <li v-for="x in p.permits" :key="x.id" class="px-5 py-3 text-sm">
              <div class="flex items-center justify-between gap-3"><span class="font-semibold">{{ words(x.kind) }}</span><Badge :value="x.verification" /></div>
              <p class="text-muted">{{ x.reference }}<span v-if="x.issuer"> · {{ x.issuer }}</span><span v-if="x.expires_on"> · expires {{ date(x.expires_on) }}</span></p>
              <p v-if="x.evidence_ref" class="truncate text-xs text-muted">Evidence: {{ x.evidence_ref }}</p>
              <div v-if="x.verification === 'unverified'" class="mt-2 flex gap-2">
                <button type="button" class="btn-primary h-8" @click="decidePermit(x.id, 'verified')">Verify</button>
                <button type="button" class="btn-ghost h-8" @click="decidePermit(x.id, 'rejected')">Reject</button>
              </div>
            </li>
          </ul>
        </Card>
        <Card title="Acrel integration">
          <template #actions><button type="button" class="btn-ghost h-8" @click="openAcrel"><KeyRound class="size-4" /> {{ acrel ? 'Update' : 'Connect' }}</button></template>
          <p v-if="!acrel" class="text-sm text-muted">Not connected. Enter the credentials Acrel issued to this operator.</p>
          <dl v-else class="space-y-2 text-sm">
            <div class="flex justify-between gap-3"><dt class="text-muted">Platform</dt><dd class="truncate font-medium">{{ acrel.base_url }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted">Status</dt><dd><Badge :value="acrel.status" /></dd></div>
            <div class="flex justify-between"><dt class="text-muted">Last data</dt><dd class="font-medium">{{ ago(acrel.last_ingest_at) }}</dd></div>
            <div v-if="acrel.last_error" class="text-bad">{{ acrel.last_error }}</div>
          </dl>
          <div v-if="issued" class="mt-4 rounded-xl border border-gold/40 bg-gold-soft p-4 text-sm">
            <p class="font-semibold">Give Acrel these push addresses. They are shown only once.</p>
            <p v-for="k in ['realtime', 'events']" :key="k" class="mt-2 flex items-center gap-2 break-all font-mono text-xs">{{ issued + k }}<button type="button" class="shrink-0" aria-label="Copy" @click="copy(issued + k)"><Copy class="size-3.5" /></button></p>
          </div>
        </Card>
      </div>
    </div>

    <div class="mt-6">
      <Card title="Operating rights" sub="Clear meters for remote control once you have seen proof the operator owns or may operate them" flush>
        <EmptyState v-if="!unverified.length" title="Nothing to verify" text="Every registered meter is cleared, or none are registered yet." />
        <template v-else>
          <div class="max-h-80 overflow-y-auto">
            <table class="table">
              <thead><tr><th class="w-10"><input type="checkbox" :checked="picked.length === unverified.length" aria-label="Select all" @change="picked = picked.length === unverified.length ? [] : unverified.map((m) => m.id)" /></th><th>Meter</th><th>Model</th><th>Status</th></tr></thead>
              <tbody>
                <tr v-for="m in unverified" :key="m.id">
                  <td><input v-model="picked" type="checkbox" :value="m.id" :aria-label="`Select ${m.meter_number}`" /></td>
                  <td class="font-mono font-semibold">{{ m.meter_number }}</td>
                  <td><span class="capitalize">{{ m.manufacturer }}</span> {{ m.model }}</td>
                  <td><Badge :value="m.status" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex flex-col gap-3 border-t border-line p-5 sm:flex-row">
            <input v-model="rightsRef" class="input flex-1" placeholder="Where the evidence is kept (invoice, transfer letter…)" aria-label="Evidence reference" />
            <button type="button" class="btn-primary" :disabled="busy || !picked.length" @click="verifyRights">Verify {{ picked.length || '' }} meters</button>
          </div>
        </template>
      </Card>
    </div>
  </template>

  <Modal v-if="acrelOpen" title="Acrel credentials" sub="Stored encrypted and never shown again. The document's sample AES key is refused." @close="acrelOpen = false">
    <form id="acrel-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveAcrel">
      <Field label="Platform address" hint="https://host:port/basic/prepayment" span><input v-model="af.base_url" class="input font-mono" /></Field>
      <Field label="Login name"><input v-model="af.login_name" class="input" autocomplete="off" /></Field>
      <Field label="Password"><input v-model="af.password" type="password" class="input" autocomplete="new-password" /></Field>
      <Field label="AES key" hint="16 characters"><input v-model="af.aes_key" class="input font-mono" autocomplete="off" maxlength="16" /></Field>
      <Field label="AES IV" hint="16 characters"><input v-model="af.aes_iv" class="input font-mono" autocomplete="off" maxlength="16" /></Field>
      <Field label="Time zone of Acrel's timestamps"><input v-model="af.timezone" class="input" /></Field>
      <label v-if="acrel" class="flex items-center gap-2 self-end text-sm"><input v-model="af.rotate" type="checkbox" /> Issue new push addresses</label>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="acrelOpen = false">Cancel</button>
      <button type="submit" form="acrel-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save</button>
    </template>
  </Modal>
</template>
