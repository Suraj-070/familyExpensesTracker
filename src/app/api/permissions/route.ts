import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { extractAuth } from '@/lib/auth'

// GET /api/permissions?familyId=xxx&role=xxx
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const familyId = searchParams.get('familyId')
    const role = searchParams.get('role')

    if (!familyId) {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 })
    }

    const membership = await db.familyMember.findUnique({
      where: { familyId_userId: { familyId, userId: auth.userId } },
    })
    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this family' }, { status: 403 })
    }

    const where: Record<string, string> = { familyId }
    if (role) where.role = role

    const permissions = await db.permission.findMany({
      where,
    })

    return NextResponse.json({ permissions })
  } catch (error) {
    console.error('Permissions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}