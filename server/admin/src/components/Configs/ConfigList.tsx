import { useEffect, useState } from 'react'
import api from '../../services/api'
import './ConfigList.css'

interface Config {
  id: number
  key: string
  value: string
  description: string | null
}

export function ConfigList() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editDescription, setEditDescription] = useState('')

  useEffect(() => {
    loadConfigs()
  }, [])

  const loadConfigs = async () => {
    try {
      const response = await api.get('/admin/configs')
      setConfigs(response.data.configs)
    } catch (error) {
      console.error('Failed to load configs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (config: Config) => {
    setEditingKey(config.key)
    setEditValue(config.value)
    setEditDescription(config.description || '')
  }

  const handleSave = async () => {
    if (!editingKey) return
    try {
      await api.put(`/admin/configs/${editingKey}`, {
        value: editValue,
        description: editDescription,
      })
      setEditingKey(null)
      loadConfigs()
      alert('保存成功')
    } catch (error) {
      console.error('Failed to save config:', error)
      alert('保存失败')
    }
  }

  const handleCancel = () => {
    setEditingKey(null)
    setEditValue('')
    setEditDescription('')
  }

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="config-list">
      <h1>配置管理</h1>

      <div className="configs-grid">
        {configs.map((config) => (
          <div key={config.id} className="config-card">
            <div className="config-header">
              <h3>{config.key}</h3>
              {config.description && <p className="config-desc">{config.description}</p>}
            </div>

            {editingKey === config.key ? (
              <div className="config-edit">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={6}
                  className="config-textarea"
                />
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="描述（可选）"
                  className="config-desc-input"
                />
                <div className="config-actions">
                  <button onClick={handleSave} className="btn btn-primary">
                    保存
                  </button>
                  <button onClick={handleCancel} className="btn">
                    取消
                  </button>
                </div>
              </div>
            ) : (
              <div className="config-view">
                <pre className="config-value">{config.value}</pre>
                <button onClick={() => handleEdit(config)} className="btn btn-sm">
                  编辑
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
