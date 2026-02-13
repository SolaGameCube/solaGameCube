import { useEffect, useState } from 'react'
import api from '../../services/api'
import './GamePlayList.css'

interface GamePlay {
  id: number
  duration: number
  earnedPoints: number
  adClicks: number
  createdAt: string
  user: {
    id: number
    walletAddr: string
  }
  game: {
    id: number
    name: string
    icon: string
  }
}

export function GamePlayList() {
  const [gameplays, setGameplays] = useState<GamePlay[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    userId: '',
    gameId: '',
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    loadGameplays()
  }, [page, filters])

  const loadGameplays = async () => {
    setLoading(true)
    try {
      const params: any = { page, limit: 20 }
      if (filters.userId) params.userId = filters.userId
      if (filters.gameId) params.gameId = filters.gameId
      if (filters.startDate) params.startDate = filters.startDate
      if (filters.endDate) params.endDate = filters.endDate

      const response = await api.get('/admin/gameplays', { params })
      setGameplays(response.data.gameplays)
      setTotalPages(response.data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to load gameplays:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条游戏记录吗？')) return
    try {
      await api.delete(`/admin/gameplays/${id}`)
      loadGameplays()
    } catch (error) {
      console.error('Failed to delete gameplay:', error)
      alert('删除失败')
    }
  }

  return (
    <div className="gameplay-list">
      <h1>游戏记录管理</h1>

      <div className="filters">
        <input
          type="text"
          placeholder="用户ID"
          value={filters.userId}
          onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
        />
        <input
          type="text"
          placeholder="游戏ID"
          value={filters.gameId}
          onChange={(e) => setFilters({ ...filters, gameId: e.target.value })}
        />
        <input
          type="date"
          value={filters.startDate}
          onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
        />
        <button onClick={() => {
          setFilters({ userId: '', gameId: '', startDate: '', endDate: '' })
          setPage(1)
        }} className="btn">
          清除筛选
        </button>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户</th>
                <th>游戏</th>
                <th>时长（秒）</th>
                <th>获得积分</th>
                <th>广告点击</th>
                <th>时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {gameplays.map((play) => (
                <tr key={play.id}>
                  <td>{play.id}</td>
                  <td>{play.user.walletAddr}</td>
                  <td>{play.game.name}</td>
                  <td>{play.duration}</td>
                  <td>{play.earnedPoints}</td>
                  <td>{play.adClicks}</td>
                  <td>{new Date(play.createdAt).toLocaleString()}</td>
                  <td>
                    <button
                      onClick={() => handleDelete(play.id)}
                      className="btn btn-sm btn-danger"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  )
}
