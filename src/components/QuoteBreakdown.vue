<script setup lang="ts">
import type { QuoteBreakdown } from '@/lib/types'
import { kwh, naira } from '@/lib/format'
defineProps<{ q: QuoteBreakdown }>()
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-line">
    <div class="bg-ink px-5 py-5 text-white">
      <p class="label-caps text-white/55!">{{ q.credit_model === 'money' ? 'Naira credit sent to the meter' : 'Energy credited' }}</p>
      <p class="mt-2 text-3xl font-semibold">{{ q.credit_model === 'money' ? naira(q.credit_kobo) : kwh(q.energy_wh) }}</p>
      <p v-if="q.estimated_energy_wh" class="mt-1 text-sm text-white/60">About {{ kwh(q.estimated_energy_wh) }} at the current rate (estimate; the meter applies its own tariff)</p>
    </div>
    <dl class="divide-y divide-line text-sm">
      <div class="flex justify-between px-5 py-2.5"><dt class="text-muted">Customer pays</dt><dd class="font-semibold">{{ naira(q.amount_kobo) }}</dd></div>
      <div v-if="q.fixed_charge_kobo" class="flex justify-between px-5 py-2.5"><dt class="text-muted">Fixed charge</dt><dd>− {{ naira(q.fixed_charge_kobo) }}</dd></div>
      <div v-if="q.service_fee_kobo" class="flex justify-between px-5 py-2.5"><dt class="text-muted">Service fee</dt><dd>− {{ naira(q.service_fee_kobo) }}</dd></div>
      <div v-if="q.debt_recovery_kobo" class="flex justify-between px-5 py-2.5"><dt class="text-muted">Debt recovery</dt><dd>− {{ naira(q.debt_recovery_kobo) }}</dd></div>
      <div v-if="q.vat_kobo" class="flex justify-between px-5 py-2.5"><dt class="text-muted">VAT ({{ q.vat_bps / 100 }}%, included)</dt><dd>− {{ naira(q.vat_kobo) }}</dd></div>
      <div class="flex justify-between px-5 py-2.5"><dt class="font-medium">Energy value</dt><dd class="font-semibold">{{ naira(q.energy_value_kobo) }}</dd></div>
      <div v-for="(b, i) in q.blocks ?? []" :key="i" class="flex justify-between px-5 py-2 text-xs"><dt class="text-muted">Block {{ i + 1 }} at {{ naira(b.rate_kobo_per_kwh) }}/kWh</dt><dd>{{ kwh(b.energy_wh) }}</dd></div>
    </dl>
    <p v-if="q.note" class="border-t border-line bg-canvas px-5 py-3 text-xs text-slate-600">{{ q.note }}</p>
  </div>
</template>
