<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ArrowRight, BellRing, CheckCheck, Gauge, RefreshCw, TrendingDown, TrendingUp, UserPlus, Wifi, WifiOff } from 'lucide-vue-next'
import { get, message } from '@/lib/api'
import type { OperatorDashboard } from '@/lib/types'
import { ago, dateTime, naira, num } from '@/lib/format'
import { useSession } from '@/stores/session'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import PeriodTabs from '@/components/ui/PeriodTabs.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Loading from '@/components/ui/Loading.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import EmptyState from '@/components/ui/EmptyState.vue'

const s = useSession()
const days = ref(30)
const d = ref<OperatorDashboard | null>(null)
const error = ref('')
const loading = ref(false)
const updated = ref<Date | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    d.value = await get<OperatorDashboard>(`/v1/operator/dashboard?days=${days.value}`)
    updated.value = new Date()
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}
watch(days, load, { immediate: true })

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
})
const firstName = computed(() => (s.user?.name || '').split(' ')[0] || '')
const onlinePct = computed(() => (d.value && d.value.meters_total ? Math.round((d.value.meters_online / d.value.meters_total) * 100) : 0))
const approvals = computed(() => (d.value ? d.value.tariff_versions_pending + d.value.control_requests_pending : 0))
const periodLabel = computed(() => ({ 1: 'today', 7: '7 days', 30: '30 days', 90: '90 days', 3650: 'all time' })[days.value] ?? '')
</script>

<template>
  <p class="mb-5 text-[15px] font-medium text-slate-600">{{ greeting }}<span v-if="firstName">, {{ firstName }}</span></p>
  <ErrorBox v-if="error" :text="error" class="mb-5" @retry="load" />
  <Loading v-if="!d && loading" :rows="6" />

  <template v-if="d">
    <!-- Hero -->
    <section class="relative overflow-hidden rounded-[22px] bg-ink px-6 py-7 text-white sm:px-10 sm:py-9">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="label-caps text-white/55!">Meters on your network</p>
          <p class="mt-6 text-5xl font-semibold tracking-tight sm:text-6xl">{{ num(d.meters_total) }}</p>
          <p class="mt-3 text-sm text-white/60">
            {{ num(d.meters_online) }} online · {{ num(d.meters_offline) }} offline · across {{ num(d.sites) }} {{ d.sites === 1 ? 'site' : 'sites' }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 sm:justify-end">
          <span class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">Onboarding <b class="ml-1 font-semibold text-white">{{ d.onboarding_status.replace(/_/g, ' ') }}</b></span>
          <span class="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs">Regulatory <b class="ml-1 font-semibold" :class="d.regulatory_status === 'verified' ? 'text-emerald-400' : 'text-amber-300'">{{ d.regulatory_status }}</b></span>
        </div>
      </div>
      <div class="mt-8 flex items-center gap-3 text-sm text-white/60">
        <span>Last update: {{ updated ? ago(updated.toISOString()) : '—' }}</span>
        <button type="button" class="grid size-9 place-items-center rounded-full border border-white/20 hover:bg-white/10" aria-label="Refresh" @click="load">
          <RefreshCw class="size-4" :class="loading ? 'animate-spin' : ''" />
        </button>
      </div>
      <div class="pointer-events-none absolute -bottom-24 -right-16 size-80 rounded-full bg-gold/10 blur-3xl" />
    </section>
    <p class="mt-3 text-sm text-slate-600">
      Open customer debt <b class="ml-1 font-semibold text-slate-900">{{ naira(d.open_debt_kobo) }}</b>
      <RouterLink to="/app/billing" class="ml-2 font-medium text-slate-900 underline underline-offset-4">View</RouterLink>
    </p>

    <!-- Quick actions -->
    <p class="mb-3 mt-8 label-caps">Quick actions</p>
    <div class="grid gap-3 md:grid-cols-3">
      <RouterLink v-if="s.can('meters.write')" to="/app/meters?new=1" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><Gauge class="size-5" /></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">Register meters</span><span class="block text-sm text-muted">One at a time or by CSV</span></span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
      </RouterLink>
      <RouterLink v-if="s.can('customers.write')" to="/app/customers?new=1" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><UserPlus class="size-5" /></span>
        <span class="min-w-0 flex-1"><span class="block font-semibold">Add a customer</span><span class="block text-sm text-muted">Account number, site and category</span></span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
      </RouterLink>
      <RouterLink to="/app/monitoring" class="card group flex items-center gap-4 p-5 transition hover:shadow-md">
        <span class="grid size-11 place-items-center rounded-xl border border-line"><CheckCheck class="size-5" /></span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">Approvals <span v-if="approvals" class="ml-1 rounded-full bg-gold px-2 py-0.5 text-xs text-white">{{ approvals }}</span></span>
          <span class="block text-sm text-muted">Tariffs and disconnections waiting</span>
        </span>
        <ArrowRight class="size-5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
      </RouterLink>
    </div>

    <!-- Health -->
    <div class="mt-8">
      <Card title="Network health" :sub="`Activity — ${periodLabel}`" flush>
        <template #actions><PeriodTabs v-model="days" /></template>
        <div class="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div class="p-5">
            <p class="flex items-center gap-2 label-caps"><span class="grid size-5 place-items-center rounded-full bg-ok-soft text-ok"><Wifi class="size-3" /></span>Online</p>
            <p class="mt-3 text-3xl font-semibold text-ok">{{ onlinePct }}%</p>
            <p class="mt-1 text-xs text-muted">{{ num(d.meters_online) }} of {{ num(d.meters_total) }} meters, from reported telemetry</p>
          </div>
          <div class="p-5">
            <p class="flex items-center gap-2 label-caps"><span class="grid size-5 place-items-center rounded-full bg-bad-soft text-bad"><WifiOff class="size-3" /></span>Offline</p>
            <p class="mt-3 text-3xl font-semibold text-bad">{{ num(d.meters_offline) }}</p>
            <p class="mt-1 text-xs text-muted">Meters whose last report said offline</p>
          </div>
          <div class="p-5">
            <p class="flex items-center gap-2 label-caps"><span class="grid size-5 place-items-center rounded-full bg-slate-100 text-slate-600"><TrendingUp class="size-3" /></span>Quotes</p>
            <p class="mt-3 text-3xl font-semibold">{{ num(d.quotes_in_period) }}</p>
            <p class="mt-1 text-xs text-muted">{{ naira(d.quoted_kobo_in_period) }} quoted in this period</p>
          </div>
        </div>
        <div class="border-t border-line bg-canvas/60 px-5 py-4 text-sm text-slate-600">
          <TrendingDown class="mr-1.5 inline size-4 text-slate-400" />
          Sales, collections and settlements appear here once operator purchases go live (phase 2). No figures are estimated.
        </div>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
      <div class="grid grid-cols-2 gap-4">
        <StatCard label="Sites" :value="num(d.sites)" :hint="`${num(d.sites_operational)} operational`" />
        <StatCard label="Customers" :value="num(d.customers)" hint="Open accounts" />
        <StatCard label="Tariff plans" :value="num(d.tariff_plans)" :hint="d.tariff_versions_pending ? `${d.tariff_versions_pending} awaiting approval` : 'None awaiting approval'" :tone="d.tariff_versions_pending ? 'warn' : 'plain'" />
        <StatCard label="Rights unverified" :value="num(d.meters_rights_unverified)" hint="Meters Zenerlink has not cleared for control" :tone="d.meters_rights_unverified ? 'warn' : 'plain'" />
      </div>
      <Card title="Recent meter alarms" flush>
        <template #actions><RouterLink to="/app/monitoring" class="text-xs font-semibold text-slate-600 hover:text-slate-900">All alarms</RouterLink></template>
        <EmptyState v-if="!d.recent_events.length" :icon="BellRing" title="No alarms" text="Alarms reported by your meters will appear here." />
        <ul v-else class="divide-y divide-line">
          <li v-for="(e, i) in d.recent_events" :key="i" class="flex items-center gap-3 px-5 py-3 text-sm">
            <Badge :value="e.code" tone="warn" :label="e.code" />
            <RouterLink :to="`/app/meters/${e.meter_id}`" class="min-w-0 flex-1 truncate"><span class="font-medium">{{ e.meter_number }}</span> <span class="text-muted">· {{ e.message || 'Alarm' }}</span></RouterLink>
            <span class="shrink-0 text-xs text-muted">{{ dateTime(e.reported_at) }}</span>
          </li>
        </ul>
      </Card>
    </div>

    <div class="mt-6">
      <Card title="Meter integrations" flush>
        <EmptyState v-if="!d.integrations.length" title="No manufacturer integration yet" text="Zenerlink connects your meter platform (e.g. Acrel) after your credentials are issued." />
        <table v-else class="table">
          <thead><tr><th>Manufacturer</th><th>Status</th><th>Last data</th><th>Last error</th></tr></thead>
          <tbody>
            <tr v-for="i in d.integrations" :key="i.id">
              <td class="font-medium capitalize">{{ i.manufacturer }}</td>
              <td><Badge :value="i.status" /></td>
              <td>{{ ago(i.last_ingest_at) }}</td>
              <td class="text-muted">{{ i.last_error || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  </template>
</template>
