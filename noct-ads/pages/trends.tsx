import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'
import { DailyMetrics, GRAPH_METRICS } from '../lib/types'
import { formatKRW } from '../lib/calc'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const DAYS_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '14일', value: 14 },
  { label: '30일', value: 30 },
  { label: '60일', value: 60 },
]

const UNIT_OPTIONS = [
  { label: '일별', value: 'day' },
  { label: '주별', value: 'week' },
  { label: '월별', value: 'month' },
]

function groupByUnit(data: DailyMetrics[], unit: string): DailyMetrics[] {
  if (unit === 'day') return data
  const groups = new Map<string, DailyMetrics[]>()
  for (const d of data) {
    const date = new Date(d.date)
    let key: string
    if (unit === 'week') {
      const mon = new Date(date)
      mon.setDate(date.getDate() - date.getDay() + 1)
      key = mon.toISOString().slice(0, 10)
    } else {
      key = d.date.slice(0, 7)
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(d)
  }
  return Array.from(groups.entries()).map(([key, rows]) => {
    const spend = rows.reduce((s, r) => s + r.spend, 0)
    const pv = rows.reduce((s, r) => s + r.purchaseValue, 0)
    const purchases = rows.reduce((s, r) => s + r.purchases, 0)
    const clicks = rows.reduce((s, r) => s + r.linkClicks, 0)
    const imp = rows.reduce((s, r) => s + r.impressions, 0)
    return {
      date: key,
      spend,
      impressions: imp,
      linkClicks: clicks,
      ctr: imp > 0 ? (clicks / imp) * 100 : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      frequency: rows.reduce((s, r) => s + r.frequency, 0) / rows.length,
      cpm: imp > 0 ? (spend / imp) * 1000 : 0,
      purchases,
      purchaseValue: pv,
      roas: spend > 0 ? pv / spend : 0,
      cpa: purchases > 0 ? spend / purchases : 0,
      lpvRate: rows.reduce((s, r) => s + r.lpvRate, 0) / rows.length,
      purchaseRate: rows.reduce((s, r) => s + r.purchaseRate, 0) / rows.length,
    }
  }).sort((a, b) => a.date.localeCompare(b.date))
}

function formatDate(date: string, unit: string) {
  if (unit === 'month') return date.slice(0, 7)
  const d = new Date(date)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function formatVal(val: number, unit: string) {
  if (unit === '₩') return formatKRW(val)
  if (unit === '%') return val.toFixed(1) + '%'
  if (unit === '건') return val + '건'
  return val.toFixed(2)
}

export default function TrendPage() {
  const router = useRouter()
  const [days, setDays] = useState(30)
  const [timeUnit, setTimeUnit] = useState('day')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['roas', 'ctr'])
  const [campaignId, setCampaignId] = useState<string>('all')

  const { data: campaignsData } = useSWR('/api/campaigns?period=last_30d', fetcher)
  const campaigns = campaignsData?.campaigns || []

  const apiUrl = `/api/daily?days=${days}${campaignId !== 'all' ? `&campaignId=${campaignId}` : ''}`
  const { data, isLoading } = useSWR(apiUrl, fetcher)
  const rawData: DailyMetrics[] = data?.data || []
  const chartData = groupByUnit(rawData, timeUnit)

  function toggleMetric(key: string) {
    setSelectedMetrics(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const s = { color: 'var(--color-text-secondary, #8b90a0)', fontSize: 12 }

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', fontFamily: 'Noto Sans KR, sans-serif' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, background: '#0d0f12', zIndex: 100 }}>
        <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#8b90a0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>← 대시보드</button>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#e8eaf0', fontWeight: 500 }}>추세 그래프</span>
      </header>

      <main style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>

        {/* 컨트롤 패널 */}
        <div style={{ background: '#13161b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* 캠페인 선택 */}
          <div>
            <div style={{ fontSize: 11, color: '#555a68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>캠페인</div>
            <select value={campaignId} onChange={e => setCampaignId(e.target.value)} style={{ fontSize: 12, padding: '6px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#1a1e25', color: '#e8eaf0', cursor: 'pointer' }}>
              <option value="all">전체</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name.length > 35 ? c.name.slice(0, 35) + '…' : c.name}</option>
              ))}
            </select>
          </div>

          {/* 기간 */}
          <div>
            <div style={{ fontSize: 11, color: '#555a68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>기간</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {DAYS_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setDays(o.value)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: days === o.value ? '#1a1e25' : 'transparent', color: days === o.value ? '#e8eaf0' : '#8b90a0', cursor: 'pointer' }}>{o.label}</button>
              ))}
            </div>
          </div>

          {/* 단위 */}
          <div>
            <div style={{ fontSize: 11, color: '#555a68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.05em' }}>단위</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {UNIT_OPTIONS.map(o => (
                <button key={o.value} onClick={() => setTimeUnit(o.value)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: timeUnit === o.value ? '#1a1e25' : 'transparent', color: timeUnit === o.value ? '#e8eaf0' : '#8b90a0', cursor: 'pointer' }}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 지표 선택 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#555a68', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>표시 지표 선택 (최대 4개)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GRAPH_METRICS.map(m => {
              const active = selectedMetrics.includes(m.key)
              return (
                <button key={m.key} onClick={() => toggleMetric(m.key)} disabled={!active && selectedMetrics.length >= 4} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 100, border: `1px solid ${active ? m.color : 'rgba(255,255,255,0.1)'}`, background: active ? `${m.color}22` : 'transparent', color: active ? m.color : '#555a68', cursor: 'pointer', transition: 'all .15s', opacity: !active && selectedMetrics.length >= 4 ? 0.4 : 1 }}>{m.label}</button>
              )
            })}
          </div>
        </div>

        {/* 그래프 */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555a68' }}>데이터 불러오는 중...</div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555a68' }}>선택한 기간에 데이터가 없습니다</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {selectedMetrics.map(metricKey => {
              const metricInfo = GRAPH_METRICS.find(m => m.key === metricKey)!
              const vals = chartData.map(d => (d as any)[metricKey] as number)
              const min = Math.min(...vals)
              const max = Math.max(...vals)

              return (
                <div key={metricKey} style={{ background: '#13161b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: metricInfo.color }}>{metricInfo.label}</span>
                    <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#555a68' }}>
                      <span>최소 {formatVal(min, metricInfo.unit)}</span>
                      <span>최대 {formatVal(max, metricInfo.unit)}</span>
                      <span>평균 {formatVal(vals.reduce((a, b) => a + b, 0) / vals.length, metricInfo.unit)}</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tickFormatter={d => formatDate(d, timeUnit)} tick={{ fontSize: 11, fill: '#555a68' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#555a68' }} axisLine={false} tickLine={false} tickFormatter={v => metricInfo.unit === '₩' ? '₩' + Math.round(v / 1000) + 'k' : metricInfo.unit === '%' ? v.toFixed(1) + '%' : v.toFixed(1)} width={55} />
                      <Tooltip
                        contentStyle={{ background: '#1a1e25', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: '#8b90a0' }}
                        formatter={(val: any) => [formatVal(val, metricInfo.unit), metricInfo.label]}
                        labelFormatter={label => formatDate(label, timeUnit)}
                      />
                      <Line type="monotone" dataKey={metricKey} stroke={metricInfo.color} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: metricInfo.color }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
