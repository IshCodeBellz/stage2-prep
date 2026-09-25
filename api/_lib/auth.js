/* Signed tokens and the two cookies.

   There is no user table. Who you are is an email address, and what you hold is
   worked out from Stripe (see stripe.js). Both are carried in a token signed
   with SESSION_SECRET, so nothing a browser sends can be trusted unless the
   signature checks out.

   A token is base64url(JSON) + "." + base64url(HMAC-SHA256). Two kinds:
     k:"s"  the session — email and tier, kept in the cr_session cookie
     k:"l"  a sign-in link — email only, good for LINK_MINUTES

   Web Crypto, so the same file runs in a Vercel Function, the middleware and
   plain Node for serve.js and the tests. */

export const TIERS = ["standard", "gold", "platinum"];
export const rank = t => TIERS.indexOf(t);
export const best = (a, b) => (rank(b) > rank(a) ? b : a);

export const SESSION_DAYS = 30;
export const LINK_MINUTES = 30;
/* how stale a session's tier may get before it is checked with Stripe again —
   this is how long a refund takes to take the tier away */
export const RECHECK_MS = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();
const b64u = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET is missing or shorter than 32 characters");
  return s;
}

async function key() {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function sign(payload) {
  const body = b64u(enc.encode(JSON.stringify(payload)));
  const mac = await crypto.subtle.sign("HMAC", await key(), enc.encode(body));
  return body + "." + b64u(mac);
}

/* The payload, or null if the token is malformed, forged, expired or the wrong kind. */
export async function verify(token, kind) {
  if (typeof token !== "string") return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  let ok = false;
  try { ok = await crypto.subtle.verify("HMAC", await key(), unb64u(mac), enc.encode(body)); }
  catch (e) { return null; }
  if (!ok) return null;
  let p;
  try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch (e) { return null; }
  if (!p || p.k !== kind || typeof p.x !== "number" || p.x < Date.now()) return null;
  return p;
}

export const normEmail = e => String(e || "").trim().toLowerCase();
export const looksLikeEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

/* ---- cookies */

export function readCookie(request, name) {
  const all = request.headers.get("cookie") || "";
  for (const part of all.split(/;\s*/)) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i) === name) {
      try { return decodeURIComponent(part.slice(i + 1)); } catch (e) { return null; }
    }
  }
  return null;
}

function cookie(name, value, maxAge, httpOnly) {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax; Secure` +
         (httpOnly ? "; HttpOnly" : "");
}

/* cr_session is the proof and the browser's scripts cannot read it. cr_tier says
   the same tier in the clear, for the simulators and the header to read; it is
   a display value, and nothing on the server believes it. */
export async function sessionCookies(email, tier) {
  const now = Date.now(), age = SESSION_DAYS * 86400;
  const token = await sign({ k: "s", e: email, t: tier, i: now, x: now + age * 1000 });
  return [cookie("cr_session", token, age, true), cookie("cr_tier", tier, age, false)];
}

export const clearCookies = () => [cookie("cr_session", "", 0, true), cookie("cr_tier", "", 0, false)];

/* The signed-in session on this request, or null. */
export async function session(request) {
  return verify(readCookie(request, "cr_session"), "s");
}

/* ---- responses */

export function redirect(to, cookies) {
  const h = new Headers({ Location: to, "Cache-Control": "no-store" });
  (cookies || []).forEach(c => h.append("Set-Cookie", c));
  return new Response(null, { status: 303, headers: h });
}

export function json(data, status, cookies) {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  (cookies || []).forEach(c => h.append("Set-Cookie", c));
  return new Response(JSON.stringify(data), { status: status || 200, headers: h });
}

/* Where links in emails and Stripe's return URLs point. Never taken from the
   request's Host header in production — a forged Host would otherwise put a
   working sign-in link to someone else's site in a buyer's inbox. */
export function siteURL(request) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const u = new URL(request.url);
  if (u.hostname === "localhost" || u.hostname === "127.0.0.1") return u.origin;
  throw new Error("SITE_URL is not set");
}

/* A form post or a JSON body, as a plain object. */
export async function body(request) {
  const type = request.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) return await request.json();
    return Object.fromEntries(new URLSearchParams(await request.text()));
  } catch (e) { return {}; }
}

export const paywallOn = () => process.env.PAYWALL === "on";
