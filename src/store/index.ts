import { create } from 'zustand'

export type PageName =
  | 'login'
  | 'signup'
  | 'forgot'
  | 'dashboard'
  | 'expenses'
  | 'add-expense'
  | 'edit-expense'
  | 'categories'
  | 'recurring'
  | 'family'
  | 'reports'
  | 'search'
  | 'profile'
  | 'settings'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
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
  user?: { id: string; name: string; email: string; avatar?: string }
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  isDefault: boolean
  familyId: string
}

export interface Expense {
  id: string
  title: string
  description?: string
  amount: number
  expenseDate: string
  dueDate?: string
  categoryId: string
  category?: Category
  paidBy?: string
  paidByName?: string
  paidStatus: 'paid' | 'unpaid'
  notes?: string
  receiptUrl?: string
  familyId: string
  createdAt: string
  updatedAt: string
  recurringExpenseId?: string
}

export interface RecurringExpense {
  id: string
  title: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'yearly'
  categoryId: string
  category?: Category
  startDate: string
  endDate?: string
  nextDueDate?: string
  isActive: boolean
  familyId: string
  paidBy?: string
  paidByName?: string
  createdAt: string
}

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
  link?: string
}

export interface Activity {
  id: string
  action: string
  description: string
  userId: string
  userName: string
  familyId: string
  createdAt: string
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
  initAuth: () => Promise<void>

  // Navigation
  currentPage: PageName
  editingExpenseId: string | null
  navigate: (page: PageName, expenseId?: string) => void

  // Family
  currentFamily: Family | null
  families: Family[]
  members: FamilyMember[]
  selectFamily: (family: Family) => void
  loadFamilies: () => Promise<void>
  loadMembers: () => Promise<void>
  createFamily: (name: string) => Promise<void>
  joinFamily: (inviteCode: string) => Promise<void>
  removeMember: (userId: string) => Promise<void>
  updateMemberRole: (userId: string, role: 'admin' | 'member') => Promise<void>

  // Expenses
  expenses: Expense[]
  expenseCount: number
  expenseFilters: ExpenseFilters
  setFilters: (filters: Partial<ExpenseFilters>) => void
  loadExpenses: () => Promise<void>
  createExpense: (data: Partial<Expense>) => Promise<void>
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  togglePaidStatus: (id: string) => Promise<void>

  // Categories
  categories: Category[]
  loadCategories: () => Promise<void>
  createCategory: (data: { name: string; icon: string; color: string }) => Promise<{ id: string } | null>
  updateCategory: (id: string, data: { name: string; icon: string; color: string }) => Promise<void>
  deleteCategory: (id: string) => Promise<void>

  // Recurring
  recurringExpenses: RecurringExpense[]
  loadRecurringExpenses: () => Promise<void>
  createRecurringExpense: (data: Partial<RecurringExpense>) => Promise<void>
  updateRecurringExpense: (id: string, data: Partial<RecurringExpense>) => Promise<void>
  deleteRecurringExpense: (id: string) => Promise<void>

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
  selectedExpense: Expense | null
  setSelectedExpense: (expense: Expense | null) => void

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
      ...options.headers,
    },
  })
}

export const useStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  token: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const res = await API('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'login', email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Login failed')
    }
    const data = await res.json()
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true, currentPage: 'dashboard' })
  },

  signup: async (name, email, password) => {
    const res = await API('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'signup', name, email, password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Signup failed')
    }
    const data = await res.json()
    localStorage.setItem('token', data.token)
    set({ token: data.token, user: data.user, isAuthenticated: true, currentPage: 'dashboard' })
  },

  logout: () => {
    localStorage.removeItem('token')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      currentPage: 'login',
      currentFamily: null,
      families: [],
      members: [],
      expenses: [],
      categories: [],
      recurringExpenses: [],
      notifications: [],
      activities: [],
      reportSummary: null,
      categoryReport: [],
      trendData: [],
    })
  },

  updateProfile: async (data) => {
    const res = await API('/api/auth', {
      method: 'PUT',
      body: JSON.stringify({ action: 'profile', ...data }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Update failed')
    }
    const result = await res.json()
    set({ user: result.user })
  },

  forgotPassword: async (email) => {
    const res = await API('/api/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'forgot', email }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Request failed')
    }
  },

  initAuth: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      set({ isAuthenticated: false, currentPage: 'login' })
      return
    }
    try {
      const res = await API('/api/auth?action=me')
      if (!res.ok) {
        localStorage.removeItem('token')
        set({ token: null, user: null, isAuthenticated: false, currentPage: 'login' })
        return
      }
      const data = await res.json()
      set({ token, user: data.user, isAuthenticated: true, currentPage: 'dashboard' })
      // Load families
      const famRes = await API('/api/families')
      if (famRes.ok) {
        const famData = await famRes.json()
        if (famData.families?.length > 0) {
          set({ families: famData.families, currentFamily: famData.families[0] })
          // Load members
          const memRes = await API(`/api/families/${famData.families[0].id}/members`)
          if (memRes.ok) {
            const memData = await memRes.json()
            set({ members: memData.members || [] })
          }
        }
      }
    } catch {
      localStorage.removeItem('token')
      set({ token: null, user: null, isAuthenticated: false, currentPage: 'login' })
    }
  },

  // Navigation
  currentPage: 'login',
  editingExpenseId: null,

  navigate: (page, expenseId) => {
    set({ currentPage: page, ...(expenseId ? { editingExpenseId: expenseId } : {}), sidebarOpen: false })
  },

  // Family
  currentFamily: null,
  families: [],
  members: [],

  selectFamily: async (family) => {
    set({ currentFamily: family, expenses: [], categories: [], recurringExpenses: [], activities: [] })
    const memRes = await API(`/api/families/${family.id}/members`)
    if (memRes.ok) {
      const memData = await memRes.json()
      set({ members: memData.members || [] })
    }
  },

  loadFamilies: async () => {
    const res = await API('/api/families')
    if (res.ok) {
      const data = await res.json()
      set({ families: data.families || [] })
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
    const res = await API('/api/families', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to create family')
    }
    const data = await res.json()
    set((state) => ({ families: [...state.families, data.family], currentFamily: data.family }))
  },

  joinFamily: async (inviteCode) => {
    const res = await API('/api/families', {
      method: 'POST',
      body: JSON.stringify({ action: 'join', inviteCode }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to join family')
    }
    const data = await res.json()
    set((state) => ({ families: [...state.families, data.family] }))
  },

  removeMember: async (userId) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}/members`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      set((state) => ({ members: state.members.filter((m) => m.userId !== userId) }))
    }
  },

  updateMemberRole: async (userId, role) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/families/${currentFamily.id}/members`, {
      method: 'PUT',
      body: JSON.stringify({ userId, role }),
    })
    if (res.ok) {
      set((state) => ({
        members: state.members.map((m) => (m.userId === userId ? { ...m, role } : m)),
      }))
    }
  },

  // Expenses
  expenses: [],
  expenseCount: 0,
  expenseFilters: {},

  setFilters: (filters) => {
    set((state) => ({ expenseFilters: { ...state.expenseFilters, ...filters } }))
  },

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

    const res = await API(`/api/expenses?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      set({ expenses: data.expenses || [], expenseCount: data.count || 0 })
    }
  },

  createExpense: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create expense')
    }
    get().loadExpenses()
  },

  updateExpense: async (id, data) => {
    const res = await API(`/api/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to update expense')
    }
    get().loadExpenses()
  },

  deleteExpense: async (id) => {
    const res = await API(`/api/expenses/${id}`, { method: 'DELETE' })
    if (res.ok) {
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }))
    }
  },

  togglePaidStatus: async (id) => {
    const res = await API(`/api/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'togglePaid' }),
    })
    if (res.ok) {
      get().loadExpenses()
    }
  },

  // Categories
  categories: [],

  loadCategories: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/categories?familyId=${currentFamily.id}`)
    if (res.ok) {
      const data = await res.json()
      // API may return {categories:[]} or a raw array depending on version
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
    if (!res.ok) {
      throw new Error(result.error || 'Failed to create category')
    }
    await get().loadCategories()
    // API returns {category: {...}} — return its id so callers can use it immediately
    return result.category ?? null
  },

  updateCategory: async (id, data) => {
    const res = await API(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (res.ok) {
      get().loadCategories()
    }
  },

  deleteCategory: async (id) => {
    const res = await API(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) {
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
    }
  },

  // Recurring
  recurringExpenses: [],

  loadRecurringExpenses: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/recurring?familyId=${currentFamily.id}`)
    if (res.ok) {
      const data = await res.json()
      set({ recurringExpenses: data.recurring || [] })
    }
  },

  createRecurringExpense: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API('/api/recurring', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    if (res.ok) {
      get().loadRecurringExpenses()
    }
  },

  updateRecurringExpense: async (id, data) => {
    const res = await API(`/api/recurring/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    if (res.ok) {
      get().loadRecurringExpenses()
    }
  },

  deleteRecurringExpense: async (id) => {
    const res = await API(`/api/recurring/${id}`, { method: 'DELETE' })
    if (res.ok) {
      set((state) => ({ recurringExpenses: state.recurringExpenses.filter((r) => r.id !== id) }))
    }
  },

  // Reports
  reportSummary: null,
  categoryReport: [],
  trendData: [],

  loadReportSummary: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/summary?familyId=${currentFamily.id}`)
    if (res.ok) {
      const data = await res.json()
      set({ reportSummary: data })
    }
  },

  loadCategoryReport: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/by-category?familyId=${currentFamily.id}`)
    if (res.ok) {
      const data = await res.json()
      set({ categoryReport: data.categories || [] })
    }
  },

  loadTrendData: async (months = 6) => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/reports/trend?familyId=${currentFamily.id}&months=${months}`)
    if (res.ok) {
      const data = await res.json()
      set({ trendData: data.trend || [] })
    }
  },

  // Activity
  activities: [],

  loadActivities: async () => {
    const { currentFamily } = get()
    if (!currentFamily) return
    const res = await API(`/api/activity?familyId=${currentFamily.id}&limit=10`)
    if (res.ok) {
      const data = await res.json()
      set({ activities: data.activities || [] })
    }
  },

  // UI
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  selectedExpense: null,
  setSelectedExpense: (expense) => set({ selectedExpense: expense }),

  // Notifications
  notifications: [],
  unreadCount: 0,

  loadNotifications: async () => {
    const res = await API('/api/notifications')
    if (res.ok) {
      const data = await res.json()
      const notifications = data.notifications || []
      set({
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.isRead).length,
      })
    }
  },

  markNotificationRead: async (id) => {
    const res = await API(`/api/notifications/${id}`, { method: 'PATCH', body: JSON.stringify({ isRead: true }) })
    if (res.ok) {
      set((state) => ({
        notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }))
    }
  },

  markAllNotificationsRead: async () => {
    const res = await API('/api/notifications', { method: 'PATCH', body: JSON.stringify({ allRead: true }) })
    if (res.ok) {
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }))
    }
  },
}))

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}