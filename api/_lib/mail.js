/* The sign-in email, sent through Resend's HTTP API. */

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export async function sendSignInLink(to, link) {
  const keyv = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!keyv || !from) throw new Error("RESEND_API_KEY or MAIL_FROM is not set");
  const text =
    "Here is your link to sign in to Cab Ready:\n\n" + link + "\n\n" +
    "It works for 30 minutes. If you did not ask for it, ignore this email — nothing happens unless the link is opened.";
  const html =
    `<p>Here is your link to sign in to Cab Ready:</p>
     <p><a href="${esc(link)}">Sign in to Cab Ready</a></p>
     <p style="color:#666">It works for 30 minutes. If you did not ask for it, ignore this email —
        nothing happens unless the link is opened.</p>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + keyv, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: "Your Cab Ready sign-in link", text, html })
  });
  if (!r.ok) throw new Error("Resend: " + r.status + " " + (await r.text().catch(() => "")));
}
