<script setup lang="ts">
import { computed } from 'vue'
import { Wallet } from 'lucide-vue-next'
import { get } from '@/lib/api'
import type { Customer } from '@/lib/types'
import { naira, num } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
import PageHeader from '@/components/ui/PageHeader.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

// Debts are recorded per customer and recovered as a share of each purchase.
// Recovery is posted to the ledger when operator purchases go live (phase 2).
const { data, loading, error, run } = useLoad(() => get<{ customers: Customer[]; total: number }>('/v1/operator/customers?limit=200'))
run()
const owing = computed(() => (data.value?.customers ?? []).filter((c) => c.debt_kobo > 0).sort((a, b) => b.debt_kobo - a.debt_kobo))
const totalDebt = computed(() => owing.value.reduce((n, c) => n + c.debt_kobo, 0))
</script>

<template>
  <PageHeader title="Billing & debt" sub="Outstanding customer debts, recovered automatically from each purchase." />
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="mb-6 grid gap-4 sm:grid-cols-3">
    <StatCard label="Open debt" :value="naira(totalDebt)" :tone="totalDebt ? 'warn' : 'plain'" />
    <StatCard label="Customers owing" :value="num(owing.length)" />
    <StatCard label="Debt recovered" value="—" hint="Starts when operator purchases go live (phase 2)" />
  </div>
  <div class="card overflow-hidden">
    <Loading v-if="loading && !data" />
    <EmptyState v-else-if="!owing.length" :icon="Wallet" title="No open debts" text="Record a debt from a customer's page; each purchase then pays its share." />
    <table v-else class="table">
      <thead><tr><th>Account</th><th>Customer</th><th>Outstanding</th></tr></thead>
      <tbody>
        <tr v-for="c in owing" :key="c.id">
          <td class="font-mono text-xs font-semibold">{{ c.account_number }}</td>
          <td><RouterLink :to="`/app/customers/${c.id}`" class="font-semibold hover:underline">{{ c.name }}</RouterLink></td>
          <td class="font-semibold text-warn">{{ naira(c.debt_kobo) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="data && data.total > 200" class="border-t border-line px-5 py-3 text-xs text-muted">Showing debts among your newest 200 customers.</p>
  </div>
</template>
