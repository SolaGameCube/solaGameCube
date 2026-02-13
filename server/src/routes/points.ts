import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 上报游戏积分
router.post('/earn', async (req: Request, res: Response) => {
  try {
    const walletAddr = req.headers['x-wallet-address'] as string
    const { gameId, duration, adClicks, sessionId } = req.body

    if (!walletAddr) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!gameId) {
      return res.status(400).json({ error: 'Missing gameId' })
    }

    const user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 获取积分规则
    const rules = await prisma.pointsConfig.findMany()
    const rulesMap = Object.fromEntries(rules.map(r => [r.key, parseInt(r.value)]))

    const pointsPerAdClick = rulesMap['points_per_ad_click'] || 50
    const openGameCost = rulesMap['open_game_cost'] || 0

    // 计算游戏时长（分钟）
    const durationMinutes = Math.floor((duration || 0) / 60)
    
    // 获取最小游戏时长要求（秒），默认15分钟
    const minPlayTime = rulesMap['min_play_time'] || 900 // 15分钟 = 900秒
    
    // 检查当天该用户该游戏已经获得过的最高积分档
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const todayGamePlays = await prisma.gamePlay.findMany({
      where: {
        userId: user.id,
        gameId: parseInt(gameId),
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // 计算今天该游戏已经获得的时长积分总和
    // 注意：只统计时长积分，不包括广告积分
    // 从 todayGamePlays 中计算时长积分（根据游玩时长计算，不是直接取 earnedPoints）
    let todayTimePointsEarned = 0
    
    for (const play of todayGamePlays) {
      const playMinutes = Math.floor(play.duration / 60)
      let playTimePoints = 0
      
      // 根据游玩时长计算应该获得的时长积分
      if (playMinutes >= 60) {
        playTimePoints = 45 // 60分钟档
      } else if (playMinutes >= 30) {
        playTimePoints = 20 // 30分钟档
      } else if (playMinutes >= 15) {
        playTimePoints = 10 // 15分钟档
      }
      
      todayTimePointsEarned += playTimePoints
    }
    
    // 计算当前游戏时长对应的积分档和积分
    let currentTier = 0
    let timePoints = 0
    
    // 达到最小游戏时长后，按 15/30/60 分钟分档计分
    if (duration >= minPlayTime) {
      if (durationMinutes >= 60) {
        currentTier = 3 // 60分钟档
        timePoints = 45
      } else if (durationMinutes >= 30) {
        currentTier = 2 // 30分钟档
        timePoints = 20
      } else if (durationMinutes >= 15) {
        currentTier = 1 // 15分钟档
        timePoints = 10
      }
    }
    
    // 限制：一个游戏每天最多获得45分时长积分
    const maxTimePointsPerGamePerDay = 45
    const remainingTimePoints = maxTimePointsPerGamePerDay - todayTimePointsEarned
    
    if (timePoints > 0 && remainingTimePoints <= 0) {
      console.log(`当天同游戏时长积分已达上限（45分），不给予时长积分`, {
        todayTimePointsEarned,
        currentTimePoints: timePoints,
        durationMinutes,
        todayPlays: todayGamePlays.length
      })
      timePoints = 0
    } else if (timePoints > remainingTimePoints) {
      // 如果本次积分会超过上限，只给剩余的部分
      console.log(`当天同游戏时长积分将超过上限，只给予剩余部分`, {
        todayTimePointsEarned,
        currentTimePoints: timePoints,
        adjustedTimePoints: remainingTimePoints,
        durationMinutes
      })
      timePoints = remainingTimePoints
    }
    
    // 广告点击积分（退出游戏时一次性计算，不重复）
    // 限制：同一用户每天最多只能获得3次广告点击积分
    const todayAllGamePlays = await prisma.gamePlay.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        adClicks: true
      }
    })
    
    // 统计今天已经计分的广告点击总数
    const todayAdClicksCount = todayAllGamePlays.reduce((sum, play) => sum + play.adClicks, 0)
    
    // 计算本次可以计分的广告点击次数（每天最多3次）
    const maxAdClicksPerDay = 3
    const remainingAdClicks = Math.max(0, maxAdClicksPerDay - todayAdClicksCount)
    const validAdClicks = Math.min(adClicks || 0, remainingAdClicks)
    const adPoints = validAdClicks * pointsPerAdClick
    
    if (adClicks > 0 && validAdClicks < adClicks) {
      console.log(`当天广告点击积分已达上限，本次只计${validAdClicks}次`, {
        todayAdClicksCount,
        currentAdClicks: adClicks,
        validAdClicks,
        maxAdClicksPerDay
      })
    }
    
    const earnedPoints = timePoints + adPoints - openGameCost
    
    // 调试日志
    console.log('积分计算:', {
      duration,
      durationMinutes,
      timePoints,
      currentTier,
      todayTimePointsEarned,
      maxTimePointsPerGamePerDay: 45,
      todayPlaysCount: todayGamePlays.length,
      adClicks: adClicks || 0,
      validAdClicks,
      todayAdClicksCount,
      adPoints,
      openGameCost,
      earnedPoints: Math.max(0, earnedPoints)
    })

    // 创建游戏记录（退出游戏时一次性计算，不会重复）
    const gamePlay = await prisma.gamePlay.create({
      data: {
        userId: user.id,
        gameId: parseInt(gameId),
        duration: duration || 0,
        earnedPoints: Math.max(0, earnedPoints),
        adClicks: adClicks || 0
      }
    })

    // 更新用户积分
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        points: { increment: Math.max(0, earnedPoints) }
      }
    })

    res.json({
      success: true,
      earnedPoints: Math.max(0, earnedPoints),
      breakdown: {
        timePoints,
        adPoints,
        openGameCost,
        durationMinutes,
        milestone: durationMinutes >= 60 ? '60分钟' : durationMinutes >= 30 ? '30分钟' : durationMinutes >= 15 ? '15分钟' : '未达标'
      },
      totalPoints: updatedUser.points,
      gamePlayId: gamePlay.id
    })
  } catch (error) {
    console.error('Earn points error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 上报广告点击
router.post('/ad-click', async (req: Request, res: Response) => {
  try {
    const walletAddr = req.headers['x-wallet-address'] as string
    const { gamePlayId } = req.body

    if (!walletAddr || !gamePlayId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const user = await prisma.user.findUnique({
      where: { walletAddr }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // 获取广告点击积分
    const adPointsConfig = await prisma.pointsConfig.findUnique({
      where: { key: 'points_per_ad_click' }
    })
    const adPoints = parseInt(adPointsConfig?.value || '50')

    // 更新游戏记录
    await prisma.gamePlay.update({
      where: { id: parseInt(gamePlayId) },
      data: {
        adClicks: { increment: 1 },
        earnedPoints: { increment: adPoints }
      }
    })

    // 更新用户积分
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        points: { increment: adPoints }
      }
    })

    res.json({
      success: true,
      adPoints,
      totalPoints: updatedUser.points
    })
  } catch (error) {
    console.error('Ad click error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
