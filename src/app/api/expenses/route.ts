import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/expenses?familyId=xxx&category=xxx&paidStatus=xxx&dateFrom=xxx&dateTo=xxx&search=xxx&addedBy=xxx&whoPaid=xxx
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

    // Verify membership
    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const where: Record<string, unknown> = { familyId }

    const category = searchParams.get('category')
    if (category) where.categoryId = category

    const paidStatus = searchParams.get('paidStatus')
    if (paidStatus) where.paidStatus = paidStatus

    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom || dateTo) {
      where.expenseDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    }

    const search = searchParams.get('search')
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { notes: { contains: search } },
      ]
    }

    const addedBy = searchParams.get('addedBy')
    if (addedBy) where.addedById = addedBy

    const whoPaid = searchParams.get('whoPaid')
    if (whoPaid) where.whoPaidId = whoPaid

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        include: {
          category: true,
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
          attachments: { select: { id: true, fileName: true, fileUrl: true, fileType: true } },
        },
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      db.expense.count({ where }),
    ])

    return NextResponse.json({
      expenses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Expenses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/expenses - Create expense
export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      description,
      amount,
      expenseDate,
      categoryId,
      paidStatus = 'unpaid',
      dueDate,
      whoPaidId,
      notes,
    } = body

    if (!title || !amount || !expenseDate || !categoryId || !whoPaidId) {
      return NextResponse.json(
        { error: 'title, amount, expenseDate, categoryId, and whoPaidId are required' },
        { status: 400 }
      )
    }

    // Verify membership
    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: body.familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    // Verify whoPaidId is a member
    const paidByMember = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: body.familyId, userId: whoPaidId } },
    })
    if (!paidByMember) {
      return NextResponse.json({ error: 'Who paid must be a family member' }, { status: 400 })
    }

    const expense = await db.$transaction(async (tx) => {
      const e = await tx.expense.create({
        data: {
          title,
          description,
          amount: parseFloat(amount),
          expenseDate: new Date(expenseDate),
          categoryId,
          paidStatus,
          dueDate: dueDate ? new Date(dueDate) : null,
          paidDate: paidStatus === 'paid' ? new Date() : null,
          whoPaidId,
          addedById: auth.userId,
          familyId: body.familyId,
          notes,
        },
        include: {
          category: true,
          whoPaid: { select: { id: true, name: true, avatarUrl: true } },
          addedBy: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      await tx.activityLog.create({
        data: {
          familyId: body.familyId,
          userId: auth.userId,
          action: 'expense_added',
          entityType: 'expense',
          entityId: e.id,
          details: `Added expense "${title}" - $${amount}`,
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