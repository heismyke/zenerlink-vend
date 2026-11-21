<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, Loader2, Plus, Search, Users } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { Customer, Site } from '@/lib/types'
import { date, downloadCSV, naira, num, words } from '@/lib/format'
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
const siteId = ref((route.query.site_id as string) ?? '')
const offset = ref(0)
const rows = ref<Customer[] | null>(null)
const total = ref(0)
const loading = ref(false)
const error = ref('')
const sites = ref<Site[]>([])
get<{ sites: Site[] }>('/v1/operator/sites').then((r) => (sites.value = r.sites)).catch(() => undefined)
const siteName = (id?: string) => sites.value.find((g) => g.id === id)?.name ?? '—'

async function load() {
  loading.value = true
  error.value = ''
  try {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(offset.value) })
    if (q.value.trim()) p.set('q', q.value.trim())
    if (siteId.value) p.set('site_id', siteId.value)
    const r = await get<{ customers: Customer[]; total: number }>(`/v1/operator/customers?${p}`)
    rows.value = r.customers
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
watch([siteId, offset], load, { immediate: true })

const cats = ['residential', 'commercial', 'industrial', 'public', 'productive_use', 'other']
const open = ref(route.query.new === '1')
const busy = ref(false)
const formError = ref('')
const f = reactive({ account_number: '', name: '', phone: '', email: '', category: 'residential', mini_grid_id: '', address: '' })
async function create() {
  formError.value = ''
  if (!f.account_number.trim() || !f.name.trim()) return (formError.value = 'Account number and name are required.')
  busy.value = true
  try {
    const c = await post<Customer>('/v1/operator/customers', { ...f, account_number: f.account_number.trim(), name: f.name.trim(), mini_grid_id: f.mini_grid_id || undefined })
    toast.ok(`Customer ${c.account_number} added`)
    open.value = false
    router.push(`/app/customers/${c.id}`)
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
function exportCSV() {
  if (!rows.value) return
  downloadCSV('customers.csv', [
    ['account_number', 'name', 'phone', 'email', 'category', 'site', 'status', 'meters', 'open_debt_naira'],
    ...rows.value.map((c) => [c.account_number, c.name, c.phone, c.email, c.category, siteName(c.mini_grid_id), c.status, c.meter_count, c.debt_kobo / 100]),
  ])
}
</script>

<template>
  <PageHeader title="Customers" :sub="`${num(total)} accounts`">
    <button type="button" class="btn-ghost" :disabled="!rows?.length" @click="exportCSV"><Download class="size-4" /> Export page</button>
    <button v-if="s.can('customers.write')" type="button" class="btn-primary" @click="open = true"><Plus class="size-4" /> Add customer</button>
  </PageHeader>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row">
    <label class="relative flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input v-model="q" class="input pl-9" placeholder="Search name, phone, account or meter number" aria-label="Search customers" />
    </label>
    <select v-model="siteId" class="input sm:w-56" aria-label="Filter by site"><option value="">All sites</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select>
  </div>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !rows" />
    <EmptyState v-else-if="rows && !rows.length" :icon="Users" :title="q || siteId ? 'No matching customers' : 'No customers yet'" :text="q || siteId ? 'Try another search.' : 'Add customers, then assign meters to them.'" />
    <div v-else-if="rows" class="overflow-x-auto">
      <table class="table min-w-[820px]">
        <thead><tr><th>Account</th><th>Customer</th><th>Category</th><th>Site</th><th>Meters</th><th>Open debt</th><th>Status</th><th>Since</th></tr></thead>
        <tbody>
          <tr v-for="c in rows" :key="c.id" class="cursor-pointer" @click="router.push(`/app/customers/${c.id}`)">
            <td class="font-mono text-xs font-semibold">{{ c.account_number }}</td>
            <td><p class="font-semibold">{{ c.name }}</p><p class="text-xs text-muted">{{ c.phone || c.email || '—' }}</p></td>
            <td>{{ words(c.category) }}</td>
            <td>{{ siteName(c.mini_grid_id) }}</td>
            <td>{{ num(c.meter_count) }}</td>
            <td :class="c.debt_kobo ? 'font-semibold text-warn' : 'text-muted'">{{ c.debt_kobo ? naira(c.debt_kobo) : '—' }}</td>
            <td><Badge :value="c.status" /></td>
            <td class="text-muted">{{ date(c.created_at) }}</td>
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

  <Modal v-if="open" title="Add a customer" @close="open = false">
    <form id="cust-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="create">
      <Field label="Account number" hint="Your own reference"><input v-model="f.account_number" class="input" /></Field>
      <Field label="Full name"><input v-model="f.name" class="input" autocomplete="off" /></Field>
      <Field label="Phone"><input v-model="f.phone" inputmode="tel" class="input" /></Field>
      <Field label="Email"><input v-model="f.email" type="email" class="input" /></Field>
      <Field label="Category"><select v-model="f.category" class="input"><option v-for="c in cats" :key="c" :value="c">{{ words(c) }}</option></select></Field>
      <Field label="Site"><select v-model="f.mini_grid_id" class="input"><option value="">None yet</option><option v-for="g in sites" :key="g.id" :value="g.id">{{ g.name }}</option></select></Field>
      <Field label="Address" span><input v-model="f.address" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="cust-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Add customer</button>
    </template>
  </Modal>
</template>
