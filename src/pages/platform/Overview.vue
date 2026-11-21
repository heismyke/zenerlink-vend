<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowRight, Building2, ClipboardCheck, Download, RefreshCw, ShieldAlert, TrendingDown, Wifi, WifiOff } from 'lucide-vue-next'
import { get, message } from '@/lib/api'
import type { PlatformOverview } from '@/lib/types'
import { ago, downloadCSV, num, words } from '@/lib/format'
import { useSession } from '@/stores/session'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Loading from '@/components/ui/Loading.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const s = useSession()
const o = ref<PlatformOverview | null>(null)
const error = ref('')
const loading = ref(false)
const updated = ref<string>('')
const filter = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    o.value = await get<PlatformOverview>('/v1/platform/vends/overview')
    updated.value = new Date().toISOString()
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}
load()
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})
const firstName = computed(() => (s.user?.name || '').split(' ')[0] || '')
const list = computed(() => (o.value?.list ?? []).filter((p) => !filter.value || p.onboarding_status === filter.value))
function exportCSV() {
  downloadCSV('operators.csv', [
    ['slug', 'name', 'legal_name', 'onboarding', 'mode', 'sites', 'customers', 'meters', 'online', 'permits_verified', 'permits_pending', 'last_ingest'],
    ...list.value.map((p) => [p.slug, p.name, p.legal_name, p.onboarding_status, p.vending_mode, p.sites, p.customers, p.meters, p.meters_online, p.permits_verified, p.permits_pending, p.last_ingest_at ?? '']),
  ])
}
</script>

<template>
  <p class="mb-5 text-[15px] font-medium text-slate-600">{{ greeting }}<span v-if="firstName">, {{ firstName }}</span></p>
  <ErrorBox v-if="error" :text="error" class="mb-5" @retry="load" />
  <Loading v-if="!o && loading" :rows="6" />
  <template v-if="o">
    <section class="relative overflow-hidden rounded-[22px] bg-ink px-6 py-7 text-white sm:px-10 sm:py-9">
      <p class="label-caps text-white/55!">Operators on Zenerlink Vends</p>
      <p class="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">{{ num(o.operators) }}</p>
      <p class="mt-3 text-sm text-white/60">{{ num(o.operators_active) }} active · {{ num(o.operators_in_review) }} in review · {{ num(o.sites) }} mini-grids · {{ num(o.customers) }} customers</p>
      <div class="mt-8 flex items-center gap-3 text-sm text-white/60">
        <span>Last update: {{ ago(updated) }}</span>
        <button type="button" class="grid size-9 place-items-center rounded-full border border-white/20 hover:bg-white/10" aria-label="Refresh" @click="load"><RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" /></button>
      </div>
      <div class="pointer-events-none absolute -bottom-24 -right-16 size-80 rounded-full bg-gold/10 blur-3xl" />
    </section>

    <p class="mb-3 mt-8 label-caps">Quick actions</p>
    <div class="grid gap-3 md:grid-cols-3">
      <RouterLink to="/admin/operators?new=1" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><Building2 class="size-5" /></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">Onboard an operator</span><span class="block text-sm text-muted">Create the account and owner login</span></span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5" />
      </RouterLink>
      <RouterLink to="/admin/operators?status=documents_submitted" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><ClipboardCheck class="size-5" /></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">Review queue <span v-if="o.operators_in_review" class="ml-1 rounded-full bg-gold px-2 py-0.5 text-xs text-white">{{ o.operators_in_review }}</span></span><span class="block text-sm text-muted">Submitted and under review</span></span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5" />
      </RouterLink>
      <RouterLink to="/admin/integrations" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><ShieldAlert class="size-5" /></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">Integration health <span v-if="o.integration_errors" class="ml-1 rounded-full bg-bad px-2 py-0.5 text-xs text-white">{{ o.integration_errors }}</span></span><span class="block text-sm text-muted">Manufacturer data links</span></span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5" />
      </RouterLink>
    </div>

    <div class="mt-8">
      <Card title="Network across operators" sub="Live counts from every operator's registry" flush>
        <div class="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div class="p-5"><p class="flex items-center gap-2 label-caps"><span class="grid size-5 place-items-center rounded-full bg-ok-soft text-ok"><Wifi class="size-3" /></span>Meters online</p><p class="mt-3 text-3xl font-semibold text-ok">{{ num(o.meters_online) }}</p><p class="mt-1 text-xs text-muted">of {{ num(o.meters) }} registered</p></div>
          <div class="p-5"><p class="flex items-center gap-2 label-caps"><span class="grid size-5 place-items-center rounded-full bg-bad-soft text-bad"><WifiOff class="size-3" /></span>Meters offline</p><p class="mt-3 text-3xl font-semibold text-bad">{{ num(o.meters_offline) }}</p><p class="mt-1 text-xs text-muted">Last report said offline</p></div>
          <div class="p-5"><p class="label-caps">Awaiting Zenerlink</p><p class="mt-3 text-3xl font-semibold text-warn">{{ num(o.permits_pending + o.meters_rights_unverified) }}</p><p class="mt-1 text-xs text-muted">{{ num(o.permits_pending) }} {{ o.permits_pending === 1 ? 'permit' : 'permits' }} · operating rights for {{ num(o.meters_rights_unverified) }} {{ o.meters_rights_unverified === 1 ? 'meter' : 'meters' }}</p></div>
        </div>
        <div class="border-t border-line bg-canvas/60 px-5 py-4 text-sm text-slate-600">
          <TrendingDown class="mr-1.5 inline size-4 text-slate-400" />
          Sales volume, payment and vending success rates, subscription and fee revenue appear once operator purchases and subscriptions go live. Nothing is estimated.
        </div>
      </Card>
    </div>

    <div class="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Mini-grids" :value="num(o.sites)" />
      <StatCard label="Customers" :value="num(o.customers)" />
      <StatCard label="Permits to verify" :value="num(o.permits_pending)" :tone="o.permits_pending ? 'warn' : 'plain'" />
      <StatCard label="Integration errors" :value="num(o.integration_errors)" :tone="o.integration_errors ? 'bad' : 'plain'" />
    </div>

    <div class="mt-6">
      <Card title="Operators" flush>
        <template #actions>
          <select v-model="filter" class="input h-8 w-44 text-xs" aria-label="Filter operators">
            <option value="">All stages</option>
            <option v-for="x in ['draft', 'documents_submitted', 'under_review', 'approved', 'active', 'suspended']" :key="x" :value="x">{{ words(x) }}</option>
          </select>
          <button type="button" class="btn-ghost h-8" :disabled="!list.length" @click="exportCSV"><Download class="size-4" /> CSV</button>
        </template>
        <EmptyState v-if="!list.length" :icon="Building2" title="No operators" />
        <div v-else class="overflow-x-auto">
          <table class="table min-w-[860px]">
            <thead><tr><th>Operator</th><th>Onboarding</th><th>Mode</th><th>Sites</th><th>Customers</th><th>Meters</th><th>Permits</th><th>Last data</th></tr></thead>
            <tbody>
              <tr v-for="p in list" :key="p.tenant_id" class="cursor-pointer" @click="$router.push(`/admin/operators/${p.tenant_id}`)">
                <td><p class="font-semibold">{{ p.name }}</p><p class="font-mono text-xs text-muted">{{ p.slug }}</p></td>
                <td><Badge :value="p.onboarding_status" /></td>
                <td><Badge :value="p.vending_mode" /></td>
                <td>{{ num(p.sites) }}</td><td>{{ num(p.customers) }}</td>
                <td>{{ num(p.meters) }} <span class="text-xs text-muted">({{ num(p.meters_online) }} online)</span></td>
                <td><span class="text-ok">{{ p.permits_verified }} verified</span><span v-if="p.permits_pending" class="text-warn"> · {{ p.permits_pending }} pending</span></td>
                <td :class="p.integration_error ? 'text-bad' : 'text-muted'">{{ p.integration_error ? 'Error' : ago(p.last_ingest_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </template>
</template>
