import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/notifications/read-all - Mark all as read
export async function PUT(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await db.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({
      message: `${result.count} notifications marked as read`,
      count: result.count,
    })
  } catch (error) {
    console.error('Notifications read-all error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}