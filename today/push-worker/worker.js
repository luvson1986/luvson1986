/* 오늘 — 알림 서버 (Cloudflare Workers 무료 플랜)
   앱이 꺼져 있어도 일정 알림을 아이폰으로 보내요.

   필요한 것
   - KV 네임스페이스 하나를 STORE 라는 이름으로 연결
   - 크론 트리거 "* * * * *" (1분마다)

   흐름
   GET  /vapid  → 푸시용 공개키 (처음 부르면 서버가 직접 만들어 저장해요)
   POST /sync   → 앱이 이 기기의 구독 정보와 앞으로 울릴 알림 목록을 보내요
   매 분        → 시각이 된 알림을 Web Push로 보내요 */

const ALLOWED_ORIGIN = '*';
const SUBJECT = 'https://luvson1986.github.io/luvson1986/today/';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }));
    try {
      if (url.pathname === '/vapid' && req.method === 'GET') {
        const keys = await vapidKeys(env);
        return cors(json({ publicKey: keys.publicKey }));
      }
      if (url.pathname === '/sync' && req.method === 'POST') {
        const body = await req.json();
        if (!body || typeof body.token !== 'string' || body.token.length < 16) return cors(json({ error: 'token' }, 400));
        const state = await load(env);
        if (!body.sub) {
          delete state.devices[body.token];
        } else {
          const prev = state.devices[body.token] || {};
          const sent = prev.sent || {};
          const reminders = (body.reminders || []).slice(0, 300).map(r => ({
            id: String(r.id).slice(0, 120), at: +r.at, title: String(r.title || '').slice(0, 120), body: String(r.body || '').slice(0, 200)
          })).filter(r => r.at > Date.now() - 10 * 60000);
          state.devices[body.token] = { sub: body.sub, reminders, sent, seen: Date.now() };
        }
        await save(env, state);
        return cors(json({ ok: true, count: state.devices[body.token] ? state.devices[body.token].reminders.length : 0 }));
      }
      if (url.pathname === '/test' && req.method === 'POST') {
        const body = await req.json();
        const state = await load(env);
        const dev = state.devices[body.token];
        if (!dev) return cors(json({ error: 'not registered' }, 404));
        const res = await sendPush(env, dev.sub, { title: '알림 연결 완료', body: '앱이 꺼져 있어도 일정 알림이 와요.', tag: 'test' });
        return cors(json({ ok: res.ok, status: res.status }));
      }
      return cors(new Response('오늘 알림 서버', { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
    } catch (e) {
      return cors(json({ error: String(e && e.message || e) }, 500));
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(tick(env));
  }
};

async function tick(env) {
  const state = await load(env);
  const now = Date.now();
  let changed = false;
  for (const [token, dev] of Object.entries(state.devices)) {
    dev.sent = dev.sent || {};
    for (const r of dev.reminders) {
      if (dev.sent[r.id]) continue;
      // 시각이 됐고(30초 여유), 10분 넘게 지난 건 버려요
      if (r.at <= now + 30000 && r.at > now - 10 * 60000) {
        const res = await sendPush(env, dev.sub, { title: r.title, body: r.body, tag: r.id });
        dev.sent[r.id] = now;
        changed = true;
        if (res.status === 404 || res.status === 410) { delete state.devices[token]; break; }
      }
    }
    if (!state.devices[token]) continue;
    // 지난 알림 정리
    const before = dev.reminders.length;
    dev.reminders = dev.reminders.filter(r => r.at > now - 15 * 60000);
    for (const id of Object.keys(dev.sent)) if (dev.sent[id] < now - 2 * 864e5) delete dev.sent[id];
    if (dev.reminders.length !== before) changed = true;
  }
  if (changed) await save(env, state);
}

async function load(env) {
  const s = await env.STORE.get('state', 'json');
  return s && s.devices ? s : { devices: {} };
}
async function save(env, state) { await env.STORE.put('state', JSON.stringify(state)); }

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
}
function cors(res) {
  const h = new Headers(res.headers);
  h.set('access-control-allow-origin', ALLOWED_ORIGIN);
  h.set('access-control-allow-methods', 'GET, POST, OPTIONS');
  h.set('access-control-allow-headers', 'content-type');
  return new Response(res.body, { status: res.status, headers: h });
}

/* ---------- VAPID 키 ---------- */
async function vapidKeys(env) {
  let keys = await env.STORE.get('vapid', 'json');
  if (keys) return keys;
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  keys = { privateJwk: jwk, publicKey: b64u(raw) };
  await env.STORE.put('vapid', JSON.stringify(keys));
  return keys;
}

async function vapidAuth(env, endpoint) {
  const keys = await vapidKeys(env);
  const aud = new URL(endpoint).origin;
  const header = b64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(utf8(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const key = await crypto.subtle.importKey('jwk', keys.privateJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(header + '.' + claims)));
  return 'vapid t=' + header + '.' + claims + '.' + b64u(sig) + ', k=' + keys.publicKey;
}

/* ---------- Web Push (RFC 8291, aes128gcm) ---------- */
export async function encrypt(payload, p256dh, auth, salt, asPair) {
  const uaPublic = typeof p256dh === 'string' ? unb64u(p256dh) : p256dh;
  const authSecret = typeof auth === 'string' ? unb64u(auth) : auth;
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  asPair = asPair || await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asPair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPair.privateKey, 256));

  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, concat(utf8('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, concat(utf8('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, concat(utf8('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12);

  const plain = concat(typeof payload === 'string' ? utf8(payload) : payload, new Uint8Array([2]));
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, plain));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

async function sendPush(env, sub, data) {
  const body = await encrypt(JSON.stringify(data), sub.keys.p256dh, sub.keys.auth);
  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      authorization: await vapidAuth(env, sub.endpoint),
      'content-encoding': 'aes128gcm',
      'content-type': 'application/octet-stream',
      ttl: '600',
      urgency: 'high'
    },
    body
  });
}

/* ---------- 작은 도구 ---------- */
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
function concat(...parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function utf8(s) { return new TextEncoder().encode(s); }
function b64u(bytes) {
  let s = ''; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
  const bin = atob(s), out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
