'use client'

import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Users,
  Copy,
  UserPlus,
  Shield,
  ShieldCheck,
  Crown,
  Trash2,
  Loader2,
  Link2,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { motion } from 'framer-motion'

export function FamilyPage() {
  const {
    currentFamily,
    families,
    members,
    user,
    loadMembers,
    loadFamilies,
    createFamily,
    joinFamily,
    removeMember,
    updateMemberRole,
  } = useStore()

  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [familyName, setFamilyName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [removeId, setRemoveId] = useState<string | null>(null)

  const isAdmin = members.find((m) => m.userId === user?.id)?.role === 'admin'

  useEffect(() => {
    setLoading(true)
    Promise.all([loadFamilies(), loadMembers()]).finally(() => setLoading(false))
  }, [loadFamilies, loadMembers])

  const handleCreate = async () => {
    if (!familyName.trim()) {
      toast.error('Family name is required')
      return
    }
    setSaving(true)
    try {
      await createFamily(familyName.trim())
      toast.success('Family created!')
      setShowCreate(false)
      setFamilyName('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create family')
    } finally {
      setSaving(false)
    }
  }

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      toast.error('Invite code is required')
      return
    }
    setSaving(true)
    try {
      await joinFamily(inviteCode.trim())
      toast.success('Joined family!')
      setShowJoin(false)
      setInviteCode('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join family')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyCode = () => {
    if (currentFamily?.inviteCode) {
      navigator.clipboard.writeText(currentFamily.inviteCode)
      setCopied(true)
      toast.success('Invite code copied!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRemove = async () => {
    if (!removeId) return
    try {
      await removeMember(removeId)
      toast.success('Member removed')
      setRemoveId(null)
    } catch {
      toast.error('Failed to remove member')
    }
  }

  const handleChangeRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      await updateMemberRole(userId, role)
      toast.success('Role updated')
    } catch {
      toast.error('Failed to update role')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  if (!currentFamily) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Family</h1>
          <p className="text-muted-foreground text-sm">Create or join a family group</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mt-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="cursor-pointer hover:shadow-md transition-all h-full" onClick={() => setShowCreate(true)}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
                  <Crown className="h-7 w-7" />
                </div>
                <h3 className="font-semibold">Create a Family</h3>
                <p className="text-sm text-muted-foreground">Start a new family group and invite members</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="cursor-pointer hover:shadow-md transition-all h-full" onClick={() => setShowJoin(true)}>
              <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400 flex items-center justify-center">
                  <UserPlus className="h-7 w-7" />
                </div>
                <h3 className="font-semibold">Join a Family</h3>
                <p className="text-sm text-muted-foreground">Enter an invite code to join an existing family</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Family</DialogTitle>
              <DialogDescription>Give your family group a name</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="fam-name">Family Name</Label>
              <Input id="fam-name" placeholder="e.g., Johnson Family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Join Dialog */}
        <Dialog open={showJoin} onOpenChange={setShowJoin}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Join Family</DialogTitle>
              <DialogDescription>Enter the invite code from the family admin</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input id="invite-code" placeholder="Enter invite code" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className="font-mono tracking-wider" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowJoin(false)}>Cancel</Button>
              <Button onClick={handleJoin} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Join
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Family</h1>
        <p className="text-muted-foreground text-sm">Manage your family group</p>
      </div>

      {/* Family Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0">
              <Users className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{currentFamily.name}</h2>
              <p className="text-sm text-muted-foreground">
                {members.length} member{members.length !== 1 ? 's' : ''} · Created {format(new Date(currentFamily.createdAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div>
            <p className="text-sm font-medium mb-2">Invite Code</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-lg border bg-muted/50 px-4 py-2.5 font-mono text-sm tracking-wider font-semibold">
                {currentFamily.inviteCode}
              </div>
              <Button variant="outline" onClick={handleCopyCode}>
                {copied ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Share this code with family members to invite them
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-2">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                  {member.user?.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">
                      {member.user?.name || member.userId}
                      {member.userId === user?.id && (
                        <span className="text-muted-foreground font-normal"> (you)</span>
                      )}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] shrink-0 ${
                        member.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : ''
                      }`}
                    >
                      {member.role === 'admin' ? (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Admin
                        </span>
                      ) : (
                        'Member'
                      )}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user?.email || ''}
                  </p>
                </div>
                {isAdmin && member.userId !== user?.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleChangeRole(member.userId, v as 'admin' | 'member')}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRemoveId(member.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Other Families */}
      {families.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Your Families</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-2">
              {families.map((fam) => (
                <button
                  key={fam.id}
                  onClick={() => useStore.getState().selectFamily(fam)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                    fam.id === currentFamily.id ? 'border-primary bg-accent/30' : ''
                  }`}
                >
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{fam.name}</span>
                  {fam.id === currentFamily.id && (
                    <Badge variant="default" className="text-[10px] ml-auto">Active</Badge>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Remove Confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={() => setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              This member will be removed from the family. Their expenses will remain but they will lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}