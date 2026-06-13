// Service Worker da Copa 2026
// Estratégia: "network-first" pro HTML -> sempre tenta pegar a versão nova online
// (auto-atualização) e cai pro cache quando estiver offline.
// Mude o número da versão abaixo se quiser forçar limpeza de cache.

const VERSION = "copa-2026-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(["./", "./index.html"]))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Não interfere em chamadas de outra origem (Worker de placar, Google Fonts etc.)
  if (url.origin !== self.location.origin) return;

  const isHTML =
    req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    // network-first: pega a versão nova quando online, senão usa o cache
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Demais arquivos da mesma origem: cache-first com atualização em segundo plano
  e.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        }).catch(() => cached)
    )
  );
});
