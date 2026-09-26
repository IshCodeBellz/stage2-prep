/* POST /api/book
   Pays for a one-to-one session. Sends the buyer to Stripe Checkout at £79, or
   at the Platinum price for someone signed in whose email holds Platinum —
   asked of Stripe, never read from the cookie, as with the upgrade in
   checkout.js. The session is tagged metadata.product = "session" and carries
   no tier, so it adds nothing to what the email holds. On success it comes back
   through /api/booked, which sends the buyer on to the calendar. */

import { redirect, session, siteURL, paywallOn } from "./_lib/auth.js";
import { stripe, PRICES, tierForEmail } from "./_lib/stripe.js";

// shown beside the pay button, so the rescheduling rule is agreed before paying
export const TERMS =
  "Free to move or cancel with at least 48 hours' notice. With less notice, or if you " +
  "miss the call, the session counts as used and is not refunded.";

export async function POST(request) {
  if (!paywallOn()) return redirect("/coaching#book");
  try {
    const site = siteURL(request);
    const me = await session(request);
    const platinum = me ? (await tierForEmail(me.e)) === "platinum" : false;
    const prices = PRICES();
    const price = platinum ? prices.sessionPlatinum : prices.session;
    if (!price) throw new Error("no Stripe price set for the " + (platinum ? "Platinum " : "") + "session");
    const s = await stripe("POST", "checkout/sessions", {
      mode: "payment",
      line_items: { 0: { price, quantity: 1 } },
      metadata: platinum ? { product: "session", holder: "platinum" } : { product: "session" },
      customer_creation: "always",
      customer_email: me ? me.e : undefined,
      allow_promotion_codes: "true",
      custom_text: { submit: { message: TERMS } },
      success_url: site + "/api/booked?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: site + "/coaching#book"
    });
    return redirect(s.url);
  } catch (e) {
    console.error(e);
    return redirect("/coaching?error=book#book");
  }
}
