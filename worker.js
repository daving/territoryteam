export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') return new Response('', { headers: cors });

    const route = url.pathname.replace(/^\/api/, '');
    const target = toAirtableUrl(route, env.AIRTABLE_BASE_ID);
    if (!target) return json({ error: 'Not found' }, 404, cors);

    const init = { method: request.method, headers: { Authorization: `Bearer ${env.AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' } };
    if (request.method !== 'GET') init.body = await request.text();

    const resp = await fetch(target, init);
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
};

function toAirtableUrl(route, baseId) {
  if (route === '/users') return `https://api.airtable.com/v0/${baseId}/users`;
  if (route === '/tasks') return `https://api.airtable.com/v0/${baseId}/tasks`;
  if (route === '/tasktypes') return `https://api.airtable.com/v0/${baseId}/tasktypes`;
  if (route.startsWith('/tasks/')) return `https://api.airtable.com/v0/${baseId}/tasks/${route.split('/')[2]}`;
  return null;
}

function json(payload, status, headers) {
  return new Response(JSON.stringify(payload), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
}

export { toAirtableUrl };