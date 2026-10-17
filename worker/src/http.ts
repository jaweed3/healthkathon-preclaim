const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json; charset=utf-8' },
  })
}

export function jsonError(error: string, status = 400, issues?: unknown): Response {
  return json({ error, ...(issues ? { issues } : {}) }, status)
}

export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() }
  } catch {
    return { ok: false }
  }
}

export function jsonDownload(data: unknown, filename: string): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...CORS_HEADERS,
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}
