'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus, Edit3, Trash2, Tag, Lock,
  UtensilsCrossed, Home, Zap, Droplets, Wifi, GraduationCap, Pencil,
  Stethoscope, Car, Film, ShoppingCart, Shirt, Plane, Gift, Coffee,
  Dumbbell, PawPrint, Smartphone, Wrench,
} from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

const COLOR_OPTIONS = [
  '#10b981', '#059669', '#14b8a6', '#06b6d4',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
  '#8b5cf6', '#6366f1', '#3b82f6', '#84cc16',
]

// Maps the icon key stored in the DB to an actual lucide-react component.
// Previously every category rendered a generic Tag icon regardless of this
// value (#29) — this map plus the picker below makes the field meaningful.
const ICON_MAP: Record<string, typeof Tag> = {
  'tag': Tag,
  'utensils': UtensilsCrossed,
  'home': Home,
  'zap': Zap,
  'droplets': Droplets,
  'wifi': Wifi,
  'graduation-cap': GraduationCap,
  'pencil': Pencil,
  'stethoscope': Stethoscope,
  'car': Car,
  'film': Film,
  'shopping-cart': ShoppingCart,
  'shirt': Shirt,
  'plane': Plane,
  'gift': Gift,
  'coffee': Coffee,
  'dumbbell': Dumbbell,
  'paw-print': PawPrint,
  'smartphone': Smartphone,
  'wrench': Wrench,
}

const ICON_OPTIONS = Object.keys(ICON_MAP)

function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] || Tag
  return <Icon className={className} />
}

export function CategoriesPage() {
  const { categories, loadCategories, createCategory, updateCategory, deleteCategory, members, user } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formName, setFormName] = useState('')
  const [formIcon, setFormIcon] = useState('tag')
  const [formColor, setFormColor] = useState('#10b981')

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin'

  useEffect(() => {
    setLoading(true)
    loadCategories().finally(() => setLoading(false))
  }, [loadCategories])

  const canManage = (cat: { isDefault: boolean; createdBy?: string | null }) => {
    if (cat.isDefault) return isAdmin
    return isAdmin || cat.createdBy === user?.id
  }

  const openCreate = () => {
    setEditId(null)
    setFormName('')
    setFormIcon('tag')
    setFormColor('#10b981')
    setShowForm(true)
  }

  const openEdit = (cat: { id: string; name: string; icon: string; color: string }) => {
    setEditId(cat.id)
    setFormName(cat.name)
    setFormIcon(cat.icon)
    setFormColor(cat.color)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Category name is required')
      return
    }
    setSaving(true)
    try {
      if (editId) {
        await updateCategory(editId, { name: formName.trim(), icon: formIcon, color: formColor })
        toast.success('Category updated')
      } else {
        await createCategory({ name: formName.trim(), icon: formIcon, color: formColor })
        toast.success('Category created')
      }
      setShowForm(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteCategory(deleteId)
      toast.success('Category deleted')
      setDeleteId(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete category')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground text-sm">Organize your expenses</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-lg mb-1">No categories yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create categories to organize expenses</p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <AnimatePresence>
            {categories.map((cat, i) => (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className="hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                      >
                        <CategoryIcon icon={cat.icon} className="h-5 w-5" />
                      </div>
                      {cat.isDefault && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{cat.name}</p>
                      {canManage(cat) && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteId(cat.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full overflow-hidden bg-muted">
                      <div className="h-full rounded-full" style={{ backgroundColor: cat.color, width: '100%' }} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Category Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Category' : 'New Category'}</DialogTitle>
            <DialogDescription>
              {editId ? 'Update the category details' : 'Create a new expense category'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="Category name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid gap-2">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((iconKey) => {
                  const Icon = ICON_MAP[iconKey]
                  const isSelected = formIcon === iconKey
                  return (
                    <button
                      key={iconKey}
                      type="button"
                      onClick={() => setFormIcon(iconKey)}
                      className={`h-9 w-9 rounded-lg flex items-center justify-center transition-all border ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary scale-105'
                          : 'border-transparent bg-muted text-muted-foreground hover:bg-accent hover:scale-105'
                      }`}
                      title={iconKey}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormColor(color)}
                    className={`h-8 w-8 rounded-full transition-all ${
                      formColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Live preview */}
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${formColor}20`, color: formColor }}
              >
                <CategoryIcon icon={formIcon} className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{formName || 'Category name'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Expenses with this category will become uncategorized.
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
    </div>
  )
}
