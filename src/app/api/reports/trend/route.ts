import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/reports/trend?familyId=xxx&months=6
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')
    const months = parseInt(searchParams.get('months') || '6')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const now = new Date()
    const trend: { month: string; label: string; total: number; paid: number; unpaid: number; count: number }[] = []

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      const expenses = await db.expense.findMany({
        where: { familyId, expenseDate: { gte: start, lte: end } },
        select: { amount: true, paidStatus: true },
      })

      const total = expenses.reduce((sum, e) => sum + e.amount, 0)
      const paid = expenses.filter(e => e.paidStatus === 'paid').reduce((sum, e) => sum + e.amount, 0)

      trend.push({
        month: monthStr,
        label,
        total: Math.round(total * 100) / 100,
        paid: Math.round(paid * 100) / 100,
        unpaid: Math.round((total - paid) * 100) / 100,
        count: expenses.length,
      })
    }

    return NextResponse.json({ trend })
  } catch (error) {
    console.error('Reports trend error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}