/* POST /api/login  email=...
   Emails a sign-in link, but only to an address that has bought something —
   there is nothing to sign in to otherwise. The reply is the same either way,
   so this cannot be used to find out who has bought. */

import { redirect, body, sign, normEmail, looksLikeEmail, siteURL, LINK_MINUTES } from "./_lib/auth.js";
import { tierForEmail } from "./_lib/stripe.js";
import { sendSignInLink } from "./_lib/mail.js";

export async function POST(request) {
  const email = normEmail((await body(request)).email);
  if (!looksLikeEmail(email)) return redirect("/account?error=email");
  try {
    if ((await tierForEmail(email)) !== "standard") {
      const t = await sign({ k: "l", e: email, x: Date.now() + LINK_MINUTES * 60000 });
      await sendSignInLink(email, siteURL(request) + "/api/verify?t=" + encodeURIComponent(t));
    }
  } catch (e) {
    console.error(e);
  }
  return redirect("/account?sent=1");
}
