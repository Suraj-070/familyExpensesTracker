import { create } from 'zustand'

export type PageName =
  | 'login' | 'signup' | 'forgot' | 'reset' | 'dashboard' | 'expenses'
  | 'add-expense' | 'edit-expense' | 'categories' | 'recurring'
  | 'family' | 'reports' | 'search' | 'profile' | 'settings'

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  role?: string
}

export interface Family {
  id: string
  name: string
  inviteCode: string
  createdAt: string
}

export interface FamilyMember {
  id: string
  userId: string
  familyId: string
  role: 'admin' | 'member'
  joinedAt: string
  user?: { id: string; name: string; email: string; avatarUrl?: string }
  expenseCount?: number
  expenseTotal?: number
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  isDefault: boolean
  createdBy?: string | null
  familyId: string
}

export interface Expense {
  id: string
  title: string
  description?: string
  amount: number
  expenseDate: string
  dueDate?: string
  categoryId?: string
  category?: Category
  whoPaidId?: string
  whoPaid?: { id: string; name: string; avatarUrl?: string }
  addedById?: string
  addedBy?: { id: string; name: string; avatarUrl?: string }
  paidStatus: 'paid' | 'unpaid'
  notes?: string
  attachments?: { id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number }[]
  familyId: string
  createdAt: string
  updatedAt: string
}

export interface RecurringExpense {
  id: string
  title: string
  amount: number
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  categoryId?: string
  category?: Category
  startDate: string
  endDate?: string
  nextDueDate?: string
  whoPaidId?: string
  whoPaid?: { id: string; name: string; avatarUrl?: string }
  createdBy?: string
  creator?: { id: string; name: string; avatarUrl?: string }
  isActive: boolean
  familyId: string
  createdAt: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
}

export interface Activity {
  id: string
  action: string
  details?: string
  userId: string
  familyId: string
  createdAt: string
  user?: { id: string; name: string; avatarUrl?: string }
}

export interface ExpenseFilters {
  search?: string
  categoryId?: string
  paidStatus?: 'all' | 'paid' | 'unpaid'
  paidBy?: string
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
}

export interface ReportSummary {
  totalExpenses: number
  totalPaid: number
  totalUnpaid: number
  thisMonthSpending: number
  lastMonthSpending: number
  changePercent: number
}

export interface CategoryReport {
  categoryId: string
  categoryName: string
  totalAmount: number
  percentage: number
  color: string
  icon: string
}

export interface TrendData {
  month: string
  label: string
  total: number
  paid: number
  unpaid: number
}

interface AppState {
  // Auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User> & { currentPassword?: string; newPassword?: string }) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  initAuth: () => Promise<void>

  // Navigation
  currentPage: PageName
  editingExpenseId: string | null
  selectedExpense: Expense | null
  navigate: (page: PageName, expenseId?: string) => void
  setSelectedExpense: (expense: Expense | null) => void

  // Family
  currentFamily: Family | null
  families: Family[]
  members: FamilyMember[]
  selectFamily: (family: Family) => Promise<void>
  loadFamilies: () => Promise<void>
  loadMembers: () => Promise<void>
  createFamily: (name: string) => Promise<void>
  joinFamily: (inviteCode: string) => Promise<void>
  updateFamilyName: (name: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  leaveFamily: () => Promise<void>
  updateMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void>

  // Expenses
  expenses: Expense[]
  expenseCount: number
  expenseFilters: ExpenseFilters
  setFilters: (filters: Partial<ExpenseFilters>) => void
  loadExpenses: () => Promise<void>
  createExpense: (data: Partial<Expense>) => Promise<string | null>
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  togglePaidStatus: (id: string) => Promise<void>

  // Categories
  categories: Category[]
  loadCategories: () => Promise<void>
  createCategory: (data: { name: string; icon: string; color: string }) => Promise<Category | null>
  updateCategory: (id: string, data: { name: string; icon: string; color: string }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Recurring
  recurringExpenses: RecurringExpense[]
  loadRecurringExpenses: () => Promise<void>
  createRecurringExpense: (data: Partial<RecurringExpense>) => Promise<void>
  updateRecurringExpense: (id: string, data: Partial<RecurringExpense>) => Promise<void>
  deleteRecurringExpense: (id: string) => Promise<void>
  previewRecurringDates: (startDate: string, frequency: string, count?: number) => Promise<string[]>
  getRecurringDetail: (id: string) => Promise<{ recurring: RecurringExpense; generatedExpenses: { id: string; expenseDate: string; amount: number; paidStatus: string }[] } | null>

  // Reports
  reportSummary: ReportSummary | null
  categoryReport: CategoryReport[]
  trendData: TrendData[]
  loadReportSummary: () => Promise<void>
  loadCategoryReport: () => Promise<void>
  loadTrendData: (months?: number) => Promise<void>

  // Activity
  activities: Activity[]
  loadActivities: () => Promise<void>

  // UI
  sidebarOpen: boolean
  toggleSidebar: () => void

  // Notifications
  notifications: Notification[]
  unreadCount: number
  loadNotifications: () => Promise<void>
  markNotificationRead: (id: string) => Promise<void>
  markAllNotificationsRead: () => Promise<void>
}

const API = (path: string, options: RequestInit = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    },
  })
}

async function loadFamilyData(familyId: string, set: (s: Partial<AppState>) => void) {
  const [memRes, catRes] = await Promise.all([
    API(`/api/families/${familyId}/members`),
    API(`/api/categories?familyId=${familyId}`),
  ])
  const updates: Partial<AppState> = {}
  if (memRes.ok) {
    const d = await memRes.json()
    updates.members = d.members || []
  }
  if (catRes.ok) {
    const d = await catRes.json()
    updates.categories = d.categories || []
  }
  set(updates)
}

export const useStore = create<AppState>((set, get) => ({
  user: null, token: null, isAuthenticated: false,

  login: async (email, password) => {
    const res = await API('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Login failed')
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true, currentPage: 'dashboard' })

    const famRes = await API('/api/families')
    if (famRes.ok) {
      const famData = await famRes.json()
      const families = famData.families || []
      if (families.length > 0) {
        set({ families, currentFamily: families[0] })
        await loadFamilyData(families[0].id, set)
      } else {
        set({ families, currentPage: 'family' })
      }
    }
  },

  signup: async (name, email, password) => {
    const res = await API('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'signup', name, email, password }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Signup failed')
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true, currentPage: 'family' })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({
      user: null, token: null, isAuthenticated: false, currentPage: 'login',
      currentFamily: null, families: [], members: [], expenses: [],
      categories: [], recurringExpenses: [], notifications: [],
      activities: [], reportSummary: null, categoryReport: [], trendData: [],
      expenseFilters: {}, unreadCount: 0, sidebarOpen: false,
    })
  },

  updateProfile: async (data) => {
    const res = await API('/api/auth', { method: 'PUT', body: JSON.stringify(data) })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Update failed')
    if (result.user) set({ user: result.user })
  },

  forgotPassword: async (email) => {
    const res = await API('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'forgot', email }) })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Request failed')
    }
  },

  resetPassword: async (token, newPassword) => {
    const res = await API('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'reset', token, newPassword }) })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Reset failed')
    }
  },

  initAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) { set({ isAuthenticated: false, currentPage: 'login' }); return }
    try {
      const res = await API('/api/auth?action=me')
      if (!res.ok) {
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false, currentPage: 'login' })
        return
      }
      const data = await res.json()
      set({ token, user: data.user, isAuthenticated: true, currentPage: 'dashboard' })

      const famRes = await API('/api/families')
      if (famRes.ok) {
        const famData = await famRes.json()
        const families = famData.families || []
        if (families.length > 0) {
          const currentFamily = families[0]
          set({ families, currentFamily })
          await loadFamilyData(currentFamily.id, set)
        } else {
          set({ families, currentPage: 'family' })
        }
      }
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false, currentPage: 'login' })
    }
  },

  currentPage: 'login', editingExpenseId: null, selectedExpense: null,

  navigate: (page, expenseId) => set({ currentPage: page, editingExpenseId: expenseId || null, sidebarOpen: false }),
  setSelectedExpense: (expense) => set({ selectedExpense: expense }),

  currentFamily: null, families: [], members: [],

  selectFamily: async (family) => {
    set({ currentFamily: family, expenses: [], categories: [], recurringExpenses: [], activities: [] })
    await loadFamilyData(family.id, set)
  },

  loadFamilies: async () => {
    const res = await API('/api/families')
    if (res.ok) {
      const data = await res.json()
      const families = data.families || []
      set((state) => ({
        families,
        currentFamily: state.currentFamily ?? (families.length > 0 ? families[0] : null),
      }))
    }
  },

  loadMembers: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}/members`)
    if (res.ok) {
      const data = await res.json()
      set({ members: data.members || [] })
    }
  },

  createFamily: async (name) => {
    const res = await API('/api/families', { method: 'POST', body: JSON.stringify({ name }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to create family')
    if (data.token) localStorage.setItem('token', data.token)
    set((state) => ({
      families: [...state.families, data.family],
      currentFamily: data.family,
      token: data.token || state.token,
    }))
    await loadFamilyData(data.family.id, set)
  },

  joinFamily: async (inviteCode) => {
    const res = await API('/api/families', { method: 'POST', body: JSON.stringify({ action: 'join', inviteCode }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Failed to join family')
    if (data.token) localStorage.setItem('token', data.token)
    set((state) => ({
      families: [...state.families, data.family],
      currentFamily: data.family,
      token: data.token || state.token,
    }))
    await loadFamilyData(data.family.id, set)
  },

  updateFamilyName: async (name) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to update family')
    set((state) => ({
      currentFamily: state.currentFamily ? { ...state.currentFamily, name: result.family.name } : null,
      families: state.families.map((f) => (f.id === currentFamily.id ? { ...f, name: result.family.name } : f)),
    }))
  },

  removeMember: async (userId) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to remove member')
    set((state) => ({ members: state.members.filter((m) => m.userId !== userId) }))
  },

  leaveFamily: async () => {
    const { currentFamily, user } = get()
    if (!currentFamily || !user) return
    const res = await API(`/api/families/${currentFamily.id}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ userId: user.id }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to leave family')
    set((state) => {
      const remainingFamilies = state.families.filter((f) => f.id !== currentFamily.id)
      return {
        families: remainingFamilies,
        currentFamily: remainingFamilies[0] || null,
        members: [],
        currentPage: remainingFamilies.length > 0 ? 'family' : 'family',
      }
    })
    if (get().currentFamily) {
      await loadFamilyData(get().currentFamily!.id, set)
    }
  },

  updateMemberRole: async (userId, role) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}/members`, {
      method: 'PUT',
      body: JSON.stringify({ userId, role }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to update role')
    set((state) => ({
      members: state.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
    }))
  },

  expenses: [], expenseCount: 0, expenseFilters: {},

  setFilters: (filters) => set((state) => ({ expenseFilters: { ...state.expenseFilters, ...filters } })),

  loadExpenses: async () => {
    const { currentFamily, expenseFilters } = get()
    if (!currentFamily) return
    const params = new URLSearchParams({ familyId: currentFamily.id })
    if (expenseFilters.search) params.set('search', expenseFilters.search)
    if (expenseFilters.categoryId) params.set('categoryId', expenseFilters.categoryId)
    if (expenseFilters.paidStatus && expenseFilters.paidStatus !== 'all') params.set('paidStatus', expenseFilters.paidStatus)
    if (expenseFilters.paidBy) params.set('paidBy', expenseFilters.paidBy)
    if (expenseFilters.dateFrom) params.set('dateFrom', expenseFilters.dateFrom)
    if (expenseFilters.dateTo) params.set('dateTo', expenseFilters.dateTo)
    if (expenseFilters.amountMin) params.set('amountMin', String(expenseFilters.amountMin))
    if (expenseFilters.amountMax) params.set('amountMax', String(expenseFilters.amountMax))
    const res = await API(`/api/expenses?${params}`)
    if (res.ok) {
      const data = await res.json()
      set({ expenses: data.expenses || [], expenseCount: data.count || data.total || 0 })
    }
  },

  createExpense: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return null
    // Optimistic: store doesn't inject a fake row (expenses need server-generated relations
    // like category/whoPaid/addedBy to render correctly) — instead we keep the loading state
    // short by awaiting directly and refreshing once.
    const res = await API('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to create expense')
    await get().loadExpenses()
    return result.expense?.id ?? null
  },

  updateExpense: async (id, data) => {
    // Optimistic update: apply the change to local state immediately, roll back on failure
    const prev = get().expenses
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, ...data } as Expense : e)),
    }))
    const res = await API(`/api/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      set({ expenses: prev })
      throw new Error(result.error || 'Failed to update expense')
    }
    get().loadExpenses()
  },

  deleteExpense: async (id) => {
    // Optimistic delete with rollback on failure (undo handled at UI layer via toast)
    const prev = get().expenses
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }))
    const res = await API(`/api/expenses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      set({ expenses: prev })
      const result = await res.json().catch(() => ({}))
      throw new Error(result.error || 'Failed to delete expense')
    }
  },

  togglePaidStatus: async (id) => {
    const current = get().expenses.find((e) => e.id === id)
    if (!current) return
    const newStatus = current.paidStatus === 'paid' ? 'unpaid' : 'paid'
    // Optimistic toggle
    set((state) => ({
      expenses: state.expenses.map((e) => (e.id === id ? { ...e, paidStatus: newStatus } : e)),
    }))
    const res = await API(`/api/expenses/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paidStatus: newStatus }),
    })
    if (!res.ok) {
      // Roll back
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? { ...e, paidStatus: current.paidStatus } : e)),
      }))
      const result = await res.json().catch(() => ({}))
      throw new Error(result.error || 'Failed to update status')
    }
  },

  categories: [],

  loadCategories: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/categories?familyId=${currentFamily.id}`)
    if (res.ok) {
      const data = await res.json()
      const categories = Array.isArray(data) ? data : (data.categories || [])
      set({ categories })
    }
  },

  createCategory: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return null
    const res = await API('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to create category')
    await get().loadCategories()
    return result.category ?? null
  },

  updateCategory: async (id, data) => {
    const res = await API(`/api/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to update category')
    get().loadCategories()
  },

  deleteCategory: async (id) => {
    const res = await API(`/api/categories/${id}`, { method: 'DELETE' })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to delete category')
    set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
  },

  recurringExpenses: [],

  loadRecurringExpenses: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/recurring?familyId=${currentFamily.id}`)
    if (res.ok) { const data = await res.json(); set({ recurringExpenses: data.recurring || [] }) }
  },

  createRecurringExpense: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API('/api/recurring', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to create recurring expense')
    get().loadRecurringExpenses()
  },

  updateRecurringExpense: async (id, data) => {
    const res = await API(`/api/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to update recurring expense')
    get().loadRecurringExpenses()
  },

  deleteRecurringExpense: async (id) => {
    const res = await API(`/api/recurring/${id}`, { method: 'DELETE' })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(result.error || 'Failed to delete recurring expense')
    set((state) => ({ recurringExpenses: state.recurringExpenses.filter((r) => r.id !== id) }))
  },

  previewRecurringDates: async (startDate, frequency, count = 3) => {
    try {
      const res = await API('/api/recurring/preview', {
        method: 'POST',
        body: JSON.stringify({ startDate, frequency, count }),
      })
      if (!res.ok) return []
      const data = await res.json()
      return data.dates || []
    } catch {
      return []
    }
  },

  getRecurringDetail: async (id) => {
    const res = await API(`/api/recurring/${id}`)
    if (!res.ok) return null
    return res.json()
  },

  reportSummary: null, categoryReport: [], trendData: [],

  loadReportSummary: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/summary?familyId=${currentFamily.id}`)
    if (res.ok) { const data = await res.json(); set({ reportSummary: data }) }
  },

  loadCategoryReport: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/by-category?familyId=${currentFamily.id}`)
    if (res.ok) { const data = await res.json(); set({ categoryReport: data.categories || [] }) }
  },

  loadTrendData: async (months = 6) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/trend?familyId=${currentFamily.id}&months=${months}`)
    if (res.ok) { const data = await res.json(); set({ trendData: data.trend || [] }) }
  },

  activities: [],

  loadActivities: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/activity?familyId=${currentFamily.id}&limit=10`)
    if (res.ok) { const data = await res.json(); set({ activities: data.activities || [] }) }
  },

  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  notifications: [], unreadCount: 0,

  loadNotifications: async () => {
    const res = await API('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      const notifications = data.notifications || []
      set({ notifications, unreadCount: notifications.filter((n: Notification) => !n.isRead).length })
    }
  },

  markNotificationRead: async (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
    const res = await API(`/api/notifications/${id}/read`, { method: 'PUT' })
    if (!res.ok) get().loadNotifications() // resync on failure
  },

  markAllNotificationsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }))
    const res = await API('/api/notifications/read-all', { method: 'PUT' })
    if (!res.ok) get().loadNotifications()
  },
}))

export function formatCurrency(amount: number): string {
  return 'Rs. ' + new Intl.NumberFormat('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
