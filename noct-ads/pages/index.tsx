import { useState } from 'react'
import { useRouter } from 'next/router'
import useSWR from 'swr'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { CampaignMetrics, Alert, METRIC_EXPLANATIONS } from '../lib/types'
import { formatKRW, formatPct } from '../lib/calc'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const PERIODS = [
  { label: '오늘', value: 'today' },
  { label: '7일', value: 'last_7d' },
  { label: '30일', value: 'last_30d' },
]

// 학습 기간 계산
function getLearningDays(startDate: string): number | null {
  if (!startDate) return null
  const start = new Date(startDate)
  const now = new Date()
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 && diff <= 14 ? diff : null
}

export default function Dashboard() {
  const router = useRouter()
  const [period, setPeriod] = useState('last_30d')
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null)
  const [activeMetric, setActiveMetric] = useState<string | null>(null)
  const [learningDates, setLearningDates] = useState<Record<string, string>>({})
  const [showLearningInput, setShowLearningInput] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(`/api/campaigns?period=${period}`, fetcher, {
    refreshInterval: 3600000, // 1시간마다 자동 갱신
  })

  const campaigns: CampaignMetrics[] = data?.campaigns || []
  const alerts: Alert[] = data?.alerts || []
  const bepRoas: number = data?.bepRoas || 1.94
  const fetchedAt: string = data?.fetchedAt || ''

  const criticals = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')

  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalPurchases = campaigns.reduce((s, c) => s + c.purchases, 0)
  const totalValue = campaigns.reduce((s, c) => s + c.purchaseValue, 0)
  const overallRoas = totalSpend > 0 ? totalValue / totalSpend : 0
  const overallCpa = totalPurchases > 0 ? totalSpend / totalPurchases : 0

  const roasColor = overallRoas >= bepRoas ? 'var(--green)' : overallRoas >= bepRoas * 0.7 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'IBM Plex Mono', fontWeight: 500, fontSize: 16, color: 'var(--text)' }}>NOCT</span>
          <span style={{ color: 'var(--text3)', fontSize: 12 }}>광고 관리 대시보드</span>
          <button onClick={() => router.push('/trends')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer', marginLeft: 8 }}>추세 그래프</button>
          <button onClick={() => router.push('/changelog')} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}>수정 기록</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* 기간 선택 */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg2)', padding: 4, borderRadius: 8 }}>
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)} style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12,
                background: period === p.value ? 'var(--bg3)' : 'transparent',
                color: period === p.value ? 'var(--text)' : 'var(--text2)',
                transition: 'all .15s',
              }}>{p.label}</button>
            ))}
          </div>
          {/* 새로고침 */}
          <button onClick={() => mutate()} style={{
            padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border2)',
            background: 'transparent', color: 'var(--text2)', cursor: 'pointer', fontSize: 12,
          }}>새로고침</button>
          {/* 마지막 업데이트 */}
          {fetchedAt && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'IBM Plex Mono' }}>
              {new Date(fetchedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 업데이트
            </span>
          )}
        </div>
      </header>

      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>데이터 불러오는 중...</div>
        )}

        {!isLoading && (
          <>
            {/* 알림 배너 */}
            {(criticals.length > 0 || warnings.length > 0) && (
              <section style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)' }}>알림</span>
                  {criticals.length > 0 && <Pill color="var(--red)" bg="var(--red-bg)">{criticals.length}개 즉시 조치</Pill>}
                  {warnings.length > 0 && <Pill color="var(--yellow)" bg="var(--yellow-bg)">{warnings.length}개 주의</Pill>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {alerts.map(alert => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      isActive={activeAlert?.id === alert.id}
                      onClick={() => setActiveAlert(activeAlert?.id === alert.id ? null : alert)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 전체 요약 지표 */}
            <section style={{ marginBottom: 24 }}>
              <SectionTitle>전체 요약</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                <StatCard label="총 지출" value={formatKRW(totalSpend)} />
                <StatCard label="총 구매" value={`${totalPurchases}건`} />
                <StatCard label="총 매출" value={formatKRW(totalValue)} />
                <StatCard
                  label="전체 ROAS"
                  value={overallRoas.toFixed(2)}
                  color={roasColor}
                  sub={`BEP ${bepRoas.toFixed(2)}`}
                />
                <StatCard label="평균 CPA" value={formatKRW(overallCpa)} />
              </div>
            </section>

            {/* 캠페인별 상세 */}
            <section style={{ marginBottom: 24 }}>
              <SectionTitle>캠페인별 지표</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {campaigns.map(c => (
                  <CampaignCard
                    key={c.id}
                    campaign={c}
                    bepRoas={bepRoas}
                    alerts={alerts.filter(a => a.campaignId === c.id)}
                    activeMetric={activeMetric}
                    onMetricClick={setActiveMetric}
                    learningStartDate={learningDates[c.id] || ''}
                    onSetLearningDate={(date: string) => setLearningDates((prev: Record<string, string>) => ({ ...prev, [c.id]: date }))}
                    showInput={showLearningInput === c.id}
                    onToggleInput={() => setShowLearningInput(showLearningInput === c.id ? null : c.id)}
                  />
                ))}
              </div>
            </section>

            {/* 지표 사전 */}
            <section style={{ marginBottom: 24 }}>
              <SectionTitle>지표 설명 — 왜 중요한가?</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {Object.entries(METRIC_EXPLANATIONS).map(([key, info]) => (
                  <MetricExplainCard
                    key={key}
                    metricKey={key}
                    info={info}
                    isActive={activeMetric === key}
                    onClick={() => setActiveMetric(activeMetric === key ? null : key)}
                  />
                ))}
              </div>
            </section>

            {/* 1인 운영 주간 루틴 */}
            <section style={{ marginBottom: 24 }}>
              <SectionTitle>1인 운영 관리 루틴</SectionTitle>
              <RoutineGuide />
            </section>
          </>
        )}
      </main>
    </div>
  )
}

/* ─── 컴포넌트들 ─── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 600, color: 'var(--text3)',
      textTransform: 'uppercase', letterSpacing: '.08em',
      marginBottom: 10, paddingBottom: 8,
      borderBottom: '1px solid var(--border)',
    }}>{children}</div>
  )
}

function Pill({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px',
      borderRadius: 100, color, background: bg,
    }}>{children}</span>
  )
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color?: string; sub?: string }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '14px 16px',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)', fontFamily: 'IBM Plex Mono' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function AlertCard({ alert, isActive, onClick }: { alert: Alert; isActive: boolean; onClick: () => void }) {
  const colors = {
    critical: { border: 'var(--red)', bg: 'var(--red-bg)', dot: 'var(--red)' },
    warning: { border: 'var(--yellow)', bg: 'var(--yellow-bg)', dot: 'var(--yellow)' },
    info: { border: 'var(--blue)', bg: 'var(--blue-bg)', dot: 'var(--blue)' },
  }
  const c = colors[alert.severity]
  return (
    <div
      onClick={onClick}
      style={{
        border: `1px solid ${isActive ? c.border : 'var(--border)'}`,
        background: isActive ? c.bg : 'var(--bg2)',
        borderRadius: 'var(--radius)', padding: '12px 16px', cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%', background: c.dot,
          flexShrink: 0, marginTop: 5,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{alert.message}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>
            {alert.campaignName.length > 40 ? alert.campaignName.slice(0, 40) + '…' : alert.campaignName}
          </div>

          {isActive && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <DetailBlock label="왜 문제인가?" text={alert.reason} color="var(--yellow)" />
              <DetailBlock label="무엇을 해야 하나?" text={alert.action} color="var(--green)" />
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{isActive ? '▲' : '▼'}</span>
      </div>
    </div>
  )
}

function DetailBlock({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)',
      padding: '10px 12px', borderLeft: `2px solid ${color}`,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>{text}</div>
    </div>
  )
}

function CampaignCard({
  campaign, bepRoas, alerts, activeMetric, onMetricClick,
  learningStartDate, onSetLearningDate, showInput, onToggleInput
}: {
  campaign: CampaignMetrics
  bepRoas: number
  alerts: Alert[]
  activeMetric: string | null
  onMetricClick: (k: string | null) => void
  learningStartDate: string
  onSetLearningDate: (date: string) => void
  showInput: boolean
  onToggleInput: () => void
}) {
  const roasColor = campaign.roas >= bepRoas ? 'var(--green)' : campaign.roas >= bepRoas * 0.7 ? 'var(--yellow)' : 'var(--red)'
  const statusColor = campaign.status === 'ACTIVE' ? 'var(--green)' : 'var(--text3)'
  const learningDays = getLearningDays(learningStartDate)
  const isLearning = learningDays !== null

  const metrics = [
    { key: 'roas', label: 'ROAS', value: campaign.roas.toFixed(2), color: roasColor, sub: `BEP ${bepRoas.toFixed(2)}` },
    { key: 'ctr', label: 'CTR', value: campaign.ctr.toFixed(2) + '%', color: campaign.ctr >= 2 ? 'var(--green)' : campaign.ctr >= 1 ? 'var(--yellow)' : 'var(--red)' },
    { key: 'cpc', label: 'CPC', value: formatKRW(campaign.cpc), color: campaign.cpc <= 800 ? 'var(--green)' : campaign.cpc <= 1500 ? 'var(--yellow)' : 'var(--red)' },
    { key: 'frequency', label: '빈도', value: campaign.frequency.toFixed(1), color: campaign.frequency <= 3 ? 'var(--green)' : campaign.frequency <= 5 ? 'var(--yellow)' : 'var(--red)' },
    { key: 'cpm', label: 'CPM', value: formatKRW(campaign.cpm), color: 'var(--text)' },
    { key: 'lpv_rate', label: 'LP 조회율', value: campaign.lpvRate.toFixed(0) + '%', color: campaign.lpvRate >= 70 ? 'var(--green)' : campaign.lpvRate >= 50 ? 'var(--yellow)' : 'var(--red)' },
    { key: 'purchase_rate', label: '구매 전환율', value: campaign.purchaseRate.toFixed(1) + '%', color: campaign.purchaseRate >= 3 ? 'var(--green)' : campaign.purchaseRate >= 1.5 ? 'var(--yellow)' : 'var(--red)' },
    { key: 'cpa', label: 'CPA', value: formatKRW(campaign.cpa), color: 'var(--text)' },
  ]

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 16,
    }}>
      {/* 캠페인 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {campaign.name.length > 50 ? campaign.name.slice(0, 50) + '…' : campaign.name}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: statusColor, fontWeight: 500 }}>● {campaign.status}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{campaign.dateStart} ~ {campaign.dateEnd}</span>
            {isLearning && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: '#1a2a3a', color: '#5b9ef7', border: '1px solid #185FA5' }}>
                학습 중 D+{learningDays} / 14
              </span>
            )}
            <button onClick={onToggleInput} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
              {isLearning ? '학습 기간 수정' : '학습 기간 설정'}
            </button>
          </div>
          {showInput && (
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>광고 시작일:</span>
              <input type='date' value={learningStartDate} onChange={e => onSetLearningDate(e.target.value)} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'var(--bg3)', color: 'var(--text)' }} />
              {isLearning && <span style={{ fontSize: 11, color: 'var(--blue)' }}>알림은 학습 완료(D+14) 후 정상 기준 적용</span>}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'var(--text3)' }}>지출</div>
          <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'IBM Plex Mono', color: 'var(--text)' }}>
            {formatKRW(campaign.spend)}
          </div>
        </div>
      </div>

      {/* 알림 태그 */}
      {alerts.length > 0 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
          {alerts.map(a => (
            <span key={a.id} style={{
              fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100,
              color: a.severity === 'critical' ? 'var(--red)' : 'var(--yellow)',
              background: a.severity === 'critical' ? 'var(--red-bg)' : 'var(--yellow-bg)',
            }}>{a.metric} 이슈</span>
          ))}
        </div>
      )}

      {/* 지표 그리드 — 클릭하면 설명 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
        {metrics.map(m => (
          <button
            key={m.key}
            onClick={() => onMetricClick(activeMetric === m.key ? null : m.key)}
            style={{
              background: activeMetric === m.key ? 'var(--bg3)' : 'var(--bg)',
              border: `1px solid ${activeMetric === m.key ? 'var(--border2)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', padding: '10px 12px',
              cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
            }}
          >
            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: m.color, fontFamily: 'IBM Plex Mono' }}>{m.value}</div>
            {m.sub && <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>{m.sub}</div>}
          </button>
        ))}
      </div>

      {/* 선택된 지표 설명 */}
      {activeMetric && METRIC_EXPLANATIONS[activeMetric] && (
        <div style={{
          marginTop: 12, background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
          padding: '12px 14px', borderLeft: '2px solid var(--blue)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 6 }}>
            {METRIC_EXPLANATIONS[activeMetric].name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 6 }}>
            {METRIC_EXPLANATIONS[activeMetric].description}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--green)' }}>✓ {METRIC_EXPLANATIONS[activeMetric].good}</div>
            <div style={{ fontSize: 11, color: 'var(--red)' }}>✗ {METRIC_EXPLANATIONS[activeMetric].bad}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6, fontStyle: 'italic' }}>
            {METRIC_EXPLANATIONS[activeMetric].why}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricExplainCard({ metricKey, info, isActive, onClick }: {
  metricKey: string
  info: typeof METRIC_EXPLANATIONS[string]
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? 'var(--bg3)' : 'var(--bg2)',
        border: `1px solid ${isActive ? 'var(--border2)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', padding: '12px 14px',
        cursor: 'pointer', transition: 'all .15s',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{info.name}</div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, marginBottom: isActive ? 10 : 0 }}>
        {info.description}
      </div>
      {isActive && (
        <>
          <div style={{ height: 1, background: 'var(--border)', margin: '8px 0' }} />
          <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 4 }}>✓ {info.good}</div>
          <div style={{ fontSize: 11, color: 'var(--red)', marginBottom: 6 }}>✗ {info.bad}</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{info.why}</div>
        </>
      )}
    </div>
  )
}

const ROUTINE = [
  {
    freq: '매일 (5분)',
    color: 'var(--red)',
    items: [
      { check: '알림 배너 확인', why: 'ROAS 급락이나 빈도 초과는 하루만 늦어도 손실이 커집니다.' },
      { check: '지출 금액 확인', why: '예산 초과 지출이나 갑작스러운 집행 중단을 빠르게 파악합니다.' },
    ],
  },
  {
    freq: '주 1회 월요일 (15분)',
    color: 'var(--yellow)',
    items: [
      { check: 'ROAS vs 손익분기 비교', why: '주 단위로 봐야 일별 노이즈를 제거하고 추세를 파악할 수 있습니다.' },
      { check: '빈도 체크', why: '빈도가 3을 넘기 시작하면 그 주 안에 소재 교체를 준비해야 합니다.' },
      { check: 'CPC 변화 확인', why: 'CPC가 전주 대비 30% 이상 오르면 오디언스 포화 신호입니다.' },
      { check: '테스트 결과 검토', why: '1주일 분량의 데이터로 A/B 테스트 승자를 결정하기에 충분합니다.' },
    ],
  },
  {
    freq: '월 1회 (30분)',
    color: 'var(--green)',
    items: [
      { check: '타겟별 성과 비교', why: '어느 오디언스가 가장 좋은 ROAS를 내는지 파악해 예산 배분을 최적화합니다.' },
      { check: '소재 수명 체크', why: '4주 이상 된 소재는 빈도가 낮아도 피로도가 쌓입니다. 새 소재로 교체 계획을 세웁니다.' },
      { check: '손익 구조 재계산', why: '환율·원가 변동이 있을 수 있습니다. BEP ROAS를 최신 원가로 갱신하세요.' },
      { check: '다음 달 테스트 계획', why: '테스트 없이 같은 세팅을 반복하면 점점 성과가 떨어집니다.' },
    ],
  },
]

function RoutineGuide() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ROUTINE.map((r, i) => (
        <div key={i} style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', overflow: 'hidden',
        }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: '100%', padding: '12px 16px', background: 'transparent', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{r.freq}</span>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{open === i ? '▲' : '▼'}</span>
          </button>
          {open === i && (
            <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {r.items.map((item, j) => (
                <div key={j} style={{
                  background: 'var(--bg3)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 12px', borderLeft: `2px solid ${r.color}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                    ☐ {item.check}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>{item.why}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
