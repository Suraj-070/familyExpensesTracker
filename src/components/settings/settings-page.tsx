'use client'

import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Loader2, Settings, Users, Shield, Trash2, Save, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface Permission {
  id?: string
  role: string
  canAddExpense: boolean
  canEditOwnExpense: boolean
  canEditAllExpenses: boolean
  canDeleteExpense: boolean
  canUploadAttachment: boolean
  canManageCategories: boolean
  canManageRecurring: boolean
  canViewReports: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
}

const DEFAULT_MEMBER_PERMS: Permission = {
  role: 'member',
  canAddExpense: true,
  canEditOwnExpense: true,
  canEditAllExpenses: false,
  canDeleteExpense: false,
  canUploadAttachment: true,
  canManageCategories: false,
  canManageRecurring: false,
  canViewReports: true,
  canInviteMembers: false,
  canRemoveMembers: false,
}

export function SettingsPage() {
  const { currentFamily, members, user, token, updateFamilyName, logout } = useStore()
  const [familyName, setFamilyName] = useState(currentFamily?.name || '')
  const [nameLoading, setNameLoading] = useState(false)
  const [perms, setPerms] = useState<Permission>(DEFAULT_MEMBER_PERMS)
  const [permsLoading, setPermsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deletingFamily, setDeletingFamily] = useState(false)

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin'

  useEffect(() => {
    setFamilyName(currentFamily?.name || '')
  }, [currentFamily?.id, currentFamily?.name])

  useEffect(() => {
    if (!currentFamily || !token) return
    fetch(`/api/permissions?familyId=${currentFamily.id}&role=member`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.permission) setPerms(data.permission)
      })
      .catch(() => {})
  }, [currentFamily, token])

  const copyInviteCode = () => {
    if (!currentFamily?.inviteCode) return
    navigator.clipboard.writeText(currentFamily.inviteCode)
    setCopied(true)
    toast.success('Invite code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const saveFamilyName = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!familyName.trim() || !currentFamily) return
    setNameLoading(true)
    try {
      await updateFamilyName(familyName.trim())
      toast.success('Family name updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setNameLoading(false)
    }
  }

  const savePermissions = async () => {
    if (!currentFamily || !token) return
    setPermsLoading(true)
    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...perms, familyId: currentFamily.id, role: 'member' }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed')
      toast.success('Permissions saved — now actively enforced for all members')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setPermsLoading(false)
    }
  }

  const handleDeleteFamily = async () => {
    if (!currentFamily || !token) return
    setDeletingFamily(true)
    try {
      const res = await fetch(`/api/families/${currentFamily.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete family')
      toast.success('Family deleted')
      // Force a full reload so the store re-initializes against whatever family (if any) remains
      window.location.href = '/'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete family')
      setDeletingFamily(false)
    }
  }

  const togglePerm = (key: keyof Permission) => {
    setPerms((prev) => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  const permRows: { key: keyof Permission; label: string; desc: string }[] = [
    { key: 'canAddExpense', label: 'Add Expenses', desc: 'Members can add new expenses' },
    { key: 'canEditOwnExpense', label: 'Edit Own Expenses', desc: 'Members can edit expenses they added' },
    { key: 'canEditAllExpenses', label: 'Edit All Expenses', desc: 'Members can edit any expense in the family' },
    { key: 'canDeleteExpense', label: 'Delete Expenses', desc: 'Members can delete expenses' },
    { key: 'canUploadAttachment', label: 'Upload Attachments', desc: 'Members can upload receipts and files' },
    { key: 'canManageCategories', label: 'Manage Categories', desc: 'Members can edit/delete categories (their own auto-created ones always allowed)' },
    { key: 'canManageRecurring', label: 'Manage Recurring', desc: 'Members can create/edit recurring expenses' },
    { key: 'canViewReports', label: 'View Reports', desc: 'Members can view financial reports' },
    { key: 'canInviteMembers', label: 'Invite Members', desc: 'Members can invite others to the family' },
    { key: 'canRemoveMembers', label: 'Remove Members', desc: 'Members can remove others from the family' },
  ]

  if (!currentFamily) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>No family selected. Create or join a family first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your family settings and permissions</p>
      </div>

      {/* Family info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Family Settings
          </CardTitle>
          <CardDescription>Basic information about your family group</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={saveFamilyName} className="space-y-3">
            <div className="grid gap-2">
              <Label htmlFor="fam-name">Family Name</Label>
              <Input
                id="fam-name"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                disabled={!isAdmin}
                placeholder="e.g. The Smiths"
              />
            </div>
            {isAdmin && (
              <Button type="submit" size="sm" disabled={nameLoading || familyName.trim() === currentFamily.name}>
                {nameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Name
              </Button>
            )}
          </form>

          <Separator />

          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border bg-muted px-3 py-2 text-sm font-mono tracking-widest">
                {currentFamily.inviteCode}
              </code>
              <Button variant="outline" size="icon" onClick={copyInviteCode}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Share this code with family members to let them join</p>
          </div>
        </CardContent>
      </Card>

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </CardTitle>
          <CardDescription>People in your family group</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-bold">
                    {m.user?.name?.slice(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {m.user?.name || 'Unknown'}
                      {m.userId === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.user?.email}</p>
                  </div>
                </div>
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                  {m.role}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions — admin can edit, members can view what's been granted to them */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Member Permissions
          </CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Control what regular members can do — changes apply immediately and are enforced on every action.'
              : "What you're allowed to do in this family, set by an admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permRows.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={!!perms[key]}
                onCheckedChange={() => togglePerm(key)}
                disabled={!isAdmin}
              />
            </div>
          ))}
          {isAdmin && (
            <>
              <Separator />
              <Button onClick={savePermissions} disabled={permsLoading}>
                {permsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Permissions
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger zone */}
      {isAdmin && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions — proceed with caution</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deletingFamily}>
                  {deletingFamily ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete Family
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete family?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{currentFamily.name}</strong> and all its expenses, categories, recurring bills, and member data. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive hover:bg-destructive/90"
                    onClick={handleDeleteFamily}
                  >
                    Delete Forever
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
