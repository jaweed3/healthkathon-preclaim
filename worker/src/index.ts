export interface Env {
  ENVIRONMENT: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'content-type',
    },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return json(null, 204);
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'preclaim-guard-api', environment: env.ENVIRONMENT });
    }

    if (url.pathname === '/api/claims' && request.method === 'GET') {
      return json({
        source: 'synthetic-beta-data',
        claims: [
          { id: 'CLM-240918-021', status: 'review', score: 78 },
          { id: 'CLM-240918-020', status: 'ready', score: 18 },
          { id: 'CLM-240918-019', status: 'approved', score: 8 },
        ],
      });
    }

    return json({ error: 'Not found' }, 404);
  },
};
