# 启动所有开发服务的脚本
# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

Write-Host "=== 启动开发服务 ===" -ForegroundColor Cyan
Write-Host ""

# 检查是否已有服务在运行
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"} | Where-Object {
    $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    $cmd -and ($cmd -like "*expo*" -or $cmd -like "*ts-node*" -or $cmd -like "*nodemon*")
}

if ($nodeProcesses) {
    Write-Host "⚠ 检测到已有服务在运行:" -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object {
        $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
        Write-Host "  进程 $($_.Id): $($cmd.Substring(0, [Math]::Min(80, $cmd.Length)))" -ForegroundColor Gray
    }
    Write-Host ""
    $response = Read-Host "是否要停止现有服务并重新启动? (y/n)"
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "正在停止现有服务..." -ForegroundColor Yellow
        $nodeProcesses | Stop-Process -Force
        Start-Sleep -Seconds 2
    } else {
        Write-Host "取消启动" -ForegroundColor Yellow
        exit
    }
}

# 获取脚本所在目录
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot

# 启动后端服务器
Write-Host "1. 启动后端服务器..." -ForegroundColor Yellow
$serverPath = Join-Path $projectRoot "solaGameCube\server"
$utf8Cmd = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; `$OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 | Out-Null; cd '$serverPath'; Write-Host '=== 后端服务器 ===' -ForegroundColor Cyan; npm run start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd -WindowStyle Normal

Start-Sleep -Seconds 2

# 启动 Expo 开发服务器（包含 Metro bundler）
Write-Host "2. 启动 Expo 开发服务器 (Metro)..." -ForegroundColor Yellow
$expoPath = Join-Path $projectRoot "solaGameCube"
$utf8Cmd2 = "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; `$OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 | Out-Null; cd '$expoPath'; Write-Host '=== Expo 开发服务器 (Metro) ===' -ForegroundColor Cyan; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd2 -WindowStyle Normal

Write-Host ""
Write-Host "✓ 服务启动中..." -ForegroundColor Green
Write-Host ""
Write-Host "已打开两个 PowerShell 窗口:" -ForegroundColor Cyan
Write-Host "  - 后端服务器 (端口 3000)" -ForegroundColor Yellow
Write-Host "  - Expo 开发服务器/Metro (端口 8081)" -ForegroundColor Yellow
Write-Host ""
Write-Host "等待几秒后，服务将完全启动..." -ForegroundColor Gray
Write-Host ""

# 等待并检查服务状态
Start-Sleep -Seconds 5

Write-Host "=== 服务状态检查 ===" -ForegroundColor Cyan
$listening = netstat -ano | findstr "LISTENING"

if ($listening -match ":8081") {
    Write-Host "✓ Expo/Metro 服务已启动 (端口 8081)" -ForegroundColor Green
} else {
    Write-Host "✗ Expo/Metro 服务未监听端口 8081" -ForegroundColor Red
}

if ($listening -match ":3000") {
    Write-Host "✓ 后端服务器已启动 (端口 3000)" -ForegroundColor Green
} else {
    Write-Host "⚠ 后端服务器可能未监听端口 3000（检查后端配置）" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "  - 要停止服务，关闭对应的 PowerShell 窗口" -ForegroundColor Gray
Write-Host "  - 或运行: Get-Process | Where-Object {`$_.ProcessName -eq 'node'} | Stop-Process -Force" -ForegroundColor Gray
