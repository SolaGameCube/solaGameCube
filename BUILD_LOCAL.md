# 本地构建 Release APK（无需登录）

## 为什么 EAS Build 需要登录？

EAS Build 是 Expo 的**云构建服务**，需要在他们的服务器上构建，所以需要账户来管理构建任务。但你可以选择**本地构建**，完全不需要登录！

## 本地构建步骤（无需登录）

### 前置要求

1. **安装 Android Studio**（如果还没有）
   - 下载：https://developer.android.com/studio
   - 安装 Android SDK

2. **配置环境变量**（Windows）
   ```powershell
   # 设置 ANDROID_HOME
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   
   # 添加到 PATH
   $env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"
   ```

### 构建步骤

```bash
# 1. 进入项目目录
cd d:\work\seek\gamecube\solaGameCube

# 2. 安装依赖（如果还没有）
npm install

# 3. 预构建（生成 Android 原生代码）
npx expo prebuild --platform android

# 4. 进入 Android 目录
cd android

# 5. 构建 Release APK
# Windows:
.\gradlew assembleRelease

# Linux/Mac:
./gradlew assembleRelease
```

### APK 文件位置

构建完成后，APK 文件在：
```
android/app/build/outputs/apk/release/app-release.apk
```

## 配置 Release 签名（可选，用于发布）

如果需要签名 APK（用于 Google Play 或其他分发渠道）：

```bash
# 1. 生成签名密钥（首次）
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 2. 配置签名（在 android/app/build.gradle 中）
# 需要配置 signingConfigs
```

## 快速构建脚本（Windows PowerShell）

创建 `build-release.ps1`：

```powershell
# 设置环境变量
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools"

# 进入项目目录
cd d:\work\seek\gamecube\solaGameCube

# 预构建
Write-Host "正在预构建..." -ForegroundColor Yellow
npx expo prebuild --platform android

# 构建 APK
Write-Host "正在构建 Release APK..." -ForegroundColor Yellow
cd android
.\gradlew assembleRelease

Write-Host "构建完成！APK 位置：" -ForegroundColor Green
Write-Host "android/app/build/outputs/apk/release/app-release.apk" -ForegroundColor Cyan
```

## 注意事项

1. **首次构建**：可能需要下载 Gradle 和依赖，时间较长
2. **API 配置**：已配置为 `https://api.SolaGameCube.com`（release 版本）
3. **测试登录**：release 版本中会保留快速登录按钮
4. **环境变量**：确保 `ANDROID_HOME` 已正确设置

## 两种方式对比

| 方式 | 需要登录 | 需要 Android 环境 | 构建速度 | 适用场景 |
|------|---------|------------------|---------|---------|
| EAS Build（云构建） | ✅ 是 | ❌ 否 | 快（10-20分钟） | 没有 Android 环境 |
| 本地构建 | ❌ 否 | ✅ 是 | 取决于机器性能 | 有 Android 环境 |

## 推荐

如果你已经安装了 Android Studio，**推荐使用本地构建**，更快且不需要登录！
