import path from 'path'
import fs from 'fs'

/**
 * 从 URL 中提取文件名
 * @param url 源网站 URL，例如 https://h5h5games.com/solagames/color-water-puzzle.html
 * @returns 文件名，例如 color-water-puzzle.html
 */
export function extractFileNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const fileName = path.basename(pathname)
    return fileName || 'game.html'
  } catch (error) {
    // 如果 URL 解析失败，尝试从路径中提取
    const match = url.match(/([^\/]+\.html)$/)
    return match ? match[1] : 'game.html'
  }
}

/**
 * 生成游戏 HTML 文件内容（GameDistribution 格式）
 * @param gameName 游戏名称
 * @param gameDistributionId GameDistribution 游戏 ID
 * @param gameUrl 游戏 URL（明文，不编码，用于 gd_sdk_referrer_url 参数）
 * @returns HTML 文件内容
 */
export function generateGameHTML(
  gameName: string,
  gameDistributionId: string,
  gameUrl: string
): string {
  // gameUrl 不进行 encodeURIComponent 编码，直接使用明文
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${gameName}</title>
    <style>
        html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            background: #000;
        }
        
        iframe {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
        }
    </style>
</head>
<body>
    <iframe 
        src="https://html5.gamedistribution.com/${gameDistributionId}/?gd_sdk_referrer_url=${gameUrl}" 
        frameborder="0" 
        scrolling="no"
        allowfullscreen>
    </iframe>
</body>
</html>`
}

/**
 * 保存 HTML 文件到服务器
 * @param htmlContent HTML 内容
 * @param fileName 文件名
 * @returns 文件保存路径
 */
export function saveHTMLFile(htmlContent: string, fileName: string): string {
  // 创建 games-html 目录（如果不存在）
  const gamesHtmlDir = path.join(process.cwd(), 'games-html')
  if (!fs.existsSync(gamesHtmlDir)) {
    fs.mkdirSync(gamesHtmlDir, { recursive: true })
  }

  // 保存文件
  const filePath = path.join(gamesHtmlDir, fileName)
  fs.writeFileSync(filePath, htmlContent, 'utf-8')

  return filePath
}

/**
 * 删除 HTML 文件
 * @param fileName 文件名
 */
export function deleteHTMLFile(fileName: string): void {
  const filePath = path.join(process.cwd(), 'games-html', fileName)
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
