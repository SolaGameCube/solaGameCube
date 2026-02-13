# 部署指南

本文档说明如何将应用部署到生产环境。

## 环境配置

### 1. 服务器端配置

在 `solaGameCube/server/` 目录下创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件，设置以下变量：

```env
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
# SQLite (推荐用于中小型应用，简单易维护)
DATABASE_URL="file:./prisma/prod.db"
# 或者使用绝对路径（更安全）
# DATABASE_URL="file:/var/www/gamecube/prisma/prod.db"

# PostgreSQL (可选，适合高并发场景)
# DATABASE_URL="postgresql://user:password@localhost:5432/gamecube"
# MySQL (可选，适合高并发场景)
# DATABASE_URL="mysql://user:password@localhost:3306/gamecube"

# JWT 配置（必须修改为强密码）
JWT_SECRET=your-very-strong-secret-key-here
JWT_EXPIRES_IN=24h

# CORS 配置（多个域名用逗号分隔）
# 注意：这是实际代码中使用的配置项，用于控制哪些域名可以访问 API
CORS_ORIGIN=https://yourdomain.com,https://admin.yourdomain.com
```

**数据库选择说明：**
- **SQLite**：适合中小型应用（日活 < 10万），无需单独安装数据库服务器，易于备份和维护
- **PostgreSQL/MySQL**：适合高并发、大数据量场景，需要单独安装和配置数据库服务器

**注意**：`API_DOMAIN`、`ADMIN_DOMAIN`、`CLIENT_DOMAIN` 这些变量在代码中并未使用，它们只是用于文档说明。实际部署时只需要配置 `CORS_ORIGIN` 即可。

### 2. 客户端配置

在 `solaGameCube/` 目录下创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 生产环境 API 地址
EXPO_PUBLIC_API_URL=https://api.yourdomain.com

# 开发环境本地 IP（仅开发时使用）
EXPO_PUBLIC_LOCAL_IP=192.168.1.13
```

### 3. 管理后台前端配置

在 `solaGameCube/server/admin/` 目录下创建 `.env` 文件：

```bash
# 复制示例文件
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 生产环境 API 域名
VITE_API_DOMAIN=https://api.yourdomain.com
```

## 部署步骤

### 1. 服务器端部署

```bash
cd solaGameCube/server

# 安装依赖
npm install

# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 构建管理后台前端
cd admin
npm install
npm run build
cd ..

# 启动服务器（使用 PM2 或其他进程管理器）
NODE_ENV=production npm start
```

### 2. 使用 PM2 管理进程（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "gamecube-server" -- start

# 查看状态
pm2 status

# 查看日志
pm2 logs gamecube-server

# 重启应用
pm2 restart gamecube-server

# 设置开机自启
pm2 startup
pm2 save
```

### 3. 使用 Nginx 反向代理（推荐）

创建 Nginx 配置文件 `/etc/nginx/sites-available/gamecube`：

```nginx
# API 服务器
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/gamecube /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL 证书配置（使用 Let's Encrypt）

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com

# 自动续期
sudo certbot renew --dry-run
```

### 5. 客户端构建

#### Android

```bash
cd solaGameCube

# 设置生产环境变量
export EXPO_PUBLIC_API_URL=https://api.yourdomain.com

# 构建 APK
eas build --platform android --profile production
```

#### iOS

```bash
# 构建 iOS
eas build --platform ios --profile production
```

## 环境变量说明

### 服务器端（.env）

- `NODE_ENV`: 环境模式（development/production）
- `PORT`: 服务器端口
- `DATABASE_URL`: 数据库连接字符串
- `JWT_SECRET`: JWT 密钥（生产环境必须修改）
- `API_DOMAIN`: API 服务器域名
- `ADMIN_DOMAIN`: 管理后台域名
- `CLIENT_DOMAIN`: 客户端域名
- `CORS_ORIGIN`: 允许的 CORS 来源（逗号分隔）

### 客户端（.env）

- `EXPO_PUBLIC_API_URL`: API 服务器地址（生产环境）
- `EXPO_PUBLIC_LOCAL_IP`: 开发环境本地 IP

### 管理后台前端（.env）

- `VITE_API_DOMAIN`: API 服务器域名

## 安全检查清单

- [ ] 修改 `JWT_SECRET` 为强密码
- [ ] 设置正确的 `CORS_ORIGIN`，不要使用通配符
- [ ] 使用 HTTPS（SSL 证书）
- [ ] 数据库使用强密码（如果使用 PostgreSQL/MySQL）
- [ ] 定期更新依赖包
- [ ] 设置防火墙规则
- [ ] 启用日志监控
- [ ] 配置备份策略（SQLite 需要定期备份数据库文件）

## SQLite 生产环境最佳实践

### 1. 数据库文件位置

建议将数据库文件放在安全目录，避免被直接访问：

```bash
# 创建数据库目录
mkdir -p /var/www/gamecube/prisma
chmod 700 /var/www/gamecube/prisma

# 在 .env 中使用绝对路径
DATABASE_URL="file:/var/www/gamecube/prisma/prod.db"
```

### 2. 备份策略

SQLite 是单文件数据库，备份非常简单：

```bash
# 手动备份
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 定时备份（添加到 crontab）
# 每天凌晨 2 点备份
0 2 * * * cp /var/www/gamecube/prisma/prod.db /backup/gamecube/prod.db.$(date +\%Y\%m\%d)
```

### 3. 性能优化

- 定期清理旧数据（如超过 1 年的游戏记录）
- 监控数据库文件大小
- 如果文件超过 1GB，考虑数据归档或迁移到 PostgreSQL

### 4. 故障恢复

如果数据库文件损坏，可以从备份恢复：

```bash
# 停止服务
pm2 stop gamecube-server

# 恢复备份
cp /backup/gamecube/prod.db.backup prisma/prod.db

# 重启服务
pm2 start gamecube-server
```

## 故障排查

### 客户端无法连接服务器

1. 检查 `EXPO_PUBLIC_API_URL` 是否正确
2. 检查服务器是否运行
3. 检查防火墙和端口
4. 检查 CORS 配置

### 管理后台无法访问

1. 检查 `VITE_API_DOMAIN` 是否正确
2. 检查 Nginx 配置
3. 检查服务器日志

### API 返回 CORS 错误

1. 检查 `CORS_ORIGIN` 是否包含客户端域名
2. 检查域名格式（包含协议 https://）
3. 检查服务器日志

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖
npm install

# 3. 运行数据库迁移
npx prisma migrate deploy

# 4. 重新构建管理后台
cd admin && npm run build && cd ..

# 5. 重启服务器
pm2 restart gamecube-server
```
