import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../utils/bcrypt'

const prisma = new PrismaClient()

export async function seedDatabase() {
  console.log('🌱 Seeding database...')
  const enableDemoSeed = process.env.ENABLE_DEMO_SEED === 'true'

  // 检查数据库是否已有数据
  const [userCount, gamePlayCount, gameCount, configCount] = await Promise.all([
    prisma.user.count(),
    prisma.gamePlay.count(),
    prisma.game.count(),
    prisma.pointsConfig.count(),
  ])

  const hasData = userCount > 0 || gamePlayCount > 0 || gameCount > 0 || configCount > 0
  const forceSeed = process.env.FORCE_SEED === 'true'

  // 只在数据库为空或强制重新初始化时才清空数据
  // 注意：永远不清空 User 表和 GamePlay 表，保留用户积分和游戏记录
  if (enableDemoSeed && (!hasData || forceSeed)) {
    if (forceSeed) {
      console.log('   ⚠️  FORCE_SEED=true, clearing data (except User and GamePlay)...')
    } else {
      console.log('   ℹ️  Database is empty, initializing...')
    }
    
    // 只清空游戏和配置，不清空用户数据和游戏记录
    await prisma.game.deleteMany()
    await prisma.pointsConfig.deleteMany()
    console.log('   ✓ Cleared games and config (preserved user data and game history)')
  } else {
    console.log('   ℹ️  Database already has data, skipping data clearing')
    console.log(`      - Users: ${userCount}, Game Plays: ${gamePlayCount}, Games: ${gameCount}, Configs: ${configCount}`)
  }

  // 智能初始化积分规则配置：
  // - 只创建缺失项
  // - 不覆盖已有配置（避免重启后把后台修改过的值冲掉）
  const configs = [
    // ⚠️ 测试规则：1秒奖励11分
    { key: 'points_15min', value: '11', description: '游戏15分钟获得的积分（测试：1秒=11分）' },
    { key: 'points_30min', value: '20', description: '游戏30分钟获得的积分' },
    { key: 'points_60min', value: '45', description: '游戏60分钟获得的积分' },
    { key: 'points_per_ad_click', value: '50', description: '每次广告点击获得的积分' },
    { key: 'open_game_cost', value: '0', description: '打开游戏消耗的积分' },
    { key: 'min_play_time', value: '1', description: '最小游戏时长（秒）才能获得积分（测试：1秒）' },
    { key: 'announcement', value: '欢迎来到 SolaGameCube！🎮\n\n这是一个全新的游戏平台，在这里您可以：\n\n• 畅玩各种精彩游戏\n• 通过游戏时长和广告点击获得积分\n• 未来可用积分兑换 SKR 代币\n\n开始您的游戏之旅吧！', description: '欢迎公告' }, // 公告内容，如果为空则不显示
    { key: 'exchange_info', value: JSON.stringify({
      title: '积分兑换 SKR',
      icon: '💰',
      description: '好消息！您的游戏积分即将可以兑换 SKR 代币了！\n\n通过玩游戏获得的积分，未来将可以按照一定比例兑换成 SKR 代币，让您的游戏时间更有价值。\n\n具体兑换规则、兑换比例和开放时间将在后续版本中推出，敬请期待！\n\n继续玩游戏，积累更多积分，为兑换做好准备吧！🎮'
    }), description: '兑换提示内容（JSON格式，包含 title、icon、description 字段）' },
  ]

  if (enableDemoSeed) {
    let createdConfigCount = 0
    let preservedConfigCount = 0

    for (const config of configs) {
      const exists = await prisma.pointsConfig.findUnique({
        where: { key: config.key },
        select: { id: true },
      })

      if (exists) {
        preservedConfigCount++
        continue
      }

      await prisma.pointsConfig.create({
        data: config,
      })
      createdConfigCount++
    }

    console.log(
      `   ✓ Points config initialized (created: ${createdConfigCount}, preserved: ${preservedConfigCount})`
    )
  } else {
    console.log('   ℹ️  Demo config seeding disabled (ENABLE_DEMO_SEED != true)')
  }

  // 智能初始化游戏列表（只创建不存在的游戏）
  const games = [
    {
      name: 'Moto X3M',
      icon: 'https://img.gamemonetize.com/3dwqqh0cdhpf2z9n4cagabdqmq3qb4ik/512x384.jpg',
      url: 'local://game/index.html',
      description: 'Moto X3M 是一款刺激的摩托车越野游戏。跨越障碍物，完成各种高难度特技，挑战你的极限！',
      shortDesc: '刺激的摩托车越野游戏',
      orientation: 'landscape',
      isBanner: true,
      isHot: true,
      bannerImage: 'https://img.gamemonetize.com/3dwqqh0cdhpf2z9n4cagabdqmq3qb4ik/512x384.jpg',
      sortOrder: 1
    },
    {
      name: 'Pac-Man',
      icon: 'https://www.google.com/logos/fnbx/pacman/pacman-icon.png',
      url: 'https://www.google.com/logos/2010/pacman10-i.html',
      description: '经典的吃豆人游戏！控制吃豆人吃掉所有豆子，同时躲避幽灵的追捕。',
      shortDesc: '永恒的经典街机游戏',
      orientation: 'landscape',
      isBanner: true,
      isHot: true,
      bannerImage: 'https://www.google.com/logos/2010/pacman10-hp.png',
      sortOrder: 2
    },
    {
      name: '2048',
      icon: 'https://play2048.co/meta/apple-touch-icon.png',
      url: 'https://play2048.co/',
      description: '经典的数字合并游戏。滑动方块使相同的数字合并，目标是创建2048方块！',
      shortDesc: '经典数字合并益智游戏',
      orientation: 'portrait',
      isBanner: true,
      isHot: true,
      bannerImage: 'https://play2048.co/meta/og-image.png',
      sortOrder: 3
    },
    {
      name: 'Flappy Bird',
      icon: 'https://flappybird.io/favicon.png',
      url: 'https://flappybird.io/',
      description: '简单却令人上瘾的飞行游戏。点击屏幕控制小鸟飞行，避开管道障碍物！',
      shortDesc: '简单却令人上瘾的飞行游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: true,
      sortOrder: 4
    },
    {
      name: 'Snake',
      icon: 'https://playsnake.org/favicon.ico',
      url: 'https://playsnake.org/',
      description: '经典贪吃蛇游戏。控制蛇吃食物变长，但不要撞到墙壁或自己！',
      shortDesc: '经典贪吃蛇游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: true,
      sortOrder: 5
    },
    {
      name: 'Subway Surfers',
      icon: 'https://www.subwaysurfers.com/favicon.ico',
      url: 'https://www.subwaysurfers.com/',
      description: '在地铁轨道上尽情冲刺！避开障碍物，收集金币，挑战最高分！',
      shortDesc: '在全球轨道上尽情冲刺',
      orientation: 'portrait',
      isBanner: false,
      isHot: true,
      sortOrder: 6
    },
    {
      name: 'Tetris',
      icon: 'https://tetris.com/favicon.ico',
      url: 'https://tetris.com/play-tetris',
      description: '经典俄罗斯方块！旋转、移动方块，消除完整行获得高分！',
      shortDesc: '经典俄罗斯方块益智游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: true,
      sortOrder: 7
    },
    {
      name: 'Asteroids',
      icon: 'https://www.asteroids-game.com/favicon.ico',
      url: 'https://www.asteroids-game.com/',
      description: '驾驶飞船在太空中摧毁小行星！躲避碰撞，获得高分！',
      shortDesc: '太空射击经典游戏',
      orientation: 'landscape',
      isBanner: false,
      isHot: true,
      sortOrder: 8
    },
    // 添加更多普通游戏用于测试加载更多
    {
      name: 'Chess',
      icon: 'https://www.chess.com/favicon.ico',
      url: 'https://www.chess.com/play/computer',
      description: '国际象棋！挑战AI，提升你的棋艺！',
      shortDesc: '经典国际象棋',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 9
    },
    {
      name: 'Sudoku',
      icon: 'https://sudoku.com/favicon.ico',
      url: 'https://sudoku.com/',
      description: '数独游戏！用逻辑填满9x9网格！',
      shortDesc: '经典数独益智游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 10
    },
    {
      name: 'Crossword',
      icon: 'https://www.crossword.com/favicon.ico',
      url: 'https://www.crossword.com/',
      description: '填字游戏！根据提示填写单词！',
      shortDesc: '经典填字游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 11
    },
    {
      name: 'Word Search',
      icon: 'https://wordsearch.com/favicon.ico',
      url: 'https://wordsearch.com/',
      description: '单词搜索！在字母网格中找到隐藏的单词！',
      shortDesc: '单词搜索益智游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 12
    },
    {
      name: 'Memory Game',
      icon: 'https://memory-game.com/favicon.ico',
      url: 'https://memory-game.com/',
      description: '记忆游戏！翻牌配对，测试你的记忆力！',
      shortDesc: '记忆配对游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 13
    },
    {
      name: 'Puzzle',
      icon: 'https://puzzle.com/favicon.ico',
      url: 'https://puzzle.com/',
      description: '拼图游戏！将碎片拼成完整图片！',
      shortDesc: '经典拼图游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 14
    },
    {
      name: 'Mahjong',
      icon: 'https://mahjong.com/favicon.ico',
      url: 'https://mahjong.com/',
      description: '麻将游戏！匹配相同的牌，清除所有方块！',
      shortDesc: '经典麻将消除游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 15
    },
    {
      name: 'Solitaire',
      icon: 'https://solitaire.com/favicon.ico',
      url: 'https://solitaire.com/',
      description: '纸牌接龙！按顺序排列所有纸牌！',
      shortDesc: '经典纸牌接龙',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 16
    },
    {
      name: 'Bubble Shooter',
      icon: 'https://bubbleshooter.com/favicon.ico',
      url: 'https://bubbleshooter.com/',
      description: '泡泡射击！射击相同颜色的泡泡消除它们！',
      shortDesc: '经典泡泡射击游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 17
    },
    {
      name: 'Candy Crush',
      icon: 'https://candycrush.com/favicon.ico',
      url: 'https://candycrush.com/',
      description: '糖果消除！交换糖果，创造特殊组合！',
      shortDesc: '经典糖果消除游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 18
    },
    {
      name: 'Angry Birds',
      icon: 'https://angrybirds.com/favicon.ico',
      url: 'https://angrybirds.com/',
      description: '愤怒的小鸟！用弹弓发射小鸟，摧毁所有猪！',
      shortDesc: '经典物理射击游戏',
      orientation: 'landscape',
      isBanner: false,
      isHot: false,
      sortOrder: 19
    },
    {
      name: 'Fruit Ninja',
      icon: 'https://fruitninja.com/favicon.ico',
      url: 'https://fruitninja.com/',
      description: '水果忍者！滑动手指切水果，但要小心炸弹！',
      shortDesc: '经典切水果游戏',
      orientation: 'portrait',
      isBanner: false,
      isHot: false,
      sortOrder: 20
    },
  ]

  if (enableDemoSeed) {
    // 获取所有现有游戏（按名称检查，避免重复创建）
    const existingGames = await prisma.game.findMany({
      select: { name: true, url: true },
    })
    const existingGameNames = new Set(existingGames.map((g: { name: string; url: string }) => g.name))
    const existingGameUrls = new Set(existingGames.map((g: { name: string; url: string }) => g.url))

    // 只创建不存在的游戏
    const gamesToCreate = games.filter(
      game => !existingGameNames.has(game.name) && !existingGameUrls.has(game.url)
    )

    if (gamesToCreate.length > 0) {
      await prisma.game.createMany({ data: gamesToCreate })
      console.log(`   ✓ Created ${gamesToCreate.length} new games (${games.length - gamesToCreate.length} already exist)`)
    } else {
      console.log(`   ✓ All ${games.length} games already exist, skipping creation`)
    }
  } else {
    console.log('   ℹ️  Demo game seeding disabled (ENABLE_DEMO_SEED != true)')
  }

  // 创建默认管理员账户
  try {
    // 使用 $queryRaw 检查表是否存在，避免 Prisma Client 未生成时的错误
    const tableExists = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT name FROM sqlite_master WHERE type='table' AND name='Admin'
    `
    
    if (tableExists.length > 0) {
      const adminCount = await (prisma as any).admin.count().catch(() => 0)
      if (adminCount === 0) {
        const defaultPassword = await hashPassword('admin123')
        await (prisma as any).admin.create({
          data: {
            username: 'admin',
            password: defaultPassword,
            role: 'admin',
          }
        })
        console.log('   ✓ Default admin created (username: admin, password: admin123)')
      } else {
        console.log('   ℹ️  Admin already exists, skipping admin creation')
      }
    } else {
      console.warn('   ⚠️  Admin table not found, will be created on next migration')
    }
  } catch (error: any) {
    // 如果 Admin 表不存在，忽略错误（会在迁移时创建）
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      console.warn('   ⚠️  Admin table not found, will be created on next migration')
    } else {
      console.error('   ❌ Error creating admin:', error)
    }
  }

  console.log('✅ Database seeding completed!')
}
