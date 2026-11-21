<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Gauge, Loader2, Plus } from 'lucide-vue-next'
import { get, message, patch, post } from '@/lib/api'
import type { Customer, Debt, Meter, Site } from '@/lib/types'
import { date, naira, nairaToKobo, words } from '@/lib/format'
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
const id = useRoute().params.id as string
const c = ref<Customer | null>(null)
const debts = ref<Debt[]>([])
const meters = ref<Meter[]>([])
const sites = ref<Site[]>([])
const error = ref('')

async function load() {
  error.value = ''
  try {
    const [cust, d, m, g] = await Promise.all([
      get<Customer>(`/v1/operator/customers/${id}`),
      get<{ debts: Debt[] }>(`/v1/operator/customers/${id}/debts`),
      s.can('meters.read') ? get<{ meters: Meter[] }>(`/v1/operator/meters?customer_id=${id}&limit=100`) : Promise.resolve({ meters: [] }),
      get<{ sites: Site[] }>('/v1/operator/sites'),
    ])
    c.value = cust
    debts.value = d.debts
    meters.value = m.meters
    sites.value = g.sites
  } catch (e) {
    error.value = message(e)
  }
}
load()
const siteName = computed(() => sites.value.find((g) => g.id === c.value?.mini_grid_id)?.name ?? '—')

const cats = ['residential', 'commercial', 'industrial', 'public', 'productive_use', 'other']
const editOpen = ref(false)
const ef = reactive({ name: '', phone: '', email: '', category: '', mini_grid_id: '', address: '', status: '' })
function openEdit() {
  const x = c.value!
  Object.assign(ef, { name: x.name, phone: x.phone, email: x.email, category: x.category, mini_grid_id: x.mini_grid_id ?? '', address: x.address, status: x.status })
  editOpen.value = true
}
const busy = ref(false)
const formError = ref('')
async function saveEdit() {
  busy.value = true
  formError.value = ''
  try {
    c.value = await patch<Customer>(`/v1/operator/customers/${id}`, { ...ef, mini_grid_id: ef.mini_grid_id || undefined })
    editOpen.value = false
    toast.ok('Customer updated')
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}

const debtOpen = ref(false)
const df = reactive({ reason: '', amount: '', share: '20' })
async function addDebt() {
  formError.value = ''
  const kobo = nairaToKobo(df.amount)
  const bps = Math.round(Number(df.share) * 100)
  if (!df.reason.trim() || !kobo || !(bps >= 1 && bps <= 10000)) return (formError.value = 'Give a reason, an amount, and a recovery share between 0.01% and 100%.')
  busy.value = true
  try {
    await post(`/v1/operator/customers/${id}/debts`, { reason: df.reason.trim(), principal_kobo: kobo, recovery_bps: bps })
    debtOpen.value = false
    toast.ok('Debt recorded')
    load()
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <RouterLink to="/app/customers" class="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"><ArrowLeft class="size-4" /> Customers</RouterLink>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <Loading v-if="!c && !error" />
  <template v-if="c">
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div class="flex items-center gap-3"><h1 class="text-xl font-semibold">{{ c.name }}</h1><Badge :value="c.status" /></div>
        <p class="mt-1 font-mono text-sm text-muted">{{ c.account_number }}</p>
      </div>
      <button v-if="s.can('customers.write')" type="button" class="btn-ghost" @click="openEdit">Edit details</button>
    </div>
    <div class="grid gap-6 lg:grid-cols-3">
      <Card title="Details">
        <dl class="space-y-3 text-sm">
          <div class="flex justify-between gap-4"><dt class="text-muted">Category</dt><dd class="font-medium">{{ words(c.category) }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-muted">Site</dt><dd class="font-medium">{{ siteName }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-muted">Phone</dt><dd class="font-medium">{{ c.phone || '—' }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-muted">Email</dt><dd class="truncate font-medium">{{ c.email || '—' }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-muted">Address</dt><dd class="text-right font-medium">{{ c.address || '—' }}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-muted">Customer since</dt><dd class="font-medium">{{ date(c.created_at) }}</dd></div>
        </dl>
      </Card>
      <div class="lg:col-span-2">
        <Card title="Meters" flush>
          <EmptyState v-if="!meters.length" :icon="Gauge" title="No meters assigned" text="Assign a meter from the meter's page." />
          <table v-else class="table">
            <thead><tr><th>Meter</th><th>Model</th><th>Vending</th><th>Status</th><th>Connectivity</th></tr></thead>
            <tbody>
              <tr v-for="m in meters" :key="m.id">
                <td><RouterLink :to="`/app/meters/${m.id}`" class="font-mono font-semibold hover:underline">{{ m.meter_number }}</RouterLink></td>
                <td>{{ m.manufacturer }} {{ m.model }}</td>
                <td>{{ words(m.vending_mechanism) }}</td>
                <td><Badge :value="m.status" /></td>
                <td><Badge :value="m.connectivity" /></td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </div>
    <div class="mt-6">
      <Card title="Debts" sub="Recovered as a share of each purchase" flush>
        <template #actions>
          <button v-if="s.can('debts.write')" type="button" class="btn-ghost h-8" @click="(formError = ''), (debtOpen = true)"><Plus class="size-4" /> Record debt</button>
        </template>
        <EmptyState v-if="!debts.length" title="No debts" />
        <table v-else class="table">
          <thead><tr><th>Reason</th><th>Original</th><th>Outstanding</th><th>Recovery share</th><th>Status</th><th>Recorded</th></tr></thead>
          <tbody>
            <tr v-for="d in debts" :key="d.id">
              <td class="font-medium">{{ d.reason }}</td>
              <td>{{ naira(d.principal_kobo) }}</td>
              <td class="font-semibold">{{ naira(d.balance_kobo) }}</td>
              <td>{{ d.recovery_bps / 100 }}% of each purchase</td>
              <td><Badge :value="d.status" /></td>
              <td class="text-muted">{{ date(d.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  </template>

  <Modal v-if="editOpen" title="Edit customer" @close="editOpen = false">
    <form id="edit-cust" class="grid gap-4 sm:grid-cols-2" @submit.prevent="saveEdit">
      <Field label="Full name"><input v-model="ef.name" class="input" /></Field>
      <Field label="Phone"><input v-model="ef.phone" class="input" /></Field>
      <Field label="Email"><input v-model="ef.email" type="email" class="input" /></Field>
      <Field label="Category"><select v-model="ef.category" class="input"><option v-for="x in cats" :key="x" :value="x">{{ words(x) }}</option></select></Field>
      <Field label="Site"><select v-model="ef.mini_grid_id" class="input"><option value="">None</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select></Field>
      <Field label="Status"><select v-model="ef.status" class="input"><option value="active">Active</option><option value="suspended">Suspended</option><option value="closed">Closed</option></select></Field>
      <Field label="Address" span><input v-model="ef.address" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="editOpen = false">Cancel</button>
      <button type="submit" form="edit-cust" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Save</button>
    </template>
  </Modal>
  <Modal v-if="debtOpen" title="Record a debt" sub="Each purchase pays this share towards the debt until it is cleared." @close="debtOpen = false">
    <form id="debt-form" class="grid gap-4" @submit.prevent="addDebt">
      <Field label="Reason"><input v-model="df.reason" class="input" placeholder="e.g. Connection fee" /></Field>
      <Field label="Amount" hint="₦"><input v-model="df.amount" inputmode="decimal" class="input" /></Field>
      <Field label="Recovery share" hint="% of each purchase"><input v-model="df.share" inputmode="decimal" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="debtOpen = false">Cancel</button>
      <button type="submit" form="debt-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Record debt</button>
    </template>
  </Modal>
</template>
