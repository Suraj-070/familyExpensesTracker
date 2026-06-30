import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

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

    const now = new Date()

    // Current month range
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Last month range
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

    // All-time expenses
    const [allExpenses, thisMonthExpenses, lastMonthExpenses] = await Promise.all([
      db.expense.findMany({
        where: { familyId },
        select: { amount: true, paidStatus: true },
      }),
      db.expense.findMany({
        where: { familyId, expenseDate: { gte: thisMonthStart, lte: thisMonthEnd } },
        select: { amount: true, paidStatus: true },
      }),
      db.expense.findMany({
        where: { familyId, expenseDate: { gte: lastMonthStart, lte: lastMonthEnd } },
        select: { amount: true, paidStatus: true },
      }),
    ])

    const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0)
    const totalPaid = allExpenses.filter(e => e.paidStatus === 'paid').reduce((s, e) => s + e.amount, 0)
    const totalUnpaid = totalExpenses - totalPaid

    const thisMonthSpending = thisMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const lastMonthSpending = lastMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const changePercent = lastMonthSpending === 0
      ? 0
      : Math.round(((thisMonthSpending - lastMonthSpending) / lastMonthSpending) * 100 * 10) / 10

    return NextResponse.json({
      // Fields expected by the store/dashboard
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalUnpaid: Math.round(totalUnpaid * 100) / 100,
      thisMonthSpending: Math.round(thisMonthSpending * 100) / 100,
      lastMonthSpending: Math.round(lastMonthSpending * 100) / 100,
      changePercent,
      expenseCount: allExpenses.length,
      thisMonthCount: thisMonthExpenses.length,
    })
  } catch (error) {
    console.error('Reports summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
