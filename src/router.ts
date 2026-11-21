import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useSession } from '@/stores/session'

const op = (path: string, title: string, load: () => Promise<unknown>, perm?: string): RouteRecordRaw => ({
  path,
  component: load as never,
  meta: { title, perm },
})

const routes: RouteRecordRaw[] = [
  { path: '/login', component: () => import('@/pages/Login.vue'), meta: { public: true, title: 'Sign in' } },
  { path: '/', redirect: () => (useSession().isPlatform ? '/admin' : '/app') },
  {
    path: '/app',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { area: 'operator' },
    children: [
      op('', 'Dashboard', () => import('@/pages/operator/Dashboard.vue')),
      op('sites', 'Mini-Grids', () => import('@/pages/operator/Sites.vue'), 'operator.read'),
      op('customers', 'Customers', () => import('@/pages/operator/Customers.vue'), 'customers.read'),
      op('customers/:id', 'Customer', () => import('@/pages/operator/CustomerDetail.vue'), 'customers.read'),
      op('meters', 'Meters', () => import('@/pages/operator/Meters.vue'), 'meters.read'),
      op('meters/:id', 'Meter', () => import('@/pages/operator/MeterDetail.vue'), 'meters.read'),
      op('monitoring', 'Meter Monitoring', () => import('@/pages/operator/Monitoring.vue'), 'meters.read'),
      op('tariffs', 'Tariffs', () => import('@/pages/operator/Tariffs.vue'), 'tariffs.read'),
      op('tariffs/:id', 'Tariff plan', () => import('@/pages/operator/TariffDetail.vue'), 'tariffs.read'),
      op('billing', 'Billing & Debt', () => import('@/pages/operator/Billing.vue'), 'customers.read'),
      op('vending', 'Electricity Vending', () => import('@/pages/operator/Vending.vue'), 'meters.read'),
      op('staff', 'Staff & Roles', () => import('@/pages/operator/Staff.vue'), 'staff.manage'),
      op('integrations', 'API Integrations', () => import('@/pages/operator/Integrations.vue'), 'integrations.read'),
      op('company', 'Company & Onboarding', () => import('@/pages/operator/Company.vue'), 'operator.read'),
      op('payments', 'Payments', () => import('@/pages/Later.vue'), 'transactions.read'),
      op('finance', 'Financial Operations', () => import('@/pages/Later.vue'), 'finance.read'),
      op('reports', 'Reports', () => import('@/pages/Later.vue'), 'transactions.read'),
      op('support', 'Support', () => import('@/pages/Later.vue'), 'customers.read'),
      op('branding', 'White-Label Settings', () => import('@/pages/Later.vue'), 'onboarding.submit'),
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AppShell.vue'),
    meta: { area: 'platform' },
    children: [
      op('', 'Overview', () => import('@/pages/platform/Overview.vue')),
      op('operators', 'Operators', () => import('@/pages/platform/Operators.vue')),
      op('operators/:id', 'Operator', () => import('@/pages/platform/OperatorDetail.vue')),
      op('integrations', 'Integrations', () => import('@/pages/platform/Integrations.vue')),
      op('audit', 'Audit Logs', () => import('@/pages/platform/Audit.vue')),
      op('subscriptions', 'Subscriptions', () => import('@/pages/Later.vue')),
      op('revenue', 'Platform Revenue', () => import('@/pages/Later.vue')),
      op('transactions', 'Transactions', () => import('@/pages/Later.vue')),
      op('monitoring', 'Monitoring', () => import('@/pages/Later.vue')),
      op('settings', 'Settings', () => import('@/pages/Later.vue')),
    ],
  },
  { path: '/:rest(.*)*', redirect: '/' },
]

export const router = createRouter({ history: createWebHistory(), routes, scrollBehavior: () => ({ top: 0 }) })

router.beforeEach(async (to) => {
  const s = useSession()
  if (!s.ready) await s.restore()
  if (to.meta.public) return s.user ? '/' : true
  if (!s.user) return { path: '/login', query: to.fullPath !== '/' ? { next: to.fullPath } : {} }
  const area = to.matched.find((r) => r.meta.area)?.meta.area
  if (area === 'platform' && !s.isPlatform) return '/app'
  if (area === 'operator' && s.isPlatform) return '/admin'
  const perm = to.meta.perm as string | undefined
  if (perm && !s.can(perm)) return '/app'
  return true
})

router.afterEach((to) => {
  document.title = `${(to.meta.title as string) ?? 'Console'} · Zenerlink Vends`
})
