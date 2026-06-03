console.log('TOKEN:', process.env.META_ACCESS_TOKEN ? 'SET' : 'NOT SET')
console.log('ACCOUNT:', process.env.META_AD_ACCOUNT_ID ? 'SET' : 'NOT SET')
import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchCampaigns } from '../../lib/meta'
import { generateAlerts } from '../../lib/alerts'
import { DEFAULT_PRODUCTS, calcProfit } from '../../lib/calc'
import { ProfitCalc } from '../../lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const datePreset = (req.query.period as string) || 'last_30d'
    const campaigns = await fetchCampaigns(datePreset)

    // 상품별 손익 계산 (이어플러그 단품 기준 BEP)
    const profitMap = new Map<string, ProfitCalc>()
    for (const p of DEFAULT_PRODUCTS) {
      if (p.variants.length > 0 && p.variants[0].priceKRW > 0) {
        profitMap.set(p.id, calcProfit(p, p.variants[0]))
      }
    }

    const earplugCalc = profitMap.get('earplug')
    const bepRoas = earplugCalc?.bepRoas ?? 1.94

    const alerts = generateAlerts(campaigns, profitMap, bepRoas)

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
    res.json({
      campaigns,
      alerts,
      products: DEFAULT_PRODUCTS,
      bepRoas,
      fetchedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
