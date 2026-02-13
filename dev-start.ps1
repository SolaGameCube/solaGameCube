# 更可靠的启动脚本 - 避免 Expo 连接模拟器的问题
# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "=== 启动 Android 应用 ===" -ForegroundColor Cyan

# 1. 重启 ADB（如果需要）
Write-Host "1. 检查 ADB 连接..." -ForegroundColor Yellow
& $adb kill-server
Start-Sleep -Seconds 1
& $adb start-server
Start-Sleep -Seconds 1

# 2. 检查设备
$devices = & $adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "❌ 未检测到设备！请确保模拟器已启动" -ForegroundColor Red
    exit 1
}
Write-Host "✓ 检测到 $($devices.Count) 个设备" -ForegroundColor Green

# 3. 设置端口转发
Write-Host "2. 设置端口转发..." -ForegroundColor Yellow
$deviceId = ($devices[0] -split "\s+")[0]
& $adb -s $deviceId reverse tcp:8081 tcp:8081
& $adb -s $deviceId reverse tcp:19000 tcp:19000
& $adb -s $deviceId reverse tcp:19001 tcp:19001
Write-Host "✓ 端口转发已设置" -ForegroundColor Green

# 4. 启动应用（如果已安装）
Write-Host "3. 启动应用..." -ForegroundColor Yellow
try {
    & $adb -s $deviceId shell monkey -p com.beeman.web3jsexpo -c android.intent.category.LAUNCHER 1
    Write-Host "✓ 应用已启动" -ForegroundColor Green
} catch {
    Write-Host "⚠ 应用可能未安装，将使用 Expo 构建" -ForegroundColor Yellow
}

# 5. 启动 Expo 开发服务器（使用 --lan 避免连接问题）
Write-Host "4. 启动 Expo 开发服务器..." -ForegroundColor Yellow
Write-Host "   使用 'a' 键在 Android 设备上打开应用" -ForegroundColor Cyan
Write-Host "   或扫描二维码连接" -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

cd $PSScriptRoot
npm run dev
