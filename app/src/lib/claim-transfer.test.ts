import { describe, expect, test } from 'bun:test'
import { seed } from '@preclaim/core'
import { createClaimExport, parseClaimImport } from './claim-transfer'

describe('claim transfer', () => {
  test('round-trips exported claims through the validated import contract', () => {
    const exported = JSON.parse(createClaimExport(seed))
    expect(parseClaimImport(exported)).toEqual(seed)
  })

  test('rejects invalid claim payloads', () => {
    expect(() => parseClaimImport({ claims: [{ id: 'not-a-claim' }] })).toThrow()
  })
})
