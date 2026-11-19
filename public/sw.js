// Qimuro Academy Pro service worker: makes the app (and the Python runtime) work offline.
const CACHE = "academy-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const store = (req, res) => {
  if (res.ok || res.type === "opaque") {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const pyodide = url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/pyodide/");
  if (!same && !pyodide) return;

  // Page loads: network first, fall back to the cached app shell when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => { if (res.ok) store("/", res.clone()); return res; })
        .catch(() => caches.match("/")),
    );
    return;
  }
  // Built assets and the Python runtime never change at a given URL: cache first.
  if (pyodide || url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res))));
    return;
  }
  // Everything else: network first, cached copy as fallback.
  e.respondWith(fetch(req).then((res) => store(req, res)).catch(() => caches.match(req)));
});
