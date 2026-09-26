/* Calendly, for booking a paid one-to-one session.

   The event type's own link would take a booking from anyone who found it, so
   buyers never see it. Each paid session gets a single-use scheduling link
   instead — it takes exactly one booking and is then spent. Plain fetch against
   the v2 API, like stripe.js. */

const API = "https://api.calendly.com/";

export const calendlyOn = () => !!(process.env.CALENDLY_TOKEN && process.env.CALENDLY_EVENT_TYPE);

export async function singleUseLink() {
  const r = await fetch(API + "scheduling_links", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.CALENDLY_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({
      max_event_count: 1,
      owner: process.env.CALENDLY_EVENT_TYPE,     // https://api.calendly.com/event_types/…
      owner_type: "EventType"
    })
  });
  const data = await r.json().catch(() => ({}));
  const url = data.resource && data.resource.booking_url;
  if (!r.ok || !url) throw new Error("Calendly scheduling_links: " + (data.message || r.status));
  return url;
}
