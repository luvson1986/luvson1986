/* 오늘 — 알림 서버 (Cloudflare Workers 무료 플랜)
   앱이 꺼져 있어도 일정 알림을 아이폰으로 보내요.

   필요한 것
   - KV 네임스페이스 하나를 STORE 라는 이름으로 연결
   - 크론 트리거 "* * * * *" (1분마다)

   흐름
   GET  /vapid  → 푸시용 공개키 (처음 부르면 서버가 직접 만들어 저장해요)
   POST /sync   → 앱이 이 기기의 구독 정보와 앞으로 울릴 알림 목록을 보내요
   매 분        → 시각이 된 알림을 Web Push로 보내요
   GET  /kma?lat=&lon=  → 가장 가까운 기상청 AWS 관측소의 지금 강수 여부 (KMA_KEY 비밀값 필요)
   GET  /kma/raw?what=aws|stn&stn=  → 기상청 응답 원문 일부 (형식 확인용) */

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
      if (url.pathname === '/kma' && req.method === 'GET') {
        return cors(json(await kmaNow(env, +url.searchParams.get('lat'), +url.searchParams.get('lon'))));
      }
      if (url.pathname === '/kma/raw' && req.method === 'GET') {
        if (!env.KMA_KEY) return cors(json({ error: 'KMA_KEY 비밀값이 없어요' }, 400));
        const what = url.searchParams.get('what') === 'stn' ? kmaStnUrl(env) : kmaAwsUrl(env, url.searchParams.get('stn') || '0');
        const t = await kmaText(what);
        return cors(new Response(t.slice(0, 6000), { headers: { 'content-type': 'text/plain; charset=utf-8' } }));
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

/* ---------- 기상청 API허브: AWS 매분 관측 ---------- */
// 응답은 '#'으로 시작하는 설명 줄과 공백으로 나뉜 값 줄로 와요.
// 칸 순서를 가정하지 않고, 설명 줄에 적힌 칸 이름(STN, RE, RN-15m …)으로 찾아요.
const KMA = 'https://apihub.kma.go.kr/api/typ01';
function kst(minAgo) {
  const d = new Date(Date.now() + 9 * 3600e3 - (minAgo || 0) * 60e3);
  const p = n => String(n).padStart(2, '0');
  return d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + p(d.getUTCHours()) + p(d.getUTCMinutes());
}
function kmaAwsUrl(env, stn) { return KMA + '/cgi-bin/url/nph-aws2_min?tm2=' + kst(1) + '&stn=' + stn + '&disp=0&help=1&authKey=' + encodeURIComponent(env.KMA_KEY); }
function kmaStnUrl(env) { return KMA + '/url/stn_inf.php?inf=AWS&stn=&tm=' + kst(0) + '&help=1&authKey=' + encodeURIComponent(env.KMA_KEY); }
async function kmaText(u) {
  const r = await fetch(u);
  const buf = await r.arrayBuffer();
  let t = new TextDecoder('utf-8').decode(buf);
  if (t.includes('�')) { try { t = new TextDecoder('euc-kr').decode(buf); } catch (e) { /* 그대로 */ } }
  if (!r.ok) throw new Error('기상청 응답 ' + r.status + ': ' + t.slice(0, 200));
  return t;
}
// 설명 줄 중 칸 이름이 가장 많이 늘어선 줄을 머리글로 써요
function kmaParse(text, must) {
  const lines = text.split(/\r?\n/);
  let head = null;
  for (const l of lines) {
    if (!l.startsWith('#')) continue;
    const toks = l.replace(/^#+/, '').trim().split(/\s+/);
    if (toks.some(t => must.test(t)) && (!head || toks.length > head.length)) head = toks;
  }
  const rows = lines.filter(l => l.trim() && !l.startsWith('#')).map(l => l.trim().split(/[\s,]+/));
  return { head, rows };
}
const col = (head, re) => head ? head.findIndex(h => re.test(h)) : -1;
const num = v => { const n = parseFloat(v); return isFinite(n) && n > -90 ? n : null; };

async function kmaStations(env) {
  const cached = await env.STORE.get('kma-stn', 'json');
  if (cached && cached.at > Date.now() - 7 * 864e5 && cached.list.length) return cached.list;
  const { head, rows } = kmaParse(await kmaText(kmaStnUrl(env)), /^STN/i);
  const iS = Math.max(0, col(head, /^STN(_ID)?$/i)), iLon = col(head, /^LON/i), iLat = col(head, /^LAT/i), iName = col(head, /^STN_(KO|NM)|^NAME/i);
  const list = rows.map(r => ({ id: r[iS], lon: num(r[iLon]), lat: num(r[iLat]), name: iName >= 0 ? r[iName] : '' }))
    .filter(s => s.id && s.lat && s.lon && s.lat > 30 && s.lat < 40 && s.lon > 120 && s.lon < 135);
  if (!list.length) throw new Error('관측소 목록을 읽지 못했어요 (머리글: ' + (head || []).join(' ') + ')');
  await env.STORE.put('kma-stn', JSON.stringify({ at: Date.now(), list }));
  return list;
}
function km(a, b, c, d) {
  const R = 6371, r = Math.PI / 180, x = (d - b) * r * Math.cos((a + c) / 2 * r), y = (c - a) * r;
  return Math.sqrt(x * x + y * y) * R;
}
async function kmaNow(env, lat, lon) {
  if (!env.KMA_KEY) return { ok: false, error: 'KMA_KEY 비밀값이 없어요' };
  if (!isFinite(lat) || !isFinite(lon)) return { ok: false, error: 'lat/lon' };
  const key = 'kma-now:' + lat.toFixed(2) + ',' + lon.toFixed(2);
  const hit = await env.STORE.get(key, 'json');
  if (hit && hit.at > Date.now() - 3 * 60e3) return hit.v;
  let v;
  try {
    const near = (await kmaStations(env)).map(s => Object.assign({ km: km(lat, lon, s.lat, s.lon) }, s))
      .sort((a, b) => a.km - b.km).slice(0, 3).filter(s => s.km < 15);
    if (!near.length) return { ok: false, error: '15km 안에 관측소가 없어요' };
    const obs = [];
    for (const s of near) {
      const { head, rows } = kmaParse(await kmaText(kmaAwsUrl(env, s.id)), /^RN/i);
      const last = rows.filter(r => r.length > 3).pop();
      if (!head || !last) continue;
      const g = re => { const i = col(head, re); return i >= 0 ? num(last[i]) : null; };
      obs.push({ stn: s.id, name: s.name, km: Math.round(s.km * 10) / 10, time: last[col(head, /^YYMM|^TM/i)] || last[0],
        re: g(/^RE$/i), rn15: g(/^RN-?15/i), rn60: g(/^RN-?60/i), rnDay: g(/^RN-?DAY/i), cols: head.join(' ') });
    }
    if (!obs.length) return { ok: false, error: '관측값을 읽지 못했어요' };
    // 가장 가까운 관측소 기준. 강수감지(RE)는 1(감지)·0(없음)으로 오고, 없으면 15분 강수량으로 판단
    const o = obs[0];
    const rain = o.re != null ? o.re > 0 : o.rn15 != null ? o.rn15 > 0 : null;
    v = { ok: true, rain, re: o.re, rn15: o.rn15, rn60: o.rn60, rnDay: o.rnDay, stn: o.stn, name: o.name, km: o.km, time: o.time,
      nearby: obs.slice(1).map(x => ({ name: x.name, km: x.km, re: x.re, rn15: x.rn15 })), cols: o.cols };
  } catch (e) {
    return { ok: false, error: String(e && e.message || e) };
  }
  await env.STORE.put(key, JSON.stringify({ at: Date.now(), v }), { expirationTtl: 3600 });
  return v;
}
