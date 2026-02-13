# 启动管理后台（前端 + 后端）的脚本
# 设置控制台编码为 UTF-8，解决中文乱码问题
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null

# 设置控制台字体（如果支持）
try {
    $host.UI.RawUI.Font = New-Object System.Management.Automation.Host.Size(120, 30)
} catch {
    # 忽略字体设置错误
}

Write-Host "=== 启动管理后台服务 ===" -ForegroundColor Cyan
Write-Host ""

# 检查是否已有服务在运行
$nodeProcesses = Get-Process | Where-Object {$_.ProcessName -eq "node"} | Where-Object {
    $cmd = (Get-WmiObject Win32_Process -Filter "ProcessId = $($_.Id)").CommandLine
    $cmd -and ($cmd -like "*ts-node*" -or $cmd -like "*nodemon*" -or $cmd -like "*vite*")
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

# 获取脚本所在目录（脚本在 solaGameCube 目录下）
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = $scriptRoot

# 调试：显示路径信息
Write-Host "脚本目录: $scriptRoot" -ForegroundColor Gray
Write-Host "项目根目录: $projectRoot" -ForegroundColor Gray
Write-Host ""

# 启动后端服务器
Write-Host "1. 启动后端服务器 (端口 3001)..." -ForegroundColor Yellow
$serverPath = Join-Path $projectRoot "server"
if (-not (Test-Path $serverPath)) {
    Write-Host "✗ 错误: 找不到后端服务器目录: $serverPath" -ForegroundColor Red
    exit 1
}

$utf8Cmd = @"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
`$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null
`$env:PYTHONIOENCODING = 'utf-8'
`$env:NODE_OPTIONS = '--max-old-space-size=4096'
`$env:FORCE_COLOR = '1'
cd '$serverPath'
Write-Host '=== 后端服务器 (端口 3001) ===' -ForegroundColor Cyan
if (-not (Test-Path 'node_modules\.prisma\client\index.js')) {
    Write-Host '正在生成 Prisma Client...' -ForegroundColor Yellow
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Prisma Client 生成失败，请手动运行: npx prisma generate' -ForegroundColor Red
        pause
    }
}
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd -WindowStyle Normal

Start-Sleep -Seconds 3

# 启动 Expo 开发服务器（手机客户端需要）
Write-Host "2. 启动 Expo 开发服务器 (端口 8081)..." -ForegroundColor Yellow
# projectRoot 已经是 solaGameCube 目录，所以 expoPath 就是它本身
$expoPath = $projectRoot
if (Test-Path $expoPath) {
    $utf8CmdExpo = @"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
`$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null
`$env:PYTHONIOENCODING = 'utf-8'
`$env:NODE_OPTIONS = '--max-old-space-size=4096'
`$env:FORCE_COLOR = '1'
cd '$expoPath'
Write-Host '=== Expo 开发服务器 (端口 8081) ===' -ForegroundColor Cyan
npm run dev
"@
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8CmdExpo -WindowStyle Normal
    Start-Sleep -Seconds 2
} else {
    Write-Host "⚠ 未找到 Expo 项目目录，跳过 Expo 服务启动" -ForegroundColor Yellow
}

# 启动前端管理后台
Write-Host "3. 启动前端管理后台 (端口 3002)..." -ForegroundColor Yellow
$adminPath = Join-Path $serverPath "admin"
if (-not (Test-Path $adminPath)) {
    Write-Host "✗ 错误: 找不到前端管理后台目录: $adminPath" -ForegroundColor Red
    exit 1
}

$utf8Cmd2 = @"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
`$OutputEncoding = [System.Text.Encoding]::UTF8
`$PSDefaultParameterValues['*:Encoding'] = 'utf8'
chcp 65001 | Out-Null
`$env:PYTHONIOENCODING = 'utf-8'
`$env:NODE_OPTIONS = '--max-old-space-size=4096'
`$env:FORCE_COLOR = '1'
cd '$adminPath'
Write-Host '=== 前端管理后台 (端口 3002) ===' -ForegroundColor Cyan
if (-not (Test-Path 'node_modules')) {
    Write-Host '正在安装依赖...' -ForegroundColor Yellow
    npm install
}
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-Command", $utf8Cmd2 -WindowStyle Normal

Write-Host ""
Write-Host "✓ 服务启动中..." -ForegroundColor Green
Write-Host ""
$windowCount = if (Test-Path $projectRoot) { 3 } else { 2 }
Write-Host "已打开 $windowCount 个 PowerShell 窗口:" -ForegroundColor Cyan
Write-Host "  - 后端服务器 (http://localhost:3001)" -ForegroundColor Yellow
if (Test-Path $projectRoot) {
    Write-Host "  - Expo 开发服务器 (端口 8081)" -ForegroundColor Yellow
}
Write-Host "  - 前端管理后台 (http://localhost:3002)" -ForegroundColor Yellow
Write-Host ""
Write-Host "等待几秒后，服务将完全启动..." -ForegroundColor Gray
Write-Host ""

# 等待并检查服务状态
Start-Sleep -Seconds 8

Write-Host "=== 服务状态检查 ===" -ForegroundColor Cyan
$listening = netstat -ano | findstr "LISTENING"

if ($listening -match ":3001") {
    Write-Host "✓ 后端服务器已启动 (端口 3001)" -ForegroundColor Green
} else {
    Write-Host "⚠ 后端服务器可能未监听端口 3001" -ForegroundColor Yellow
}

if ($listening -match ":8081") {
    Write-Host "✓ Expo 开发服务器已启动 (端口 8081)" -ForegroundColor Green
} else {
    Write-Host "⚠ Expo 开发服务器可能未监听端口 8081" -ForegroundColor Yellow
}

if ($listening -match ":3002") {
    Write-Host "✓ 前端管理后台已启动 (端口 3002)" -ForegroundColor Green
} else {
    Write-Host "⚠ 前端管理后台可能未监听端口 3002" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 访问地址 ===" -ForegroundColor Cyan
Write-Host "  管理后台: http://localhost:3002" -ForegroundColor Yellow
Write-Host "  后端 API: http://localhost:3001/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "默认管理员账户:" -ForegroundColor Cyan
Write-Host "  用户名: admin" -ForegroundColor Yellow
Write-Host "  密码: admin123" -ForegroundColor Yellow
Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "  - 要停止服务，关闭对应的 PowerShell 窗口" -ForegroundColor Gray
Write-Host "  - 或运行: Get-Process | Where-Object {`$_.ProcessName -eq 'node'} | Stop-Process -Force" -ForegroundColor Gray
Write-Host ""
