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
    // anything else already bought on this email counts too
    const tier = best(bought, await tierForEmail(email).catch(() => "standard"));
    return redirect("/account?welcome=" + tier, await sessionCookies(email, tier));
  } catch (e) {
    console.error(e);
    return redirect("/account?error=claim");
  }
}
