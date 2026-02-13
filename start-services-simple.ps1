# 简单启动脚本 - 在后台启动服务
# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "=== 启动开发服务（后台模式）===" -ForegroundColor Cyan
Write-Host ""

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

# 启动后端服务器
Write-Host "启动后端服务器..." -ForegroundColor Yellow
$serverPath = Join-Path $projectRoot "solaGameCube\server"
$utf8Cmd = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; `$OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 | Out-Null; cd '$serverPath'; npm run start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd -WindowStyle Minimized

Start-Sleep -Seconds 2

# 启动 Expo 开发服务器
Write-Host "启动 Expo 开发服务器 (Metro)..." -ForegroundColor Yellow
$expoPath = Join-Path $projectRoot "solaGameCube"
$utf8Cmd2 = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; `$OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 | Out-Null; cd '$expoPath'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd2 -WindowStyle Minimized

Write-Host ""
Write-Host "✓ 服务已在后台启动" -ForegroundColor Green
Write-Host "  查看任务栏中的 PowerShell 窗口查看日志" -ForegroundColor Gray
