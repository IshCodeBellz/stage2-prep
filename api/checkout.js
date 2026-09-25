/* POST /api/checkout  tier=gold|platinum
   Sends the buyer to Stripe Checkout. Stripe collects the email; the session is
   tagged with the tier, and on success comes back through /api/claim.

   Platinum for someone signed in who holds Gold is the upgrade price — the
   difference — decided by asking Stripe what the email holds, never by the
   cookie. The email is fixed at checkout, so the upgrade lands on the account
   that holds the Gold. */

import { redirect, body, session, siteURL, paywallOn } from "./_lib/auth.js";
import { stripe, PRICES, tierForEmail } from "./_lib/stripe.js";

export async function POST(request) {
  if (!paywallOn()) return redirect("/pricing");
  const { tier } = await body(request);
  if (tier !== "gold" && tier !== "platinum") return redirect("/pricing?error=tier");
  try {
    const site = siteURL(request);
    const me = await session(request);
    const holds = me ? await tierForEmail(me.e) : "standard";
    if (holds === "platinum" || holds === tier) return redirect("/account");   // already has it
    const upgrade = tier === "platinum" && holds === "gold";
    const price = PRICES()[upgrade ? "upgrade" : tier];
    if (!price) throw new Error("no Stripe price set for " + (upgrade ? "upgrade" : tier));
    const s = await stripe("POST", "checkout/sessions", {
      mode: "payment",
      line_items: { 0: { price, quantity: 1 } },
      metadata: upgrade ? { tier, upgrade: "gold" } : { tier },
      customer_creation: "always",
      customer_email: me ? me.e : undefined,     // signed in: buy on the same email
      allow_promotion_codes: "true",
      success_url: site + "/api/claim?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: site + "/pricing"
    });
    return redirect(s.url);
  } catch (e) {
    console.error(e);
    return redirect("/pricing?error=checkout");
  }
}
