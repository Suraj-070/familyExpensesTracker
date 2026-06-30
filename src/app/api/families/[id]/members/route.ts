import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/families/[id]/members
// Now includes per-member expense count and total amount so the remove-member
// confirmation dialog can show what's at stake (#40).
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

    // Aggregate expense stats per member (addedBy) in one query
    const expenseStats = await db.expense.groupBy({
      by: ['addedById'],
      where: { familyId: id },
      _count: { _all: true },
      _sum: { amount: true },
    })
    const statsMap = new Map(
      expenseStats.map(s => [s.addedById, { count: s._count._all, total: s._sum.amount || 0 }])
    )

    const members = rawMembers.map(m => ({
      id: m.id,
      userId: m.userId,
      familyId: id,
      role: m.role,
      joinedAt: m.joinedAt,
      user: m.user,
      expenseCount: statsMap.get(m.userId)?.count || 0,
      expenseTotal: statsMap.get(m.userId)?.total || 0,
    }))

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Family members GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/families/[id]/members — remove a member, or leave the family yourself
// Body: { userId } — if userId === auth.userId, this is a self-service "leave family" (#41)
// Otherwise it's an admin removing someone else.
// Either way, blocks the action if it would leave the family with zero admins (#39).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const { userId } = await req.json()

    const requester = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!requester) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const isSelfLeave = userId === auth.userId

    if (!isSelfLeave && requester.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove other members' }, { status: 403 })
    }

    const target = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId } },
    })
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Minimum-admin safeguard: if removing/leaving an admin, ensure at least one admin remains
    if (target.role === 'admin') {
      const adminCount = await db.familyMember.count({
        where: { familyId: id, role: 'admin' },
      })
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: isSelfLeave
              ? 'You are the only admin. Promote another member to admin before leaving.'
              : 'Cannot remove the only admin. Promote another member first.',
          },
          { status: 400 }
        )
      }
    }

    await db.$transaction([
      db.familyMember.delete({ where: { familyId_userId: { familyId: id, userId } } }),
      db.activityLog.create({
        data: {
          familyId: id,
          userId: auth.userId,
          action: isSelfLeave ? 'member_left' : 'member_removed',
          entityType: 'family_member',
          entityId: userId,
          details: isSelfLeave ? 'Left the family' : 'Removed a member from the family',
        },
      }),
    ])

    return NextResponse.json({ message: isSelfLeave ? 'Left family' : 'Member removed' })
  } catch (error) {
    console.error('Family members DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/families/[id]/members — update role
// Blocks demoting the last remaining admin (#39).
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

    if (role === 'member') {
      const target = await db.familyMember.findUnique({
        where: { familyId_userId: { familyId: id, userId } },
      })
      if (target?.role === 'admin') {
        const adminCount = await db.familyMember.count({
          where: { familyId: id, role: 'admin' },
        })
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot demote the only admin. Promote another member to admin first.' },
            { status: 400 }
          )
        }
      }
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
