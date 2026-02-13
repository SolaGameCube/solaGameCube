import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export interface AdminTokenPayload {
  adminId: number
  username: string
  role: string
}

export function generateAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET as string, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions)
}

export function verifyAdminToken(token: string): AdminTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as AdminTokenPayload
    return decoded
  } catch (error) {
    return null
  }
}
