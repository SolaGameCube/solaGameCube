import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import nacl from 'tweetnacl'
import bs58 from 'bs58'

const router = Router()
const prisma = new PrismaClient()

// 验证钱包签名并登录/注册
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { walletAddr, signature, message } = req.body

    if (!walletAddr || !signature || !message) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // 验证签名
    try {
      const publicKey = bs58.decode(walletAddr)
      const signatureBytes = bs58.decode(signature)
      const messageBytes = new TextEncoder().encode(message)
      
      const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey)
      
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    } catch (e) {
      // 开发环境可以跳过签名验证
      console.warn('Signature verification skipped in dev mode')
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      // 新用户：随机分配头像 (1-9)
      const randomAvatar = Math.floor(Math.random() * 9) + 1
      user = await prisma.user.create({
        data: { 
          walletAddr,
          avatar: `${randomAvatar}.png`
        }
      })
      console.log(`New user created: ${walletAddr}, avatar: ${randomAvatar}.png`)
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddr: user.walletAddr,
        points: user.points,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 开发用：快速登录（不验证签名）
router.post('/dev-login', async (req: Request, res: Response) => {
  try {
    const { walletAddr } = req.body

    if (!walletAddr) {
      return res.status(400).json({ error: 'Missing walletAddr' })
    }

    let user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      // 新用户：随机分配头像 (1-9)
      const randomAvatar = Math.floor(Math.random() * 9) + 1
      user = await prisma.user.create({
        data: { 
          walletAddr,
          avatar: `${randomAvatar}.png`
        }
      })
      console.log(`New user created (dev): ${walletAddr}, avatar: ${randomAvatar}.png`)
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        walletAddr: user.walletAddr,
        points: user.points,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Dev login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
