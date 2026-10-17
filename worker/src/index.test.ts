import { describe, expect, test } from 'bun:test'
import worker from './index'
import { seed, AnalyzeResponseSchema } from '@preclaim/core'

const env = { ENVIRONMENT: 'test' }

describe('POST /api/v1/claims/analyze contract', () => {
  test('returns schema-valid analysis for a synthetic claim', async () => {
    const request = new Request('http://localhost/api/v1/claims/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claim: seed[0], claims: seed }),
    })
    const response = await worker.fetch(request, env)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(AnalyzeResponseSchema.safeParse(body).success).toBe(true)
    expect(body.claimId).toBe(seed[0].id)
    for (const finding of body.findings) {
      expect(finding.reason).toBeTruthy()
      expect(finding.source).toBeTruthy()
      expect(finding.evidence.length).toBeGreaterThan(0)
    }
  })

  test('rejects an invalid payload with a 400 contract response', async () => {
    const response = await worker.fetch(new Request('http://localhost/api/v1/claims/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ claim: { id: 'missing fields' } }),
    }), env)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Invalid analyze request' })
  })

  test('rejects malformed JSON', async () => {
    const response = await worker.fetch(new Request('http://localhost/api/v1/claims/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }), env)
    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: 'Invalid JSON body' })
  })

  test('analyzes a bounded batch and exports validated JSON', async () => {
    const response = await worker.fetch(new Request('http://localhost/api/v1/claims/batch', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claims: seed }),
    }), env)
    expect(response.status).toBe(200)
    expect((await response.json()).count).toBe(seed.length)

    const exported = await worker.fetch(new Request('http://localhost/api/v1/claims/export', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claims: seed }),
    }), env)
    expect(exported.status).toBe(200)
    expect(exported.headers.get('content-disposition')).toContain('preclaim-claims.json')
    expect((await exported.json()).claims).toHaveLength(seed.length)
  })
})
