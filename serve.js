#!/usr/bin/env node
/* Local static server that resolves URLs the way Vercel does with
   "cleanUrls": true — /pricing serves pricing.html, /resources serves
   resources/index.html. Development only; Vercel serves the real thing.

   node serve.js [port]
*/

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.argv[2]) || 8000;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const candidates = (p) => {
  const clean = p.replace(/\/+$/, "");
  return [p, clean + ".html", path.join(clean, "index.html")];
};

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const asked = decodeURIComponent(url.pathname);
  const safe = path.normalize(asked).replace(/^(\.\.[/\\])+/, "");

  let file = null;
  for (const c of candidates(safe === "/" ? "/index.html" : safe)) {
    const full = path.join(ROOT, c);
    if (full.startsWith(ROOT) && fs.existsSync(full) && fs.statSync(full).isFile()) {
      file = full;
      break;
    }
  }

  if (!file) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 " + asked);
    return;
  }

  res.writeHead(200, {
    "Content-Type": TYPES[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log("serving " + ROOT + " on http://localhost:" + PORT);
});
