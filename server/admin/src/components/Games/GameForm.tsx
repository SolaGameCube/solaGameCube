import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './GameForm.css'

interface Game {
  id?: number
  name: string
  icon: string
  url: string
  description: string
  shortDesc: string
  orientation: string
  isBanner: boolean
  isHot: boolean
  bannerImage: string | null
  isActive: boolean
  sortOrder: number
  sourceUrl?: string | null
  gameDistributionId?: string | null
  htmlFileName?: string | null
}

export function GameForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const [loading, setLoading] = useState(isEdit)
  const [game, setGame] = useState<Game>({
    name: '',
    icon: '',
    url: '',
    description: '',
    shortDesc: '',
    orientation: 'landscape',
    isBanner: false,
    isHot: false,
    bannerImage: null,
    isActive: true,
    sortOrder: 0,
    sourceUrl: null,
    gameDistributionId: null,
    htmlFileName: null,
  })

  useEffect(() => {
    if (isEdit) {
      loadGame()
    }
  }, [id])

  const loadGame = async () => {
    try {
      const response = await api.get(`/admin/games/${id}`)
      setGame(response.data.game)
    } catch (error) {
      console.error('Failed to load game:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let response
      if (isEdit) {
        response = await api.put(`/admin/games/${id}`, game)
      } else {
        // 新建游戏时，如果 sortOrder 是默认值 0，不发送该字段，让后端自动计算
        const { sortOrder, ...gameDataWithoutSortOrder } = game
        const gameData = sortOrder === 0 ? gameDataWithoutSortOrder : game
        response = await api.post('/admin/games', gameData)
      }

      // 如果生成了 HTML 文件，自动下载
      if (response.data.htmlFile) {
        const gameId = response.data.game.id
        const fileName = response.data.htmlFile.fileName
        try {
          const downloadResponse = await api.get(`/admin/games/${gameId}/download-html`, {
            responseType: 'blob',
          })
          
          // 创建 blob URL 并下载
          const blob = new Blob([downloadResponse.data])
          const url = window.URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = fileName
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } catch (error) {
          console.error('Failed to auto-download HTML:', error)
        }
      }

      navigate('/admin/games')
    } catch (error: any) {
      console.error('Failed to save game:', error)
      alert(error.response?.data?.error || '保存失败')
    }
  }

  const handleDownloadHTML = async () => {
    if (!id || !game.htmlFileName) return
    
    try {
      // 使用 axios 下载文件，确保带上 token
      const response = await api.get(`/admin/games/${id}/download-html`, {
        responseType: 'blob',
      })
      
      // 创建 blob URL 并下载
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = game.htmlFileName || 'game.html'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download HTML:', error)
      alert('下载失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="game-form">
      <div className="form-header">
        <button onClick={() => navigate('/admin/games')} className="btn">
          ← 返回
        </button>
        <h1>{isEdit ? '编辑游戏' : '新建游戏'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-group">
          <label>游戏名称 *</label>
          <input
            type="text"
            value={game.name}
            onChange={(e) => setGame({ ...game, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>图标 URL *</label>
          <input
            type="text"
            value={game.icon}
            onChange={(e) => setGame({ ...game, icon: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>游戏 URL *</label>
          <input
            type="text"
            value={game.url}
            onChange={(e) => {
              const newUrl = e.target.value
              setGame({ 
                ...game, 
                url: newUrl,
                // 如果已勾选生成 HTML，自动更新 sourceUrl 为游戏 URL
                sourceUrl: game.sourceUrl ? newUrl : game.sourceUrl
              })
            }}
            required
          />
          <small>此 URL 将用于游戏加载和 HTML 文件生成</small>
        </div>

        <div className="form-group">
          <label>简介</label>
          <textarea
            value={game.description}
            onChange={(e) => setGame({ ...game, description: e.target.value })}
            rows={4}
          />
        </div>

        <div className="form-group">
          <label>一句话简介</label>
          <input
            type="text"
            value={game.shortDesc}
            onChange={(e) => setGame({ ...game, shortDesc: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>屏幕方向</label>
          <select
            value={game.orientation}
            onChange={(e) => setGame({ ...game, orientation: e.target.value })}
          >
            <option value="landscape">横屏</option>
            <option value="portrait">竖屏</option>
          </select>
        </div>

        <div className="form-group">
          <label>Banner 图片 URL</label>
          <input
            type="text"
            value={game.bannerImage || ''}
            onChange={(e) => setGame({ ...game, bannerImage: e.target.value || null })}
          />
        </div>

        <div className="form-row">
          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={game.isBanner}
                onChange={(e) => setGame({ ...game, isBanner: e.target.checked })}
              />
              设为 Banner
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={game.isHot}
                onChange={(e) => setGame({ ...game, isHot: e.target.checked })}
              />
              设为热门
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={game.isActive}
                onChange={(e) => setGame({ ...game, isActive: e.target.checked })}
              />
              启用
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>排序</label>
          <input
            type="number"
            value={game.sortOrder}
            onChange={(e) => setGame({ ...game, sortOrder: parseInt(e.target.value) || 0 })}
          />
        </div>

        <div className="form-group">
          <label>GameDistribution 游戏 ID</label>
          <input
            type="text"
            value={game.gameDistributionId || ''}
            onChange={(e) => setGame({ ...game, gameDistributionId: e.target.value || null })}
            placeholder="例如: abc123def456"
          />
          <small>填写后，勾选下方选项可生成 HTML 文件</small>
        </div>

        <div className="form-group">
          <label>是否生成 HTML 文件</label>
          <input
            type="checkbox"
            checked={!!game.sourceUrl}
            onChange={(e) => setGame({ ...game, sourceUrl: e.target.checked ? game.url : null })}
            disabled={!game.gameDistributionId}
          />
          <small>勾选后，保存时会自动生成 HTML 文件，文件名将从游戏 URL 中提取。需要先填写 GameDistribution 游戏 ID</small>
        </div>

        {game.htmlFileName && (
          <div className="form-group">
            <label>生成的 HTML 文件</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>{game.htmlFileName}</span>
              <button
                type="button"
                onClick={handleDownloadHTML}
                className="btn btn-secondary"
                style={{ padding: '5px 15px' }}
              >
                下载
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            保存
          </button>
          <button type="button" onClick={() => navigate('/admin/games')} className="btn">
            取消
          </button>
        </div>
      </form>
    </div>
  )
}
