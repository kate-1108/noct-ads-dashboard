import type { NextApiRequest, NextApiResponse } from 'next'
import { ChangeLog } from '../../lib/types'
import fs from 'fs'
import path from 'path'

// Vercel에서는 /tmp 폴더에 임시 저장 (세션 내 유지)
// 영구 저장이 필요하면 Vercel KV 연동 필요
const STORE_PATH = '/tmp/changelog.json'

function readLogs(): ChangeLog[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'))
    }
  } catch {}
  return []
}

function writeLogs(logs: ChangeLog[]) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(logs))
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')

  if (req.method === 'GET') {
    const logs = readLogs()
    const { campaignId } = req.query
    const filtered = campaignId
      ? logs.filter(l => l.campaignId === campaignId)
      : logs
    return res.json(filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  if (req.method === 'POST') {
    const logs = readLogs()
    const body = req.body as Omit<ChangeLog, 'id' | 'createdAt'>
    const newLog: ChangeLog = {
      ...body,
      id: `log_${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    logs.push(newLog)
    writeLogs(logs)
    return res.status(201).json(newLog)
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    const logs = readLogs().filter(l => l.id !== id)
    writeLogs(logs)
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
