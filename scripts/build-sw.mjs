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

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match(OFFLINE)) ||
            new Response("<!doctype html><html lang=\\"fa\\" dir=\\"rtl\\"><meta charset=\\"utf-8\\"><title>روزنگار</title><body style=\\"font-family:Tahoma;background:#f4efe3;color:#22372e;display:grid;place-items:center;height:100vh;margin:0\\"><p>این صفحه آفلاین باز نشده. یک بار دیگر با اتصال بازش کن.</p></body></html>", { headers: { "Content-Type": "text/html; charset=utf-8" } })
          );
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
`;

await writeFile(join(OUT, "sw.js"), sw);
await writeFile(join(OUT, ".nojekyll"), "");
console.log(`✓ sw.js ${version} · ${precache.length} files cached`);
