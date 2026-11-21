<script setup lang="ts">
import { PlugZap } from 'lucide-vue-next'
import { get } from '@/lib/api'
import type { Integration } from '@/lib/types'
import { ago, dateTime } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const { data, loading, error, run } = useLoad(() => get<{ integrations: Integration[] }>('/v1/operator/integrations').then((r) => r.integrations))
run()
</script>

<template>
  <PageHeader title="API integrations" sub="Connections to your meter manufacturers' platforms." />
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <Loading v-if="loading && !data" />
  <div v-else-if="data" class="space-y-6">
    <div v-if="!data.length" class="card"><EmptyState :icon="PlugZap" title="No integrations yet" text="Send Zenerlink the credentials your manufacturer issued (for Acrel: platform address, login and AES key). Zenerlink enters them; they are stored encrypted and never shown again." /></div>
    <Card v-for="i in data" :key="i.id" :title="i.manufacturer" :sub="i.base_url">
      <template #actions><Badge :value="i.status" /></template>
      <dl class="grid gap-4 text-sm sm:grid-cols-3">
        <div><dt class="label-caps">Last data received</dt><dd class="mt-1 font-semibold">{{ ago(i.last_ingest_at) }}</dd><dd class="text-xs text-muted">{{ dateTime(i.last_ingest_at) }}</dd></div>
        <div><dt class="label-caps">Time zone</dt><dd class="mt-1 font-semibold">{{ i.timezone }}</dd></div>
        <div><dt class="label-caps">Last error</dt><dd class="mt-1" :class="i.last_error ? 'text-bad' : 'text-muted'">{{ i.last_error || 'None' }}</dd></div>
      </dl>
      <p class="mt-4 text-xs text-muted">Credentials and the data link are managed by Zenerlink and are never displayed. Remote recharge stays off until the manufacturer provides a verified recharge specification.</p>
    </Card>
    <Card title="Partner API">
      <p class="text-sm text-muted">API keys and webhooks for your own apps are on the roadmap for phase 4 (scopes, signed webhooks, usage logs, key rotation).</p>
    </Card>
  </div>
</template>
