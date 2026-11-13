const endpointPattern = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/;
const remoteStatus = {
  invalid_record: 400,
  id_conflict: 409,
  not_authorized: 503,
  not_configured: 503,
  busy: 503
};

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export default async function scores(request) {
  const { SCORE_SCRIPT_URL: endpoint, SCORE_SYNC_TOKEN: token } = process.env;
  if (!endpointPattern.test(endpoint || '') || !token) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  let action;
  let record;
  if (request.method === 'GET') {
    action = 'list';
  } else if (request.method === 'POST') {
    action = 'save';
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
      return json({ ok: false, error: 'invalid_record' }, 415);
    }
    const body = await request.text();
    if (body.length > 1024) return json({ ok: false, error: 'invalid_record' }, 400);
    try {
      const { id, nickname, score, mode } = JSON.parse(body);
      record = { id, nickname, score, mode };
    } catch {
      return json({ ok: false, error: 'invalid_record' }, 400);
    }
  } else {
    return new Response(null, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action, record }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) return json({ ok: false, error: 'upstream_unavailable' }, 502);

    const result = await response.json();
    if (result?.ok === true && Array.isArray(result.records)) {
      return json({ ok: true, records: result.records });
    }
    if (Object.hasOwn(remoteStatus, result?.error)) {
      return json({ ok: false, error: result.error }, remoteStatus[result.error]);
    }
    return json({ ok: false, error: 'upstream_unavailable' }, 502);
  } catch {
    return json({ ok: false, error: 'upstream_unavailable' }, 502);
  }
}
