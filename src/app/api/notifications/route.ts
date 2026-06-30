import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    const notifications = await db.notification.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const unreadCount = await db.notification.count({
      where: { userId: auth.userId, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('Notifications GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications — mark all read (store calls this)
// Also handles PUT /api/notifications/read-all via this fallback
export async function PATCH(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await db.notification.updateMany({
      where: { userId: auth.userId, isRead: false },
      data: { isRead: true },
    })

    return NextResponse.json({ message: 'All notifications marked as read' })
  } catch (error) {
    console.error('Notifications PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notifications — alias for mark all read
export async function PUT(req: NextRequest) {
  return PATCH(req)
}
