import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/reports/summary?familyId=xxx&month=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')
    const month = searchParams.get('month') // format: 2024-01

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    // Build date range
    let dateFilter: { gte: Date; lte: Date }
    if (month) {
      const [year, m] = month.split('-').map(Number)
      const start = new Date(year, m - 1, 1)
      const end = new Date(year, m, 0, 23, 59, 59, 999)
      dateFilter = { gte: start, lte: end }
    } else {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      dateFilter = { gte: start, lte: end }
    }

    const expenses = await db.expense.findMany({
      where: { familyId, expenseDate: dateFilter },
      select: { amount: true, paidStatus: true },
    })

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)
    const paid = expenses.filter(e => e.paidStatus === 'paid').reduce((sum, e) => sum + e.amount, 0)
    const unpaid = total - paid

    // Member-wise breakdown
    const memberBreakdown = await db.expense.groupBy({
      by: ['whoPaidId'],
      where: { familyId, expenseDate: dateFilter },
      _sum: { amount: true },
      _count: true,
    })

    const memberIds = memberBreakdown.map(m => m.whoPaidId)
    const users = memberIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, name: true, avatarUrl: true },
        })
      : []

    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    return NextResponse.json({
      total: Math.round(total * 100) / 100,
      paid: Math.round(paid * 100) / 100,
      unpaid: Math.round(unpaid * 100) / 100,
      expenseCount: expenses.length,
      paidCount: expenses.filter(e => e.paidStatus === 'paid').length,
      unpaidCount: expenses.filter(e => e.paidStatus === 'unpaid').length,
      memberBreakdown: memberBreakdown.map(m => ({
        userId: m.whoPaidId,
        user: userMap[m.whoPaidId],
        total: Math.round(m._sum.amount * 100) / 100,
        count: m._count,
      })),
    })
  } catch (error) {
    console.error('Reports summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
