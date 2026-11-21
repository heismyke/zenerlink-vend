<script setup lang="ts">
import { reactive, ref } from 'vue'
import { FileCheck2, Loader2, Plus, Send } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { Profile } from '@/lib/types'
import { date, words } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useToast } from '@/stores/toast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import OnboardingSteps from '@/components/OnboardingSteps.vue'
import ProfileForm from '@/components/ProfileForm.vue'

const s = useSession()
const toast = useToast()
const p = ref<Profile | null>(null)
const error = ref('')
const load = () => get<Profile>('/v1/operator/profile').then((r) => (p.value = r)).catch((e) => (error.value = message(e)))
load()
const owner = () => s.can('onboarding.submit')
const busy = ref(false)
async function submit() {
  if (!window.confirm('Submit your details to Zenerlink for review? You cannot edit them while they are reviewed.')) return
  busy.value = true
  try {
    p.value = await post<Profile>('/v1/operator/profile/submit')
    toast.ok('Submitted for review')
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = false
  }
}
const kinds = ['nerc_permit', 'nerc_registration', 'state_permit', 'cac_certificate', 'other']
const open = ref(false)
const formError = ref('')
const pf = reactive({ kind: 'nerc_permit', reference: '', issuer: '', issued_on: '', expires_on: '', evidence_ref: '', notes: '' })
async function addPermit() {
  formError.value = ''
  if (!pf.reference.trim()) return (formError.value = 'The permit or registration reference is required.')
  busy.value = true
  try {
    await post('/v1/operator/permits', { ...pf, reference: pf.reference.trim() })
    open.value = false
    toast.ok('Permit added. Zenerlink will verify it against the evidence.')
    load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Company & onboarding" sub="Your business details, and the permits Zenerlink verifies." />
  <ErrorBox v-if="error" :text="error" class="mb-4" />
  <Loading v-if="!p && !error" />
  <template v-if="p">
    <section class="card mb-6 p-5">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <OnboardingSteps :status="p.onboarding_status" />
        <button v-if="owner() && p.onboarding_status === 'draft'" type="button" class="btn-gold" :disabled="busy" @click="submit"><Send class="size-4" /> Submit for review</button>
      </div>
      <p v-if="p.review_notes" class="mt-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn"><b>Zenerlink:</b> {{ p.review_notes }}</p>
      <p v-if="p.onboarding_status !== 'draft'" class="mt-4 text-sm text-muted">Details are locked while Zenerlink reviews them. Contact Zenerlink to change anything.</p>
    </section>
    <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <Card title="Business details">
        <ProfileForm :profile="p" endpoint="/v1/operator/profile" :locked="!owner() || p.onboarding_status !== 'draft'" @saved="(x) => ((p = x), toast.ok('Details saved'))" />
      </Card>
      <div class="space-y-6">
        <Card title="Regulatory status">
          <div class="flex items-center gap-3"><Badge :value="p.regulatory_status" /><span class="text-sm text-muted">{{ p.regulatory_status === 'verified' ? 'A permit was verified against evidence by Zenerlink.' : 'Becomes verified only when Zenerlink checks a permit against its evidence.' }}</span></div>
        </Card>
        <Card title="Permits & registrations" flush>
          <template #actions><button v-if="owner()" type="button" class="btn-ghost h-8" @click="open = true"><Plus class="size-4" /> Add</button></template>
          <EmptyState v-if="!p.permits.length" :icon="FileCheck2" title="No permits yet" text="Add your NERC permit or registration and CAC certificate references." />
          <ul v-else class="divide-y divide-line">
            <li v-for="x in p.permits" :key="x.id" class="px-5 py-3 text-sm">
              <div class="flex items-center justify-between gap-3"><span class="font-semibold">{{ words(x.kind) }}</span><Badge :value="x.verification" /></div>
              <p class="text-muted">{{ x.reference }}<span v-if="x.issuer"> · {{ x.issuer }}</span><span v-if="x.expires_on"> · expires {{ date(x.expires_on) }}</span></p>
            </li>
          </ul>
        </Card>
        <Card title="Commercial terms" sub="Set by Zenerlink">
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-muted">Subscription plan</dt><dd class="font-medium">{{ p.subscription_plan_code || 'Not set' }}</dd></div>
            <div class="flex justify-between"><dt class="text-muted">Agreement</dt><dd class="font-medium">{{ p.agreement_reference || 'Not set' }}</dd></div>
          </dl>
        </Card>
      </div>
    </div>
  </template>
  <Modal v-if="open" title="Add a permit or registration" sub="It stays unverified until Zenerlink checks it against the document." @close="open = false">
    <form id="permit-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="addPermit">
      <Field label="Type"><select v-model="pf.kind" class="input"><option v-for="k in kinds" :key="k" :value="k">{{ words(k) }}</option></select></Field>
      <Field label="Reference"><input v-model="pf.reference" class="input" /></Field>
      <Field label="Issuer"><input v-model="pf.issuer" class="input" placeholder="e.g. NERC" /></Field>
      <Field label="Where the document is" hint="Optional"><input v-model="pf.evidence_ref" class="input" placeholder="Link or file name" /></Field>
      <Field label="Issued"><input v-model="pf.issued_on" type="date" class="input" /></Field>
      <Field label="Expires"><input v-model="pf.expires_on" type="date" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="permit-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Add</button>
    </template>
  </Modal>
</template>
