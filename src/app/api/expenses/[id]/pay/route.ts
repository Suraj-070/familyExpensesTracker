import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PATCH /api/expenses/[id]/pay - Toggle paid/unpaid
export async function PATCH(
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
    const { paidStatus } = body

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const newStatus = paidStatus === 'paid' ? 'paid' : 'unpaid'

    const expense = await db.$transaction(async (tx) => {
      const e = await tx.expense.update({
        where: { id },
        data: {
          paidStatus: newStatus,
          paidDate: newStatus === 'paid' ? new Date() : null,
        },
        include: {
          category: true,
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'expense_paid',
          entityType: 'expense',
          entityId: id,
          details: `Marked "${existing.title}" as ${newStatus}`,
        },
      })

      return e
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Expense pay PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
