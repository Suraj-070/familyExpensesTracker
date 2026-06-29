import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, generateToken, extractAuth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // LOGIN
    if (action === 'login') {
      const { email, password } = body
      if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      }

      const user = await db.user.findUnique({ where: { email } })
      if (!user) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      if (!verifyPassword(password, user.password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
      }

      // Get user's primary family
      const primaryMember = await db.familyMember.findFirst({
        where: { userId: user.id },
        include: { family: true },
      })

      const token = generateToken({
        userId: user.id,
        email: user.email,
        familyId: primaryMember?.familyId ?? undefined,
      })

      const { password: _, ...safeUser } = user

      return NextResponse.json({
        token,
        user: safeUser,
        family: primaryMember?.family ?? null,
      })
    }

    // SIGNUP
    if (action === 'signup') {
      const { name, email, password } = body
      if (!name || !email || !password) {
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const existing = await db.user.findUnique({ where: { email } })
      if (existing) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }

      const user = await db.user.create({
        data: {
          name,
          email,
          password: hashPassword(password),
        },
      })

      const token = generateToken({ userId: user.id, email: user.email })

      const { password: _, ...safeUser } = user

      return NextResponse.json({ token, user: safeUser }, { status: 201 })
    }

    // FORGOT PASSWORD (demo)
    if (action === 'forgot') {
      return NextResponse.json({ message: 'Password reset link sent (demo)' })
    }

    return NextResponse.json({ error: 'Invalid action. Use: login, signup, or forgot' }, { status: 400 })
  } catch (error) {
    console.error('Auth POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/auth/me - Get current user
export async function GET(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's families
    const memberships = await db.familyMember.findMany({
      where: { userId: auth.userId },
      include: { family: true },
    })

    return NextResponse.json({
      ...user,
      families: memberships.map(m => ({ ...m.family, role: m.role })),
    })
  } catch (error) {
    console.error('Auth GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/auth/profile - Update profile
export async function PUT(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, avatarUrl } = body

    const user = await db.user.update({
      where: { id: auth.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}