/* GET /api/me  →  { paywall, signedIn, email, tier }
   Also where a session is kept honest: once it is RECHECK_MS old, the tier is
   asked of Stripe again and the cookies are reissued, so a refund takes the
   tier away within a day. tiers.js calls this at most once a day. */

import { json, session, sessionCookies, clearCookies, paywallOn, RECHECK_MS } from "./_lib/auth.js";
import { tierForEmail } from "./_lib/stripe.js";

export async function GET(request) {
  const paywall = paywallOn();
  const s = await session(request).catch(() => null);
  if (!s) {
    // a leftover display cookie with no session behind it is cleared
    const stale = (request.headers.get("cookie") || "").includes("cr_tier=");
    return json({ paywall, signedIn: false, tier: "standard" }, 200, stale ? clearCookies() : null);
  }
  if (Date.now() - s.i < RECHECK_MS) return json({ paywall, signedIn: true, email: s.e, tier: s.t });
  try {
    const tier = await tierForEmail(s.e);
    return json({ paywall, signedIn: true, email: s.e, tier }, 200, await sessionCookies(s.e, tier));
  } catch (e) {
    console.error(e);   // Stripe unreachable: keep what the session says until it can be asked
    return json({ paywall, signedIn: true, email: s.e, tier: s.t });
  }
}
