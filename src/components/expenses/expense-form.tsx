'use client'

import { useState, useEffect, useRef } from 'react'
import { useStore, type Expense } from '@/store'
import { useInvalidateAfterExpenseChange } from '@/hooks/use-queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, X, FileText, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface UploadedAttachment {
  id: string; fileName: string; fileUrl: string; fileType: string; fileSize: number
}

interface ExpenseFormProps {
  onClose?: () => void
  editingExpense?: Expense | null
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const AUTO_COLORS = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1',
  '#14b8a6', '#3b82f6', '#84cc16', '#64748b',
]

export function ExpenseForm({ onClose, editingExpense }: ExpenseFormProps) {
  const {
    categories, members, user, createExpense, updateExpense,
    createCategory, token,
  } = useStore()
  const invalidateExpenses = useInvalidateAfterExpenseChange()

  const isEditing = !!editingExpense

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [whoPaidId, setWhoPaidId] = useState('')
  const [paidStatus, setPaidStatus] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const [attachments, setAttachments] = useState<UploadedAttachment[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && editingExpense) {
      setTitle(editingExpense.title)
      setDescription(editingExpense.description || '')
      setAmount(String(editingExpense.amount))
      setExpenseDate(editingExpense.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0])
      setDueDate(editingExpense.dueDate?.split('T')[0] || '')
      setCategoryInput(editingExpense.category?.name || '')
      setWhoPaidId(editingExpense.whoPaidId || editingExpense.whoPaid?.id || '')
      setPaidStatus(editingExpense.paidStatus === 'paid')
      setNotes(editingExpense.notes || '')
      setAttachments(editingExpense.attachments || [])
    } else {
      setTitle('')
      setDescription('')
      setAmount('')
      setExpenseDate(new Date().toISOString().split('T')[0])
      setDueDate('')
      setCategoryInput('')
      setWhoPaidId(user?.id || '')
      setPaidStatus(false)
      setNotes('')
      setAttachments([])
      setPendingFiles([])
    }
  }, [editingExpense?.id, isEditing])

  // Resolve category name → id. Uses the API response directly (no re-fetch race).
  const resolveCategoryId = async (name: string): Promise<string | undefined> => {
    const trimmed = name.trim()
    if (!trimmed) return undefined

    const existing = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (existing) return existing.id

    const color = AUTO_COLORS[Math.floor(Math.random() * AUTO_COLORS.length)]
    const created = await createCategory({ name: trimmed, icon: 'tag', color })
    // createCategory throws on failure (caught by handleSubmit), returns {id,...} on success
    return created?.id
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const valid = files.filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'].includes(f.type)) {
        toast.error(`${f.name}: only images/PDFs allowed`); return false
      }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: max 10MB`); return false }
      return true
    })
    setPendingFiles(prev => [...prev, ...valid])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadFiles = async (expenseId: string) => {
    if (pendingFiles.length === 0) return
    setUploading(true)
    for (const file of pendingFiles) {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('expenseId', expenseId)
      try {
        const res = await fetch('/api/attachments', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(`Upload failed: ${err.error || file.name}`)
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    setPendingFiles([])
    setUploading(false)
  }

  const deleteAttachment = async (id: string) => {
    try {
      const res = await fetch(`/api/attachments?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a.id !== id))
        toast.success('Attachment removed')
      }
    } catch { toast.error('Failed to remove') }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('Title is required'); return }
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    if (!expenseDate) { toast.error('Date is required'); return }

    setLoading(true)
    try {
      let categoryId: string | undefined
      try {
        categoryId = await resolveCategoryId(categoryInput)
      } catch (catErr) {
        // Category creation failed — surface it clearly, don't silently continue
        toast.error(catErr instanceof Error ? catErr.message : 'Failed to create category')
        setLoading(false)
        return
      }

      const data = {
        title: title.trim(),
        description: description.trim() || undefined,
        amount: parseFloat(amount),
        expenseDate,
        dueDate: dueDate || undefined,
        categoryId,
        whoPaidId: whoPaidId || undefined,
        paidStatus: paidStatus ? 'paid' as const : 'unpaid' as const,
        notes: notes.trim() || undefined,
      }

      if (isEditing && editingExpense) {
        await updateExpense(editingExpense.id, data)
        if (pendingFiles.length > 0) await uploadFiles(editingExpense.id)
        invalidateExpenses()
        toast.success('Expense updated')
      } else {
        const newId = await createExpense(data)
        if (newId && pendingFiles.length > 0) await uploadFiles(newId)
        invalidateExpenses()
        toast.success('Expense added')
      }
      onClose?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
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
          placeholder="e.g. Grocery shopping"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="exp-desc">Description</Label>
        <Input
          id="exp-desc"
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="exp-amount">Amount *</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">Rs.</span>
            <Input
              id="exp-amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="pl-10"
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
          <Label htmlFor="exp-category">
            Category
            {categoryInput.trim() &&
              !categories.find(c => c.name.toLowerCase() === categoryInput.trim().toLowerCase()) && (
              <span className="ml-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                + will be created
              </span>
            )}
          </Label>
          <Input
            id="exp-category"
            list="category-options"
            placeholder="Type or pick..."
            value={categoryInput}
            onChange={(e) => setCategoryInput(e.target.value)}
            autoComplete="off"
          />
          <datalist id="category-options">
            {categories.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exp-due">Due Date</Label>
          <Input
            id="exp-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Paid By</Label>
        <Select value={whoPaidId} onValueChange={setWhoPaidId}>
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
          <p className="text-xs text-muted-foreground">Toggle payment status</p>
        </div>
        <Switch id="exp-paid" checked={paidStatus} onCheckedChange={setPaidStatus} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="exp-notes">Notes</Label>
        <Textarea
          id="exp-notes"
          placeholder="Additional notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid gap-2">
        <Label>Attachments</Label>

        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                {att.fileType.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-500" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="flex-1 truncate hover:underline text-primary text-xs">
                  {att.fileName}
                </a>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(att.fileSize)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => deleteAttachment(att.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {pendingFiles.length > 0 && (
          <div className="space-y-1.5">
            {pendingFiles.map((file, idx) => (
              <div key={idx} className="flex items-center gap-2 rounded-lg border border-dashed p-2 bg-muted/30">
                {file.type.startsWith('image/') ? (
                  <ImageIcon className="h-4 w-4 shrink-0 text-blue-400" />
                ) : (
                  <FileText className="h-4 w-4 shrink-0 text-red-400" />
                )}
                <span className="flex-1 truncate text-xs">{file.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                  onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div
          className="flex items-center justify-center rounded-lg border border-dashed p-4 cursor-pointer hover:bg-accent/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center space-y-1">
            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Click to upload images or PDFs (max 10MB)</p>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      <div className="flex gap-2 pt-1">
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading || uploading} className="flex-1">
          {(loading || uploading) && <Loader2 className="h-4 w-4 animate-spin" />}
          {uploading ? 'Uploading...' : isEditing ? 'Update' : 'Add Expense'}
        </Button>
      </div>
    </form>
  )
}
