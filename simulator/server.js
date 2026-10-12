import http from 'node:http';

const bots = new Map([
  ['bot-01', { id: 'bot-01', name: 'Kaotam BOT', deviceName: 'LAPTOP-8CV23L', status: 'offline', cpuPercent: 0, memoryPercent: 0, uptimeSeconds: 0 }],
  ['bot-02', { id: 'bot-02', name: 'Kaotam Bot 02', deviceName: 'DESKTOP-94BC71', status: 'online', cpuPercent: 12.5, memoryPercent: 38.4, uptimeSeconds: 86400 }],
  ['bot-03', { id: 'bot-03', name: 'Kaotam Bot 03', deviceName: 'DESKTOP-5DDE42', status: 'online', cpuPercent: 18.2, memoryPercent: 42.1, uptimeSeconds: 54000 }],
  ['bot-04', { id: 'bot-04', name: 'Kaotam Bot 04', deviceName: 'DESKTOP-DE8E90', status: 'online', cpuPercent: 9.8, memoryPercent: 31.0, uptimeSeconds: 12000 }],
  ['bot-05', { id: 'bot-05', name: 'Kaotam Bot 05', deviceName: 'DESKTOP-1A2B3C', status: 'online', cpuPercent: 14.1, memoryPercent: 35.7, uptimeSeconds: 24000 }]
]);

function send(res, code, data) {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true });
  if (req.method === 'GET' && url.pathname === '/bots') return send(res, 200, [...bots.values()]);
  const match = url.pathname.match(/^\/bots\/([^/]+)\/commands$/);
  if (req.method === 'POST' && match) {
    const bot = bots.get(match[1]);
    if (!bot) return send(res, 404, { error: 'bot_not_found' });
    let body = '';
    for await (const chunk of req) body += chunk;
    let payload;
    try { payload = JSON.parse(body || '{}'); } catch { return send(res, 400, { error: 'invalid_json' }); }
    if (!['start', 'stop', 'restart', 'status'].includes(payload.command)) return send(res, 400, { error: 'invalid_command' });
    if (payload.command === 'start' || payload.command === 'restart') bot.status = 'online';
    if (payload.command === 'stop') { bot.status = 'offline'; bot.cpuPercent = 0; bot.memoryPercent = 0; }
    return send(res, 200, { ok: true, bot, command: payload.command });
  }
  send(res, 404, { error: 'not_found' });
});

server.listen(process.env.PORT || 8788, '0.0.0.0', () => console.log('Bot Simulator listening on http://localhost:8788'));
