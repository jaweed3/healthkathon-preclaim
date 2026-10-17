import {
  AnalyzeRequestSchema,
  AnalyzeResponseSchema,
  evaluateAll,
} from '@preclaim/core'
import { json, jsonError, readJson } from '../http'

export async function analyzeClaim(request: Request): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return jsonError('Invalid JSON body')

  const parsed = AnalyzeRequestSchema.safeParse(body.value)
  if (!parsed.success) return jsonError('Invalid analyze request', 400, parsed.error.issues)

  const otherClaims = parsed.data.claims.filter((claim) => claim.id !== parsed.data.claim.id)
  const [analyzed] = evaluateAll([parsed.data.claim, ...otherClaims])
  const response = AnalyzeResponseSchema.parse({
    claimId: analyzed.id,
    riskScore: analyzed.score,
    readiness: analyzed.readiness,
    status: analyzed.status,
    findings: analyzed.flags,
  })
  return json(response)
}
