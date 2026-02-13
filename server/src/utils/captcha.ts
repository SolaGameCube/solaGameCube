// 验证码生成和验证工具（使用 svg-captcha）
// 使用内存存储验证码（生产环境建议使用 Redis）

import svgCaptcha from 'svg-captcha'

interface CaptchaData {
  code: string
  expiresAt: number
}

// 存储验证码的 Map，key 是 captchaId，value 是验证码数据
const captchaStore = new Map<string, CaptchaData>()

// 清理过期验证码（每5分钟清理一次）
setInterval(() => {
  const now = Date.now()
  for (const [id, data] of captchaStore.entries()) {
    if (data.expiresAt < now) {
      captchaStore.delete(id)
    }
  }
}, 5 * 60 * 1000)

/**
 * 生成验证码图片
 * @returns { id: string, data: string } 返回验证码 ID 和 SVG 图片数据
 */
export function generateCaptcha(): { id: string; data: string } {
  // 生成验证码（4个字符，包含数字和字母，排除容易混淆的字符）
  const captcha = svgCaptcha.create({
    size: 4, // 验证码长度
    ignoreChars: '0o1ilIO', // 排除容易混淆的字符
    noise: 4, // 干扰线条数量（增加干扰）
    color: true, // 彩色
    background: '#f0f0f0', // 背景色
    width: 120, // 宽度
    height: 40, // 高度
    fontSize: 50, // 字体大小
    charPreset: '123456789ABCDEFGHJKLMNPQRSTUVWXYZ', // 字符集（排除容易混淆的）
  })

  const id = `captcha_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  // 存储验证码，5 分钟过期
  captchaStore.set(id, {
    code: captcha.text,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 分钟
  })

  return { id, data: captcha.data }
}

/**
 * 验证验证码
 * @param id 验证码 ID
 * @param code 用户输入的验证码
 * @returns 是否验证通过
 */
export function verifyCaptcha(id: string, code: string): boolean {
  const data = captchaStore.get(id)
  
  if (!data) {
    return false // 验证码不存在或已过期
  }

  if (data.expiresAt < Date.now()) {
    captchaStore.delete(id)
    return false // 验证码已过期
  }

  // 验证码不区分大小写，去除空格
  const isValid = data.code.toLowerCase() === code.toLowerCase().trim()
  
  // 验证后删除验证码（一次性使用）
  if (isValid) {
    captchaStore.delete(id)
  }

  return isValid
}
