'use client'

import { useState, useCallback, useEffect } from 'react'
import { useStore, formatCurrency, type Expense } from '@/store'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Receipt, CheckCircle2, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export function SearchPage() {
  const { currentFamily, categories, members, token } = useStore()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [results, setResults] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const doSearch = useCallback(async () => {
    if (!currentFamily) return
    if (!query.trim() && categoryFilter === 'all' && statusFilter === 'all') {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const params = new URLSearchParams({ familyId: currentFamily.id })
      if (query.trim()) params.set('search', query.trim())
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (statusFilter !== 'all') params.set('paidStatus', statusFilter)
      params.set('limit', '100')

      const res = await fetch(`/api/expenses?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const data = await res.json()
        setResults(data.expenses || [])
      }
    } catch {
      //
    } finally {
      setLoading(false)
    }
  }, [query, categoryFilter, statusFilter, currentFamily, token])

  // Debounce
  useEffect(() => {
    const t = setTimeout(doSearch, 350)
    return () => clearTimeout(t)
  }, [doSearch])

  const clear = () => {
    setQuery('')
    setCategoryFilter('all')
    setStatusFilter('all')
    setResults([])
    setSearched(false)
  }

  const hasFilters = query || categoryFilter !== 'all' || statusFilter !== 'all'

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground text-sm mt-1">Search expenses by title, notes, or description</p>
      </div>

      {/* Search bar + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 h-11"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-9">
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No results found</p>
          <p className="text-sm mt-1">Try different keywords or clear filters</p>
        </div>
      )}

      {!loading && !searched && (
        <div className="text-center py-16 text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Start typing to search expenses</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          <AnimatePresence>
            {results.map((expense, i) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{expense.title}</p>
                          {expense.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{expense.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {expense.category && (
                              <span
                                className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                                style={{
                                  backgroundColor: expense.category.color + '20',
                                  color: expense.category.color,
                                }}
                              >
                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: expense.category.color }} />
                                {expense.category.name}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                            </span>
                            {expense.whoPaid && (
                              <span className="text-xs text-muted-foreground">
                                Paid by {expense.whoPaid.name}
                              </span>
                            )}
                          </div>
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic truncate">"{expense.notes}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-bold text-base">{formatCurrency(expense.amount)}</span>
                        <Badge
                          variant={expense.paidStatus === 'paid' ? 'default' : 'secondary'}
                          className={`text-xs ${expense.paidStatus === 'paid' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15' : ''}`}
                        >
                          {expense.paidStatus === 'paid' ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Paid</>
                          ) : (
                            <><Clock className="h-3 w-3 mr-1" />Unpaid</>
                          )}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
