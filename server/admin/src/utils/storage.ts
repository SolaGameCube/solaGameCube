const TOKEN_KEY = 'admin_token'
const ADMIN_KEY = 'admin_info'

export const storage = {
  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY)
  },
  setToken: (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token)
  },
  removeToken: (): void => {
    localStorage.removeItem(TOKEN_KEY)
  },
  getAdmin: (): any | null => {
    const admin = localStorage.getItem(ADMIN_KEY)
    return admin ? JSON.parse(admin) : null
  },
  setAdmin: (admin: any): void => {
    localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
  },
  removeAdmin: (): void => {
    localStorage.removeItem(ADMIN_KEY)
  },
  clear: (): void => {
    storage.removeToken()
    storage.removeAdmin()
  },
}
