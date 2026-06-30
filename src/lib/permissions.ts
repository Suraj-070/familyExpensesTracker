import { db } from '@/lib/db'

export interface PermissionFlags {
  canAddExpense: boolean
  canEditOwnExpense: boolean
  canEditAllExpenses: boolean
  canDeleteExpense: boolean
  canUploadAttachment: boolean
  canManageCategories: boolean
  canManageRecurring: boolean
  canViewReports: boolean
  canManageSettings: boolean
  canInviteMembers: boolean
  canRemoveMembers: boolean
}

const ADMIN_DEFAULTS: PermissionFlags = {
  canAddExpense: true,
  canEditOwnExpense: true,
  canEditAllExpenses: true,
  canDeleteExpense: true,
  canUploadAttachment: true,
  canManageCategories: true,
  canManageRecurring: true,
  canViewReports: true,
  canManageSettings: true,
  canInviteMembers: true,
  canRemoveMembers: true,
}

const MEMBER_DEFAULTS: PermissionFlags = {
  canAddExpense: true,
  canEditOwnExpense: true,
  canEditAllExpenses: false,
  canDeleteExpense: false,
  canUploadAttachment: true,
  canManageCategories: false,
  canManageRecurring: false,
  canViewReports: true,
  canManageSettings: false,
  canInviteMembers: false,
  canRemoveMembers: false,
}

/**
 * Resolves the membership + effective permission flags for a user in a family.
 * Admins always get full access regardless of stored Permission row (safety net —
 * an admin should never be able to lock themselves out by misconfiguring permissions).
 * Returns null if the user is not a member of the family.
 */
export async function getMembershipAndPermissions(
  familyId: string,
  userId: string
): Promise<{ role: 'admin' | 'member'; permissions: PermissionFlags } | null> {
  const membership = await db.familyMember.findUnique({
    where: { familyId_userId: { familyId, userId } },
  })
  if (!membership) return null

  if (membership.role === 'admin') {
    return { role: 'admin', permissions: ADMIN_DEFAULTS }
  }

  const stored = await db.permission.findUnique({
    where: { familyId_role: { familyId, role: 'member' } },
  })

  const permissions: PermissionFlags = stored
    ? {
        canAddExpense: stored.canAddExpense,
        canEditOwnExpense: stored.canEditOwnExpense,
        canEditAllExpenses: stored.canEditAllExpenses,
        canDeleteExpense: stored.canDeleteExpense,
        canUploadAttachment: stored.canUploadAttachment,
        canManageCategories: stored.canManageCategories,
        canManageRecurring: stored.canManageRecurring,
        canViewReports: stored.canViewReports,
        canManageSettings: stored.canManageSettings,
        canInviteMembers: stored.canInviteMembers,
        canRemoveMembers: stored.canRemoveMembers,
      }
    : MEMBER_DEFAULTS

  return { role: 'member', permissions }
}

/**
 * Convenience check: can this user edit/delete a specific expense?
 * Accounts for "own expense" vs "any expense" permission distinction.
 */
export function canModifyExpense(
  role: 'admin' | 'member',
  permissions: PermissionFlags,
  action: 'edit' | 'delete',
  isOwnExpense: boolean
): boolean {
  if (role === 'admin') return true
  if (action === 'edit') {
    if (permissions.canEditAllExpenses) return true
    if (isOwnExpense && permissions.canEditOwnExpense) return true
    return false
  }
  // delete
  return permissions.canDeleteExpense
}
