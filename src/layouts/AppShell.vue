<script setup lang="ts">
import logo from '@/assets/logo-icon-white.svg'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronDown, FlaskConical, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Radio, X } from 'lucide-vue-next'
import { useSession } from '@/stores/session'
import { operatorNav, platformNav } from '@/lib/nav'
import { words } from '@/lib/format'

const s = useSession()
const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const mobileOpen = ref(false)
const menuOpen = ref(false)

const groups = computed(() =>
  (s.isPlatform ? platformNav : operatorNav)
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || s.can(i.perm)) }))
    .filter((g) => g.items.length),
)
const home = computed(() => (s.isPlatform ? '/admin' : '/app'))
const active = (to: string) => (to === home.value ? route.path === to : route.path === to || route.path.startsWith(to + '/'))
const title = computed(() => (route.meta.title as string) ?? '')
const initials = computed(() =>
  (s.user?.name || s.user?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''),
)
const roleLabel = computed(() => (s.isPlatform ? 'Zenerlink admin' : words(s.user?.staff_role ?? s.user?.role ?? '')))
watch(() => route.fullPath, () => ((mobileOpen.value = false), (menuOpen.value = false)))

async function signOut() {
  await s.signOut()
  router.replace('/login')
}
</script>

<template>
  <div class="flex min-h-full">
    <!-- Sidebar -->
    <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-ink/60 lg:hidden" @click="mobileOpen = false" />
    <aside
      class="fixed inset-y-0 left-0 z-50 flex flex-col bg-ink text-white/80 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
      :class="[collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]', mobileOpen ? 'w-[264px] translate-x-0' : 'w-[264px] -translate-x-full']"
    >
      <div class="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
        <RouterLink :to="home" class="flex min-w-0 items-center gap-2.5">
          <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] ring-1 ring-white/10"><img :src="logo" alt="" class="size-5" /></span>
          <span v-if="!collapsed || mobileOpen" class="truncate leading-tight">
            <span class="block text-[15px] font-bold text-white">Zenerlink</span>
            <span class="block text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">Vends</span>
          </span>
        </RouterLink>
        <button type="button" class="hidden rounded-md p-1.5 text-white/50 hover:bg-white/5 hover:text-white lg:block" :aria-label="collapsed ? 'Expand menu' : 'Collapse menu'" @click="collapsed = !collapsed">
          <PanelLeftOpen v-if="collapsed" class="size-5" />
          <PanelLeftClose v-else class="size-5" />
        </button>
        <button type="button" class="rounded-md p-1.5 text-white/60 lg:hidden" aria-label="Close menu" @click="mobileOpen = false"><X class="size-5" /></button>
      </div>
      <div v-if="!collapsed || mobileOpen" class="border-b border-white/[0.07] px-5 pb-4 pt-1">
        <p class="truncate text-[13px] font-semibold uppercase tracking-wide text-white">{{ s.tenant?.name }}</p>
        <p class="mt-0.5 text-xs text-white/40">{{ s.isPlatform ? 'Platform administration' : 'Operator console' }}</p>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <div v-for="(g, gi) in groups" :key="gi" class="mb-5">
          <p v-if="g.title && (!collapsed || mobileOpen)" class="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">{{ g.title }}</p>
          <RouterLink
            v-for="i in g.items"
            :key="i.to"
            :to="i.to"
            :title="collapsed ? i.label : undefined"
            class="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] transition"
            :class="active(i.to) ? 'bg-ink-3 text-white' : 'hover:bg-white/[0.04] hover:text-white'"
            :aria-current="active(i.to) ? 'page' : undefined"
          >
            <component :is="i.icon" class="size-[18px] shrink-0" :class="active(i.to) ? 'text-gold' : ''" />
            <span v-if="!collapsed || mobileOpen" class="truncate">{{ i.label }}</span>
          </RouterLink>
        </div>
      </nav>
    </aside>

    <!-- Main -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-8">
        <button type="button" class="-ml-1 rounded-md p-1.5 text-slate-600 lg:hidden" aria-label="Open menu" @click="mobileOpen = true"><Menu class="size-5" /></button>
        <p class="min-w-0 flex-1 truncate text-lg font-semibold">{{ title }}</p>
        <span
          v-if="s.tenant && !s.isPlatform"
          class="hidden items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold sm:inline-flex"
          :class="s.tenant.vending_mode === 'live' ? 'border-ok/20 bg-ok-soft text-ok' : 'border-warn/20 bg-warn-soft text-warn'"
          :title="s.tenant.vending_mode === 'live' ? 'Live: real meters and money' : 'Sandbox: simulated meters, no real money'"
        >
          <Radio v-if="s.tenant.vending_mode === 'live'" class="size-3.5" />
          <FlaskConical v-else class="size-3.5" />
          {{ s.tenant.vending_mode === 'live' ? 'Live' : 'Sandbox' }}
        </span>
        <div class="relative">
          <button type="button" class="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span class="grid size-8 place-items-center rounded-full bg-ink text-xs font-bold text-gold">{{ initials }}</span>
            <ChevronDown class="size-4 text-slate-500" />
          </button>
          <div v-if="menuOpen" class="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
            <div class="border-b border-line px-4 py-3">
              <p class="truncate text-sm font-semibold">{{ s.user?.name || s.user?.email }}</p>
              <p class="truncate text-xs text-muted">{{ s.user?.email }}</p>
              <p class="mt-1 text-xs font-medium text-gold">{{ roleLabel }}</p>
            </div>
            <button type="button" class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-slate-50" @click="signOut"><LogOut class="size-4" /> Sign out</button>
          </div>
        </div>
      </header>
      <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8 sm:py-8"><RouterView /></main>
    </div>
  </div>
</template>
