/* GET /api/claim?session_id=cs_...
   Where Stripe sends the buyer after paying. Checks the session with Stripe,
   signs them in on the email they paid with, and takes them to their account. */

import { redirect, sessionCookies, normEmail, best } from "./_lib/auth.js";
import { stripe, sessionTier, tierForEmail } from "./_lib/stripe.js";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return redirect("/account?error=claim");
  try {
    const s = await stripe("GET", "checkout/sessions/" + id, { expand: { 0: "payment_intent.latest_charge" } });
    const bought = sessionTier(s);
    const email = normEmail(s.customer_details && s.customer_details.email);
    if (bought === "standard" || !email) return redirect("/account?error=claim");
    // Anything else already bought on this email counts too. An upgrade is only
    // Platinum on top of a Gold that still stands, so for one of those the
    // email's whole record decides, not this session alone.
    const record = await tierForEmail(email).catch(() => null);
    const upgrade = s.metadata && s.metadata.upgrade === "gold";
    const tier = upgrade ? (record || "standard") : best(bought, record || "standard");
    if (tier === "standard") return redirect("/account?error=claim");
    return redirect("/account?welcome=" + tier, await sessionCookies(email, tier));
  } catch (e) {
    console.error(e);
    return redirect("/account?error=claim");
  }
}
