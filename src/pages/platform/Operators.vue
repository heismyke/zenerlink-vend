<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Building2, Loader2, Plus, Search } from 'lucide-vue-next'
import { get, message, post } from '@/lib/api'
import type { PlatformOverview } from '@/lib/types'
import { date, num, words } from '@/lib/format'
import { useLoad } from '@/lib/useLoad'
import { useToast } from '@/stores/toast'
import PageHeader from '@/components/ui/PageHeader.vue'
import Badge from '@/components/ui/Badge.vue'
import Modal from '@/components/ui/Modal.vue'
import Field from '@/components/ui/Field.vue'
import Loading from '@/components/ui/Loading.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ErrorBox from '@/components/ui/ErrorBox.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { data, loading, error, run } = useLoad(() => get<PlatformOverview>('/v1/platform/vends/overview'))
run()
const q = ref('')
const stage = ref((route.query.status as string) ?? '')
const list = computed(() =>
  (data.value?.list ?? []).filter((p) => (!stage.value || p.onboarding_status === stage.value || (stage.value === 'documents_submitted' && p.onboarding_status === 'under_review'))
    && (!q.value || `${p.name} ${p.slug} ${p.legal_name}`.toLowerCase().includes(q.value.toLowerCase()))),
)

const open = ref(route.query.new === '1')
const busy = ref(false)
const formError = ref('')
const f = reactive({ slug: '', name: '', admin_name: '', admin_email: '', password: '', support_email: '' })
async function create() {
  formError.value = ''
  if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(f.slug)) return (formError.value = 'The organisation ID must be 2-41 lowercase letters, digits or hyphens.')
  if (!f.name.trim() || !f.admin_email.trim() || f.password.length < 10) return (formError.value = 'Name, owner email and a temporary password of 10+ characters are required.')
  busy.value = true
  try {
    const t = await post<{ id: string }>('/v1/platform/tenants', {
      slug: f.slug, name: f.name.trim(), branding: { display_name: f.name.trim(), support_email: f.support_email || undefined },
      admin: { email: f.admin_email.trim().toLowerCase(), name: f.admin_name.trim(), password: f.password },
    })
    toast.ok(`${f.name} created as a draft. The owner signs in with organisation ID "${f.slug}".`)
    router.push(`/admin/operators/${t.id}`)
  } catch (e) {
    formError.value = message(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="Operators" sub="Electricity operators using Zenerlink Vends.">
    <button type="button" class="btn-primary" @click="open = true"><Plus class="size-4" /> Onboard operator</button>
  </PageHeader>
  <div class="mb-4 flex flex-col gap-3 sm:flex-row">
    <label class="relative flex-1"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input v-model="q" class="input pl-9" placeholder="Search operators" aria-label="Search operators" /></label>
    <select v-model="stage" class="input sm:w-52" aria-label="Filter by stage"><option value="">All stages</option><option v-for="x in ['draft', 'documents_submitted', 'under_review', 'approved', 'active', 'suspended']" :key="x" :value="x">{{ words(x) }}</option></select>
  </div>
  <ErrorBox v-if="error" :text="error" class="mb-4" @retry="run" />
  <div class="card overflow-hidden">
    <Loading v-if="loading && !data" />
    <EmptyState v-else-if="!list.length" :icon="Building2" title="No operators match" />
    <div v-else class="overflow-x-auto">
      <table class="table min-w-[760px]">
        <thead><tr><th>Operator</th><th>Legal name</th><th>Onboarding</th><th>Trading</th><th>Meters</th><th>Joined</th></tr></thead>
        <tbody>
          <tr v-for="p in list" :key="p.tenant_id" class="cursor-pointer" @click="router.push(`/admin/operators/${p.tenant_id}`)">
            <td><p class="font-semibold">{{ p.name }}</p><p class="font-mono text-xs text-muted">{{ p.slug }}</p></td>
            <td>{{ p.legal_name || '—' }}</td>
            <td><Badge :value="p.onboarding_status" /></td>
            <td><Badge :value="p.status" /> <Badge :value="p.vending_mode" /></td>
            <td>{{ num(p.meters) }}</td>
            <td class="text-muted">{{ date(p.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <Modal v-if="open" title="Onboard an operator" sub="Creates the account as a draft with an owner login. The owner completes the details and submits them for review." @close="open = false">
    <form id="op-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="create">
      <Field label="Organisation ID" hint="Used to sign in"><input v-model="f.slug" class="input font-mono" placeholder="pce" autocapitalize="none" /></Field>
      <Field label="Company name"><input v-model="f.name" class="input" placeholder="Phoenix Creed Energies" /></Field>
      <Field label="Owner's name"><input v-model="f.admin_name" class="input" /></Field>
      <Field label="Owner's email"><input v-model="f.admin_email" type="email" class="input" /></Field>
      <Field label="Temporary password" hint="10+ characters"><input v-model="f.password" class="input font-mono" autocomplete="off" /></Field>
      <Field label="Support email" hint="Shown to customers"><input v-model="f.support_email" type="email" class="input" /></Field>
      <ErrorBox v-if="formError" :text="formError" class="sm:col-span-2" />
    </form>
    <template #footer>
      <button type="button" class="btn-ghost" @click="open = false">Cancel</button>
      <button type="submit" form="op-form" class="btn-primary" :disabled="busy"><Loader2 v-if="busy" class="size-4 animate-spin" /> Create operator</button>
    </template>
  </Modal>
</template>
