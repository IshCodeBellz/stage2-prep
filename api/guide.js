/* GET /api/guide?slug=...
   Every guide page is served through here once the paywall is on (middleware.js
   sends /resources/<slug> this way). A guide the visitor's session covers comes
   back whole; any other is trimmed to its preview before it leaves the server. */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { session, rank, paywallOn } from "./_lib/auth.js";
import { guideTier, trimGuide } from "./_lib/guide.js";

const page = (html, status) => new Response(html, {
  status: status || 200,
  headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "private, no-store" }
});

export async function GET(request) {
  const slug = new URL(request.url).searchParams.get("slug") || "";
  if (!/^[a-z0-9-]+$/.test(slug) || slug === "index") return page("Not found", 404);
  let html;
  try { html = await readFile(join(process.cwd(), "resources", slug + ".html"), "utf8"); }
  catch (e) { return page("Not found", 404); }

  const need = guideTier(html);
  if (!paywallOn() || need === "standard") return page(html);
  const s = await session(request).catch(() => null);
  const have = s ? s.t : "standard";
  return page(rank(have) >= rank(need) ? html : trimGuide(html));
}
