import {
  BatchClaimsRequestSchema,
  evaluateAll,
  ExportClaimsRequestSchema,
} from '@preclaim/core'
import { json, jsonDownload, jsonError, readJson } from '../http'

export async function analyzeBatch(request: Request): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return jsonError('Invalid JSON body')

  const parsed = BatchClaimsRequestSchema.safeParse(body.value)
  if (!parsed.success) return jsonError('Invalid batch payload', 400, parsed.error.issues)

  const claims = evaluateAll(parsed.data.claims)
  return json({ claims, count: claims.length })
}

export async function exportClaims(request: Request): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return jsonError('Invalid JSON body')

  const parsed = ExportClaimsRequestSchema.safeParse(body.value)
  if (!parsed.success) return jsonError('Invalid export payload', 400, parsed.error.issues)

  return jsonDownload({ exportedAt: new Date().toISOString(), claims: parsed.data.claims }, 'preclaim-claims.json')
}
