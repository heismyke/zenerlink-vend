<script setup lang="ts">
import { computed, ref } from 'vue'
import { BellRing, Check, PowerOff, X } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { ControlRequest, OperatorDashboard } from '@/lib/types'
import { ago, dateTime, num } from '@/lib/format'
import { useSession } from '@/stores/session'
import { useToast } from '@/stores/toast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import StatCard from '@/components/ui/StatCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import Loading from '@/components/ui/Loading.vue'

const s = useSession()
const toast = useToast()
const d = ref<OperatorDashboard | null>(null)
const reqs = ref<ControlRequest[] | null>(null)
const error = ref('')
async function load() {
  error.value = ''
  try {
    const [dash, r] = await Promise.all([
      get<OperatorDashboard>('/v1/operator/dashboard?days=30'),
      s.can('meters.control') ? get<{ requests: ControlRequest[] }>('/v1/operator/control-requests') : Promise.resolve({ requests: [] }),
    ])
    d.value = dash
    reqs.value = r.requests
  } catch (e) {
    error.value = message(e)
  }
}
load()
const pending = computed(() => (reqs.value ?? []).filter((r) => r.status === 'pending'))
const done = computed(() => (reqs.value ?? []).filter((r) => r.status !== 'pending'))
const busy = ref('')
async function decide(r: ControlRequest, decision: 'approve' | 'reject') {
  busy.value = r.id
  try {
    const out = await post<ControlRequest>(`/v1/operator/control-requests/${r.id}/decision`, { decision })
    toast.ok(decision === 'reject' ? 'Request rejected' : out.status === 'accepted' ? 'Disconnection sent to the meter platform' : `Request ${out.status}`)
  } catch (e) {
    toast.bad(message(e))
  } finally {
    busy.value = ''
    load()
  }
}
</script>

<template>
  <PageHeader title="Meter monitoring" sub="Connectivity, alarms and remote-control approvals." />
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <Loading v-if="!d && !error" />
  <template v-if="d">
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Online" :value="num(d.meters_online)" tone="ok" />
      <StatCard label="Offline" :value="num(d.meters_offline)" :tone="d.meters_offline ? 'bad' : 'plain'" />
      <StatCard label="No report yet" :value="num(Math.max(0, d.meters_total - d.meters_online - d.meters_offline))" />
      <StatCard label="Awaiting approval" :value="num(pending.length)" :tone="pending.length ? 'warn' : 'plain'" />
    </div>

    <div v-if="s.can('meters.control')" class="mt-6">
      <Card title="Disconnections awaiting approval" sub="Approved by someone other than the requester; the checks run again before sending." flush>
        <EmptyState v-if="!pending.length" :icon="PowerOff" title="Nothing waiting" />
        <ul v-else class="divide-y divide-line">
          <li v-for="r in pending" :key="r.id" class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div class="min-w-0 flex-1">
              <RouterLink :to="`/app/meters/${r.meter_id}`" class="font-mono font-semibold hover:underline">{{ r.meter_number }}</RouterLink>
              <p class="text-sm text-muted">{{ r.reason }} · requested {{ ago(r.created_at) }}</p>
            </div>
            <div v-if="s.can('meters.approve')" class="flex gap-2">
              <button type="button" class="btn-ghost h-9" :disabled="!!busy" @click="decide(r, 'reject')"><X class="size-4" /> Reject</button>
              <button type="button" class="btn-danger h-9" :disabled="!!busy" @click="decide(r, 'approve')"><Check class="size-4" /> Approve and send</button>
            </div>
            <span v-else class="text-sm text-muted">Waiting for an owner or admin</span>
          </li>
        </ul>
      </Card>
    </div>

    <div class="mt-6 grid gap-6 lg:grid-cols-2">
      <Card title="Recent alarms" flush>
        <EmptyState v-if="!d.recent_events.length" :icon="BellRing" title="No alarms" text="Alarms reported by your meters appear here." />
        <ul v-else class="divide-y divide-line">
          <li v-for="(e, i) in d.recent_events" :key="i" class="flex items-center gap-3 px-5 py-3 text-sm">
            <Badge :value="e.code" :label="e.code" tone="warn" />
            <RouterLink :to="`/app/meters/${e.meter_id}`" class="min-w-0 flex-1 truncate"><span class="font-medium">{{ e.meter_number }}</span> <span class="text-muted">· {{ e.message }}</span></RouterLink>
            <span class="text-xs text-muted">{{ dateTime(e.reported_at) }}</span>
          </li>
        </ul>
      </Card>
      <Card v-if="s.can('meters.control')" title="Command history" flush>
        <EmptyState v-if="!done.length" title="No decided requests yet" />
        <table v-else class="table">
          <thead><tr><th>Meter</th><th>Outcome</th><th>Decided</th></tr></thead>
          <tbody>
            <tr v-for="r in done" :key="r.id">
              <td><RouterLink :to="`/app/meters/${r.meter_id}`" class="font-mono font-semibold hover:underline">{{ r.meter_number }}</RouterLink><p class="text-xs text-muted">{{ r.reason }}</p></td>
              <td><Badge :value="r.status" /><p v-if="r.result" class="mt-1 max-w-xs text-xs text-muted">{{ r.result }}</p></td>
              <td class="text-muted">{{ dateTime(r.decided_at) }}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  </template>
</template>
