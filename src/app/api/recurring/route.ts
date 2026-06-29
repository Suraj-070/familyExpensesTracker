import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/recurring?familyId=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const recurring = await db.recurringExpense.findMany({
      where: { familyId },
      include: {
        category: true,
        creator: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    })

    return NextResponse.json({ recurring })
  } catch (error) {
    console.error('Recurring GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/recurring - Create recurring expense (admin only)
export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      amount,
      categoryId,
      frequency,
      startDate,
      endDate,
      familyId,
    } = body

    if (!title || !amount || !categoryId || !frequency || !startDate || !familyId) {
      return NextResponse.json(
        { error: 'title, amount, categoryId, frequency, startDate, and familyId are required' },
        { status: 400 }
      )
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage recurring expenses' }, { status: 403 })
    }

    // Calculate next due date
    const start = new Date(startDate)
    const nextDueDate = calculateNextDueDate(start, frequency)

    const recurring = await db.$transaction(async (tx) => {
      const r = await tx.recurringExpense.create({
        data: {
          title,
          amount: parseFloat(amount),
          categoryId,
          frequency,
          startDate: start,
          endDate: endDate ? new Date(endDate) : null,
          nextDueDate,
          createdBy: auth.userId,
          familyId,
        },
        include: {
          category: true,
          creator: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.activityLog.create({
        data: {
          familyId,
          userId: auth.userId,
          action: 'recurring_created',
          entityType: 'recurring',
          entityId: r.id,
          details: `Created recurring expense "${title}" - $${amount} (${frequency})`,
        },
      })

      return r
    })

    return NextResponse.json({ recurring }, { status: 201 })
  } catch (error) {
    console.error('Recurring POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function calculateNextDueDate(from: Date, frequency: string): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'monthly':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarterly':
      next.setMonth(next.getMonth() + 3)
      break
    case 'yearly':
      next.setFullYear(next.getFullYear() + 1)
      break
    default:
      next.setMonth(next.getMonth() + 1)
  }
  return next
}