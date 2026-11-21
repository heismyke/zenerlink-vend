<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Loader2, Plus, UserCog } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { StaffUser } from '@/lib/types'
import { date, words } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
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

const s = useSession()
const toast = useToast()
const { data, loading, error, run } = useLoad(() => get<{ staff: StaffUser[] }>('/v1/operator/staff').then((r) => r.staff))
run()
const roles = [
  { v: 'owner', what: 'Everything, including approving tariffs and disconnections and submitting onboarding.' },
  { v: 'admin', what: 'Sites, customers, meters and drafting tariffs; approves disconnections; manages staff.' },
  { v: 'finance', what: 'Collections, debts, refunds and financial records.' },
  { v: 'technician', what: 'Registers, commissions and maintains meters; sends approved commands.' },
  { v: 'support', what: 'Looks up customers, meters and tariffs. Read-only.' },
]
const open = ref(false)
const busy = ref(false)
const formError = ref('')
const f = reactive({ name: '', email: '', staff_role: 'support', password: '' })
async function add() {
  formError.value = ''
  if (!f.name.trim() || !f.email.trim() || f.password.length < 10) return (formError.value = 'Name, email and a temporary password of at least 10 characters are required.')
  busy.value = true
  try {
    await post('/v1/operator/staff', { ...f, email: f.email.trim().toLowerCase(), name: f.name.trim() })
    toast.ok(`${f.name} added. Share the temporary password privately.`)
    open.value = false
    Object.assign(f, { name: '', email: '', staff_role: 'support', password: '' })
    run()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Staff & roles" sub="Everyone gets only the access their job needs.">
    <button type="button" class="btn-primary" @click="open = true"><Plus class="size-4" /> Add staff</button>
  </PageHeader>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
    <div class="card overflow-hidden">
      <Loading v-if="loading && !data" />
      <EmptyState v-else-if="data && !data.length" :icon="UserCog" title="No staff" />
      <table v-else-if="data" class="table">
        <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Added</th></tr></thead>
        <tbody>
          <tr v-for="u in data" :key="u.id">
            <td><p class="font-semibold">{{ u.name || '—' }}<span v-if="u.id === s.user?.id" class="ml-1.5 text-xs font-normal text-muted">(you)</span></p><p class="text-xs text-muted">{{ u.email }}</p></td>
            <td class="font-medium">{{ words(u.staff_role ?? '') }}</td>
            <td><Badge :value="u.status" /></td>
            <td class="text-muted">{{ date(u.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <Card title="What each role can do">
      <dl class="space-y-3 text-sm">
        <div v-for="r in roles" :key="r.v"><dt class="font-semibold">{{ words(r.v) }}</dt><dd class="text-muted">{{ r.what }}</dd></div>
      </dl>
    </Card>
  </div>
  <Modal v-if="open" title="Add a staff member" @close="open = false">
    <form id="staff-form" class="grid gap-4" @submit.prevent="add">
      <Field label="Full name"><input v-model="f.name" class="input" /></Field>
      <Field label="Work email"><input v-model="f.email" type="email" class="input" /></Field>
      <Field label="Role">
        <select v-model="f.staff_role" class="input">
          <option v-for="r in roles" :key="r.v" :value="r.v" :disabled="r.v === 'owner' && s.user?.staff_role !== 'owner'">{{ words(r.v) }}{{ r.v === 'owner' && s.user?.staff_role !== 'owner' ? ' (owners only)' : '' }}</option>
        </select>
      </Field>
      <Field label="Temporary password" hint="At least 10 characters"><input v-model="f.password" type="text" autocomplete="off" class="input font-mono" /></Field>
      <ErrorBox v-if="formError" :text="formError" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="staff-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Add</button>
    </template>
  </Modal>
</template>
