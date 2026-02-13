import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 获取游戏列表（分页）
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          icon: true,
          url: true,
          shortDesc: true,
          orientation: true,
          isHot: true,
        }
      }),
      prisma.game.count({ where: { isActive: true } })
    ])

    res.json({
      games,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + games.length < total
      }
    })
  } catch (error) {
    console.error('Get games error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取 Banner 推荐游戏
router.get('/banners', async (req: Request, res: Response) => {
  try {
    const banners = await prisma.game.findMany({
      where: { 
        isActive: true,
        isBanner: true 
      },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        url: true,
        bannerImage: true,
        shortDesc: true,
        orientation: true,
      }
    })

    res.json({ banners })
  } catch (error) {
    console.error('Get banners error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取热门游戏
router.get('/hot', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8
    const hotGames = await prisma.game.findMany({
      where: { 
        isActive: true,
        isHot: true 
      },
      orderBy: { sortOrder: 'asc' },
      take: limit,
      select: {
        id: true,
        name: true,
        icon: true,
        url: true,
        shortDesc: true,
        orientation: true,
      }
    })

    res.json({ hotGames })
  } catch (error) {
    console.error('Get hot games error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取游戏详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string)
    
    const game = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        icon: true,
        url: true,
        description: true,
        shortDesc: true,
        orientation: true,
        bannerImage: true,
      }
    })

    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    res.json({ game })
  } catch (error) {
    console.error('Get game detail error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
