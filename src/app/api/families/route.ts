import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth, generateToken } from '@/lib/auth'

const DEFAULT_CATEGORIES = [
  { name: 'Food', icon: 'utensils', color: '#f97316' },
  { name: 'Kitchen', icon: 'cooking-pot', color: '#8b5cf6' },
  { name: 'House Rent', icon: 'home', color: '#3b82f6' },
  { name: 'Electricity', icon: 'zap', color: '#eab308' },
  { name: 'Water', icon: 'droplets', color: '#06b6d4' },
  { name: 'Internet', icon: 'wifi', color: '#10b981' },
  { name: 'School', icon: 'graduation-cap', color: '#6366f1' },
  { name: 'Stationary', icon: 'pencil', color: '#ec4899' },
  { name: 'Medical', icon: 'heart-pulse', color: '#ef4444' },
  { name: 'Transportation', icon: 'car', color: '#f59e0b' },
  { name: 'Entertainment', icon: 'gamepad-2', color: '#14b8a6' },
  { name: 'Other', icon: 'tag', color: '#64748b' },
]

// POST /api/families - Create family or Join family
export async function POST(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    // JOIN FAMILY
    if (action === 'join') {
      const { inviteCode } = body
      if (!inviteCode) {
        return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
      }

      const family = await db.family.findUnique({ where: { inviteCode } })
      if (!family) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
      }

      const existing = await db.familyMember.findUnique({
        where: { familyId_userId: { familyId: family.id, userId: auth.userId } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Already a member of this family' }, { status: 409 })
      }

      await db.$transaction([
        db.familyMember.create({
          data: { familyId: family.id, userId: auth.userId, role: 'member' },
        }),
        db.activityLog.create({
          data: {
            familyId: family.id,
            userId: auth.userId,
            action: 'member_joined',
            details: `${auth.email} joined the family`,
          },
        }),
        db.notification.create({
          data: {
            userId: family.createdBy,
            familyId: family.id,
            title: 'New Member',
            message: `${auth.email} joined your family`,
            type: 'member',
          },
        }),
      ])

      const token = generateToken({
        userId: auth.userId,
        email: auth.email,
        familyId: family.id,
      })

      return NextResponse.json({ family, token })
    }

    // CREATE FAMILY
    const { name, photoUrl } = body
    if (!name) {
      return NextResponse.json({ error: 'Family name is required' }, { status: 400 })
    }

    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const family = await db.$transaction(async (tx) => {
      const f = await tx.family.create({
        data: {
          name,
          photoUrl: photoUrl || null,
          inviteCode,
          createdBy: auth.userId,
        },
      })

      await tx.familyMember.create({
        data: { familyId: f.id, userId: auth.userId, role: 'admin' },
      })

      // Create default categories
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map(c => ({
          ...c,
          familyId: f.id,
          isDefault: true,
        })),
      })

      // Create admin permissions
      await tx.permission.create({
        data: {
          familyId: f.id,
          role: 'admin',
          canAddExpense: true,
          canEditOwnExpense: true,
          canEditAllExpenses: true,
          canDeleteExpense: true,
          canUploadAttachment: true,
          canManageCategories: true,
          canManageRecurring: true,
          canViewReports: true,
          canManageSettings: true,
          canInviteMembers: true,
          canRemoveMembers: true,
        },
      })

      // Create member permissions
      await tx.permission.create({
        data: {
          familyId: f.id,
          role: 'member',
          canAddExpense: true,
          canEditOwnExpense: true,
          canEditAllExpenses: false,
          canDeleteExpense: false,
          canUploadAttachment: true,
          canManageCategories: false,
          canManageRecurring: false,
          canViewReports: true,
          canManageSettings: false,
          canInviteMembers: false,
          canRemoveMembers: false,
        },
      })

      await tx.activityLog.create({
        data: {
          familyId: f.id,
          userId: auth.userId,
          action: 'family_created',
          details: `Family "${name}" was created`,
        },
      })

      return f
    })

    const token = generateToken({
      userId: auth.userId,
      email: auth.email,
      familyId: family.id,
    })

    return NextResponse.json({ family, token }, { status: 201 })
  } catch (error) {
    console.error('Families POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/families - Get user's families
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const memberships = await db.familyMember.findMany({
      where: { userId: auth.userId },
      include: {
        family: {
          include: {
            _count: { select: { members: true, expenses: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })

    const families = memberships.map(m => ({
      ...m.family,
      role: m.role,
      memberCount: m.family._count.members,
      expenseCount: m.family._count.expenses,
    }))
    return NextResponse.json({ families })
  } catch (error) {
    console.error('Families GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
