import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/expenses/[id]
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

    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        category: true,
        whoPaid: { select: { id: true, name: true, avatarUrl: true } },
        addedBy: { select: { id: true, name: true, avatarUrl: true } },
        attachments: { select: { id: true, fileName: true, fileUrl: true, fileType: true, fileSize: true } },
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Verify membership
    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: expense.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Expense GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/expenses/[id] - Update expense
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

    const existing = await db.expense.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Check permissions: owner or admin
    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const isAdmin = membership.role === 'admin'
    const isOwner = existing.addedById === auth.userId

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Only the owner or an admin can edit this expense' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.amount !== undefined) updateData.amount = parseFloat(body.amount)
    if (body.expenseDate !== undefined) updateData.expenseDate = new Date(body.expenseDate)
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null
    if (body.whoPaidId !== undefined) updateData.whoPaidId = body.whoPaidId
    if (body.notes !== undefined) updateData.notes = body.notes

    const expense = await db.$transaction(async (tx) => {
      const e = await tx.expense.update({
        where: { id },
        data: updateData,
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
          action: 'expense_updated',
          entityType: 'expense',
          entityId: id,
          details: `Updated expense "${e.title}"`,
        },
      })

      return e
    })

    return NextResponse.json({ expense })
  } catch (error) {
    console.error('Expense PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/expenses/[id] - Delete expense
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

    const isAdmin = membership.role === 'admin'
    const isOwner = existing.addedById === auth.userId

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'Only the owner or an admin can delete this expense' }, { status: 403 })
    }

    await db.$transaction([
      db.expense.delete({ where: { id } }),
      db.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'expense_deleted',
          entityType: 'expense',
          entityId: id,
          details: `Deleted expense "${existing.title}" - $${existing.amount}`,
        },
      }),
    ])

    return NextResponse.json({ message: 'Expense deleted' })
  } catch (error) {
    console.error('Expense DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}