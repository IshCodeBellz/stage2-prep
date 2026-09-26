/* GET /api/booked?session_id=cs_...
   Where Stripe sends someone who has paid for a one-to-one session. Checks the
   payment with Stripe, then sends them to the calendar at BOOKING_URL to pick
   a time, with their email filled in. Without a BOOKING_URL they land back on
   /coaching, told that times will come by email. */

import { redirect, normEmail } from "./_lib/auth.js";
import { stripe, paid } from "./_lib/stripe.js";

export async function GET(request) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return redirect("/coaching?error=booked#book");
  try {
    const s = await stripe("GET", "checkout/sessions/" + id, { expand: { 0: "payment_intent.latest_charge" } });
    if (!paid(s) || !s.metadata || s.metadata.product !== "session") return redirect("/coaching?error=booked#book");
    const email = normEmail(s.customer_details && s.customer_details.email);
    const cal = process.env.BOOKING_URL;
    if (!cal) return redirect("/coaching?paid=1#book");
    const to = new URL(cal);
    if (email) to.searchParams.set("email", email);    // Calendly and Cal.com both read this
    return redirect(to.toString());
  } catch (e) {
    console.error(e);
    return redirect("/coaching?error=booked#book");
  }
}
