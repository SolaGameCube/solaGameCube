import { Router, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { requireAdmin, AuthRequest } from '../middleware/auth'
import {
  extractFileNameFromUrl,
  generateGameHTML,
  saveHTMLFile,
  deleteHTMLFile,
} from '../utils/html-generator'
import path from 'path'
import fs from 'fs'

const router = Router()
const prisma = new PrismaClient()

// 所有路由都需要管理员认证
router.use(requireAdmin)

// ==================== 用户管理 ====================

// 获取用户列表
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit
    const search = req.query.search as string || ''

    const where: any = {}
    if (search) {
      where.walletAddr = { contains: search }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          walletAddr: true,
          points: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        }
      }),
      prisma.user.count({ where })
    ])

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      }
    })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取用户详情
router.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        gamePlays: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            game: {
              select: {
                id: true,
                name: true,
                icon: true,
              }
            }
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user })
  } catch (error) {
    console.error('Get user detail error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 更新用户
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))
    const { points, avatar } = req.body

    const updateData: any = {}
    if (points !== undefined) updateData.points = parseInt(points)
    if (avatar !== undefined) updateData.avatar = avatar

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        walletAddr: true,
        points: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    res.json({ user })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 删除用户
router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    await prisma.user.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取用户的游戏记录
router.get('/users/:id/gameplays', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit

    const [gameplays, total] = await Promise.all([
      prisma.gamePlay.findMany({
        where: { userId: id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          game: {
            select: {
              id: true,
              name: true,
              icon: true,
            }
          }
        }
      }),
      prisma.gamePlay.count({ where: { userId: id } })
    ])

    res.json({
      gameplays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + gameplays.length < total
      }
    })
  } catch (error) {
    console.error('Get user gameplays error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ==================== 游戏管理 ====================

// 获取游戏列表
router.get('/games', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit
    const search = req.query.search as string || ''
    const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined

    const where: any = {}
    if (search) {
      where.name = { contains: search }
    }
    if (isActive !== undefined) {
      where.isActive = isActive
    }

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.game.count({ where })
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

// 获取游戏详情
router.get('/games/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    const game = await prisma.game.findUnique({
      where: { id }
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

// 创建游戏
router.post('/games', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      icon,
      url,
      description,
      shortDesc,
      orientation,
      isBanner,
      isHot,
      bannerImage,
      isActive,
      sortOrder,
      sourceUrl,
      gameDistributionId,
    } = req.body

    if (!name || !icon || !url) {
      return res.status(400).json({ error: 'Name, icon, and url are required' })
    }

    // 如果没有指定 sortOrder，自动设置为最大排序值 + 1
    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxSortOrder = await prisma.game.aggregate({
        _max: {
          sortOrder: true,
        },
      })
      finalSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1
    }

    let htmlFileName: string | null = null

    // 如果填写了 sourceUrl（表示需要生成 HTML），生成 HTML 文件
    if (sourceUrl) {
      if (!gameDistributionId) {
        return res.status(400).json({ error: 'gameDistributionId is required when generating HTML file' })
      }
      htmlFileName = extractFileNameFromUrl(url) // 从游戏 URL 提取文件名
      const htmlContent = generateGameHTML(name, gameDistributionId, url) // gameUrl 不编码
      saveHTMLFile(htmlContent, htmlFileName)
    }

    const game = await prisma.game.create({
      data: {
        name,
        icon,
        url,
        description: description || '',
        shortDesc: shortDesc || '',
        orientation: orientation || 'landscape',
        isBanner: isBanner || false,
        isHot: isHot || false,
        bannerImage: bannerImage || null,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder: finalSortOrder,
        isGameDistribution: !!gameDistributionId,
        gameDistributionId: gameDistributionId || null,
        sourceUrl: sourceUrl || null,
        htmlFileName: htmlFileName,
      }
    })

    res.json({ 
      game,
      htmlFile: htmlFileName ? {
        fileName: htmlFileName,
        downloadUrl: `/api/admin/games/${game.id}/download-html`
      } : null
    })
  } catch (error) {
    console.error('Create game error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 更新游戏
router.put('/games/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))
    const updateData: any = req.body

    // 获取现有游戏数据
    const existingGame = await prisma.game.findUnique({
      where: { id }
    })

    if (!existingGame) {
      return res.status(404).json({ error: 'Game not found' })
    }

    // 确保 sortOrder 是数字
    if (updateData.sortOrder !== undefined) {
      updateData.sortOrder = parseInt(updateData.sortOrder)
    }

    const needGenerateHTML = updateData.sourceUrl !== undefined ? updateData.sourceUrl : existingGame.sourceUrl
    const gameUrl = updateData.url !== undefined ? updateData.url : existingGame.url
    const gameDistributionId = updateData.gameDistributionId !== undefined ? updateData.gameDistributionId : existingGame.gameDistributionId

    // 检查是否需要重新生成 HTML
    const needRegenerateHTML = needGenerateHTML && (
      updateData.sourceUrl !== undefined && updateData.sourceUrl !== existingGame.sourceUrl ||
      updateData.url !== undefined && updateData.url !== existingGame.url ||
      updateData.gameDistributionId !== undefined && updateData.gameDistributionId !== existingGame.gameDistributionId
    )

    let htmlFileName: string | null = null

    if (needRegenerateHTML && needGenerateHTML) {
      if (!gameDistributionId) {
        return res.status(400).json({ error: 'gameDistributionId is required when generating HTML file' })
      }
      // 删除旧的 HTML 文件（如果存在）
      if (existingGame.htmlFileName) {
        deleteHTMLFile(existingGame.htmlFileName)
      }

      // 生成新的 HTML 文件（从游戏 URL 提取文件名）
      htmlFileName = extractFileNameFromUrl(gameUrl)
      const htmlContent = generateGameHTML(
        updateData.name || existingGame.name,
        gameDistributionId,
        gameUrl
      )
      saveHTMLFile(htmlContent, htmlFileName)
      updateData.htmlFileName = htmlFileName
    } else if (!needGenerateHTML && existingGame.htmlFileName) {
      // 如果取消了生成 HTML，删除 HTML 文件
      deleteHTMLFile(existingGame.htmlFileName)
      updateData.htmlFileName = null
      updateData.sourceUrl = null
    }

    const game = await prisma.game.update({
      where: { id },
      data: updateData
    })

    res.json({ 
      game,
      htmlFile: htmlFileName ? {
        fileName: htmlFileName,
        downloadUrl: `/api/admin/games/${game.id}/download-html`
      } : (game.htmlFileName ? {
        fileName: game.htmlFileName,
        downloadUrl: `/api/admin/games/${game.id}/download-html`
      } : null)
    })
  } catch (error) {
    console.error('Update game error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 快速切换游戏字段（Banner、热门、状态）
router.patch('/games/:id/toggle', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))
    const { field } = req.body

    if (!field || !['isBanner', 'isHot', 'isActive'].includes(field)) {
      return res.status(400).json({ error: 'Invalid field. Must be isBanner, isHot, or isActive' })
    }

    // 获取当前值
    const game = await prisma.game.findUnique({
      where: { id },
      select: { [field]: true }
    })

    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    // 切换值
    const updateData: any = {}
    updateData[field] = !game[field as keyof typeof game]

    const updatedGame = await prisma.game.update({
      where: { id },
      data: updateData
    })

    res.json({ game: updatedGame })
  } catch (error) {
    console.error('Toggle game field error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 删除游戏（物理删除）
router.delete('/games/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    // 获取游戏信息，以便删除 HTML 文件
    const game = await prisma.game.findUnique({
      where: { id }
    })

    if (!game) {
      return res.status(404).json({ error: 'Game not found' })
    }

    // 删除 HTML 文件（如果存在）
    if (game.htmlFileName) {
      deleteHTMLFile(game.htmlFileName)
    }

    // 物理删除游戏
    await prisma.game.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete game error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 下载游戏 HTML 文件
router.get('/games/:id/download-html', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    const game = await prisma.game.findUnique({
      where: { id }
    })

    if (!game || !game.htmlFileName) {
      return res.status(404).json({ error: 'HTML file not found for this game' })
    }

    const filePath = path.join(process.cwd(), 'games-html', game.htmlFileName)

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'HTML file does not exist on server' })
    }

    res.download(filePath, game.htmlFileName, (err) => {
      if (err) {
        console.error('Download error:', err)
        res.status(500).json({ error: 'Failed to download file' })
      }
    })
  } catch (error) {
    console.error('Download HTML error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ==================== 配置管理 ====================

// 获取配置列表
router.get('/configs', async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.pointsConfig.findMany({
      orderBy: { key: 'asc' }
    })

    res.json({ configs })
  } catch (error) {
    console.error('Get configs error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取配置详情
router.get('/configs/:key', async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key)

    const config = await prisma.pointsConfig.findUnique({
      where: { key }
    })

    if (!config) {
      return res.status(404).json({ error: 'Config not found' })
    }

    res.json({ config })
  } catch (error) {
    console.error('Get config detail error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 更新配置
router.put('/configs/:key', async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key)
    const { value, description } = req.body

    const config = await prisma.pointsConfig.upsert({
      where: { key },
      update: {
        value: value || '',
        description: description || null,
      },
      create: {
        key,
        value: value || '',
        description: description || null,
      }
    })

    res.json({ config })
  } catch (error) {
    console.error('Update config error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 创建配置
router.post('/configs', async (req: AuthRequest, res: Response) => {
  try {
    const { key, value, description } = req.body

    if (!key || !value) {
      return res.status(400).json({ error: 'Key and value are required' })
    }

    const config = await prisma.pointsConfig.create({
      data: {
        key,
        value,
        description: description || null,
      }
    })

    res.json({ config })
  } catch (error) {
    console.error('Create config error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ==================== 数据统计 ====================

// 总体统计
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers,
      totalGames,
      totalGamePlays,
      totalPoints,
      todayUsers,
      todayGamePlays,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.game.count({ where: { isActive: true } }),
      prisma.gamePlay.count(),
      prisma.user.aggregate({ _sum: { points: true } }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.gamePlay.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
    ])

    res.json({
      totalUsers,
      totalGames,
      totalGamePlays,
      totalPoints: totalPoints._sum.points || 0,
      todayUsers,
      todayGamePlays,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 用户统计
router.get('/stats/users', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const usersByDate = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate }
      },
      _count: true
    })

    const pointsDistribution = await prisma.user.findMany({
      select: { points: true }
    })

    const distribution = {
      '0-100': 0,
      '100-500': 0,
      '500-1000': 0,
      '1000-5000': 0,
      '5000+': 0,
    }

    pointsDistribution.forEach(user => {
      const points = user.points
      if (points < 100) distribution['0-100']++
      else if (points < 500) distribution['100-500']++
      else if (points < 1000) distribution['500-1000']++
      else if (points < 5000) distribution['1000-5000']++
      else distribution['5000+']++
    })

    res.json({
      usersByDate,
      pointsDistribution: distribution,
    })
  } catch (error) {
    console.error('Get user stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 游戏统计
router.get('/stats/games', async (req: AuthRequest, res: Response) => {
  try {
    const gameStats = await prisma.gamePlay.groupBy({
      by: ['gameId'],
      _count: true,
      _sum: {
        duration: true,
        earnedPoints: true,
      }
    })

    const games = await prisma.game.findMany({
      where: { id: { in: gameStats.map(s => s.gameId) } },
      select: { id: true, name: true, icon: true }
    })

    const stats = gameStats.map(stat => {
      const game = games.find(g => g.id === stat.gameId)
      return {
        game: game || { id: stat.gameId, name: 'Unknown', icon: '' },
        playCount: stat._count,
        totalDuration: stat._sum.duration || 0,
        totalPoints: stat._sum.earnedPoints || 0,
      }
    })

    res.json({ stats })
  } catch (error) {
    console.error('Get game stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ==================== 游戏记录管理 ====================

// 获取游戏记录列表
router.get('/gameplays', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined
    const gameId = req.query.gameId ? parseInt(req.query.gameId as string) : undefined
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined

    const where: any = {}
    if (userId) where.userId = userId
    if (gameId) where.gameId = gameId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const [gameplays, total] = await Promise.all([
      prisma.gamePlay.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              walletAddr: true,
            }
          },
          game: {
            select: {
              id: true,
              name: true,
              icon: true,
            }
          }
        }
      }),
      prisma.gamePlay.count({ where })
    ])

    res.json({
      gameplays,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + gameplays.length < total
      }
    })
  } catch (error) {
    console.error('Get gameplays error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取游戏记录详情
router.get('/gameplays/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    const gameplay = await prisma.gamePlay.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            walletAddr: true,
            points: true,
          }
        },
        game: {
          select: {
            id: true,
            name: true,
            icon: true,
            url: true,
          }
        }
      }
    })

    if (!gameplay) {
      return res.status(404).json({ error: 'Gameplay not found' })
    }

    res.json({ gameplay })
  } catch (error) {
    console.error('Get gameplay detail error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 删除游戏记录
router.delete('/gameplays/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(String(req.params.id))

    await prisma.gamePlay.delete({
      where: { id }
    })

    res.json({ success: true })
  } catch (error) {
    console.error('Delete gameplay error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
