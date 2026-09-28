/* GET /api/booked?session_id=cs_...
   Where Stripe sends someone who has paid for a one-to-one session. Checks the
   payment with Stripe, then sends them to pick a time, with their name and
   email filled in:

   - with CALENDLY_TOKEN and CALENDLY_EVENT_TYPE set, to a single-use Calendly
     link made for this payment. The link is kept on the Stripe customer, keyed
     by the checkout session, so coming back to this URL — a refresh, a closed
     tab — returns the same link rather than minting another. One payment, one
     booking.
   - otherwise to BOOKING_URL, if set, which anyone holding it can use;
   - otherwise back to /coaching, told that times will come by email. */

import { redirect, normEmail } from "./_lib/auth.js";
import { stripe, paid } from "./_lib/stripe.js";
import { calendlyOn, singleUseLink } from "./_lib/calendly.js";

// Stripe metadata keys are at most 40 characters
const linkKey = id => "cal_" + id.slice(-36);

async function linkFor(s) {
  if (!s.customer) return singleUseLink();       // nowhere to keep it; checkout always makes one
  const customer = s.customer && typeof s.customer === "object"
    ? s.customer
    : await stripe("GET", "customers/" + s.customer);
  const key = linkKey(s.id);
  const kept = customer.metadata && customer.metadata[key];
  if (kept) return kept;
  const url = await singleUseLink();
  await stripe("POST", "customers/" + customer.id, { metadata: { [key]: url } });
  return url;
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return redirect("/coaching?error=booked#book");
  try {
    const s = await stripe("GET", "checkout/sessions/" + id,
      { expand: { 0: "payment_intent.latest_charge", 1: "customer" } });
    if (!paid(s) || !s.metadata || s.metadata.product !== "session") return redirect("/coaching?error=booked#book");

    const cal = calendlyOn() ? await linkFor(s) : process.env.BOOKING_URL;
    if (!cal) return redirect("/coaching?paid=1#book");
    const to = new URL(cal);
    const who = s.customer_details || {};
    if (who.email) to.searchParams.set("email", normEmail(who.email));   // Calendly and Cal.com both read these
    if (who.name) to.searchParams.set("name", who.name);
    return redirect(to.toString());
  } catch (e) {
    console.error(e);
    return redirect("/coaching?error=booked#book");
  }
}
