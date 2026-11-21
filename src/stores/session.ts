import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as apiLib from '@/lib/api'
import type { Tenant } from '@/lib/types'

type Me = { user: apiLib.User; tenant: Tenant; permissions: string[] }

// The signed-in person. Operator staff carry a staff role and permissions
// (from /v1/operator/me); Zenerlink admins are platform_admin users. The
// menu hides what a role cannot do, and the server refuses it regardless.
export const useSession = defineStore('session', () => {
  const user = ref<apiLib.User | null>(null)
  const tenant = ref<Tenant | null>(null)
  const permissions = ref<string[]>([])
  const ready = ref(false)

  const isPlatform = computed(() => user.value?.role === 'platform_admin')
  const can = (p: string) => isPlatform.value || permissions.value.includes(p)

  async function load() {
    const me = await apiLib.get<{ user: apiLib.User; tenant: string }>('/v1/me')
    user.value = me.user
    if (me.user.role === 'platform_admin') {
      tenant.value = { id: me.user.tenant_id, slug: me.tenant, name: 'Zenerlink', status: 'active', vending_mode: 'live', is_platform: true }
      permissions.value = []
      return
    }
    if (me.user.role !== 'tenant_admin' && me.user.role !== 'tenant_staff') {
      await apiLib.logout()
      user.value = null
      throw new apiLib.ApiError(403, 'forbidden', 'This console is for operator staff. Customers sign in on the buy app.')
    }
    const op = await apiLib.get<Me>('/v1/operator/me')
    tenant.value = op.tenant
    permissions.value = op.permissions
  }

  async function restore() {
    try {
      if (await apiLib.resume()) await load()
    } catch {
      user.value = null
    } finally {
      ready.value = true
    }
  }

  async function signIn(org: string, email: string, password: string) {
    await apiLib.login(org.trim().toLowerCase(), email.trim().toLowerCase(), password)
    await load()
  }

  async function signOut() {
    await apiLib.logout()
    user.value = null
    tenant.value = null
    permissions.value = []
  }

  apiLib.setExpiredHandler(() => {
    user.value = null
  })

  return { user, tenant, permissions, ready, isPlatform, can, restore, signIn, signOut }
})
