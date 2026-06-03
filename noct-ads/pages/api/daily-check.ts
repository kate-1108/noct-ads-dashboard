import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCampaigns } from '../../lib/meta'
import { generateAlerts } from '../../lib/alerts'
import { DEFAULT_PRODUCTS, calcProfit } from '../../lib/calc'
import { detectAndRecordChanges } from '../../lib/detector'

// Vercel Cron — 매일 오전 9시 (vercel.json)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // 1. 자동 변경사항 감지 & 기록
    const autoChanges = await detectAndRecordChanges()

    // 2. 알림 체크
    const campaigns = await fetchCampaigns('last_7d')
    const earplugProduct = DEFAULT_PRODUCTS.find(p => p.id === 'earplug')
    const bepRoas = earplugProduct
      ? calcProfit(earplugProduct, earplugProduct.variants[0]).bepRoas
      : 1.94

    const alerts = generateAlerts(campaigns, new Map(), bepRoas)
    const criticals = alerts.filter(a => a.severity === 'critical')
    const warnings = alerts.filter(a => a.severity === 'warning')

    // 3. 알림 메시지 빌드 (변경사항 포함)
    if (criticals.length > 0 || warnings.length > 0 || autoChanges.length > 0) {
      const message = buildMessage(criticals, warnings, autoChanges)
      await sendNotification(message)
    }

    res.json({
      ok: true,
      autoChangesDetected: autoChanges.length,
      alertsSent: criticals.length + warnings.length,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

function buildMessage(criticals: any[], warnings: any[], changes: any[]): string {
  const lines: string[] = []
  lines.push('📊 NOCT 광고 일일 리포트')
  lines.push(new Date().toLocaleDateString('ko-KR'))
  lines.push('')

  if (changes.length > 0) {
    lines.push('🔄 자동 감지된 변경사항')
    for (const c of changes) {
      lines.push(`• ${c.title}`)
    }
    lines.push('')
  }

  if (criticals.length > 0) {
    lines.push('🔴 즉시 조치 필요')
    for (const a of criticals) {
      lines.push(`• ${a.message}`)
      lines.push(`  → ${a.action.slice(0, 80)}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('🟡 주의')
    for (const a of warnings) lines.push(`• ${a.message}`)
  }

  lines.push('')
  lines.push('대시보드에서 확인하세요.')
  return lines.join('\n')
}

async function sendNotification(message: string) {
  if (process.env.KAKAO_ACCESS_TOKEN) {
    try {
      await fetch('https://kapi.kakao.com/v2/api/talk/memo/default/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${process.env.KAKAO_ACCESS_TOKEN}`,
        },
        body: new URLSearchParams({
          template_object: JSON.stringify({
            object_type: 'text',
            text: message,
            link: { mobile_web_url: process.env.VERCEL_URL || '' },
          }),
        }),
      })
    } catch (e) {
      console.error('Kakao send failed:', e)
    }
  }
}
