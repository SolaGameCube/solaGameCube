import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './GameList.css'

interface Game {
  id: number
  name: string
  icon: string
  url: string
  isBanner: boolean
  isHot: boolean
  isActive: boolean
  sortOrder: number
  htmlFileName?: string | null
}

export function GameList() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadGames()
  }, [page, search])

  const loadGames = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/games', {
        params: { page, limit: 20, search },
      })
      setGames(response.data.games)
      setTotalPages(response.data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to load games:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: number, field: 'isBanner' | 'isHot' | 'isActive') => {
    try {
      const response = await api.patch(`/admin/games/${id}/toggle`, { field })
      // 局部更新，不刷新整个页面
      setGames(games.map(game => 
        game.id === id ? { ...game, ...response.data.game } : game
      ))
    } catch (error) {
      console.error('Failed to toggle field:', error)
      alert('操作失败')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个游戏吗？此操作不可恢复！')) return
    try {
      await api.delete(`/admin/games/${id}`)
      // 从列表中移除，不刷新整个页面
      setGames(games.filter(game => game.id !== id))
    } catch (error) {
      console.error('Failed to delete game:', error)
      alert('删除失败')
    }
  }

  const handleDownloadHTML = async (gameId: number, fileName: string) => {
    try {
      // 使用 axios 下载文件，确保带上 token
      const response = await api.get(`/admin/games/${gameId}/download-html`, {
        responseType: 'blob',
      })
      
      // 创建 blob URL 并下载
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download HTML:', error)
      alert('下载失败')
    }
  }

  return (
    <div className="game-list">
      <div className="page-header">
        <h1>游戏管理</h1>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索游戏名称..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Link to="/admin/games/new" className="btn btn-primary">
            新建游戏
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>名称</th>
                <th>图标</th>
                <th>URL</th>
                <th>Banner</th>
                <th>热门</th>
                <th>状态</th>
                <th>排序</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <tr key={game.id}>
                  <td>{game.id}</td>
                  <td>{game.name}</td>
                  <td>{game.icon}</td>
                  <td className="url-cell">{game.url}</td>
                  <td>
                    <span 
                      onClick={() => handleToggle(game.id, 'isBanner')}
                      className={`toggle-field ${game.isBanner ? 'active' : 'inactive'}`}
                      title="点击切换 Banner 状态"
                    >
                      {game.isBanner ? '✓' : '-'}
                    </span>
                  </td>
                  <td>
                    <span 
                      onClick={() => handleToggle(game.id, 'isHot')}
                      className={`toggle-field ${game.isHot ? 'active' : 'inactive'}`}
                      title="点击切换热门状态"
                    >
                      {game.isHot ? '✓' : '-'}
                    </span>
                  </td>
                  <td>
                    <span 
                      onClick={() => handleToggle(game.id, 'isActive')}
                      className={`toggle-field ${game.isActive ? 'status-active' : 'status-inactive'}`}
                      title="点击切换启用/禁用状态"
                    >
                      {game.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td>{game.sortOrder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <Link to={`/admin/games/${game.id}`} className="btn btn-sm">
                        编辑
                      </Link>
                      {game.htmlFileName && (
                        <button
                          onClick={() => handleDownloadHTML(game.id, game.htmlFileName!)}
                          className="btn btn-sm"
                          style={{ backgroundColor: '#28a745', color: 'white' }}
                          title={`下载 ${game.htmlFileName}`}
                        >
                          下载 HTML
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="btn btn-sm btn-danger"
                      >
                        删除
                      </button>
                    </div>
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
