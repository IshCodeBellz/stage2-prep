/* Stripe is the only record of who bought what.

   Checkout always creates a Customer, and each session carries the tier it sold
   in metadata.tier. So "what does this email hold?" is: find the customers with
   that email, list their completed checkout sessions, and take the highest tier
   among those that were paid and not refunded. A move up from Gold is sold as
   the difference and marked metadata.upgrade = "gold": it makes Platinum only
   while a Gold it builds on still stands, so refunding the Gold cannot leave
   Platinum behind for the price of the difference. No webhook, no database — a
   refund issued in the Stripe dashboard takes the tier away the next time the
   session is checked (see RECHECK_MS in auth.js).

   Plain fetch against the REST API rather than the stripe package, to keep the
   site free of dependencies. */

import { TIERS, best, normEmail } from "./auth.js";

const API = "https://api.stripe.com/v1/";

/* Stripe's form encoding: nested objects become a[b][c]=v. */
export function form(params, prefix, out) {
  out = out || new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    const name = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, name, out);
    else out.append(name, String(v));
  }
  return out;
}

export async function stripe(method, path, params) {
  const keyv = process.env.STRIPE_SECRET_KEY;
  if (!keyv) throw new Error("STRIPE_SECRET_KEY is not set");
  const qs = params ? form(params).toString() : "";
  const url = API + path + (method === "GET" && qs ? "?" + qs : "");
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: "Bearer " + keyv,
      ...(method === "GET" ? {} : { "Content-Type": "application/x-www-form-urlencoded" })
    },
    body: method === "GET" ? undefined : qs
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Stripe " + path + ": " + ((data.error && data.error.message) || r.status));
  return data;
}

export const PRICES = () => ({
  gold: process.env.STRIPE_PRICE_GOLD,
  platinum: process.env.STRIPE_PRICE_PLATINUM,
  upgrade: process.env.STRIPE_PRICE_UPGRADE      // Gold to Platinum, the difference
});

const isUpgrade = s => !!(s && s.metadata && s.metadata.upgrade === "gold");

/* What a set of checkout sessions adds up to. */
export function holdings(sessions) {
  let tier = "standard", upgraded = false;
  for (const s of sessions) {
    const t = sessionTier(s);
    if (t === "standard") continue;
    if (isUpgrade(s)) upgraded = true;
    else tier = best(tier, t);
  }
  return upgraded && tier === "gold" ? "platinum" : tier;
}

/* The tier one checkout session grants: its metadata tier if it was paid (or
   free through a 100% promotion code) and its charge has not been fully refunded. */
export function sessionTier(s) {
  if (!s || s.status !== "complete") return "standard";
  if (s.payment_status !== "paid" && s.payment_status !== "no_payment_required") return "standard";
  const charge = s.payment_intent && s.payment_intent.latest_charge;
  if (charge && typeof charge === "object" && charge.refunded) return "standard";
  const t = s.metadata && s.metadata.tier;
  return TIERS.indexOf(t) > 0 ? t : "standard";
}

/* The highest tier this email holds. Stripe matches customer email exactly, so
   the address is looked up as typed and lower-cased. */
export async function tierForEmail(email) {
  const tried = new Set(), customers = new Map();
  for (const e of [String(email || "").trim(), normEmail(email)]) {
    if (!e || tried.has(e)) continue;
    tried.add(e);
    const list = await stripe("GET", "customers", { email: e, limit: 100 });
    (list.data || []).forEach(c => customers.set(c.id, c));
  }
  const all = [];
  for (const id of customers.keys()) {
    const sessions = await stripe("GET", "checkout/sessions", {
      customer: id, status: "complete", limit: 100,
      expand: { 0: "data.payment_intent.latest_charge" }
    });
    all.push(...(sessions.data || []));
  }
  return holdings(all);
}
