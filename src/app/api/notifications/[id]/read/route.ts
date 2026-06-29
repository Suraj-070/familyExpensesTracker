import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/notifications/[id]/read - Mark as read
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== auth.userId) {
      return NextResponse.json({ error: 'Cannot modify this notification' }, { status: 403 })
    }

    await db.notification.update({
      where: { id },
      data: { isRead: true },
    })

    return NextResponse.json({ message: 'Notification marked as read' })
  } catch (error) {
    console.error('Notification read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}