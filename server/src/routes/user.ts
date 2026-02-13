import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 获取用户信息
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const walletAddr = req.headers['x-wallet-address'] as string

    if (!walletAddr) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 获取游戏统计
    const stats = await prisma.gamePlay.aggregate({
      where: { userId: user.id },
      _sum: {
        duration: true,
        earnedPoints: true,
      },
      _count: true
    })

    res.json({
      user: {
        id: user.id,
        walletAddr: user.walletAddr,
        points: user.points,
        avatar: user.avatar,
        createdAt: user.createdAt
      },
      stats: {
        totalGamesPlayed: stats._count,
        totalPlayTime: stats._sum.duration || 0,
        totalPointsEarned: stats._sum.earnedPoints || 0
      }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取游戏历史
router.get('/history', async (req: Request, res: Response) => {
  try {
    const walletAddr = req.headers['x-wallet-address'] as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit

    if (!walletAddr) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const [history, total] = await Promise.all([
      prisma.gamePlay.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          game: {
            select: {
              id: true,
              name: true,
              icon: true,
              url: true,
              orientation: true,
            }
          }
        }
      }),
      prisma.gamePlay.count({ where: { userId: user.id } })
    ])

    res.json({
      history: history.map(h => ({
        id: h.id,
        game: h.game,
        duration: h.duration,
        earnedPoints: h.earnedPoints,
        playedAt: h.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + history.length < total
      }
    })
  } catch (error) {
    console.error('Get history error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
