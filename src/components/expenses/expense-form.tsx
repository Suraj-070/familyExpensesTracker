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
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog'
import { Loader2, Upload, X, FileText, ZoomIn } from 'lucide-react'
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

/** Thumbnail tile for an already-uploaded attachment — shows a real image
 * preview if it's a photo, or a file icon for PDFs. Click to enlarge images. */
function AttachmentThumb({
  fileUrl, fileType, fileName, fileSize, onRemove, onZoom,
}: {
  fileUrl: string; fileType: string; fileName: string; fileSize: number
  onRemove: () => void; onZoom?: () => void
}) {
  const isImage = fileType.startsWith('image/')
  return (
    <div className="group relative h-20 w-20 shrink-0 rounded-lg border overflow-hidden bg-muted">
      {isImage ? (
        <button
          type="button"
          onClick={onZoom}
          className="block h-full w-full"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL, not a local asset */}
          <img src={fileUrl} alt={fileName} className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </button>
      ) : (
        <a
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center"
        >
          <FileText className="h-6 w-6 text-red-500" />
          <span className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">{fileName}</span>
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        aria-label="Remove attachment"
      >
        <X className="h-3 w-3" />
      </button>
      <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] text-white text-center">
        {formatBytes(fileSize)}
      </span>
    </div>
  )
}

/** Same tile but for a File object that hasn't been uploaded yet — generates
 * a local object URL preview so the user sees the actual photo before upload completes. */
function PendingThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isImage])

  return (
    <div className="group relative h-20 w-20 shrink-0 rounded-lg border border-dashed overflow-hidden bg-muted/50">
      {isImage && previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local blob URL preview, not a static asset
        <img src={previewUrl} alt={file.name} className="h-full w-full object-cover opacity-80" />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-center">
          <FileText className="h-6 w-6 text-red-400" />
          <span className="text-[9px] text-muted-foreground line-clamp-2 leading-tight">{file.name}</span>
        </div>
      )}
      <div className="absolute inset-x-0 top-0 bg-amber-500/90 text-center text-[8px] font-medium text-white py-0.5">
        PENDING
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
        aria-label="Remove file"
      >
        <X className="h-3 w-3" />
      </button>
      <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-[9px] text-white text-center">
        {formatBytes(file.size)}
      </span>
    </div>
  )
}

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
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)
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
    setUploadProgress({ done: 0, total: pendingFiles.length })
    let done = 0
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
        } else {
          const result = await res.json()
          if (result.attachment) {
            setAttachments(prev => [...prev, result.attachment])
          }
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`)
      }
      done += 1
      setUploadProgress({ done, total: pendingFiles.length })
    }
    setPendingFiles([])
    setUploading(false)
    setUploadProgress(null)
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
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Failed to remove attachment')
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

      {/* Attachments — now with real thumbnail previews instead of plain filename links */}
      <div className="grid gap-2">
        <Label>Attachments</Label>

        {(attachments.length > 0 || pendingFiles.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <AttachmentThumb
                key={att.id}
                fileUrl={att.fileUrl}
                fileType={att.fileType}
                fileName={att.fileName}
                fileSize={att.fileSize}
                onRemove={() => deleteAttachment(att.id)}
                onZoom={() => setZoomedImage(att.fileUrl)}
              />
            ))}
            {pendingFiles.map((file, idx) => (
              <PendingThumb
                key={idx}
                file={file}
                onRemove={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        )}

        <div
          className="flex items-center justify-center rounded-lg border border-dashed p-4 cursor-pointer hover:bg-accent/40 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="text-center space-y-1">
            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Click to upload receipt photos or PDFs (max 10MB)</p>
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

        {/* Upload progress — replaces the old generic "Uploading..." text-only state */}
        {uploadProgress && (
          <div className="space-y-1">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
              Uploading {uploadProgress.done} of {uploadProgress.total}
            </p>
          </div>
        )}
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

      {/* Lightbox — click any image thumbnail to view full size */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => { if (!open) setZoomedImage(null) }}>
        <DialogContent className="max-w-2xl p-2">
          {zoomedImage && (
            // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URL
            <img src={zoomedImage} alt="Attachment preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </form>
  )
}
