import { ClaimStoreSchema, type Claim } from '@preclaim/core'

export function parseClaimImport(input: unknown): Claim[] {
  return ClaimStoreSchema.parse(input).claims
}

export function createClaimExport(claims: Claim[]): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), claims }, null, 2)
}

export function downloadClaimExport(claims: Claim[]): void {
  const blob = new Blob([createClaimExport(claims)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'preclaim-claims.json'
  anchor.click()
  URL.revokeObjectURL(url)
}
