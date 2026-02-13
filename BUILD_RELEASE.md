# 打包 Release APK 指南

## 配置说明

### 1. API 域名
- 生产环境 API 已配置为：`https://api.SolaGameCube.com`
- 测试登录按钮已保留，在 release 版本中也会显示

### 2. 环境变量（可选）

如果需要覆盖 API 域名，可以在项目根目录创建 `.env` 文件：

```env
EXPO_PUBLIC_API_URL=https://api.SolaGameCube.com
```

## 打包步骤

### 方法 1：使用 EAS Build（推荐）

```bash
# 1. 确保已登录 EAS
eas login

# 2. 构建 Android Release APK
eas build --platform android --profile production

# 或者构建 AAB（用于 Google Play 发布）
eas build --platform android --profile production --type app-bundle
```

### 方法 2：本地构建（需要配置 Android 环境）

```bash
# 1. 安装依赖
npm install

# 2. 预构建（生成原生代码）
npx expo prebuild

# 3. 进入 Android 目录
cd android

# 4. 构建 APK
./gradlew assembleRelease

# APK 文件位置：android/app/build/outputs/apk/release/app-release.apk
```

### 方法 3：使用 Expo 构建服务（已弃用，推荐使用 EAS）

```bash
expo build:android -t apk
```

## 验证配置

### 检查 API 配置

在 `services/api.ts` 中确认：
- 生产环境 API URL：`https://api.SolaGameCube.com`
- 测试登录按钮：已移除 `__DEV__` 条件，始终显示

### 检查测试登录按钮

在 `app/sign-in.tsx` 中确认：
- 快速登录按钮不再有 `{__DEV__ && ...}` 条件
- 按钮文本：`🚀 快速登录（测试模式）`

## 构建配置

### EAS Build 配置（eas.json）

```json
{
  "build": {
    "production": {
      "extends": "base",
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.SolaGameCube.com"
      }
    }
  }
}
```

## 注意事项

1. **API 域名**：确保 `https://api.SolaGameCube.com` 已正确配置 SSL 证书
2. **测试登录**：release 版本中会显示测试登录按钮，方便测试
3. **版本号**：每次构建会自动递增版本号（如果配置了 `autoIncrement: true`）
4. **签名**：首次构建需要配置 Android 签名密钥

## 构建后验证

1. 安装 APK 到设备
2. 打开应用，检查：
   - 登录页面是否显示"快速登录（测试模式）"按钮
   - 点击快速登录是否能正常登录
   - 检查网络请求是否指向 `https://api.SolaGameCube.com`

## 常见问题

### Q: 构建失败怎么办？
A: 检查：
- EAS 账户是否已登录
- 网络连接是否正常
- 查看构建日志：`eas build:list`

### Q: 如何查看构建历史？
```bash
eas build:list
```

### Q: 如何下载构建的 APK？
```bash
eas build:download
```

### Q: 如何配置 Android 签名？
```bash
eas credentials
```
