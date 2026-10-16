(function () {
  'use strict';

  /* ---------- 공통 ---------- */
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('pa:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('pa:' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  };
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var ymd = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2200);
  }

  function fetchWithTimeout(url, ms) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms || 8000);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {}).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r;
    }, function (e) { clearTimeout(timer); throw e; });
  }
  var getJSON = function (url, ms) { return fetchWithTimeout(url, ms).then(function (r) { return r.json(); }); };

  var DEFAULT_SETTINGS = {
    name: '',
    interests: ['UX 디자인', '핀테크', '디지털 금융', 'AI 서비스'],
    location: { mode: 'auto', name: '서울', lat: 37.5665, lon: 126.978 }
  };
  var settings = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));

  /* ---------- 인사 ---------- */
  function renderGreeting() {
    var now = new Date();
    var h = now.getHours();
    var part = h < 5 ? '늦은 밤이에요' : h < 11 ? '좋은 아침이에요' : h < 14 ? '점심 맛있게 드세요' : h < 18 ? '오후도 힘내세요' : h < 22 ? '오늘 하루 수고했어요' : '편안한 밤 보내세요';
    $('greeting').textContent = settings.name ? settings.name + '님, ' + part : part;
    $('today-label').textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + DAYS[now.getDay()] + '요일';
  }

  /* ---------- 계절 ---------- */
  // 직접 추가한 시즌의 배경 색 (위, 아래, 강조)
  var SCENE_COLORS = {
    petals: ['#c76b8f', '#ffe3ec', '#ffffff'], leaves: ['#7a2a14', '#f0a040', '#ffe2b0'], snow: ['#5b7593', '#c9d6e3', '#ffffff'],
    sea: ['#0a5a8a', '#6fd3e8', '#e8fbff'], sun: ['#c98a1a', '#ffe08a', '#fff6d0'], lights: ['#14243a', '#3a5a7a', '#ffe08a'],
    grass: ['#6a5a3a', '#e8d8a8', '#fff8e0'], rain: ['#3b4f8a', '#a8b8f0', '#e0e6ff'], fireflies: ['#0d1f1a', '#264a3a', '#e6ff8a']
  };
  var customSeasons = store.get('customSeasons', []);
  var hiddenSeasons = store.get('hiddenSeasons', []);
  var currentSeason = null;
  var allSeasons = function () { return window.SEASONS.concat(customSeasons); };
  var visibleSeasons = function () { return allSeasons().filter(function (s) { return hiddenSeasons.indexOf(s.id) < 0; }); };
  var findSeason = function (id) { return allSeasons().find(function (s) { return s.id === id; }); };
  var dots = function (w) { return '●●●'.slice(0, w); };
  var fmtMd = function (md) { var p = md.split('-'); return +p[0] + '.' + +p[1]; };
  function phaseText(ph) {
    if (!ph) return '제철 아님';
    return ph.phase === 'rising' && ph.days > 0 ? '절정까지 ' + ph.days + '일' : ph.label;
  }
  function mdDoy(md) { var p = md.split('-'); return Math.round((Date.UTC(2001, +p[0] - 1, +p[1]) - Date.UTC(2001, 0, 1)) / 864e5); }
  function doyMd(n) { var d = new Date(Date.UTC(2001, 0, 1) + (((n % 365) + 365) % 365) * 864e5); return pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function daysUntil(md) {
    var n = new Date(), t = Math.round((Date.UTC(2001, n.getMonth(), n.getDate()) - Date.UTC(2001, 0, 1)) / 864e5);
    return (mdDoy(md) - t + 365) % 365;
  }

  function showSeason(s, ph) {
    currentSeason = s;
    var root = document.documentElement;
    root.style.setProperty('--hero-a', s.scene.colors[0]);
    root.style.setProperty('--hero-b', s.scene.colors[1]);
    root.style.setProperty('--season', s.scene.accent);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.scene.colors[0]);
    $('season-name').textContent = s.name;
    $('season-phase').textContent = phaseText(ph);
    $('season-phase').dataset.phase = ph ? ph.phase : 'off';
    $('season-kw').innerHTML = s.todo.slice(0, 3).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('');
    $('hero-motif').innerHTML = s.scene.motif.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
    scene.start(s.scene);
  }
  function initSeason() {
    var today = new Date();
    var ranked = window.rankSeasons(today, visibleSeasons());
    var pick = store.get('seasonPick', null), s = null, ph = null;
    if (pick && pick.date === ymd(today)) {
      s = findSeason(pick.id) || null;
      if (s && hiddenSeasons.indexOf(s.id) >= 0) s = null;
      if (s) ph = window.seasonPhase(s, today);
    }
    if (!s && ranked.length) { s = ranked[0].s; ph = ranked[0].p; }
    if (!s) s = visibleSeasons()[0] || window.SEASONS[0];
    showSeason(s, ph);
  }

  /* 시즌 목록 팝업: 보기 / 숨기기 / 직접 추가·삭제 */
  function sdRow(s, ph, until, hidden) {
    var sub = fmtMd(s.from) + '–' + fmtMd(s.to) + (until != null ? ' · ' + (until === 0 ? '오늘' : until + '일 후') + ' 시작' : '');
    var chip = ph ? '<span class="ph ' + ph.phase + '">' + esc(phaseText(ph)) + '</span>' : '';
    var act = hidden ? '<button type="button" class="ghost-btn sm" data-act="unhide">다시 보기</button>'
      : s.custom ? '<button type="button" class="ghost-btn sm danger" data-act="delete">삭제</button>'
      : '<button type="button" class="ghost-btn sm" data-act="hide">숨기기</button>';
    return '<li class="sd-row' + (currentSeason && currentSeason.id === s.id ? ' on' : '') + '" data-id="' + esc(s.id) + '">' +
      '<button type="button" class="sd-main" data-act="show"' + (hidden ? ' disabled' : '') + '>' +
      '<span class="sd-emoji" style="--a:' + s.scene.colors[0] + ';--b:' + s.scene.colors[1] + '" aria-hidden="true">' + esc(s.scene.motif[0] || '✨') + '</span>' +
      '<span class="sd-text"><b>' + esc(s.name) + (s.custom ? ' <span class="tl-tag">내가 추가</span>' : '') + '</b><span>' + sub + ' · <span class="w">' + dots(s.w) + '</span></span></span>' + chip +
      '</button>' + act + '</li>';
  }
  function renderSeasonDialog() {
    var today = new Date(), vis = visibleSeasons();
    var ranked = window.rankSeasons(today, vis);
    var active = ranked.map(function (x) { return x.s.id; });
    $('sd-now').innerHTML = ranked.length ? ranked.map(function (x) { return sdRow(x.s, x.p); }).join('') : '<li class="hint">지금 시기에 해당하는 시즌이 없어요.</li>';
    $('sd-later').innerHTML = vis.filter(function (s) { return active.indexOf(s.id) < 0; })
      .map(function (s) { return { s: s, d: daysUntil(s.from) }; })
      .sort(function (a, b) { return a.d - b.d; })
      .map(function (x) { return sdRow(x.s, null, x.d); }).join('');
    var hid = allSeasons().filter(function (s) { return hiddenSeasons.indexOf(s.id) >= 0; });
    $('sd-hidden-wrap').hidden = !hid.length;
    $('sd-hidden-count').textContent = hid.length;
    $('sd-hidden').innerHTML = hid.map(function (s) { return sdRow(s, null, null, true); }).join('');
  }
  function initSeasonDialog() {
    var dlg = $('season-dialog');
    $('hero').addEventListener('click', function (e) {
      if (e.target.closest('#open-settings')) return;
      renderSeasonDialog();
      $('sd-form').hidden = true;
      openDialog(dlg);
    });
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var id = b.closest('.sd-row').dataset.id, s = findSeason(id), act = b.dataset.act;
      if (act === 'show') {
        showSeason(s, window.seasonPhase(s, new Date()));
        store.set('seasonPick', { date: ymd(new Date()), id: id });
        closeDialog(dlg);
        return;
      }
      if (act === 'hide') { hiddenSeasons.push(id); toast(s.name + ' 시즌을 숨겼어요'); }
      if (act === 'unhide') { hiddenSeasons = hiddenSeasons.filter(function (x) { return x !== id; }); toast(s.name + ' 시즌을 다시 보여줘요'); }
      if (act === 'delete') {
        customSeasons = customSeasons.filter(function (x) { return x.id !== id; });
        hiddenSeasons = hiddenSeasons.filter(function (x) { return x !== id; });
        store.set('customSeasons', customSeasons);
        toast(s.name + ' 시즌을 삭제했어요');
      }
      store.set('hiddenSeasons', hiddenSeasons);
      if (currentSeason && (act === 'hide' || act === 'delete') && currentSeason.id === id) initSeason();
      renderSeasonDialog();
    });
    $('sd-add').onclick = function () {
      var f = $('sd-form');
      f.hidden = !f.hidden;
      if (!f.hidden) {
        f.reset();
        var t = new Date(), later = new Date(t.getTime() + 30 * 864e5);
        $('sf-from').value = ymd(t); $('sf-to').value = ymd(later);
        $('sf-error').hidden = true;
        $('sf-name').focus();
      }
    };
    $('sf-cancel').onclick = function () { $('sd-form').hidden = true; };
    $('sd-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('sf-name').value.trim(), from = $('sf-from').value, to = $('sf-to').value;
      var err = $('sf-error');
      if (!name || !from || !to) { err.textContent = '이름과 시작·끝 날짜를 입력해 주세요.'; err.hidden = false; return; }
      var f = from.slice(5), t = to.slice(5);
      var a = mdDoy(f), b = mdDoy(t); if (b < a) b += 365;
      var pf = $('sf-pfrom').value ? $('sf-pfrom').value.slice(5) : doyMd(a + Math.round((b - a) / 3));
      var pt = $('sf-pto').value ? $('sf-pto').value.slice(5) : doyMd(a + Math.round((b - a) * 2 / 3));
      var type = $('sf-scene').value, col = SCENE_COLORS[type];
      var kw = $('sf-kw').value.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      var s = {
        id: 'c' + Date.now().toString(36), custom: true, name: name, from: f, to: t, peak: [pf, pt], w: +$('sf-w').value,
        headline: name, desc: '', todo: kw.length ? kw : [name],
        scene: { type: type, colors: [col[0], col[1]], accent: col[2], motif: [$('sf-emoji').value.trim() || '✨'] }
      };
      customSeasons.push(s);
      store.set('customSeasons', customSeasons);
      $('sd-form').hidden = true;
      renderSeasonDialog();
      toast(name + ' 시즌을 추가했어요');
    });
  }

  /* ---------- 계절 배경 장면 (canvas) ---------- */
  var scene = (function () {
    var canvas = $('hero-canvas'), ctx = canvas.getContext('2d');
    var parts = [], type = 'petals', accent = '#fff', raf = 0, w = 0, h = 0, t0 = 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    var PALETTE = {
      petals: ['#ffd6e4', '#ffc2d6', '#fff0f5', '#f7a8c4'],
      leaves: ['#e0552a', '#f08a2a', '#c9341f', '#f5b83a', '#a8461a'],
      snow: ['#ffffff'],
      lights: ['#ffe08a', '#ffc46a', '#fff2c8', '#ff9a6a'],
      sun: ['#fff6d0', '#ffe08a'],
      fireflies: ['#e6ff8a', '#c8ff6a'],
      grass: ['#fff8e0', '#f0e0b0'],
      sea: ['#ffffff'],
      rain: ['#e0e8ff']
    };

    function resize() {
      var r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function make(initial) {
      var pal = PALETTE[type] || ['#fff'];
      var p = { x: rnd(0, w), y: initial ? rnd(0, h) : -20, c: pal[(Math.random() * pal.length) | 0], a: rnd(0, Math.PI * 2), va: rnd(-0.03, 0.03), ph: rnd(0, 6.28) };
      switch (type) {
        case 'petals': p.s = rnd(5, 10); p.vy = rnd(0.4, 1.1); p.vx = rnd(0.2, 0.8); break;
        case 'leaves': p.s = rnd(7, 13); p.vy = rnd(0.6, 1.4); p.vx = rnd(-0.3, 0.6); p.leaf = Math.random() < 0.6 ? '🍁' : '🍂'; break;
        case 'snow': p.s = rnd(1.5, 4); p.vy = rnd(0.3, 1.0); p.vx = rnd(-0.3, 0.3); break;
        case 'rain': p.s = rnd(10, 22); p.vy = rnd(6, 10); p.vx = -1.2; break;
        case 'sea': p.s = rnd(2, 6); p.y = initial ? rnd(0, h) : h + 10; p.vy = -rnd(0.3, 0.9); p.vx = 0; break;
        case 'lights': p.s = rnd(3, 14); p.y = rnd(0, h); p.vy = -rnd(0.05, 0.2); p.vx = 0; break;
        case 'fireflies': p.s = rnd(1.5, 3); p.y = rnd(h * 0.2, h); p.vy = rnd(-0.3, 0.3); p.vx = rnd(-0.3, 0.3); break;
        case 'sun': p.s = rnd(2, 5); p.y = rnd(0, h); p.vy = -rnd(0.1, 0.3); p.vx = rnd(-0.1, 0.1); break;
        case 'grass': p.x = rnd(-10, w + 10); p.y = h; p.s = rnd(h * 0.18, h * 0.42); p.vx = 0; p.vy = 0; break;
      }
      return p;
    }
    function count() {
      var base = Math.max(24, Math.min(90, Math.round(w * h / 9000)));
      return type === 'grass' ? Math.round(w / 7) : type === 'leaves' ? Math.round(base * 0.45) : type === 'rain' ? base * 1.4 : type === 'lights' ? base * 0.5 : base;
    }
    function drawLeaf(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = 0.92;
      ctx.font = Math.round(p.s * 2) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.leaf, 0, 0); ctx.restore();
    }
    function draw(time) {
      var tt = (time - t0) / 1000;
      ctx.clearRect(0, 0, w, h);
      if (type === 'sun' || type === 'lights') {
        var g = ctx.createRadialGradient(w * 0.82, h * 0.18, 0, w * 0.82, h * 0.18, Math.max(w, h) * 0.6);
        g.addColorStop(0, type === 'sun' ? 'rgba(255,240,180,0.55)' : 'rgba(255,210,140,0.25)');
        g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      if (type === 'sea') {
        for (var k = 0; k < 3; k++) {
          ctx.beginPath(); ctx.moveTo(0, h);
          for (var x = 0; x <= w; x += 12) ctx.lineTo(x, h * (0.78 + k * 0.07) + Math.sin(x / 70 + tt * (0.6 + k * 0.2) + k) * 8);
          ctx.lineTo(w, h); ctx.closePath();
          ctx.fillStyle = 'rgba(255,255,255,' + (0.07 + k * 0.03) + ')'; ctx.fill();
        }
      }
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        switch (type) {
          case 'petals':
            p.x += p.vx + Math.sin(tt + p.ph) * 0.4; p.y += p.vy; p.a += p.va;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
            break;
          case 'leaves':
            p.x += p.vx + Math.sin(tt * 0.8 + p.ph) * 0.8; p.y += p.vy; p.a += p.va * 1.5; drawLeaf(p);
            break;
          case 'snow':
            p.x += p.vx + Math.sin(tt + p.ph) * 0.3; p.y += p.vy;
            ctx.globalAlpha = 0.85; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill();
            break;
          case 'rain':
            p.x += p.vx; p.y += p.vy;
            ctx.globalAlpha = 0.35; ctx.strokeStyle = p.c; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * 2, p.y + p.s); ctx.stroke();
            break;
          case 'sea': case 'sun':
            p.x += p.vx + Math.sin(tt + p.ph) * 0.3; p.y += p.vy;
            ctx.globalAlpha = 0.45; ctx.strokeStyle = p.c; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); type === 'sea' ? ctx.stroke() : (ctx.fillStyle = p.c, ctx.fill());
            break;
          case 'lights': case 'fireflies':
            p.x += p.vx + (type === 'fireflies' ? Math.sin(tt * 0.7 + p.ph) * 0.4 : 0); p.y += p.vy;
            var tw = 0.35 + 0.65 * Math.abs(Math.sin(tt * (type === 'fireflies' ? 1.4 : 0.6) + p.ph));
            var rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3);
            rg.addColorStop(0, p.c); rg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = tw * (type === 'lights' ? 0.55 : 0.95); ctx.fillStyle = rg;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 3, 0, Math.PI * 2); ctx.fill();
            break;
          case 'grass':
            var sway = Math.sin(tt * 0.9 + p.x / 90) * 18;
            ctx.globalAlpha = 0.35; ctx.strokeStyle = p.c; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(p.x, h); ctx.quadraticCurveTo(p.x + sway * 0.3, h - p.s * 0.6, p.x + sway, h - p.s); ctx.stroke();
            ctx.globalAlpha = 0.5; ctx.fillStyle = p.c;
            ctx.beginPath(); ctx.ellipse(p.x + sway, h - p.s, 3, 12, sway / 60, 0, Math.PI * 2); ctx.fill();
            break;
        }
        if (p.y > h + 30 || p.y < -40 || p.x > w + 40 || p.x < -40) {
          if (type !== 'grass') parts[i] = make(false);
          if (type === 'lights' || type === 'fireflies' || type === 'sun') { parts[i].y = h + 10; if (type === 'fireflies') parts[i].y = rnd(h * 0.3, h); }
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop(time) { draw(time); raf = requestAnimationFrame(loop); }
    function start(cfg) {
      type = cfg.type; accent = cfg.accent;
      cancelAnimationFrame(raf);
      resize();
      parts = [];
      var n = count();
      for (var i = 0; i < n; i++) parts.push(make(true));
      t0 = performance.now();
      if (reduce) { draw(t0 + 1000); return; }
      raf = requestAnimationFrame(loop);
    }
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { start({ type: type, accent: accent }); }, 200);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (!reduce) raf = requestAnimationFrame(loop);
    });
    return { start: start };
  })();

  /* ---------- 날씨 ---------- */
  var WMO = {
    0: ['맑음', '☀️'], 1: ['대체로 맑음', '🌤️'], 2: ['구름 조금', '⛅'], 3: ['흐림', '☁️'],
    45: ['안개', '🌫️'], 48: ['짙은 안개', '🌫️'],
    51: ['약한 이슬비', '🌦️'], 53: ['이슬비', '🌦️'], 55: ['강한 이슬비', '🌧️'], 56: ['어는 이슬비', '🌧️'], 57: ['어는 이슬비', '🌧️'],
    61: ['약한 비', '🌦️'], 63: ['비', '🌧️'], 65: ['강한 비', '🌧️'], 66: ['어는 비', '🌧️'], 67: ['강한 어는 비', '🌧️'],
    71: ['약한 눈', '🌨️'], 73: ['눈', '🌨️'], 75: ['폭설', '❄️'], 77: ['싸락눈', '🌨️'],
    80: ['소나기', '🌦️'], 81: ['소나기', '🌧️'], 82: ['강한 소나기', '⛈️'], 85: ['눈 소나기', '🌨️'], 86: ['강한 눈 소나기', '❄️'],
    95: ['뇌우', '⛈️'], 96: ['우박 동반 뇌우', '⛈️'], 99: ['강한 우박 뇌우', '⛈️']
  };
  var wmo = function (c) { return WMO[c] || ['알 수 없음', '🌡️']; };
  var isSnow = function (c) { return (c >= 71 && c <= 77) || c === 85 || c === 86; };
  var isRain = function (c) { return (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95; };

  function locate() {
    var loc = settings.location;
    if (loc.mode !== 'auto' || !navigator.geolocation) return Promise.resolve(loc);
    return new Promise(function (resolve) {
      var done = false;
      var fallback = function () { if (!done) { done = true; resolve(store.get('lastGeo', loc)); } };
      setTimeout(fallback, 6000);
      try {
        navigator.geolocation.getCurrentPosition(function (pos) {
          if (done) return; done = true;
          var g = { mode: 'auto', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), name: '현재 위치' };
          getJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + g.lat + '&longitude=' + g.lon + '&localityLanguage=ko', 4000)
            .then(function (r) { g.name = r.locality || r.city || r.principalSubdivision || g.name; })
            .catch(function () {})
            .then(function () { store.set('lastGeo', g); resolve(g); });
        }, fallback, { timeout: 5000, maximumAge: 30 * 60 * 1000 });
      } catch (e) { fallback(); }
    });
  }

  function loadWeather() {
    return locate().then(function (loc) {
      var q = 'latitude=' + loc.lat + '&longitude=' + loc.lon;
      var wx = getJSON('https://api.open-meteo.com/v1/forecast?' + q +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&hourly=temperature_2m,precipitation_probability,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,snowfall_sum,uv_index_max,sunrise,sunset' +
        '&timezone=auto&forecast_days=2&wind_speed_unit=ms');
      var air = getJSON('https://air-quality-api.open-meteo.com/v1/air-quality?' + q + '&current=pm10,pm2_5&timezone=auto')
        .then(function (r) { return r.current; }).catch(function () { return null; });
      return Promise.all([wx, air]).then(function (res) {
        var d = res[0];
        var nowIso = d.current.time.slice(0, 13);
        var start = Math.max(0, d.hourly.time.findIndex(function (t) { return t.slice(0, 13) === nowIso; }));
        var hours = [];
        for (var i = start; i < start + 12 && i < d.hourly.time.length; i++) {
          hours.push({ hour: +d.hourly.time[i].slice(11, 13), temp: d.hourly.temperature_2m[i], pop: d.hourly.precipitation_probability[i], code: d.hourly.weather_code[i] });
        }
        return { place: loc.name, current: d.current, daily: d.daily, hours: hours, air: res[1], sample: false };
      });
    }).catch(function () {
      var s = window.SAMPLE_WEATHER;
      return { place: s.place, current: s.current, daily: s.daily, hours: s.hourlyFrom(new Date().getHours()), air: s.air, sample: true };
    });
  }

  function renderWeather(w) {
    var c = w.current, d = w.daily, info = wmo(c.weather_code);
    $('wx-icon').textContent = info[1];
    $('wx-temp').textContent = Math.round(c.temperature_2m) + '°';
    $('wx-cond').textContent = info[0] + ' · 체감 ' + Math.round(c.apparent_temperature) + '°';
    $('wx-sub').textContent = Math.round(d.temperature_2m_max[0]) + '° / ' + Math.round(d.temperature_2m_min[0]) + '° · 비 ' + (d.precipitation_probability_max[0] || 0) + '%';
    $('wx-place').textContent = w.sample ? '예시 날씨' : w.place;
    $('wx-place').title = w.sample ? '날씨 서버에 연결하지 못해 예시를 보여줘요' : '';
    $('hourly').innerHTML = w.hours.map(function (hr, i) {
      return '<div class="hour' + (i === 0 ? ' now' : '') + '"><span class="h-time">' + (i === 0 ? '지금' : hr.hour + '시') + '</span>' +
        '<span class="h-ico" aria-hidden="true">' + wmo(hr.code)[1] + '</span>' +
        '<span class="h-t">' + Math.round(hr.temp) + '°</span>' +
        '<span class="h-p">' + (hr.pop >= 20 ? hr.pop + '%' : '') + '</span></div>';
    }).join('');
    renderOutfit(w);
  }

  /* ---------- 옷차림 / 준비물 (키워드) ---------- */
  var OUTFIT = [
    { min: 28, items: ['민소매', '반팔', '린넨 셔츠', '반바지'] },
    { min: 23, items: ['반팔', '얇은 셔츠', '면바지', '얇은 가디건'] },
    { min: 20, items: ['블라우스', '얇은 긴팔', '슬랙스'] },
    { min: 17, items: ['얇은 니트', '가디건', '맨투맨', '청바지'] },
    { min: 12, items: ['자켓', '가디건', '니트 조끼', '스타킹'] },
    { min: 9, items: ['트렌치코트', '니트', '기모 바지'] },
    { min: 5, items: ['울 코트', '히트텍', '두꺼운 니트'] },
    { min: -99, items: ['롱패딩', '목도리', '장갑', '기모 이너'] }
  ];
  function renderOutfit(w) {
    var d = w.daily;
    var base = Math.round((d.apparent_temperature_max[0] + d.apparent_temperature_min[0]) / 2);
    var band = OUTFIT.find(function (o) { return base >= o.min; });
    var gap = Math.round(d.temperature_2m_max[0] - d.temperature_2m_min[0]);
    var chip = function (b) {
      return '<li class="' + (b.lvl ? 'lvl-' + b.lvl : '') + '"' + (b.why ? ' title="' + esc(b.why) + '"' : '') + '>' +
        (b.ico ? '<span aria-hidden="true">' + b.ico + '</span>' : '') + esc(b.t) + (b.v ? ' <b class="mono">' + esc(b.v) + '</b>' : '') + '</li>';
    };
    var wear = band.items.map(function (t) { return { t: t }; });
    if (gap >= 10) wear.push({ t: '일교차', v: gap + '°', lvl: 'mid', why: '아침저녁엔 한 겹 더 입으세요' });
    $('outfit-list').innerHTML = wear.map(chip).join('');

    var bring = [];
    var codes = w.hours.map(function (h) { return h.code; }).concat([d.weather_code[0]]);
    var pop = Math.max(d.precipitation_probability_max[0] || 0, Math.max.apply(null, w.hours.map(function (h) { return h.pop || 0; })));
    var snow = codes.some(isSnow) || (d.snowfall_sum && d.snowfall_sum[0] > 0);
    if (snow) {
      bring.push({ ico: '🥾', t: '미끄럼 방지 신발', lvl: 'high', why: '눈 소식이 있어요' });
      bring.push({ ico: '☂️', t: '장우산', lvl: 'mid' });
    } else if (pop >= 60 || codes.some(isRain)) {
      bring.push({ ico: '☂️', t: '장우산', v: pop + '%', lvl: 'high' });
    } else if (pop >= 30) {
      bring.push({ ico: '🌂', t: '접이식 우산', v: pop + '%', lvl: 'mid' });
    }
    var air = w.air;
    if (air && (air.pm2_5 > 35 || air.pm10 > 80)) bring.push({ ico: '😷', t: 'KF94', v: '먼지 나쁨', lvl: 'high', why: '미세 ' + Math.round(air.pm10) + ' · 초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    else if (air && (air.pm2_5 > 15 || air.pm10 > 30)) bring.push({ ico: '😷', t: '마스크', v: '먼지 보통', why: '초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    var uv = d.uv_index_max[0];
    if (uv >= 6) bring.push({ ico: '🕶️', t: '선크림·선글라스', v: 'UV ' + Math.round(uv), lvl: 'mid' });
    else if (uv >= 3) bring.push({ ico: '🧴', t: '선크림', v: 'UV ' + Math.round(uv) });
    if (w.current.wind_speed_10m >= 8) bring.push({ ico: '🧥', t: '바람막이', v: Math.round(w.current.wind_speed_10m) + 'm/s', lvl: 'mid' });
    if (d.temperature_2m_max[0] >= 31) bring.push({ ico: '💧', t: '물·손풍기', v: Math.round(d.temperature_2m_max[0]) + '°', lvl: 'mid' });
    if (d.temperature_2m_min[0] <= 0) bring.push({ ico: '🔥', t: '핫팩', v: Math.round(d.temperature_2m_min[0]) + '°', lvl: 'mid' });
    if (gap >= 10 && !bring.some(function (b) { return b.ico === '🧥'; })) bring.push({ ico: '🧥', t: '겉옷', v: '퇴근길 ' + Math.round(d.temperature_2m_min[0]) + '°' });
    if (!bring.length) bring.push({ ico: '👌', t: '특별히 없어요' });
    $('bring').innerHTML = bring.map(chip).join('');
  }

  /* ---------- 업무 영어 ---------- */
  var phraseIdx;
  function dayIndex() { var n = new Date(); return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5); }
  function renderPhrase() {
    var list = window.PHRASES, p = list[((phraseIdx % list.length) + list.length) % list.length];
    var html = esc(p.en);
    if (p.key) {
      var k = esc(p.key), at = html.toLowerCase().indexOf(k.toLowerCase());
      if (at >= 0) html = html.slice(0, at) + '<mark>' + html.slice(at, at + k.length) + '</mark>' + html.slice(at + k.length);
    }
    $('en-text').innerHTML = html;
    $('en-ko').textContent = p.ko;
    $('en-when').textContent = p.when;
    var offset = phraseIdx - dayIndex();
    $('en-count').textContent = offset === 0 ? '오늘' : (offset > 0 ? '+' + offset : offset);
  }
  function initPhrase() {
    phraseIdx = dayIndex();
    renderPhrase();
    $('en-prev').onclick = function () { phraseIdx--; renderPhrase(); };
    $('en-next').onclick = function () { phraseIdx++; renderPhrase(); };
    $('en-speak').onclick = function () {
      if (!('speechSynthesis' in window)) { toast('이 브라우저는 음성 듣기를 지원하지 않아요'); return; }
      var u = new SpeechSynthesisUtterance($('en-text').textContent);
      u.lang = 'en-US'; u.rate = 0.92;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    };
    $('en-copy').onclick = function () {
      var text = $('en-text').textContent;
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents($('en-text'));
        var s = getSelection(); s.removeAllRanges(); s.addRange(r);
        toast('문장을 선택했어요. 복사해서 쓰세요');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast('복사했어요'); }, fallback);
      else fallback();
    };
  }

  /* ---------- 일정 ---------- */
  var CAT = { meeting: '회의', focus: '집중 업무', personal: '개인', health: '운동·건강' };
  var viewDate = new Date();
  var schedules = store.get('schedules', null);
  if (schedules === null) {
    // 첫 방문: 예시 일정
    var t = ymd(new Date());
    schedules = {};
    schedules[t] = [
      { id: 's1', start: '09:30', end: '10:00', title: '데일리 스탠드업', cat: 'meeting', place: '팀 채널', memo: '어제 한 일 / 오늘 할 일 / 막힌 것', sample: true },
      { id: 's2', start: '10:30', end: '12:00', title: '모바일 뱅킹 송금 플로우 시안 작업', cat: 'focus', place: '', memo: '', sample: true },
      { id: 's3', start: '12:10', end: '13:00', title: '점심 산책', cat: 'health', place: '', memo: '', sample: true },
      { id: 's4', start: '14:00', end: '15:00', title: '디자인 리뷰: 대출 신청 화면', cat: 'meeting', place: '12층 회의실', memo: '금리 안내 문구 법무 검토 결과 공유', sample: true },
      { id: 's5', start: '19:30', end: '20:30', title: '필라테스', cat: 'personal', place: '', memo: '', sample: true }
    ];
  }
  var saveSchedules = function () { store.set('schedules', schedules); };
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  var parseYmd = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

  function openDialog(d) { if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); }
  function closeDialog(d) { if (d.close) d.close(); else d.removeAttribute('open'); }
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) closeDialog(c.closest('dialog'));
    // 바깥(배경) 클릭으로 닫기
    if (e.target.tagName === 'DIALOG' && e.target.classList.contains('sheet')) {
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(e.target);
    }
  });

  function renderSchedule() {
    var key = ymd(viewDate), todayKey = ymd(new Date());
    var list = (schedules[key] || []).slice().sort(function (a, b) { return a.start.localeCompare(b.start); });
    var diff = Math.round((parseYmd(key) - parseYmd(todayKey)) / 864e5);
    $('day-today').textContent = diff === 0 ? '오늘' : (viewDate.getMonth() + 1) + '/' + viewDate.getDate() + ' (' + DAYS[viewDate.getDay()] + ')';
    $('sch-h').textContent = diff === 0 ? '오늘 일정' : diff === 1 ? '내일 일정' : diff === -1 ? '어제 일정' : '일정';
    $('sample-banner').hidden = !list.some(function (s) { return s.sample; });
    $('timeline-empty').hidden = list.length > 0;

    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var html = '', nowPlaced = diff !== 0;
    list.forEach(function (s) {
      var st = toMin(s.start), en = s.end ? toMin(s.end) : st + 30;
      if (!nowPlaced && nowMin < st) { html += nowRow(now); nowPlaced = true; }
      var state = diff < 0 ? 'past' : diff > 0 ? '' : en <= nowMin ? 'past' : st <= nowMin ? 'current' : '';
      var rel = '';
      if (state === 'current') rel = ' · 진행 중';
      else if (diff === 0 && !state) { var m = st - nowMin; rel = m < 60 ? ' · ' + m + '분 후' : ''; }
      html += '<li class="tl-item ' + state + '" style="--c: var(--cat-' + s.cat + ')">' +
        '<span class="tl-time">' + s.start + '</span><span class="tl-dot"></span>' +
        '<button type="button" class="tl-card" data-id="' + s.id + '">' +
        '<span class="tl-title">' + esc(s.title) + (s.sample ? ' <span class="tl-tag">예시</span>' : '') + '</span>' +
        '<span class="tl-meta">' + s.start + (s.end ? '–' + s.end : '') + ' · ' + CAT[s.cat] + (s.place ? ' · ' + esc(s.place) : '') + rel + '</span>' +
        (s.memo ? '<span class="tl-memo">' + esc(s.memo) + '</span>' : '') +
        '</button></li>';
      if (!nowPlaced && state === 'current') { html += nowRow(now); nowPlaced = true; }
    });
    if (!nowPlaced && list.length) html += nowRow(now);
    $('timeline').innerHTML = html;
    renderNowNext();
  }
  function nowRow(now) {
    return '<li class="tl-now" aria-label="현재 시각"><span class="tl-time">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</span><span class="now-dot"></span><span class="now-line"></span></li>';
  }

  /* 지금 · 다음 (홈 상단 요약) */
  function relLabel(m) { return m < 60 ? m + '분 후' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') + ' 후'; }
  function renderNowNext() {
    var key = ymd(new Date()), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    var list = (schedules[key] || []).slice().sort(function (a, b) { return a.start.localeCompare(b.start); });
    var cur = list.find(function (s) { return toMin(s.start) <= nm && nm < toMin(endOf(s)); });
    var next = list.find(function (s) { return toMin(s.start) > nm; });
    var item = function (s, kind, label, bar) {
      return '<button type="button" class="nn-item ' + kind + '" data-id="' + s.id + '" style="--c: var(--cat-' + s.cat + ')">' +
        '<span class="nn-label">' + label + '</span>' +
        '<span class="nn-title">' + esc(s.title) + '</span>' +
        '<span class="nn-meta">' + s.start + '–' + endOf(s) + (s.place ? ' · ' + esc(s.place) : '') + '</span>' +
        (bar != null ? '<span class="nn-bar"><i style="width:' + bar + '%"></i></span>' : '') + '</button>';
    };
    var idle = function (label, text) { return '<div class="nn-item idle"><span class="nn-label">' + label + '</span><span class="nn-title">' + text + '</span></div>'; };
    var html = '';
    if (cur) {
      var st = toMin(cur.start), en = toMin(endOf(cur));
      html += item(cur, 'current', '진행 중 · ' + (en - nm) + '분 남음', Math.round((nm - st) / (en - st) * 100));
    } else html += idle('지금', '비어 있는 시간이에요');
    html += next ? item(next, 'next', '다음 · ' + relLabel(toMin(next.start) - nm)) : idle('다음', '오늘 남은 일정이 없어요');
    $('nn').innerHTML = html;
  }
  function scrollToSchedule(id) {
    viewDate = new Date();
    renderSchedule();
    $('schedule-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (id) {
      var card = document.querySelector('.tl-card[data-id="' + id + '"]');
      if (card) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    }
  }

  /* 추가·수정 팝업 */
  function openForm(item, dateKey) {
    var key = dateKey || ymd(viewDate);
    $('sch-id').value = item ? item.id : '';
    $('sch-id').dataset.orig = item ? key : '';
    $('sch-title').value = item ? item.title : '';
    $('sch-date').value = key;
    $('sch-place').value = item ? item.place || '' : '';
    $('sch-memo').value = item ? item.memo || '' : '';
    $('sch-cat').value = item ? item.cat : 'meeting';
    var start;
    if (item) start = item.start;
    else {
      var last = (schedules[key] || []).filter(function (s) { return !s.sample; }).map(function (s) { return s.end || s.start; }).sort().pop();
      var nowNext = pad(Math.min(new Date().getHours() + 1, 23)) + ':00';
      start = last || (key === ymd(new Date()) ? nowNext : '09:00');
    }
    $('sch-start').value = start;
    if (item) $('sch-end').value = item.end || '';
    else { var em = Math.min(toMin(start) + 60, 23 * 60 + 59); $('sch-end').value = pad(Math.floor(em / 60)) + ':' + pad(em % 60); }
    $('sch-dialog-h').textContent = item ? '일정 수정' : '일정 추가';
    $('sch-submit').textContent = item ? '수정 저장' : '일정 추가';
    $('sch-error').hidden = true;
    openDialog($('sch-dialog'));
    setTimeout(function () { $('sch-title').focus(); }, 30);
  }

  /* 상세 팝업 */
  var detail = null; // { key, id }
  function findItem(key, id) { return (schedules[key] || []).find(function (s) { return s.id === id; }); }
  function openDetail(key, id) {
    var s = findItem(key, id);
    if (!s) return;
    detail = { key: key, id: id };
    var d = parseYmd(key);
    $('dt-cat').textContent = CAT[s.cat];
    $('dt-cat').style.setProperty('--c', 'var(--cat-' + s.cat + ')');
    $('dt-title').textContent = s.title;
    $('dt-meta').textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DAYS[d.getDay()] + ') ' + s.start + (s.end ? '–' + s.end : '') + (s.place ? ' · ' + s.place : '');
    $('dt-memo').value = s.memo || '';
    $('dt-saved').textContent = '입력하면 자동으로 저장돼요.';
    $('dt-delete').textContent = '삭제';
    $('dt-delete').dataset.armed = '';
    var links = calendarLinks(key, s);
    $('cal-google').href = links.google;
    $('cal-outlook').href = links.outlook;
    $('cal-outlook-work').href = links.outlookWork;
    openDialog($('detail-dialog'));
  }

  /* 캘린더 연동 */
  function stamp(key, hm) { return key.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'; }
  function endOf(s) { if (s.end) return s.end; var m = Math.min(toMin(s.start) + 60, 23 * 60 + 59); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function calendarLinks(key, s) {
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Seoul';
    var end = endOf(s);
    var details = s.memo || '';
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(s.title) +
      '&dates=' + stamp(key, s.start) + '/' + stamp(key, end) +
      '&ctz=' + encodeURIComponent(tz) +
      (details ? '&details=' + encodeURIComponent(details) : '') +
      (s.place ? '&location=' + encodeURIComponent(s.place) : '');
    var o = function (host) {
      return 'https://' + host + '/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent' +
        '&subject=' + encodeURIComponent(s.title) +
        '&startdt=' + encodeURIComponent(key + 'T' + s.start + ':00') +
        '&enddt=' + encodeURIComponent(key + 'T' + end + ':00') +
        (details ? '&body=' + encodeURIComponent(details) : '') +
        (s.place ? '&location=' + encodeURIComponent(s.place) : '');
    };
    return { google: g, outlook: o('outlook.live.com'), outlookWork: o('outlook.office.com') };
  }
  function icsText(key, s) {
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Seoul';
    var escI = function (v) { return String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//todays-assistant//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + s.id + '-' + key + '@todays-assistant',
      'DTSTAMP:' + nowUtc,
      'DTSTART;TZID=' + tz + ':' + stamp(key, s.start),
      'DTEND;TZID=' + tz + ':' + stamp(key, endOf(s)),
      'SUMMARY:' + escI(s.title),
      s.place ? 'LOCATION:' + escI(s.place) : '',
      s.memo ? 'DESCRIPTION:' + escI(s.memo) : '',
      'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(s.title), 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
  }
  function saveIcs() {
    if (!detail) return;
    var s = findItem(detail.key, detail.id);
    var text = icsText(detail.key, s);
    var filename = (s.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 40) || 'event') + '.ics';
    // iPhone Safari는 .ics를 열면 '캘린더에 추가' 화면을 띄워요
    var a = document.createElement('a');
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function copyText(text, okMsg) {
    var fb = function () { toast('복사할 수 없는 환경이에요. 직접 선택해서 복사해 주세요'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, fb);
    else fb();
  }

  function initSchedule() {
    $('day-prev').onclick = function () { viewDate.setDate(viewDate.getDate() - 1); renderSchedule(); };
    $('day-next').onclick = function () { viewDate.setDate(viewDate.getDate() + 1); renderSchedule(); };
    $('day-today').onclick = function () { viewDate = new Date(); renderSchedule(); };
    $('clear-samples').onclick = function () { clearSamples(); renderSchedule(); toast('예시 일정을 지웠어요'); };
    $('sch-add').onclick = function () { openForm(null); };
    $('nn-all').onclick = function () { scrollToSchedule(); };
    $('nn').addEventListener('click', function (e) {
      var b = e.target.closest('.nn-item[data-id]');
      scrollToSchedule(b && b.dataset.id);
    });

    $('timeline').addEventListener('click', function (e) {
      var card = e.target.closest('.tl-card');
      if (card) openDetail(ymd(viewDate), card.dataset.id);
    });

    $('sch-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('sch-error');
      var title = $('sch-title').value.trim(), date = $('sch-date').value, start = $('sch-start').value, end = $('sch-end').value;
      var fail = function (m, el) { err.textContent = m; err.hidden = false; if (el) el.focus(); };
      if (!title) return fail('일정 이름을 입력해 주세요.', $('sch-title'));
      if (!date) return fail('날짜를 선택해 주세요.', $('sch-date'));
      if (!start) return fail('시작 시간을 입력해 주세요.', $('sch-start'));
      if (end && toMin(end) <= toMin(start)) return fail('종료 시간은 시작 시간보다 늦어야 해요.', $('sch-end'));
      err.hidden = true;
      var editing = $('sch-id').value, origKey = $('sch-id').dataset.orig;
      if (!editing) clearSamples();
      if (editing && origKey && schedules[origKey]) {
        schedules[origKey] = schedules[origKey].filter(function (s) { return s.id !== editing; });
        if (!schedules[origKey].length) delete schedules[origKey];
      }
      var list = schedules[date] || (schedules[date] = []);
      list.push({ id: editing || 'e' + Date.now().toString(36), start: start, end: end, title: title, cat: $('sch-cat').value, place: $('sch-place').value.trim(), memo: $('sch-memo').value.trim() });
      saveSchedules();
      viewDate = parseYmd(date);
      renderSchedule();
      closeDialog($('sch-dialog'));
      toast(editing ? '일정을 수정했어요' : '일정을 추가했어요');
    });

    var mt;
    $('dt-memo').addEventListener('input', function () {
      clearTimeout(mt);
      $('dt-saved').textContent = '저장 중…';
      mt = setTimeout(function () {
        var s = detail && findItem(detail.key, detail.id);
        if (!s) return;
        s.memo = $('dt-memo').value.trim();
        saveSchedules(); renderSchedule();
        $('dt-saved').textContent = '저장했어요.';
        var links = calendarLinks(detail.key, s);
        $('cal-google').href = links.google; $('cal-outlook').href = links.outlook; $('cal-outlook-work').href = links.outlookWork;
      }, 400);
    });
    $('dt-edit').onclick = function () {
      var s = findItem(detail.key, detail.id);
      closeDialog($('detail-dialog'));
      openForm(s, detail.key);
    };
    $('dt-delete').onclick = function () {
      var b = $('dt-delete');
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '한 번 더 누르면 삭제돼요'; return; }
      schedules[detail.key] = (schedules[detail.key] || []).filter(function (s) { return s.id !== detail.id; });
      if (!schedules[detail.key].length) delete schedules[detail.key];
      saveSchedules(); renderSchedule();
      closeDialog($('detail-dialog'));
      toast('일정을 삭제했어요');
    };
    $('cal-apple').onclick = function (e) { e.preventDefault(); saveIcs(); };
    $('cal-ics').onclick = function (e) { e.preventDefault(); saveIcs(); };
    $('cal-copy').onclick = function () {
      var s = findItem(detail.key, detail.id);
      copyText($('dt-title').textContent + '\n' + $('dt-meta').textContent + (s.memo ? '\n' + s.memo : ''), '일정을 복사했어요');
    };

    renderSchedule();
  }
  function clearSamples() {
    Object.keys(schedules).forEach(function (k) {
      schedules[k] = schedules[k].filter(function (s) { return !s.sample; });
      if (!schedules[k].length) delete schedules[k];
    });
    saveSchedules();
  }

  /* ---------- 체크리스트 (묶음별) ---------- */
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); };
  var lists = store.get('checklists', null);
  if (lists === null) {
    var mk = function (texts, doneIdx) { return texts.map(function (t, i) { return { id: uid() + i, text: t, done: doneIdx.indexOf(i) >= 0 }; }); };
    lists = [
      { id: 'g1', title: '이번 달 꼭 할 일', sample: true, items: mk(['연말정산 서류 미리 챙기기', '디자인 시스템 버튼 컴포넌트 정리', '건강검진 예약'], [1]) },
      { id: 'g2', title: '올해 목표', sample: true, items: mk(['영어로 디자인 리뷰 진행하기', '포트폴리오 업데이트', '책 12권 읽기', '하프 마라톤 완주', 'UX 리서치 강의 수료'], [2]) }
    ];
  }
  var saveLists = function () { store.set('checklists', lists); };
  var findGroup = function (id) { return lists.find(function (g) { return g.id === id; }); };

  function renderLists(focusNewIn) {
    $('cl-sample').hidden = !lists.some(function (g) { return g.sample; });
    $('cl-empty').hidden = lists.length > 0;
    $('cl-groups').innerHTML = lists.map(function (g) {
      var done = g.items.filter(function (i) { return i.done; }).length, total = g.items.length;
      return '<div class="cl-group" data-g="' + g.id + '">' +
        '<div class="cl-head">' +
          '<input class="cl-title" value="' + esc(g.title) + '" maxlength="30" aria-label="목록 제목">' +
          '<span class="cl-count mono">' + done + '/' + total + '</span>' +
          '<button type="button" class="icon-mini" data-act="del-group" aria-label="' + esc(g.title) + ' 목록 삭제">✕</button>' +
        '</div>' +
        '<span class="cl-bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></span>' +
        '<ul class="cl-items">' + g.items.map(function (it) {
          return '<li class="cl-item' + (it.done ? ' done' : '') + '" data-i="' + it.id + '">' +
            '<input type="checkbox" class="cl-check" id="ck-' + it.id + '"' + (it.done ? ' checked' : '') + ' aria-label="완료">' +
            '<input class="cl-text" value="' + esc(it.text) + '" maxlength="80" aria-label="항목">' +
            '<button type="button" class="icon-mini" data-act="del-item" aria-label="항목 삭제">✕</button></li>';
        }).join('') + '</ul>' +
        '<form class="cl-new"><input class="cl-new-input" maxlength="80" placeholder="+ 항목 추가" aria-label="' + esc(g.title) + '에 항목 추가"></form>' +
      '</div>';
    }).join('');
    if (focusNewIn) {
      var inp = document.querySelector('.cl-group[data-g="' + focusNewIn + '"] .cl-new-input');
      if (inp) inp.focus();
    }
  }
  function touch(g) { if (g.sample) { g.sample = false; } saveLists(); }

  function initChecklist() {
    var root = $('cl-groups');
    root.addEventListener('change', function (e) {
      var gEl = e.target.closest('.cl-group'); if (!gEl) return;
      var g = findGroup(gEl.dataset.g), iEl = e.target.closest('.cl-item');
      var it = iEl && g.items.find(function (x) { return x.id === iEl.dataset.i; });
      if (e.target.classList.contains('cl-check') && it) {
        it.done = e.target.checked; touch(g); renderLists();
        if (it.done && g.items.every(function (x) { return x.done; })) toast('“' + g.title + '” 모두 완료했어요');
      } else if (e.target.classList.contains('cl-title')) {
        g.title = e.target.value.trim() || '제목 없음'; touch(g);
      } else if (e.target.classList.contains('cl-text') && it) {
        var v = e.target.value.trim();
        if (v) it.text = v; else g.items = g.items.filter(function (x) { return x !== it; });
        touch(g); if (!v) renderLists();
      }
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing && (e.target.classList.contains('cl-title') || e.target.classList.contains('cl-text'))) { e.preventDefault(); e.target.blur(); }
    });
    root.addEventListener('submit', function (e) {
      e.preventDefault();
      var gEl = e.target.closest('.cl-group'), g = findGroup(gEl.dataset.g);
      var inp = e.target.querySelector('.cl-new-input'), v = inp.value.trim();
      if (!v) return;
      g.items.push({ id: uid(), text: v, done: false });
      touch(g); renderLists(g.id);
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var gEl = b.closest('.cl-group'), g = findGroup(gEl.dataset.g);
      if (b.dataset.act === 'del-item') {
        var id = b.closest('.cl-item').dataset.i;
        g.items = g.items.filter(function (x) { return x.id !== id; });
        touch(g); renderLists();
      } else if (b.dataset.act === 'del-group') {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '삭제?'; b.classList.add('armed'); return; }
        lists = lists.filter(function (x) { return x !== g; });
        saveLists(); renderLists(); toast('“' + g.title + '” 목록을 삭제했어요');
      }
    });
    $('cl-add-group').onclick = function () {
      var g = { id: uid(), title: '새 목록', items: [] };
      lists.push(g); saveLists(); renderLists();
      var t = document.querySelector('.cl-group[data-g="' + g.id + '"] .cl-title');
      if (t) { t.scrollIntoView({ behavior: 'smooth', block: 'center' }); t.focus(); t.select(); }
    };
    $('cl-clear-samples').onclick = function () {
      lists = lists.filter(function (g) { return !g.sample; });
      saveLists(); renderLists(); toast('예시 목록을 지웠어요');
    };
    renderLists();
  }

  /* ---------- 관심 소식: 뉴스 + 유튜브 + 인스타그램 ---------- */
  var news = [], videos = [], newsFilter = 'all', newsKind = 'news', newsSample = false;
  var readSet = new Set(store.get('newsRead', []));
  var squash = function (t) { return String(t).toLowerCase().replace(/\s+/g, ''); };

  function parseRss(xml, interest) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    return Array.prototype.map.call(doc.querySelectorAll('item'), function (it) {
      var g = function (s) { var n = it.querySelector(s); return n ? n.textContent : ''; };
      var src = it.querySelector('source');
      return normalize({ title: g('title'), link: g('link'), pubDate: g('pubDate'), source: g('source'), sourceUrl: src && src.getAttribute('url') }, interest);
    });
  }
  function normalize(r, interest) {
    var title = (r.title || '').trim(), source = r.source || r.author || '';
    var cut = title.lastIndexOf(' - ');
    if (cut > 0) { if (!source) source = title.slice(cut + 3); title = title.slice(0, cut); }
    var date = r.pubDate ? new Date(r.pubDate.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d|GMT/.test(r.pubDate) ? '' : 'Z')) : null;
    if (date && isNaN(date)) date = new Date(r.pubDate);
    var domain = '';
    try { domain = r.sourceUrl ? new URL(r.sourceUrl).hostname : ''; } catch (e) { /* 무시 */ }
    return { title: title, link: r.link, source: source, domain: domain, image: r.thumbnail || '', date: date && !isNaN(date) ? date.toISOString() : null, interest: interest };
  }

  // 구글 뉴스 (관심사별, 이미지 없음)
  function fetchGoogle(q) {
    var rss = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:7d') + '&hl=ko&gl=KR&ceid=KR:ko';
    return getJSON('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(rss))
      .then(function (r) {
        if (r.status !== 'ok') throw new Error('rss2json');
        return r.items.map(function (x) { return normalize(x, q); });
      })
      .catch(function () {
        return fetchWithTimeout('https://api.allorigins.win/raw?url=' + encodeURIComponent(rss))
          .then(function (r) { return r.text(); })
          .then(function (xml) { return parseRss(xml, q); });
      });
  }
  // GDELT (대표 이미지 포함). 요청 간격 제한이 있어 관심사를 한 번에 묻고 제목으로 분류
  function fetchGdelt(interests) {
    var terms = interests.map(function (q) { return /\s/.test(q) ? '"' + q + '"' : q; });
    var query = (terms.length > 1 ? '(' + terms.join(' OR ') + ')' : terms[0]) + ' sourcelang:korean';
    return getJSON('https://api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json&sort=datedesc&timespan=7d&maxrecords=40&query=' + encodeURIComponent(query), 9000)
      .then(function (r) {
        return (r.articles || []).map(function (a) {
          var t = squash(a.title);
          var hit = interests.find(function (q) { return t.indexOf(squash(q)) >= 0; }) || interests[0];
          var sd = a.seendate || '';
          var iso = sd.length >= 15 ? sd.slice(0, 4) + '-' + sd.slice(4, 6) + '-' + sd.slice(6, 8) + 'T' + sd.slice(9, 11) + ':' + sd.slice(11, 13) + ':' + sd.slice(13, 15) + 'Z' : null;
          return { title: a.title, link: a.url, source: a.domain, domain: a.domain, image: a.socialimage || '', date: iso, interest: hit };
        });
      });
  }

  // 유튜브: API 키가 있으면 공식 API, 없으면 공개 Piped 인스턴스
  var PIPED = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de'];
  function fetchYoutube(q) {
    if (settings.ytKey) {
      var after = new Date(Date.now() - 14 * 864e5).toISOString();
      return getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=8&regionCode=KR&relevanceLanguage=ko' +
        '&publishedAfter=' + encodeURIComponent(after) + '&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(settings.ytKey))
        .then(function (r) {
          return (r.items || []).map(function (v) {
            return { id: v.id.videoId, title: decodeEntities(v.snippet.title), channel: v.snippet.channelTitle, date: v.snippet.publishedAt, interest: q };
          });
        });
    }
    var tryAt = function (i) {
      if (i >= PIPED.length) return Promise.reject(new Error('piped'));
      return getJSON(PIPED[i] + '/search?filter=videos&q=' + encodeURIComponent(q), 7000)
        .then(function (r) {
          return (r.items || []).filter(function (v) { return v.url && v.url.indexOf('/watch') === 0; }).slice(0, 8).map(function (v) {
            return { id: v.url.split('v=')[1], title: v.title, channel: v.uploaderName, date: v.uploaded > 0 ? new Date(v.uploaded).toISOString() : null, ago: v.uploadedDate, interest: q };
          });
        })
        .catch(function () { return tryAt(i + 1); });
    };
    return tryAt(0);
  }
  function decodeEntities(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }

  function loadNews() {
    var sig = settings.interests.join('|') + '#' + (settings.ytKey ? 'k' : '');
    var cache = store.get('feedCache', null);
    if (cache && cache.sig === sig && Date.now() - cache.at < 30 * 60 * 1000 && cache.news.length) {
      return Promise.resolve({ news: cache.news, videos: cache.videos, failed: false });
    }
    var qs = settings.interests;
    if (!qs.length) return Promise.resolve({ news: [], videos: [], failed: false });
    var settle = function (p) { return p.then(function (v) { return { ok: true, v: v }; }, function () { return { ok: false, v: [] }; }); };
    var jobs = [settle(fetchGdelt(qs))].concat(qs.map(function (q) { return settle(fetchGoogle(q)); }));
    var vids = Promise.all(qs.map(function (q) { return settle(fetchYoutube(q)); }));
    return Promise.all([Promise.all(jobs), vids]).then(function (res) {
      var seen = {}, items = [];
      res[0].forEach(function (r) {
        r.v.forEach(function (it) {
          var k = squash(it.title).slice(0, 40);
          if (!it.title || !it.link) return;
          if (seen[k]) { if (!seen[k].image && it.image) seen[k].image = it.image; return; }
          seen[k] = it; items.push(it);
        });
      });
      items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      var vseen = {}, vs = [];
      res[1].forEach(function (r) { r.v.forEach(function (v) { if (v.id && !vseen[v.id]) { vseen[v.id] = 1; vs.push(v); } }); });
      var failed = res[0].every(function (r) { return !r.ok; });
      if (!failed) store.set('feedCache', { sig: sig, at: Date.now(), news: items, videos: vs });
      return { news: items, videos: vs, failed: failed };
    });
  }

  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 60) return Math.max(m, 1) + '분 전';
    if (m < 1440) return Math.round(m / 60) + '시간 전';
    return Math.round(m / 1440) + '일 전';
  }
  // 관심사마다 고정된 색 (썸네일이 없을 때 타일 색)
  function hueOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function thumbHtml(n, cls) {
    var h = hueOf(n.interest);
    var tile = '<span class="thumb-fallback" style="--h:' + h + '"><span>' + esc(n.interest) + '</span></span>';
    if (!n.image) return '<span class="thumb ' + cls + '">' + tile + '</span>';
    return '<span class="thumb ' + cls + '">' + tile + '<img src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>';
  }
  function newsCard(n, big) {
    var id = n.link, read = readSet.has(id);
    var isNew = n.date && Date.now() - new Date(n.date) < 864e5 && !read;
    return '<li><a class="news-card' + (big ? ' big' : '') + (read ? ' read' : '') + '" href="' + esc(n.link) + '" target="_blank" rel="noopener" data-id="' + esc(id) + '">' +
      thumbHtml(n, big ? 'wide' : 'square') +
      '<span class="n-body"><span class="n-title">' + esc(n.title) + '</span>' +
      '<span class="n-meta">' + (isNew ? '<span class="n-new">NEW</span>' : '') + '<span class="n-tag">' + esc(n.interest) + '</span>' +
      (n.source ? '<span>' + esc(n.source) + '</span>' : '') + (n.date ? '<span>' + ago(n.date) + '</span>' : '') + '</span></span></a></li>';
  }
  function videoCard(v) {
    return '<li><a class="yt-card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.id) + '" target="_blank" rel="noopener" data-id="yt:' + esc(v.id) + '">' +
      '<span class="thumb wide">' + '<span class="thumb-fallback" style="--h:' + hueOf(v.interest) + '"><span>' + esc(v.interest) + '</span></span>' +
      '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="play" aria-hidden="true"></span></span>' +
      '<span class="yt-title">' + esc(v.title) + '</span>' +
      '<span class="n-meta"><span>' + esc(v.channel || '') + '</span><span>' + (v.date ? ago(v.date) : esc(v.ago || '')) + '</span></span></a></li>';
  }
  function ytSearchCard(q) {
    return '<li><a class="yt-card" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=CAI%253D" target="_blank" rel="noopener">' +
      '<span class="thumb wide"><span class="thumb-fallback yt" style="--h:' + hueOf(q) + '"><span>' + esc(q) + '</span></span><span class="play" aria-hidden="true"></span></span>' +
      '<span class="yt-title">' + esc(q) + ' 최신 영상 보기</span><span class="n-meta"><span>YouTube 검색</span></span></a></li>';
  }
  function igTag(q) { return q.replace(/[^0-9A-Za-z가-힣_]/g, ''); }

  function renderNews(result) {
    news = result.news; videos = result.videos || [];
    newsSample = false;
    if (result.failed) { news = window.SAMPLE_NEWS; newsSample = true; }
    var panel = $('news-panel');
    panel.hidden = false;
    $('news-note').hidden = !newsSample;
    $('news-note').textContent = newsSample ? '뉴스 서버에 연결하지 못해 예시를 보여드려요. 링크를 누르면 실제 검색 결과로 이동해요.' : '';

    // 안 읽은 것 > 썸네일 있는 것 > 최신순
    var fresh = function (n) { return n.date ? Math.max(0, 1 - (Date.now() - new Date(n.date)) / (3 * 864e5)) : 0; };
    var top = news.slice().sort(function (a, b) {
      var sa = (readSet.has(a.link) ? 0 : 2) + (a.image ? 1 : 0) + fresh(a);
      var sb = (readSet.has(b.link) ? 0 : 2) + (b.image ? 1 : 0) + fresh(b);
      return sb - sa;
    }).slice(0, 3);
    $('news-top').innerHTML = top.map(function (n, i) { return newsCard(n, i === 0); }).join('');
    $('news-top').hidden = !top.length;

    $('yt-block').hidden = false;
    $('yt-top').innerHTML = videos.length
      ? videos.slice(0, 6).map(videoCard).join('')
      : settings.interests.map(ytSearchCard).join('');

    $('ig-tags').innerHTML = settings.interests.map(function (q) {
      var t = igTag(q);
      return t ? '<a class="ig-tag" href="https://www.instagram.com/explore/tags/' + encodeURIComponent(t) + '/" target="_blank" rel="noopener">#' + esc(t) + '</a>' : '';
    }).join('');
    $('ig-block').hidden = !settings.interests.length;

    var total = news.length + videos.length;
    $('news-more').hidden = newsSample || total <= 3;
    $('news-total').textContent = total;
    renderNewsPage();
    route();
  }
  function renderNewsPage() {
    var src = newsKind === 'news' ? news : videos;
    var interests = settings.interests.filter(function (i) { return src.some(function (n) { return n.interest === i; }); });
    if (newsFilter !== 'all' && interests.indexOf(newsFilter) < 0) newsFilter = 'all';
    $('news-filters').innerHTML = ['all'].concat(interests).map(function (i) {
      var c = i === 'all' ? src.length : src.filter(function (n) { return n.interest === i; }).length;
      return '<button type="button" class="chip" role="tab" data-f="' + esc(i) + '" aria-selected="' + (newsFilter === i) + '">' + (i === 'all' ? '전체' : esc(i)) + ' <span class="mono">' + c + '</span></button>';
    }).join('');
    var list = newsFilter === 'all' ? src : src.filter(function (n) { return n.interest === newsFilter; });
    $('news-all').hidden = newsKind !== 'news';
    $('yt-all').hidden = newsKind !== 'video';
    if (newsKind === 'news') $('news-all').innerHTML = list.map(function (n) { return newsCard(n, false); }).join('');
    else $('yt-all').innerHTML = list.length ? list.map(videoCard).join('') : settings.interests.map(ytSearchCard).join('');
    $('news-all-count').textContent = list.length + '건';
    Array.prototype.forEach.call(document.querySelectorAll('.seg-btn'), function (b) { b.setAttribute('aria-selected', String(b.dataset.kind === newsKind)); });
  }
  function initNews() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.news-card, .yt-card');
      if (!a || !a.dataset.id) return;
      readSet.add(a.dataset.id);
      store.set('newsRead', Array.from(readSet).slice(-400));
      a.classList.add('read');
    });
    $('news-filters').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) { newsFilter = b.dataset.f; renderNewsPage(); }
    });
    document.querySelector('.seg').addEventListener('click', function (e) {
      var b = e.target.closest('.seg-btn');
      if (b) { newsKind = b.dataset.kind; newsFilter = 'all'; renderNewsPage(); }
    });
    loadNews().then(renderNews);
  }

  /* ---------- 화면 전환 ---------- */
  function route() {
    var onNews = location.hash === '#news' && !newsSample && (news.length + videos.length) > 0;
    var was = !$('view-news').hidden;
    $('view-home').hidden = onNews;
    $('view-news').hidden = !onNews;
    document.body.classList.toggle('on-news', onNews);
    if (was !== onNews) window.scrollTo(0, 0);
  }

  /* ---------- 설정 ---------- */
  function initSettings() {
    var dlg = $('settings');
    var draft;
    function renderTags() {
      $('set-tags').innerHTML = draft.interests.map(function (t, i) {
        return '<li>' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="' + esc(t) + ' 삭제">✕</button></li>';
      }).join('');
      var l = draft.location;
      $('set-city-current').textContent = '현재: ' + (l.mode === 'auto' ? '내 위치 자동 (실패 시 ' + l.name + ')' : l.name);
    }
    $('open-settings').onclick = function () {
      draft = JSON.parse(JSON.stringify(settings));
      $('set-name').value = draft.name;
      $('set-ytkey').value = draft.ytKey || '';
      $('set-interest').value = ''; $('set-city').value = ''; $('city-results').innerHTML = '';
      renderTags();
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    };
    $('set-tags').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) { draft.interests.splice(+b.dataset.i, 1); renderTags(); }
    });
    $('set-interest').addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      var v = e.target.value.trim();
      if (v && draft.interests.indexOf(v) < 0 && draft.interests.length < 8) { draft.interests.push(v); renderTags(); }
      else if (draft.interests.length >= 8) toast('관심사는 8개까지 등록할 수 있어요');
      e.target.value = '';
    });
    var ct;
    $('set-city').addEventListener('input', function (e) {
      clearTimeout(ct);
      var q = e.target.value.trim();
      if (q.length < 2) { $('city-results').innerHTML = ''; return; }
      ct = setTimeout(function () {
        getJSON('https://geocoding-api.open-meteo.com/v1/search?count=5&language=ko&name=' + encodeURIComponent(q))
          .then(function (r) {
            var res = r.results || [];
            $('city-results').innerHTML = res.length ? res.map(function (c) {
              var label = c.name + (c.admin1 ? ', ' + c.admin1 : '') + (c.country ? ' · ' + c.country : '');
              return '<li><button type="button" data-lat="' + c.latitude + '" data-lon="' + c.longitude + '" data-name="' + esc(c.name) + '">' + esc(label) + '</button></li>';
            }).join('') : '<li class="hint">검색 결과가 없어요. 다른 이름으로 찾아보세요.</li>';
          })
          .catch(function () { $('city-results').innerHTML = '<li class="hint">지역 검색 서버에 연결하지 못했어요.</li>'; });
      }, 300);
    });
    $('city-results').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      draft.location = { mode: 'city', name: b.dataset.name, lat: +b.dataset.lat, lon: +b.dataset.lon };
      $('city-results').innerHTML = ''; $('set-city').value = '';
      renderTags();
    });
    $('set-locate').onclick = function () {
      draft.location = Object.assign({}, draft.location, { mode: 'auto' });
      renderTags();
    };
    $('settings-form').addEventListener('submit', function (e) { e.preventDefault(); $('settings-save').click(); });
    $('settings-save').addEventListener('click', function (e) {
      e.preventDefault();
      var pending = $('set-interest').value.trim();
      if (pending && draft.interests.indexOf(pending) < 0) draft.interests.push(pending);
      draft.name = $('set-name').value.trim();
      draft.ytKey = $('set-ytkey').value.trim();
      var interestsChanged = draft.interests.join('|') !== settings.interests.join('|') || draft.ytKey !== (settings.ytKey || '');
      var locChanged = JSON.stringify(draft.location) !== JSON.stringify(settings.location);
      settings = draft;
      store.set('settings', settings);
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
      renderGreeting();
      if (locChanged) loadWeather().then(renderWeather);
      if (interestsChanged) loadNews().then(renderNews);
      toast('설정을 저장했어요');
    });
  }

  /* ---------- 시작 ---------- */
  renderGreeting();
  initSeason();
  initSeasonDialog();
  initPhrase();
  initSchedule();
  initChecklist();
  initSettings();
  loadWeather().then(renderWeather);
  initNews();
  window.addEventListener('hashchange', route);
  route();

  setInterval(function () { renderGreeting(); if (ymd(viewDate) === ymd(new Date())) renderSchedule(); else renderNowNext(); }, 60 * 1000);
})();
