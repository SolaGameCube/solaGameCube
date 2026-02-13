import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { LoginForm } from './components/Login/LoginForm'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './components/Stats/Dashboard'
import { UserList } from './components/Users/UserList'
import { UserDetail } from './components/Users/UserDetail'
import { GameList } from './components/Games/GameList'
import { GameForm } from './components/Games/GameForm'
import { ConfigList } from './components/Configs/ConfigList'
import { GamePlayList } from './components/GamePlays/GamePlayList'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>加载中...</div>
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<LoginForm />} />
        <Route
          path="/admin/*"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="games" element={<GameList />} />
          <Route path="games/new" element={<GameForm />} />
          <Route path="games/:id" element={<GameForm />} />
          <Route path="configs" element={<ConfigList />} />
          <Route path="gameplays" element={<GamePlayList />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
        <Route path="*" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
