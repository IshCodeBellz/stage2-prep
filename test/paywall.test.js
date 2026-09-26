/* The paywall's server side, with Stripe and Resend stubbed out.
   npm test  (or: node --test test/*.test.js) */

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

process.env.SESSION_SECRET = "test-secret-that-is-long-enough-0123456789";
process.env.STRIPE_SECRET_KEY = "sk_test_x";
process.env.STRIPE_PRICE_GOLD = "price_gold";
process.env.STRIPE_PRICE_PLATINUM = "price_plat";
process.env.STRIPE_PRICE_UPGRADE = "price_up";
process.env.RESEND_API_KEY = "re_x";
process.env.MAIL_FROM = "Cab Ready <hello@example.com>";
process.env.SITE_URL = "https://cabready.example";

const auth = await import("../api/_lib/auth.js");
const { sessionTier, tierForEmail } = await import("../api/_lib/stripe.js");
const { trimGuide, guideTier } = await import("../api/_lib/guide.js");
const checkout = await import("../api/checkout.js");
const claim = await import("../api/claim.js");
const login = await import("../api/login.js");
const verify = await import("../api/verify.js");
const me = await import("../api/me.js");
const guide = await import("../api/guide.js");
const logout = await import("../api/logout.js");
const middleware = (await import("../middleware.js")).default;

/* ---- a pretend Stripe: customers by email, sessions by customer */
let db, calls, mails;
const session = (tier, extra) => Object.assign({
  id: "cs_" + Math.random().toString(36).slice(2), status: "complete", payment_status: "paid",
  metadata: { tier }, customer_details: { email: "buyer@example.com" },
  payment_intent: { latest_charge: { refunded: false } }
}, extra);

beforeEach(() => {
  db = { customers: {}, sessions: {} };
  calls = []; mails = [];
  process.env.PAYWALL = "on";
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url);
    calls.push({ url: u, opts });
    const ok = data => new Response(JSON.stringify(data), { status: 200 });
    if (u.host === "api.resend.com") { mails.push(JSON.parse(opts.body)); return ok({ id: "m" }); }
    const path = u.pathname.replace("/v1/", "");
    if (path === "customers") return ok({ data: db.customers[u.searchParams.get("email")] || [] });
    if (path === "checkout/sessions" && opts.method === "POST")
      return ok({ id: "cs_new", url: "https://checkout.stripe.com/c/pay/cs_new" });
    if (path === "checkout/sessions") return ok({ data: db.sessions[u.searchParams.get("customer")] || [] });
    if (path.startsWith("checkout/sessions/")) {
      const s = Object.values(db.sessions).flat().find(x => x.id === path.split("/")[2]);
      return s ? ok(s) : new Response(JSON.stringify({ error: { message: "No such session" } }), { status: 404 });
    }
    throw new Error("unexpected fetch " + url);
  };
});

const buyer = (email, ...sessions) => {
  const id = "cus_" + (Object.keys(db.sessions).length + 1);
  db.customers[email] = (db.customers[email] || []).concat({ id, email });
  db.sessions[id] = sessions;
  return sessions;
};
const req = (path, opts = {}) => new Request("https://cabready.example" + path, opts);
const cookieHeader = res => res.headers.getSetCookie().map(c => c.split(";")[0]).join("; ");
const withCookies = (path, cookies, opts = {}) => req(path, { ...opts, headers: { ...(opts.headers || {}), cookie: cookies } });
const post = (path, form, headers) => req(path, {
  method: "POST", body: new URLSearchParams(form).toString(),
  headers: { "content-type": "application/x-www-form-urlencoded", ...(headers || {}) }
});

/* ---- tokens */

test("a signed token verifies, and a tampered, expired or wrong-kind one does not", async () => {
  const t = await auth.sign({ k: "s", e: "a@b.co", t: "gold", i: Date.now(), x: Date.now() + 60000 });
  assert.equal((await auth.verify(t, "s")).t, "gold");
  assert.equal(await auth.verify(t, "l"), null);
  const [body, mac] = t.split(".");
  const forged = Buffer.from(JSON.stringify({ k: "s", e: "a@b.co", t: "platinum", i: 0, x: Date.now() + 60000 }))
    .toString("base64url");
  assert.equal(await auth.verify(forged + "." + mac, "s"), null);
  assert.equal(await auth.verify(body + "." + mac.slice(0, -2) + "AA", "s"), null);
  const old = await auth.sign({ k: "s", e: "a@b.co", t: "gold", i: 0, x: Date.now() - 1 });
  assert.equal(await auth.verify(old, "s"), null);
  assert.equal(await auth.verify("garbage", "s"), null);
});

/* ---- what Stripe says someone holds */

test("a session grants its tier only when paid and not refunded", () => {
  assert.equal(sessionTier(session("gold")), "gold");
  assert.equal(sessionTier(session("platinum", { payment_status: "no_payment_required", payment_intent: null })), "platinum");
  assert.equal(sessionTier(session("gold", { payment_status: "unpaid" })), "standard");
  assert.equal(sessionTier(session("gold", { status: "open" })), "standard");
  assert.equal(sessionTier(session("gold", { payment_intent: { latest_charge: { refunded: true } } })), "standard");
  assert.equal(sessionTier(session("diamond")), "standard");
});

test("an email holds the best tier across its purchases, looked up case-insensitively", async () => {
  buyer("buyer@example.com", session("gold"), session("platinum", { payment_intent: { latest_charge: { refunded: true } } }));
  buyer("Buyer@Example.com", session("platinum", { payment_status: "unpaid" }));
  assert.equal(await tierForEmail("Buyer@Example.com"), "gold");
  assert.equal(await tierForEmail("nobody@example.com"), "standard");
});

/* ---- the guides */

const guides = readdirSync("resources").filter(f => f.endsWith(".html") && f !== "index.html");

test("every paid guide trims to its preview: no body text past the teaser", () => {
  for (const f of guides) {
    const html = readFileSync("resources/" + f, "utf8");
    if (guideTier(html) === "standard") continue;
    const cut = trimGuide(html);
    const art = cut.slice(cut.indexOf("<article"), cut.indexOf("</article>"));
    assert.match(art, /data-trimmed/, f);
    assert.equal((art.match(/<h2\b/g) || []).length <= 1, true, f + " keeps more than the teaser heading");
    assert.ok(cut.length < html.length * 0.7, f + " was barely trimmed");
    // the last section of the full guide must not survive
    const lastH2 = html.lastIndexOf("<h2");
    const tail = html.slice(html.indexOf(">", lastH2) + 1, html.indexOf("</h2>", lastH2));
    if ((html.match(/<h2\b/g) || []).length > 1) assert.ok(!cut.includes(tail), f + " leaks its last section");
    assert.match(cut, /<script src="\/assets\/tiers.js"><\/script>/, f + " lost its scripts");
  }
});

test("data-preview-end moves the cut", () => {
  const html = `<article class="doc" data-tier="gold"><header>h</header>
  <p>one</p>
  <p data-preview-end>two</p>
  <p>three</p>
  <h2>Four</h2><p>secret</p>
</article><script src="/x.js"></script>`;
  const cut = trimGuide(html);
  assert.ok(cut.includes("one") && cut.includes("two") && cut.includes("three"));
  assert.ok(!cut.includes("Four") && !cut.includes("secret"));
  assert.ok(cut.endsWith('</article><script src="/x.js"></script>'));
});

const goldGuide = guides.map(f => f.slice(0, -5))
  .find(s => guideTier(readFileSync(`resources/${s}.html`, "utf8")) === "gold");
const platGuide = guides.map(f => f.slice(0, -5))
  .find(s => guideTier(readFileSync(`resources/${s}.html`, "utf8")) === "platinum");
const freeGuide = guides.map(f => f.slice(0, -5))
  .find(s => guideTier(readFileSync(`resources/${s}.html`, "utf8")) === "standard");

test("/api/guide sends a paid guide whole only to a session that holds its tier", async () => {
  const text = async r => (await r).text();
  assert.match(await text(guide.GET(req("/api/guide?slug=" + goldGuide))), /data-trimmed/);
  assert.doesNotMatch(await text(guide.GET(req("/api/guide?slug=" + freeGuide))), /data-trimmed/);

  const gold = (await auth.sessionCookies("a@b.co", "gold")).map(c => c.split(";")[0]).join("; ");
  assert.doesNotMatch(await text(guide.GET(withCookies("/api/guide?slug=" + goldGuide, gold))), /data-trimmed/);
  assert.match(await text(guide.GET(withCookies("/api/guide?slug=" + platGuide, gold))), /data-trimmed/);

  // the display cookie alone proves nothing
  assert.match(await text(guide.GET(withCookies("/api/guide?slug=" + platGuide, "cr_tier=platinum"))), /data-trimmed/);

  process.env.PAYWALL = "off";
  assert.doesNotMatch(await text(guide.GET(req("/api/guide?slug=" + platGuide))), /data-trimmed/);

  assert.equal((await guide.GET(req("/api/guide?slug=../serve"))).status, 404);
  assert.equal((await guide.GET(req("/api/guide?slug=nope"))).status, 404);
  const r = await guide.GET(req("/api/guide?slug=" + goldGuide));
  assert.equal(r.headers.get("cache-control"), "private, no-store");
});

test("the middleware routes guides through /api/guide only while the paywall is on", () => {
  const rw = r => r && r.headers.get("x-middleware-rewrite");
  assert.equal(rw(middleware(req("/resources/trp2"))), "https://cabready.example/api/guide?slug=trp2");
  assert.equal(rw(middleware(req("/resources/trp2.html"))), "https://cabready.example/api/guide?slug=trp2");
  assert.equal(middleware(req("/resources/index")), undefined);
  process.env.PAYWALL = "off";
  assert.equal(middleware(req("/resources/trp2")), undefined);
});

/* ---- buying */

test("checkout sends the buyer to Stripe with the tier's price and the site's return URL", async () => {
  const r = await checkout.POST(post("/api/checkout", { tier: "gold" }));
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_new");
  const sent = new URLSearchParams(calls[0].opts.body);
  assert.equal(sent.get("line_items[0][price]"), "price_gold");
  assert.equal(sent.get("metadata[tier]"), "gold");
  assert.equal(sent.get("mode"), "payment");
  assert.equal(sent.get("success_url"), "https://cabready.example/api/claim?session_id={CHECKOUT_SESSION_ID}");

  assert.equal((await checkout.POST(post("/api/checkout", { tier: "diamond" }))).headers.get("location"), "/pricing?error=tier");
  process.env.PAYWALL = "off";
  assert.equal((await checkout.POST(post("/api/checkout", { tier: "gold" }))).headers.get("location"), "/pricing");
});

test("claiming a paid session signs the buyer in on the tier they bought", async () => {
  const [s] = buyer("buyer@example.com", session("platinum"));
  const r = await claim.GET(req("/api/claim?session_id=" + s.id));
  assert.equal(r.headers.get("location"), "/account?welcome=platinum");
  const cookies = cookieHeader(r);
  assert.match(cookies, /cr_tier=platinum/);
  const token = decodeURIComponent(/cr_session=([^;]+)/.exec(cookies)[1]);
  assert.equal((await auth.verify(token, "s")).e, "buyer@example.com");
  assert.ok(r.headers.getSetCookie().some(c => c.startsWith("cr_session=") && /HttpOnly/.test(c)));
});

test("an unpaid or unknown session signs nobody in", async () => {
  const [s] = buyer("buyer@example.com", session("gold", { payment_status: "unpaid" }));
  for (const id of [s.id, "cs_missing", "not-a-session"]) {
    const r = await claim.GET(req("/api/claim?session_id=" + id));
    assert.equal(r.headers.get("location"), "/account?error=claim");
    assert.equal(r.headers.getSetCookie().length, 0);
  }
});

/* ---- moving up */

const upgrade = extra => session("platinum", Object.assign({ metadata: { tier: "platinum", upgrade: "gold" } }, extra));
const signedIn = async (email, tier) =>
  (await auth.sessionCookies(email, tier)).map(c => c.split(";")[0]).join("; ");
const sent = () => new URLSearchParams(calls.find(c => c.opts.method === "POST").opts.body);

test("a signed-in Gold holder moves up for the difference, on their own email", async () => {
  buyer("buyer@example.com", session("gold"));
  const r = await checkout.POST(req("/api/checkout", {
    method: "POST", body: "tier=platinum",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: await signedIn("buyer@example.com", "gold") }
  }));
  assert.equal(r.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_new");
  assert.equal(sent().get("line_items[0][price]"), "price_up");
  assert.equal(sent().get("metadata[upgrade]"), "gold");
  assert.equal(sent().get("customer_email"), "buyer@example.com");
});

test("the upgrade price is decided by Stripe's record, not the cookie", async () => {
  // the cookie says Gold, but the Gold was refunded
  buyer("buyer@example.com", session("gold", { payment_intent: { latest_charge: { refunded: true } } }));
  await checkout.POST(req("/api/checkout", {
    method: "POST", body: "tier=platinum",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: await signedIn("buyer@example.com", "gold") }
  }));
  assert.equal(sent().get("line_items[0][price]"), "price_plat");
  assert.equal(sent().get("metadata[upgrade]"), null);
});

test("nobody signed in pays full price, and a holder is not sold what they have", async () => {
  await checkout.POST(post("/api/checkout", { tier: "platinum" }));
  assert.equal(sent().get("line_items[0][price]"), "price_plat");

  calls = [];
  buyer("plat@example.com", session("platinum"));
  const r = await checkout.POST(req("/api/checkout", {
    method: "POST", body: "tier=gold",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: await signedIn("plat@example.com", "platinum") }
  }));
  assert.equal(r.headers.get("location"), "/account");
  assert.equal(calls.filter(c => c.opts.method === "POST").length, 0);
});

test("an upgrade is Platinum only while the Gold under it stands", async () => {
  buyer("a@example.com", session("gold"), upgrade());
  assert.equal(await tierForEmail("a@example.com"), "platinum");

  buyer("b@example.com", session("gold", { payment_intent: { latest_charge: { refunded: true } } }), upgrade());
  assert.equal(await tierForEmail("b@example.com"), "standard");

  buyer("c@example.com", session("gold"), upgrade({ payment_intent: { latest_charge: { refunded: true } } }));
  assert.equal(await tierForEmail("c@example.com"), "gold");

  buyer("d@example.com", upgrade());
  assert.equal(await tierForEmail("d@example.com"), "standard");
});

test("claiming an upgrade whose Gold has gone signs nobody in as Platinum", async () => {
  const [, up] = buyer("buyer@example.com",
    session("gold", { payment_intent: { latest_charge: { refunded: true } } }), upgrade());
  const r = await claim.GET(req("/api/claim?session_id=" + up.id));
  assert.equal(r.headers.get("location"), "/account?error=claim");

  const [, ok] = buyer("fine@example.com", session("gold"), upgrade({ customer_details: { email: "fine@example.com" } }));
  const r2 = await claim.GET(req("/api/claim?session_id=" + ok.id));
  assert.equal(r2.headers.get("location"), "/account?welcome=platinum");
});

/* ---- signing in */

test("a sign-in link goes only to a buyer, to SITE_URL whatever the Host, and the reply is the same", async () => {
  buyer("buyer@example.com", session("gold"));
  const a = await login.POST(post("/api/login", { email: "Buyer@Example.com" }, { host: "evil.example" }));
  const b = await login.POST(post("/api/login", { email: "stranger@example.com" }));
  assert.equal(a.headers.get("location"), "/account?sent=1");
  assert.equal(b.headers.get("location"), "/account?sent=1");
  assert.equal(mails.length, 1);
  assert.deepEqual(mails[0].to, ["buyer@example.com"]);
  const link = /https:\/\/cabready\.example\/api\/verify\?t=([^"\s]+)/.exec(mails[0].text);
  assert.ok(link, "link points at SITE_URL");

  const r = await verify.GET(req("/api/verify?t=" + link[1]));
  assert.equal(r.headers.get("location"), "/account");
  assert.match(cookieHeader(r), /cr_tier=gold/);
});

test("a bad or expired sign-in link, or a session token used as one, is refused", async () => {
  const expired = await auth.sign({ k: "l", e: "buyer@example.com", x: Date.now() - 1 });
  const sessionToken = await auth.sign({ k: "s", e: "buyer@example.com", t: "gold", i: 0, x: Date.now() + 60000 });
  for (const t of [expired, sessionToken, "junk"]) {
    const r = await verify.GET(req("/api/verify?t=" + encodeURIComponent(t)));
    assert.equal(r.headers.get("location"), "/account?error=link");
    assert.equal(r.headers.getSetCookie().length, 0);
  }
  assert.equal((await login.POST(post("/api/login", { email: "not an email" }))).headers.get("location"), "/account?error=email");
});

/* ---- staying honest */

test("/api/me trusts a fresh session and re-asks Stripe once it is a day old", async () => {
  const fresh = (await auth.sessionCookies("buyer@example.com", "gold")).map(c => c.split(";")[0]).join("; ");
  let r = await (await me.GET(withCookies("/api/me", fresh))).json();
  assert.deepEqual(r, { paywall: true, signedIn: true, email: "buyer@example.com", tier: "gold" });
  assert.equal(calls.length, 0);

  // a day on, and the purchase has been refunded
  buyer("buyer@example.com", session("gold", { payment_intent: { latest_charge: { refunded: true } } }));
  const stale = await auth.sign({ k: "s", e: "buyer@example.com", t: "gold", i: Date.now() - auth.RECHECK_MS - 1, x: Date.now() + 60000 });
  const res = await me.GET(withCookies("/api/me", "cr_session=" + encodeURIComponent(stale) + "; cr_tier=gold"));
  assert.equal((await res.json()).tier, "standard");
  assert.match(cookieHeader(res), /cr_tier=standard/);
});

test("/api/me with no session says so, and clears a stray display cookie", async () => {
  const r = await me.GET(withCookies("/api/me", "cr_tier=platinum"));
  assert.deepEqual(await r.json(), { paywall: true, signedIn: false, tier: "standard" });
  assert.ok(r.headers.getSetCookie().some(c => c.startsWith("cr_tier=;") && /Max-Age=0/.test(c)));
});

test("signing out clears both cookies", async () => {
  const r = await logout.POST(req("/api/logout", { method: "POST" }));
  const set = r.headers.getSetCookie();
  assert.equal(set.length, 2);
  assert.ok(set.every(c => /Max-Age=0/.test(c)));
});

/* ---- one-to-one sessions */

const book = await import("../api/book.js");
const booked = await import("../api/booked.js");
process.env.STRIPE_PRICE_SESSION = "price_session";
process.env.STRIPE_PRICE_SESSION_PLATINUM = "price_session_plat";

test("a session is £79, with the rescheduling terms on the pay button, and grants no tier", async () => {
  const r = await book.POST(post("/api/book", {}));
  assert.equal(r.headers.get("location"), "https://checkout.stripe.com/c/pay/cs_new");
  assert.equal(sent().get("line_items[0][price]"), "price_session");
  assert.equal(sent().get("metadata[product]"), "session");
  assert.equal(sent().get("metadata[tier]"), null);
  assert.match(sent().get("custom_text[submit][message]"), /48 hours/);
  assert.equal(sent().get("success_url"), "https://cabready.example/api/booked?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(sessionTier(session(undefined, { metadata: { product: "session" } })), "standard");

  process.env.PAYWALL = "off";
  assert.equal((await book.POST(post("/api/book", {}))).headers.get("location"), "/coaching#book");
});

test("the Platinum session price is decided by Stripe's record, not the cookie", async () => {
  buyer("plat@example.com", session("platinum"));
  await book.POST(req("/api/book", { method: "POST", body: "",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: await signedIn("plat@example.com", "platinum") } }));
  assert.equal(sent().get("line_items[0][price]"), "price_session_plat");

  calls = [];
  buyer("gold@example.com", session("gold"));
  await book.POST(req("/api/book", { method: "POST", body: "",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: await signedIn("gold@example.com", "platinum") } }));
  assert.equal(sent().get("line_items[0][price]"), "price_session");
});

test("a paid session goes on to the calendar with the email filled in; anything else does not", async () => {
  const [s, unpaid, tier] = buyer("Buyer@Example.com",
    session(undefined, { metadata: { product: "session" }, customer_details: { email: "Buyer@Example.com" } }),
    session(undefined, { metadata: { product: "session" }, payment_status: "unpaid" }),
    session("gold"));
  process.env.BOOKING_URL = "https://cal.example/cab-ready/one-to-one";
  assert.equal((await booked.GET(req("/api/booked?session_id=" + s.id))).headers.get("location"),
    "https://cal.example/cab-ready/one-to-one?email=buyer%40example.com");
  for (const id of [unpaid.id, tier.id, "cs_missing", "nope"])
    assert.equal((await booked.GET(req("/api/booked?session_id=" + id))).headers.get("location"), "/coaching?error=booked#book");

  delete process.env.BOOKING_URL;
  assert.equal((await booked.GET(req("/api/booked?session_id=" + s.id))).headers.get("location"), "/coaching?paid=1#book");
});

test("with Calendly set up, a payment gets one single-use link, and the same one on every return", async () => {
  process.env.CALENDLY_TOKEN = "cal_token";
  process.env.CALENDLY_EVENT_TYPE = "https://api.calendly.com/event_types/ET1";
  const customer = { id: "cus_cal", metadata: {} };
  const [s] = buyer("buyer@example.com", session(undefined, {
    metadata: { product: "session" }, customer,
    customer_details: { email: "buyer@example.com", name: "Sam Driver" }
  }));
  const stripeFetch = globalThis.fetch;
  let minted = 0;
  globalThis.fetch = async (url, opts = {}) => {
    const u = new URL(url);
    if (u.host === "api.calendly.com") {
      calls.push({ url: u, opts });
      minted++;
      return new Response(JSON.stringify({ resource: { booking_url: "https://calendly.com/d/link-" + minted } }), { status: 200 });
    }
    if (u.pathname === "/v1/customers/cus_cal" && opts.method === "POST") {
      new URLSearchParams(opts.body).forEach((v, k) => { customer.metadata[k.slice(9, -1)] = v; });
      return new Response(JSON.stringify(customer), { status: 200 });
    }
    return stripeFetch(url, opts);
  };
  try {
    const first = (await booked.GET(req("/api/booked?session_id=" + s.id))).headers.get("location");
    assert.equal(first, "https://calendly.com/d/link-1?email=buyer%40example.com&name=Sam+Driver");
    const ask = JSON.parse(calls.find(c => c.url.host === "api.calendly.com").opts.body);
    assert.deepEqual(ask, { max_event_count: 1, owner: "https://api.calendly.com/event_types/ET1", owner_type: "EventType" });
    assert.equal(calls.find(c => c.url.host === "api.calendly.com").opts.headers.Authorization, "Bearer cal_token");

    const again = (await booked.GET(req("/api/booked?session_id=" + s.id))).headers.get("location");
    assert.equal(again, first);
    assert.equal(minted, 1);
  } finally {
    delete process.env.CALENDLY_TOKEN;
    delete process.env.CALENDLY_EVENT_TYPE;
  }
});
