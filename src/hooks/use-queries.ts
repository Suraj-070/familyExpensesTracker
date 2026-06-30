import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/store'

const API = (path: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return fetch(path, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
}

// ── Dashboard ──────────────────────────────────────────────────────────────
// Bundles summary + category report + trend + activities + expenses into
// parallel queries, all keyed by familyId so switching families or refreshing
// the page rehydrates instantly from the persisted cache.

export function useDashboardData() {
  const currentFamily = useStore((s) => s.currentFamily)
  const familyId = currentFamily?.id

  const summary = useQuery({
    queryKey: ['reports', 'summary', familyId],
    queryFn: async () => {
      const res = await API(`/api/reports/summary?familyId=${familyId}`)
      if (!res.ok) throw new Error('Failed to load summary')
      return res.json()
    },
    enabled: !!familyId,
  })

  const categoryReport = useQuery({
    queryKey: ['reports', 'by-category', familyId],
    queryFn: async () => {
      const res = await API(`/api/reports/by-category?familyId=${familyId}`)
      if (!res.ok) throw new Error('Failed to load category report')
      const data = await res.json()
      return data.categories || []
    },
    enabled: !!familyId,
  })

  const trend = useQuery({
    queryKey: ['reports', 'trend', familyId, 6],
    queryFn: async () => {
      const res = await API(`/api/reports/trend?familyId=${familyId}&months=6`)
      if (!res.ok) throw new Error('Failed to load trend')
      const data = await res.json()
      return data.trend || []
    },
    enabled: !!familyId,
  })

  const activities = useQuery({
    queryKey: ['activity', familyId, 10],
    queryFn: async () => {
      const res = await API(`/api/activity?familyId=${familyId}&limit=10`)
      if (!res.ok) throw new Error('Failed to load activity')
      const data = await res.json()
      return data.activities || []
    },
    enabled: !!familyId,
  })

  const expenses = useQuery({
    queryKey: ['expenses', familyId, 'dashboard-recent'],
    queryFn: async () => {
      const res = await API(`/api/expenses?familyId=${familyId}&limit=50`)
      if (!res.ok) throw new Error('Failed to load expenses')
      const data = await res.json()
      return data.expenses || []
    },
    enabled: !!familyId,
  })

  return {
    reportSummary: summary.data ?? null,
    categoryReport: categoryReport.data ?? [],
    trendData: trend.data ?? [],
    activities: activities.data ?? [],
    expenses: expenses.data ?? [],
    // isLoading is only true on the very first fetch with NO cached data at all —
    // once anything has been persisted once, this is false immediately on remount,
    // even before the background refetch completes. This is what kills the skeleton flash.
    isLoading: summary.isLoading || categoryReport.isLoading || trend.isLoading || activities.isLoading || expenses.isLoading,
    isFetching: summary.isFetching || categoryReport.isFetching || trend.isFetching,
  }
}

// ── Expenses list (with filters) ────────────────────────────────────────────

export interface ExpenseFilters {
  search?: string
  categoryId?: string
  paidStatus?: 'all' | 'paid' | 'unpaid'
  dateFrom?: string
  dateTo?: string
  amountMin?: number
  amountMax?: number
}

export function useExpensesQuery(filters: ExpenseFilters) {
  const currentFamily = useStore((s) => s.currentFamily)
  const familyId = currentFamily?.id

  return useQuery({
    // Filters are part of the key — different filter combos cache separately,
    // so switching back to "no filters" instantly shows the last unfiltered list
    queryKey: ['expenses', familyId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ familyId: familyId! })
      if (filters.search) params.set('search', filters.search)
      if (filters.categoryId) params.set('categoryId', filters.categoryId)
      if (filters.paidStatus && filters.paidStatus !== 'all') params.set('paidStatus', filters.paidStatus)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.amountMin) params.set('amountMin', String(filters.amountMin))
      if (filters.amountMax) params.set('amountMax', String(filters.amountMax))
      const res = await API(`/api/expenses?${params}`)
      if (!res.ok) throw new Error('Failed to load expenses')
      return res.json()
    },
    enabled: !!familyId,
  })
}

// ── Family (members + family list) ──────────────────────────────────────────

export function useFamilyData() {
  const currentFamily = useStore((s) => s.currentFamily)
  const familyId = currentFamily?.id

  const members = useQuery({
    queryKey: ['family-members', familyId],
    queryFn: async () => {
      const res = await API(`/api/families/${familyId}/members`)
      if (!res.ok) throw new Error('Failed to load members')
      const data = await res.json()
      return data.members || []
    },
    enabled: !!familyId,
  })

  const families = useQuery({
    queryKey: ['families'],
    queryFn: async () => {
      const res = await API('/api/families')
      if (!res.ok) throw new Error('Failed to load families')
      const data = await res.json()
      return data.families || []
    },
  })

  return {
    members: members.data ?? [],
    families: families.data ?? [],
    isLoading: members.isLoading || families.isLoading,
    isFetching: members.isFetching || families.isFetching,
  }
}

// ── Reports (12-month view) ──────────────────────────────────────────────────

export function useReportsData() {
  const currentFamily = useStore((s) => s.currentFamily)
  const familyId = currentFamily?.id

  const summary = useQuery({
    queryKey: ['reports', 'summary', familyId],
    queryFn: async () => {
      const res = await API(`/api/reports/summary?familyId=${familyId}`)
      if (!res.ok) throw new Error('Failed to load summary')
      return res.json()
    },
    enabled: !!familyId,
  })

  const categoryReport = useQuery({
    queryKey: ['reports', 'by-category', familyId],
    queryFn: async () => {
      const res = await API(`/api/reports/by-category?familyId=${familyId}`)
      if (!res.ok) throw new Error('Failed to load category report')
      const data = await res.json()
      return data.categories || []
    },
    enabled: !!familyId,
  })

  const trend = useQuery({
    queryKey: ['reports', 'trend', familyId, 12],
    queryFn: async () => {
      const res = await API(`/api/reports/trend?familyId=${familyId}&months=12`)
      if (!res.ok) throw new Error('Failed to load trend')
      const data = await res.json()
      return data.trend || []
    },
    enabled: !!familyId,
  })

  return {
    reportSummary: summary.data ?? null,
    categoryReport: categoryReport.data ?? [],
    trendData: trend.data ?? [],
    isLoading: summary.isLoading || categoryReport.isLoading || trend.isLoading,
    isFetching: summary.isFetching || categoryReport.isFetching || trend.isFetching,
  }
}

// ── Cache invalidation helpers ────────────────────────────────────────────
// Call these after mutations (create/update/delete expense, etc.) so the
// cached lists refresh. Centralized here so every page invalidates consistently.

export function useInvalidateAfterExpenseChange() {
  const queryClient = useQueryClient()
  const familyId = useStore((s) => s.currentFamily?.id)
  return () => {
    queryClient.invalidateQueries({ queryKey: ['expenses', familyId] })
    queryClient.invalidateQueries({ queryKey: ['reports', 'summary', familyId] })
    queryClient.invalidateQueries({ queryKey: ['reports', 'by-category', familyId] })
    queryClient.invalidateQueries({ queryKey: ['reports', 'trend', familyId] })
    queryClient.invalidateQueries({ queryKey: ['activity', familyId] })
  }
}

export function useInvalidateFamilyData() {
  const queryClient = useQueryClient()
  const familyId = useStore((s) => s.currentFamily?.id)
  return () => {
    queryClient.invalidateQueries({ queryKey: ['family-members', familyId] })
    queryClient.invalidateQueries({ queryKey: ['families'] })
  }
}
