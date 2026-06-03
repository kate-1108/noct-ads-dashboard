import { CampaignMetrics, Alert, AlertType, ALERT_THRESHOLDS } from './types'
import { ProfitCalc } from './types'

let alertCounter = 0

function makeAlert(
  campaign: CampaignMetrics,
  type: AlertType,
  severity: Alert['severity'],
  metric: string,
  currentValue: number,
  threshold: number,
  message: string,
  reason: string,
  action: string,
): Alert {
  return {
    id: `${campaign.id}-${type}-${++alertCounter}`,
    campaignId: campaign.id,
    campaignName: campaign.name,
    type,
    severity,
    metric,
    currentValue,
    threshold,
    message,
    reason,
    action,
    createdAt: new Date().toISOString(),
    isRead: false,
  }
}

export function generateAlerts(
  campaigns: CampaignMetrics[],
  profitCalcs: Map<string, ProfitCalc>, // productId → ProfitCalc (대표 variant)
  defaultBepRoas = 1.94, // 이어플러그 단품 기준
): Alert[] {
  const alerts: Alert[] = []
  alertCounter = 0

  for (const c of campaigns) {
    if (c.spend < ALERT_THRESHOLDS.min_spend_for_check) continue

    const bepRoas = defaultBepRoas

    // 1. ROAS 손익분기 미달 (치명적)
    if (c.roas < bepRoas * 0.7) {
      alerts.push(makeAlert(
        c, 'roas_critical', 'critical',
        'ROAS', c.roas, bepRoas,
        `ROAS ${c.roas.toFixed(2)} — 손익분기(${bepRoas.toFixed(2)})의 70%도 안 됨`,
        `광고비를 쓸수록 적자가 납니다. 현재 ₩100 광고비당 순손실이 발생하는 상태입니다. 손익분기 ROAS는 마진율을 고려해 계산됩니다 (1 ÷ 마진율).`,
        `즉시 캠페인을 일시 중단하거나 일일 예산을 최소값으로 낮추세요. 랜딩페이지 개선 또는 오퍼 구조(세트 판매 유도) 변경 후 재가동을 권장합니다.`,
      ))
    } else if (c.roas < bepRoas) {
      alerts.push(makeAlert(
        c, 'roas_below_bep', 'warning',
        'ROAS', c.roas, bepRoas,
        `ROAS ${c.roas.toFixed(2)} — 손익분기(${bepRoas.toFixed(2)}) 미달`,
        `현재 광고는 손실 구간입니다. 전환은 발생하고 있지만 광고비를 회수하지 못하고 있습니다.`,
        `랜딩페이지 전환율 개선(세트 옵션 강조, 첫 화면 CTA 배치), 또는 구매 의도가 더 높은 오디언스로 타겟 교체를 검토하세요.`,
      ))
    }

    // 2. 빈도 높음
    if (c.frequency >= ALERT_THRESHOLDS.frequency_critical) {
      alerts.push(makeAlert(
        c, 'frequency_high', 'critical',
        '빈도', c.frequency, ALERT_THRESHOLDS.frequency_critical,
        `빈도 ${c.frequency.toFixed(1)} — 광고 피로도 위험 수준`,
        `같은 사람에게 평균 ${c.frequency.toFixed(1)}번 광고가 노출됐습니다. 5회를 초과하면 클릭률이 급격히 떨어지고 광고 숨기기가 증가합니다.`,
        `소재(이미지·영상·카피)를 새것으로 교체하거나, 오디언스를 확장하세요. 또는 일시 중단 후 3~5일 뒤 재개하면 알고리즘이 새 사람을 찾습니다.`,
      ))
    } else if (c.frequency >= ALERT_THRESHOLDS.frequency_warning) {
      alerts.push(makeAlert(
        c, 'frequency_high', 'warning',
        '빈도', c.frequency, ALERT_THRESHOLDS.frequency_warning,
        `빈도 ${c.frequency.toFixed(1)} — 광고 피로도 주의`,
        `빈도가 3을 초과하면 CTR이 서서히 하락하기 시작합니다. 지금은 아직 허용 범위이지만 곧 소재 교체가 필요합니다.`,
        `새 소재를 미리 준비하세요. 현재 소재가 2~3주 이상 됐다면 교체 시점입니다.`,
      ))
    }

    // 3. CTR 낮음
    if (c.ctr < ALERT_THRESHOLDS.ctr_critical) {
      alerts.push(makeAlert(
        c, 'ctr_low', 'critical',
        'CTR', c.ctr, ALERT_THRESHOLDS.ctr_critical,
        `CTR ${c.ctr.toFixed(2)}% — 소재 반응 없음`,
        `100명이 광고를 봤을 때 ${c.ctr.toFixed(2)}명만 클릭합니다. 0.5% 미만은 타겟이나 소재가 전혀 맞지 않는 신호입니다.`,
        `소재를 즉시 교체하세요. 이미지·카피·CTA 버튼 문구를 전면 변경하거나, 타겟 오디언스가 이 상품과 관련 없을 수 있으니 타겟도 재검토하세요.`,
      ))
    } else if (c.ctr < ALERT_THRESHOLDS.ctr_warning) {
      alerts.push(makeAlert(
        c, 'ctr_low', 'warning',
        'CTR', c.ctr, ALERT_THRESHOLDS.ctr_warning,
        `CTR ${c.ctr.toFixed(2)}% — 소재 효율 낮음`,
        `업계 평균(1.5%)보다 낮습니다. 광고 소재가 타겟의 관심을 충분히 끌지 못하고 있습니다.`,
        `A/B 테스트로 다른 이미지나 카피를 테스트해보세요. 특히 첫 1~2줄 카피가 핵심입니다.`,
      ))
    }

    // 4. CPC 높음
    if (c.cpc > ALERT_THRESHOLDS.cpc_critical) {
      alerts.push(makeAlert(
        c, 'cpc_high', 'critical',
        'CPC', c.cpc, ALERT_THRESHOLDS.cpc_critical,
        `CPC ₩${c.cpc.toLocaleString()} — 클릭 비용 과다`,
        `클릭 1번에 ₩${c.cpc.toLocaleString()}이 들고 있습니다. 현재 전환율 기준으로는 구조적으로 BEP 달성이 불가능합니다.`,
        `CTR을 높여 CPC를 낮추는 것이 우선입니다. 더 넓은 오디언스(유사 오디언스 확장)나 소재 교체로 CTR을 올리면 CPC가 자연스럽게 내려갑니다.`,
      ))
    }

    // 5. LP 조회율 낮음
    if (c.lpvRate < ALERT_THRESHOLDS.lpv_rate_critical) {
      alerts.push(makeAlert(
        c, 'lpv_rate_low', 'critical',
        'LP 조회율', c.lpvRate, ALERT_THRESHOLDS.lpv_rate_critical,
        `LP 조회율 ${c.lpvRate.toFixed(0)}% — 클릭 후 절반이 이탈`,
        `클릭한 사람의 절반이 페이지가 열리기 전에 나갑니다. 페이지 로딩이 3초를 넘거나 모바일에서 오류가 발생하고 있을 가능성이 높습니다.`,
        `Google PageSpeed Insights(pagespeed.web.dev)에서 모바일 속도 점수를 확인하세요. 이미지 최적화, 불필요한 스크립트 제거로 3초 이내 로딩을 목표로 합니다.`,
      ))
    } else if (c.lpvRate < ALERT_THRESHOLDS.lpv_rate_warning) {
      alerts.push(makeAlert(
        c, 'lpv_rate_low', 'warning',
        'LP 조회율', c.lpvRate, ALERT_THRESHOLDS.lpv_rate_warning,
        `LP 조회율 ${c.lpvRate.toFixed(0)}% — 일부 이탈 발생`,
        `클릭 후 약 ${(100 - c.lpvRate).toFixed(0)}%가 페이지 로딩 전 이탈합니다. 이 광고비가 낭비되고 있습니다.`,
        `페이지 로딩 속도를 점검하고 이미지 용량을 줄이세요. 모바일 기준 2초 이내 로딩이 이상적입니다.`,
      ))
    }

    // 6. 지출은 있는데 전환 없음
    if (c.spend > 50000 && c.purchases === 0) {
      alerts.push(makeAlert(
        c, 'spend_no_conversion', 'warning',
        '전환', c.purchases, 1,
        `₩${c.spend.toLocaleString()} 지출, 전환 0건`,
        `광고비를 ₩${c.spend.toLocaleString()} 사용했지만 구매가 한 건도 없습니다. 픽셀 설치 오류이거나 랜딩페이지 문제일 수 있습니다.`,
        `1) 메타 픽셀이 올바르게 설치됐는지 확인하세요. 2) 랜딩페이지에서 직접 구매해보며 오류 여부를 확인하세요. 3) 타겟이 상품과 전혀 맞지 않을 수 있습니다.`,
      ))
    }
  }

  // 심각도 순 정렬
  return alerts.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 }
    return order[a.severity] - order[b.severity]
  })
}
