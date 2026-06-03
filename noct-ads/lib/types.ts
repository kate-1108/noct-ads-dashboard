// 상품 정보
export interface Product {
  id: string
  name: string
  costCNY: number       // 원가 (위안)
  cnyRate: number       // 환율 (기본 224)
  extraCostKRW: number  // 관세·배송 추가비용
  shippingKRW: number   // 배송비
  platformFeeRate: number // 플랫폼 수수료율 (0.03 = 3%)
  variants: ProductVariant[]
}

export interface ProductVariant {
  label: string   // 예: "단품", "2개 세트"
  priceKRW: number
  quantity: number // 포함 수량
}

// 계산 결과
export interface ProfitCalc {
  variant: ProductVariant
  costKRW: number
  marginKRW: number
  marginRate: number
  bepRoas: number       // 손익분기 ROAS
  targetRoas: number    // 목표 ROAS (BEP × 1.5)
}

// 메타 광고 캠페인 지표
export interface CampaignMetrics {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  reach: number
  frequency: number
  cpm: number
  linkClicks: number
  ctr: number
  cpc: number
  landingPageViews: number
  lpvRate: number       // 링크 클릭 대비 LP 조회율
  purchases: number
  purchaseRate: number  // 링크 클릭 대비 구매율
  purchaseValue: number
  roas: number
  cpa: number
  dateStart: string
  dateEnd: string
}

// 알림
export interface Alert {
  id: string
  campaignId: string
  campaignName: string
  type: AlertType
  severity: 'critical' | 'warning' | 'info'
  metric: string
  currentValue: number
  threshold: number
  message: string
  reason: string        // 왜 문제인지 설명
  action: string        // 무엇을 해야 하는지
  createdAt: string
  isRead: boolean
}

export type AlertType =
  | 'roas_below_bep'
  | 'roas_critical'
  | 'frequency_high'
  | 'ctr_low'
  | 'cpc_high'
  | 'lpv_rate_low'
  | 'spend_no_conversion'
  | 'campaign_learning'

// 알림 임계값 설정
export const ALERT_THRESHOLDS = {
  frequency_warning: 3.0,
  frequency_critical: 5.0,
  ctr_warning: 1.0,
  ctr_critical: 0.5,
  cpc_warning: 1500,
  cpc_critical: 2500,
  lpv_rate_warning: 70,
  lpv_rate_critical: 50,
  min_spend_for_check: 10000, // 최소 1만원 지출 후 평가
}

// 지표 설명 사전
export const METRIC_EXPLANATIONS: Record<string, { name: string; description: string; good: string; bad: string; why: string }> = {
  roas: {
    name: 'ROAS (광고비 대비 매출)',
    description: '광고비 1원으로 얼마의 매출을 만들었는지. 전환 매출 ÷ 광고 지출로 계산.',
    good: '손익분기 ROAS 이상 (마진율에 따라 다름)',
    bad: '손익분기 미달 시 광고를 돌릴수록 손실',
    why: 'ROAS가 낮으면 광고비를 쓸수록 적자가 납니다. 손익분기 ROAS = 1 ÷ 마진율.',
  },
  ctr: {
    name: 'CTR (클릭률)',
    description: '광고를 본 사람 중 클릭한 비율. 링크 클릭 ÷ 노출 × 100.',
    good: '2% 이상이면 우수',
    bad: '0.5% 미만이면 소재가 안 먹히는 것',
    why: 'CTR이 낮으면 광고 소재(이미지·카피)가 타겟의 관심을 끌지 못하는 것. 소재나 타겟을 바꿔야 합니다.',
  },
  cpc: {
    name: 'CPC (클릭당 비용)',
    description: '링크 클릭 1회당 든 광고비. 지출 ÷ 링크 클릭 수.',
    good: '커머스 기준 ₩800 이하면 우수',
    bad: '₩2,000 이상이면 클릭 비용이 지나치게 높음',
    why: 'CPC가 높으면 같은 예산으로 유입이 적어집니다. CTR이 낮거나 경쟁이 심한 오디언스일 때 올라갑니다.',
  },
  frequency: {
    name: '빈도 (Frequency)',
    description: '동일인에게 광고가 평균 몇 번 노출됐는지. 노출 ÷ 도달.',
    good: '1.5~3.0이 적정',
    bad: '5.0 이상이면 광고 피로도 발생',
    why: '같은 사람에게 너무 많이 보이면 무시하거나 숨기기를 누릅니다. CTR이 떨어지고 CPC가 올라가는 신호.',
  },
  cpm: {
    name: 'CPM (1,000회 노출당 비용)',
    description: '광고가 1,000번 노출되는 데 드는 비용.',
    good: '₩10,000 이하면 우수',
    bad: '₩30,000 이상이면 오디언스 경쟁이 심한 것',
    why: 'CPM이 갑자기 오르면 타겟 오디언스가 포화됐거나 시즌 경쟁이 심해진 것. 오디언스 확장을 검토해야 합니다.',
  },
  lpv_rate: {
    name: 'LP 조회율',
    description: '링크 클릭 후 실제로 랜딩페이지가 로드된 비율. LP 조회 ÷ 링크 클릭 × 100.',
    good: '70% 이상이면 양호',
    bad: '50% 미만이면 페이지 로딩 문제',
    why: '클릭했는데 페이지가 안 열리면 광고비가 낭비됩니다. 모바일 로딩 속도나 링크 오류를 점검해야 합니다.',
  },
  purchase_rate: {
    name: '링크 클릭당 구매율',
    description: '링크 클릭 중 실제 구매로 이어진 비율.',
    good: '3% 이상이면 우수',
    bad: '1% 미만이면 랜딩페이지 문제',
    why: '유입은 되는데 구매가 안 되면 랜딩페이지 설득력, 가격, 후기 부족 문제입니다.',
  },
  cpa: {
    name: 'CPA (전환당 비용)',
    description: '구매 1건당 든 광고비. 지출 ÷ 전환 수.',
    good: '마진의 30~50% 이하면 우수',
    bad: '마진보다 높으면 광고로 손해',
    why: 'CPA가 마진보다 높으면 팔수록 적자입니다. 목표 CPA = 판매가 × 마진율 × 0.4.',
  },
}
