<script setup lang="ts">
import { computed } from 'vue'
import { CircuitBoard } from 'lucide-vue-next'
import { get } from '@/lib/api'
import type { PlatformOverview } from '@/lib/types'
import { ago, dateTime } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const { data, loading, error, run } = useLoad(() => get<PlatformOverview>('/v1/platform/vends/overview'))
run()
const rows = computed(() => (data.value?.list ?? []).filter((p) => p.last_ingest_at || p.integration_error))
</script>

<template>
  <PageHeader title="Integrations" sub="Manufacturer data links per operator. Credentials are set on each operator's page." />
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !data" />
    <EmptyState v-else-if="!rows.length" :icon="CircuitBoard" title="No data received yet" text="Operators appear here once their manufacturer platform starts sending data." />
    <table v-else class="table">
      <thead><tr><th>Operator</th><th>Health</th><th>Last data</th><th>Error</th></tr></thead>
      <tbody>
        <tr v-for="p in rows" :key="p.tenant_id" class="cursor-pointer" @click="$router.push(`/admin/operators/${p.tenant_id}`)">
          <td class="font-semibold">{{ p.name }}</td>
          <td><Badge :value="p.integration_error ? 'failed' : 'active'" :label="p.integration_error ? 'Errors' : 'Receiving'" /></td>
          <td>{{ ago(p.last_ingest_at) }} <span class="text-xs text-muted">{{ dateTime(p.last_ingest_at) }}</span></td>
          <td class="text-sm text-bad">{{ p.integration_error || '' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
