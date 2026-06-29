import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/recurring/[id] - Update recurring expense (admin only)
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

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage recurring expenses' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    const recurring = await db.$transaction(async (tx) => {
      const r = await tx.recurringExpense.update({
        where: { id },
        data: updateData,
        include: {
          category: true,
          creator: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'recurring_updated',
          entityType: 'recurring',
          entityId: id,
          details: `Updated recurring expense "${existing.title}"`,
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

// DELETE /api/recurring/[id] - Delete recurring expense (admin only)
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

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage recurring expenses' }, { status: 403 })
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