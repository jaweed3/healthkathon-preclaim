import {
  CLAIM_STATUS,
  ClaimsResponseSchema,
  HealthResponseSchema,
  statusFor,
  type Claim,
} from '@preclaim/core'

export interface Env {
  ENVIRONMENT: string
}

type ApiClaim = Pick<Claim, 'id' | 'score'> & { status: string }

/**
 * Status is NOT derived for every row: `Disetujui` records a human decision,
 * which no score can imply. Only the pre-review rows follow the score rule.
 */
const CLAIMS: ApiClaim[] = [
  { id: 'CLM-240918-021', score: 78 },
  { id: 'CLM-240918-020', score: 18 },
].map((c) => ({ ...c, status: statusFor(c.score) }))

CLAIMS.push({ id: 'CLM-240918-019', score: 8, status: CLAIM_STATUS.approved })

/**
 * Validated once at module load rather than on every request.
 *
 * The schema is the same one the app would use to parse this response, so a
 * payload that drifts out of contract fails here in CI instead of in a client.
 */
const claimsResponse = ClaimsResponseSchema.parse({
  source: 'synthetic-beta-data',
  claims: CLAIMS,
})

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
      return json(
        HealthResponseSchema.parse({
          ok: true,
          service: 'preclaim-guard-api',
          environment: env.ENVIRONMENT,
        }),
      )
    }

    if (url.pathname === '/api/claims' && request.method === 'GET') {
      return json(claimsResponse)
    }

    return json({ error: 'Not found' }, 404)
  },
}
