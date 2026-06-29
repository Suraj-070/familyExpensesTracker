'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore, formatCurrency, type Expense } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search,
  Plus,
  Filter,
  X,
  Edit3,
  Trash2,
  CreditCard,
  Eye,
  Receipt,
  SlidersHorizontal,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ExpenseForm } from './expense-form'

export function ExpensesPage() {
  const {
    expenses,
    expenseCount,
    expenseFilters,
    setFilters,
    loadExpenses,
    deleteExpense,
    togglePaidStatus,
    setSelectedExpense,
    selectedExpense,
    categories,
    members,
    navigate,
  } = useStore()

  const [searchInput, setSearchInput] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)

  const debouncedSearch = useCallback(() => {
    const timer = setTimeout(() => {
      setFilters({ search: searchInput || undefined })
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, setFilters])

  useEffect(() => {
    debouncedSearch()
  }, [debouncedSearch])

  useEffect(() => {
    setLoading(true)
    loadExpenses().finally(() => setLoading(false))
  }, [expenseFilters, loadExpenses])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteExpense(deleteId)
      toast.success('Expense deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete expense')
    }
  }

  const handleTogglePaid = async (id: string) => {
    try {
      await togglePaidStatus(id)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilters({
      search: undefined,
      categoryId: undefined,
      paidStatus: undefined,
      paidBy: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      amountMin: undefined,
      amountMax: undefined,
    })
  }

  const hasActiveFilters = Object.values(expenseFilters).some(
    (v) => v !== undefined && v !== '' && v !== 'all'
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm">{expenseCount} total expenses</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          className="lg:hidden"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>
        <Button
          onClick={() => navigate('add-expense')}
          className="hidden lg:inline-flex"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expenses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFilters ? 'default' : 'outline'}
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="Toggle filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <Select
                    value={expenseFilters.categoryId || 'all'}
                    onValueChange={(v) => setFilters({ categoryId: v === 'all' ? undefined : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={expenseFilters.paidStatus || 'all'}
                    onValueChange={(v) => setFilters({ paidStatus: v as 'all' | 'paid' | 'unpaid' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    type="date"
                    value={expenseFilters.dateFrom || ''}
                    onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })}
                    placeholder="From date"
                  />
                  <Input
                    type="date"
                    value={expenseFilters.dateTo || ''}
                    onChange={(e) => setFilters({ dateTo: e.target.value || undefined })}
                    placeholder="To date"
                  />
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3.5 w-3.5 mr-1" />
                      Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-lg mb-1">No expenses found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Start tracking your family expenses'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              Add First Expense
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          {expenses.map((expense, i) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => setDetailExpense(expense)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${expense.category?.color || '#888'}20`,
                        color: expense.category?.color || '#888',
                      }}
                    >
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{expense.title}</p>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${
                            expense.paidStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {expense.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {expense.category?.name || 'Uncategorized'}
                        {expense.paidByName && ` · ${expense.paidByName}`}
                        {' · '}
                        {format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm tabular-nums">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleTogglePaid(expense.id)}
                        title={expense.paidStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedExpense(expense)
                          navigate('edit-expense', expense.id)
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mobile Add FAB */}
      <div className="fixed bottom-6 right-6 lg:hidden z-30">
        <Button
          onClick={() => setShowForm(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Expense Detail Dialog */}
      <Dialog open={!!detailExpense} onOpenChange={() => setDetailExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailExpense?.title}</DialogTitle>
            <DialogDescription>
              {detailExpense && format(new Date(detailExpense.expenseDate), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {detailExpense && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-2xl font-bold">{formatCurrency(detailExpense.amount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Category</span>
                  <p className="font-medium">{detailExpense.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p className="font-medium">
                    <Badge
                      variant={detailExpense.paidStatus === 'paid' ? 'default' : 'secondary'}
                      className={
                        detailExpense.paidStatus === 'paid'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }
                    >
                      {detailExpense.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Paid By</span>
                  <p className="font-medium">{detailExpense.paidByName || '—'}</p>
                </div>
                {detailExpense.dueDate && (
                  <div>
                    <span className="text-muted-foreground">Due Date</span>
                    <p className="font-medium">{format(new Date(detailExpense.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              {detailExpense.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description</span>
                  <p className="text-sm mt-1">{detailExpense.description}</p>
                </div>
              )}
              {detailExpense.notes && (
                <div>
                  <span className="text-muted-foreground text-sm">Notes</span>
                  <p className="text-sm mt-1">{detailExpense.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mobile Expense Form */}
      {showForm && (
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <ExpenseForm onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}