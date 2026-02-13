import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import authRoutes from './routes/auth'
import gamesRoutes from './routes/games'
import userRoutes from './routes/user'
import pointsRoutes from './routes/points'
import configRoutes from './routes/config'
import adminAuthRoutes from './routes/admin-auth'
import adminRoutes from './routes/admin'
import { seedDatabase } from './services/seed'

// 设置输出编码为 UTF-8（Windows 控制台）
if (process.platform === 'win32') {
  try {
    // 确保 stdout 和 stderr 使用 UTF-8
    if (process.stdout.setDefaultEncoding) {
      process.stdout.setDefaultEncoding('utf8')
    }
    if (process.stderr.setDefaultEncoding) {
      process.stderr.setDefaultEncoding('utf8')
    }
  } catch (e) {
    // 忽略设置失败
  }
}

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// CORS 配置
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // 开发环境：允许所有来源
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true)
    }
    
    // 生产环境：检查允许的来源
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || []
    
    // 如果没有设置 CORS_ORIGIN，允许所有（不推荐生产环境）
    if (allowedOrigins.length === 0) {
      console.warn('⚠️  CORS_ORIGIN 未设置，允许所有来源（生产环境不推荐）')
      return callback(null, true)
    }
    
    // 检查来源是否在允许列表中
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('不允许的 CORS 来源'))
    }
  },
  credentials: true,
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/games', gamesRoutes)
app.use('/api/user', userRoutes)
app.use('/api/points', pointsRoutes)
app.use('/api/config', configRoutes)
app.use('/api/admin-auth', adminAuthRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve admin panel (both development and production)
const adminDistPath = path.join(__dirname, '../admin/dist')
const adminDistExists = require('fs').existsSync(adminDistPath)

if (adminDistExists) {
  // Serve static files from admin/dist
  app.use('/admin', express.static(adminDistPath))
  // Catch-all route for admin panel SPA routing
  // This must be after static files middleware
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'))
  })
  // Handle all admin routes (for SPA client-side routing)
  app.get(/^\/admin\/.+/, (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'))
  })
} else {
  // If dist doesn't exist, show helpful message
  app.get('/admin', (req, res) => {
    res.status(503).send(`
      <h1>管理后台未构建</h1>
      <p>请先构建管理后台：</p>
      <pre>cd server/admin
npm run build</pre>
      <p>或者使用开发服务器：</p>
      <pre>cd server/admin
npm run dev</pre>
      <p>然后访问 <a href="http://localhost:3002">http://localhost:3002</a></p>
    `)
  })
}

// Serve generated HTML files (games-html directory)
app.use('/games-html', express.static(path.join(__dirname, '../games-html')))

// Seed database and start server
seedDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📱 API endpoints:`)
    console.log(`   - POST /api/auth/login`)
    console.log(`   - GET  /api/games`)
    console.log(`   - GET  /api/games/banners`)
    console.log(`   - GET  /api/games/hot`)
    console.log(`   - GET  /api/user/profile`)
    console.log(`   - GET  /api/user/history`)
    console.log(`   - POST /api/points/earn`)
    console.log(`   - GET  /api/config/rules`)
  })
})
