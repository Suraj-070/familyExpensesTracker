import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'
import { getMembershipAndPermissions } from '@/lib/permissions'

export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')
    if (!familyId) return NextResponse.json({ error: 'familyId is required' }, { status: 400 })

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })

    const where: Record<string, unknown> = { familyId }

    const category = searchParams.get('categoryId') || searchParams.get('category')
    if (category) where.categoryId = category

    const paidStatus = searchParams.get('paidStatus')
    if (paidStatus && paidStatus !== 'all') where.paidStatus = paidStatus

    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom || dateTo) {
      where.expenseDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
      }
    }

    const amountMin = searchParams.get('amountMin')
    const amountMax = searchParams.get('amountMax')
    if (amountMin || amountMax) {
      where.amount = {
        ...(amountMin ? { gte: parseFloat(amountMin) } : {}),
        ...(amountMax ? { lte: parseFloat(amountMax) } : {}),
      }
    }

    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    const addedBy = searchParams.get('addedBy')
    if (addedBy) where.addedById = addedBy

    const whoPaid = searchParams.get('whoPaid')
    if (whoPaid) where.whoPaidId = whoPaid

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [expenses, count] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          category: true,
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
          attachments: { select: { id: true, fileName: true, fileUrl: true, fileType: true, fileSize: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      db.expense.count({ where }),
    ])

    return NextResponse.json({ expenses, count, total: count, page, totalPages: Math.ceil(count / limit) })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { title, description, amount, expenseDate, categoryId, paidStatus = 'unpaid', dueDate, whoPaidId, notes, familyId } = body

    if (!title || !amount || !expenseDate || !familyId) {
      return NextResponse.json({ error: 'title, amount, expenseDate and familyId are required' }, { status: 400 })
    }

    const access = await getMembershipAndPermissions(familyId, auth.userId)
    if (!access) return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    if (!access.permissions.canAddExpense) {
      return NextResponse.json({ error: 'You do not have permission to add expenses' }, { status: 403 })
    }

    const paidById = whoPaidId || auth.userId

    const expense = await db.$transaction(async (tx) => {
      const e = await tx.expense.create({
        data: {
          title,
          ...(description !== undefined && { description }),
          amount: parseFloat(amount),
          expenseDate: new Date(expenseDate),
          ...(categoryId ? { categoryId } : {}),
          paidStatus,
          dueDate: dueDate ? new Date(dueDate) : null,
          paidDate: paidStatus === 'paid' ? new Date() : null,
          whoPaidId: paidById,
          addedById: auth.userId,
          familyId,
          ...(notes !== undefined && { notes }),
        },
        include: {
          category: true,
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.activityLog.create({
        data: {
          familyId,
          userId: auth.userId,
          action: 'expense_added',
          entityType: 'expense',
          entityId: e.id,
          details: `Added expense "${title}" - Rs. ${amount}`,
        },
      })

      return e
    })

    return NextResponse.json({ expense }, { status: 201 })
  } catch (error) {
    console.error('Expenses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
