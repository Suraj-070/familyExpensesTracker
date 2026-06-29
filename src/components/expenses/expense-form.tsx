'use client'

import { useState, useEffect } from 'react'
import { useStore, formatCurrency } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'

interface ExpenseFormProps {
  onClose?: () => void
}

export function ExpenseForm({ onClose }: ExpenseFormProps) {
  const {
    selectedExpense,
    currentPage,
    editingExpenseId,
    categories,
    members,
    user,
    createExpense,
    updateExpense,
    loadCategories,
    navigate,
  } = useStore()

  const isEditing = currentPage === 'edit-expense' && editingExpenseId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [paidStatus, setPaidStatus] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  useEffect(() => {
    if (isEditing && selectedExpense) {
      setTitle(selectedExpense.title)
      setDescription(selectedExpense.description || '')
      setAmount(String(selectedExpense.amount))
      setExpenseDate(selectedExpense.expenseDate.split('T')[0])
      setDueDate(selectedExpense.dueDate?.split('T')[0] || '')
      setCategoryId(selectedExpense.categoryId)
      setPaidBy(selectedExpense.paidBy || '')
      setPaidStatus(selectedExpense.paidStatus === 'paid')
      setNotes(selectedExpense.notes || '')
    } else {
      setExpenseDate(new Date().toISOString().split('T')[0])
      if (user) setPaidBy(user.id)
    }
  }, [isEditing, selectedExpense, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    if (!expenseDate) {
      toast.error('Expense date is required')
      return
    }

    setLoading(true)
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: parseFloat(amount),
        expenseDate,
        dueDate: dueDate || undefined,
        categoryId: categoryId || undefined,
        paidBy: paidBy || undefined,
        paidStatus: paidStatus ? 'paid' as const : 'unpaid' as const,
        notes: notes.trim() || undefined,
      }

      if (isEditing && editingExpenseId) {
        await updateExpense(editingExpenseId, data)
        toast.success('Expense updated')
      } else {
        await createExpense(data)
        toast.success('Expense added')
      }
      onClose?.()
      if (!isEditing) {
        navigate('expenses')
      } else {
        navigate('expenses')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="exp-title">Title *</Label>
        <Input
          id="exp-title"
          placeholder="e.g., Grocery shopping"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="exp-desc">Description</Label>
        <Input
          id="exp-desc"
          placeholder="Brief description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="exp-amount">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input
              id="exp-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-7"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp-date">Date *</Label>
          <Input
            id="exp-date"
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full inline-block"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Due Date</Label>
          <Input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Paid By</Label>
        <Select value={paidBy} onValueChange={setPaidBy}>
          <SelectTrigger>
            <SelectValue placeholder="Who paid?" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>
                {m.user?.name || m.userId}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between rounded-lg border p-3">
        <div>
          <Label htmlFor="exp-paid" className="cursor-pointer">Mark as Paid</Label>
          <p className="text-xs text-muted-foreground">Toggle the payment status</p>
        </div>
        <Switch
          id="exp-paid"
          checked={paidStatus}
          onCheckedChange={setPaidStatus}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="exp-notes">Notes</Label>
        <Textarea
          id="exp-notes"
          placeholder="Additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* File Upload (UI only) */}
      <div className="grid gap-2">
        <Label>Receipt</Label>
        <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-center cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="space-y-1">
            <Upload className="h-6 w-6 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Click to upload receipt (coming soon)
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEditing ? 'Update Expense' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}