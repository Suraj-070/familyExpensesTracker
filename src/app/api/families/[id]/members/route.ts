import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/families/[id]/members
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify user is a member of this family
    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const members = await db.familyMember.findMany({
      where: { familyId: id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    return NextResponse.json(
      members.map(m => ({
        id: m.id,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.user,
      }))
    )
  } catch (error) {
    console.error('Family members GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}