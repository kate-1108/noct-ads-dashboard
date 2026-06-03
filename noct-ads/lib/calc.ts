import { Product, ProductVariant, ProfitCalc } from './types'

export function calcProfit(product: Product, variant: ProductVariant): ProfitCalc {
  const unitCostKRW = product.costCNY * product.cnyRate + product.extraCostKRW
  const totalCostKRW = unitCostKRW * variant.quantity
  const platformFee = variant.priceKRW * product.platformFeeRate
  const totalDeductions = totalCostKRW + platformFee + product.shippingKRW
  const marginKRW = variant.priceKRW - totalDeductions
  const marginRate = marginKRW / variant.priceKRW
  const bepRoas = marginRate > 0 ? 1 / marginRate : 99
  return {
    variant,
    costKRW: totalDeductions,
    marginKRW,
    marginRate,
    bepRoas,
    targetRoas: bepRoas * 1.5,
  }
}

export function formatKRW(n: number): string {
  return '₩' + Math.round(n).toLocaleString('ko-KR')
}

export function formatPct(n: number, decimals = 1): string {
  return (n * 100).toFixed(decimals) + '%'
}

export function roasStatus(roas: number, bepRoas: number): 'critical' | 'warning' | 'good' {
  if (roas < bepRoas * 0.7) return 'critical'
  if (roas < bepRoas) return 'warning'
  return 'good'
}

// 기본 상품 데이터 (환경변수 없을 때 사용)
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'earplug',
    name: '에어핏 딥슬립 이어플러그',
    costCNY: 20,
    cnyRate: 224,
    extraCostKRW: 2000,
    shippingKRW: 3000,
    platformFeeRate: 0.03,
    variants: [
      { label: '단품', priceKRW: 20900, quantity: 1 },
      { label: '2개 세트', priceKRW: 29900, quantity: 2 },
    ],
  },
  {
    id: 'eyemask',
    name: '3D 안대',
    costCNY: 0,   // 입력 필요
    cnyRate: 224,
    extraCostKRW: 2000,
    shippingKRW: 3000,
    platformFeeRate: 0.03,
    variants: [
      { label: '단품', priceKRW: 0, quantity: 1 }, // 입력 필요
    ],
  },
]
