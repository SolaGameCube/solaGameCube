# 环境变量配置说明

## 快速开始

### 1. 服务器端配置

在 `solaGameCube/server/` 目录下创建 `.env` 文件：

```env
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
# SQLite (推荐用于中小型应用，开发和生产环境都可以使用)
DATABASE_URL="file:./prisma/prod.db"
# 生产环境建议使用绝对路径（更安全）
# DATABASE_URL="file:/var/www/gamecube/prisma/prod.db"

# PostgreSQL (可选，适合高并发场景)
# DATABASE_URL="postgresql://user:password@localhost:5432/gamecube"
# MySQL (可选，适合高并发场景)
# DATABASE_URL="mysql://user:password@localhost:3306/gamecube"

# JWT 配置（生产环境必须修改）
JWT_SECRET=your-very-strong-secret-key-here
JWT_EXPIRES_IN=24h

# CORS 配置（多个域名用逗号分隔）
# 这是代码中实际使用的配置项，用于控制哪些域名可以访问 API
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
```

**数据库选择建议：**
- **SQLite**：适合中小型应用（日活 < 10万），无需单独安装数据库服务器，易于备份和维护
- **PostgreSQL/MySQL**：适合高并发、大数据量场景，需要单独安装和配置数据库服务器

**重要说明**：
- `API_DOMAIN`、`ADMIN_DOMAIN`、`CLIENT_DOMAIN` 这些变量在代码中**并未实际使用**
- 它们只是用于文档说明，帮助理解部署架构
- 实际部署时只需要配置 `CORS_ORIGIN` 即可

### 2. 客户端配置

在 `solaGameCube/` 目录下创建 `.env` 文件：

```env
# 生产环境 API 地址
EXPO_PUBLIC_API_URL=https://api.yourdomain.com

# 开发环境本地 IP（仅开发时使用）
EXPO_PUBLIC_LOCAL_IP=192.168.1.13
```

### 3. 管理后台前端配置

在 `solaGameCube/server/admin/` 目录下创建 `.env` 文件：

```env
# 生产环境 API 域名
VITE_API_DOMAIN=https://api.yourdomain.com
```

## 工作原理

### 客户端（React Native）

- **开发环境**：自动使用本地 IP 或 localhost
- **生产环境**：使用 `EXPO_PUBLIC_API_URL` 环境变量

代码位置：`solaGameCube/services/api.ts`

### 管理后台前端（React + Vite）

- **开发环境**：使用相对路径 `/api`（通过 Vite proxy）
- **生产环境**：使用 `VITE_API_DOMAIN` 环境变量

代码位置：`solaGameCube/server/admin/src/services/api.ts`

### 服务器端（Express）

- **CORS 配置**：根据 `CORS_ORIGIN` 环境变量设置允许的来源
- **开发环境**：允许所有来源
- **生产环境**：只允许 `CORS_ORIGIN` 中列出的域名

代码位置：`solaGameCube/server/src/index.ts`

## 注意事项

1. **环境变量命名**：
   - Expo 客户端：必须以 `EXPO_PUBLIC_` 开头
   - Vite 前端：必须以 `VITE_` 开头
   - 服务器端：无特殊前缀

2. **修改环境变量后需要重启**：
   - 服务器端：重启 Node.js 进程
   - 客户端：重新构建应用
   - 管理后台：重新构建前端

3. **生产环境安全检查**：
   - 必须修改 `JWT_SECRET`
   - 必须设置正确的 `CORS_ORIGIN`
   - 使用 HTTPS
