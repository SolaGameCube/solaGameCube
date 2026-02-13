import { useEffect, useState } from 'react'
import api from '../../services/api'
import './Dashboard.css'

interface Stats {
  totalUsers: number
  totalGames: number
  totalGamePlays: number
  totalPoints: number
  todayUsers: number
  todayGamePlays: number
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const response = await api.get<Stats>('/admin/stats')
      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!stats) {
    return <div className="error">加载失败</div>
  }

  return (
    <div className="dashboard">
      <h1>数据概览</h1>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">总用户数</div>
            <div className="stat-value">{stats.totalUsers}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎮</div>
          <div className="stat-content">
            <div className="stat-label">游戏数量</div>
            <div className="stat-value">{stats.totalGames}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-label">游戏记录</div>
            <div className="stat-value">{stats.totalGamePlays}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">总积分</div>
            <div className="stat-value">{stats.totalPoints.toLocaleString()}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">今日新增用户</div>
            <div className="stat-value">{stats.todayUsers}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-label">今日游戏记录</div>
            <div className="stat-value">{stats.todayGamePlays}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
