# 打包 Release APK 命令

## 前置准备

### 1. 安装 EAS CLI（如果还没有安装）

```bash
npm install -g eas-cli
```

### 2. 登录 EAS 账户

```bash
eas login
```

如果没有账户，会提示你创建一个。

### 3. 确保在项目根目录

```bash
cd d:\work\seek\gamecube\solaGameCube
```

## 构建 Release APK

### 方法 1：构建 APK（用于直接安装）

```bash
eas build --platform android --profile production
```

### 方法 2：构建 AAB（用于 Google Play 发布）

```bash
eas build --platform android --profile production --type app-bundle
```

## 构建过程

1. EAS 会提示你选择构建类型（APK 或 AAB）
2. 选择构建服务器（可以选择云构建或本地构建）
3. 等待构建完成（通常需要 10-20 分钟）
4. 构建完成后会提供下载链接

## 查看构建状态

```bash
# 查看构建列表
eas build:list

# 查看特定构建的详细信息
eas build:view [BUILD_ID]
```

## 下载构建的 APK

```bash
# 下载最新的构建
eas build:download

# 或指定构建 ID
eas build:download [BUILD_ID]
```

## 本地构建（可选）

如果你想在本地构建（需要配置 Android 环境）：

```bash
eas build --platform android --profile production --local
```

## 注意事项

1. **首次构建**：可能需要配置 Android 签名密钥
   ```bash
   eas credentials
   ```

2. **API 域名**：已配置为 `https://api.SolaGameCube.com`

3. **测试登录按钮**：release 版本中会保留

4. **版本号**：会自动递增（如果配置了 `autoIncrement: true`）

## 快速命令（一键执行）

```bash
# 进入项目目录
cd d:\work\seek\gamecube\solaGameCube

# 安装 EAS CLI（如果未安装）
npm install -g eas-cli

# 登录（如果未登录）
eas login

# 构建 APK
eas build --platform android --profile production
```
