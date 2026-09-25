#!/usr/bin/env node
/* Local server that behaves the way Vercel does for this site:

   - clean URLs, as with "cleanUrls": true — /pricing serves pricing.html,
     /resources serves resources/index.html
   - middleware.js runs first for the paths its matcher names
   - /api/<name> runs the GET or POST exported from api/<name>.js

   Settings come from the environment, or from a .env.local file beside this one
   (KEY=value per line; it is git-ignored). Development only.

   node serve.js [port]
*/

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.argv[2]) || 8000;

const envFile = path.join(ROOT, ".env.local");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

const candidates = (p) => {
  const clean = p.replace(/\/+$/, "");
  return [p, clean + ".html", path.join(clean, "index.html")];
};

/* a matcher like /resources/:slug — one path segment per parameter */
const matches = (pattern, p) =>
  new RegExp("^" + pattern.replace(/:[a-z]+/gi, "[^/]+") + "$").test(p);

async function toRequest(req, url) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  return new Request(url, {
    method: req.method, headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks)
  });
}

async function send(res, response) {
  const headers = {};
  response.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
  const cookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  res.end(Buffer.from(await response.arrayBuffer()));
}

async function api(req, res, url) {
  const name = url.pathname.slice("/api/".length);
  const file = path.join(ROOT, "api", name + ".js");
  if (!/^[a-z]+$/.test(name) || !fs.existsSync(file)) return false;
  const mod = await import(pathToFileURL(file).href);
  const handler = mod[req.method];
  if (!handler) { res.writeHead(405); res.end(); return true; }
  try { await send(res, await handler(await toRequest(req, url))); }
  catch (e) { console.error(e); res.writeHead(500); res.end("500 " + e.message); }
  return true;
}

function serveFile(res, asked) {
  const safe = path.normalize(asked).replace(/^(\.\.[/\\])+/, "");
  for (const c of candidates(safe === "/" ? "/index.html" : safe)) {
    const full = path.join(ROOT, c);
    if (full.startsWith(ROOT) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      res.writeHead(200, {
        "Content-Type": TYPES[path.extname(full)] || "application/octet-stream",
        "Cache-Control": "no-store"
      });
      fs.createReadStream(full).pipe(res);
      return;
    }
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 " + asked);
}

const mw = await import(pathToFileURL(path.join(ROOT, "middleware.js")).href);

http.createServer(async (req, res) => {
  let url = new URL(req.url, "http://localhost:" + PORT);
  const asked = decodeURIComponent(url.pathname);

  if ((mw.config.matcher || []).some(m => matches(m, asked))) {
    const out = await mw.default(new Request(url, { headers: req.headers }));
    const to = out && out.headers.get("x-middleware-rewrite");
    if (to) url = new URL(to);
    else if (out) return send(res, out);
  }
  if (url.pathname.startsWith("/api/") && await api(req, res, url)) return;
  serveFile(res, decodeURIComponent(url.pathname));
}).listen(PORT, () => {
  console.log("serving " + ROOT + " on http://localhost:" + PORT);
});
