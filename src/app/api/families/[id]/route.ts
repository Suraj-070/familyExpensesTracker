import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/families/[id] - Update family name/photo (admin only)
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
    const body = await req.json()
    const { name, photoUrl } = body

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can update family settings' }, { status: 403 })
    }

    if (name !== undefined && !name.trim()) {
      return NextResponse.json({ error: 'Family name cannot be empty' }, { status: 400 })
    }

    const family = await db.$transaction(async (tx) => {
      const f = await tx.family.update({
        where: { id },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(photoUrl !== undefined && { photoUrl }),
        },
      })

      await tx.activityLog.create({
        data: {
          familyId: id,
          userId: auth.userId,
          action: 'family_updated',
          entityType: 'family',
          entityId: id,
          details: `Updated family settings`,
        },
      })

      return f
    })

    return NextResponse.json({ family })
  } catch (error) {
    console.error('Family PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/families/[id] - Delete family entirely (admin only, danger zone)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: id, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can delete the family' }, { status: 403 })
    }

    // Cascade delete handles members/expenses/categories/etc via Prisma schema onDelete: Cascade
    await db.family.delete({ where: { id } })

    return NextResponse.json({ message: 'Family deleted' })
  } catch (error) {
    console.error('Family DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
