import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PATCH /api/notifications/[id] — mark single notification as read
// Store calls PATCH /api/notifications/[id] with {isRead: true}
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const notification = await db.notification.findUnique({ where: { id } })
    if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (notification.userId !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.notification.update({ where: { id }, data: { isRead: true } })
    return NextResponse.json({ message: 'Marked as read' })
  } catch (error) {
    console.error('Notification PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/notifications/[id] — alias
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(req, { params })
}
