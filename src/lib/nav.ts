import type { Component } from 'vue'
import {
  Activity, BadgeCheck, Banknote, BarChart3, Blocks, Building2, CircuitBoard, CreditCard, FileClock, Gauge, Headphones, Home,
  LayoutDashboard, Palette, PlugZap, Receipt, ScrollText, Settings, ShieldCheck, Sun, Users, UserCog, Wallet, Zap,
} from 'lucide-vue-next'

export type NavItem = { label: string; to: string; icon: Component; perm?: string }
export type NavGroup = { title?: string; items: NavItem[] }

// Operator navigation (brief §21). Items the user's role cannot use are hidden.
export const operatorNav: NavGroup[] = [
  { items: [{ label: 'Dashboard', to: '/app', icon: Home }] },
  {
    title: 'Network',
    items: [
      { label: 'Mini-Grids', to: '/app/sites', icon: Sun, perm: 'operator.read' },
      { label: 'Customers', to: '/app/customers', icon: Users, perm: 'customers.read' },
      { label: 'Meters', to: '/app/meters', icon: Gauge, perm: 'meters.read' },
      { label: 'Meter Monitoring', to: '/app/monitoring', icon: Activity, perm: 'meters.read' },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { label: 'Tariffs', to: '/app/tariffs', icon: ScrollText, perm: 'tariffs.read' },
      { label: 'Billing & Debt', to: '/app/billing', icon: Wallet, perm: 'customers.read' },
      { label: 'Electricity Vending', to: '/app/vending', icon: Zap, perm: 'meters.read' },
      { label: 'Payments', to: '/app/payments', icon: CreditCard, perm: 'transactions.read' },
      { label: 'Financial Operations', to: '/app/finance', icon: Banknote, perm: 'finance.read' },
      { label: 'Reports', to: '/app/reports', icon: BarChart3, perm: 'transactions.read' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { label: 'Support', to: '/app/support', icon: Headphones, perm: 'customers.read' },
      { label: 'Staff & Roles', to: '/app/staff', icon: UserCog, perm: 'staff.manage' },
      { label: 'White-Label Settings', to: '/app/branding', icon: Palette, perm: 'onboarding.submit' },
      { label: 'API Integrations', to: '/app/integrations', icon: PlugZap, perm: 'integrations.read' },
      { label: 'Company & Onboarding', to: '/app/company', icon: BadgeCheck, perm: 'operator.read' },
    ],
  },
]

// Zenerlink super admin navigation (brief §21).
export const platformNav: NavGroup[] = [
  { items: [{ label: 'Overview', to: '/admin', icon: LayoutDashboard }] },
  {
    title: 'Operators',
    items: [
      { label: 'Operators', to: '/admin/operators', icon: Building2 },
      { label: 'Subscriptions', to: '/admin/subscriptions', icon: Receipt },
      { label: 'Integrations', to: '/admin/integrations', icon: CircuitBoard },
    ],
  },
  {
    title: 'Money',
    items: [
      { label: 'Platform Revenue', to: '/admin/revenue', icon: BarChart3 },
      { label: 'Transactions', to: '/admin/transactions', icon: Blocks },
    ],
  },
  {
    title: 'Platform',
    items: [
      { label: 'Monitoring', to: '/admin/monitoring', icon: Activity },
      { label: 'Audit Logs', to: '/admin/audit', icon: FileClock },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
]

export const securityIcon = ShieldCheck
