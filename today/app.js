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
    location: { mode: 'auto', name: '서울특별시', lat: 37.5665, lon: 126.978, cc: 'KR' }
  };
  var settings = Object.assign({}, DEFAULT_SETTINGS, store.get('settings', {}));

  /* ---------- 인사 ---------- */
  function renderGreeting() {
    var now = new Date();
    var h = now.getHours();
    var part = h < 5 ? '늦은 밤이에요' : h < 11 ? '좋은 아침이에요' : h < 14 ? '점심 맛있게 드세요' : h < 18 ? '오후도 힘내세요' : h < 22 ? '오늘 하루 수고했어요' : '편안한 밤 보내세요';
    var note = store.get('heroNote', '');
    $('greeting').textContent = note || (settings.name ? settings.name + '님, ' + part : part);
    $('note-btn').classList.toggle('has-note', !!note);
    $('today-label').textContent = (now.getMonth() + 1) + '월 ' + now.getDate() + '일 ' + DAYS[now.getDay()] + '요일';
  }

  /* 한 줄 메모: 지울 때까지 인사말 자리에 보여요 */
  function initNote() {
    var form = $('note-form'), btn = $('note-btn');
    var close = function () { form.hidden = true; btn.hidden = false; };
    btn.onclick = function () {
      $('note-input').value = store.get('heroNote', '');
      btn.hidden = true; form.hidden = false; $('note-input').focus();
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('note-input').value.trim();
      store.set('heroNote', v);
      close(); renderGreeting();
      toast(v ? '메모를 저장했어요' : '메모를 지웠어요');
    });
    $('note-del').onclick = function () { store.set('heroNote', ''); close(); renderGreeting(); toast('메모를 지웠어요'); };
    $('note-input').addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
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

  // 오늘 점수가 가장 높은 시즌을 보여줘요. 같은 점수가 여럿이면 함께.
  function showSeason(tops) {
    var s = tops[0].s, ph = tops[0].p;
    currentSeason = s;
    var root = document.documentElement;
    root.style.setProperty('--hero-a', s.scene.colors[0]);
    root.style.setProperty('--hero-b', s.scene.colors[1]);
    root.style.setProperty('--season', s.scene.accent);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.scene.colors[0]);
    $('season-name').textContent = tops.map(function (x) { return x.s.name; }).join(' · ');
    $('season-phase').textContent = phaseText(ph);
    $('season-phase').dataset.phase = ph ? ph.phase : 'off';
    var ids = tops.map(function (x) { return x.s.id; });
    var others = window.rankSeasons(new Date(), visibleSeasons()).filter(function (x) { return ids.indexOf(x.s.id) < 0; }).slice(0, 3);
    $('season-kw').innerHTML = others.map(function (x) {
      return '<button type="button" class="kw-chip" data-id="' + esc(x.s.id) + '"><span aria-hidden="true">' + esc(x.s.scene.motif[0] || '') + '</span>' + esc(x.s.name) + '</button>';
    }).join('');
    var motif = tops.length > 1 ? tops.slice(0, 2).map(function (x) { return x.s.scene.motif[0]; }) : s.scene.motif;
    $('hero-motif').innerHTML = motif.map(function (m) { return '<span>' + esc(m) + '</span>'; }).join('');
    scene.start(s.scene);
  }
  function initSeason() {
    var ranked = window.rankSeasons(new Date(), visibleSeasons());
    if (!ranked.length) {
      var f = visibleSeasons()[0] || window.SEASONS[0];
      showSeason([{ s: f, p: null }]);
      return;
    }
    var top = ranked[0].p.score;
    showSeason(ranked.filter(function (x) { return top - x.p.score < 0.001; }));
  }

  /* 시즌 목록 팝업: 보기 / 숨기기 / 직접 추가·삭제 */
  function sdRow(s, ph, until, hidden) {
    var sub = fmtMd(s.from) + '–' + fmtMd(s.to) + (until != null ? ' · ' + (until === 0 ? '오늘' : until + '일 후') + ' 시작' : '');
    var chip = ph ? '<span class="ph ' + ph.phase + '">' + esc(phaseText(ph)) + '</span>' : '';
    var act = hidden ? '<button type="button" class="ghost-btn sm" data-act="unhide">다시 보기</button>'
      : s.custom ? '<button type="button" class="ghost-btn sm danger" data-act="delete">삭제</button>'
      : '<button type="button" class="ghost-btn sm" data-act="hide">숨기기</button>';
    return '<li class="sd-row' + (currentSeason && currentSeason.id === s.id ? ' on' : '') + '" data-id="' + esc(s.id) + '">' +
      '<span class="sd-main' + (hidden ? ' off' : '') + '">' +
      '<span class="sd-emoji" style="--a:' + s.scene.colors[0] + ';--b:' + s.scene.colors[1] + '" aria-hidden="true">' + esc(s.scene.motif[0] || '✨') + '</span>' +
      '<span class="sd-text"><b>' + esc(s.name) + (s.custom ? ' <span class="tl-tag">내가 추가</span>' : '') + '</b><span>' + sub + ' · <span class="w">' + dots(s.w) + '</span></span></span>' + chip +
      '</span>' + act + '</li>';
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
  function setSdView(v) {
    $('sd-cal-view').hidden = v !== 'cal';
    $('sd-list-view').hidden = v !== 'list';
    Array.prototype.forEach.call($('sd-tabs').children, function (b) { b.setAttribute('aria-selected', String(b.dataset.view === v)); });
  }
  // 1년 시즌 캘린더 (행 = 시즌, 열 = 월)
  function renderSeasonCal(focusId) {
    var today = new Date();
    var pct = function (d) { return (d / 365 * 100).toFixed(3) + '%'; };
    var seg = function (a, b, cls) {
      var x = mdDoy(a), y = mdDoy(b) + 1;
      if (y > x) return '<i class="' + cls + '" style="left:' + pct(x) + ';width:' + pct(y - x) + '"></i>';
      return '<i class="' + cls + '" style="left:' + pct(x) + ';width:' + pct(365 - x) + '"></i><i class="' + cls + '" style="left:0;width:' + pct(y) + '"></i>';
    };
    var ranked = window.rankSeasons(today, visibleSeasons());
    var activeIds = ranked.map(function (x) { return x.s.id; });
    // 지금 시즌을 순위대로 먼저, 나머지는 다가오는 순서
    var rest = visibleSeasons().filter(function (s) { return activeIds.indexOf(s.id) < 0; })
      .sort(function (a, b) { return daysUntil(a.from) - daysUntil(b.from); });
    var rows = ranked.map(function (x) { return x.s; }).concat(rest);
    var t = Math.round((Date.UTC(2001, today.getMonth(), today.getDate()) - Date.UTC(2001, 0, 1)) / 864e5) + 0.5;
    var html = '<div class="yc-row yc-head"><span class="yc-name"></span><span class="yc-months">' +
      Array.from({ length: 12 }, function (_, i) { return '<span>' + (i + 1) + '</span>'; }).join('') + '</span></div>';
    rows.forEach(function (s) {
      var on = focusId === s.id, active = activeIds.indexOf(s.id) >= 0;
      html += '<button type="button" class="yc-row' + (on ? ' on' : '') + (active ? ' active' : '') + '" data-sid="' + esc(s.id) + '">' +
        '<span class="yc-name"><span aria-hidden="true">' + esc(s.scene.motif[0] || '') + '</span>' + esc(s.name) + '</span>' +
        '<span class="yc-track">' + seg(s.from, s.to, 'yc-bar') + seg(s.peak[0], s.peak[1], 'yc-peak') + '<i class="yc-today" style="left:' + pct(t) + '"></i></span></button>';
    });
    $('sd-cal').innerHTML = html;
    var on = $('sd-cal').querySelector('.yc-row.on');
    // 선택한 시즌이 보이도록 팝업만 세로로 스크롤 (가로 스크롤은 건드리지 않음)
    if (on) setTimeout(function () {
      var dlg = $('season-dialog'), r = on.getBoundingClientRect(), d = dlg.getBoundingClientRect();
      if (r.bottom > d.bottom - 20 || r.top < d.top + 140) dlg.scrollTop += r.top - d.top - d.height / 2;
    }, 60);
  }
  function initSeasonDialog() {
    var dlg = $('season-dialog');
    var open = function (focusId) {
      renderSeasonDialog();
      setSdView('cal');
      renderSeasonCal(focusId);
      $('sd-form').hidden = true;
      openDialog(dlg);
    };
    $('season-open').onclick = function () { if (!travelMode) open(currentSeason && currentSeason.id); };
    $('season-kw').addEventListener('click', function (e) { var b = e.target.closest('.kw-chip'); if (b && !travelMode) open(b.dataset.id); });
    // 배경 이미지 빈 곳을 눌러도 캘린더
    $('hero').addEventListener('click', function (e) {
      if (!travelMode && (e.target === $('hero') || e.target === $('hero-canvas') || e.target.classList.contains('hero-inner'))) open(currentSeason && currentSeason.id);
    });
    $('sd-tabs').addEventListener('click', function (e) { var b = e.target.closest('.seg-btn'); if (b) setSdView(b.dataset.view); });
    $('sd-cal').addEventListener('click', function (e) {
      var r = e.target.closest('[data-sid]'); if (!r) return;
      renderSeasonCal(r.dataset.sid);
    });
    dlg.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var id = b.closest('.sd-row').dataset.id, s = findSeason(id), act = b.dataset.act;
      if (act === 'show') return;
      if (act === 'hide') { hiddenSeasons.push(id); toast(s.name + ' 시즌을 숨겼어요'); }
      if (act === 'unhide') { hiddenSeasons = hiddenSeasons.filter(function (x) { return x !== id; }); toast(s.name + ' 시즌을 다시 보여줘요'); }
      if (act === 'delete') {
        customSeasons = customSeasons.filter(function (x) { return x.id !== id; });
        hiddenSeasons = hiddenSeasons.filter(function (x) { return x !== id; });
        store.set('customSeasons', customSeasons);
        toast(s.name + ' 시즌을 삭제했어요');
      }
      store.set('hiddenSeasons', hiddenSeasons);
      initSeason();
      renderSeasonDialog();
    });
    $('sd-add').onclick = function () {
      setSdView('list');
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

  var SEOUL = { mode: 'auto', name: '서울특별시', lat: 37.5665, lon: 126.978, cc: 'KR', country: '대한민국' };
  try { localStorage.removeItem('pa:lastGeo'); } catch (e) { /* 무시 */ }
  function locate() {
    var loc = settings.location;
    if (loc.mode !== 'auto') return Promise.resolve(loc);
    if (!navigator.geolocation) return Promise.resolve(SEOUL);
    return new Promise(function (resolve) {
      var done = false;
      // 위치를 못 받으면 항상 서울특별시 (예전에 저장된 위치는 쓰지 않아요)
      var fallback = function () { if (!done) { done = true; resolve(SEOUL); } };
      setTimeout(fallback, 6000);
      try {
        navigator.geolocation.getCurrentPosition(function (pos) {
          if (done) return; done = true;
          var g = { mode: 'auto', lat: +pos.coords.latitude.toFixed(3), lon: +pos.coords.longitude.toFixed(3), name: '현재 위치' };
          getJSON('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + g.lat + '&longitude=' + g.lon + '&localityLanguage=ko', 4000)
            .then(function (r) { g.name = r.city || r.locality || r.principalSubdivision || g.name; g.cc = r.countryCode || ''; g.country = r.countryName || ''; })
            .catch(function () {})
            .then(function () { resolve(g); });
        }, fallback, { timeout: 5000, maximumAge: 30 * 60 * 1000 });
      } catch (e) { fallback(); }
    });
  }

  function loadWeather() {
    return locate().then(function (loc) {
      var q = 'latitude=' + loc.lat + '&longitude=' + loc.lon;
      var url = 'https://api.open-meteo.com/v1/forecast?' + q +
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m' +
        '&hourly=temperature_2m,precipitation_probability,weather_code' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,snowfall_sum,uv_index_max,sunrise,sunset' +
        '&timezone=auto&forecast_days=8&wind_speed_unit=ms';
      var base = getJSON(url);
      // 한국 안이면 기상청(KMA) 고해상도 모델 값으로 덮어써요. 기상청 모델에 없는 값(강수확률·자외선 등)은 기본 값 유지
      var inKorea = loc.lat > 32.5 && loc.lat < 39 && loc.lon > 124 && loc.lon < 132;
      var wx = !inKorea ? base : Promise.all([base, getJSON(url + '&models=kma_seamless').catch(function () { return null; })])
        .then(function (r) { return r[1] ? mergeModel(r[0], r[1]) : r[0]; });
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
        // 오늘 0~23시 기온 (출퇴근 시간 옷차림용)
        var day = d.current.time.slice(0, 10), today = [];
        d.hourly.time.forEach(function (t, i) { if (t.slice(0, 10) === day) today[+t.slice(11, 13)] = d.hourly.temperature_2m[i]; });
        return { source: d.source || 'open-meteo', lat: loc.lat, lon: loc.lon, place: loc.name, cc: loc.cc || '', country: loc.country || '', current: d.current, daily: d.daily, hours: hours, today: today, air: res[1], sample: false };
      }).catch(function () { return sampleWeather(loc); });
    }).catch(function () { return sampleWeather(null); });
  }
  function mergeModel(base, kma) {
    ['current', 'hourly', 'daily'].forEach(function (part) {
      var a = base[part], b = kma[part];
      if (!a || !b) return;
      Object.keys(b).forEach(function (k) {
        if (k === 'time' || k === 'interval') return;
        if (Array.isArray(b[k]) && Array.isArray(a[k])) {
          b[k].forEach(function (v, i) { if (v != null && i < a[k].length) a[k][i] = v; });
        } else if (b[k] != null && typeof b[k] !== 'object') a[k] = b[k];
      });
    });
    base.source = 'kma';
    return base;
  }
  function sampleWeather(loc) {
    var s = window.SAMPLE_WEATHER;
    return { lat: loc && loc.lat, lon: loc && loc.lon, place: (loc && loc.name) || s.place, cc: (loc && loc.cc) || '', country: (loc && loc.country) || '', current: s.current, daily: s.daily, hours: s.hourlyFrom(new Date().getHours()), today: s.todayTemps, air: s.air, sample: true };
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
    renderWeek(w);
    applyPlace(w);
  }
  /* 해외에 있으면 시즌 대신 도시 이름 + 국기 + 그 나라 여행 키워드 */
  var travelMode = false;
  function flagOf(cc) { return cc && cc.length === 2 ? String.fromCodePoint.apply(null, cc.toUpperCase().split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })) : '🌏'; }
  function applyPlace(w) {
    var cc = (w.cc || '').toUpperCase();
    if (!cc || cc === 'KR') { if (travelMode) { travelMode = false; $('hero').classList.remove('travel'); initSeason(); } return; }
    travelMode = true;
    var t = (window.TRAVEL || {})[cc] || { name: w.country || '해외', kw: ['현지 맛집', '로컬 시장', '기념품 쇼핑'] };
    // 가까운 인기 도시가 있으면 도시 키워드 우선
    var city = null, best = Infinity;
    (window.TRAVEL_CITIES || []).forEach(function (c) {
      if (w.lat == null) return;
      var dLat = (c.lat - w.lat) * 111, dLon = (c.lon - w.lon) * 111 * Math.cos(w.lat * Math.PI / 180), km = Math.sqrt(dLat * dLat + dLon * dLon);
      if (km <= c.r && km < best) { best = km; city = c; }
    });
    var kw = (city ? city.kw : t.kw).slice(0, 3), place = city ? city.name : w.place;
    var root = document.documentElement;
    root.style.setProperty('--hero-a', '#1d4e89');
    root.style.setProperty('--hero-b', '#7fb7e8');
    root.style.setProperty('--season', '#e8f4ff');
    $('hero').classList.add('travel');
    $('season-name').textContent = place;
    $('season-phase').textContent = flagOf(cc) + ' ' + t.name;
    $('season-phase').dataset.phase = 'travel';
    $('season-kw').innerHTML = kw.map(function (k) {
      return '<a class="kw-chip" href="https://www.google.com/maps/search/' + encodeURIComponent(k + ' ' + place) + '" target="_blank" rel="noopener">' + esc(k) + '</a>';
    }).join('');
    $('hero-motif').innerHTML = '<span>' + flagOf(cc) + '</span>';
    scene.start({ type: 'sun', accent: '#e8f4ff' });
  }
  // 향후 일주일 (오늘 포함 8일)
  function renderWeek(w) {
    var d = w.daily, n = d.temperature_2m_max.length;
    var lo = Math.min.apply(null, d.temperature_2m_min), hi = Math.max.apply(null, d.temperature_2m_max), span = Math.max(1, hi - lo);
    var base = new Date();
    var rows = [];
    for (var i = 0; i < n; i++) {
      var day = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      var info = wmo(d.weather_code[i]), mn = Math.round(d.temperature_2m_min[i]), mx = Math.round(d.temperature_2m_max[i]);
      var label = i === 0 ? '오늘' : i === 1 ? '내일' : DAYS[day.getDay()] + '요일';
      var pop = d.precipitation_probability_max[i] || 0;
      rows.push('<li class="wk-row' + (day.getDay() === 0 ? ' sun' : day.getDay() === 6 ? ' sat' : '') + '">' +
        '<span class="wk-day"><b>' + label + '</b><span>' + (day.getMonth() + 1) + '/' + day.getDate() + '</span></span>' +
        '<span class="wk-ico" title="' + esc(info[0]) + '" aria-label="' + esc(info[0]) + '">' + info[1] + '</span>' +
        '<span class="wk-pop">' + (pop >= 20 ? pop + '%' : '') + '</span>' +
        '<span class="wk-temp mono"><span class="lo">' + mn + '°</span>' +
        '<span class="wk-bar"><i style="left:' + ((mn - lo) / span * 100) + '%;right:' + ((hi - mx) / span * 100) + '%"></i></span>' +
        '<span class="hi">' + mx + '°</span></span></li>');
    }
    $('wk-list').innerHTML = rows.join('');
    $('wk-place').textContent = w.sample ? '예시 날씨' : w.place;
  }

  /* ---------- 옷차림 / 준비물 ----------
     내 룰: 출퇴근 시간(10시·20시) 기온 기준. 일교차에 따라 방한템/쿨링템 추가.
     min 이상이면 그 구간 (위에서부터 확인). 기온은 반올림한 정수로 비교 */
  var OUTFIT = [
    { name: '한여름', emoji: '🔥', min: 28, items: ['반팔', '나시', '반바지'], plus: ['샌들'] },
    { name: '여름', emoji: '☀️', min: 24, items: ['반팔', '얇은 가디건'], plus: ['샌들'] },
    { name: '초여름', emoji: '🌿', min: 19, items: ['외투 없는 긴팔', '얇은 외투 걸친 반팔'], plus: ['스카프'] },
    { name: '봄가을', emoji: '🌸', min: 14, items: ['가디건', '자켓', '트렌치코트', '긴팔'], plus: ['스카프', '스타킹'] },
    { name: '환절기', emoji: '🍂', min: 9, items: ['얇은 코트', '얇은 패딩', '두꺼운 가디건', '가죽점퍼', '얇은 니트', '긴팔', '숄 가디건'], plus: ['스카프/얇은 목도리', '스타킹'] },
    { name: '초겨울', emoji: '💨', min: 4, items: ['얇은 코트', '무스탕', '얇은 패딩', '겨울니트'], plus: ['스카프/얇은 목도리', '부츠', '스타킹'] },
    { name: '겨울', emoji: '⛄', min: -3, items: ['코트', '패딩', '무스탕', '퍼', '겨울니트'], plus: ['목도리', '부츠', '스타킹'] },
    { name: '한겨울', emoji: '❄️', min: -99, items: ['패딩', '퍼', '겨울니트'], plus: ['목도리', '부츠', '두꺼운 스타킹'] }
  ];
  var COMMUTE = [10, 20]; // 출근, 퇴근 시각
  var cloneRules = function (r) { return JSON.parse(JSON.stringify(r)); };
  var outfitRules = store.get('outfitRules3', null) || cloneRules(OUTFIT);
  var lastWeather = null;
  var bandIndex = function (t) { var r = Math.round(t), i = outfitRules.findIndex(function (o) { return r >= o.min; }); return i < 0 ? outfitRules.length - 1 : i; };
  var splitList = function (v) { return v.split(',').map(function (x) { return x.trim(); }).filter(Boolean); };

  function renderRuleEditor(rules) {
    $('rule-list').innerHTML = rules.map(function (r, i) {
      var last = i === rules.length - 1;
      return '<li class="rule-row">' +
        '<input class="rule-name" value="' + esc((r.emoji ? r.emoji + ' ' : '') + r.name) + '" maxlength="12" aria-label="구간 이름">' +
        '<span class="rule-min">' + (last ? '<span class="rule-else">그보다 추울 때</span>' :
          '<input type="number" class="rule-num" value="' + r.min + '" min="-30" max="45" aria-label="기준 기온"><span>° 이상</span>') + '</span>' +
        (rules.length > 2 && !last ? '<button type="button" class="icon-mini rule-del" data-del="' + i + '" aria-label="구간 삭제">✕</button>' : '<span class="rule-del"></span>') +
        '<label class="rule-l items">옷<input class="rule-items" value="' + esc(r.items.join(', ')) + '" placeholder="쉼표로 구분"></label>' +
        '<label class="rule-l plus">+아이템<input class="rule-plus" value="' + esc((r.plus || []).join(', ')) + '" placeholder="목도리, 부츠…"></label>' +
        '</li>';
    }).join('');
  }
  function readRuleEditor() {
    var rows = Array.prototype.map.call(document.querySelectorAll('#rule-list .rule-row'), function (li, i, all) {
      var num = li.querySelector('.rule-num');
      var nm = li.querySelector('.rule-name').value.trim();
      var m = nm.match(/^(\S+)\s+(.+)$/);
      var emoji = m && !/[가-힣A-Za-z0-9]/.test(m[1]) ? m[1] : '';
      return {
        name: emoji ? m[2] : nm || '구간', emoji: emoji,
        min: i === all.length - 1 ? -99 : (num && num.value !== '' ? +num.value : 0),
        items: splitList(li.querySelector('.rule-items').value),
        plus: splitList(li.querySelector('.rule-plus').value)
      };
    });
    var last = rows.pop();
    rows.sort(function (a, b) { return b.min - a.min; });
    return rows.concat([last]);
  }
  function initRules() {
    $('rule-open').onclick = function () { renderRuleEditor(outfitRules); openDialog($('rule-dialog')); };
    $('rule-add-row').onclick = function () {
      var r = readRuleEditor(); r.splice(r.length - 1, 0, { name: '새 구간', emoji: '', min: 0, items: [], plus: [] }); renderRuleEditor(r);
    };
    $('rule-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-del]'); if (!b) return;
      var r = readRuleEditor(); r.splice(+b.dataset.del, 1); renderRuleEditor(r);
    });
    $('rule-reset').onclick = function () { renderRuleEditor(OUTFIT); };
    $('rule-form').addEventListener('submit', function (e) {
      e.preventDefault();
      outfitRules = readRuleEditor().filter(function (r) { return r.items.length || r.plus.length; });
      if (!outfitRules.length || outfitRules[outfitRules.length - 1].min !== -99) outfitRules.push(cloneRules(OUTFIT[OUTFIT.length - 1]));
      store.set('outfitRules3', outfitRules);
      closeDialog($('rule-dialog'));
      if (lastWeather) renderOutfit(lastWeather);
      toast('옷차림 룰을 저장했어요');
    });
  }

  function renderOutfit(w) {
    lastWeather = w;
    var d = w.daily, today = w.today || [];
    var tAt = function (h) { return today[h] != null ? today[h] : (d.temperature_2m_min[0] + d.temperature_2m_max[0]) / 2; };
    var tIn = tAt(COMMUTE[0]), tOut = tAt(COMMUTE[1]);
    var midday = Math.max.apply(null, [11, 12, 13, 14, 15, 16, 17].map(tAt));
    var iIn = bandIndex(tIn), iOut = bandIndex(tOut), iMid = bandIndex(midday);
    var band = outfitRules[iIn];
    var chip = function (b) {
      return '<li class="' + (b.lvl ? 'lvl-' + b.lvl : '') + (b.cls ? ' ' + b.cls : '') + '"' + (b.why ? ' title="' + esc(b.why) + '"' : '') + '>' +
        (b.ico ? '<span aria-hidden="true">' + b.ico + '</span>' : '') + esc(b.t) + (b.v ? ' <b class="mono">' + esc(b.v) + '</b>' : '') + '</li>';
    };

    var wear = band.items.map(function (t) { return { t: t, why: band.name + ' · 출근 ' + COMMUTE[0] + '시 ' + Math.round(tIn) + '°' }; })
      .concat((band.plus || []).map(function (t) { return { t: '+' + t, cls: 'plus' }; }));

    // 일교차: 퇴근길이 더 추운 구간이면 방한템, 낮이 두 구간 이상 더우면 쿨링템
    var extra = [];
    if (iOut > iIn) {
      var outBand = outfitRules[iOut];
      var mine = band.plus || [];
      var warm = (outBand.plus || []).filter(function (t) { return mine.indexOf(t) < 0; });
      if (!warm.length) warm = [outBand.items[0] + ' 한 겹'];
      warm.forEach(function (t) { extra.push({ t: '+' + t, lvl: 'mid', why: '퇴근 ' + COMMUTE[1] + '시 ' + Math.round(tOut) + '° 대비' }); });
    }
    if (iIn - iMid >= 2 || midday - tIn >= 8) {
      extra.push({ t: '+벗기 쉬운 겉옷', lvl: 'mid', why: '낮 ' + Math.round(midday) + '° 대비' });
      if (midday >= 24) extra.push({ t: '+손풍기', lvl: 'mid', why: '낮 ' + Math.round(midday) + '° 대비' });
    }
    // 일교차 아이템도 같은 줄에 이어서
    $('outfit-list').innerHTML = wear.concat(extra).map(chip).join('');

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
    if (air && (air.pm2_5 > 35 || air.pm10 > 80)) bring.push({ ico: '😷', t: 'KF94 마스크', v: '먼지 나쁨', lvl: 'high', why: '미세 ' + Math.round(air.pm10) + ' · 초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    else if (air && (air.pm2_5 > 15 || air.pm10 > 30)) bring.push({ ico: '😷', t: '마스크', v: '먼지 보통', why: '초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    var uv = d.uv_index_max[0];
    var sunny = codes.slice(0, 8).filter(function (c) { return c <= 1; }).length >= 4;
    if (uv >= 6 || (uv >= 4 && sunny)) bring.push({ ico: '🕶️', t: '선글라스', v: 'UV ' + Math.round(uv), lvl: uv >= 8 ? 'high' : 'mid', why: '자외선이 강하거나 햇빛이 쨍해요' });
    if (uv >= 7 || d.temperature_2m_max[0] >= 30) bring.push({ ico: '🧢', t: '모자', v: uv >= 7 ? 'UV ' + Math.round(uv) : Math.round(d.temperature_2m_max[0]) + '°', lvl: 'mid' });
    if (w.current.wind_speed_10m >= 8) bring.push({ ico: '🌬️', t: '바람막이', v: Math.round(w.current.wind_speed_10m) + 'm/s', lvl: 'mid' });
    if (d.temperature_2m_min[0] <= 0) bring.push({ ico: '🔥', t: '핫팩', v: Math.round(d.temperature_2m_min[0]) + '°', lvl: 'mid' });
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
  }
  var phraseAt = function (day) { var l = window.PHRASES; return l[((day % l.length) + l.length) % l.length]; };
  // 처음 연 날부터 오늘까지 하루 하나씩 본 표현 (최신순, 중복 제외)
  function studiedPhrases() {
    var start = store.get('enStart', null), today = dayIndex();
    if (start === null || start > today) { start = today; store.set('enStart', start); }
    var seen = {}, out = [];
    for (var d = today; d >= start && out.length < window.PHRASES.length; d--) {
      var p = phraseAt(d);
      if (!seen[p.en]) { seen[p.en] = 1; out.push(p); }
    }
    return out;
  }
  function renderStudied() {
    var q = $('en-search').value.trim().toLowerCase();
    var all = studiedPhrases();
    var list = q ? all.filter(function (p) { return (p.en + ' ' + p.ko + ' ' + p.when).toLowerCase().indexOf(q) >= 0; }) : all;
    $('en-hist-count').textContent = q ? list.length + ' / ' + all.length + '개' : all.length + '개';
    $('en-hist').innerHTML = list.length ? list.map(function (p) {
      return '<li><p class="eh-en" lang="en">' + esc(p.en) + '</p><p class="eh-ko">' + esc(p.ko) + '</p></li>';
    }).join('') : '<li class="empty">“' + esc(q) + '”에 맞는 표현이 없어요.</li>';
  }
  function initPhrase() {
    phraseIdx = dayIndex();
    renderPhrase();
    studiedPhrases();
    $('en-history').onclick = function () { $('en-search').value = ''; renderStudied(); openDialog($('en-dialog')); };
    $('en-search').addEventListener('input', renderStudied);
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
  /* 카테고리: 직접 추가·삭제, 색 지정 */
  var CAT_PALETTE = ['#3b6fe0', '#8a5cd6', '#e0782a', '#2f9e6a', '#d64a7a', '#c9a227', '#1f9bb0', '#7a6a5a'];
  var DEFAULT_CATS = [
    { id: 'meeting', name: '회의', color: '#3b6fe0' }, { id: 'focus', name: '집중 업무', color: '#8a5cd6' },
    { id: 'personal', name: '개인', color: '#e0782a' }, { id: 'health', name: '운동·건강', color: '#2f9e6a' }
  ];
  var cats = store.get('categories', null) || DEFAULT_CATS.slice();
  var saveCats = function () { store.set('categories', cats); };
  function catOf(id) { return cats.find(function (c) { return c.id === id; }) || { id: '', name: '기타', color: '#8a94a6' }; }
  function renderCats() {
    var sel = $('sch-cat'), cur = sel.value;
    sel.innerHTML = cats.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.name) + '</option>'; }).join('');
    if (cur && cats.some(function (c) { return c.id === cur; })) sel.value = cur;
    $('cat-legend').innerHTML = cats.map(function (c) {
      return '<span class="cat-chip" style="--c:' + c.color + '"><i></i>' + esc(c.name) + '</span>';
    }).join('') + '<button type="button" class="link-btn sm" data-open-cats>편집</button>';
    $('cat-list').innerHTML = cats.map(function (c, i) {
      return '<li class="cat-row" data-id="' + esc(c.id) + '">' +
        '<input type="color" class="cat-color" value="' + c.color + '" aria-label="' + esc(c.name) + ' 색">' +
        '<input class="cat-name" value="' + esc(c.name) + '" maxlength="12" aria-label="카테고리 이름">' +
        '<span class="cat-move">' +
          '<button type="button" data-cat-move="-1" aria-label="' + esc(c.name) + ' 위로"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" data-cat-move="1" aria-label="' + esc(c.name) + ' 아래로"' + (i === cats.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '</span>' +
        '<button type="button" class="icon-mini" data-del-cat aria-label="' + esc(c.name) + ' 삭제">✕</button></li>';
    }).join('');
    $('cat-new-color').value = CAT_PALETTE[cats.length % CAT_PALETTE.length];
  }
  function initCats() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-open-cats]')) { renderCats(); openDialog($('cat-dialog')); }
    });
    $('cat-list').addEventListener('change', function (e) {
      var row = e.target.closest('.cat-row'), c = cats.find(function (x) { return x.id === row.dataset.id; });
      if (e.target.classList.contains('cat-color')) c.color = e.target.value;
      if (e.target.classList.contains('cat-name')) c.name = e.target.value.trim() || c.name;
      saveCats(); renderCats(); renderSchedule();
    });
    $('cat-list').addEventListener('click', function (e) {
      var mv = e.target.closest('[data-cat-move]');
      if (mv && !mv.disabled) {
        var id0 = mv.closest('.cat-row').dataset.id, i0 = cats.findIndex(function (c) { return c.id === id0; }), j0 = i0 + +mv.dataset.catMove;
        var moved = cats.splice(i0, 1)[0]; cats.splice(j0, 0, moved);
        saveCats(); renderCats(); renderSchedule();
        var again = document.querySelector('#cat-list .cat-row[data-id="' + id0 + '"] [data-cat-move="' + mv.dataset.catMove + '"]');
        if (again && !again.disabled) again.focus();
        return;
      }
      var b = e.target.closest('[data-del-cat]'); if (!b) return;
      if (cats.length <= 1) { toast('카테고리는 하나 이상 있어야 해요'); return; }
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '삭제?'; b.classList.add('armed'); return; }
      var id = b.closest('.cat-row').dataset.id;
      cats = cats.filter(function (c) { return c.id !== id; });
      saveCats(); renderCats(); renderSchedule();
    });
    $('cat-new').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('cat-new-name').value.trim();
      if (!name) { $('cat-new-name').focus(); return; }
      var c = { id: 'c' + Date.now().toString(36), name: name, color: $('cat-new-color').value };
      cats.push(c); saveCats();
      $('cat-new-name').value = '';
      renderCats();
      $('sch-cat').value = c.id;
      toast('“' + name + '” 카테고리를 추가했어요');
    });
    renderCats();
  }
  var viewDate = new Date();
  var schedules = store.get('schedules', null);
  if (schedules === null) {
    // 첫 방문: 예시 일정
    var t = ymd(new Date());
    schedules = {};
    var plus = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return ymd(d); };
    var ex = function (id, start, title, cat, extra) { return Object.assign({ id: id, start: start, end: '', title: title, cat: cat, place: '', memo: '', sample: true }, extra || {}); };
    schedules[t] = [
      ex('s1', '09:30', '데일리 스탠드업', 'meeting', { end: '10:00', memo: '어제 한 일 / 오늘 할 일 / 막힌 것' }),
      ex('s2', '', '출근', 'focus'),
      ex('s3', '14:00', '디자인 리뷰: 대출 신청 화면', 'meeting', { end: '15:00', important: true, place: '12층 회의실' }),
      ex('s4', '19:30', '필라테스', 'health', { end: '20:30' })
    ];
    schedules[plus(1)] = [ex('s5', '10:00', '피티', 'health'), ex('s6', '13:00', '친구 점심', 'personal'), ex('s7', '', '장보기', 'personal', { important: true })];
    schedules[plus(2)] = [ex('s8', '', '세탁소', 'personal'), ex('s9', '', '공과금 납부', 'personal'), ex('s10', '18:00', '영화', 'personal', { important: true })];
    schedules[plus(4)] = [ex('s11', '', '조식', 'personal'), ex('s12', '', '출근', 'focus'), ex('s13', '', '마사지', 'health')];
  }
  var saveSchedules = function () { store.set('schedules', schedules); };
  var toMin = function (hm) { if (!hm) return -1; var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  var parseYmd = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

  // 팝업이 열려 있는 동안 뒤 화면이 스크롤되지 않게 고정 (iOS는 body를 fixed로 묶어야 확실해요)
  var lockY = 0;
  function syncScrollLock() {
    var anyOpen = !!document.querySelector('dialog[open]');
    var locked = document.body.classList.contains('modal-open');
    if (anyOpen && !locked) {
      lockY = window.scrollY;
      document.body.style.top = -lockY + 'px';
      document.body.classList.add('modal-open');
    } else if (!anyOpen && locked) {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      window.scrollTo(0, lockY);
    }
  }
  var typing = function () { var a = document.activeElement; return a && a.matches && a.matches('input:not([type=checkbox]), textarea, select'); };
  // 키보드가 닫힌 뒤 iOS가 남긴 화면 밀림만 되돌려요 (입력 중에는 건드리지 않음)
  function resetModalScroll() {
    if (document.body.classList.contains('modal-open') && !typing() && window.scrollY !== 0) window.scrollTo(0, 0);
  }
  // 키보드가 올라오면 열린 팝업을 키보드 위 보이는 영역 안에 맞추고, 입력칸이 보이게 스크롤
  function fitDialogToKeyboard() {
    var vv = window.visualViewport, d = document.querySelector('dialog[open]');
    if (!vv || !d) return;
    var kbOpen = vv.height < window.innerHeight - 80;
    if (kbOpen) {
      d.style.margin = '0 auto';
      d.style.top = (vv.offsetTop + 8) + 'px';
      d.style.bottom = 'auto';
      d.style.maxHeight = (vv.height - 16) + 'px';
      var a = document.activeElement;
      if (a && d.contains(a)) setTimeout(function () { a.scrollIntoView({ block: 'center' }); }, 30);
    } else {
      d.style.margin = d.style.top = d.style.bottom = d.style.maxHeight = '';
    }
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitDialogToKeyboard);
    window.visualViewport.addEventListener('scroll', fitDialogToKeyboard);
  }
  document.addEventListener('focusin', function () { setTimeout(fitDialogToKeyboard, 300); });
  document.addEventListener('focusout', function () { setTimeout(function () { fitDialogToKeyboard(); resetModalScroll(); }, 120); });
  function openDialog(d) { if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', ''); syncScrollLock(); }
  function closeDialog(d) { if (d.close) d.close(); else d.removeAttribute('open'); syncScrollLock(); }
  // Esc·폼 닫기 등 어떤 방식으로 닫혀도 고정 해제
  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (d) {
    d.addEventListener('close', function () { setTimeout(syncScrollLock, 0); });
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) closeDialog(c.closest('dialog'));
    // 바깥(배경) 클릭으로 닫기
    if (e.target.tagName === 'DIALOG' && e.target.classList.contains('sheet')) {
      var r = e.target.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeDialog(e.target);
    }
  });

  // 시간 있는 일정만 시간순으로 정렬하고, 시간 없는 일정은 적은 순서 자리를 지켜요
  var hhmm = function (t) { return t ? t.replace(':', '') : ''; };
  function weekKey(d) { var m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return ymd(m); }
  // 선택한 날의 타임라인. 시간 없는 일정은 위에 '종일'로 적은 순서대로
  function renderSchedule() {
    var key = ymd(viewDate), todayKey = ymd(new Date());
    var all = schedules[key] || [];
    var untimed = all.filter(function (s) { return !s.start; });
    var list = all.filter(function (s) { return s.start; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var diff = Math.round((parseYmd(key) - parseYmd(todayKey)) / 864e5);
    $('day-today').textContent = diff === 0 ? '오늘' : (viewDate.getMonth() + 1) + '/' + viewDate.getDate() + ' (' + DAYS[viewDate.getDay()] + ')';
    $('sch-h').textContent = diff === 0 ? '오늘 일정' : diff === 1 ? '내일 일정' : diff === -1 ? '어제 일정' : (viewDate.getMonth() + 1) + '월 ' + viewDate.getDate() + '일 일정';
    $('sample-banner').hidden = !all.some(function (s) { return s.sample; });
    $('timeline-empty').hidden = all.length > 0;

    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var card = function (s, state, timeLabel, rel) {
      var openEnded = !s.end; // 시간 미정·종료 시간 없는 일정은 직접 완료 처리
      return '<li class="tl-item ' + state + (s.important ? ' imp' : '') + (s.done ? ' done' : '') + (openEnded ? ' has-done' : '') + '" style="--c: ' + catOf(s.cat).color + '">' +
        '<span class="tl-time">' + timeLabel + '</span><span class="tl-dot"></span>' +
        '<button type="button" class="tl-card" data-id="' + s.id + '">' +
        '<span class="tl-title">' + esc(s.title) + (s.sample ? ' <span class="tl-tag">예시</span>' : '') + '</span>' +
        (function () {
          var meta = [s.start ? s.start + (s.end ? '–' + s.end : '') : '', s.place ? esc(s.place) : ''].filter(Boolean).join(' · ') + (rel || '');
          return meta ? '<span class="tl-meta">' + meta.replace(/^ · /, '') + '</span>' : '';
        })() +
        (s.memo ? '<span class="tl-memo">' + esc(s.memo) + '</span>' : '') +
        '</button>' +
        (openEnded ? '<button type="button" class="tl-done" data-done="' + s.id + '" aria-pressed="' + !!s.done + '" aria-label="' + esc(s.title) + (s.done ? ' 완료 취소' : ' 완료') + '">' + (s.done ? '✓ 완료' : '완료') + '</button>' : '') +
        '</li>';
    };
    var html = '';
    var nowPlaced = diff !== 0;
    list.forEach(function (s) {
      var st = toMin(s.start), en = s.end ? toMin(s.end) : null;
      if (!nowPlaced && nowMin < st) { html += nowRow(now); nowPlaced = true; }
      // 종료 시간이 없으면 '완료'를 누를 때까지 진행 중
      var state = s.done || diff < 0 ? 'past' : diff > 0 ? '' : en != null && en <= nowMin ? 'past' : st <= nowMin ? 'current' : '';
      var rel = '';
      if (s.done) rel = ' · 완료';
      else if (state === 'current') rel = ' · 진행 중';
      else if (diff === 0 && !state) { var m = st - nowMin; rel = m < 60 ? ' · ' + m + '분 후' : ''; }
      html += card(s, state, s.start, rel);
      if (!nowPlaced && state === 'current') { html += nowRow(now); nowPlaced = true; }
    });
    if (!nowPlaced && list.length) html += nowRow(now);
    html += untimed.map(function (s) { return card(s, diff < 0 || s.done ? 'past' : '', '미정'); }).join('');
    $('timeline').innerHTML = html;
    renderNowNext();
  }
  function nowRow(now) {
    return '<li class="tl-now" aria-label="현재 시각"><span class="tl-time">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</span><span class="now-dot"></span><span class="now-line"></span></li>';
  }

  // 오늘 버튼 → 다가오는 일정: 날짜 + 키워드 (지난 날은 숨김, 주가 바뀌면 간격)
  var hhmm = function (t) { return t ? t.replace(':', '') : ''; };
  function weekKey(d) { var m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return ymd(m); }
  // 시간 있는 일정은 시간순, 시간 없는 일정은 적은 순서대로 맨 뒤
  function orderDay(list) {
    var timed = list.filter(function (s) { return s.start; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    return timed.concat(list.filter(function (s) { return !s.start; }));
  }
  function renderUpcoming() {
    var now = new Date(), todayKey = ymd(now);
    var keys = Object.keys(schedules).filter(function (k) { return k >= todayKey && schedules[k].length; }).sort();
    $('up-empty').hidden = keys.length > 0;
    var html = '', lastWeek = null;
    keys.forEach(function (k) {
      var d = parseYmd(k), wk = weekKey(d);
      if (lastWeek && wk !== lastWeek) html += '<li class="dl-gap" aria-hidden="true"></li>';
      lastWeek = wk;
      var sameMonth = d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      var label = (sameMonth ? d.getDate() : (d.getMonth() + 1) + '/' + d.getDate()) + DAYS[d.getDay()];
      html += '<li><button type="button" class="dl-row' + (k === ymd(viewDate) ? ' on' : '') + (d.getDay() === 0 ? ' sun' : d.getDay() === 6 ? ' sat' : '') + '" data-key="' + k + '">' +
        '<span class="dl-date">' + label + (k === todayKey ? '<em>오늘</em>' : '') + '</span><span class="dl-items">' +
        orderDay(schedules[k]).map(function (s, i) {
          return (i ? '<span class="dl-sep">-</span>' : '') + '<span class="dl-item' + (s.important ? ' imp' : '') + '" style="--c:' + catOf(s.cat).color + '">' +
            (s.start ? '<span class="dl-time">' + hhmm(s.start) + '</span>' : '') + esc(s.title) + '</span>';
        }).join('') + '</span></button></li>';
    });
    $('uplist').innerHTML = html;
  }

  /* 지금 · 다음 (홈 상단 요약) */
  function relLabel(m) { return m < 60 ? m + '분 후' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : '') + ' 후'; }
  // 시간 있는 일정 우선, 비는 시간에는 시간 미정 일정을 쌓인 순서대로 보여줘요
  function renderNowNext() {
    var key = ymd(new Date()), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    var all = (schedules[key] || []).filter(function (s) { return !s.done; }); // 완료한 일정은 빼요
    var list = all.filter(function (s) { return s.start; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
    var todo = all.filter(function (s) { return !s.start; });
    // 종료 시간 없는 일정은 시작 뒤 완료 전까지 진행 중 (가장 최근에 시작한 것)
    var running = list.filter(function (s) { return toMin(s.start) <= nm && (s.end ? nm < toMin(s.end) : true); });
    var cur = running[running.length - 1];
    var next = list.find(function (s) { return toMin(s.start) > nm; });
    var curTodo = null, nextTodo = null;
    if (!cur) curTodo = todo[0] || null;
    if (!next) nextTodo = todo[curTodo ? 1 : 0] || null;
    var item = function (s, kind, label, bar) {
      return '<button type="button" class="nn-item ' + kind + (s.important ? ' imp' : '') + '" data-id="' + s.id + '" style="--c: ' + catOf(s.cat).color + '">' +
        '<span class="nn-label">' + label + '</span>' +
        '<span class="nn-title">' + esc(s.title) + '</span>' +
        '<span class="nn-meta">' + (s.start ? s.start + (s.end ? '–' + s.end : '') : '시간 미정') + (s.place ? ' · ' + esc(s.place) : '') + '</span>' +
        (bar != null ? '<span class="nn-bar"><i style="width:' + bar + '%"></i></span>' : '') + '</button>';
    };
    var idle = function (label, text) { return '<div class="nn-item idle"><span class="nn-label">' + label + '</span><span class="nn-title">' + text + '</span></div>'; };
    var html = '';
    if (cur && !cur.end) {
      html += item(cur, 'current', '진행 중 · ' + (nm - toMin(cur.start)) + '분째');
    } else if (cur) {
      var st = toMin(cur.start), en = toMin(cur.end);
      html += item(cur, 'current', '진행 중 · ' + (en - nm) + '분 남음', Math.round((nm - st) / (en - st) * 100));
    } else if (curTodo) html += item(curTodo, 'current', '지금 할 일');
    else html += idle('지금', '비어 있는 시간이에요');
    if (next) html += item(next, 'next', '다음 · ' + relLabel(toMin(next.start) - nm));
    else if (nextTodo) html += item(nextTodo, 'next', '다음 할 일');
    else html += idle('다음', '오늘 남은 일정이 없어요');
    $('nn').innerHTML = html;
  }
  // 일정 섹션 머리를 화면 높이 10% 지점에 두고 즉시 이동 (애니메이션 없이 → 화면이 튀지 않게)
  function placeSchedulePanel() {
    var panel = $('schedule-panel');
    requestAnimationFrame(function () {
      var top = panel.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.1;
      window.scrollTo(0, Math.max(0, top));
    });
  }
  // 날짜를 바꿔도 일정 섹션 머리가 화면에서 제자리에 있도록
  var holdTimer;
  function keepScheduleInPlace(fn) {
    var panel = $('schedule-panel'), before = panel.getBoundingClientRect().top;
    // 내용이 짧아져도 화면이 끌려 올라가지 않게 지금 높이를 잠시 유지
    var home = $('view-home');
    home.style.minHeight = home.offsetHeight + 'px';
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function release() {
      // 사용자가 위로 스크롤했거나 여유 공간이 화면 밖이면 풀어요
      home.style.minHeight = '';
      if (home.offsetHeight < window.scrollY + window.innerHeight) { home.style.minHeight = (window.scrollY + window.innerHeight) + 'px'; holdTimer = setTimeout(release, 4000); }
    }, 4000);
    fn();
    var diff = panel.getBoundingClientRect().top - before;
    if (Math.abs(diff) > 1) window.scrollBy(0, diff);
  }
  function scrollToSchedule(id) {
    viewDate = new Date();
    renderSchedule();
    placeSchedulePanel();
    if (id) {
      var card = document.querySelector('.tl-card[data-id="' + id + '"]');
      if (card) { card.classList.remove('flash'); void card.offsetWidth; card.classList.add('flash'); }
    }
  }

  /* 추가·수정 팝업 */
  // 네이버 지도 검색 (폰에 네이버 지도 앱이 있으면 앱으로 열 수 있어요)
  function naverMap(q) { return 'https://map.naver.com/p/search/' + encodeURIComponent(q); }
  // 해외 일정: "장소, 도시" 그대로 구글맵에서 검색 (예: Ichiran Shibuya, Tokyo)
  function googleMap(q) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q); }
  function mapOf(place, abroad) { return abroad ? { href: googleMap(place), label: '구글맵' } : { href: naverMap(place), label: '네이버 지도' }; }
  function syncPlaceLink() {
    var abroad = $('sch-abroad').checked;
    $('sch-place').placeholder = abroad ? '예: Ichiran Shibuya, Tokyo' : '예: 강남역 스타벅스';
    var v = $('sch-place').value.trim();
    $('sch-place-map').hidden = !v;
    if (v) { var m = mapOf(v, abroad); $('sch-place-map').href = m.href; $('sch-place-map').textContent = m.label + '에서 확인 ›'; $('sch-place-map').classList.toggle('google', abroad); }
  }
  function setTimeFields(on) {
    Array.prototype.forEach.call(document.querySelectorAll('.time-field'), function (f) { f.hidden = !on; });
  }
  function openForm(item, dateKey) {
    var key = dateKey || ymd(viewDate);
    $('sch-id').value = item ? item.id : '';
    $('sch-id').dataset.orig = item ? key : '';
    $('sch-title').value = item ? item.title : '';
    $('sch-date').value = key;
    $('sch-place').value = item ? item.place || '' : '';
    $('sch-memo').value = item ? item.memo || '' : '';
    setTimeout(function () { fitText($('sch-memo')); }, 0);
    $('sch-abroad').checked = !!(item && item.abroad);
    syncPlaceLink();
    renderCats();
    $('sch-cat').value = item && cats.some(function (c) { return c.id === item.cat; }) ? item.cat : cats[0].id;
    $('sch-imp').checked = !!(item && item.important);
    var timed = !!(item && item.start);
    $('sch-timed').checked = timed;
    $('sch-start').value = timed ? item.start : '';
    $('sch-end').value = timed ? item.end || '' : '';
    setTimeFields(timed);
    $('sch-dialog-h').textContent = item ? '일정 수정' : '일정 추가';
    $('sch-submit').textContent = item ? '수정 저장' : '일정 추가';
    $('sch-error').hidden = true;
    openDialog($('sch-dialog'));
    setTimeout(function () { $('sch-title').focus(); }, 30);
  }

  /* 상세 팝업 */
  var detail = null; // { key, id }
  function findItem(key, id) { return (schedules[key] || []).find(function (s) { return s.id === id; }); }
  // 모든 일정을 날짜 → (시간순, 시간 미정은 뒤) 순서로 이어 붙인 목록
  function allEventsOrdered() {
    var out = [];
    Object.keys(schedules).sort().forEach(function (k) { orderDay(schedules[k] || []).forEach(function (s) { out.push({ key: k, id: s.id }); }); });
    return out;
  }
  function stepDetail(dir) {
    var list = allEventsOrdered(), i = list.findIndex(function (x) { return x.key === detail.key && x.id === detail.id; });
    var t = list[i + dir]; if (!t) return;
    if (t.key !== ymd(viewDate)) { viewDate = parseYmd(t.key); renderSchedule(); }
    openDetail(t.key, t.id);
  }
  function openDetail(key, id) {
    var s = findItem(key, id);
    if (!s) return;
    detail = { key: key, id: id };
    var d = parseYmd(key);
    renderDetailCat(s);
    var order = allEventsOrdered(), pos = order.findIndex(function (x) { return x.key === key && x.id === id; });
    $('dt-prev').disabled = pos <= 0;
    $('dt-next').disabled = pos < 0 || pos >= order.length - 1;
    var od = parseYmd(key);
    $('dt-pos').textContent = (od.getMonth() + 1) + '/' + od.getDate() + ' ' + DAYS[od.getDay()];
    $('dt-imp').setAttribute('aria-pressed', String(!!s.important));
    $('dt-title').classList.toggle('imp', !!s.important);
    $('dt-title').textContent = s.title;
    $('dt-meta').textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DAYS[d.getDay()] + ')' + (s.start ? ' ' + s.start + (s.end ? '–' + s.end : '') : ' · 시간 미정');
    $('dt-place').hidden = !s.place;
    if (s.place) { var mp = mapOf(s.place, s.abroad); $('dt-place').href = mp.href; $('dt-place').classList.toggle('google', !!s.abroad); $('dt-place').innerHTML = '<span aria-hidden="true">📍</span>' + esc(s.place) + '<em>' + mp.label + ' ›</em>'; }
    $('dt-memo').value = s.memo || '';
    setTimeout(function () { fitText($('dt-memo')); }, 0);
    $('dt-saved').textContent = '입력하면 자동으로 저장돼요.';
    $('dt-delete').textContent = '삭제';
    $('dt-delete').dataset.armed = '';
    var links = calendarLinks(key, s);
    $('cal-google').href = links.google;
    openDialog($('detail-dialog'));
  }

  // 상세 창: 카테고리 칩을 누르면 바로 바꿀 수 있어요
  function renderDetailCat(s) {
    var c = catOf(s.cat);
    $('dt-cat').innerHTML = esc(c.name) + ' <span aria-hidden="true">▾</span>';
    $('dt-cat').style.setProperty('--c', c.color);
    $('dt-cat').setAttribute('aria-expanded', 'false');
    $('dt-cat-pop').hidden = true;
    $('detail-dialog').classList.remove('picking');
    $('dt-cat-pop').innerHTML = cats.map(function (x) {
      return '<button type="button" class="cat-opt' + (x.id === s.cat ? ' on' : '') + '" role="option" aria-selected="' + (x.id === s.cat) + '" data-cat="' + esc(x.id) + '" style="--c:' + x.color + '"><i></i>' + esc(x.name) + '</button>';
    }).join('');
  }

  /* 캘린더 연동 */
  function stamp(key, hm) { return key.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'; }
  function nextDayKey(key) { var d = parseYmd(key); d.setDate(d.getDate() + 1); return ymd(d); }
  function endOf(s) { if (s.end) return s.end; if (!s.start) return ''; var m = Math.min(toMin(s.start) + 60, 23 * 60 + 59); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function calendarLinks(key, s) {
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Seoul';
    var end = endOf(s);
    var details = s.memo || '';
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(s.title) +
      '&dates=' + (s.start ? stamp(key, s.start) + '/' + stamp(key, end) : key.replace(/-/g, '') + '/' + nextDayKey(key).replace(/-/g, '')) +
      '&ctz=' + encodeURIComponent(tz) +
      (details ? '&details=' + encodeURIComponent(details) : '') +
      (s.place ? '&location=' + encodeURIComponent(s.place) : '');
    return { google: g };
  }
  function icsText(key, s) {
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'Asia/Seoul';
    var escI = function (v) { return String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//todays-assistant//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + s.id + '@todays-assistant',
      'SEQUENCE:' + (s.rev || 0),
      'DTSTAMP:' + nowUtc,
      'LAST-MODIFIED:' + nowUtc,
      s.start ? 'DTSTART;TZID=' + tz + ':' + stamp(key, s.start) : 'DTSTART;VALUE=DATE:' + key.replace(/-/g, ''),
      s.start ? 'DTEND;TZID=' + tz + ':' + stamp(key, endOf(s)) : 'DTEND;VALUE=DATE:' + nextDayKey(key).replace(/-/g, ''),
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
    $('clear-samples').onclick = function () { clearSamples(); renderSchedule(); toast('예시 일정을 지웠어요'); };
    $('sch-add').onclick = function () { openForm(null); };
    $('nn').addEventListener('click', function (e) {
      var b = e.target.closest('.nn-item[data-id]');
      scrollToSchedule(b && b.dataset.id);
    });

    $('day-prev').onclick = function () { keepScheduleInPlace(function () { viewDate.setDate(viewDate.getDate() - 1); renderSchedule(); }); };
    $('day-next').onclick = function () { keepScheduleInPlace(function () { viewDate.setDate(viewDate.getDate() + 1); renderSchedule(); }); };
    $('day-today').onclick = function () { $('qa-date').value = ymd(viewDate); renderUpcoming(); openDialog($('up-dialog')); };
    $('uplist').addEventListener('click', function (e) {
      var b = e.target.closest('.dl-row'); if (!b) return;
      viewDate = parseYmd(b.dataset.key); renderSchedule();
      closeDialog($('up-dialog'));
      placeSchedulePanel();
    });
    $('timeline').addEventListener('click', function (e) {
      var d = e.target.closest('[data-done]');
      if (d) {
        var it = findItem(ymd(viewDate), d.dataset.done); if (!it) return;
        it.done = !it.done; saveSchedules(); renderSchedule();
        toast(it.done ? '“' + it.title + '” 완료!' : '완료를 취소했어요');
        return;
      }
      var card = e.target.closest('.tl-card');
      if (card) openDetail(ymd(viewDate), card.dataset.id);
    });
    // 빠른 추가: "1000피티-출근-1900피부과!" → 하이픈으로 나눠 여러 개, 앞 숫자 4자리는 시간, 끝의 !는 중요
    $('qa-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var date = $('qa-date').value || ymd(new Date()), text = $('qa-text').value.trim();
      if (!text) { $('qa-text').focus(); return; }
      var added = text.split(/\s*-\s*/).map(function (tok) { return tok.trim(); }).filter(Boolean).map(function (tok, i) {
        var important = /!$/.test(tok); tok = tok.replace(/!+$/, '').trim();
        var m = tok.match(/^(\d{1,2}):?(\d{2})\s*(.*)$/), start = '';
        if (m && +m[1] < 24 && +m[2] < 60 && m[3]) { start = pad(+m[1]) + ':' + m[2]; tok = m[3].trim(); }
        return { id: 'e' + Date.now().toString(36) + i, start: start, end: '', title: tok, cat: cats[0].id, important: important, place: '', memo: '' };
      });
      clearSamples();
      schedules[date] = (schedules[date] || []).concat(added);
      saveSchedules(); renderSchedule(); renderUpcoming();
      $('qa-text').value = ''; $('qa-text').focus();
      toast(added.length + '개 일정을 추가했어요');
    });

    $('sch-place').addEventListener('input', syncPlaceLink);
    $('sch-abroad').addEventListener('change', syncPlaceLink);
    $('sch-timed').addEventListener('change', function (e) {
      setTimeFields(e.target.checked);
      if (e.target.checked && !$('sch-start').value) {
        var h = Math.min(new Date().getHours() + 1, 23);
        $('sch-start').value = pad(h) + ':00';
      }
    });
    $('sch-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('sch-error');
      var timedOn = $('sch-timed').checked;
      var title = $('sch-title').value.trim(), date = $('sch-date').value, start = timedOn ? $('sch-start').value : '', end = timedOn ? $('sch-end').value : '';
      var fail = function (m, el) { err.textContent = m; err.hidden = false; if (el) el.focus(); };
      if (timedOn && !start) return fail('시작 시간을 입력하거나 "시간 정하기"를 꺼 주세요.', $('sch-start'));
      if (!title) return fail('일정 이름을 입력해 주세요.', $('sch-title'));
      if (!date) return fail('날짜를 선택해 주세요.', $('sch-date'));
      if (!start && end) return fail('종료 시간을 쓰려면 시작 시간도 입력해 주세요.', $('sch-start'));
      if (start && end && toMin(end) <= toMin(start)) return fail('종료 시간은 시작 시간보다 늦어야 해요.', $('sch-end'));
      err.hidden = true;
      var editing = $('sch-id').value, origKey = $('sch-id').dataset.orig;
      if (!editing) clearSamples();
      var pos = -1;
      var prev = editing && origKey && schedules[origKey] ? schedules[origKey].find(function (x) { return x.id === editing; }) : null;
      if (editing && origKey && schedules[origKey]) {
        if (origKey === date) pos = schedules[origKey].findIndex(function (s) { return s.id === editing; });
        schedules[origKey] = schedules[origKey].filter(function (s) { return s.id !== editing; });
        if (!schedules[origKey].length) delete schedules[origKey];
      }
      var list = schedules[date] || (schedules[date] = []);
      list.splice(pos >= 0 ? pos : list.length, 0, { id: editing || 'e' + Date.now().toString(36), start: start, end: end, title: title, cat: $('sch-cat').value, important: $('sch-imp').checked, place: $('sch-place').value.trim(), abroad: $('sch-abroad').checked, memo: $('sch-memo').value.trim(), rev: prev ? (prev.rev || 0) + 1 : 0 });
      saveSchedules();
      viewDate = parseYmd(date);
      renderSchedule();
      closeDialog($('sch-dialog'));
      toast(editing ? '일정을 수정했어요' : '일정을 추가했어요');
    });

    var mt;
    $('sch-memo').addEventListener('input', function () { fitText($('sch-memo')); });
    $('dt-memo').addEventListener('input', function () {
      fitText($('dt-memo'));
      clearTimeout(mt);
      $('dt-saved').textContent = '저장 중…';
      mt = setTimeout(function () {
        var s = detail && findItem(detail.key, detail.id);
        if (!s) return;
        s.memo = $('dt-memo').value.trim(); s.rev = (s.rev || 0) + 1;
        saveSchedules(); renderSchedule();
        $('dt-saved').textContent = '저장했어요.';
        var links = calendarLinks(detail.key, s);
        $('cal-google').href = links.google;
      }, 400);
    });
    $('dt-prev').onclick = function () { stepDetail(-1); };
    $('dt-next').onclick = function () { stepDetail(1); };
    $('dt-cat').onclick = function () {
      var pop = $('dt-cat-pop'), open = pop.hidden;
      pop.hidden = !open;
      $('dt-cat').setAttribute('aria-expanded', String(open));
      $('detail-dialog').classList.toggle('picking', open);
    };
    $('dt-cat-pop').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      var s = findItem(detail.key, detail.id); if (!s) return;
      s.cat = b.dataset.cat; s.rev = (s.rev || 0) + 1;
      saveSchedules(); renderSchedule(); renderDetailCat(s);
      toast('카테고리를 ' + catOf(s.cat).name + '(으)로 바꿨어요');
    });
    $('dt-imp').onclick = function () {
      var s = findItem(detail.key, detail.id); if (!s) return;
      s.important = !s.important;
      $('dt-imp').setAttribute('aria-pressed', String(s.important));
      $('dt-title').classList.toggle('imp', s.important);
      saveSchedules(); renderSchedule();
      toast(s.important ? '중요 일정으로 표시했어요' : '중요 표시를 뺐어요');
    };
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
    $('cal-copy').onclick = function () {
      var s = findItem(detail.key, detail.id);
      copyText($('dt-title').textContent + '\n' + $('dt-meta').textContent + (s.place ? '\n' + s.place : '') + (s.memo ? '\n' + s.memo : ''), '일정을 복사했어요');
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
    $('cl-groups').innerHTML = lists.map(function (g, gi) {
      var done = g.items.filter(function (i) { return i.done; }).length, total = g.items.length;
      return '<div class="cl-group' + (g.collapsed ? ' collapsed' : '') + '" data-g="' + g.id + '">' +
        '<div class="cl-head">' +
          '<button type="button" class="cl-fold" data-act="fold" aria-expanded="' + !g.collapsed + '" aria-label="' + esc(g.title) + (g.collapsed ? ' 펼치기' : ' 접기') + '"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg></button>' +
          '<input class="cl-title" value="' + esc(g.title) + '" maxlength="30" aria-label="목록 제목">' +
          '<span class="cl-count mono">' + done + '/' + total + '</span>' +
          (lists.length > 1 ? '<span class="cl-move">' +
            '<button type="button" data-act="move-up" aria-label="' + esc(g.title) + ' 위로"' + (gi === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" data-act="move-down" aria-label="' + esc(g.title) + ' 아래로"' + (gi === lists.length - 1 ? ' disabled' : '') + '>↓</button></span>' : '') +
          '<button type="button" class="icon-mini" data-act="del-group" aria-label="' + esc(g.title) + ' 목록 삭제">✕</button>' +
        '</div>' +
        '<span class="cl-bar"><i style="width:' + (total ? Math.round(done / total * 100) : 0) + '%"></i></span>' +
        '<ul class="cl-items">' + g.items.map(function (it) {
          return '<li class="cl-item' + (it.done ? ' done' : '') + '" data-i="' + it.id + '">' +
            '<input type="checkbox" class="cl-check" id="ck-' + it.id + '"' + (it.done ? ' checked' : '') + ' aria-label="완료">' +
            '<textarea class="cl-text" rows="1" maxlength="300" aria-label="항목">' + esc(it.text) + '</textarea>' +
            '<button type="button" class="icon-mini" data-act="del-item" aria-label="항목 삭제">✕</button></li>';
        }).join('') + '</ul>' +
        '<form class="cl-new"><input class="cl-new-input" maxlength="300" placeholder="+ 항목 추가" aria-label="' + esc(g.title) + '에 항목 추가"></form>' +
      '</div>';
    }).join('');
    fitAll();
    if (focusNewIn) {
      var inp = document.querySelector('.cl-group[data-g="' + focusNewIn + '"] .cl-new-input');
      if (inp) inp.focus();
    }
  }
  // 체크리스트 항목은 글 길이만큼 줄이 늘어나요
  function fitText(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 2 + 'px'; }
  function fitAll() { Array.prototype.forEach.call(document.querySelectorAll('.cl-text'), fitText); }
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
    root.addEventListener('input', function (e) { if (e.target.classList.contains('cl-text')) fitText(e.target); });
    window.addEventListener('resize', fitAll);
    // 웹 글꼴이 늦게 로드되면 줄 길이가 바뀌어서 한 번 더 맞춰요
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
    window.addEventListener('load', fitAll);
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
      if (b.dataset.act === 'move-up' || b.dataset.act === 'move-down') {
        if (b.disabled) return;
        var i = lists.indexOf(g), j = i + (b.dataset.act === 'move-up' ? -1 : 1);
        lists.splice(i, 1); lists.splice(j, 0, g);
        saveLists(); renderLists();
        var again = document.querySelector('.cl-group[data-g="' + g.id + '"] [data-act="' + b.dataset.act + '"]');
        if (again && !again.disabled) again.focus();
        return;
      }
      if (b.dataset.act === 'fold') {
        g.collapsed = !g.collapsed; saveLists(); renderLists();
        return;
      }
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

  /* ---------- 관심 소식: 오늘 가장 많이 보도된 소식 ----------
     공유·조회수 같은 바이럴 지표는 무료로 얻을 수 없어서,
     같은 사건을 다룬 매체 수(보도 규모)를 화제성 지표로 써요. */
  var stories = [], videos = [], newsFilter = 'all', newsKind = 'news', newsSample = false;
  var readSet = new Set(store.get('newsRead', []));
  var squash = function (t) { return String(t).toLowerCase().replace(/[^0-9a-z가-힣]/g, ''); };

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
    return { title: title, link: r.link, source: source, image: r.thumbnail || '', date: date && !isNaN(date) ? date.toISOString() : null, interest: interest };
  }
  function fetchGoogle(q) {
    var rss = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:1d') + '&hl=ko&gl=KR&ceid=KR:ko';
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
  function fetchGdelt(interests) {
    var terms = interests.map(function (q) { return /\s/.test(q) ? '"' + q + '"' : q; });
    var query = (terms.length > 1 ? '(' + terms.join(' OR ') + ')' : terms[0]) + ' sourcelang:korean';
    return getJSON('https://api.gdeltproject.org/api/v2/doc/doc?mode=artlist&format=json&sort=datedesc&timespan=1d&maxrecords=75&query=' + encodeURIComponent(query), 9000)
      .then(function (r) {
        return (r.articles || []).map(function (a) {
          var t = squash(a.title);
          var hit = interests.find(function (q) { return t.indexOf(squash(q)) >= 0; }) || interests[0];
          var sd = a.seendate || '';
          var iso = sd.length >= 15 ? sd.slice(0, 4) + '-' + sd.slice(4, 6) + '-' + sd.slice(6, 8) + 'T' + sd.slice(9, 11) + ':' + sd.slice(11, 13) + ':' + sd.slice(13, 15) + 'Z' : null;
          return { title: a.title, link: a.url, source: a.domain, image: a.socialimage || '', date: iso, interest: hit };
        });
      });
  }

  // 유튜브: API 키가 있으면 오늘 올라온 영상을 조회수 순으로, 없으면 Piped에서 조회수 순
  var PIPED = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de'];
  function fetchYoutube(q) {
    if (settings.ytKey) {
      var start = new Date(); start.setHours(0, 0, 0, 0);
      return getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=viewCount&maxResults=8&regionCode=KR&relevanceLanguage=ko' +
        '&publishedAfter=' + encodeURIComponent(start.toISOString()) + '&q=' + encodeURIComponent(q) + '&key=' + encodeURIComponent(settings.ytKey))
        .then(function (r) {
          return (r.items || []).map(function (v, i) {
            return { id: v.id.videoId, title: decodeEntities(v.snippet.title), channel: v.snippet.channelTitle, date: v.snippet.publishedAt, rank: i, interest: q };
          });
        });
    }
    var tryAt = function (i) {
      if (i >= PIPED.length) return Promise.reject(new Error('piped'));
      return getJSON(PIPED[i] + '/search?filter=videos&q=' + encodeURIComponent(q), 7000)
        .then(function (r) {
          return (r.items || []).filter(function (v) { return v.url && v.url.indexOf('/watch') === 0; })
            .sort(function (a, b) { return (b.views || 0) - (a.views || 0); }).slice(0, 8).map(function (v) {
              return { id: v.url.split('v=')[1], title: v.title, channel: v.uploaderName, views: v.views, date: v.uploaded > 0 ? new Date(v.uploaded).toISOString() : null, ago: v.uploadedDate, interest: q };
            });
        })
        .catch(function () { return tryAt(i + 1); });
    };
    return tryAt(0);
  }
  function decodeEntities(s) { var t = document.createElement('textarea'); t.innerHTML = s; return t.value; }

  // 제목 글자 2-gram 유사도로 같은 사건을 묶어요
  function grams(t) { var s = squash(t), g = {}; for (var i = 0; i < s.length - 1; i++) g[s.substr(i, 2)] = 1; return g; }
  function similar(a, b) {
    var n = 0, ka = Object.keys(a), kb = Object.keys(b).length;
    ka.forEach(function (k) { if (b[k]) n++; });
    return n / Math.max(1, Math.min(ka.length, kb));
  }
  function clusterStories(items) {
    var clusters = [];
    items.forEach(function (it) {
      var g = grams(it.title);
      var hit = clusters.find(function (c) { return similar(c.g, g) >= 0.5; });
      if (hit) { hit.items.push(it); return; }
      clusters.push({ g: g, items: [it] });
    });
    return clusters.map(function (c) {
      var sources = {};
      c.items.forEach(function (x) { sources[x.source || x.link] = 1; });
      var lead = c.items.find(function (x) { return x.image; }) || c.items[0];
      var latest = c.items.map(function (x) { return x.date || ''; }).sort().pop();
      return {
        title: lead.title, link: lead.link, source: lead.source, interest: lead.interest, date: latest || null,
        image: lead.image || (c.items.find(function (x) { return x.image; }) || {}).image || '',
        outlets: Object.keys(sources).length
      };
    }).sort(function (a, b) {
      return (b.outlets - a.outlets) || ((b.image ? 1 : 0) - (a.image ? 1 : 0)) || (b.date || '').localeCompare(a.date || '');
    });
  }
  var isToday = function (iso) { return iso && ymd(new Date(iso)) === ymd(new Date()); };

  function loadNews() {
    var sig = ymd(new Date()) + '|' + settings.interests.join('|') + '#' + (settings.ytKey ? 'k' : '');
    var cache = store.get('feedCache2', null);
    if (cache && cache.sig === sig && Date.now() - cache.at < 30 * 60 * 1000 && cache.stories.length) {
      return Promise.resolve({ stories: cache.stories, videos: cache.videos, failed: false });
    }
    var qs = settings.interests;
    if (!qs.length) return Promise.resolve({ stories: [], videos: [], failed: false });
    var settle = function (p) { return p.then(function (v) { return { ok: true, v: v }; }, function () { return { ok: false, v: [] }; }); };
    var jobs = [settle(fetchGdelt(qs))].concat(qs.map(function (q) { return settle(fetchGoogle(q)); }));
    var vids = Promise.all(qs.map(function (q) { return settle(fetchYoutube(q)); }));
    return Promise.all([Promise.all(jobs), vids]).then(function (res) {
      var all = [];
      res[0].forEach(function (r) { r.v.forEach(function (it) { if (it.title && it.link && isToday(it.date)) all.push(it); }); });
      var vseen = {}, vs = [];
      res[1].forEach(function (r) { r.v.forEach(function (v) { if (v.id && !vseen[v.id]) { vseen[v.id] = 1; vs.push(v); } }); });
      var failed = res[0].every(function (r) { return !r.ok; });
      var out = { stories: clusterStories(all), videos: vs, failed: failed };
      if (!failed) store.set('feedCache2', { sig: sig, at: Date.now(), stories: out.stories, videos: vs });
      return out;
    });
  }

  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 60) return Math.max(m, 1) + '분 전';
    if (m < 1440) return Math.round(m / 60) + '시간 전';
    return Math.round(m / 1440) + '일 전';
  }
  function hueOf(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return h; }
  function thumbHtml(n, cls) {
    var tile = '<span class="thumb-fallback" style="--h:' + hueOf(n.interest) + '"><span>' + esc(n.interest) + '</span></span>';
    if (!n.image) return '<span class="thumb ' + cls + '">' + tile + '</span>';
    return '<span class="thumb ' + cls + '">' + tile + '<img src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"></span>';
  }
  function newsCard(n) {
    var read = readSet.has(n.link);
    var img = n.image ? '<span class="thumb square"><img src="' + esc(n.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="var a=this.closest(\'.news-card\');this.parentNode.remove();a.classList.add(\'noimg\')"></span>' : '';
    return '<li><a class="news-card' + (n.image ? '' : ' noimg') + (read ? ' read' : '') + '" href="' + esc(n.link) + '" target="_blank" rel="noopener" data-id="' + esc(n.link) + '">' +
      img +
      '<span class="n-body"><span class="n-title">' + esc(n.title) + '</span>' +
      '<span class="n-meta">' + (n.outlets > 1 ? '<span class="n-hot">' + n.outlets + '개 매체 보도</span>' : '') + '<span class="n-tag">' + esc(n.interest) + '</span>' +
      (n.source ? '<span>' + esc(n.source) + '</span>' : '') + (n.date ? '<span>' + ago(n.date) + '</span>' : '') + '</span></span></a></li>';
  }
  function fmtViews(v) { return v >= 10000 ? Math.round(v / 1000) / 10 + '만회' : v >= 1000 ? Math.round(v / 100) / 10 + '천회' : v + '회'; }
  function videoCard(v) {
    return '<li><a class="yt-card" href="https://www.youtube.com/watch?v=' + encodeURIComponent(v.id) + '" target="_blank" rel="noopener" data-id="yt:' + esc(v.id) + '">' +
      '<span class="thumb wide"><span class="thumb-fallback" style="--h:' + hueOf(v.interest) + '"><span>' + esc(v.interest) + '</span></span>' +
      '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()"><span class="play" aria-hidden="true"></span></span>' +
      '<span class="yt-title">' + esc(v.title) + '</span>' +
      '<span class="n-meta"><span>' + esc(v.channel || '') + '</span>' + (v.views ? '<span>조회 ' + fmtViews(v.views) + '</span>' : '') + '<span>' + (v.date ? ago(v.date) : esc(v.ago || '')) + '</span></span></a></li>';
  }
  function ytSearchCard(q) {
    return '<li><a class="yt-card" href="https://www.youtube.com/results?search_query=' + encodeURIComponent(q) + '&sp=CAMSAggC" target="_blank" rel="noopener">' +
      '<span class="thumb wide"><span class="thumb-fallback yt" style="--h:' + hueOf(q) + '"><span>' + esc(q) + '</span></span><span class="play" aria-hidden="true"></span></span>' +
      '<span class="yt-title">' + esc(q) + ' 오늘 인기 영상</span><span class="n-meta"><span>YouTube 검색 · 조회수순</span></span></a></li>';
  }
  function igTag(q) { return q.replace(/[^0-9A-Za-z가-힣_]/g, ''); }

  function renderNews(result) {
    stories = result.stories; videos = result.videos || [];
    newsSample = !!result.failed;
    if (newsSample) stories = window.SAMPLE_NEWS;
    $('news-panel').hidden = false;
    $('news-note').hidden = !newsSample;
    $('news-note').textContent = newsSample ? '뉴스 서버에 연결하지 못해 예시를 보여드려요. 링크를 누르면 실제 검색 결과로 이동해요.' : '';
    $('news-top').innerHTML = stories.slice(0, 3).map(function (n) { return newsCard(n); }).join('');
    $('news-empty').hidden = stories.length > 0;
    $('news-more').hidden = false;
    $('news-total').textContent = stories.length > 3 ? stories.length : '';
    renderNewsDialog();
  }
  function renderNewsDialog() {
    var src = newsKind === 'video' ? videos : newsKind === 'news' ? stories : [];
    var interests = settings.interests.filter(function (i) { return src.some(function (n) { return n.interest === i; }); });
    if (newsFilter !== 'all' && interests.indexOf(newsFilter) < 0) newsFilter = 'all';
    $('news-filters').hidden = newsKind === 'ig' || !src.length;
    $('news-filters').innerHTML = ['all'].concat(interests).map(function (i) {
      var c = i === 'all' ? src.length : src.filter(function (n) { return n.interest === i; }).length;
      return '<button type="button" class="chip" role="tab" data-f="' + esc(i) + '" aria-selected="' + (newsFilter === i) + '">' + (i === 'all' ? '전체' : esc(i)) + ' <span class="mono">' + c + '</span></button>';
    }).join('');
    var list = newsFilter === 'all' ? src : src.filter(function (n) { return n.interest === newsFilter; });
    $('news-all').hidden = newsKind !== 'news';
    $('yt-all').hidden = newsKind !== 'video';
    $('ig-tags').hidden = newsKind !== 'ig';
    $('news-hint').textContent = newsKind === 'news' ? '오늘 올라온 기사 중 여러 매체가 함께 다룬 순서예요.'
      : newsKind === 'video' ? (videos.length ? '오늘 올라온 영상을 조회수 순으로 모았어요.' : '영상을 불러오지 못해 유튜브 검색으로 연결해요. 설정에 유튜브 API 키를 넣으면 오늘 영상을 조회수 순으로 보여줘요.')
      : '인스타그램은 게시물을 가져올 공개 방법이 없어 해시태그 페이지로 연결해요.';
    if (newsKind === 'news') $('news-all').innerHTML = list.length ? list.map(function (n) { return newsCard(n); }).join('') : '<li class="empty">오늘 올라온 소식이 아직 없어요.</li>';
    if (newsKind === 'video') $('yt-all').innerHTML = list.length ? list.map(videoCard).join('') : settings.interests.map(ytSearchCard).join('');
    if (newsKind === 'ig') $('ig-tags').innerHTML = settings.interests.map(function (q) {
      var t = igTag(q);
      return t ? '<a class="ig-tag" href="https://www.instagram.com/explore/tags/' + encodeURIComponent(t) + '/" target="_blank" rel="noopener">#' + esc(t) + '</a>' : '';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('#news-dialog .seg-btn'), function (b) { b.setAttribute('aria-selected', String(b.dataset.kind === newsKind)); });
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
      if (b) { newsFilter = b.dataset.f; renderNewsDialog(); }
    });
    document.querySelector('#news-dialog .seg').addEventListener('click', function (e) {
      var b = e.target.closest('.seg-btn');
      if (b) { newsKind = b.dataset.kind; newsFilter = 'all'; renderNewsDialog(); }
    });
    $('news-more').onclick = function () { newsKind = 'news'; newsFilter = 'all'; renderNewsDialog(); openDialog($('news-dialog')); };
    loadNews().then(renderNews);
  }

  /* ---------- 설정 ---------- */
  // 도시 검색 결과 목록 (설정·날씨 상세 공용)
  function searchCity(q, list) {
    return getJSON('https://geocoding-api.open-meteo.com/v1/search?count=5&language=ko&name=' + encodeURIComponent(q))
      .then(function (r) {
        var res = r.results || [];
        list.innerHTML = res.length ? res.map(function (c) {
          var label = c.name + (c.admin1 ? ', ' + c.admin1 : '') + (c.country ? ' · ' + c.country : '');
          return '<li><button type="button" data-lat="' + c.latitude + '" data-lon="' + c.longitude + '" data-name="' + esc(c.name) + '" data-cc="' + esc(c.country_code || '') + '" data-country="' + esc(c.country || '') + '">' + esc(label) + '</button></li>';
        }).join('') : '<li class="hint">검색 결과가 없어요. 다른 이름으로 찾아보세요.</li>';
      })
      .catch(function () { list.innerHTML = '<li class="hint">지역 검색 서버에 연결하지 못했어요.</li>'; });
  }
  // 날씨 상세(일주일 날씨)에서 바로 위치 바꾸기
  function setWeatherLocation(loc) {
    settings.location = loc;
    store.set('settings', settings);
    $('wk-loc-form').hidden = true; $('wk-city').value = ''; $('wk-city-results').innerHTML = '';
    renderWkLoc();
    $('wk-loc-now').textContent = '불러오는 중…';
    loadWeather().then(renderWeather).then(renderWkLoc);
    toast(loc.mode === 'auto' ? '현재 위치 날씨로 바꿨어요' : loc.name + ' 날씨로 바꿨어요');
  }
  function renderWkLoc() {
    var l = settings.location;
    $('wk-loc-now').textContent = '📍 ' + (l.mode === 'auto' ? '현재 위치 (자동)' : l.name);
  }
  function initWeatherLocation() {
    renderWkLoc();
    $('wk-loc-edit').onclick = function () {
      var f = $('wk-loc-form'); f.hidden = !f.hidden;
      if (!f.hidden) $('wk-city').focus();
    };
    var t;
    $('wk-city').addEventListener('input', function (e) {
      clearTimeout(t);
      var q = e.target.value.trim();
      if (q.length < 2) { $('wk-city-results').innerHTML = ''; return; }
      t = setTimeout(function () { searchCity(q, $('wk-city-results')); }, 300);
    });
    $('wk-city-results').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      setWeatherLocation({ mode: 'city', name: b.dataset.name, lat: +b.dataset.lat, lon: +b.dataset.lon, cc: b.dataset.cc, country: b.dataset.country });
    });
    $('wk-locate').onclick = function () { setWeatherLocation(Object.assign({}, SEOUL, { mode: 'auto' })); };
  }

  function initSettings() {
    var dlg = $('settings');
    var draft;
    function renderTags() {
      $('set-tags').innerHTML = draft.interests.map(function (t, i) {
        return '<li>' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="' + esc(t) + ' 삭제">✕</button></li>';
      }).join('');
      var l = draft.location;
      $('set-city-current').textContent = '현재: ' + (l.mode === 'auto' ? '내 위치 자동 (실패 시 서울특별시)' : l.name);
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
        searchCity(q, $('city-results'));
      }, 300);
    });
    $('city-results').addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      draft.location = { mode: 'city', name: b.dataset.name, lat: +b.dataset.lat, lon: +b.dataset.lon, cc: b.dataset.cc, country: b.dataset.country };
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

  /* ---------- 섹션 순서 ---------- */
  var SECTIONS = [
    { id: 'weather-panel', name: '날씨 · 옷차림' }, { id: 'check-panel', name: '체크리스트' },
    { id: 'schedule-panel', name: '일정' }, { id: 'news-panel', name: '관심 소식' }, { id: 'english-panel', name: '업무 영어' }
  ];
  function sectionOrder() {
    var saved = store.get('sectionOrder', []), ids = SECTIONS.map(function (x) { return x.id; });
    var order = saved.filter(function (id) { return ids.indexOf(id) >= 0; });
    ids.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    return order;
  }
  // 모바일은 --o 순서, 데스크톱은 두 열에 번갈아
  function applySectionOrder() {
    var cols = [document.querySelector('.col-a'), document.querySelector('.col-b')];
    sectionOrder().forEach(function (id, i) {
      var el = $(id);
      el.style.setProperty('--o', i);
      cols[i % 2].appendChild(el);
    });
  }
  function renderOrderList() {
    var order = sectionOrder();
    $('order-list').innerHTML = order.map(function (id, i) {
      var name = SECTIONS.find(function (x) { return x.id === id; }).name;
      return '<li data-id="' + id + '"><span class="on-no">' + (i + 1) + '</span><span class="on-name">' + name + '</span>' +
        '<button type="button" data-move="-1" aria-label="' + name + ' 위로"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button type="button" data-move="1" aria-label="' + name + ' 아래로"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button></li>';
    }).join('');
  }
  function initSectionOrder() {
    applySectionOrder();
    renderOrderList();
    $('order-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-move]'); if (!b || b.disabled) return;
      var order = sectionOrder(), id = b.closest('li').dataset.id, i = order.indexOf(id), j = i + +b.dataset.move;
      order.splice(i, 1); order.splice(j, 0, id);
      store.set('sectionOrder', order);
      applySectionOrder(); renderOrderList();
      var again = document.querySelector('#order-list li[data-id="' + id + '"] [data-move="' + b.dataset.move + '"]');
      (again && !again.disabled ? again : document.querySelector('#order-list li[data-id="' + id + '"] button:not([disabled])')).focus();
    });
  }

  /* ---------- 데이터 백업 / 복원 ---------- */
  function backupData() {
    var data = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k.indexOf('pa:') === 0 && k.indexOf('pa:feedCache') !== 0) data[k] = localStorage.getItem(k);
      }
    } catch (e) { /* 저장소 접근 불가 */ }
    return JSON.stringify({ app: 'todays-assistant', version: 1, savedAt: new Date().toISOString(), data: data });
  }
  function initBackup() {
    $('bk-export').onclick = function () {
      var name = '오늘-백업-' + ymd(new Date()) + '.json';
      var blob = new Blob([backupData()], { type: 'application/json' });
      var file = typeof File === 'function' ? new File([blob], name, { type: 'application/json' }) : null;
      // 폰에서는 공유 시트로 (파일 앱·카카오톡·메일 등에 저장), 안 되면 다운로드
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: name }).catch(function () {});
        return;
      }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    };
    $('bk-import').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var obj = JSON.parse(reader.result);
          if (!obj || obj.app !== 'todays-assistant' || !obj.data) throw new Error('형식');
          Object.keys(obj.data).forEach(function (k) { if (k.indexOf('pa:') === 0) localStorage.setItem(k, obj.data[k]); });
          toast('백업을 불러왔어요. 다시 여는 중…');
          setTimeout(function () { location.reload(); }, 900);
        } catch (err) {
          toast('오늘 앱 백업 파일이 아니에요. 파일을 다시 확인해 주세요');
        }
        e.target.value = '';
      };
      reader.readAsText(f);
    });
  }

  /* 홈 화면 앱: 오프라인 지원, 저장소 보존 요청 */
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});

  /* ---------- 시작 ---------- */
  renderGreeting();
  initNote();
  initSeason();
  initSeasonDialog();
  initRules();
  $('wx-open').onclick = $('hourly').onclick = function () { renderWkLoc(); $('wk-loc-form').hidden = true; openDialog($('week-dialog')); };
  initWeatherLocation();
  initPhrase();
  initCats();
  initSchedule();
  initChecklist();
  initSettings();
  initSectionOrder();
  initBackup();
  loadWeather().then(renderWeather);
  initNews();

  setInterval(function () { renderGreeting(); if (ymd(viewDate) === ymd(new Date())) renderSchedule(); else renderNowNext(); }, 60 * 1000);
})();
