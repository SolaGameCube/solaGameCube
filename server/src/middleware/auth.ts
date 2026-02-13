import { Request, Response, NextFunction } from 'express'
import { verifyAdminToken } from '../utils/jwt'

export interface AuthRequest extends Request {
  admin?: {
    adminId: number
    username: string
    role: string
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const token = authHeader.substring(7) // Remove 'Bearer ' prefix
  const payload = verifyAdminToken(token)

  if (!payload) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' })
  }

  req.admin = payload
  next()
}
