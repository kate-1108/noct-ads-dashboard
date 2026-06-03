import type { NextApiRequest, NextApiResponse } from 'next'
import { DailyMetrics } from '../../lib/types'

const BASE = 'https://graph.facebook.com/v19.0'
const TOKEN = process.env.META_ACCESS_TOKEN
const ACCOUNT = process.env.META_AD_ACCOUNT_ID

const FIELDS = [
  'date_start', 'campaign_id', 'campaign_name',
  'spend', 'impressions', 'reach', 'frequency', 'cpm',
  'inline_link_clicks', 'inline_link_click_ctr',
  'cost_per_inline_link_click',
  'actions', 'action_values',
].join(',')

function getAction(actions: any[], type: string): number {
  if (!actions) return 0
  const found = actions.find((a: any) => a.action_type === type)
  return found ? parseFloat(found.value) : 0
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { campaignId, days = '30' } = req.query
  const daysNum = parseInt(days as string) || 30
  
  // 날짜 범위 계산
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - daysNum)
  const since = start.toISOString().slice(0, 10)
  const until = end.toISOString().slice(0, 10)

  if (!TOKEN || !ACCOUNT) {
    return res.json({ data: getMockDaily(since, until, campaignId as string) })
  }

  try {
    let url = `${BASE}/${ACCOUNT}/insights?level=campaign&fields=${FIELDS}&time_increment=1&time_range={"since":"${since}","until":"${until}"}&access_token=${TOKEN}`
    if (campaignId) url += `&filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]`

    const apiRes = await fetch(url, { cache: 'no-store' })
    if (!apiRes.ok) {
      const err = await apiRes.text()
      console.error('Daily API error:', err)
      return res.json({ data: [], error: err })
    }
    const json = await apiRes.json()

    // 날짜별로 집계
    const byDate = new Map<string, DailyMetrics>()
    for (const row of (json.data || [])) {
      const date = row.date_start
      const purchases = getAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
      const purchaseValue = getAction(row.action_values, 'offsite_conversion.fb_pixel_purchase')
      const lpViews = getAction(row.actions, 'landing_page_view')
      const linkClicks = parseFloat(row.inline_link_clicks || '0')
      const spend = parseFloat(row.spend || '0')

      if (byDate.has(date)) {
        const existing = byDate.get(date)!
        existing.spend += spend
        existing.impressions += parseInt(row.impressions || '0')
        existing.linkClicks += linkClicks
        existing.purchases += purchases
        existing.purchaseValue += purchaseValue
      } else {
        byDate.set(date, {
          date,
          spend,
          impressions: parseInt(row.impressions || '0'),
          linkClicks,
          ctr: parseFloat(row.inline_link_click_ctr || '0'),
          cpc: parseFloat(row.cost_per_inline_link_click || '0'),
          frequency: parseFloat(row.frequency || '0'),
          cpm: parseFloat(row.cpm || '0'),
          purchases,
          purchaseValue,
          roas: spend > 0 ? purchaseValue / spend : 0,
          cpa: purchases > 0 ? spend / purchases : 0,
          lpvRate: linkClicks > 0 ? (lpViews / linkClicks) * 100 : 0,
          purchaseRate: linkClicks > 0 ? (purchases / linkClicks) * 100 : 0,
        })
      }
    }

    // 집계 후 파생 지표 재계산
    const result: DailyMetrics[] = Array.from(byDate.values()).map(d => ({
      ...d,
      roas: d.spend > 0 ? d.purchaseValue / d.spend : 0,
      cpa: d.purchases > 0 ? d.spend / d.purchases : 0,
      ctr: d.impressions > 0 ? (d.linkClicks / d.impressions) * 100 : 0,
      cpc: d.linkClicks > 0 ? d.spend / d.linkClicks : 0,
    })).sort((a, b) => a.date.localeCompare(b.date))

    res.setHeader('Cache-Control', 'no-store')
    res.json({ data: result })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}

function getMockDaily(since: string, until: string, _campaignId?: string): DailyMetrics[] {
  const result: DailyMetrics[] = []
  const start = new Date(since)
  const end = new Date(until)
  let cur = new Date(start)
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10)
    const spend = 8000 + Math.random() * 4000
    const pv = spend * (0.8 + Math.random() * 0.8)
    const clicks = Math.floor(6 + Math.random() * 8)
    result.push({
      date: d,
      spend: Math.round(spend),
      impressions: Math.floor(300 + Math.random() * 200),
      linkClicks: clicks,
      ctr: 2 + Math.random() * 2,
      cpc: Math.round(spend / clicks),
      frequency: 1.2 + Math.random() * 0.8,
      cpm: Math.round(spend / 0.35),
      purchases: Math.floor(Math.random() * 3),
      purchaseValue: Math.round(pv),
      roas: pv / spend,
      cpa: spend / Math.max(1, Math.floor(Math.random() * 3)),
      lpvRate: 70 + Math.random() * 15,
      purchaseRate: 3 + Math.random() * 3,
    })
    cur.setDate(cur.getDate() + 1)
  }
  return result
}
