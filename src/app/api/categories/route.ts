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

    return NextResponse.json(
      categories.map(c => ({
        ...c,
        expenseCount: c._count.expenses,
      }))
    )
  } catch (error) {
    console.error('Categories GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/categories - Create category (admin only)
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
    if (!membership || membership.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can manage categories' }, { status: 403 })
    }

    const existing = await db.category.findUnique({
      where: { familyId_name: { familyId, name } },
    })
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 })
    }

    const category = await db.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: { name, icon, color, familyId, isDefault: false },
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

    return NextResponse.json({ ...category, expenseCount: 0 }, { status: 201 })
  } catch (error) {
    console.error('Categories POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}