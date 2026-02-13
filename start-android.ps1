# Start Android app manually (bypasses Expo's broken emulator detection)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$adb = "$env:ANDROID_HOME\platform-tools\adb.exe"

Write-Host "Setting up port forwarding..." -ForegroundColor Green
# 设置端口转发，让模拟器可以访问开发服务器
& $adb -s emulator-5554 reverse tcp:8081 tcp:8081
& $adb -s emulator-5554 reverse tcp:19000 tcp:19000
& $adb -s emulator-5554 reverse tcp:19001 tcp:19001

Write-Host "Starting app on emulator-5554..." -ForegroundColor Green
& $adb -s emulator-5554 shell monkey -p com.beeman.web3jsexpo -c android.intent.category.LAUNCHER 1

Write-Host "Starting Expo dev server..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
npm run dev
