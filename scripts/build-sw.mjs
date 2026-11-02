import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

const OUT = "out";
const BASE = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/+$/, "");
const SKIP = new Set(["sw.js", ".nojekyll", ".DS_Store"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (!SKIP.has(entry.name) && !entry.name.endsWith(".map")) files.push(path);
  }
  return files.sort();
}

function urlFor(file) {
  const rel = relative(OUT, file).split(sep).join("/");
  if (rel === "index.html") return `${BASE}/`;
  if (rel.endsWith("/index.html")) return `${BASE}/${rel.slice(0, -"index.html".length)}`;
  return `${BASE}/${rel}`;
}

const files = await walk(OUT);
const hash = createHash("sha256");
for (const file of files) {
  const info = await stat(file);
  hash.update(`${urlFor(file)}:${info.size}:`);
  hash.update(await readFile(file));
}
const version = hash.digest("hex").slice(0, 12);
const precache = files
  .filter(
    (file) =>
      file.endsWith(".html") ||
      file.endsWith(".txt") ||
      file.includes(`${sep}_next${sep}`) ||
      file.includes(`${sep}icons${sep}`) ||
      file.endsWith(".webmanifest") ||
      file.endsWith(".svg"),
  )
  .map(urlFor);

const sw = `/* روزنگار · offline shell · ${version} */
const VERSION = "${version}";
const CACHE = \`rooznegar-${version}\`;
const BASE = ${JSON.stringify(BASE)};
const PRECACHE = ${JSON.stringify(precache, null, 2)};
const OFFLINE = BASE + "/";
const HASHED = /\\/(_next\\/static|icons)\\//;
const OFFLINE_HTML = "<!doctype html><html lang=\\"fa\\" dir=\\"rtl\\"><head><meta charset=\\"utf-8\\"><meta name=\\"color-scheme\\" content=\\"light dark\\"><title>روزنگار</title></head><body style=\\"font-family:Tahoma;background:Canvas;color:CanvasText;display:grid;place-items:center;height:100vh;margin:0\\"><p>این صفحه آفلاین باز نشده. یک بار دیگر با اتصال بازش کن.</p></body></html>";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("rooznegar-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

async function putInCache(request, response) {
  if (response && response.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  return putInCache(request, await fetch(request));
}

async function networkFirst(request) {
  try {
    return await putInCache(request, await fetch(request));
  } catch (error) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await cache.match(OFFLINE)) || new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed files change name with every deploy, so the cache is never stale.
  if (HASHED.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else is network-first: a new release shows up on the next load
  // instead of serving the previous shell, and offline still answers from cache.
  event.respondWith(networkFirst(request));
});
`;

await writeFile(join(OUT, "sw.js"), sw);
await writeFile(join(OUT, ".nojekyll"), "");
console.log(`✓ sw.js ${version} · ${precache.length} files cached`);
