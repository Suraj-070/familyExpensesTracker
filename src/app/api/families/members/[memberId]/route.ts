import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// DELETE /api/families/members/[memberId] - Remove member (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberId } = await params

    const member = await db.familyMember.findUnique({
      where: { id: memberId },
      include: { family: true, user: { select: { name: true, email: true } } },
    })
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Check if requester is admin
    const requesterMembership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: member.familyId, userId: auth.userId } },
    })
    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })
    }

    // Cannot remove the creator
    if (member.family.createdBy === member.userId) {
      return NextResponse.json({ error: 'Cannot remove the family creator' }, { status: 400 })
    }

    // Cannot remove yourself
    if (member.userId === auth.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself. Leave the family instead.' }, { status: 400 })
    }

    await db.$transaction([
      db.familyMember.delete({ where: { id: memberId } }),
      db.activityLog.create({
        data: {
          familyId: member.familyId,
          userId: auth.userId,
          action: 'member_removed',
          details: `Removed ${member.user.name} from the family`,
        },
      }),
    ])

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/families/members/[memberId]/role - Update member role (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberId } = await params
    const body = await req.json()
    const { role } = body

    if (!role || !['admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Role must be "admin" or "member"' }, { status: 400 })
    }

    const member = await db.familyMember.findUnique({
      where: { id: memberId },
      include: { family: true, user: { select: { name: true } } },
    })
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const requesterMembership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: member.familyId, userId: auth.userId } },
    })
    if (!requesterMembership || requesterMembership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })
    }

    if (member.family.createdBy === member.userId && role === 'member') {
      return NextResponse.json({ error: 'Cannot demote the family creator' }, { status: 400 })
    }

    const oldRole = member.role

    const updated = await db.$transaction([
      db.familyMember.update({
        where: { id: memberId },
        data: { role },
      }),
      db.activityLog.create({
        data: {
          familyId: member.familyId,
          userId: auth.userId,
          action: 'role_changed',
          details: `Changed ${member.user.name}'s role from ${oldRole} to ${role}`,
        },
      }),
    ])

    return NextResponse.json({ member: updated[0] })
  } catch (error) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}