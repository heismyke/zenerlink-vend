<script setup lang="ts">
import { ref, watch } from 'vue'
import { Download, FileClock } from 'lucide-vue-next'
import { get, message } from '@/lib/api'
import type { AuditLog, PlatformOverview } from '@/lib/types'
import { dateTime, downloadCSV } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const tenant = ref('')
const ops = ref<PlatformOverview['list']>([])
get<PlatformOverview>('/v1/platform/vends/overview').then((o) => (ops.value = o.list)).catch(() => undefined)
const rows = ref<AuditLog[] | null>(null)
const error = ref('')
const loading = ref(false)
const q = ref('')
async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await get<{ audit_logs: AuditLog[] }>(`/v1/platform/audit-logs?limit=500${tenant.value ? `&tenant_id=${tenant.value}` : ''}`)).audit_logs
  } catch (e) {
    error.value = message(e)
  } finally {
    loading.value = false
  }
}
watch(tenant, load, { immediate: true })
const name = (id?: string) => ops.value.find((o) => o.tenant_id === id)?.name ?? (id ? id.slice(0, 8) : 'Platform')
const shown = () => (rows.value ?? []).filter((r) => !q.value || `${r.action} ${r.target_type} ${r.actor_type}`.includes(q.value.toLowerCase()))
</script>

<template>
  <PageHeader title="Audit logs" sub="Every change, approval, refusal and cross-operator read.">
    <button type="button" class="btn-ghost" :disabled="!rows?.length" @click="downloadCSV('audit.csv', [['time', 'operator', 'actor', 'action', 'target', 'target_id', 'ip', 'metadata'], ...shown().map((r) => [r.created_at, name(r.tenant_id), r.actor_type, r.action, r.target_type, r.target_id, r.ip, JSON.stringify(r.metadata)])])"><Download class="size-4" /> Export</button>
  </PageHeader>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row">
    <input v-model="q" class="input flex-1" placeholder="Filter by action, e.g. tariff or access.denied" aria-label="Filter" />
    <select v-model="tenant" class="input sm:w-60" aria-label="Operator"><option value="">All operators</option><option v-for="o in ops" :key="o.tenant_id" :value="o.tenant_id">{{ o.name }}</option></select>
  </div>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="load" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !rows" />
    <EmptyState v-else-if="rows && !shown().length" :icon="FileClock" title="No entries" />
    <div v-else-if="rows" class="overflow-x-auto">
      <table class="table min-w-[860px]">
        <thead><tr><th>Time</th><th>Operator</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
        <tbody>
          <tr v-for="r in shown()" :key="r.id">
            <td class="whitespace-nowrap text-muted">{{ dateTime(r.created_at) }}</td>
            <td>{{ name(r.tenant_id) }}</td>
            <td class="text-xs">{{ r.actor_type }}</td>
            <td class="font-mono text-xs font-semibold" :class="r.action.includes('denied') ? 'text-bad' : ''">{{ r.action }}</td>
            <td class="text-xs">{{ r.target_type }}</td>
            <td class="max-w-[320px] truncate font-mono text-[11px] text-muted" :title="JSON.stringify(r.metadata)">{{ JSON.stringify(r.metadata) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
