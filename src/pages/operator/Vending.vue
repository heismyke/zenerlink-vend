<script setup lang="ts">
import { ref } from 'vue'
import { Info, Loader2, Search, Zap } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { Meter, Quote } from '@/lib/types'
import { dateTime, nairaToKobo, words } from '@/lib/format'
import PageHeader from '@/components/ui/PageHeader.vue'
import Card from '@/components/ui/Card.vue'
import Field from '@/components/ui/Field.vue'
import Badge from '@/components/ui/Badge.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import QuoteBreakdown from '@/components/QuoteBreakdown.vue'

const number = ref('')
const amount = ref('5000')
const meter = ref<Meter | null>(null)
const quote = ref<Quote | null>(null)
const error = ref('')
const busy = ref(false)

async function find() {
  error.value = ''
  meter.value = null
  quote.value = null
  if (!number.value.trim()) return
  busy.value = true
  try {
    const r = await get<{ meters: Meter[] }>(`/v1/operator/meters?q=${encodeURIComponent(number.value.trim())}&limit=5`)
    meter.value = r.meters.find((m) => m.meter_number === number.value.trim()) ?? r.meters[0] ?? null
    if (!meter.value) error.value = 'No meter with that number in your registry.'
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
async function getQuote() {
  error.value = ''
  const kobo = nairaToKobo(amount.value)
  if (!meter.value || !kobo) return (error.value = 'Find a meter and enter an amount.')
  busy.value = true
  try {
    quote.value = await post<Quote>('/v1/operator/quotes', { meter_id: meter.value.id, amount_kobo: kobo })
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Electricity vending" sub="Price a purchase for any meter on your network with the tariff in force." />
  <div class="mb-6 flex items-start gap-3 rounded-xl border border-gold/30 bg-gold-soft px-4 py-3 text-sm text-slate-700">
    <Info class="mt-0.5 size-4 shrink-0 text-gold" />
    <p>Quotes are real and stored for 15 minutes with the exact tariff version used. Taking payment and issuing tokens or remote credit arrives in phase 2; nothing here sells electricity yet.</p>
  </div>
  <div class="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
    <Card title="New quote">
      <form class="grid gap-4" @submit.prevent="find">
        <Field label="Meter number">
          <div class="flex gap-2">
            <input v-model="number" class="input font-mono" placeholder="e.g. 0420000001" />
            <button type="submit" class="btn-ghost shrink-0" :disabled="busy"><Search class="size-4" /> Find</button>
          </div>
        </Field>
      </form>
      <div v-if="meter" class="mt-4 rounded-xl bg-canvas p-4 text-sm">
        <div class="flex flex-wrap items-center gap-2"><span class="font-mono font-semibold">{{ meter.meter_number }}</span><Badge :value="meter.status" /></div>
        <p class="mt-1 text-muted"><span class="capitalize">{{ meter.manufacturer }}</span> {{ meter.model }} · {{ words(meter.vending_mechanism) }} · credit as {{ meter.credit_model === 'money' ? 'naira' : 'kWh' }}</p>
      </div>
      <form v-if="meter" class="mt-4 grid gap-4" @submit.prevent="getQuote">
        <Field label="Amount the customer pays" hint="₦"><input v-model="amount" inputmode="decimal" class="input" /></Field>
        <button type="submit" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /><Zap v-else class="size-4" /> Get quote</button>
      </form>
      <ErrorBox v-if="error" :text="error" class="mt-4" />
    </Card>
    <Card title="Quotation">
      <EmptyState v-if="!quote" title="No quote yet" text="The breakdown shows every deduction: fixed charge, fee, debt recovery and VAT." />
      <template v-else>
        <QuoteBreakdown :q="quote.breakdown" />
        <p class="mt-3 text-xs text-muted">Tariff version {{ quote.tariff_version }} · quote {{ quote.id.slice(0, 8) }} · valid until {{ dateTime(quote.expires_at) }}</p>
      </template>
    </Card>
  </div>
</template>
