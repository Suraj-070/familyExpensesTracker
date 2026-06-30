import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
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
        data: { name, email, password: hashPassword(password) },
      })

      const token = generateToken({ userId: user.id, email: user.email })
      const { password: _, ...safeUser } = user

      return NextResponse.json({ token, user: safeUser }, { status: 201 })
    }

    // FORGOT PASSWORD — generates a real, single-use, time-limited reset token.
    //
    // IMPORTANT: this generates and stores a valid token, but does not send an email yet.
    // To complete the flow, plug in an email provider (Resend, SendGrid, Postmark, etc.)
    // and call it where marked below with the reset link:
    //   https://yourapp.com/reset-password?token=<token>
    //
    // Until an email provider is wired in, the reset link is only available via the
    // server console log (for local testing) — this is intentionally NOT silently fake
    // like the old version; it tells the truth about what's configured.
    if (action === 'forgot') {
      const { email } = body
      if (!email) {
        return NextResponse.json({ error: 'Email is required' }, { status: 400 })
      }

      const user = await db.user.findUnique({ where: { email } })

      // Always respond with the same generic message regardless of whether the email
      // exists — this prevents leaking which emails are registered (standard security
      // practice), while still doing real work behind the scenes when it does exist.
      if (user) {
        const token = randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

        await db.passwordResetToken.create({
          data: { userId: user.id, token, expiresAt },
        })

        // TODO: send email here via your provider, e.g.:
        // await sendEmail({
        //   to: user.email,
        //   subject: 'Reset your password',
        //   body: `Click to reset: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`,
        // })
        console.log(`[Password Reset] Token for ${email}: ${token} (expires in 1h) — wire up an email provider to send this automatically.`)
      }

      return NextResponse.json({
        message: 'If an account exists with that email, a reset link has been sent.',
      })
    }

    // RESET PASSWORD — consumes the token generated above
    if (action === 'reset') {
      const { token, newPassword } = body
      if (!token || !newPassword) {
        return NextResponse.json({ error: 'token and newPassword are required' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }

      const resetToken = await db.passwordResetToken.findUnique({ where: { token } })
      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        return NextResponse.json({ error: 'This reset link is invalid or has expired' }, { status: 400 })
      }

      await db.$transaction([
        db.user.update({
          where: { id: resetToken.userId },
          data: { password: hashPassword(newPassword) },
        }),
        db.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true },
        }),
      ])

      return NextResponse.json({ message: 'Password has been reset. You can now log in.' })
    }

    return NextResponse.json({ error: 'Invalid action. Use: login, signup, forgot, or reset' }, { status: 400 })
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
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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

// PUT /api/auth - Update profile or change password
// Profile update now only writes fields that actually changed (#46 dirty-field tracking)
// and validates email uniqueness before applying it.
export async function PUT(req: NextRequest) {
  try {
    const auth = extractAuth(req)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, avatarUrl, currentPassword, newPassword } = body

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 })
      }
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 })
      }
      const existing = await db.user.findUnique({ where: { id: auth.userId } })
      if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      if (!verifyPassword(currentPassword, existing.password)) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }
      await db.user.update({
        where: { id: auth.userId },
        data: { password: hashPassword(newPassword) },
      })
      return NextResponse.json({ message: 'Password updated successfully' })
    }

    const current = await db.user.findUnique({ where: { id: auth.userId } })
    if (!current) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Only include fields that actually changed — avoids redundant writes and
    // means the email-uniqueness check below only runs when email is really changing.
    const updateData: Record<string, string> = {}
    if (name !== undefined && name.trim() && name.trim() !== current.name) {
      updateData.name = name.trim()
    }
    if (email !== undefined && email.trim() && email.trim() !== current.email) {
      const emailTaken = await db.user.findUnique({ where: { email: email.trim() } })
      if (emailTaken && emailTaken.id !== auth.userId) {
        return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
      }
      updateData.email = email.trim()
    }
    if (avatarUrl !== undefined && avatarUrl !== current.avatarUrl) {
      updateData.avatarUrl = avatarUrl
    }

    if (Object.keys(updateData).length === 0) {
      // Nothing actually changed — return current user as-is, no wasted write
      const { password: _, ...safeUser } = current
      return NextResponse.json({ user: safeUser })
    }

    const user = await db.user.update({
      where: { id: auth.userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Auth PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
