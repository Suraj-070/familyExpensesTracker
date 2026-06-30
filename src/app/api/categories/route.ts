import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/categories?familyId=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const categories = await db.category.findMany({
      where: { familyId },
      include: {
        _count: { select: { expenses: true } },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })

    // Wrapped in {categories:[]} — store reads data.categories
    return NextResponse.json({
      categories: categories.map(c => ({
        ...c,
        expenseCount: c._count.expenses,
      })),
    })
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/categories - Create category
// Any family member can create (needed for auto-create-on-expense flow);
// only admins can edit/delete existing ones (enforced in [id]/route.ts)
export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, icon = 'tag', color = '#6366f1', familyId } = body

    if (!name || !familyId) {
      return NextResponse.json({ error: 'name and familyId are required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    // If category already exists, just return it instead of erroring —
    // this makes the auto-create-on-expense flow idempotent under race conditions
    const existing = await db.category.findUnique({
      where: { familyId_name: { familyId, name } },
      include: { _count: { select: { expenses: true } } },
    })
    if (existing) {
      return NextResponse.json(
        { category: { ...existing, expenseCount: existing._count.expenses } },
        { status: 200 }
      )
    }

    const category = await db.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: { name, icon, color, familyId, isDefault: false, createdBy: auth.userId },
        include: { _count: { select: { expenses: true } } },
      })

      await tx.activityLog.create({
        data: {
          familyId,
          userId: auth.userId,
          action: 'category_created',
          entityType: 'category',
          entityId: c.id,
          details: `Created category "${name}"`,
        },
      })

      return c
    })

    return NextResponse.json(
      { category: { ...category, expenseCount: 0 } },
      { status: 201 }
    )
  } catch (error) {
    // Handle unique constraint race (two requests create same category simultaneously)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Category already exists, please retry' }, { status: 409 })
    }
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
