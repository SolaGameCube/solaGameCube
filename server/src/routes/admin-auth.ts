import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { generateAdminToken } from '../utils/jwt'
import { comparePassword, hashPassword } from '../utils/bcrypt'
import { generateCaptcha, verifyCaptcha } from '../utils/captcha'

const router = Router()
const prisma = new PrismaClient()

// 获取验证码
router.get('/captcha', (req: Request, res: Response) => {
  try {
    const { id, data } = generateCaptcha()
    res.setHeader('Content-Type', 'application/json')
    res.json({ id, svg: data })
  } catch (error) {
    console.error('Generate captcha error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 管理员登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password, captchaId, captcha } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    // 验证验证码
    if (!captchaId || !captcha) {
      return res.status(400).json({ error: '验证码不能为空' })
    }

    if (!verifyCaptcha(captchaId, captcha)) {
      return res.status(400).json({ error: '验证码错误或已过期' })
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await comparePassword(password, admin.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = generateAdminToken({
      adminId: admin.id,
      username: admin.username,
      role: admin.role,
    })

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role,
      }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取当前管理员信息
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const { verifyAdminToken } = require('../utils/jwt')
    const payload = verifyAdminToken(token)

    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      }
    })

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    res.json({ admin })
  } catch (error) {
    console.error('Get admin info error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 修改密码
router.post('/change-password', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    const { verifyAdminToken } = require('../utils/jwt')
    const payload = verifyAdminToken(token)

    if (!payload) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' })
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' })
    }

    const admin = await prisma.admin.findUnique({
      where: { id: payload.adminId }
    })

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' })
    }

    const isValidPassword = await comparePassword(oldPassword, admin.password)

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid old password' })
    }

    const hashedPassword = await hashPassword(newPassword)

    await prisma.admin.update({
      where: { id: payload.adminId },
      data: { password: hashedPassword }
    })

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
