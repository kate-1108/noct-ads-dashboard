import { CampaignMetrics } from './types'

const BASE = 'https://graph.facebook.com/v19.0'
const TOKEN = process.env.META_ACCESS_TOKEN
const ACCOUNT = process.env.META_AD_ACCOUNT_ID // act_XXXXXXX

const FIELDS = [
  'campaign_name', 'campaign_id', 'status',
  'spend', 'impressions', 'reach', 'frequency', 'cpm',
  'clicks', 'inline_link_clicks', 'inline_link_click_ctr',
  'cost_per_inline_link_click',
  'actions', 'action_values', 'cost_per_action_type',
  'website_ctr',
].join(',')

export async function fetchCampaigns(datePreset = 'last_30d'): Promise<CampaignMetrics[]> {
  if (!TOKEN || TOKEN === '' || !ACCOUNT || ACCOUNT === '') {
    console.warn('META credentials not set — returning mock data')
    return getMockData()
  }

  const url = `${BASE}/${ACCOUNT}/insights?level=campaign&fields=${FIELDS}&date_preset=${datePreset}&access_token=${TOKEN}`
  const res = await fetch(url, { next: { revalidate: 3600 } }) // 1시간 캐시
  if (!res.ok) {
    console.error('Meta API error:', await res.text())
    return getMockData()
  }
  const json = await res.json()
  return (json.data || []).map(parseRow)
}

function getAction(actions: any[], type: string): number {
  if (!actions) return 0
  const found = actions.find((a: any) => a.action_type === type)
  return found ? parseFloat(found.value) : 0
}

function parseRow(row: any): CampaignMetrics {
  const purchases = getAction(row.actions, 'offsite_conversion.fb_pixel_purchase')
  const purchaseValue = getAction(row.action_values, 'offsite_conversion.fb_pixel_purchase')
  const lpViews = getAction(row.actions, 'landing_page_view')
  const linkClicks = parseFloat(row.inline_link_clicks || '0')
  const spend = parseFloat(row.spend || '0')

  return {
    id: row.campaign_id,
    name: row.campaign_name,
    status: row.status || 'UNKNOWN',
    spend,
    impressions: parseInt(row.impressions || '0'),
    reach: parseInt(row.reach || '0'),
    frequency: parseFloat(row.frequency || '0'),
    cpm: parseFloat(row.cpm || '0'),
    linkClicks,
    ctr: parseFloat(row.inline_link_click_ctr || '0'),
    cpc: parseFloat(row.cost_per_inline_link_click || '0'),
    landingPageViews: lpViews,
    lpvRate: linkClicks > 0 ? (lpViews / linkClicks) * 100 : 0,
    purchases,
    purchaseRate: linkClicks > 0 ? (purchases / linkClicks) * 100 : 0,
    purchaseValue,
    roas: spend > 0 ? purchaseValue / spend : 0,
    cpa: purchases > 0 ? spend / purchases : 0,
    dateStart: row.date_start || '',
    dateEnd: row.date_stop || '',
  }
}

// 실제 API 연결 전 사용할 목 데이터 (현재 캠페인 기반)
function getMockData(): CampaignMetrics[] {
  return [
    {
      id: 'c1',
      name: '에어핏 딥슬립 이어플러그스 0513(부모,저예산시작) - CBO',
      status: 'PAUSED',
      spend: 291010,
      impressions: 10267,
      reach: 7026,
      frequency: 1.46,
      cpm: 28344,
      linkClicks: 275,
      ctr: 2.68,
      cpc: 1058,
      landingPageViews: 202,
      lpvRate: 73.5,
      purchases: 11,
      purchaseRate: 4.0,
      purchaseValue: 322500,
      roas: 1.11,
      cpa: 26455,
      dateStart: '2026-05-04',
      dateEnd: '2026-06-02',
    },
    {
      id: 'c2',
      name: '에어핏 딥슬립 이어플러그스 0513(학습공부,저예산시작) - CBO',
      status: 'ACTIVE',
      spend: 145848,
      impressions: 4716,
      reach: 3579,
      frequency: 1.32,
      cpm: 30926,
      linkClicks: 169,
      ctr: 3.58,
      cpc: 863,
      landingPageViews: 142,
      lpvRate: 84.0,
      purchases: 8,
      purchaseRate: 4.73,
      purchaseValue: 258120,
      roas: 1.77,
      cpa: 18231,
      dateStart: '2026-05-04',
      dateEnd: '2026-06-02',
    },
  ]
}
