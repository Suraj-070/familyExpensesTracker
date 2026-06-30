'use client'

import { useEffect, useState, useCallback } from 'react'
import { useStore, formatCurrency, type Expense } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Search, Plus, X, Edit3, Trash2, CreditCard, Receipt, SlidersHorizontal,
  CheckCircle2, Clock, FileText,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { ExpenseForm } from './expense-form'

export function ExpensesPage() {
  const {
    expenses, expenseCount, expenseFilters, setFilters, loadExpenses,
    deleteExpense, togglePaidStatus, setSelectedExpense, categories, members, navigate, currentFamily,
  } = useStore()

  const [searchInput, setSearchInput] = useState(expenseFilters.search || '')
  const [showFilters, setShowFilters] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setFilters({ search: searchInput || undefined }), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (!currentFamily) return
    setLoading(true)
    loadExpenses().finally(() => setLoading(false))
  }, [expenseFilters, currentFamily?.id])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeletingId(deleteId)
    try {
      await deleteExpense(deleteId)
      toast.success('Expense deleted')
      setDeleteId(null)
      if (detailExpense?.id === deleteId) setDetailExpense(null)
    } catch {
      toast.error('Failed to delete expense')
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePaid = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setTogglingId(id)
    try {
      await togglePaidStatus(id)
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilters({
      search: undefined, categoryId: undefined, paidStatus: undefined,
      paidBy: undefined, dateFrom: undefined, dateTo: undefined,
      amountMin: undefined, amountMax: undefined,
    })
  }

  const hasActiveFilters = Object.values(expenseFilters).some(
    (v) => v !== undefined && v !== '' && v !== 'all'
  )

  const openEdit = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation()
    setDetailExpense(null)
    setSelectedExpense(expense)
    setEditExpense(expense)
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm">{expenseCount} total</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="hidden lg:inline-flex">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search expenses..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="icon"
          onClick={() => setShowFilters(!showFilters)} aria-label="Filters">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <Card>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={expenseFilters.categoryId || 'all'}
                  onValueChange={(v) => setFilters({ categoryId: v === 'all' ? undefined : v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
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

                <Select value={expenseFilters.paidStatus || 'all'}
                  onValueChange={(v) => setFilters({ paidStatus: v as 'all' | 'paid' | 'unpaid' })}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" value={expenseFilters.dateFrom || ''}
                  onChange={(e) => setFilters({ dateFrom: e.target.value || undefined })} />
                <Input type="date" value={expenseFilters.dateTo || ''}
                  onChange={(e) => setFilters({ dateTo: e.target.value || undefined })} />

                {hasActiveFilters && (
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-3.5 w-3.5 mr-1" />Clear filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-xl" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/25 mb-3" />
          <h3 className="font-semibold text-lg mb-1">No expenses found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Start tracking your family expenses'}
          </p>
          {!hasActiveFilters && (
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4" />Add First Expense
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <AnimatePresence initial={false}>
            {expenses.map((expense, i) => (
              <motion.div key={expense.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.02 }}>
                <Card className="cursor-pointer hover:shadow-md transition-all hover:border-border/80"
                  onClick={() => setDetailExpense(expense)}>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${expense.category?.color || '#888'}18`, color: expense.category?.color || '#888' }}>
                        <Receipt className="h-4.5 w-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm truncate">{expense.title}</p>
                          <Badge variant="secondary" className={`text-[10px] shrink-0 ${expense.paidStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                            {expense.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {expense.category?.name || 'Uncategorized'}
                          {(expense.whoPaid?.name || expense.paidByName) && ` · ${expense.whoPaid?.name || expense.paidByName}`}
                          {' · '}{format(new Date(expense.expenseDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <p className="font-semibold text-sm tabular-nums shrink-0">{formatCurrency(expense.amount)}</p>
                      <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => handleTogglePaid(e, expense.id)}
                          disabled={togglingId === expense.id}
                          title={expense.paidStatus === 'paid' ? 'Mark unpaid' : 'Mark paid'}>
                          <CreditCard className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8"
                          onClick={(e) => openEdit(e, expense)}>
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(expense.id) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-6 lg:hidden z-30">
        <Button onClick={() => setShowAddForm(true)} size="icon"
          className="h-14 w-14 rounded-full shadow-lg shadow-black/20">
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!detailExpense} onOpenChange={() => setDetailExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="truncate">{detailExpense?.title}</DialogTitle>
            <DialogDescription>
              {detailExpense && format(new Date(detailExpense.expenseDate), 'MMMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          {detailExpense && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">Amount</span>
                <span className="text-2xl font-bold tabular-nums">{formatCurrency(detailExpense.amount)}</span>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Category</p>
                  <p className="font-medium">{detailExpense.category?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Status</p>
                  <Badge variant="secondary" className={detailExpense.paidStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}>
                    {detailExpense.paidStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Paid By</p>
                  <p className="font-medium">{detailExpense.whoPaid?.name || detailExpense.paidByName || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Added By</p>
                  <p className="font-medium">{detailExpense.addedBy?.name || '—'}</p>
                </div>
                {detailExpense.dueDate && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Due Date</p>
                    <p className="font-medium">{format(new Date(detailExpense.dueDate), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
              {detailExpense.description && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Description</p>
                  <p className="text-sm">{detailExpense.description}</p>
                </div>
              )}
              {detailExpense.notes && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Notes</p>
                  <p className="text-sm italic text-muted-foreground">{detailExpense.notes}</p>
                </div>
              )}
              {detailExpense.attachments && detailExpense.attachments.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Attachments</p>
                  <div className="space-y-1">
                    {detailExpense.attachments.map((att) => (
                      <a key={att.id} href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline">
                        <FileText className="h-3.5 w-3.5" />
                        {att.fileName}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDetailExpense(null)}>Close</Button>
                <Button className="flex-1" onClick={(e) => openEdit(e, detailExpense)}>
                  <Edit3 className="h-4 w-4" />Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add form dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Record a new family expense</DialogDescription>
          </DialogHeader>
          <ExpenseForm onClose={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit form dialog */}
      <Dialog open={!!editExpense} onOpenChange={(open) => { if (!open) setEditExpense(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update expense details</DialogDescription>
          </DialogHeader>
          <ExpenseForm onClose={() => setEditExpense(null)} editingExpense={editExpense} />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The expense will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
