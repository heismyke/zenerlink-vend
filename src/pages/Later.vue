<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Hourglass } from 'lucide-vue-next'
import PageHeader from '@/components/ui/PageHeader.vue'

// Sections whose backend is not built yet. Each says what it will hold and
// what it is waiting for, rather than showing made-up figures.
const plans: Record<string, { phase: string; holds: string[]; waits: string }> = {
  Payments: { phase: 'Phase 2', holds: ['Customer payments by card, transfer and USSD', 'Payment status and provider verification', 'Under- and overpayments'], waits: 'Operator purchases, and PCE as merchant of record (Paystack subaccount or PCE’s own keys).' },
  'Financial Operations': { phase: 'Phase 2', holds: ['Double-entry ledger per operator', 'Settlements and payout references', 'Refunds and reversals', 'Reconciliation cases'], waits: 'Operator purchases and the agreed settlement model.' },
  Reports: { phase: 'Phase 2', holds: ['Sales by period and by mini-grid', 'kWh credited, debt recovered, fees', 'CSV and PDF exports'], waits: 'Operator purchases.' },
  Support: { phase: 'Phase 4', holds: ['Tickets and disputes', 'Failed recharge investigation', 'Token retrieval with permission'], waits: 'Operator purchases; the DisCo support desk already exists in the ops dashboard.' },
  'White-Label Settings': { phase: 'Phase 4', holds: ['Logo, colours and support details', 'Receipts and payment pages', 'Custom domain and email sender'], waits: 'Nothing external; scheduled with the customer portal.' },
  Subscriptions: { phase: 'Phase 4', holds: ['Plans: monthly fee, meters included, overage, per-vend fee', 'Operator invoices, kept apart from customer payments'], waits: 'Zieon’s commercial price list.' },
  'Platform Revenue': { phase: 'Phase 4', holds: ['Subscription revenue', 'Transaction-fee revenue', 'Operator settlement summaries'], waits: 'Operator purchases and subscriptions.' },
  Transactions: { phase: 'Phase 2', holds: ['Every operator purchase with payment, vending and settlement states', 'Drill-down and exports'], waits: 'Operator purchases.' },
  Monitoring: { phase: 'Phase 4', holds: ['API and worker health', 'Integration latency and error rates', 'Alerts'], waits: 'Metrics endpoint on the API.' },
  Settings: { phase: 'Phase 4', holds: ['Platform services and integration availability', 'MFA policy for privileged accounts'], waits: 'Nothing external.' },
}
const route = useRoute()
const title = computed(() => (route.meta.title as string) ?? '')
const plan = computed(() => plans[title.value])
</script>

<template>
  <PageHeader :title="title" />
  <div class="card mx-auto max-w-2xl px-8 py-12 text-center">
    <span class="mx-auto grid size-12 place-items-center rounded-xl bg-gold-soft text-gold"><Hourglass class="size-5" /></span>
    <p class="mt-5 label-caps">{{ plan?.phase ?? 'Planned' }}</p>
    <h2 class="mt-2 text-lg font-semibold">{{ title }} is not built yet</h2>
    <p class="mt-2 text-sm text-muted">Nothing here is simulated. This section opens when its backend is ready.</p>
    <ul v-if="plan" class="mx-auto mt-6 max-w-sm space-y-2 text-left text-sm">
      <li v-for="h in plan.holds" :key="h" class="flex gap-2"><span class="mt-2 size-1.5 shrink-0 rounded-full bg-gold" /> {{ h }}</li>
    </ul>
    <p v-if="plan" class="mx-auto mt-6 max-w-md rounded-lg bg-canvas px-4 py-3 text-sm text-slate-600"><span class="font-semibold">Waiting for:</span> {{ plan.waits }}</p>
  </div>
</template>
