import { CLAIM_STATUS, statusFor, type Claim } from '@preclaim/core'

export interface Env {
  ENVIRONMENT: string
}

type ApiClaim = Pick<Claim, 'id' | 'score'> & { status: string }

/**
 * Status is NOT derived for every row: `Disetujui` records a human decision,
 * which no score can imply. Only the pre-review rows follow the score rule.
 */
const claims: ApiClaim[] = [
  { id: 'CLM-240918-021', score: 78 },
  { id: 'CLM-240918-020', score: 18 },
].map((c) => ({ ...c, status: statusFor(c.score) }))

claims.push({ id: 'CLM-240918-019', score: 8, status: CLAIM_STATUS.approved })

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json(null, 204)

    const url = new URL(request.url)

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'preclaim-guard-api', environment: env.ENVIRONMENT })
    }

    if (url.pathname === '/api/claims' && request.method === 'GET') {
      return json({ source: 'synthetic-beta-data', claims })
    }

    return json({ error: 'Not found' }, 404)
  },
}
