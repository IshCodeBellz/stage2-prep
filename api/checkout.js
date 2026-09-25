/* POST /api/checkout  tier=gold|platinum
   Sends the buyer to Stripe Checkout. Stripe collects the email; the session is
   tagged with the tier, and on success comes back through /api/claim. */

import { redirect, body, session, siteURL, paywallOn } from "./_lib/auth.js";
import { stripe, PRICES } from "./_lib/stripe.js";

export async function POST(request) {
  if (!paywallOn()) return redirect("/pricing");
  const { tier } = await body(request);
  const price = PRICES()[tier];
  if (!price) return redirect("/pricing?error=tier");
  try {
    const site = siteURL(request);
    const me = await session(request);
    const s = await stripe("POST", "checkout/sessions", {
      mode: "payment",
      line_items: { 0: { price, quantity: 1 } },
      metadata: { tier },
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
