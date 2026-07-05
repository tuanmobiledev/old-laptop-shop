import http from 'node:http';
import { Pool } from 'pg';

const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'laprevive-db',
  port: Number(process.env.POSTGRES_PORT || 5432),
  database: process.env.POSTGRES_DB || 'laprevive',
  user: process.env.POSTGRES_USER || 'laprevive',
  password: process.env.POSTGRES_PASSWORD || 'change_this_strong_password',
});

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
};

const rateLimit = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 3;

const isRateLimited = (ip) => {
  const now = Date.now();
  const entry = rateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
};

const sendJson = (res, status, body) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 8192) {
      reject(new Error('Payload too large'));
      req.destroy();
    }
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ensureTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL DEFAULT 'footer',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

for (let attempt = 1; attempt <= 20; attempt += 1) {
  try {
    await ensureTable();
    break;
  } catch (error) {
    if (attempt === 20) throw error;
    console.warn(`Waiting for database (${attempt}/20)...`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST' || req.url !== '/api/newsletter') {
    sendJson(res, 404, { ok: false, error: 'not_found' });
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    sendJson(res, 429, { ok: false, error: 'too_many_requests' });
    return;
  }

  try {
    const payload = JSON.parse(await readBody(req) || '{}');
    const email = String(payload.email || '').trim().toLowerCase();
    if (!isEmail(email)) {
      sendJson(res, 400, { ok: false, error: 'invalid_email' });
      return;
    }

    await pool.query(
      `INSERT INTO newsletter_subscribers (email, source)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET source = EXCLUDED.source`,
      [email, 'footer']
    );
    sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('newsletter_submit_failed', error);
    sendJson(res, 500, { ok: false, error: 'server_error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Newsletter API listening on ${port}`);
});
