import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCampaigns } from '../../lib/meta'
import { generateAlerts } from '../../lib/alerts'
import { DEFAULT_PRODUCTS, calcProfit } from '../../lib/calc'

// Vercel Cron에서 매일 오전 9시에 호출 (vercel.json에 설정)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 보안: cron secret 확인
  const authHeader = req.headers.authorization
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const campaigns = await fetchCampaigns('last_7d')
    const earplugProduct = DEFAULT_PRODUCTS.find(p => p.id === 'earplug')
    const bepRoas = earplugProduct
      ? calcProfit(earplugProduct, earplugProduct.variants[0]).bepRoas
      : 1.94

    const alerts = generateAlerts(campaigns, new Map(), bepRoas)
    const criticals = alerts.filter(a => a.severity === 'critical')
    const warnings = alerts.filter(a => a.severity === 'warning')

    // 알림이 있을 때만 발송
    if (criticals.length > 0 || warnings.length > 0) {
      const message = buildAlertMessage(criticals, warnings)
      await sendNotification(message)
    }

    res.json({
      ok: true,
      alertsSent: criticals.length + warnings.length,
      criticals: criticals.length,
      warnings: warnings.length,
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

function buildAlertMessage(criticals: any[], warnings: any[]): string {
  const lines: string[] = []
  lines.push('📊 NOCT 광고 일일 리포트')
  lines.push(`${new Date().toLocaleDateString('ko-KR')} 기준`)
  lines.push('')

  if (criticals.length > 0) {
    lines.push('🔴 즉시 조치 필요')
    for (const a of criticals) {
      lines.push(`• ${a.campaignName.slice(0, 20)}...`)
      lines.push(`  ${a.message}`)
      lines.push(`  → ${a.action.slice(0, 80)}`)
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('🟡 주의 필요')
    for (const a of warnings) {
      lines.push(`• ${a.message}`)
    }
  }

  lines.push('')
  lines.push('대시보드에서 자세히 확인하세요.')
  return lines.join('\n')
}

async function sendNotification(message: string) {
  // 카카오톡 알림 (카카오 액세스 토큰이 있을 때)
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
