# Cab Ready

Marketing site, resource library and practice simulators for the trainee train
driver assessment. Static pages, plus a handful of Vercel Functions for accounts
and payment: no build step, no dependencies, no framework.

```
index.html              the landing page                    →  /
pricing.html            Standard / Gold / Platinum           →  /pricing
resources/index.html    the library, filterable             →  /resources
resources/*.html        21 guides, one per test or topic    →  /resources/<slug>
simulators.html         the app (was index.html)            →  /simulators
assets/site.css         one stylesheet for the whole site
assets/site.js          header, footer, cards, prev/next
assets/resources.js     the guide catalogue — add guides here
assets/tiers.js         the paywall, in the browser
account.html            sign in, and what you hold           →  /account
api/*.js                checkout, sign-in, session, guides   →  /api/<name>
api/_lib/               tokens and cookies, Stripe, email, the guide trim
middleware.js           sends /resources/<slug> through /api/guide
test/                   the server side, with Stripe stubbed — npm test
sw.js                   offline cache
scenes/                 tagged photographs for the ATAVT drill
```

Extensionless URLs come from `"cleanUrls": true` in `vercel.json`, so every link
in the HTML is written without `.html`.

## The tiers

Three: **standard** (free), **gold**, **platinum**. Each guide carries one, in
`assets/resources.js`, and that single field drives the badge on the card, the
row in the pricing table and whether the body of the guide is shown.

On the simulators the line is drawn by *what is free*, not how often — a count
kept in the browser resets in a private window, so it cannot be what the free
tier rests on:

| | Standard | Gold | Platinum |
|---|---|---|---|
| Group Bourdon, VSE tasks 1–3 — everything | ✓ | ✓ | ✓ |
| Every other drill in the battery | demo paper | ✓ | ✓ |
| Day mode, the Stage 1 paper pack | — | ✓ | ✓ |
| MMI drill, enhanced VSE | — | — | ✓ |

The two free drills are the two with free guides, and the ones people meet
first. A **demo paper** is the drill's practice version on one fixed paper: the
random numbers are seeded by the drill's name and the paper rotation stands
still, so it is the same paper on every run, in every browser. It shows the
score but not the coaching note, and it is not saved. Clearing site data gets a
visitor nothing new, which is the point.

Copy that is only true while nothing is locked — the "early access" notes — is
marked `class="open-only"` and disappears when the paywall is on.

## Tiers on the simulators

`simulators.html` loads `assets/tiers.js`, so the same `Access.can()` decides the
drills. A row in the menu with `data-tier` is that tier: the enhanced VSE and
the MMI are `platinum`, Day mode and the other nine battery drills `gold`. A row
with no tier (Group Bourdon, the VSE) is free. A locked row swaps its start
buttons for an *Unlock with …* link — unless it is also marked `data-demo`, in
which case its Practice button becomes **Demo paper** and the others become
links to `/pricing`. The paper pack button carries `data-tier="gold"` itself, and
a drill's printed paper goes with its row.

The menu is only the display. Every drill's `start()` begins with
`if(!admit("<id>", mode)) return;`, which checks the tier, starts a demo if that
is what lets it through, and otherwise shows the lock screen. A new drill needs
that line in its own `start`. While `App.demo` is set, `Math.random` is seeded,
`Rot.next` returns the first paper, `App.done` saves nothing and `App.results`
shows the Gold note in place of the coaching; `App.quit` and the next `admit`
put it all back.

Inside a Day mode sitting the drills are not checked again, so a drill that is a
tier above Gold names its id as the fourth field in `DAY_ORDERS` and sits the day
out for anyone without it.

While `PAYWALL` is false all of it is open. `?paywall=1&tier=standard` shows it
as a free visitor sees it, and `?paywall=1&tier=gold` as Gold.

## Accounts and payment

There are no passwords and no user database. **An account is an email address,
and Stripe is the record of what it bought.**

- **Buying.** The Buy buttons on `/pricing` post to `/api/checkout`, which opens
  Stripe Checkout for that tier's price. Checkout collects the email, always
  creates a Stripe Customer, and tags the session `metadata.tier`. Stripe sends
  the buyer back to `/api/claim`, which checks the session with Stripe and signs
  them in.
- **Signing in elsewhere.** `/account` takes an email and `/api/login` sends a
  link to it through Resend, but only if that email has bought something; the
  reply on screen is the same either way. The link (`/api/verify`) works for 30
  minutes.
- **What someone holds** is always worked out the same way (`tierForEmail` in
  `api/_lib/stripe.js`): the customers with that email, their completed checkout
  sessions, the highest tier among those paid and not fully refunded.
- **The session** is two cookies. `cr_session` is signed with `SESSION_SECRET`,
  HttpOnly, and is what the server believes. `cr_tier` is the same tier in the
  clear for the browser to read. Both last 30 days. Once a day `tiers.js` calls
  `/api/me`, which asks Stripe again — so **a refund issued in the Stripe
  dashboard takes the tier away within a day**, and a purchase on another device
  shows up.
- **Guides are gated on the server.** `middleware.js` sends every
  `/resources/<slug>` request to `/api/guide`, which sends the guide whole to a
  session that holds its tier and otherwise trims it to the preview before it
  leaves the server — the same cut `tiers.js` makes. The paid text is not in the
  page a non-buyer downloads.
- **The simulators are gated in the browser**, by `cr_tier`. They run entirely on
  the device, so someone willing to edit their own cookies can open them. That
  is accepted; the guides are where the server draws the line.
- **Prices:** Gold £49, Platinum £89, and £40 to move up from Gold. What is charged
  is the Stripe price; the figures in `pricing.html` and `account.html` are text,
  so change both together.
- **Moving up.** Platinum for someone signed in whose email holds Gold (asked of
  Stripe, not read from the cookie) is sold at the upgrade price and tagged
  `metadata.upgrade = "gold"`. That purchase is Platinum only while the Gold under
  it stands: refund the Gold and the upgrade grants nothing, so refund both.
- A 100%-off promotion code made in the Stripe dashboard works at checkout, for
  giving access away.

### Switching it on

1. **Stripe.** Make three products, each with a one-off price in GBP: *Gold* £49,
   *Platinum* £89 and *Gold to Platinum* £40. Copy the three price IDs
   (`price_…`). Get the secret key from Developers → API keys. Use test mode
   first.
2. **Resend.** Add and verify the domain the sign-in email comes from, and make
   an API key.
3. **Vercel → Settings → Environment Variables**, for Production (and Preview,
   with test-mode Stripe keys, to try it there first):

   | Variable | What |
   |---|---|
   | `PAYWALL` | `on` — the server half of the switch |
   | `SITE_URL` | `https://your-domain` — where Stripe and the sign-in email send people back to |
   | `SESSION_SECRET` | 32+ random characters: `openssl rand -base64 48`. Changing it signs everyone out |
   | `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…`) |
   | `STRIPE_PRICE_GOLD` | the Gold price ID |
   | `STRIPE_PRICE_PLATINUM` | the Platinum price ID |
   | `STRIPE_PRICE_UPGRADE` | the Gold to Platinum price ID |
   | `RESEND_API_KEY` | `re_…` |
   | `MAIL_FROM` | e.g. `Cab Ready <hello@your-domain>`, on the verified domain |

4. **The browser half:** set `const PAYWALL = true` in `assets/tiers.js` and bump
   `CACHE` in `sw.js`. Deploy.
5. **Try it on a preview deploy with test keys**: buy Gold with Stripe's test
   card `4242 4242 4242 4242`, open a Gold guide, sign out, sign back in with the
   link, move up to Platinum from the account page, and refund a payment in
   Stripe to watch the tier go (within a day, or
   straight away after signing out and in again).

Both halves have to agree. Server on and browser off gives trimmed guides with
the panel still drawn (the server marks what it trimmed), but open simulators;
browser on and server off locks the simulators but sends every guide whole.

## Adding a guide

1. Add an entry to `window.RESOURCES` in `assets/resources.js` — `slug`,
   `group`, `tier`, `minutes`, `stage`, `title`, `dek`. Position in the array is
   the reading order used by the prev/next links.
2. Copy an existing file in `resources/` and keep the shape: `<article class="doc"
   data-slug="…" data-tier="…">`, the crumbs line, the `<header>`, then the body.
3. Nothing else. The library page, the pricing table, the footer and the prev/next
   links all read the catalogue.

## Renaming the site

The brand appears in `window.SITE` at the top of `assets/site.js`, in each page's
`<title>` and in the footer's small print. `Cab Ready` is a placeholder — a
find-and-replace across `*.html` and `assets/site.js` changes it everywhere.

Before launch, also replace the placeholder contact details and confirm the
prices on `/pricing` are the ones you mean.

## Printing the stage 1 papers

Stage 1 is an afternoon of paper. The Tea-Occ is the exception — it comes through
headphones — so the other four have a **Paper** button beside Practice and Exam
on `/simulators`: Group Bourdon, TRP1b, TRP2 and the DFFT. **Print the paper
pack** above the list prints all four in one go, behind a cover sheet with the
running order and the clock each one is given.

The preview is the printed page rather than a picture of it, so what is on screen
is what comes out. Print it, or choose Save as PDF in the same dialogue. Every
paper is generated fresh, so printing the same one twice gives two different
papers, and the answers are on the last sheets — **Answers: printed** toggles
them off if someone else is marking it.

Printing is sometimes blocked in a home-screen web app. If the button appears to
do nothing, open the site in Safari or Chrome instead.

## Put it on your home screen

Open `/simulators` in Safari or Chrome on your phone, then **Share → Add to Home
Screen**. It opens full screen with no browser chrome and works with no signal,
which is the point — the Underground and most of the network between stations has
nothing.

## Running it locally

Any static server will do, but you want clean URLs, so plain
`python3 -m http.server` will 404 on `/pricing`. This resolves them the way
Vercel does:

```bash
node serve.js          # http://localhost:8000
npm test               # the server side, with Stripe and Resend stubbed
```

`serve.js` also runs `middleware.js` and the functions in `api/`, reading their
settings from the environment or from a git-ignored `.env.local` (`KEY=value`
lines, the same names as the table above). Use Stripe test keys locally;
`SITE_URL` can be left out on localhost.

## Deploying

Push to `main`; Vercel redeploys. **Bump the `CACHE` constant in `sw.js`**
whenever `simulators.html` or anything in `assets/` changes — increment the
number on the end — or phones that installed the app keep serving the old copy.

The app moved from `/` to `/simulators` when the marketing site took the root.
`manifest.webmanifest` now starts at `/simulators`, so new installs are correct;
anyone who added the old version to their home screen lands on the landing page
instead, one tap from the simulators, and can re-add it.

## What is stored

Scores are kept in `localStorage`, per browser and per device. They do not follow
you from phone to laptop and clearing site data wipes them. Nothing is uploaded.

An account is only an email address, held by Stripe with the purchase. The site
keeps nothing of its own about anyone: the session cookie carries the email and
tier, signed, and the rest is asked of Stripe.

## The disclaimer, which is not decorative

Nothing here reproduces a licensed test. Every exercise, passage, scenario and
photograph is original work built to the published description of the test it
drills, and the site is not affiliated with the Occupational Psychology Centre,
Schuhfried GmbH or any train operating company. Keep it that way: if a
contribution looks like it came off a real paper, it does not go in.
