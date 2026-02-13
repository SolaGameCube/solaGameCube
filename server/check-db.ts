import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('📊 检查数据库记录...\n')

    // 检查用户
    const users = await prisma.user.findMany({
      include: {
        gamePlays: {
          include: {
            game: {
              select: {
                id: true,
                name: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10 // 只显示最近10条
        }
      }
    })

    console.log(`👥 用户数量: ${users.length}`)
    if (users.length > 0) {
      users.forEach(user => {
        console.log(`\n  用户 ID: ${user.id}`)
        console.log(`  钱包地址: ${user.walletAddr}`)
        console.log(`  积分: ${user.points}`)
        console.log(`  创建时间: ${user.createdAt}`)
        console.log(`  游戏记录数: ${user.gamePlays.length}`)
        
        if (user.gamePlays.length > 0) {
          console.log(`  最近游戏记录:`)
          user.gamePlays.forEach((play, index) => {
            console.log(`    ${index + 1}. 游戏: ${play.game.name} (ID: ${play.gameId})`)
            console.log(`       时长: ${play.duration}秒 (${Math.floor(play.duration / 60)}分${play.duration % 60}秒)`)
            console.log(`       获得积分: ${play.earnedPoints}`)
            console.log(`       广告点击: ${play.adClicks}`)
            console.log(`       时间: ${play.createdAt}`)
          })
        }
      })
    }

    // 检查游戏记录总数
    const totalGamePlays = await prisma.gamePlay.count()
    console.log(`\n🎮 游戏记录总数: ${totalGamePlays}`)

    // 检查游戏
    const games = await prisma.game.findMany({
      select: {
        id: true,
        name: true,
      }
    })
    console.log(`\n🎯 游戏数量: ${games.length}`)
    if (games.length > 0) {
      console.log(`  游戏列表: ${games.map(g => `${g.name}(ID:${g.id})`).join(', ')}`)
    }

    // 检查配置
    const configs = await prisma.pointsConfig.findMany()
    console.log(`\n⚙️  配置项数量: ${configs.length}`)

  } catch (error) {
    console.error('❌ 查询数据库失败:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
