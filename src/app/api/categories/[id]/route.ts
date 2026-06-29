import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// PUT /api/categories/[id] - Update category (admin only)
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
    const { name, icon, color } = body

    const existing = await db.category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage categories' }, { status: 403 })
    }

    // Check for name uniqueness if name is being changed
    if (name && name !== existing.name) {
      const nameExists = await db.category.findUnique({
        where: { familyId_name: { familyId: existing.familyId, name } },
      })
      if (nameExists) {
        return NextResponse.json({ error: 'Category name already exists' }, { status: 409 })
      }
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color

    const category = await db.$transaction(async (tx) => {
      const c = await tx.category.update({
        where: { id },
        data: updateData,
        include: { _count: { select: { expenses: true } } },
      })

      await tx.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'category_updated',
          entityType: 'category',
          entityId: id,
          details: `Updated category "${existing.name}"`,
        },
      })

      return c
    })

    return NextResponse.json({ ...category, expenseCount: category._count.expenses })
  } catch (error) {
    console.error('Category PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/categories/[id] - Delete category (admin only)
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

    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { expenses: true } } },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (existing._count.expenses > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with expenses. Reassign expenses first.' },
        { status: 400 }
      )
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId: existing.familyId, userId: auth.userId } },
    })
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage categories' }, { status: 403 })
    }

    await db.$transaction([
      db.category.delete({ where: { id } }),
      db.activityLog.create({
        data: {
          familyId: existing.familyId,
          userId: auth.userId,
          action: 'category_deleted',
          entityType: 'category',
          entityId: id,
          details: `Deleted category "${existing.name}"`,
        },
      }),
    ])

    return NextResponse.json({ message: 'Category deleted' })
  } catch (error) {
    console.error('Category DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}