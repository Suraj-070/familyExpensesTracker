import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'
import { getMembershipAndPermissions } from '@/lib/permissions'

// GET /api/recurring/[id] - Fetch one + count of expenses generated from it (#36 audit trail)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const recurring = await db.recurringExpense.findUnique({
      where: { id },
      include: {
        category: true,
        creator: { select: { id: true, name: true, avatarUrl: true } },
        whoPaid: { select: { id: true, name: true, avatarUrl: true } },
      },
    })
    if (!recurring) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: recurring.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    // Generated expenses are linked by matching title + category within this family.
    // (No direct FK exists from Expense -> RecurringExpense in the schema, so we match
    // on the recurring rule's title as a best-effort audit trail.)
    const generatedExpenses = await db.expense.findMany({
      where: { familyId: recurring.familyId, title: recurring.title },
      select: { id: true, expenseDate: true, amount: true, paidStatus: true },
      orderBy: { expenseDate: 'desc' },
      take: 20,
    })

    return NextResponse.json({ recurring, generatedExpenses })
  } catch (error) {
    console.error('Recurring GET [id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/recurring/[id] - Update recurring expense (requires canManageRecurring)
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

    const existing = await db.recurringExpense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    const access = await getMembershipAndPermissions(existing.familyId, auth.userId)
    if (!access) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }
    if (!access.permissions.canManageRecurring) {
      return NextResponse.json({ error: 'You do not have permission to manage recurring expenses' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.whoPaidId !== undefined) updateData.whoPaidId = body.whoPaidId || null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const recurring = await db.$transaction(async (tx) => {
      const r = await tx.recurringExpense.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          creator: { select: { id: true, name: true, avatarUrl: true } },
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      // Distinguish pause/resume from a regular edit in the activity log (#37)
      const isToggleOnly = Object.keys(body).length === 1 && body.isActive !== undefined
      const details = isToggleOnly
        ? (body.isActive
            ? `Resumed recurring expense "${existing.title}" — future bills will generate again`
            : `Paused recurring expense "${existing.title}" — no new bills will generate until resumed. Past bills are unaffected.`)
        : `Updated recurring expense "${existing.title}"`

      await tx.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: isToggleOnly ? (body.isActive ? 'recurring_resumed' : 'recurring_paused') : 'recurring_updated',
          entityType: 'recurring',
          entityId: id,
          details,
        },
      })

      return r
    })

    return NextResponse.json({ recurring })
  } catch (error) {
    console.error('Recurring PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/recurring/[id] - Delete recurring expense (requires canManageRecurring)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await db.recurringExpense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 })
    }

    const access = await getMembershipAndPermissions(existing.familyId, auth.userId)
    if (!access) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }
    if (!access.permissions.canManageRecurring) {
      return NextResponse.json({ error: 'You do not have permission to manage recurring expenses' }, { status: 403 })
    }

    await db.$transaction([
      db.recurringExpense.delete({ where: { id } }),
      db.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'recurring_deleted',
          entityType: 'recurring',
          entityId: id,
          details: `Deleted recurring expense "${existing.title}"`,
        },
      }),
    ])

    return NextResponse.json({ message: 'Recurring expense deleted' })
  } catch (error) {
    console.error('Recurring DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
