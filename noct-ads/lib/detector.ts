import { CampaignSnapshot, readSnapshot, writeSnapshot, fetchCampaignDetails } from './snapshot'
import { ChangeLog, ChangeCategory } from './types'
import fs from 'fs'

const CHANGELOG_PATH = '/tmp/changelog.json'

function readLogs(): ChangeLog[] {
  try {
    if (fs.existsSync(CHANGELOG_PATH)) {
      return JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'))
    }
  } catch {}
  return []
}

function appendLogs(newLogs: ChangeLog[]) {
  const existing = readLogs()
  fs.writeFileSync(CHANGELOG_PATH, JSON.stringify([...existing, ...newLogs]))
}

function makeLog(
  campaign: CampaignSnapshot,
  category: ChangeCategory,
  title: string,
  detail: string,
): ChangeLog {
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: `auto_${campaign.id}_${Date.now()}`,
    campaignId: campaign.id,
    campaignName: campaign.name,
    date: today,
    category,
    title,
    detail,
    createdAt: new Date().toISOString(),
  }
}

export async function detectAndRecordChanges(): Promise<ChangeLog[]> {
  const token = process.env.META_ACCESS_TOKEN
  const account = process.env.META_AD_ACCOUNT_ID
  if (!token || !account) return []

  const current = await fetchCampaignDetails(token, account)
  const prev = readSnapshot()
  const detected: ChangeLog[] = []
  const today = new Date().toISOString().slice(0, 10)

  for (const c of current) {
    const old = prev.get(c.id)

    if (!old) {
      // 새 캠페인 감지
      detected.push(makeLog(c, 'status',
        `새 캠페인 감지: ${c.name.slice(0, 40)}`,
        `상태: ${c.status}${c.dailyBudget > 0 ? ` / 일일 예산: ₩${(c.dailyBudget / 100).toLocaleString()}` : ''}`,
      ))
      continue
    }

    // 상태 변경 감지
    if (old.status !== c.status) {
      const statusLabel: Record<string, string> = {
        ACTIVE: '집행 중',
        PAUSED: '일시 중단',
        DELETED: '삭제',
        ARCHIVED: '보관',
        ACTIVE_LEARNING: '학습 중',
        LEARNING_LIMITED: '학습 제한',
      }
      detected.push(makeLog(c, 'status',
        `상태 변경: ${statusLabel[old.status] || old.status} → ${statusLabel[c.status] || c.status}`,
        `자동 감지 — ${old.status} → ${c.status}`,
      ))
    }

    // 일일 예산 변경 감지 (100원 이상 차이)
    if (Math.abs(old.dailyBudget - c.dailyBudget) > 100 && (old.dailyBudget > 0 || c.dailyBudget > 0)) {
      const oldAmt = old.dailyBudget > 0 ? `₩${(old.dailyBudget / 100).toLocaleString()}` : '없음'
      const newAmt = c.dailyBudget > 0 ? `₩${(c.dailyBudget / 100).toLocaleString()}` : '없음'
      const direction = c.dailyBudget > old.dailyBudget ? '증액' : '감액'
      detected.push(makeLog(c, 'budget',
        `예산 ${direction}: ${oldAmt} → ${newAmt}`,
        `자동 감지 — 일일 예산 변경`,
      ))
    }
  }

  // 삭제된 캠페인 감지
  const currentIds = new Set(current.map(c => c.id))
  for (const [id, old] of prev) {
    if (!currentIds.has(id)) {
      detected.push({
        id: `auto_del_${id}_${Date.now()}`,
        campaignId: id,
        campaignName: old.name,
        date: today,
        category: 'status',
        title: `캠페인 삭제/보관: ${old.name.slice(0, 40)}`,
        detail: `자동 감지 — 캠페인이 더 이상 조회되지 않습니다`,
        createdAt: new Date().toISOString(),
      })
    }
  }

  // 스냅샷 업데이트
  const newSnapshot = new Map<string, CampaignSnapshot>()
  for (const c of current) newSnapshot.set(c.id, c)
  writeSnapshot(newSnapshot)

  // 변경사항 저장
  if (detected.length > 0) {
    appendLogs(detected)
  }

  return detected
}
