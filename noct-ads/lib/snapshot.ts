import fs from 'fs'

const SNAPSHOT_PATH = '/tmp/campaign_snapshot.json'

export interface CampaignSnapshot {
  id: string
  name: string
  status: string
  dailyBudget: number
  lifetimeBudget: number
  capturedAt: string
}

export function readSnapshot(): Map<string, CampaignSnapshot> {
  try {
    if (fs.existsSync(SNAPSHOT_PATH)) {
      const data = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'))
      return new Map(Object.entries(data))
    }
  } catch {}
  return new Map()
}

export function writeSnapshot(map: Map<string, CampaignSnapshot>) {
  const obj: Record<string, CampaignSnapshot> = {}
  for (const [k, v] of map) obj[k] = v
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(obj))
}

const BASE = 'https://graph.facebook.com/v19.0'

export async function fetchCampaignDetails(token: string, accountId: string): Promise<CampaignSnapshot[]> {
  const fields = 'id,name,status,effective_status,daily_budget,lifetime_budget'
  const url = `${BASE}/${accountId}/campaigns?fields=${fields}&limit=100&access_token=${token}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return []
  const json = await res.json()
  return (json.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.effective_status || c.status,
    dailyBudget: parseInt(c.daily_budget || '0'),
    lifetimeBudget: parseInt(c.lifetime_budget || '0'),
    capturedAt: new Date().toISOString(),
  }))
}
