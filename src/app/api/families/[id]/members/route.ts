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
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!membership) return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })

    const rawMembers = await db.familyMember.findMany({
      where: { familyId: id },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    })

    // Return wrapped in {members:[]} with userId field included
    const members = rawMembers.map(m => ({
      id: m.id,
      userId: m.userId,         // ← was missing, store needs this
      familyId: id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
    }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Family members GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/families/[id]/members — remove a member
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { userId } = await req.json()

    // Must be admin
    const requester = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
    }

    await db.familyMember.delete({
      where: { familyId_userId: { familyId: id, userId } },
    })

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Family members DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/families/[id]/members — update role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { userId, role } = await req.json()

    const requester = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!requester || requester.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update roles' }, { status: 403 })
    }

    const updated = await db.familyMember.update({
      where: { familyId_userId: { familyId: id, userId } },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
    })

    return NextResponse.json({ member: { ...updated, userId: updated.userId } })
  } catch (error) {
    console.error('Family members PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
