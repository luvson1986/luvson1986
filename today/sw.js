/* 오늘 서비스 워커
   앱 파일은 네트워크 우선(항상 최신), 오프라인이면 저장해 둔 버전으로 열려요.
   날씨·뉴스 같은 외부 요청은 건드리지 않아요. */
var CACHE = 'today-v35';
var SHELL = ['./', './index.html', './styles.css', './data.js', './app.js', './manifest.webmanifest', './icons/icon-192.png', './icons/source.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // 브라우저 캐시를 건너뛰고 서버에 확인해서, 고친 버전이 바로 보이게
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) { return hit || caches.match('./index.html'); });
  }));
});

// 알림을 누르면 앱을 열어요
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow('./');
  }));
});
