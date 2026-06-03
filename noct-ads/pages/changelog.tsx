import { useState } from 'react'
import { useRouter } from 'next/router'
import useSWR, { mutate } from 'swr'
import { ChangeLog, ChangeCategory, CHANGE_CATEGORY_LABELS } from '../lib/types'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CATEGORIES = Object.entries(CHANGE_CATEGORY_LABELS) as [ChangeCategory, { label: string; color: string; bg: string }][]

export default function ChangelogPage() {
  const router = useRouter()
  const [filterCampaign, setFilterCampaign] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    campaignId: '',
    campaignName: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'other' as ChangeCategory,
    title: '',
    detail: '',
  })
  const [saving, setSaving] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [detectResult, setDetectResult] = useState<string | null>(null)

  const { data: campaignsData } = useSWR('/api/campaigns?period=last_30d', fetcher)
  const campaigns = campaignsData?.campaigns || []

  const logsUrl = filterCampaign !== 'all' ? `/api/changelog?campaignId=${filterCampaign}` : '/api/changelog'
  const { data: logs = [] } = useSWR<ChangeLog[]>(logsUrl, fetcher, { refreshInterval: 5000 })

  async function runDetect() {
    setDetecting(true)
    setDetectResult(null)
    try {
      const res = await fetch('/api/detect', { method: 'POST' })
      const json = await res.json()
      setDetectResult(json.detected > 0 ? `${json.detected}개 변경사항 감지됨!` : '변경사항 없음')
      await mutate(logsUrl)
    } catch {
      setDetectResult('감지 실패')
    }
    setDetecting(false)
  }

  async function saveLog() {
    if (!form.title || !form.date) return
    setSaving(true)
    const body = {
      ...form,
      campaignId: form.campaignId || 'all',
      campaignName: form.campaignId ? (campaigns.find((c: any) => c.id === form.campaignId)?.name || '') : '전체',
    }
    await fetch('/api/changelog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await mutate(logsUrl)
    setForm({ campaignId: '', campaignName: '', date: new Date().toISOString().slice(0, 10), category: 'other', title: '', detail: '' })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteLog(id: string) {
    await fetch(`/api/changelog?id=${id}`, { method: 'DELETE' })
    await mutate(logsUrl)
  }

  // 날짜별 그룹
  const grouped = new Map<string, ChangeLog[]>()
  for (const log of logs) {
    const key = log.date
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(log)
  }
  const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', fontFamily: 'Noto Sans KR, sans-serif' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#0d0f12', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#8b90a0', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12 }}>← 대시보드</button>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: '#e8eaf0', fontWeight: 500 }}>광고 수정 기록</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: showForm ? '#1a1e25' : 'transparent', border: '1px solid rgba(255,255,255,0.14)', color: '#e8eaf0', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 12 }}>+ 기록 추가</button>
      </header>

      <main style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>

        {/* 기록 추가 폼 */}
        {showForm && (
          <div style={{ background: '#13161b', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e8eaf0', marginBottom: 14 }}>새 수정 기록</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#555a68', marginBottom: 5 }}>캠페인</div>
                <select value={form.campaignId} onChange={e => setForm(f => ({ ...f, campaignId: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#1a1e25', color: '#e8eaf0' }}>
                  <option value="">전체 / 공통</option>
                  {campaigns.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name.length > 30 ? c.name.slice(0, 30) + '…' : c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#555a68', marginBottom: 5 }}>날짜</div>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#1a1e25', color: '#e8eaf0' }} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555a68', marginBottom: 5 }}>변경 유형</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATEGORIES.map(([key, info]) => (
                  <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: `1px solid ${form.category === key ? info.color : 'rgba(255,255,255,0.1)'}`, background: form.category === key ? info.bg + '33' : 'transparent', color: form.category === key ? info.color : '#555a68', cursor: 'pointer' }}>{info.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#555a68', marginBottom: 5 }}>제목 *</div>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 일일 예산 ₩30,000 → ₩60,000 증액" style={{ width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#1a1e25', color: '#e8eaf0', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555a68', marginBottom: 5 }}>상세 메모</div>
              <textarea value={form.detail} onChange={e => setForm(f => ({ ...f, detail: e.target.value }))} placeholder="변경 이유, 기대 효과 등" rows={2} style={{ width: '100%', fontSize: 12, padding: '7px 10px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: '#1a1e25', color: '#e8eaf0', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowForm(false)} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, border: '1px solid rgba(255,255,255,0.14)', background: 'transparent', color: '#8b90a0', cursor: 'pointer' }}>취소</button>
              <button onClick={saveLog} disabled={saving || !form.title} style={{ fontSize: 12, padding: '7px 16px', borderRadius: 7, border: 'none', background: form.title ? '#22d3a0' : '#1a1e25', color: form.title ? '#04342C' : '#555a68', cursor: form.title ? 'pointer' : 'default', fontWeight: 500 }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        )}

        {/* 캠페인 필터 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={() => setFilterCampaign('all')} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 100, border: `1px solid ${filterCampaign === 'all' ? '#22d3a0' : 'rgba(255,255,255,0.1)'}`, background: filterCampaign === 'all' ? '#22d3a022' : 'transparent', color: filterCampaign === 'all' ? '#22d3a0' : '#555a68', cursor: 'pointer' }}>전체</button>
          {campaigns.map((c: any) => (
            <button key={c.id} onClick={() => setFilterCampaign(c.id)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 100, border: `1px solid ${filterCampaign === c.id ? '#5b9ef7' : 'rgba(255,255,255,0.1)'}`, background: filterCampaign === c.id ? '#5b9ef722' : 'transparent', color: filterCampaign === c.id ? '#5b9ef7' : '#555a68', cursor: 'pointer' }}>
              {c.name.length > 25 ? c.name.slice(0, 25) + '…' : c.name}
            </button>
          ))}
        </div>

        {/* 타임라인 */}
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#555a68' }}>
            <div style={{ fontSize: 13, marginBottom: 8 }}>수정 기록이 없습니다</div>
            <div style={{ fontSize: 11 }}>상단 "+ 기록 추가" 버튼으로 기록을 남겨보세요</div>
          </div>
        ) : (
          <div>
            {sortedDates.map(date => (
              <div key={date} style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#8b90a0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{date}</span>
                  <span style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 16, borderLeft: '2px solid rgba(255,255,255,0.06)' }}>
                  {grouped.get(date)!.map(log => {
                    const cat = CHANGE_CATEGORY_LABELS[log.category]
                    return (
                      <div key={log.id} style={{ background: '#13161b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '11px 14px', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, color: cat.color, background: cat.bg + '44', border: `1px solid ${cat.color}55` }}>{cat.label}</span>
                              <span style={{ fontSize: 12, fontWeight: 500, color: '#e8eaf0' }}>{log.title}</span>
                            </div>
                            {log.campaignName && (
                              <div style={{ fontSize: 11, color: '#555a68', marginBottom: log.detail ? 4 : 0 }}>
                                {log.campaignName.length > 45 ? log.campaignName.slice(0, 45) + '…' : log.campaignName}
                              </div>
                            )}
                            {log.detail && (
                              <div style={{ fontSize: 12, color: '#8b90a0', lineHeight: 1.6 }}>{log.detail}</div>
                            )}
                          </div>
                          <button onClick={() => deleteLog(log.id)} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(255,95,95,0.3)', background: 'transparent', color: '#ff5f5f', cursor: 'pointer', flexShrink: 0, opacity: 0.6 }}>삭제</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
