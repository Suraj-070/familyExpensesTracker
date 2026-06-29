import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/permissions/[id] - Update permissions (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    const existing = await db.permission.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage permissions' }, { status: 403 })
    }

    const updateData: Record<string, boolean> = {}
    const booleans = [
      'canAddExpense', 'canEditOwnExpense', 'canEditAllExpenses',
      'canDeleteExpense', 'canUploadAttachment', 'canManageCategories',
      'canManageRecurring', 'canViewReports', 'canManageSettings',
      'canInviteMembers', 'canRemoveMembers',
    ] as const

    for (const key of booleans) {
      if (body[key] !== undefined) {
        updateData[key] = Boolean(body[key])
      }
    }

    const permission = await db.permission.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ permission })
  } catch (error) {
    console.error('Permission PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}