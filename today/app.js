(function () {
  'use strict';
  var tr = window.tr || function (x) { return x; };

  // 영어 모드: 시즌·여행·표현 데이터를 영어 내용으로 바꿔 끼워요 (내가 추가한 시즌은 그대로)
  if (window.IS_EN && window.EN_DATA) (function (E) {
    (window.SEASONS || []).forEach(function (s) { var e = E.seasons && E.seasons[s.id]; if (e) Object.keys(e).forEach(function (k) { s[k] = e[k]; }); });
    Object.keys(window.TRAVEL || {}).forEach(function (cc) { var e = E.travel && E.travel[cc]; if (e) { window.TRAVEL[cc].name = e.name; window.TRAVEL[cc].kw = e.kw; } });
    (window.TRAVEL_CITIES || []).forEach(function (c) { var e = E.cities && E.cities[c.name]; if (e) { c.name = e.name; c.kw = e.kw; } });
    (window.PHRASES || []).forEach(function (p, i) { var e = E.phrases && E.phrases[i]; if (e) { p.when = e.when; p.ko = e.meaning; } });
  })(window.EN_DATA);

  /* ---------- 공통 ---------- */
  // 드래그로 순서 바꾸기: 손잡이(≡)를 잡거나 항목을 길게 눌러 끌어요
  function makeSortable(list, opts) {
    var drag = null, timer = null, startY = 0, justDragged = false;
    function begin(item) {
      drag = { item: item };
      item.classList.add('dragging'); list.classList.add('sorting');
      if (navigator.vibrate) navigator.vibrate(10);
    }
    list.addEventListener('pointerdown', function (e) {
      var item = e.target.closest(opts.item);
      if (!item || !list.contains(item) || (opts.canDrag && !opts.canDrag(item))) return;
      startY = e.clientY;
      if (opts.handle && e.target.closest(opts.handle)) { e.preventDefault(); begin(item); return; }
      if (opts.longPress && !e.target.closest('input, textarea, select')) timer = setTimeout(function () { timer = null; begin(item); }, 380);
    });
    document.addEventListener('pointermove', function (e) {
      if (timer && Math.abs(e.clientY - startY) > 8) { clearTimeout(timer); timer = null; }
      if (!drag) return;
      e.preventDefault();
      var items = Array.prototype.filter.call(list.querySelectorAll(opts.item), function (x) { return x !== drag.item && x.parentNode === drag.item.parentNode; });
      var target = null;
      for (var i = 0; i < items.length; i++) {
        var r = items[i].getBoundingClientRect();
        if (e.clientY < r.top + r.height / 2) { target = items[i]; break; }
      }
      if (target) { if (target.previousElementSibling !== drag.item) target.parentNode.insertBefore(drag.item, target); }
      else if (items.length) { var last = items[items.length - 1]; if (last.nextElementSibling !== drag.item) last.after(drag.item); }
    }, { passive: false });
    // iOS: 드래그 중에는 화면 스크롤 막기
    document.addEventListener('touchmove', function (e) { if (drag) e.preventDefault(); }, { passive: false });
    function end() {
      if (timer) { clearTimeout(timer); timer = null; }
      if (!drag) return;
      var it = drag.item;
      it.classList.remove('dragging'); list.classList.remove('sorting');
      drag = null; justDragged = true; setTimeout(function () { justDragged = false; }, 50);
      opts.onEnd(it);
    }
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', end);
    list.addEventListener('click', function (e) { if (justDragged) { e.preventDefault(); e.stopPropagation(); } }, true);
    list.addEventListener('contextmenu', function (e) { if (e.target.closest(opts.item)) e.preventDefault(); });
  }
  var GRIP = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 7h16v2H4zM4 11h16v2H4zM4 15h16v2H4z"/></svg>';

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
  // 국내에선 현재 위치·올해 기온으로 날짜를 옮긴 시즌을 써요 (seasonCtx가 정해진 뒤부터)
  var seasonCtx = null;
  var visibleSeasons = function () {
    return allSeasons().filter(function (s) { return hiddenSeasons.indexOf(s.id) < 0; })
      .map(function (s) { return seasonCtx ? window.adaptSeason(s, seasonCtx) : s; });
  };
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
    seasonColors = s.scene.colors.slice(0, 2);
    paintSeason();
    root.style.setProperty('--season', s.scene.accent);
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
    $('hero-motif').classList.toggle('pair', tops.length > 1);
    var em = [];
    tops.forEach(function (x) { (x.s.scene.motif || []).forEach(function (m) { if (em.indexOf(m) < 0) em.push(m); }); });
    // 단풍은 이미 🍁🍂가 떨어져서 따로 안 띄워요
    if (s.scene.type === 'leaves' && tops.length === 1) em = [];
    scene.start(Object.assign({}, s.scene, { emojis: em }));
  }
  function initSeason() {
    var ranked = window.rankSeasons(new Date(), visibleSeasons());
    if (!ranked.length) {
      var f = visibleSeasons()[0] || window.SEASONS[0];
      showSeason([{ s: f, p: null }]);
      return;
    }
    // 가장 절정인 시즌이 메인. 같은 단계·같은 점수면 함께 보여줘요
    var first = ranked[0];
    showSeason(ranked.filter(function (x) { return x.p.phase === first.p.phase && first.p.score - x.p.score < 0.001; }));
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
  function adaptNote() {
    if (!seasonCtx) return '전국 기준 날짜예요. 위치를 받아오면 지역에 맞게 바뀌어요.';
    var a = seasonCtx.anomaly;
    return '📍 ' + (seasonCtx.place || '현재 위치') + ' 기준으로 꽃·단풍 날짜를 맞췄어요' +
      (a != null ? ' · 최근 30일이 평년보다 ' + (a === 0 ? '비슷해요' : Math.abs(a) + '°C ' + (a > 0 ? '따뜻해요' : '추워요')) : '');
  }
  function renderSeasonCal(focusId) {
    $('sd-adapt').textContent = adaptNote();
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
      if (!travelMode && (e.target === $('hero') || e.target === $('hero-canvas') || e.target === $('hero-bg') || e.target.classList.contains('hero-inner'))) open(currentSeason && currentSeason.id);
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
  // 같은 장면을 그리는 캔버스를 여러 개 만들 수 있어요 (메인 + 당겼을 때 보이는 위쪽)
  function makeScene(canvas, active) {
    var ctx = canvas.getContext('2d');
    var parts = [], type = 'petals', accent = '#fff', raf = 0, w = 0, h = 0, ext = 0, t0 = 0, emojis = [], floats = [], palOverride = null, sizeRange = null, lastCfg = null;
    // 실제 날씨: 지금 비·눈이 오면 시즌 배경 위에 겹쳐 내려요
    var wx = { kind: null, level: 0 }, wxParts = [];
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
      // 캔버스는 메인 위쪽 바깥(ext)까지 이어져 있어요. 좌표 0은 메인의 맨 위, h는 메인 높이
      ext = parseFloat(getComputedStyle(canvas).getPropertyValue('--ext')) || 0;
      w = r.width; h = r.height - ext;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, ext * dpr);
    }
    function make(initial) {
      var pal = palOverride || PALETTE[type] || ['#fff'];
      var p = { x: rnd(0, w), y: initial ? rnd(-ext, h) : -ext - 20, c: pal[(Math.random() * pal.length) | 0], a: rnd(0, Math.PI * 2), va: rnd(-0.03, 0.03), ph: rnd(0, 6.28) };
      switch (type) {
        case 'petals': p.s = rnd(5, 10); p.vy = rnd(0.4, 1.1); p.vx = rnd(0.2, 0.8); break;
        case 'leaves': p.s = rnd(7, 13); p.vy = rnd(0.6, 1.4); p.vx = rnd(-0.3, 0.6); p.leaf = Math.random() < 0.6 ? '🍁' : '🍂'; break;
        case 'snow': p.s = rnd(1.5, 4); p.vy = rnd(0.3, 1.0); p.vx = rnd(-0.3, 0.3); break;
        case 'rain': p.s = rnd(10, 22); p.vy = rnd(6, 10); p.vx = -1.2; break;
        case 'sea': p.s = rnd(2, 6); p.y = initial ? rnd(-ext, h) : h + 10; p.vy = -rnd(0.3, 0.9); p.vx = 0; break;
        case 'lights': p.s = sizeRange ? rnd(sizeRange[0], sizeRange[1]) * (Math.random() < 0.25 ? 1.8 : 1) : rnd(2, 7); p.y = initial ? rnd(-ext, h) : h + 10; p.vy = -rnd(0.2, 0.5); p.vx = rnd(-0.15, 0.15); break;
        case 'fireflies': p.s = rnd(1.5, 3); p.y = rnd(h * 0.2, h); p.vy = rnd(-0.3, 0.3); p.vx = rnd(-0.3, 0.3); break;
        case 'sun': p.s = rnd(2, 5); p.y = rnd(-ext, h); p.vy = -rnd(0.1, 0.3); p.vx = rnd(-0.1, 0.1); break;
        case 'grass': p.x = rnd(-10, w + 10); p.y = h; p.s = rnd(h * 0.18, h * 0.42); p.vx = 0; p.vy = 0; break;
      }
      return p;
    }
    function count() {
      var tall = (h + ext) / Math.max(1, h); // 위로 이어진 만큼 개수도 늘려서 밀도는 그대로
      var base = Math.round(Math.max(24, Math.min(90, Math.round(w * h / 9000))) * tall);
      return type === 'grass' ? Math.round(w / 7) : type === 'leaves' ? Math.round(base * 0.45) : type === 'rain' ? base * 1.4 : type === 'lights' ? base * 0.5 : base;
    }
    function drawLeaf(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = 0.92; ctx.fillStyle = '#000';
      ctx.font = Math.round(p.s * 2) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(p.leaf, 0, 0); ctx.restore();
    }
    function draw(time) {
      var tt = (time - t0) / 1000;
      ctx.clearRect(0, -ext, w, h + ext);
      if (type === 'sun' || type === 'lights') {
        var g = ctx.createRadialGradient(w * 0.82, h * 0.18, 0, w * 0.82, h * 0.18, Math.max(w, h) * 0.6);
        g.addColorStop(0, type === 'sun' ? 'rgba(255,240,180,0.55)' : 'rgba(255,210,140,0.25)');
        g.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = g; ctx.fillRect(0, -ext, w, h + ext);
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
            p.x += p.vx + Math.sin(tt * 0.7 + p.ph) * (type === 'fireflies' ? 0.4 : 0.25); p.y += p.vy;
            var tw = 0.35 + 0.65 * Math.abs(Math.sin(tt * (type === 'fireflies' ? 1.4 : 0.6) + p.ph));
            var rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 3);
            rg.addColorStop(0, p.c); rg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalAlpha = tw * (type === 'lights' ? 0.32 : 0.95); ctx.fillStyle = rg;
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
        if (p.y > h + 30 || p.y < -ext - 40 || p.x > w + 40 || p.x < -40) {
          if (type !== 'grass') parts[i] = make(false);
          if (type === 'lights' || type === 'fireflies' || type === 'sun') { parts[i].y = h + 10; if (type === 'fireflies') parts[i].y = rnd(h * 0.3, h); }
        }
      }
      // 실제 비·눈: 멀고 가까운 층(z)으로 깊이감, 빗줄기는 꼬리가 흐려지게, 눈은 가장자리가 부드럽게
      if (wx.kind && wxParts.length) {
        // 비 오는 날은 위쪽이 살짝 뿌옇게
        var mist = ctx.createLinearGradient(0, -ext, 0, h), mc = wx.kind === 'snow' ? 'rgba(235,242,255,0.10)' : 'rgba(190,205,225,0.10)';
        mist.addColorStop(0, mc); mist.addColorStop(ext / (h + ext), mc);
        mist.addColorStop(1, 'rgba(190,205,225,0)');
        ctx.globalAlpha = 1; ctx.fillStyle = mist; ctx.fillRect(0, -ext, w, h + ext);
      }
      for (var q = 0; q < wxParts.length; q++) {
        var r = wxParts[q];
        if (wx.kind === 'snow') {
          r.x += r.vx + Math.sin(tt * 0.7 + r.ph) * 0.35 * r.z; r.y += r.vy;
          var sg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, r.s);
          sg.addColorStop(0, 'rgba(255,255,255,' + r.o + ')'); sg.addColorStop(0.55, 'rgba(255,255,255,' + (r.o * 0.6) + ')'); sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = 1; ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(r.x, r.y, r.s, 0, Math.PI * 2); ctx.fill();
        } else {
          r.x += r.vx; r.y += r.vy;
          var ex = r.x + r.vx * (r.s / r.vy), ey = r.y + r.s;
          var rg2 = ctx.createLinearGradient(r.x, r.y, ex, ey);
          rg2.addColorStop(0, 'rgba(255,255,255,0)'); rg2.addColorStop(1, 'rgba(235,242,255,' + r.o + ')');
          ctx.globalAlpha = 1; ctx.strokeStyle = rg2; ctx.lineWidth = r.wd; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(ex, ey); ctx.stroke();
        }
        if (r.y > h + 30 || r.x < -40 || r.x > w + 40) wxParts[q] = makeWx(false);
      }
      // 시즌 아이콘(꽃게·억새 등)이 작게 둥둥 떠다녀요
      var fall = type === 'petals' || type === 'leaves' || type === 'snow' || type === 'rain';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (var j = 0; j < floats.length; j++) {
        var f = floats[j];
        f.y += fall ? f.v : -f.v;
        f.x += Math.sin(tt * 0.7 + f.ph) * 0.35;
        f.a = Math.sin(tt * 0.9 + f.ph) * 0.35;
        if (f.y > h + 30) { f.y = -ext - 24; f.x = rnd(0, w); }
        if (f.y < -ext - 30) { f.y = h + 24; f.x = rnd(0, w); }
        // 컬러 이모지는 fillStyle의 투명도를 따라가서, 불투명한 색으로 지정해요
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.a); ctx.globalAlpha = 0.6; ctx.fillStyle = '#000';
        ctx.font = Math.round(f.s) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        ctx.fillText(f.e, 0, 0); ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
    function makeWx(initial) {
      var lv = wx.level, z = Math.pow(Math.random(), 0.7) * 0.75 + 0.25, y = initial ? rnd(-ext - 20, h) : rnd(-ext - 60, -ext - 10);
      if (wx.kind === 'snow') return { z: z, x: rnd(-10, w + 10), y: y, s: (1.2 + lv * 0.5) * (1 + z * 2.2), vy: (0.35 + lv * 0.15) + z * 0.9, vx: rnd(-0.15, 0.15), ph: rnd(0, 6.28), o: 0.35 + z * 0.55 };
      var vy = (5 + lv * 1.6) * (0.55 + z * 0.6);
      return { z: z, x: rnd(-10, w + 60), y: y, s: (10 + lv * 5) * (0.5 + z * 0.9), vy: vy, vx: -vy * 0.12, wd: 0.5 + z * 0.9, o: 0.12 + z * (0.28 + lv * 0.06) };
    }
    function buildWx() {
      wxParts = [];
      if (!wx.kind) return;
      var n = Math.round((wx.kind === 'snow' ? [0, 45, 85, 140] : [0, 60, 120, 200])[wx.level] * Math.max(0.6, Math.min(1.4, w / 390)) * (h + ext) / Math.max(1, h));
      for (var i = 0; i < n; i++) wxParts.push(makeWx(true));
    }
    function setWeather(kind, level) {
      if (wx.kind === kind && wx.level === level) return;
      wx = { kind: kind, level: kind ? level : 0 };
      buildWx();
    }
    function loop(time) { if (!active) { raf = 0; return; } draw(time); raf = requestAnimationFrame(loop); }
    function start(cfg) {
      lastCfg = cfg;
      type = cfg.type; accent = cfg.accent; emojis = cfg.emojis || []; palOverride = cfg.palette || null; sizeRange = cfg.sizes || null;
      cancelAnimationFrame(raf);
      resize();
      parts = [];
      var n = count();
      // 떠다니는 아이콘이 있으면 기본 효과는 조금 덜어내요
      if (emojis.length && type !== 'leaves') n = Math.round(n * 0.6);
      if (type === 'sea') n = 0; // 물방울(동그라미)은 그리지 않아요. 물결만
      for (var i = 0; i < n; i++) parts.push(make(true));
      floats = [];
      var fn = emojis.length ? Math.round(Math.max(8, Math.min(16, Math.round(w / 32))) * (h + ext) / Math.max(1, h)) : 0;
      for (var k = 0; k < fn; k++) floats.push({ e: emojis[k % emojis.length], x: rnd(0, w), y: rnd(-ext, h), s: rnd(15, 24), v: rnd(0.25, 0.6), ph: rnd(0, 6.28), a: 0 });
      buildWx();
      t0 = performance.now();
      if (reduce) { draw(t0 + 1000); return; }
      if (active) raf = requestAnimationFrame(loop);
    }
    function setActive(on) {
      if (on === active) return;
      active = on;
      if (on && !reduce && !raf) { if (lastCfg && !w) start(lastCfg); else raf = requestAnimationFrame(loop); }
    }
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { if (lastCfg) start(lastCfg); }, 200);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (!reduce && active) raf = requestAnimationFrame(loop);
    });
    return { start: start, setWeather: setWeather, setActive: setActive };
  }
  var scene = makeScene($('hero-canvas'), true);
  // 지금 내리는 양(mm)까지 보고 판단: 날씨 코드는 '흐림'이어도 실제 강수량이 있으면 비로 봐요
  function precipNow(c) {
    var byCode = precipOf(c.weather_code);
    var mm = c.precipitation || 0, snow = c.snowfall || 0;
    // 실제로 내리는 양이 있을 때만 (날씨 코드만으로는 띄우지 않아요)
    if (mm < 0.1 && snow <= 0) return [null, 0];
    var kind = snow > 0 || byCode[0] === 'snow' ? 'snow' : 'rain';
    var lv = mm >= 4 ? 3 : mm >= 1 ? 2 : mm >= 0.1 ? 1 : byCode[1];
    return [kind, Math.max(lv, byCode[0] ? byCode[1] : 1)];
  }
  // RainViewer 레이더(약 10분 전 관측)에서 내 위치 주변 픽셀을 읽어 강수 세기 0~3 (못 읽으면 null)
  function radarPrecip(lat, lon) {
    return getJSON('https://api.rainviewer.com/public/weather-maps.json').then(function (m) {
      var past = m && m.radar && m.radar.past; if (!past || !past.length) return null;
      var f = past[past.length - 1], z = 7, n = Math.pow(2, z);
      var xt = (lon + 180) / 360 * n, yt = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n;
      var tx = Math.floor(xt), ty = Math.floor(yt), px = Math.floor((xt - tx) * 256), py = Math.floor((yt - ty) * 256);
      return new Promise(function (resolve) {
        var img = new Image(); img.crossOrigin = 'anonymous';
        img.onload = function () {
          try {
            var cv = document.createElement('canvas'); cv.width = cv.height = 256;
            var cx = cv.getContext('2d'); cx.drawImage(img, 0, 0);
            var x0 = Math.max(0, px - 3), y0 = Math.max(0, py - 3), d = cx.getImageData(x0, y0, 7, 7).data, hit = 0, sum = 0;
            for (var i = 0; i < d.length; i += 4) if (d[i + 3] > 0) { hit++; sum += d[i]; }
            // 주변 49칸 중 몇 칸만 걸리면 잡음(지형 반사 등)일 때가 많아서 비로 보지 않아요
            if (hit < 10) return resolve(0);
            // 흑백 색표(0): 밝을수록 강한 비
            var avg = sum / hit;
            resolve(hit < 20 ? 1 : avg > 150 ? 3 : avg > 90 ? 2 : 1);
          } catch (e) { resolve(null); }
        };
        img.onerror = function () { resolve(null); };
        img.src = m.host + f.path + '/256/' + z + '/' + tx + '/' + ty + '/0/0_0.png';
      });
    }).catch(function () { return null; });
  }
  // 날씨 코드 → 비/눈과 세기(1~3)
  function precipOf(code) {
    if ([71, 77, 85].indexOf(code) >= 0) return ['snow', 1];
    if (code === 73) return ['snow', 2];
    if (code === 75 || code === 86) return ['snow', 3];
    if (code >= 51 && code <= 57) return ['rain', 1];
    if (code === 61 || code === 66 || code === 80) return ['rain', 1];
    if (code === 63 || code === 81) return ['rain', 2];
    if (code === 65 || code === 67 || code === 82 || code >= 95) return ['rain', 3];
    return [null, 0];
  }

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
        '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,rain,showers,snowfall' +
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
        return { elev: d.elevation, source: d.source || 'open-meteo', lat: loc.lat, lon: loc.lon, place: loc.name, cc: loc.cc || '', country: loc.country || '', current: d.current, daily: d.daily, hours: hours, today: today, air: res[1], sample: false };
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

  var wxLoadedAt = 0, radarWait = null, fxWait = null;
  function renderWeather(w) {
    var c = w.current, d = w.daily, info = wmo(c.weather_code);
    wxLoadedAt = Date.now();
    // 예시 날씨일 때는 비·눈 효과를 띄우지 않아요
    // 비·눈은 예보 모델의 지금 강수량과 레이더(실제 관측)가 둘 다 '온다'고 할 때만 띄워요.
    // 레이더를 못 읽은 경우에만 모델 값을 따라요
    var pr = w.sample ? [null, 0] : precipNow(c);
    if (w.sample || w.lat == null || !pr[0]) scene.setWeather(null, 0);
    else radarWait = radarPrecip(w.lat, w.lon).then(function (lv) {
      if (lv == null) scene.setWeather(pr[0], pr[1]);
      else if (lv > 0) scene.setWeather(pr[0], lv);
      else scene.setWeather(null, 0);
    });
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
  function loadAnomaly(lat, lon) {
    var today = new Date(), key = ymd(today) + '@' + lat.toFixed(1) + ',' + lon.toFixed(1);
    var cached = store.get('anomaly', null);
    if (cached && cached.key === key) return Promise.resolve(cached.v);
    var q = 'latitude=' + lat + '&longitude=' + lon + '&daily=temperature_2m_mean&timezone=auto';
    var recent = getJSON('https://api.open-meteo.com/v1/forecast?' + q + '&past_days=30&forecast_days=1', 9000);
    var y = today.getFullYear();
    var past = getJSON('https://archive-api.open-meteo.com/v1/archive?' + q + '&start_date=' + (y - 10) + '-01-01&end_date=' + (y - 1) + '-12-31', 15000);
    return Promise.all([recent, past]).then(function (r) {
      var rd = r[0].daily, pd = r[1].daily;
      var days = {}, vals = [];
      rd.time.forEach(function (t, i) { if (t < ymd(today) && rd.temperature_2m_mean[i] != null) { days[t.slice(5)] = 1; vals.push(rd.temperature_2m_mean[i]); } });
      var norm = [];
      pd.time.forEach(function (t, i) { if (days[t.slice(5)] && pd.temperature_2m_mean[i] != null) norm.push(pd.temperature_2m_mean[i]); });
      if (vals.length < 20 || norm.length < 100) return null;
      var avg = function (a) { return a.reduce(function (x, v) { return x + v; }, 0) / a.length; };
      var v = Math.round((avg(vals) - avg(norm)) * 10) / 10;
      store.set('anomaly', { key: key, v: v });
      return v;
    }).catch(function () { return null; });
  }
  /* 해외에 있으면 시즌 대신 도시 이름 + 국기 + 그 나라 여행 키워드 */
  var travelMode = false, travelBands = null;
  // 해외: 국기 색을 국기 속 면적 비율 그대로 배경에. 라이트는 원색, 다크는 어둡게 눌러서.
  var hexRgb = function (h) { h = h.replace('#', ''); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); };
  var rgbHex = function (c) { return '#' + c.map(function (v) { return ('0' + Math.round(v).toString(16)).slice(-2); }).join(''); };
  var mixHex = function (a, b, t) { var x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map(function (v, i) { return v + (y[i] - v) * t; })); };
  var lum = function (h) { return hexRgb(h).reduce(function (s, v, i) { v /= 255; v = v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); };
  function toHsl(h) {
    var c = hexRgb(h).map(function (v) { return v / 255; }), mx = Math.max.apply(null, c), mn = Math.min.apply(null, c), l = (mx + mn) / 2, d = mx - mn, hh = 0, ss = 0;
    if (d) { ss = d / (1 - Math.abs(2 * l - 1)); hh = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4; hh *= 60; if (hh < 0) hh += 360; }
    return [hh, ss, l];
  }
  function fromHsl(hh, ss, l) {
    var c = (1 - Math.abs(2 * l - 1)) * ss, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, r;
    r = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
    return rgbHex(r.map(function (v) { return (v + m) * 255; }));
  }
  // 해외: 국기에 쓰인 색들을 그라데이션으로 섞되, 각 색이 국기에서 차지하는 만큼의 면적으로.
  // 낮(라이트)은 맑은 원색, 밤(다크)은 같은 색을 깊게 (빨강 → 버건디, 파랑 → 딥 네이비, 흰색 → 그 나라 색이 도는 차콜)
  function paintFlag() {
    if (!travelBands) return;
    var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    // 같은 색은 합쳐서 비율만 남겨요 (국기에 나오는 순서 유지)
    var agg = [];
    travelBands.forEach(function (b) {
      var hit = agg.filter(function (a) { return a[0].toLowerCase() === b[0].toLowerCase(); })[0];
      if (hit) hit[1] += b[1]; else agg.push([b[0], b[1]]);
    });
    var isWhite = function (h) { var x = toHsl(h); return x[2] > 0.9; };
    var main = agg.filter(function (a) { return !isWhite(a[0]); }).sort(function (x, y) { return y[1] - x[1]; })[0] || agg[0];
    // 흰색은 맨 끝(오른쪽 아래)으로: 글자가 놓이는 위쪽은 색이 있는 쪽이 되게
    agg = agg.filter(function (a) { return !isWhite(a[0]); }).concat(agg.filter(function (a) { return isWhite(a[0]); }));
    var cols = agg.map(function (a) {
      var c = a[0], x = toHsl(c);
      if (dark) c = isWhite(c) ? mixHex(main[0], '#121212', 0.8) : fromHsl(x[0], Math.min(1, x[1] * 0.9), Math.max(0.1, x[2] * 0.42));
      else c = isWhite(c) ? mixHex('#ffffff', main[0], 0.1) : fromHsl(x[0], x[1], Math.min(0.62, Math.max(0.34, x[2])));
      return [c, a[1]];
    });
    // 형태 없이 뭉게뭉게: 색마다 큰 번짐(radial)을 하나씩, 면적 비율만큼 크기를 키워서 겹쳐요.
    // 바탕은 모든 색을 비율대로 섞은 색이라 경계가 보이지 않아요.
    var total = cols.reduce(function (s, b) { return s + b[1]; }, 0);
    var base = cols.reduce(function (acc, b, i) { return i ? mixHex(acc[0], b[0], b[1] / (acc[1] + b[1])) && [mixHex(acc[0], b[0], b[1] / (acc[1] + b[1])), acc[1] + b[1]] : [b[0], b[1]]; }, null)[0];
    var spots = [[18, 12], [88, 28], [22, 78], [82, 92], [55, 52]];
    var heroH = $('hero').offsetHeight || 420, ext = parseFloat(getComputedStyle($('hero')).getPropertyValue('--ext')) || 0;
    var layers = cols.map(function (b, i) {
      var share = b[1] / total, size = Math.round(55 + Math.sqrt(share) * 95);
      // 배경 상자는 위로 ext 만큼 길어서, 세로 크기·위치는 '메인 영역' 높이(px)로 계산해요
      return 'radial-gradient(' + size + '% ' + Math.round(heroH * size * 0.009) + 'px at ' + spots[i % spots.length][0] + '% ' + Math.round(ext + heroH * spots[i % spots.length][1] / 100) + 'px, ' +
        b[0] + ' 0%, ' + b[0] + 'cc ' + Math.round(18 + share * 30) + '%, ' + b[0] + '00 100%)';
    });
    var hero = $('hero');
    $('hero-bg').style.background = layers.join(', ') + ', ' + base;
    // 글자가 놓이는 위쪽은 앞쪽 색들이 덮어요 → 그 밝기로 글자색 결정
    var topCols = cols.slice(0, Math.min(2, cols.length));
    var topLum = topCols.reduce(function (s, b) { return s + lum(b[0]) * b[1]; }, 0) / topCols.reduce(function (s, b) { return s + b[1]; }, 0);
    hero.classList.toggle('ink-dark', !dark && (topLum > 0.4 || lum(base) > 0.45));
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', cols[0][0]);
    document.documentElement.style.setProperty('--hero-a', cols[0][0]);
    document.documentElement.style.setProperty('--hero-b', cols[cols.length - 1][0]);
  }
  // 한국 시즌 배경도 라이트는 지금 색 그대로, 다크는 같은 색을 깊게 눌러서
  var seasonColors = null;
  function paintSeason() {
    if (!seasonColors || travelBands) return;
    var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    var cols = seasonColors.map(function (c) { if (!dark) return c; var x = toHsl(c); return fromHsl(x[0], Math.min(1, x[1] * 0.9), Math.max(0.08, x[2] * 0.45)); });
    document.documentElement.style.setProperty('--hero-a', cols[0]);
    document.documentElement.style.setProperty('--hero-b', cols[1]);
    var meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', cols[0]);
  }
  if (window.matchMedia) {
    var mqDark = matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { paintFlag(); paintSeason(); };
    // 메인 높이가 바뀌면(일정 줄 수 등) 국기 번짐 위치도 다시 맞춰요
    var heroH0 = 0;
    if (window.ResizeObserver) new ResizeObserver(function () { var hh = $('hero').offsetHeight; if (hh !== heroH0) { heroH0 = hh; if (travelBands) paintFlag(); } }).observe($('hero'));
    (mqDark.addEventListener ? mqDark.addEventListener.bind(mqDark, 'change') : mqDark.addListener.bind(mqDark))(onScheme);
  }
  function flagOf(cc) { return cc && cc.length === 2 ? String.fromCodePoint.apply(null, cc.toUpperCase().split('').map(function (c) { return 0x1F1E6 + c.charCodeAt(0) - 65; })) : '🌏'; }
  function applyPlace(w) {
    var cc = (w.cc || '').toUpperCase();
    var inKorea = cc === 'KR' || (!cc && w.lat > 32.5 && w.lat < 39 && w.lon > 124 && w.lon < 132);
    if (!cc || cc === 'KR') {
      if (travelMode) { travelMode = false; travelBands = null; $('hero').classList.remove('travel', 'ink-dark'); $('hero-bg').style.background = ''; }
      if (inKorea && !w.sample) {
        seasonCtx = { lat: w.lat, elev: w.elev, anomaly: null, today: new Date(), place: w.place };
        initSeason();
        // 올해 기온 편차는 따로 받아서 오면 한 번 더 반영
        loadAnomaly(w.lat, w.lon).then(function (an) {
          if (an == null || !seasonCtx) return;
          seasonCtx.anomaly = an; initSeason();
        });
      } else initSeason();
      return;
    }
    travelMode = true;
    var t = (window.TRAVEL || {})[cc] || { name: w.country || '해외', kw: ['현지 맛집', '로컬 시장', '기념품 쇼핑'] };
    // 가까운 인기 도시가 있으면 도시 키워드 우선
    var city = null, best = Infinity;
    (window.TRAVEL_CITIES || []).forEach(function (c) {
      if (w.lat == null) return;
      var dLat = (c.lat - w.lat) * 111, dLon = (c.lon - w.lon) * 111 * Math.cos(w.lat * Math.PI / 180), km = Math.sqrt(dLat * dLat + dLon * dLon);
      if (km <= c.r && km < best) { best = km; city = c; }
    });
    var cur = CURRENCY[cc];
    var kw = (city ? city.kw : t.kw).slice(0, cur ? 2 : 3), place = city ? city.name : w.place;
    var root = document.documentElement;
    var fc = (window.FLAG_COLORS || {})[cc] || ['#1d4e89', '#4f86c6', '#e8f4ff'];
    root.style.setProperty('--season', fc[2]);
    travelBands = (window.FLAG_BANDS || {})[cc] || [[fc[1], 1], [fc[2], 1], [fc[0], 1]];
    $('hero').classList.add('travel');
    paintFlag();
    $('season-name').textContent = place;
    $('season-phase').textContent = flagOf(cc) + ' ' + t.name;
    $('season-phase').dataset.phase = 'travel';
    $('season-kw').innerHTML = kw.map(function (k) {
      return '<a class="kw-chip" href="https://www.google.com/maps/search/' + encodeURIComponent(k + ' ' + place) + '" target="_blank" rel="noopener">' + esc(k) + '</a>';
    }).join('') + (cur ? '<button type="button" class="kw-chip fx-chip" id="fx-chip">' + (window.IS_EN ? 'Loading rate' : '환율 불러오는 중') + '</button>' : '');
    if (cur) fxWait = loadRate(cur[0]).then(function (krw) {
      var el = $('fx-chip'); if (!el || !krw) { if (el) el.remove(); return; }
      fx = { code: cur[0], sym: cur[1], unit: cur[2], krw: krw, t: (store.get('fx', {})[cur[0]] || {}).t || Date.now() };
      el.textContent = cur[1] + cur[2].toLocaleString('en-US') + ' = ' + won(krw * cur[2]);
      // 누르면 앱 안 환율 계산기
      el.onclick = function (e) { e.stopPropagation(); openFx(); };
    });
    $('hero-motif').innerHTML = '<span>' + flagOf(cc) + '</span>';
    // 흰색·연노랑 보케만, 크기는 다양하게
    scene.start({ type: 'lights', accent: fc[2], palette: ['#ffffff', '#fffdf2', '#fff6cc', '#ffefa8'], sizes: [1.5, 6] });
  }
  // 해외 환율: [통화, 기호, 보여줄 단위] — 1원 단위가 너무 작은 통화는 100·10,000 단위로
  var CURRENCY = {
    JP: ['JPY', '¥', 100], CN: ['CNY', '¥', 1], TW: ['TWD', 'NT$', 1], HK: ['HKD', 'HK$', 1], MO: ['MOP', 'MOP$', 1], TH: ['THB', '฿', 1],
    VN: ['VND', '₫', 10000], PH: ['PHP', '₱', 1], SG: ['SGD', 'S$', 1], MY: ['MYR', 'RM', 1], ID: ['IDR', 'Rp', 10000], US: ['USD', '$', 1],
    GU: ['USD', '$', 1], MP: ['USD', '$', 1], CA: ['CAD', 'C$', 1], GB: ['GBP', '£', 1], FR: ['EUR', '€', 1], IT: ['EUR', '€', 1],
    ES: ['EUR', '€', 1], PT: ['EUR', '€', 1], DE: ['EUR', '€', 1], CH: ['CHF', 'CHF ', 1], AT: ['EUR', '€', 1], CZ: ['CZK', 'Kč', 100],
    NL: ['EUR', '€', 1], TR: ['TRY', '₺', 1], AE: ['AED', 'AED ', 1], AU: ['AUD', 'A$', 1], NZ: ['NZD', 'NZ$', 1]
  };
  var fx = null;
  var won = function (v) { var a = Math.round(v).toLocaleString('ko-KR'); return window.IS_EN ? '₩' + a : a + '원'; };
  var num = function (v) { return parseFloat(String(v).replace(/[^\d.]/g, '')) || 0; };
  var fmtNum = function (v, dec) { return v ? v.toLocaleString('en-US', { maximumFractionDigits: dec }) : ''; };
  // 1·2·5 단위로 보기 좋은 금액
  var nice = function (x) { var p = Math.pow(10, Math.floor(Math.log10(x))), m = x / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
  // 환율 계산기: 아이폰 계산기처럼 위는 입력(사칙연산 가능), 아래는 바뀐 통화. ⇅ 로 방향 바꾸기
  var calc = { acc: null, op: null, cur: '0', fresh: true, toKrw: true };
  var OPS = { '+': function (a, b) { return a + b; }, '−': function (a, b) { return a - b; }, '×': function (a, b) { return a * b; }, '÷': function (a, b) { return b ? a / b : 0; } };
  function calcShow() {
    var v = calc.fresh && calc.acc != null ? calc.acc : parseFloat(calc.cur) || 0;
    var shown = calc.fresh && calc.acc != null ? fmtNum(calc.acc, 6) || '0' : (function () {
      var p = calc.cur.split('.'), i = Number(p[0].replace('-', '') || 0).toLocaleString('en-US');
      return (calc.cur[0] === '-' ? '-' : '') + i + (p.length > 1 ? '.' + p[1] : '');
    })();
    var out = calc.toKrw ? v * fx.krw : v / fx.krw;
    $('fx-a').textContent = shown;
    $('fx-b').textContent = fmtNum(Math.round(out * (calc.toKrw ? 1 : 100)) / (calc.toKrw ? 1 : 100), 2) || '0';
    $('fx-a-code').textContent = calc.toKrw ? fx.code : 'KRW';
    $('fx-b-code').textContent = calc.toKrw ? 'KRW' : fx.code;
    // 길어지면 글자를 줄여요
    $('fx-a').style.fontSize = shown.length > 11 ? '30px' : shown.length > 8 ? '38px' : '';
    Array.prototype.forEach.call(document.querySelectorAll('#fx-pad .op'), function (b) { b.classList.toggle('on', calc.fresh && calc.op === b.dataset.k); });
  }
  function calcKey(k) {
    if (/^\d$/.test(k)) { calc.cur = calc.fresh || calc.cur === '0' ? k : calc.cur.length < 12 ? calc.cur + k : calc.cur; calc.fresh = false; }
    else if (k === '.') { if (calc.fresh) { calc.cur = '0.'; calc.fresh = false; } else if (calc.cur.indexOf('.') < 0) calc.cur += '.'; }
    else if (k === 'back') { if (!calc.fresh) { calc.cur = calc.cur.slice(0, -1) || '0'; if (calc.cur === '-') calc.cur = '0'; } }
    else if (k === 'ac') { calc = { acc: null, op: null, cur: '0', fresh: true, toKrw: calc.toKrw }; }
    else if (k === 'neg') { if (calc.fresh && calc.acc != null) { calc.acc = -calc.acc; } else calc.cur = calc.cur[0] === '-' ? calc.cur.slice(1) : calc.cur === '0' ? '0' : '-' + calc.cur; }
    else if (k === '%') { var pv = (calc.fresh && calc.acc != null ? calc.acc : parseFloat(calc.cur) || 0) / 100; calc.cur = String(pv); calc.fresh = false; if (calc.op == null) calc.acc = null; }
    else if (OPS[k] || k === '=') {
      if (!calc.fresh || calc.acc == null) {
        var x = parseFloat(calc.cur) || 0;
        calc.acc = calc.acc != null && calc.op ? OPS[calc.op](calc.acc, x) : x;
        calc.acc = Math.round(calc.acc * 1e8) / 1e8;
      }
      calc.op = k === '=' ? null : k; calc.fresh = true; calc.cur = '0';
    }
    calcShow();
  }
  function openFx() {
    if (!fx) return;
    calc = { acc: null, op: null, cur: '0', fresh: true, toKrw: calc.toKrw };
    var d = new Date(fx.t);
    $('fx-rate').textContent = fx.sym + fx.unit.toLocaleString('en-US') + ' = ' + won(fx.krw * fx.unit) + ' · ' + (window.IS_EN ? 'updated ' : '') + pad(d.getHours()) + ':' + pad(d.getMinutes()) + (window.IS_EN ? '' : ' 기준');
    calcShow();
    openDialog($('fx-dialog'));
  }
  function initFx() {
    $('fx-pad').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (b) calcKey(b.dataset.k); });
    // 위아래 바꾸기: 지금 아래에 보이는 값을 위로 올려서 이어서 계산
    $('fx-swap').onclick = function () {
      var v = parseFloat($('fx-b').textContent.replace(/,/g, '')) || 0;
      calc = { acc: null, op: null, cur: String(v), fresh: false, toKrw: !calc.toKrw };
      if (!v) { calc.cur = '0'; calc.fresh = true; }
      calcShow();
    };
  }
  // 1 단위 = 몇 원인지. 6시간 동안 저장해 두고, 서버가 안 되면 마지막 값을 써요
  function loadRate(code) {
    var cache = store.get('fx', {}), hit = cache[code];
    if (hit && Date.now() - hit.t < 6 * 3600e3) return Promise.resolve(hit.krw);
    var save = function (krw) { if (krw) { cache[code] = { krw: krw, t: Date.now() }; store.set('fx', cache); } return krw; };
    return getJSON('https://open.er-api.com/v6/latest/' + code).then(function (r) { return save(r && r.rates && r.rates.KRW); })
      .catch(function () { return getJSON('https://api.frankfurter.app/latest?from=' + code + '&to=KRW').then(function (r) { return save(r && r.rates && r.rates.KRW); }); })
      .catch(function () { return hit ? hit.krw : null; });
  }
  // 향후 일주일 (오늘 포함 8일)
  // 날씨 앱 열기: 아이폰 기본 날씨(weather://) 또는 '날씨날씨' 단축어
  function weatherAppUrl() {
    return settings.weatherApp === 'shortcut'
      ? 'shortcuts://run-shortcut?name=' + encodeURIComponent('날씨날씨')
      : 'weather://';
  }
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
      rows.push('<li><a class="wk-row' + (day.getDay() === 0 ? ' sun' : day.getDay() === 6 ? ' sat' : '') + '">' +
        '<span class="wk-day"><b>' + label + '</b><span>' + (day.getMonth() + 1) + '/' + day.getDate() + '</span></span>' +
        '<span class="wk-ico" title="' + esc(info[0]) + '" aria-label="' + esc(info[0]) + '">' + info[1] + '</span>' +
        '<span class="wk-pop">' + (pop >= 20 ? pop + '%' : '') + '</span>' +
        '<span class="wk-temp mono"><span class="lo">' + mn + '°</span>' +
        '<span class="wk-bar"><i style="left:' + ((mn - lo) / span * 100) + '%;right:' + ((hi - mx) / span * 100) + '%"></i></span>' +
        '<span class="hi">' + mx + '°</span></span></a></li>');
    }
    $('wk-list').innerHTML = rows.join('');
    Array.prototype.forEach.call($('wk-list').querySelectorAll('a.wk-row'), function (a) { a.href = weatherAppUrl(); });
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
    // 오늘 남은 시간만 봐요 (저녁에 보면 12시간 안에 내일 새벽이 섞여서, 위에 '비 0%'인데 우산이 뜨던 문제)
    var restOfDay = [];
    for (var hi = 0; hi < w.hours.length && (hi === 0 || w.hours[hi].hour > w.hours[hi - 1].hour); hi++) restOfDay.push(w.hours[hi]);
    var pop = Math.max(d.precipitation_probability_max[0] || 0, Math.max.apply(null, restOfDay.map(function (h) { return h.pop || 0; }).concat(0)));
    // 날씨 코드는 기상청 모델 값이라 확률과 어긋날 때가 있어요 → 확률도 20% 이상일 때만 믿어요
    var likely = function (test) { return restOfDay.some(function (h) { return test(h.code) && (h.pop || 0) >= 20; }); };
    var snow = likely(isSnow) || (d.snowfall_sum && d.snowfall_sum[0] > 0 && pop >= 20);
    if (snow) {
      bring.push({ ico: '🥾', t: '미끄럼 방지 신발', lvl: 'high', why: '눈 소식이 있어요' });
      bring.push({ ico: '☂️', t: '장우산', lvl: 'mid' });
    } else if (pop >= 60 || likely(isRain)) {
      bring.push({ ico: '☂️', t: '장우산', v: pop + '%', lvl: 'high' });
    } else if (pop >= 30) {
      bring.push({ ico: '🌂', t: '접이식 우산', v: pop + '%', lvl: 'mid' });
    }
    var air = w.air;
    if (air && (air.pm2_5 > 35 || air.pm10 > 80)) bring.push({ ico: '😷', t: 'KF94 마스크', v: '먼지 나쁨', lvl: 'high', why: '미세 ' + Math.round(air.pm10) + ' · 초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    else if (air && (air.pm2_5 > 15 || air.pm10 > 30)) bring.push({ ico: '😷', t: '마스크', v: '먼지 보통', why: '초미세 ' + Math.round(air.pm2_5) + '㎍/㎥' });
    var uv = d.uv_index_max[0];
    var sunny = w.hours.slice(0, 8).map(function (h) { return h.code; }).filter(function (c) { return c <= 1; }).length >= 4;
    if (uv >= 6 || (uv >= 4 && sunny)) bring.push({ ico: '🕶️', t: '선글라스', v: 'UV ' + Math.round(uv), lvl: uv >= 8 ? 'high' : 'mid', why: '자외선이 강하거나 햇빛이 쨍해요' });
    if (uv >= 7 || d.temperature_2m_max[0] >= 30) bring.push({ ico: '🧢', t: '모자', v: uv >= 7 ? 'UV ' + Math.round(uv) : Math.round(d.temperature_2m_max[0]) + '°', lvl: 'mid' });
    if (w.current.wind_speed_10m >= 8) bring.push({ ico: '🌬️', t: '바람막이', v: Math.round(w.current.wind_speed_10m) + 'm/s', lvl: 'mid' });
    if (d.temperature_2m_min[0] <= 0) bring.push({ ico: '🔥', t: '핫팩', v: Math.round(d.temperature_2m_min[0]) + '°', lvl: 'mid' });
    if (!bring.length) bring.push({ ico: '👌', t: '특별히 없어요' });
    $('bring').innerHTML = bring.map(chip).join('');
  }

  /* ---------- 오늘의 업무 영어: 하루 한 문장 ---------- */
  function dayIndex() { var n = new Date(); return Math.floor(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) / 864e5); }
  // 같은 날엔 같은 값이 나오는 간단한 난수
  var hashDay = function (d, salt) { var x = Math.sin(d * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); };
  var PHRASE_BY_EN = {};
  (function () {
    var add = function (p, topic) {
      if (PHRASE_BY_EN[p.en]) return;
      PHRASE_BY_EN[p.en] = window.IS_EN && p.when_en ? Object.assign({}, p, { when: p.when_en, ko: p.meaning_en || p.ko, topic: topic }) : Object.assign({}, p, { topic: topic });
    };
    (window.PHRASE_TOPICS || []).forEach(function (t) { t.phrases.forEach(function (p) { add(p, t); }); });
    (window.PHRASES || []).forEach(function (p) { add(p, null); });
  })();
  // 날짜별로 보여준 문장을 저장해요 (공부한 표현은 여기서 쌓여요)
  function enLog() {
    var log = store.get('enLog', null);
    if (!log) {
      // 예전 방식(날짜 순서대로 돌던 문장)으로 이미 본 것들을 옮겨 와요
      log = {};
      var start = store.get('enStart', null), today = dayIndex(), l = window.PHRASES || [];
      if (start !== null && l.length) for (var d = start; d < today; d++) log[d] = l[((d % l.length) + l.length) % l.length].en;
      store.set('enLog', log);
    }
    return log;
  }
  // IT 업계 UI/UX 디자이너의 업무 영어만: 디자인·업무·발표·IT·이메일·금융 서비스 주제
  var WORK_TOPICS = ['design', 'work', 'presentation', 'tech', 'email', 'finance', 'research', 'handoff', 'accessibility', 'product', 'collab'];
  function pickPhrase(day) {
    var log = enLog();
    if (log[day] && PHRASE_BY_EN[log[day]]) return PHRASE_BY_EN[log[day]];
    var pool = [];
    (window.PHRASE_TOPICS || []).filter(function (t) { return WORK_TOPICS.indexOf(t.id) >= 0; })
      .forEach(function (t) { t.phrases.forEach(function (p) { if (pool.indexOf(p.en) < 0) pool.push(p.en); }); });
    (window.PHRASES || []).forEach(function (p) { if (pool.indexOf(p.en) < 0) pool.push(p.en); });
    // 아직 안 본 문장 중에서 하나. 다 봤으면 가장 오래전에 본 문장부터 다시 (복습)
    var last = {}; Object.keys(log).forEach(function (d) { last[log[d]] = Math.max(last[log[d]] || 0, +d); });
    var fresh = pool.filter(function (en) { return !last[en]; });
    var en = fresh.length ? fresh[Math.floor(hashDay(day, 2) * fresh.length)]
      : pool.slice().sort(function (a, b) { return last[a] - last[b]; })[0];
    log[day] = en; store.set('enLog', log);
    return PHRASE_BY_EN[en];
  }
  function renderPhrase() {
    var p = pickPhrase(dayIndex());
    var html = esc(p.en);
    if (p.key) {
      var k = esc(p.key), at = html.toLowerCase().indexOf(k.toLowerCase());
      if (at >= 0) html = html.slice(0, at) + '<mark>' + html.slice(at, at + k.length) + '</mark>' + html.slice(at + k.length);
    }
    $('en-text').innerHTML = html;
    $('en-ko').textContent = p.ko;
    $('en-when').textContent = (p.topic ? (window.IS_EN ? p.topic.name_en : p.topic.name) + ' · ' : '') + p.when;
  }
  // 날짜별 기록 (최신순, 중복 제외)
  function studiedPhrases() {
    var log = enLog(), seen = {}, out = [];
    pickPhrase(dayIndex());
    Object.keys(log).map(Number).sort(function (x, y) { return y - x; }).forEach(function (d) {
      var p = PHRASE_BY_EN[log[d]];
      if (p && !seen[p.en]) { seen[p.en] = 1; out.push(p); }
    });
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
    renderPhrase();
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
    $('cat-list').innerHTML = cats.map(function (c) {
      return '<li class="cat-row" data-id="' + esc(c.id) + '">' +
        '<span class="grip" aria-label="길게 눌러 순서 바꾸기">' + GRIP + '</span>' +
        '<input type="color" class="cat-color" value="' + c.color + '" aria-label="' + esc(c.name) + ' 색">' +
        '<input class="cat-name" value="' + esc(c.name) + '" maxlength="12" aria-label="카테고리 이름">' +
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
      var b = e.target.closest('[data-del-cat]'); if (!b) return;
      if (cats.length <= 1) { toast('카테고리는 하나 이상 있어야 해요'); return; }
      if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = '삭제?'; b.classList.add('armed'); return; }
      var id = b.closest('.cat-row').dataset.id;
      cats = cats.filter(function (c) { return c.id !== id; });
      saveCats(); renderCats(); renderSchedule();
    });
    // 손잡이를 끌거나, 줄을 길게 눌러서 순서 바꾸기
    makeSortable($('cat-list'), {
      item: '.cat-row', handle: '.grip', longPress: true,
      onEnd: function () {
        var ids = Array.prototype.map.call($('cat-list').children, function (li) { return li.dataset.id; });
        cats.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
        saveCats(); renderCats(); renderSchedule();
      }
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
  var saveSchedules = function () { store.set('schedules', schedules); if (typeof scheduleReminders === 'function') setTimeout(scheduleReminders, 0); };
  var toMin = function (hm) { if (!hm) return -1; var p = hm.split(':'); return +p[0] * 60 + +p[1]; };
  var parseYmd = function (k) { var p = k.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

  // 팝업이 열려 있는 동안 뒤 화면이 스크롤되지 않게 고정 (iOS는 body를 fixed로 묶어야 확실해요)
  var lockY = 0;
  // 아이폰 홈 화면 앱에서 body를 position:fixed로 고정하면 화면 아래에 빈 띠가 생겨서,
  // 페이지는 그대로 두고 overflow로만 막고, 팝업 밖에서 생기는 터치 스크롤은 직접 막아요.
  window.addEventListener('scroll', function () {
    if (document.documentElement.classList.contains('modal-open') && !document.querySelector('dialog[open]')) syncScrollLock();
  }, { passive: true });
  function syncScrollLock() {
    var anyOpen = !!document.querySelector('dialog[open]');
    var locked = document.documentElement.classList.contains('modal-open');
    if (anyOpen && !locked) {
      lockY = window.scrollY;
      anchorSheets();
      document.documentElement.classList.add('modal-open');
    } else if (!anyOpen && locked) {
      document.documentElement.classList.remove('modal-open');
      document.body.style.minHeight = '';
      sheetZ = 0;
      if (window.scrollY !== lockY) window.scrollTo(0, lockY);
    }
  }
  document.addEventListener('touchmove', function (e) {
    if (!document.documentElement.classList.contains('modal-open')) return;
    var d = e.target.closest && e.target.closest('dialog[open]');
    for (var el = e.target; d && el && el !== d.parentNode; el = el.parentNode) {
      if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return;
    }
    e.preventDefault();
  }, { passive: false });
  var typing = function () { var a = document.activeElement; return a && a.matches && a.matches('input:not([type=checkbox]), textarea, select'); };
  // 키보드가 닫힌 뒤 iOS가 남긴 화면 밀림만 되돌려요 (입력 중에는 건드리지 않음)
  function resetModalScroll() {
    if (document.documentElement.classList.contains('modal-open') && !typing() && window.scrollY !== lockY) window.scrollTo(0, lockY);
  }
  // 키보드가 올라오면 열린 팝업을 키보드 위 보이는 영역 안에 맞추고, 입력칸이 보이게 스크롤
  // 실제 화면 높이: 홈 화면 앱에서는 innerHeight·vh가 짧게 잡혀서 기기 화면 높이를 써요
  function setScreenH() {
    var standalone = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    var h = window.innerHeight;
    if (standalone && window.screen) {
      var land = window.innerWidth > window.innerHeight;
      h = Math.max(h, land ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height));
    }
    document.documentElement.style.setProperty('--screen-h', h + 'px');
  }
  setScreenH();
  window.addEventListener('resize', setScreenH);
  window.addEventListener('orientationchange', function () { setTimeout(setScreenH, 300); });
  // 시트는 아이폰의 '화면 고정 레이어'를 쓰지 않고 페이지 위에 직접 얹어요.
  // (홈 화면 앱에서 고정 레이어는 키보드·스크롤 뒤에 높이가 틀어지고 아래가 잘려서)
  // 열릴 때 '지금 화면의 아래 끝'을 페이지 좌표로 한 번 재서 거기에 붙이고, 그 뒤로는 움직이지 않아요.
  function anchorSheets() {
    // 지금 실제로 보이는 영역의 아래 끝(페이지 좌표). 아이폰이 이 값을 조금 짧게 줄 때가 있어서
    // 시트 배경은 아래로 넉넉히 이어 그려요(CSS box-shadow).
    var vv = window.visualViewport;
    // (vv.pageTop은 아이폰에서 스크롤을 막은 상태면 0으로 나와서 쓰지 않아요)
    // 아이폰이 보이는 높이를 가끔 짧게 줘서(아래 띠가 뜸), 기기 화면 높이와 비교해 큰 값을 써요
    var standalone = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    var full = Math.max(vv ? vv.offsetTop + vv.height : 0, window.innerHeight, standalone ? (window.innerWidth > window.innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)) : 0);
    var y = window.scrollY + full;
    document.documentElement.style.setProperty('--sheet-y', Math.round(y) + 'px');
    document.documentElement.style.setProperty('--sheet-h', Math.round(full) + 'px');
    document.body.style.minHeight = Math.round(y) + 'px';
  }
  // 키보드가 올라와도 시트는 그대로. 입력칸이 키보드에 가리면 시트 안 내용만 올려요.
  function revealFocused() {
    var a = document.activeElement, d = a && a.closest && a.closest('dialog.sheet[open]'), vv = window.visualViewport;
    if (!d || !typing() || !vv) return;
    var r = a.getBoundingClientRect(), limit = vv.offsetTop + vv.height - 12;
    if (r.bottom <= limit) return;
    for (var sc = a.parentNode; sc && sc !== d.parentNode; sc = sc.parentNode) {
      if (sc.scrollHeight > sc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowY)) break;
    }
    if (sc && sc !== d.parentNode) sc.scrollTop += r.bottom - limit;
  }
  if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { setTimeout(revealFocused, 50); });
  document.addEventListener('focusin', function () { setTimeout(revealFocused, 350); });
  // 키보드가 내려가면 아이폰이 밀어 둔 페이지 위치만 되돌려요
  document.addEventListener('focusout', function () { setTimeout(resetModalScroll, 150); });
  // 바텀시트를 아래로 끌어내리면 닫혀요 (안쪽 목록이 맨 위일 때만, 아니면 평소처럼 스크롤)
  (function () {
    var st = null;
    var scroller = function (el, d) {
      for (; el && el !== d.parentNode; el = el.parentNode) {
        if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return el;
      }
      return null;
    };
    document.addEventListener('touchstart', function (e) {
      st = null;
      var d = e.target.closest && e.target.closest('dialog.sheet[open]');
      if (!d || e.touches.length !== 1) return;
      if (e.target.closest('input, textarea, select, .tl-grip, .grip, [data-nodrag]')) return;
      st = { d: d, sc: scroller(e.target, d), x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, on: false, t: 0 };
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!st) return;
      var x = e.touches[0].clientX, y = e.touches[0].clientY;
      if (!st.on) {
        var dx = x - st.x, dy0 = y - st.y;
        if (Math.abs(dy0) < 6 && Math.abs(dx) < 6) return;
        if (dy0 <= 0 || Math.abs(dx) > Math.abs(dy0) || (st.sc && st.sc.scrollTop > 0)) { st = null; return; }
        st.on = true; st.y = y; st.t = Date.now();
        st.d.style.transition = 'none';
      }
      e.preventDefault();
      st.dy = Math.max(0, y - st.y);
      st.d.style.translate = '0 ' + st.dy + 'px';
    }, { passive: false });
    var end = function () {
      if (!st || !st.on) { st = null; return; }
      var d = st.d, fast = st.dy > 40 && st.dy / Math.max(1, Date.now() - st.t) > 0.5;
      d.style.transition = 'translate 0.2s ease';
      if (st.dy > 110 || fast) {
        d.style.translate = '0 100%';
        setTimeout(function () { closeDialog(d); d.style.transition = d.style.translate = ''; }, 190);
      } else {
        d.style.translate = '0 0';
        setTimeout(function () { d.style.transition = d.style.translate = ''; }, 210);
      }
      st = null;
    };
    document.addEventListener('touchend', end);
    document.addEventListener('touchcancel', end);
  })();
  // 시트를 열 때 첫 입력칸에 자동으로 포커스가 가서 키보드가 뜨지 않도록, 시트 자체에 포커스를 줘요
  var sheetZ = 0;
  function topSheet() {
    var best = null;
    Array.prototype.forEach.call(document.querySelectorAll('dialog.sheet[open]'), function (o) { if (!best || (+o.style.zIndex || 0) >= (+best.style.zIndex || 0)) best = o; });
    return best;
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var t = topSheet(); if (t) { e.preventDefault(); closeDialog(t); } } });
  function openDialog(d) {
    // 시트 위에 시트를 열면 새 것이 위로 와요
    var others = Array.prototype.some.call(document.querySelectorAll('dialog[open]'), function (o) { return o !== d; });
    if (!others) {
      // 첫 시트: 스크롤을 고정하고 지금 화면 아래 끝 자리를 먼저 잡은 다음에 열어요
      document.documentElement.classList.remove('modal-open');
      sheetZ = 0;
      lockY = window.scrollY;
      anchorSheets();
      document.documentElement.classList.add('modal-open');
    }
    d.style.zIndex = 102 + (++sheetZ);
    // show()는 안쪽에 포커스를 주면서 페이지를 그쪽으로 스크롤해 버려서, 속성만 켜서 열어요
    if (!d.open) d.setAttribute('open', '');
    var a = document.activeElement;
    if (a && a !== d && !d.contains(a) && typing()) a.blur();
  }
  function closeDialog(d) { if (d.close) d.close(); else d.removeAttribute('open'); syncScrollLock(); }
  // Esc·폼 닫기 등 어떤 방식으로 닫혀도 고정 해제
  Array.prototype.forEach.call(document.querySelectorAll('dialog'), function (d) {
    d.addEventListener('close', function () { setTimeout(syncScrollLock, 0); });
  });
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-close]');
    if (c) closeDialog(c.closest('dialog'));
    // 바깥(어두운 배경) 터치로 닫기: 배경 막은 body 위에 있어서 대상이 body로 잡혀요
    if ((e.target === document.body || e.target === document.documentElement) && document.documentElement.classList.contains('modal-open')) {
      var top = topSheet();
      if (top) closeDialog(top);
      return;
    }
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
    var card = function (s, state, timeLabel, rel, k) {
      var openEnded = !s.end; // 시간 미정·종료 시간 없는 일정은 직접 완료 처리
      var movable = !s.start;  // 시간 미정 일정은 끌어서 사이에 끼워 넣을 수 있어요
      return '<li class="tl-item ' + state + (s.important ? ' imp' : '') + (s.done ? ' done' : '') + (openEnded ? ' has-done' : '') + (movable ? ' movable' : '') + (s.sample ? ' is-sample' : '') + '" data-id="' + s.id + '" data-min="' + k + '" style="--c: ' + catOf(s.cat).color + '">' +
        '<span class="tl-time">' + (movable ? '<span class="tl-grip" aria-label="끌어서 옮기기">' + GRIP + '</span>' : timeLabel) + '</span><span class="tl-dot"></span>' +
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
    // 일정을 순서대로 그리고, 현재 시각 줄은 '아직 남은 첫 일정' 바로 앞에 넣어요.
    // 지난 일: 완료했거나, 시작 시각이 지났거나(진행 중 포함). 아직 안 끝낸 시간 미정 일정은 항상 현재 줄 아래로
    var rows = [];
    // 끝낸 시각(오늘 몇 분째). 예전에 끝내서 기록이 없으면 원래 자리 값
    var doneMin = function (s, fallback) {
      if (!s.doneAt) return fallback;
      var d = new Date(s.doneAt);
      return ymd(d) === key ? d.getHours() * 60 + d.getMinutes() : ymd(d) < key ? -1 : fallback;
    };
    orderDay(all).forEach(function (s) {
      var k = seqMin(s, all.indexOf(s));
      if (!s.start) {
        rows.push({ html: card(s, diff < 0 || s.done ? 'past' : '', '미정', '', k), behind: !!s.done, when: doneMin(s, k) });
        return;
      }
      var st = toMin(s.start), en = s.end ? toMin(s.end) : null;
      // 종료 시간이 없으면 다음 시간 일정이 시작될 때까지(그 뒤 일정이 없으면 '완료'를 누를 때까지) 진행 중
      if (en == null) en = implicitEnd(s, all);
      var state = s.done || diff < 0 ? 'past' : diff > 0 ? '' : en != null && en <= nowMin ? 'past' : st <= nowMin ? 'current' : '';
      rows.push({ html: card(s, state, s.start, '', k), behind: s.done || st <= nowMin, when: st <= nowMin ? st : doneMin(s, st) });
    });
    var at = -1;
    if (diff === 0 && list.length) {
      // 현재 줄 위: 완료했거나 이미 시작한 일정을 '지나간 순서'(시작한 시각·끝낸 시각)대로. 줄 아래: 아직 남은 일정 (순서 그대로)
      var above = rows.map(function (r, i) { r.i = i; return r; }).filter(function (r) { return r.behind; })
        .sort(function (a, b) { return a.when - b.when || a.i - b.i; });
      rows = above.concat(rows.filter(function (r) { return !r.behind; }));
      at = above.length;
    }
    var html = rows.map(function (r, i) { return (i === at ? nowRow(now) : '') + r.html; }).join('') + (at === rows.length ? nowRow(now) : '');
    $('timeline').innerHTML = html;
    renderNowNext();
  }
  // 끝나는 시간이 없는 일정은 다음 시간 일정의 시작 시각에 끝난 걸로 봐요
  function implicitEnd(s, all) {
    var st = toMin(s.start), next = null;
    all.forEach(function (o) { if (o !== s && o.start && !o.done) { var m = toMin(o.start); if (m > st && (next == null || m < next)) next = m; } });
    return next;
  }
  function nowRow(now) {
    return '<li class="tl-now" aria-label="현재 시각"><span class="tl-time">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</span><span class="now-dot"></span><span class="now-line"></span></li>';
  }

  // 오늘 버튼 → 다가오는 일정: 날짜 + 키워드 (지난 날은 숨김, 주가 바뀌면 간격)
  var hhmm = function (t) { return t ? t.replace(':', '') : ''; };
  function weekKey(d) { var m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return ymd(m); }
  // 시간 있는 일정은 시간순, 시간 없는 일정은 적은 순서대로 맨 뒤
  // 시간 있는 일정은 시작 시각, 시간 미정 일정은 끌어다 놓은 자리(pos) 기준. 자리가 없으면 맨 뒤
  function seqMin(s, i) { return s.start ? toMin(s.start) : (s.pos != null ? s.pos : 10000 + i); }
  function orderDay(list) {
    return list.map(function (s, i) { return { s: s, k: seqMin(s, i), i: i }; })
      .sort(function (a, b) { return a.k - b.k || a.i - b.i; })
      .map(function (x) { return x.s; });
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
          return (i ? '<span class="dl-sep">-</span>' : '') + '<span class="dl-item' + (s.important ? ' imp' : '') + (s.sample ? ' is-sample' : '') + '" style="--c:' + catOf(s.cat).color + '">' +
            (s.start ? '<span class="dl-time">' + hhmm(s.start) + '</span>' : '') + esc(s.title) + '</span>';
        }).join('') + '</span></button></li>';
    });
    $('uplist').innerHTML = html;
  }

  /* 지금 · 다음 (홈 상단 요약) */
  // 198분 → 3시간 18분
  function dur(m) { return m < 60 ? m + '분' : Math.floor(m / 60) + '시간' + (m % 60 ? ' ' + (m % 60) + '분' : ''); }
  function relLabel(m) { return dur(m) + ' 후'; }
  // 시간 있는 일정 우선, 비는 시간에는 시간 미정 일정을 쌓인 순서대로 보여줘요
  // 지금: 진행 중인 일정 → 없으면 자리가 이미 지난 시간 미정 일정. 지금이 비면 다음 할 일 두 개.
  function renderNowNext() {
    var key = ymd(new Date()), now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
    var raw = schedules[key] || [];
    var seq = orderDay(raw).filter(function (s) { return !s.done; });
    var running = seq.filter(function (s) {
      if (!s.start || toMin(s.start) > nm) return false;
      var en = s.end ? toMin(s.end) : implicitEnd(s, raw);
      return en == null || nm < en;
    });
    var cur = running[running.length - 1] || seq.find(function (s) { return !s.start && seqMin(s, raw.indexOf(s)) <= nm; }) || null;
    var upcoming = seq.filter(function (s) {
      if (s === cur) return false;
      if (s.start) return toMin(s.start) > nm;
      return true; // 끝내지 않은 시간 미정 일정은 아직 할 일
    });
    var item = function (s, kind, label, bar) {
      return '<button type="button" class="nn-item ' + kind + (s.important ? ' imp' : '') + (s.sample ? ' is-sample' : '') + '" data-id="' + s.id + '" style="--c: ' + catOf(s.cat).color + '">' +
        '<span class="nn-label">' + label + '</span>' +
        '<span class="nn-title">' + esc(s.title) + '</span>' +
        // 시간이 없으면 '시간 미정' 대신 장소만 (둘 다 없으면 줄 자체를 빼요)
        (function () { var m = [s.start ? s.start + (s.end ? '–' + s.end : '') : '', s.place ? esc(s.place) : ''].filter(Boolean).join(' · ');
          return m ? '<span class="nn-meta">' + m + '</span>' : ''; })() +
        (bar != null ? '<span class="nn-bar"><i style="width:' + bar + '%"></i></span>' : '') + '</button>';
    };
    var nextLabel = function (s) { return s.start ? '다음 · ' + relLabel(toMin(s.start) - nm) : '다음 할 일'; };
    var html = '';
    if (cur && cur.start && cur.end) {
      var st = toMin(cur.start), en = toMin(cur.end);
      html += item(cur, 'current', '진행 중 · ' + dur(en - nm) + ' 남음', Math.round((nm - st) / (en - st) * 100));
    } else if (cur && cur.start) html += item(cur, 'current', '진행 중 · ' + dur(nm - toMin(cur.start)) + '째');
    else if (cur) html += item(cur, 'current', '지금 할 일');
    var nexts = upcoming.slice(0, cur ? 1 : 2);
    html += nexts.map(function (s) { return item(s, 'next', nextLabel(s)); }).join('');
    if (!cur && !nexts.length) {
      html = raw.length ? '<div class="nn-item idle all-done"><span class="nn-label">오늘</span><span class="nn-title">오늘 할 일을 모두 마쳤어요. 수고했어요! 🎉</span></div>'
        : '<div class="nn-item idle all-done"><span class="nn-label">오늘</span><span class="nn-title">오늘은 예정된 일정이 없어요. 여유로운 하루 보내세요</span></div>';
    }
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
    renderRemind(s);
    var order = allEventsOrdered(), pos = order.findIndex(function (x) { return x.key === key && x.id === id; });
    $('dt-prev').disabled = pos <= 0;
    $('dt-next').disabled = pos < 0 || pos >= order.length - 1;
    var od = parseYmd(key);
    $('dt-pos').textContent = (od.getMonth() + 1) + '/' + od.getDate() + ' ' + DAYS[od.getDay()];
    $('dt-imp').setAttribute('aria-pressed', String(!!s.important));
    $('dt-title').classList.toggle('imp', !!s.important);
    $('dt-title').classList.toggle('is-sample', !!s.sample);
    $('dt-title').textContent = s.title;
    $('dt-meta').textContent = (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + DAYS[d.getDay()] + ')' + (s.start ? ' ' + s.start + (s.end ? '–' + s.end : '') : ' · 시간 미정');
    closeInlineEdits();
    renderDetailPlace(s);
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

  /* 상세: 누른 곳만 그 자리에서 고치기 */
  function closeInlineEdits() {
    $('dt-title').hidden = false; $('dt-title-in').hidden = true;
    $('dt-meta').hidden = false; $('dt-when').hidden = true;
    $('dt-place-edit').hidden = true; document.querySelector('.dt-place-row').hidden = false;
  }
  function renderDetailPlace(s) {
    $('dt-place-text').innerHTML = s.place ? '<span aria-hidden="true">📍</span>' + esc(s.place) : '<span aria-hidden="true">📍</span><span class="ph-add">장소 추가</span>';
    $('dt-place').hidden = !s.place;
    if (s.place) { var mp = mapOf(s.place, s.abroad); $('dt-place').href = mp.href; $('dt-place').classList.toggle('google', !!s.abroad); $('dt-place').innerHTML = mp.label + ' ›'; }
  }
  function detailItem() { return detail && findItem(detail.key, detail.id); }
  function afterDetailEdit(s, msg) {
    s.rev = (s.rev || 0) + 1;
    saveSchedules(); renderSchedule();
    openDetail(detail.key, detail.id);
    if (msg) toast(msg);
  }
  function initInlineEdit() {
    // 제목
    var editTitle = function () {
      var s = detailItem(); if (!s) return;
      $('dt-title').hidden = true; $('dt-title-in').hidden = false;
      $('dt-title-in').value = s.title; $('dt-title-in').focus(); $('dt-title-in').select();
    };
    $('dt-title').addEventListener('click', editTitle);
    $('dt-title').addEventListener('keydown', function (e) { if (e.key === 'Enter') editTitle(); });
    var saveTitle = function () {
      var s = detailItem(); if (!s || $('dt-title-in').hidden) return;
      var v = $('dt-title-in').value.trim();
      if (v && v !== s.title) { s.title = v; afterDetailEdit(s, '제목을 고쳤어요'); } else closeInlineEdits();
    };
    $('dt-title-in').addEventListener('blur', saveTitle);
    $('dt-title-in').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('dt-title-in').blur(); }
      if (e.key === 'Escape') { e.preventDefault(); $('dt-title-in').value = detailItem().title; $('dt-title-in').blur(); }
    });
    // 날짜·시간
    var syncTimes = function () { $('dt-times').hidden = !$('dt-timed').checked; };
    var editWhen = function () {
      var s = detailItem(); if (!s) return;
      $('dt-meta').hidden = true; $('dt-when').hidden = false;
      $('dt-date').value = detail.key;
      $('dt-timed').checked = !!s.start;
      $('dt-start').value = s.start || ''; $('dt-end').value = s.end || '';
      syncTimes();
    };
    $('dt-meta').addEventListener('click', editWhen);
    $('dt-meta').addEventListener('keydown', function (e) { if (e.key === 'Enter') editWhen(); });
    $('dt-timed').addEventListener('change', function () {
      syncTimes();
      if ($('dt-timed').checked && !$('dt-start').value) $('dt-start').value = pad(Math.min(new Date().getHours() + 1, 23)) + ':00';
    });
    $('dt-when-done').onclick = function () {
      var s = detailItem(); if (!s) return;
      var date = $('dt-date').value || detail.key, timed = $('dt-timed').checked;
      var start = timed ? $('dt-start').value : '', end = timed ? $('dt-end').value : '';
      if (timed && !start) { toast('시작 시간을 입력하거나 "시간 정하기"를 꺼 주세요'); return; }
      if (start && end && toMin(end) <= toMin(start)) { toast('종료 시간은 시작 시간보다 늦어야 해요'); return; }
      s.start = start; s.end = end;
      if (start) delete s.pos;
      if (date !== detail.key) {
        schedules[detail.key] = (schedules[detail.key] || []).filter(function (x) { return x.id !== s.id; });
        if (!schedules[detail.key].length) delete schedules[detail.key];
        (schedules[date] || (schedules[date] = [])).push(s);
        detail.key = date; viewDate = parseYmd(date);
      }
      afterDetailEdit(s, '날짜·시간을 고쳤어요');
    };
    // 장소
    var editPlace = function () {
      var s = detailItem(); if (!s) return;
      document.querySelector('.dt-place-row').hidden = true; $('dt-place-edit').hidden = false;
      $('dt-place-in').value = s.place || ''; $('dt-abroad').checked = !!s.abroad;
      $('dt-place-in').focus();
    };
    $('dt-place-text').addEventListener('click', editPlace);
    var savePlace = function () {
      var s = detailItem(); if (!s) return;
      s.place = $('dt-place-in').value.trim(); s.abroad = $('dt-abroad').checked;
      afterDetailEdit(s, s.place ? '장소를 고쳤어요' : '장소를 지웠어요');
    };
    $('dt-place-done').onclick = savePlace;
    $('dt-place-in').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); savePlace(); } });
  }

  /* ---------- 일정 알림 ----------
     시간 있는 일정은 기본 30분 전. 앱이 켜져 있거나 최근에 열려 있으면 알림을 띄우고,
     아이폰 캘린더로 보낸 일정에는 같은 시간의 캘린더 알림이 들어가요(앱이 꺼져 있어도 울려요). */
  function remindOf(s) { if (!s || !s.start) return 0; return s.remind || 0; }
  function renderRemind(s) {
    var r = remindOf(s), timed = !!s.start;
    $('dt-remind').hidden = !timed;
    Array.prototype.forEach.call($('dt-remind').children, function (b) { b.setAttribute('aria-checked', String(+b.dataset.r === r)); });
    var perm = 'Notification' in window ? Notification.permission : 'unsupported';
    $('dt-remind-hint').textContent = !timed ? '시간을 정하면 알림을 받을 수 있어요.'
      : !r ? ''
      : perm === 'denied' ? '알림이 꺼져 있어요. 아이폰 설정 → 알림 → 오늘에서 허용해 주세요.'
      : perm === 'unsupported' ? '이 브라우저는 알림을 지원하지 않아요. 홈 화면에 추가한 앱에서 써 주세요.'
      : r ? '앱이 꺼져 있으면 울리지 않을 수 있어요. 확실하게 받으려면 아래 iPhone 캘린더로도 추가하세요.' : '';
    if (timed && r && perm === 'default') {
      $('dt-remind-hint').innerHTML = '알림을 받으려면 먼저 허용해 주세요. <button type="button" class="link-btn" id="dt-perm">알림 허용하기</button>';
      $('dt-perm').onclick = function () { askNotifyPermission().then(function () { renderRemind(s); scheduleReminders(); }); };
    }
  }
  var remindTimers = [];
  function notify(s, key) {
    var mins = Math.max(0, Math.round((startDate(key, s) - Date.now()) / 60000));
    var body = tr((mins ? mins + '분 후 시작' : '곧 시작') + ' · ' + s.start + (s.place ? ' · ' + s.place : ''));
    var opts = { body: body, tag: 'remind-' + s.id + '-' + key, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: './' } };
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(function (reg) { reg.showNotification(s.title, opts); });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification(s.title, opts); } catch (e) { /* 무시 */ }
    }
    toast('🔔 ' + s.title + ' · ' + body);
  }
  function startDate(key, s) { var d = parseYmd(key), p = s.start.split(':'); d.setHours(+p[0], +p[1], 0, 0); return d.getTime(); }
  function scheduleReminders() {
    remindTimers.forEach(clearTimeout); remindTimers = [];
    // 알림 서버가 연결돼 있으면 서버가 보내요 (앱 안 타이머는 겹치니까 쓰지 않아요)
    if (push.on) { syncPush(); return; }
    var fired = store.get('fired', {}), now = Date.now(), changed = false;
    var keys = [ymd(new Date()), ymd(new Date(now + 864e5))];
    keys.forEach(function (key) {
      (schedules[key] || []).forEach(function (s) {
        var r = remindOf(s); if (!r || s.done) return;
        var at = startDate(key, s) - r * 60000, id = s.id + '@' + key + '@' + s.start + '@' + r;
        if (fired[id]) return;
        if (at <= now) {
          // 알림 시각이 지났지만 아직 시작 전이면 지금이라도 알려줘요
          if (startDate(key, s) > now && now - at < 60 * 60000) { notify(s, key); fired[id] = 1; changed = true; }
          return;
        }
        if (at - now < 864e5) remindTimers.push(setTimeout(function () {
          var f = store.get('fired', {}); if (f[id]) return;
          f[id] = 1; store.set('fired', f);
          // 앱이 꺼져 있는 동안 아이폰이 타이머를 멈췄다가 다시 열 때 한꺼번에 울려요.
          // 이미 일정이 시작됐거나 알림 시각에서 3분 넘게 늦었으면 울리지 않아요.
          var t = Date.now();
          if (t >= startDate(key, s) || t - at > 3 * 60000) return;
          notify(s, key);
        }, at - now));
      });
    });
    if (changed) store.set('fired', fired);
  }
  /* 알림 서버 (Web Push): 앱이 꺼져 있어도 제시간에 오게 */
  var push = store.get('push', { url: '', on: false });
  if (!push.token) { push.token = Array.from(crypto.getRandomValues(new Uint8Array(16)), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); store.set('push', push); }
  var pushBase = function () { return (push.url || '').replace(/\/+$/, ''); };
  function u8(b64) {
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // 앞으로 7일 동안 울릴 알림 목록
  function upcomingReminders() {
    var now = Date.now(), out = [];
    for (var i = 0; i < 8; i++) {
      var key = ymd(new Date(now + i * 864e5));
      (schedules[key] || []).forEach(function (s) {
        var r = remindOf(s); if (!r || s.done) return;
        var start = startDate(key, s), at = start - r * 60000;
        if (at < now - 60000) return;
        out.push({ id: s.id + '@' + key + '@' + s.start + '@' + r, at: at, title: s.title,
          body: tr((r >= 60 ? (r / 60) + '시간' : r + '분') + ' 후 시작 · ' + s.start + (s.place ? ' · ' + s.place : '')) });
      });
    }
    return out;
  }
  var pushTimer = 0;
  function syncPush(now) {
    if (!push.on || !pushBase()) return Promise.resolve();
    clearTimeout(pushTimer);
    var run = function () {
      return navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) {
        if (!sub) { push.on = false; store.set('push', push); renderPushStatus('구독이 풀렸어요. 다시 연결해 주세요.'); return; }
        return fetch(pushBase() + '/sync', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: push.token, sub: sub.toJSON(), reminders: upcomingReminders() }) });
      }).catch(function () { /* 오프라인이면 다음에 다시 */ });
    };
    if (now) return run();
    pushTimer = setTimeout(run, 1500);
    return Promise.resolve();
  }
  function renderPushStatus(msg) {
    if (!$('push-status')) return;
    $('set-push').value = push.url || '';
    $('push-status').textContent = msg || (push.on ? '✅ 연결됨 · 앱이 꺼져 있어도 일정 알림이 제시간에 와요.' : '연결하면 앱이 꺼져 있어도 일정 알림이 제시간에 와요.');
    $('push-test').hidden = !push.on;
    $('push-connect').textContent = push.on ? '다시 연결' : '연결';
  }
  function connectPush() {
    var url = $('set-push').value.trim().replace(/\/+$/, '');
    if (!/^https:\/\//.test(url)) { renderPushStatus('https:// 로 시작하는 서버 주소를 넣어 주세요.'); return; }
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) { renderPushStatus('이 화면에서는 푸시를 쓸 수 없어요. 홈 화면에 추가한 앱에서 연결해 주세요.'); return; }
    renderPushStatus('연결하는 중…');
    var perm = 'Notification' in window && Notification.permission === 'default' ? Notification.requestPermission() : Promise.resolve();
    perm.then(function () {
      if (Notification.permission !== 'granted') throw new Error('알림이 꺼져 있어요. 아이폰 설정 → 알림 → 오늘에서 허용해 주세요.');
      return fetch(url + '/vapid').then(function (r) { if (!r.ok) throw new Error('서버에 연결하지 못했어요. 주소를 확인해 주세요.'); return r.json(); });
    }).then(function (v) {
      return navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (old) { return old ? old.unsubscribe() : null; }).then(function () {
          return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: u8(v.publicKey) });
        });
      });
    }).then(function () {
      push.url = url; push.on = true; store.set('push', push);
      return syncPush(true);
    }).then(function () { renderPushStatus(); toast('알림 서버에 연결했어요'); })
      .catch(function (e) { push.on = false; store.set('push', push); renderPushStatus((e && e.message) || '연결하지 못했어요.'); });
  }
  function askNotifyPermission() {
    if (!('Notification' in window) || Notification.permission !== 'default') return Promise.resolve();
    return Notification.requestPermission().catch(function () {});
  }

  /* 캘린더 연동 */
  function stamp(key, hm) { return key.replace(/-/g, '') + 'T' + hm.replace(':', '') + '00'; }
  function nextDayKey(key) { var d = parseYmd(key); d.setDate(d.getDate() + 1); return ymd(d); }
  function endOf(s) { if (s.end) return s.end; if (!s.start) return ''; var m = Math.min(toMin(s.start) + 60, 23 * 60 + 59); return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function calendarLinks(key, s) {
    // 시간대를 붙이지 않아요: 어느 나라에 있든 적어 둔 시각 그대로(현지 시각) 보이게
    var end = endOf(s);
    var details = s.memo || '';
    var g = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(s.title) +
      '&dates=' + (s.start ? stamp(key, s.start) + '/' + stamp(key, end) : key.replace(/-/g, '') + '/' + nextDayKey(key).replace(/-/g, '')) +
      (details ? '&details=' + encodeURIComponent(details) : '') +
      (s.place ? '&location=' + encodeURIComponent(s.place) : '');
    return { google: g };
  }
  function icsText(key, s) {
    var escI = function (v) { return String(v || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1'); };
    var nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    return [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//todays-assistant//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + s.id + '@todays-assistant',
      'SEQUENCE:' + (s.rev || 0),
      'DTSTAMP:' + nowUtc,
      'LAST-MODIFIED:' + nowUtc,
      // 시간대 없는 '떠 있는 시각': 해외에 가도 8시는 8시로 보여요
      s.start ? 'DTSTART:' + stamp(key, s.start) : 'DTSTART;VALUE=DATE:' + key.replace(/-/g, ''),
      s.start ? 'DTEND:' + stamp(key, endOf(s)) : 'DTEND;VALUE=DATE:' + nextDayKey(key).replace(/-/g, ''),
      'SUMMARY:' + escI(s.title),
      s.place ? 'LOCATION:' + escI(s.place) : '',
      s.memo ? 'DESCRIPTION:' + escI(s.memo) : '',
      remindOf(s) ? ['BEGIN:VALARM', 'TRIGGER:-PT' + remindOf(s) + 'M', 'ACTION:DISPLAY', 'DESCRIPTION:' + escI(s.title), 'END:VALARM'].join('\r\n') : '',
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
    makeSortable($('timeline'), {
      item: '.tl-item', handle: '.tl-grip', longPress: true,
      canDrag: function (li) { return li.classList.contains('movable'); },
      onEnd: function (li) {
        var key = ymd(viewDate), it = findItem(key, li.dataset.id); if (!it) return;
        var sib = function (el, dir) { do { el = dir < 0 ? el.previousElementSibling : el.nextElementSibling; } while (el && !el.classList.contains('tl-item')); return el; };
        var p = sib(li, -1), n = sib(li, 1);
        var pm = p ? +p.dataset.min : null, nm = n ? +n.dataset.min : null;
        it.pos = pm != null && nm != null ? (pm + nm) / 2 : pm != null ? pm + 1 : nm != null ? nm - 1 : 0;
        saveSchedules(); renderSchedule();
      }
    });
    $('timeline').addEventListener('click', function (e) {
      var d = e.target.closest('[data-done]');
      if (d) {
        var it = findItem(ymd(viewDate), d.dataset.done); if (!it) return;
        it.done = !it.done;
        // 언제 끝냈는지 기억해 두면, 타임라인 위쪽(지난 일)을 끝낸 순서대로 쌓을 수 있어요
        if (it.done) it.doneAt = Date.now(); else delete it.doneAt;
        saveSchedules(); renderSchedule();
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
    $('dt-remind').addEventListener('click', function (e) {
      var b = e.target.closest('[data-r]'); if (!b) return;
      var s = findItem(detail.key, detail.id); if (!s) return;
      s.remind = +b.dataset.r; s.rev = (s.rev || 0) + 1;
      saveSchedules();
      var after = function () { renderRemind(s); scheduleReminders(); toast(s.remind ? '시작 ' + (s.remind === 60 ? '1시간' : s.remind + '분') + ' 전에 알려드릴게요' : '알림을 껐어요'); };
      if (s.remind) askNotifyPermission().then(after); else after();
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
      return '<div class="cl-group' + (g.collapsed ? ' collapsed' : '') + (g.sample ? ' is-sample' : '') + '" data-g="' + g.id + '">' +
        '<div class="cl-head">' +
          '<button type="button" class="cl-fold" data-act="fold" aria-expanded="' + !g.collapsed + '" aria-label="' + esc(g.title) + (g.collapsed ? ' 펼치기' : ' 접기') + '"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z"/></svg></button>' +
          '<input class="cl-title" value="' + esc(g.title) + '" maxlength="30" aria-label="목록 제목">' +
          '<span class="cl-count mono">' + done + '/' + total + '</span>' +
          (lists.length > 1 ? '<span class="grip cl-grip" aria-label="' + esc(g.title) + ' 끌어서 순서 바꾸기">' + GRIP + '</span>' : '') +
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
      inp.value = ''; // 다시 그릴 때 아래 focusout이 한 번 더 추가하지 않게
      g.items.push({ id: uid(), text: v, done: false });
      touch(g); renderLists(g.id);
    });
    // 아이폰 키보드 위 '완료(✓)'로 빠져나가면 추가, 화면 다른 곳을 눌러 빠져나가면 취소(지워요).
    // 완료 버튼은 화면 터치 없이 포커스만 빠지고, 다른 곳을 누르면 바로 앞에 터치가 있어요
    var lastTap = 0;
    document.addEventListener('pointerdown', function () { lastTap = Date.now(); }, true);
    document.addEventListener('touchstart', function () { lastTap = Date.now(); }, { capture: true, passive: true });
    // 입력칸을 눌러 들어온 터치는 세지 않아요 (글자를 치면 초기화)
    root.addEventListener('input', function (e) { if (e.target.classList.contains('cl-new-input')) lastTap = 0; });
    root.addEventListener('focusout', function (e) {
      if (!e.target.classList.contains('cl-new-input')) return;
      if (document.hidden) return; // 앱을 잠깐 내렸을 때는 그대로 둬요
      var v = e.target.value.trim(); if (!v) return;
      if (Date.now() - lastTap < 800) { e.target.value = ''; return; }
      var gEl = e.target.closest('.cl-group'), g = gEl && findGroup(gEl.dataset.g); if (!g) return;
      e.target.value = '';
      g.items.push({ id: uid(), text: v, done: false });
      touch(g); renderLists();
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
    makeSortable(root, {
      item: '.cl-group', handle: '.cl-grip',
      onEnd: function () {
        var ids = Array.prototype.map.call(root.querySelectorAll('.cl-group'), function (el) { return el.dataset.g; });
        lists.sort(function (a, b) { return ids.indexOf(a.id) - ids.indexOf(b.id); });
        saveLists();
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
      var l = draft.location;
      $('set-city-current').textContent = '현재: ' + (l.mode === 'auto' ? '내 위치 자동 (실패 시 서울특별시)' : l.name);
    }
    $('push-connect').onclick = connectPush;
    $('push-test').onclick = function () {
      fetch(pushBase() + '/test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: push.token }) })
        .then(function (r) { return r.json(); })
        .then(function (r) { toast(r.ok ? '테스트 알림을 보냈어요. 앱을 닫고 기다려 보세요.' : '보내지 못했어요 (' + (r.status || r.error) + ')'); })
        .catch(function () { toast('서버에 연결하지 못했어요'); });
    };
    $('open-settings').onclick = function () {
      renderPushStatus();
      draft = JSON.parse(JSON.stringify(settings));
      $('set-name').value = draft.name;
      $('set-wxapp').value = draft.weatherApp || 'apple';
      $('set-lang').value = draft.lang || 'ko';
      $('set-city').value = ''; $('city-results').innerHTML = '';
      renderTags();
      openDialog(dlg);
    };
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
      draft.name = $('set-name').value.trim();
      draft.weatherApp = $('set-wxapp').value;
      var langChanged = $('set-lang').value !== (settings.lang || 'ko');
      draft.lang = $('set-lang').value;
      var locChanged = JSON.stringify(draft.location) !== JSON.stringify(settings.location);
      settings = draft;
      store.set('settings', settings);
      if (langChanged) { location.reload(); return; }
      dlg.close ? dlg.close() : dlg.removeAttribute('open');
      renderGreeting();
      if (locChanged) loadWeather().then(renderWeather);
      toast('설정을 저장했어요');
    });
  }

  /* ---------- 섹션 순서 ---------- */
  var SECTIONS = [
    { id: 'weather-panel', name: '날씨 · 옷차림' }, { id: 'check-panel', name: '체크리스트' },
    { id: 'schedule-panel', name: '일정' }, { id: 'english-panel', name: '업무 영어' }
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
    $('order-list').innerHTML = sectionOrder().map(function (id) {
      var name = SECTIONS.find(function (x) { return x.id === id; }).name;
      return '<li data-id="' + id + '"><span class="on-name">' + name + '</span><span class="grip" aria-label="' + name + ' 끌어서 순서 바꾸기">' + GRIP + '</span></li>';
    }).join('');
  }
  function initSectionOrder() {
    applySectionOrder();
    renderOrderList();
    makeSortable($('order-list'), {
      item: 'li', handle: '.grip', longPress: true,
      onEnd: function () {
        var order = Array.prototype.map.call($('order-list').children, function (li) { return li.dataset.id; });
        store.set('sectionOrder', order);
        applySectionOrder();
      }
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
  $('hourly').onclick = function () { renderWkLoc(); $('wk-loc-form').hidden = true; openDialog($('week-dialog')); };
  // 메인 상단 날씨 → 아래 날씨 섹션으로 이동
  $('wx-open').onclick = function () {
    var panel = $('weather-panel');
    var top = panel.getBoundingClientRect().top + window.scrollY - 64; // 상태바 아래로 여유
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };
  initWeatherLocation();
  initPhrase();
  initCats();
  initInlineEdit();
  initFx();
  initSchedule();
  initChecklist();
  initSettings();
  initSectionOrder();
  initBackup();
  // 스플래시: 날씨를 다 불러오면 사라져요 (최소 0.6초, 최대 8초)
  var splashStart = Date.now();
  function hideSplash() {
    var sp = $('splash'); if (!sp || sp.dataset.out) return;
    sp.dataset.out = '1';
    setTimeout(function () {
      sp.style.opacity = '0';
      setTimeout(function () { sp.remove(); }, 400);
    }, Math.max(0, 600 - (Date.now() - splashStart)));
  }
  setTimeout(hideSplash, 8000);
  // 날씨 → 레이더(비·눈)·환율까지 다 받은 뒤에 스플래시를 걷어요. 각각 오래 걸리면 3초에서 끊어요
  var cap = function (pr) { return pr ? Promise.race([pr, new Promise(function (r) { setTimeout(r, 3000); })]).catch(function () {}) : null; };
  loadWeather().then(renderWeather).then(function () { return Promise.all([cap(radarWait), cap(fxWait)]); })
    .then(function () { requestAnimationFrame(function () { requestAnimationFrame(hideSplash); }); }, hideSplash);

  scheduleReminders();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) scheduleReminders(); });
  // 맨 위에서 아래로 당기면 새로고침 (날씨·레이더 다시 받기)
  (function () {
    var ptr = $('ptr'), y0 = null, pull = 0, busy = false;
    var show = function (p) { ptr.style.opacity = Math.min(1, p); ptr.style.transform = 'translateY(' + Math.min(30, p * 30 - 10) + 'px) scale(' + (0.6 + Math.min(1, p) * 0.4) + ')'; ptr.querySelector('i').style.transform = 'rotate(' + p * 300 + 'deg)'; };
    var hide = function () { ptr.style.opacity = ''; ptr.style.transform = ''; ptr.classList.remove('spin'); };
    document.addEventListener('touchstart', function (e) {
      if (busy || document.documentElement.classList.contains('modal-open') || window.scrollY > 0 || e.touches.length !== 1) { y0 = null; return; }
      y0 = e.touches[0].clientY; pull = 0;
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (y0 == null) return;
      pull = Math.max(0, e.touches[0].clientY - y0);
      if (window.scrollY > 0) { y0 = null; hide(); return; }
      show(pull / 110);
    }, { passive: true });
    document.addEventListener('touchend', function () {
      if (y0 == null) return; y0 = null;
      if (pull < 110) { hide(); return; }
      busy = true; ptr.classList.add('spin'); ptr.querySelector('i').style.transform = '';
      var done = function () { busy = false; hide(); };
      loadWeather().then(renderWeather).then(function () { renderSchedule(); toast(window.IS_EN ? 'Updated' : '새로 불러왔어요'); }).then(done, done);
    });
  })();
  // 날씨는 15분마다(앱으로 돌아왔을 때 10분 넘었으면 바로) 다시 받아서 비·눈 효과도 맞춰요
  setInterval(function () { if (!document.hidden) loadWeather().then(renderWeather); }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - wxLoadedAt > 10 * 60 * 1000) loadWeather().then(renderWeather); });
  setInterval(function () { renderGreeting(); if (ymd(viewDate) === ymd(new Date())) renderSchedule(); else renderNowNext(); }, 60 * 1000);
})();
