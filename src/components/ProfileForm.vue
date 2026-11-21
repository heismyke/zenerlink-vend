<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Loader2, Plus, Trash2 } from 'lucide-vue-next'
import { message, patch } from '@/lib/api'
import type { Profile } from '@/lib/types'
import Field from '@/components/ui/Field.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

// The onboarding profile form, used by the operator (draft only) and by
// Zenerlink admins (any time, plus commercial terms).
const props = defineProps<{ profile: Profile; endpoint: string; platform?: boolean; locked?: boolean }>()
const emit = defineEmits<{ saved: [Profile] }>()
const f = reactive({ legal_name: '', trading_name: '', registration_number: '', business_address: '', service_areas: '', settlement_bank: '',
  settlement_account_name: '', settlement_account_number: '', manufacturers: '', subscription_plan_code: '', agreement_reference: '',
  contacts: [] as { name: string; role: string; email: string; phone: string }[] })
watch(() => props.profile, (p) => Object.assign(f, {
  legal_name: p.legal_name, trading_name: p.trading_name, registration_number: p.registration_number, business_address: p.business_address,
  service_areas: p.service_areas.join(', '), settlement_bank: p.settlement_bank, settlement_account_name: p.settlement_account_name,
  settlement_account_number: '', manufacturers: p.manufacturers.join(', '), subscription_plan_code: p.subscription_plan_code,
  agreement_reference: p.agreement_reference, contacts: p.contacts.map((c) => ({ ...c })),
}), { immediate: true })
const busy = ref(false)
const error = ref('')
const list = (v: string) => v.split(',').map((x) => x.trim()).filter(Boolean)
async function save() {
  error.value = ''
  busy.value = true
  const body: Record<string, unknown> = {
    legal_name: f.legal_name, trading_name: f.trading_name, registration_number: f.registration_number, business_address: f.business_address,
    service_areas: list(f.service_areas), settlement_bank: f.settlement_bank, settlement_account_name: f.settlement_account_name,
    manufacturers: list(f.manufacturers).map((m) => m.toLowerCase()), contacts: f.contacts.filter((c) => c.name.trim()),
  }
  if (f.settlement_account_number.trim()) body.settlement_account_number = f.settlement_account_number.trim()
  if (props.platform) Object.assign(body, { subscription_plan_code: f.subscription_plan_code, agreement_reference: f.agreement_reference })
  try {
    emit('saved', await patch<Profile>(props.endpoint, body))
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="save">
    <fieldset :disabled="locked" class="contents">
      <Field label="Legal name"><input v-model="f.legal_name" class="input" /></Field>
      <Field label="Trading name"><input v-model="f.trading_name" class="input" /></Field>
      <Field label="CAC registration number"><input v-model="f.registration_number" class="input" placeholder="RC…" /></Field>
      <Field label="Service areas" hint="Comma separated"><input v-model="f.service_areas" class="input" placeholder="FCT, Nasarawa" /></Field>
      <Field label="Business address" span><input v-model="f.business_address" class="input" /></Field>
      <Field label="Settlement bank"><input v-model="f.settlement_bank" class="input" /></Field>
      <Field label="Account name"><input v-model="f.settlement_account_name" class="input" /></Field>
      <Field label="Account number" :hint="profile.settlement_account_last4 ? `On file: ••••••${profile.settlement_account_last4}` : '10-digit NUBAN'"><input v-model="f.settlement_account_number" inputmode="numeric" maxlength="10" class="input font-mono" :placeholder="profile.settlement_account_last4 ? 'Leave blank to keep' : ''" /></Field>
      <Field label="Meter manufacturers" hint="Comma separated"><input v-model="f.manufacturers" class="input" placeholder="acrel" /></Field>
      <div class="space-y-2 sm:col-span-2">
        <p class="text-sm font-medium text-slate-700">Authorised contacts</p>
        <div v-for="(c, i) in f.contacts" :key="i" class="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.3fr_1fr_auto]">
          <input v-model="c.name" class="input" placeholder="Name" aria-label="Contact name" />
          <input v-model="c.role" class="input" placeholder="Role" aria-label="Contact role" />
          <input v-model="c.email" type="email" class="input" placeholder="Email" aria-label="Contact email" />
          <input v-model="c.phone" class="input" placeholder="Phone" aria-label="Contact phone" />
          <button type="button" class="rounded-md p-2 text-slate-400 hover:text-bad" aria-label="Remove contact" @click="f.contacts.splice(i, 1)"><Trash2 class="size-4" /></button>
        </div>
        <button type="button" class="inline-flex items-center gap-1 text-sm font-semibold underline" @click="f.contacts.push({ name: '', role: '', email: '', phone: '' })"><Plus class="size-4" /> Add contact</button>
      </div>
    </fieldset>
    <template v-if="platform">
      <Field label="Subscription plan" hint="Set by Zenerlink"><input v-model="f.subscription_plan_code" class="input" /></Field>
      <Field label="Commercial agreement reference" hint="Set by Zenerlink"><input v-model="f.agreement_reference" class="input" /></Field>
    </template>
    <ErrorBox v-if="error" :text="error" class="sm:col-span-2" />
    <div v-if="!locked || platform" class="sm:col-span-2"><button type="submit" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save details</button></div>
  </form>
</template>
