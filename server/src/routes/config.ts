import { Router, Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'

const router = Router()
const prisma = new PrismaClient()

// 获取积分规则配置
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const configs = await prisma.pointsConfig.findMany()
    
    const rules = Object.fromEntries(
      configs.map(c => [c.key, {
        value: c.value,
        description: c.description
      }])
    )

    res.json({ rules })
  } catch (error) {
    console.error('Get config error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取公告
router.get('/announcement', async (req: Request, res: Response) => {
  try {
    const announcement = await prisma.pointsConfig.findUnique({
      where: { key: 'announcement' }
    })

    if (announcement && announcement.value) {
      // 使用 id + value 的 hash 作为公告唯一ID
      // 如果公告内容更新了，hash 会变化，就会重新显示
      const valueHash = Buffer.from(announcement.value).toString('base64').substring(0, 16)
      const announcementId = `${announcement.id}_${valueHash}`
      
      res.json({ 
        hasAnnouncement: true,
        id: announcementId,
        title: announcement.description || '公告',
        content: announcement.value
      })
    } else {
      res.json({ hasAnnouncement: false })
    }
  } catch (error) {
    console.error('Get announcement error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// 获取兑换提示内容
router.get('/exchange-info', async (req: Request, res: Response) => {
  try {
    const exchangeInfo = await prisma.pointsConfig.findUnique({
      where: { key: 'exchange_info' }
    })

    if (exchangeInfo && exchangeInfo.value) {
      // 如果 value 是 JSON 字符串，解析它
      let content
      try {
        content = JSON.parse(exchangeInfo.value)
      } catch {
        // 如果不是 JSON，直接使用 value
        content = {
          title: '积分兑换 SKR',
          icon: '💰',
          description: exchangeInfo.value
        }
      }

      res.json({ 
        title: content.title || '积分兑换 SKR',
        icon: content.icon || '💰',
        description: content.description || exchangeInfo.value
      })
    } else {
      // 默认内容
      res.json({
        title: '积分兑换 SKR',
        icon: '💰',
        description: '好消息！您的游戏积分即将可以兑换 SKR 代币了！\n\n通过玩游戏获得的积分，未来将可以按照一定比例兑换成 SKR 代币，让您的游戏时间更有价值。\n\n具体兑换规则、兑换比例和开放时间将在后续版本中推出，敬请期待！\n\n继续玩游戏，积累更多积分，为兑换做好准备吧！🎮'
      })
    }
  } catch (error) {
    console.error('Get exchange info error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
