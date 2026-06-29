import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/reports/by-category?familyId=xxx&month=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')
    const month = searchParams.get('month')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

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

    const categoryBreakdown = await db.expense.groupBy({
      by: ['categoryId'],
      where: { familyId, expenseDate: dateFilter },
      _sum: { amount: true },
      _count: true,
    })

    const categoryIds = categoryBreakdown.map(c => c.categoryId)
    const categories = categoryIds.length > 0
      ? await db.category.findMany({
          where: { id: { in: categoryIds } },
        })
      : []

    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c]))

    const total = categoryBreakdown.reduce((sum, c) => sum + (c._sum.amount || 0), 0)

    const breakdown = categoryBreakdown
      .map(c => ({
        categoryId: c.categoryId,
        category: categoryMap[c.categoryId],
        total: Math.round((c._sum.amount || 0) * 100) / 100,
        count: c._count,
        percentage: total > 0 ? Math.round(((c._sum.amount || 0) / total) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)

    return NextResponse.json({ breakdown, total: Math.round(total * 100) / 100 })
  } catch (error) {
    console.error('Reports by-category error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}