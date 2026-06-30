'use client'

import { useEffect, useState } from 'react'
import { useStore, formatCurrency } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
  DialogFooter,
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
import {
  Plus,
  Edit3,
  Trash2,
  Repeat,
  CalendarClock,
  Loader2,
  Pause,
  Play,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

export function RecurringPage() {
  const {
    recurringExpenses,
    categories,
    members,
    user,
    loadRecurringExpenses,
    loadCategories,
    createRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
  } = useStore()

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [categoryId, setCategoryId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [saving, setSaving] = useState(false)

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin'

  const { currentFamily: cf } = useStore()

  useEffect(() => {
    if (!cf) return
    setLoading(true)
    Promise.all([loadRecurringExpenses(), loadCategories()]).finally(() => setLoading(false))
  }, [cf?.id])

  const resetForm = () => {
    setTitle('')
    setAmount('')
    setFrequency('monthly')
    setCategoryId('')
    setStartDate(new Date().toISOString().split('T')[0])
    setEndDate('')
    setPaidBy('')
    setEditId(null)
  }

  const openCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const openEdit = (r: typeof recurringExpenses[0]) => {
    setEditId(r.id)
    setTitle(r.title)
    setAmount(String(r.amount))
    setFrequency(r.frequency)
    setCategoryId(r.categoryId)
    setStartDate(r.startDate.split('T')[0])
    setEndDate(r.endDate?.split('T')[0] || '')
    setPaidBy(r.paidBy || '')
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!title.trim() || !amount || Number(amount) <= 0) {
      toast.error('Please fill in title and amount')
      return
    }
    setSaving(true)
    try {
      const data = {
        title: title.trim(),
        amount: parseFloat(amount),
        frequency,
        categoryId: categoryId || undefined,
        startDate,
        endDate: endDate || undefined,
        // paidBy removed — not in schema (use createdBy instead)
      }
      if (editId) {
        await updateRecurringExpense(editId, data)
        toast.success('Recurring expense updated')
      } else {
        await createRecurringExpense(data)
        toast.success('Recurring expense created')
      }
      setShowForm(false)
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteRecurringExpense(deleteId)
      toast.success('Recurring expense deleted')
      setDeleteId(null)
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await updateRecurringExpense(id, { isActive: !isActive })
      toast.success(isActive ? 'Paused' : 'Activated')
    } catch {
      toast.error('Failed to update')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Expenses</h1>
          <p className="text-muted-foreground text-sm">Manage your recurring bills</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Add Recurring
          </Button>
        )}
      </div>

      {recurringExpenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Repeat className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-lg mb-1">No recurring expenses</h3>
          <p className="text-sm text-muted-foreground mb-4">Set up recurring bills to never miss a payment</p>
          {isAdmin && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create Recurring Expense
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence>
            {recurringExpenses.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={`transition-all ${!r.isActive ? 'opacity-60' : 'hover:shadow-md'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Repeat className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{r.title}</p>
                          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                            {r.frequency}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] shrink-0 ${
                              r.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {r.isActive ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.category?.name || 'Uncategorized'}
                          {r.nextDueDate && ` · Next: ${format(new Date(r.nextDueDate), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      <p className="font-semibold text-sm tabular-nums shrink-0">
                        {formatCurrency(r.amount)}
                      </p>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleActive(r.id, r.isActive)}
                          >
                            {r.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(r)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Recurring Expense' : 'New Recurring Expense'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update the recurring expense' : 'Set up a new recurring bill'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="rec-title">Title</Label>
              <Input id="rec-title" placeholder="e.g., Netflix subscription" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rec-amount">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input id="rec-amount" type="number" step="0.01" min="0" placeholder="0.00" className="pl-7" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as 'weekly' | 'monthly' | 'yearly')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="rec-start">Start Date</Label>
                <Input id="rec-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rec-end">End Date (optional)</Label>
                <Input id="rec-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Paid By</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger><SelectValue placeholder="Who pays?" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.userId} value={m.userId}>{m.user?.name || m.userId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Expense</AlertDialogTitle>
            <AlertDialogDescription>This will remove the recurring schedule. Existing expenses will not be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}