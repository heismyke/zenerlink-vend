<script setup lang="ts">
import logo from '@/assets/logo-icon-white.svg'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Loader2 } from 'lucide-vue-next'
import { useSession } from '@/stores/session'
import { message } from '@/lib/api'
import Field from '@/components/ui/Field.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const s = useSession()
const router = useRouter()
const route = useRoute()
const org = ref(localStorage.getItem('zv_org') ?? '')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  if (!org.value.trim() || !email.value.trim() || !password.value) return (error.value = 'Enter your organisation ID, email and password.')
  busy.value = true
  try {
    await s.signIn(org.value, email.value, password.value)
    try {
      localStorage.setItem('zv_org', org.value.trim().toLowerCase())
    } catch {
      /* not remembered */
    }
    router.replace((route.query.next as string) || '/')
  } catch (e) {
    error.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="grid min-h-full lg:grid-cols-[1.05fr_1fr]">
    <div class="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col">
      <div class="flex items-center gap-2.5">
        <img :src="logo" alt="" class="size-9 shrink-0" />
        <span class="text-lg font-bold">Zenerlink <span class="text-gold">Vends</span></span>
      </div>
      <div class="mt-auto max-w-md">
        <p class="label-caps text-gold!">Electricity vending infrastructure</p>
        <h1 class="mt-4 text-4xl font-semibold leading-tight">Run your mini-grid's metering, tariffs and revenue in one place.</h1>
        <p class="mt-4 text-white/60">Sites, customers, smart meters and approved tariffs for electricity operators, with every change audited.</p>
      </div>
      <div class="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-gold/10 blur-3xl" />
    </div>
    <div class="flex items-center justify-center px-5 py-12">
      <form class="w-full max-w-sm" @submit.prevent="submit">
        <h2 class="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p class="mt-1 text-sm text-muted">Operator staff and Zenerlink administrators.</p>
        <div class="mt-8 space-y-4">
          <Field label="Organisation ID" hint="e.g. pce">
            <input v-model="org" class="input" autocomplete="organization" autocapitalize="none" spellcheck="false" />
          </Field>
          <Field label="Email">
            <input v-model="email" type="email" class="input" autocomplete="username" />
          </Field>
          <Field label="Password">
            <input v-model="password" type="password" class="input" autocomplete="current-password" />
          </Field>
          <ErrorBox v-if="error" :text="error" />
          <button type="submit" class="btn-primary w-full" :disabled="busy">
            <Loader2 v-if="busy" class="size-4 animate-spin" /> Sign in
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
