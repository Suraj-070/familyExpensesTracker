import { NextRequest, NextResponse } from 'next/server'
import { calculateNextDueDate } from '../route'

// POST /api/recurring/preview — given startDate + frequency, returns the next 3 occurrence
// dates so the user can verify the schedule before saving (#34). No auth/DB needed —
// pure calculation, safe to call freely from the form as the user types.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { startDate, frequency, count = 3 } = body

    if (!startDate || !frequency) {
      return NextResponse.json({ error: 'startDate and frequency are required' }, { status: 400 })
    }

    const dates: string[] = []
    let current = new Date(startDate)
    for (let i = 0; i < count; i++) {
      dates.push(current.toISOString())
      current = calculateNextDueDate(current, frequency)
    }

    return NextResponse.json({ dates })
  } catch (error) {
    console.error('Recurring preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
