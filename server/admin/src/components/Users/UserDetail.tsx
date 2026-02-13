import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './UserDetail.css'

interface User {
  id: number
  walletAddr: string
  points: number
  avatar: string | null
  createdAt: string
  gamePlays: any[]
}

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [points, setPoints] = useState(0)
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    loadUser()
  }, [id])

  const loadUser = async () => {
    try {
      const response = await api.get(`/admin/users/${id}`)
      const userData = response.data.user
      setUser(userData)
      setPoints(userData.points)
      setAvatar(userData.avatar || '')
    } catch (error) {
      console.error('Failed to load user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.put(`/admin/users/${id}`, { points, avatar })
      setEditing(false)
      loadUser()
      alert('保存成功')
    } catch (error) {
      console.error('Failed to update user:', error)
      alert('保存失败')
    }
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!user) {
    return <div className="error">用户不存在</div>
  }

  return (
    <div className="user-detail">
      <div className="detail-header">
        <button onClick={() => navigate('/admin/users')} className="btn">
          ← 返回
        </button>
        <h1>用户详情</h1>
      </div>

      <div className="detail-card">
        <div className="detail-row">
          <label>ID:</label>
          <span>{user.id}</span>
        </div>
        <div className="detail-row">
          <label>钱包地址:</label>
          <span>{user.walletAddr}</span>
        </div>
        <div className="detail-row">
          <label>积分:</label>
          {editing ? (
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            />
          ) : (
            <span>{user.points}</span>
          )}
        </div>
        <div className="detail-row">
          <label>头像:</label>
          {editing ? (
            <input
              type="text"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              placeholder="1-9.png"
            />
          ) : (
            <span>{user.avatar || '-'}</span>
          )}
        </div>
        <div className="detail-row">
          <label>注册时间:</label>
          <span>{new Date(user.createdAt).toLocaleString()}</span>
        </div>

        <div className="detail-actions">
          {editing ? (
            <>
              <button onClick={handleSave} className="btn btn-primary">
                保存
              </button>
              <button onClick={() => {
                setEditing(false)
                setPoints(user.points)
                setAvatar(user.avatar || '')
              }} className="btn">
                取消
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn btn-primary">
              编辑
            </button>
          )}
        </div>
      </div>

      <div className="gameplays-section">
        <h2>最近游戏记录</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>游戏</th>
              <th>时长（秒）</th>
              <th>获得积分</th>
              <th>广告点击</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            {user.gamePlays.map((play: any) => (
              <tr key={play.id}>
                <td>{play.game?.name || '-'}</td>
                <td>{play.duration}</td>
                <td>{play.earnedPoints}</td>
                <td>{play.adClicks}</td>
                <td>{new Date(play.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
