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
  function mdNum(md) { var p = md.split('-'); return +p[0] * 100 + +p[1]; }
  function dayOfYear(m, d) { return Math.floor((Date.UTC(2001, m - 1, d) - Date.UTC(2001, 0, 1)) / 864e5); }
  function seasonScore(s, date) {
    var today = dayOfYear(date.getMonth() + 1, date.getDate());
    var f = s.from.split('-'), t = s.to.split('-');
    var a = dayOfYear(+f[0], +f[1]), b = dayOfYear(+t[0], +t[1]);
    if (b < a) b += 365;
    var x = today;
    if (x < a) x += 365;
    if (x > b) return -1;
    var mid = (a + b) / 2, half = (b - a) / 2 || 1;
    return 1 - Math.abs(x - mid) / half; // 1: 절정, 0: 시작·끝
  }
  function currentSeasons(date) {
    return window.SEASONS
      .map(function (s) { return { s: s, score: seasonScore(s, date) }; })
      .filter(function (x) { return x.score >= 0; })
      .sort(function (a, b) { return b.score - a.score; })
      .map(function (x) { return x.s; });
  }

  var seasonList = [];
  function renderSeason(idx) {
    var s = seasonList[idx];
    if (!s) return;
    var root = document.documentElement;
    root.style.setProperty('--hero-a', s.scene.colors[0]);
    root.style.setProperty('--hero-b', s.scene.colors[1]);
    root.style.setProperty('--season', s.scene.accent);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.scene.colors[0]);
    $('season-title').textContent = s.headline;
    $('season-desc').textContent = s.desc;
    $('season-todo').innerHTML = s.todo.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('hero-motif').innerHTML = s.scene.motif.map(function (m) { return '<span>' + m + '</span>'; }).join('');
    Array.prototype.forEach.call($('season-chips').children, function (c, i) { c.setAttribute('aria-selected', String(i === idx)); });
    scene.start(s.scene);
    store.set('seasonPick', { date: ymd(new Date()), id: s.id });
  }
  function initSeason() {
    seasonList = currentSeasons(new Date()).slice(0, 5);
    if (!seasonList.length) seasonList = [window.SEASONS[0]];
    $('season-chips').innerHTML = seasonList.map(function (s, i) {
      return '<button type="button" class="season-chip" role="tab" data-i="' + i + '">' + esc(s.name) + '</button>';
    }).join('');
    $('season-chips').addEventListener('click', function (e) {
      var b = e.target.closest('.season-chip');
      if (b) renderSeason(+b.dataset.i);
    });
    var pick = store.get('seasonPick', null);
    var idx = 0;
    if (pick && pick.date === ymd(new Date())) {
      var found = seasonList.findIndex(function (s) { return s.id === pick.id; });
      if (found >= 0) idx = found;
    }
    renderSeason(idx);
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
        case 'leaves': p.s = rnd(8, 15); p.vy = rnd(0.6, 1.4); p.vx = rnd(-0.3, 0.6); break;
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
      return type === 'grass' ? Math.round(w / 7) : type === 'rain' ? base * 1.4 : type === 'lights' ? base * 0.5 : base;
    }
    function drawLeaf(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = 0.9;
      ctx.beginPath();
      for (var i = 0; i < 5; i++) {
        var ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.lineTo(Math.cos(ang) * p.s, Math.sin(ang) * p.s);
        var ang2 = ang + Math.PI / 5;
        ctx.lineTo(Math.cos(ang2) * p.s * 0.45, Math.sin(ang2) * p.s * 0.45);
      }
      ctx.closePath(); ctx.fill(); ctx.restore();
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
    $('wx-sub').textContent = '최고 ' + Math.round(d.temperature_2m_max[0]) + '° / 최저 ' + Math.round(d.temperature_2m_min[0]) + '° · 강수 ' + (d.precipitation_probability_max[0] || 0) + '% · 습도 ' + c.relative_humidity_2m + '%';
    $('wx-place').textContent = w.sample ? '예시 날씨 · 날씨 서버에 연결하지 못했어요' : w.place;
    $('hourly').innerHTML = w.hours.map(function (hr, i) {
      return '<div class="hour' + (i === 0 ? ' now' : '') + '"><span class="h-time">' + (i === 0 ? '지금' : hr.hour + '시') + '</span>' +
        '<span class="h-ico" aria-hidden="true">' + wmo(hr.code)[1] + '</span>' +
        '<span class="h-t">' + Math.round(hr.temp) + '°</span>' +
        '<span class="h-p">' + (hr.pop >= 20 ? hr.pop + '%' : '') + '</span></div>';
    }).join('');
    renderOutfit(w);
  }

  /* ---------- 옷차림 / 준비물 ---------- */
  var OUTFIT = [
    { min: 28, items: ['민소매', '반팔', '린넨 셔츠', '반바지', '샌들'], office: '사무실 냉방이 세니 얇은 가디건을 자리에 두세요.' },
    { min: 23, items: ['반팔', '얇은 셔츠', '면바지', '슬랙스'], office: '실내는 냉방 때문에 쌀쌀할 수 있어요. 얇은 겉옷 하나면 충분해요.' },
    { min: 20, items: ['블라우스', '얇은 긴팔', '슬랙스', '면바지'], office: '비즈니스 캐주얼로 셔츠 한 장이 가장 무난한 날이에요.' },
    { min: 17, items: ['얇은 니트', '가디건', '맨투맨', '청바지'], office: '니트에 슬랙스면 회의 자리에도 단정해 보여요.' },
    { min: 12, items: ['자켓', '가디건', '셔츠 + 니트 조끼', '스타킹'], office: '블레이저 하나 걸치면 출퇴근과 미팅 모두 해결돼요.' },
    { min: 9, items: ['트렌치코트', '야상', '니트', '기모 바지'], office: '실내 난방을 생각해 겉옷은 두껍게, 안은 얇게 겹쳐 입으세요.' },
    { min: 5, items: ['울 코트', '가죽 자켓', '히트텍', '두꺼운 니트'], office: '사무실에서는 코트를 벗을 테니 이너는 니트 정도가 좋아요.' },
    { min: -99, items: ['롱패딩', '두꺼운 코트', '목도리', '장갑', '기모 이너'], office: '실내외 온도차가 크니 패딩 안은 가볍게 입으세요.' }
  ];

  function renderOutfit(w) {
    var d = w.daily;
    var hi = d.apparent_temperature_max[0], lo = d.apparent_temperature_min[0];
    var base = Math.round((hi + lo) / 2);
    var band = OUTFIT.find(function (o) { return base >= o.min; });
    $('outfit-basis').textContent = '체감 ' + Math.round(lo) + '° ~ ' + Math.round(hi) + '°';
    var gap = d.temperature_2m_max[0] - d.temperature_2m_min[0];
    var lead = '하루 평균 체감 <b>' + base + '°</b>에 맞춘 옷차림이에요.';
    if (gap >= 10) lead += ' 일교차가 <b>' + Math.round(gap) + '°</b>나 돼서 아침저녁엔 한 단계 따뜻하게 입으세요.';
    $('outfit-lead').innerHTML = lead;
    $('outfit-list').innerHTML = band.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('');
    $('outfit-office').textContent = band.office;

    var bring = [];
    var codes = w.hours.map(function (h) { return h.code; }).concat([d.weather_code[0]]);
    var pop = Math.max(d.precipitation_probability_max[0] || 0, Math.max.apply(null, w.hours.map(function (h) { return h.pop || 0; })));
    var snow = codes.some(isSnow) || (d.snowfall_sum && d.snowfall_sum[0] > 0);
    var rain = codes.some(isRain);
    if (snow) {
      bring.push({ ico: '🥾', t: '방수 부츠, 미끄럼 방지 신발', why: '눈 소식이 있어요. 출근길 빙판을 조심하세요.', lvl: 'high' });
      bring.push({ ico: '☂️', t: '장우산', why: '눈이 많이 오면 우산이 있는 게 나아요.', lvl: 'mid' });
    } else if (pop >= 60 || rain) {
      bring.push({ ico: '☂️', t: '장우산', why: '강수 확률 ' + pop + '%. 비가 올 가능성이 높아요.', lvl: 'high' });
      bring.push({ ico: '👟', t: '젖어도 되는 신발', why: '가죽 구두보다는 방수가 되는 신발이 좋아요.', lvl: 'mid' });
    } else if (pop >= 30) {
      bring.push({ ico: '🌂', t: '접이식 우산', why: '강수 확률 ' + pop + '%. 가방에 하나 넣어 두세요.', lvl: 'mid' });
    }
    var air = w.air;
    if (air && (air.pm2_5 > 35 || air.pm10 > 80)) {
      bring.push({ ico: '😷', t: 'KF94 마스크', why: '미세먼지 ' + Math.round(air.pm10) + '㎍/㎥ · 초미세먼지 ' + Math.round(air.pm2_5) + '㎍/㎥로 나쁨이에요.', lvl: 'high' });
    } else if (air && (air.pm2_5 > 15 || air.pm10 > 30)) {
      bring.push({ ico: '😷', t: '마스크(선택)', why: '초미세먼지 보통(' + Math.round(air.pm2_5) + '㎍/㎥). 민감하면 챙기세요.', lvl: '' });
    }
    var uv = d.uv_index_max[0];
    if (uv >= 6) bring.push({ ico: '🧴', t: '선크림, 선글라스', why: '자외선 지수 ' + uv.toFixed(1) + '로 높아요.', lvl: 'mid' });
    else if (uv >= 3) bring.push({ ico: '🧴', t: '선크림', why: '자외선 지수 ' + uv.toFixed(1) + '. 점심 산책 전에 바르세요.', lvl: '' });
    if (w.current.wind_speed_10m >= 8) bring.push({ ico: '🧥', t: '바람막이', why: '바람이 초속 ' + Math.round(w.current.wind_speed_10m) + 'm로 강해요.', lvl: 'mid' });
    if (d.temperature_2m_max[0] >= 31) bring.push({ ico: '💧', t: '물, 손풍기', why: '낮 최고 ' + Math.round(d.temperature_2m_max[0]) + '°. 더위 조심하세요.', lvl: 'mid' });
    if (d.temperature_2m_min[0] <= 0) bring.push({ ico: '🔥', t: '핫팩, 장갑', why: '아침 최저 ' + Math.round(d.temperature_2m_min[0]) + '°로 영하예요.', lvl: 'mid' });
    if (d.temperature_2m_max[0] - d.temperature_2m_min[0] >= 10 && !bring.some(function (b) { return b.ico === '🧥'; })) {
      bring.push({ ico: '🧥', t: '가벼운 겉옷', why: '퇴근길엔 ' + Math.round(d.temperature_2m_min[1] != null ? Math.min(d.temperature_2m_min[0], d.temperature_2m_min[1]) : d.temperature_2m_min[0]) + '°까지 내려가요.', lvl: '' });
    }
    if (!bring.length) bring.push({ ico: '👌', t: '특별히 챙길 건 없어요', why: '맑고 무난한 날이에요.', lvl: '' });
    $('bring').innerHTML = bring.map(function (b) {
      return '<li class="' + (b.lvl ? 'lvl-' + b.lvl : '') + '"><span class="b-ico" aria-hidden="true">' + b.ico + '</span><div><b>' + esc(b.t) + '</b><span class="b-why">' + esc(b.why) + '</span></div></li>';
    }).join('');
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
      { id: 's1', start: '09:30', end: '10:00', title: '데일리 스탠드업', cat: 'meeting', place: '팀 채널', sample: true },
      { id: 's2', start: '10:30', end: '12:00', title: '모바일 뱅킹 송금 플로우 시안 작업', cat: 'focus', place: '', sample: true },
      { id: 's3', start: '12:10', end: '13:00', title: '점심 산책', cat: 'health', place: '', sample: true },
      { id: 's4', start: '14:00', end: '15:00', title: '디자인 리뷰: 대출 신청 화면', cat: 'meeting', place: '12층 회의실', sample: true },
      { id: 's5', start: '19:30', end: '20:30', title: '필라테스', cat: 'personal', place: '', sample: true }
    ];
  }
  var saveSchedules = function () { store.set('schedules', schedules); };
  var toMin = function (hm) { var p = hm.split(':'); return +p[0] * 60 + +p[1]; };

  function renderSchedule() {
    var key = ymd(viewDate), todayKey = ymd(new Date());
    var list = (schedules[key] || []).slice().sort(function (a, b) { return a.start.localeCompare(b.start); });
    var diff = Math.round((new Date(key) - new Date(todayKey)) / 864e5);
    $('day-today').textContent = diff === 0 ? '오늘' : (viewDate.getMonth() + 1) + '/' + viewDate.getDate() + ' (' + DAYS[viewDate.getDay()] + ')';
    $('sch-h').textContent = diff === 0 ? '오늘 일정' : diff === 1 ? '내일 일정' : diff === -1 ? '어제 일정' : '일정';
    $('sample-banner').hidden = !list.some(function (s) { return s.sample; });
    $('timeline-empty').hidden = list.length > 0;

    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    var html = '', nowPlaced = diff !== 0;
    list.forEach(function (s) {
      var st = toMin(s.start), en = s.end ? toMin(s.end) : st + 30;
      if (!nowPlaced && nowMin < st) {
        html += nowRow(now); nowPlaced = true;
      }
      var state = diff < 0 ? 'past' : diff > 0 ? '' : en <= nowMin ? 'past' : st <= nowMin ? 'current' : '';
      var rel = '';
      if (state === 'current') rel = ' · 진행 중';
      else if (diff === 0 && !state) { var m = st - nowMin; rel = m < 60 ? ' · ' + m + '분 후' : ''; }
      html += '<li class="tl-item ' + state + '" style="--c: var(--cat-' + s.cat + ')">' +
        '<span class="tl-time">' + s.start + '</span><span class="tl-dot"></span>' +
        '<button type="button" class="tl-card" data-id="' + s.id + '" aria-label="' + esc(s.title) + ' 수정">' +
        '<span class="tl-title">' + esc(s.title) + (s.sample ? ' <span class="tl-tag">예시</span>' : '') + '</span>' +
        '<span class="tl-meta">' + s.start + (s.end ? '–' + s.end : '') + ' · ' + CAT[s.cat] + (s.place ? ' · ' + esc(s.place) : '') + rel + '</span>' +
        '</button>' +
        '<button type="button" class="tl-del" data-del="' + s.id + '" aria-label="' + esc(s.title) + ' 삭제">✕</button></li>';
      if (!nowPlaced && state === 'current') { html += nowRow(now); nowPlaced = true; }
    });
    if (!nowPlaced && list.length) html += nowRow(now);
    $('timeline').innerHTML = html;
  }
  function nowRow(now) {
    return '<li class="tl-now" aria-label="현재 시각"><span class="tl-time">' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + '</span><span class="now-dot"></span><span class="now-line"></span></li>';
  }

  function resetForm() {
    $('sch-id').value = ''; $('sch-title').value = ''; $('sch-place').value = '';
    var list = schedules[ymd(viewDate)] || [];
    var last = list.filter(function (s) { return !s.sample; }).map(function (s) { return s.end || s.start; }).sort().pop();
    var start = last || (pad(Math.min(new Date().getHours() + 1, 23)) + ':00');
    $('sch-start').value = start;
    var em = Math.min(toMin(start) + 60, 23 * 60 + 59);
    $('sch-end').value = pad(Math.floor(em / 60)) + ':' + pad(em % 60);
    $('sch-cat').value = 'meeting';
    $('sch-submit').textContent = '일정 추가';
    $('sch-cancel').hidden = true;
    $('sch-error').hidden = true;
  }

  function initSchedule() {
    $('day-prev').onclick = function () { viewDate.setDate(viewDate.getDate() - 1); renderSchedule(); resetForm(); };
    $('day-next').onclick = function () { viewDate.setDate(viewDate.getDate() + 1); renderSchedule(); resetForm(); };
    $('day-today').onclick = function () { viewDate = new Date(); renderSchedule(); resetForm(); };
    $('clear-samples').onclick = function () { clearSamples(); renderSchedule(); toast('예시 일정을 지웠어요'); };
    $('sch-cancel').onclick = resetForm;

    $('timeline').addEventListener('click', function (e) {
      var key = ymd(viewDate), list = schedules[key] || [];
      var del = e.target.closest('[data-del]');
      if (del) {
        schedules[key] = list.filter(function (s) { return s.id !== del.dataset.del; });
        saveSchedules(); renderSchedule(); toast('일정을 삭제했어요');
        return;
      }
      var card = e.target.closest('.tl-card');
      if (card) {
        var s = list.find(function (x) { return x.id === card.dataset.id; });
        if (!s) return;
        $('sch-id').value = s.id; $('sch-title').value = s.title; $('sch-start').value = s.start;
        $('sch-end').value = s.end || ''; $('sch-cat').value = s.cat; $('sch-place').value = s.place || '';
        $('sch-submit').textContent = '수정 저장'; $('sch-cancel').hidden = false;
        $('sch-title').focus();
      }
    });

    $('sch-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('sch-error');
      var title = $('sch-title').value.trim(), start = $('sch-start').value, end = $('sch-end').value;
      if (!title) { err.textContent = '일정 이름을 입력해 주세요.'; err.hidden = false; $('sch-title').focus(); return; }
      if (!start) { err.textContent = '시작 시간을 입력해 주세요.'; err.hidden = false; return; }
      if (end && toMin(end) <= toMin(start)) { err.textContent = '종료 시간은 시작 시간보다 늦어야 해요.'; err.hidden = false; return; }
      err.hidden = true;
      var editing = $('sch-id').value;
      if (!editing) clearSamples();
      var key = ymd(viewDate);
      var list = schedules[key] || (schedules[key] = []);
      var item = { id: editing || 'e' + Date.now().toString(36), start: start, end: end, title: title, cat: $('sch-cat').value, place: $('sch-place').value.trim() };
      var at = list.findIndex(function (s) { return s.id === editing; });
      if (at >= 0) list[at] = item; else list.push(item);
      saveSchedules(); renderSchedule(); resetForm();
      toast(editing ? '일정을 수정했어요' : '일정을 추가했어요');
    });

    renderSchedule();
    resetForm();
  }
  function clearSamples() {
    Object.keys(schedules).forEach(function (k) {
      schedules[k] = schedules[k].filter(function (s) { return !s.sample; });
      if (!schedules[k].length) delete schedules[k];
    });
    saveSchedules();
  }

  /* ---------- 뉴스 ---------- */
  var news = [], newsFilter = 'all';
  var readSet = new Set(store.get('newsRead', []));

  function parseRss(xml, interest) {
    var doc = new DOMParser().parseFromString(xml, 'text/xml');
    return Array.prototype.map.call(doc.querySelectorAll('item'), function (it) {
      var g = function (s) { var n = it.querySelector(s); return n ? n.textContent : ''; };
      return normalize({ title: g('title'), link: g('link'), pubDate: g('pubDate'), source: g('source') }, interest);
    });
  }
  function normalize(r, interest) {
    var title = (r.title || '').trim(), source = r.source || r.author || '';
    var cut = title.lastIndexOf(' - ');
    if (cut > 0) { if (!source) source = title.slice(cut + 3); title = title.slice(0, cut); }
    var date = r.pubDate ? new Date(r.pubDate.replace(' ', 'T') + (/[zZ]|[+-]\d\d:?\d\d|GMT/.test(r.pubDate) ? '' : 'Z')) : null;
    if (date && isNaN(date)) date = new Date(r.pubDate);
    return { title: title, link: r.link, source: source, date: date && !isNaN(date) ? date.toISOString() : null, interest: interest };
  }
  function fetchInterest(q) {
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
  function loadNews() {
    var cache = store.get('newsCache', null);
    var sig = settings.interests.join('|');
    if (cache && cache.sig === sig && Date.now() - cache.at < 30 * 60 * 1000 && cache.items.length) {
      return Promise.resolve({ items: cache.items, failed: false });
    }
    if (!settings.interests.length) return Promise.resolve({ items: [], failed: false });
    return Promise.all(settings.interests.map(function (q) {
      return fetchInterest(q).then(function (items) { return { ok: true, items: items }; }, function () { return { ok: false, items: [] }; });
    })).then(function (res) {
      var seen = {}, items = [];
      res.forEach(function (r) {
        r.items.forEach(function (it) {
          var k = it.title.replace(/\s+/g, '');
          if (!it.title || seen[k]) return;
          seen[k] = 1; items.push(it);
        });
      });
      items.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
      var failed = res.every(function (r) { return !r.ok; });
      if (!failed) store.set('newsCache', { sig: sig, at: Date.now(), items: items });
      return { items: items, failed: failed };
    });
  }
  function ago(iso) {
    if (!iso) return '';
    var m = Math.round((Date.now() - new Date(iso)) / 60000);
    if (m < 60) return Math.max(m, 1) + '분 전';
    if (m < 1440) return Math.round(m / 60) + '시간 전';
    return Math.round(m / 1440) + '일 전';
  }
  function newsItemHtml(n) {
    var id = n.link, isNew = n.date && Date.now() - new Date(n.date) < 864e5 && !readSet.has(id);
    return '<li><a class="news-item' + (readSet.has(id) ? ' read' : '') + '" href="' + esc(n.link) + '" target="_blank" rel="noopener" data-id="' + esc(id) + '">' +
      '<span class="n-title">' + esc(n.title) + '</span>' +
      '<span class="n-meta">' + (isNew ? '<span class="n-new">NEW</span>' : '') + '<span class="n-tag">' + esc(n.interest) + '</span>' +
      (n.source ? '<span>' + esc(n.source) + '</span>' : '') + (n.date ? '<span>' + ago(n.date) + '</span>' : '') + '</span></a></li>';
  }
  function renderNews(result) {
    news = result.items;
    var sample = false;
    if (result.failed) { news = window.SAMPLE_NEWS; sample = true; }
    var panel = $('news-panel');
    if (!news.length) { panel.hidden = true; return; }
    panel.hidden = false;
    $('news-note').hidden = !sample;
    $('news-note').textContent = sample ? '뉴스 서버에 연결하지 못해 예시를 보여드려요.' : '';
    // 안 읽은 뉴스를 먼저, 그다음 최신순
    var top = news.slice().sort(function (a, b) {
      var ra = readSet.has(a.link) ? 1 : 0, rb = readSet.has(b.link) ? 1 : 0;
      return ra - rb || (b.date || '').localeCompare(a.date || '');
    }).slice(0, 3);
    $('news-top').innerHTML = top.map(newsItemHtml).join('');
    var more = news.length > 3 && !sample;
    $('news-more').hidden = !more;
    $('news-total').textContent = news.length;
    renderNewsPage();
    route();
  }
  function renderNewsPage() {
    var interests = Array.from(new Set(news.map(function (n) { return n.interest; })));
    $('news-filters').innerHTML = ['all'].concat(interests).map(function (i) {
      var c = i === 'all' ? news.length : news.filter(function (n) { return n.interest === i; }).length;
      return '<button type="button" class="chip" role="tab" data-f="' + esc(i) + '" aria-selected="' + (newsFilter === i) + '">' + (i === 'all' ? '전체' : esc(i)) + ' <span class="mono">' + c + '</span></button>';
    }).join('');
    var list = newsFilter === 'all' ? news : news.filter(function (n) { return n.interest === newsFilter; });
    $('news-all').innerHTML = list.map(newsItemHtml).join('');
    $('news-all-count').textContent = list.length + '건';
  }
  function initNews() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('.news-item');
      if (!a) return;
      if (a.getAttribute('href') === '#') { e.preventDefault(); return; }
      readSet.add(a.dataset.id);
      store.set('newsRead', Array.from(readSet).slice(-400));
      a.classList.add('read');
    });
    $('news-filters').addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) { newsFilter = b.dataset.f; renderNewsPage(); }
    });
    loadNews().then(renderNews);
  }

  /* ---------- 화면 전환 ---------- */
  function route() {
    var onNews = location.hash === '#news' && news.length > 3;
    $('view-home').hidden = onNews;
    $('view-news').hidden = !onNews;
    document.body.classList.toggle('on-news', onNews);
    window.scrollTo(0, 0);
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
    $('settings-save').addEventListener('click', function (e) {
      e.preventDefault();
      var pending = $('set-interest').value.trim();
      if (pending && draft.interests.indexOf(pending) < 0) draft.interests.push(pending);
      draft.name = $('set-name').value.trim();
      var interestsChanged = draft.interests.join('|') !== settings.interests.join('|');
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
  initPhrase();
  initSchedule();
  initSettings();
  loadWeather().then(renderWeather);
  initNews();
  window.addEventListener('hashchange', route);
  route();

  setInterval(function () { renderGreeting(); if (ymd(viewDate) === ymd(new Date())) renderSchedule(); }, 60 * 1000);
})();
