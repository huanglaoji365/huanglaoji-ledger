import { createRouter, createWebHashHistory } from 'vue-router'
import DashboardPage from '../pages/DashboardPage.vue'
import { useAuth } from '../composables/useAuth'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage, meta: { title: '总览' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { title: '登录', public: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../pages/ProfilePage.vue'),
      meta: { title: '个人信息' },
    },
    {
      path: '/transactions',
      name: 'transactions',
      component: () => import('../pages/TransactionsPage.vue'),
      meta: { title: '交易明细' },
    },
    {
      path: '/analytics',
      name: 'analytics',
      component: () => import('../pages/AnalyticsPage.vue'),
      meta: { title: '统计分析' },
    },
    {
      path: '/budgets',
      name: 'budgets',
      component: () => import('../pages/BudgetsPage.vue'),
      meta: { title: '预算管理' },
    },
    {
      path: '/accounts',
      name: 'accounts',
      component: () => import('../pages/AccountsPage.vue'),
      meta: { title: '账户管理' },
    },
    {
      path: '/categories',
      name: 'categories',
      component: () => import('../pages/CategoriesPage.vue'),
      meta: { title: '分类管理' },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../pages/SettingsPage.vue'),
      meta: { title: '设置' },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../pages/AdminPage.vue'),
      meta: { title: '管理后台', adminOnly: true },
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

let bootstrapped = false

router.beforeEach(async (to) => {
  const auth = useAuth()
  if (!bootstrapped) {
    bootstrapped = true
    // 有 token 时先恢复会话，避免刷新页面后被误踢到登录页
    await auth.bootstrap()
  }
  const { state } = useAuth()
  if (!state.session && !state.booting && to.name !== 'login') {
    // 未登录：跳登录页，登录后回跳原地址
    return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined }
  }
  if (state.session && to.name === 'login') {
    return { path: '/' }
  }
  if (to.meta.adminOnly && state.session?.role !== 'admin') {
    return { path: '/' }
  }
})

router.afterEach((to) => {
  document.title = `${to.meta.title ?? ''} · 黄老吉记账`
})
