/* Vercel Routing Middleware.

   The guides are static files, and a static file is served before any rewrite
   in vercel.json gets a look in — so without this, /resources/trp2 would hand
   the whole paid guide to anyone. With the paywall on, every guide request is
   rewritten to /api/guide, which decides what to send. With it off, nothing
   changes. */

export const config = { matcher: ["/resources/:slug"] };

export default function middleware(request) {
  if (process.env.PAYWALL !== "on") return;
  const url = new URL(request.url);
  const slug = url.pathname.slice("/resources/".length).replace(/\.html$/, "");
  if (!/^[a-z0-9-]+$/.test(slug) || slug === "index") return;
  // what rewrite() from @vercel/functions does, without the dependency
  return new Response(null, {
    headers: { "x-middleware-rewrite": new URL("/api/guide?slug=" + slug, url).toString() }
  });
}
