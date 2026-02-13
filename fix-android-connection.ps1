# 修复 Android 连接问题的完整脚本
# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "=== 修复 Android 连接 ===" -ForegroundColor Cyan

# 1. 停止所有 ADB 进程
Write-Host "1. 停止 ADB 服务器..." -ForegroundColor Yellow
& $adb kill-server
Start-Sleep -Seconds 2

# 2. 启动 ADB 服务器
Write-Host "2. 启动 ADB 服务器..." -ForegroundColor Yellow
& $adb start-server
Start-Sleep -Seconds 2

# 3. 检查设备
Write-Host "3. 检查设备连接..." -ForegroundColor Yellow
$devices = & $adb devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "❌ 未检测到设备！" -ForegroundColor Red
    Write-Host "请确保模拟器已启动" -ForegroundColor Yellow
    exit 1
}

$deviceId = ($devices[0] -split "\s+")[0]
Write-Host "✓ 检测到设备: $deviceId" -ForegroundColor Green

# 4. 设置端口转发
Write-Host "4. 设置端口转发..." -ForegroundColor Yellow
& $adb -s $deviceId reverse tcp:8081 tcp:8081
& $adb -s $deviceId reverse tcp:19000 tcp:19000
& $adb -s $deviceId reverse tcp:19001 tcp:19001
Write-Host "✓ 端口转发已设置" -ForegroundColor Green

# 5. 测试连接
Write-Host "5. 测试设备连接..." -ForegroundColor Yellow
$test = & $adb -s $deviceId shell echo "test"
if ($test -eq "test") {
    Write-Host "✓ 设备连接正常" -ForegroundColor Green
} else {
    Write-Host "⚠ 设备连接可能有问题" -ForegroundColor Yellow
}

# 6. 启动应用（如果已安装）
Write-Host "6. 尝试启动应用..." -ForegroundColor Yellow
try {
    & $adb -s $deviceId shell monkey -p com.beeman.web3jsexpo -c android.intent.category.LAUNCHER 1
    Write-Host "✓ 应用启动命令已发送" -ForegroundColor Green
} catch {
    Write-Host "⚠ 应用可能未安装，需要先构建" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 修复完成 ===" -ForegroundColor Green
Write-Host "现在可以在 Expo 终端按 'a' 键，或运行: npm run android" -ForegroundColor Cyan
