/* GET /api/verify?t=...
   The link in the sign-in email. Checks the link, asks Stripe what the email
   holds now, and sets the session. */

import { redirect, verify, sessionCookies } from "./_lib/auth.js";
import { tierForEmail } from "./_lib/stripe.js";

export async function GET(request) {
  const link = await verify(new URL(request.url).searchParams.get("t"), "l");
  if (!link) return redirect("/account?error=link");
  try {
    const tier = await tierForEmail(link.e);
    return redirect("/account", await sessionCookies(link.e, tier));
  } catch (e) {
    console.error(e);
    return redirect("/account?error=stripe");
  }
}
