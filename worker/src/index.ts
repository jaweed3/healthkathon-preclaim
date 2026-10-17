import {
  CLAIM_STATUS,
  ClaimsResponseSchema,
  HealthResponseSchema,
  statusFor,
  type Claim,
} from '@preclaim/core'
import { json, jsonError } from './http'
import { analyzeClaim } from './handlers/analyze'
import { analyzeBatch, exportClaims } from './handlers/batch'

export interface Env {
  ENVIRONMENT: string
}

type ApiClaim = Pick<Claim, 'id' | 'score'> & { status: string }

const claimsResponse = ClaimsResponseSchema.parse({
  source: 'synthetic-beta-data',
  claims: [
    { id: 'CLM-240918-021', score: 78 },
    { id: 'CLM-240918-020', score: 18 },
  ].map((claim) => ({ ...claim, status: statusFor(claim.score) } satisfies ApiClaim))
    .concat([{ id: 'CLM-240918-019', score: 8, status: CLAIM_STATUS.approved }]),
})

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json(null, 204)

    const { pathname } = new URL(request.url)
    if (pathname === '/health' && request.method === 'GET') {
      return json(HealthResponseSchema.parse({
        ok: true,
        service: 'preclaim-guard-api',
        environment: env.ENVIRONMENT,
      }))
    }
    if (pathname === '/api/claims' && request.method === 'GET') return json(claimsResponse)
    if (pathname === '/api/v1/claims/analyze' && request.method === 'POST') return analyzeClaim(request)
    if (pathname === '/api/v1/claims/batch' && request.method === 'POST') return analyzeBatch(request)
    if (pathname === '/api/v1/claims/export' && request.method === 'POST') return exportClaims(request)

    return jsonError('Not found', 404)
  },
}
