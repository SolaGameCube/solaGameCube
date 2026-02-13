import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'
import './UserList.css'

interface User {
  id: number
  walletAddr: string
  points: number
  avatar: string | null
  createdAt: string
}

export function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadUsers()
  }, [page, search])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/users', {
        params: { page, limit: 20, search },
      })
      setUsers(response.data.users)
      setTotalPages(response.data.pagination.totalPages)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个用户吗？')) return
    try {
      await api.delete(`/admin/users/${id}`)
      loadUsers()
    } catch (error) {
      console.error('Failed to delete user:', error)
      alert('删除失败')
    }
  }

  return (
    <div className="user-list">
      <div className="page-header">
        <h1>用户管理</h1>
        <div className="search-box">
          <input
            type="text"
            placeholder="搜索钱包地址..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
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
                <th>钱包地址</th>
                <th>积分</th>
                <th>头像</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>
                    <Link to={`/admin/users/${user.id}`} className="link">
                      {user.walletAddr}
                    </Link>
                  </td>
                  <td>{user.points}</td>
                  <td>{user.avatar || '-'}</td>
                  <td>{new Date(user.createdAt).toLocaleString()}</td>
                  <td>
                    <Link to={`/admin/users/${user.id}`} className="btn btn-sm">
                      查看
                    </Link>
                    <button
                      onClick={() => handleDelete(user.id)}
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
