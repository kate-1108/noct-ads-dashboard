import type { NextApiRequest, NextApiResponse } from 'next'
import { detectAndRecordChanges } from '../../lib/detector'

// 수동으로 즉시 변경 감지 실행
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  try {
    const changes = await detectAndRecordChanges()
    res.json({ ok: true, detected: changes.length, changes })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
