import { createHash, randomBytes, createHmac } from 'crypto'

const SECRET = 'family-expense-tracker-secret-key-2024'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256').update(password + salt).digest('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const inputHash = createHash('sha256').update(password + salt).digest('hex')
  return hash === inputHash
}

export function generateToken(payload: { userId: string; email: string; familyId?: string }): string {
  const data = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyToken(token: string): { userId: string; email: string; familyId?: string } | null {
  try {
    const [data, sig] = token.split('.')
    const expectedSig = createHmac('sha256', SECRET).update(data).digest('base64url')
    if (sig !== expectedSig) return null
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch { return null }
}

export function extractAuth(req: Request): { userId: string; email: string; familyId?: string } | null {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return verifyToken(auth.slice(7))
}