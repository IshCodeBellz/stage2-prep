# Cab Ready

Marketing site, resource library and practice simulators for the trainee train
driver assessment. Static: no build step, no dependencies, no framework.

```
index.html              the landing page                    →  /
pricing.html            Standard / Gold / Platinum           →  /pricing
resources/index.html    the library, filterable             →  /resources
resources/*.html        21 guides, one per test or topic    →  /resources/<slug>
simulators.html         the app (was index.html)            →  /simulators
assets/site.css         one stylesheet for the whole site
assets/site.js          header, footer, cards, prev/next
assets/resources.js     the guide catalogue — add guides here
assets/tiers.js         the paywall scaffold
sw.js                   offline cache
scenes/                 tagged photographs for the ATAVT drill
```

Extensionless URLs come from `"cleanUrls": true` in `vercel.json`, so every link
in the HTML is written without `.html`.

## The tiers

Three: **standard** (free), **gold**, **platinum**. Each guide carries one, in
`assets/resources.js`, and that single field drives the badge on the card, the
row in the pricing table and whether the body of the guide is shown.

On the simulators the line is drawn by *what you can do*, not how often — a
count kept in the browser resets in a private window, so it cannot be what the
free tier rests on:

| | Standard | Gold | Platinum |
|---|---|---|---|
| Practice version of every Stage 1 and Stage 2 drill | ✓ | ✓ | ✓ |
| Exam version | one per drill, on the house | ✓ | ✓ |
| Day mode, the printed papers | — | ✓ | ✓ |
| Score history | last attempt | every attempt | every attempt |
| MMI drill, enhanced VSE | — | — | ✓ |

Practice runs are the short versions (two parts of Group Bourdon, fifteen pairs
of VSE 3, ten minutes of WAFV), so unlimited free use tells you where you are
weak but never rehearses the real length or the fatigue — which is what Gold is.
The one free exam per drill is spent when it starts, not when it ends.

Nothing is locked yet. `assets/tiers.js` has one constant:

```js
const PAYWALL = false;   // flip to true when billing exists
```

While it is false the whole library is open. To see how it will read once it is
on, add `?paywall=1&tier=standard` to any URL, or use the preview switch on
`/pricing`, which does the same thing.

When it is flipped on, a guide whose tier the visitor does not hold is trimmed
to its free preview — everything before the first `<h2>`, or before the element
marked `data-preview-end` if you want a longer one — and the upgrade panel is
inserted underneath. No guide needs editing for that to work.

**The current gate is a preview, not a security boundary.** The tier lives in
`localStorage` and the full text of every guide is in the HTML the browser
already downloaded. Before charging for any of it, entitlement has to be checked
on the server and paid guides served from behind that check.

Copy that is only true while nothing is locked — the "early access" notes — is
marked `class="open-only"` and disappears when the paywall is on.

## Tiers on the simulators

`simulators.html` loads `assets/tiers.js`, so the same `Access.can()` decides the
drills. Two kinds of marking in the menu:

- A **row** with `data-tier` is that tier whole — the enhanced VSE rows and the
  MMI are `platinum`, Day mode is `gold`. Its start buttons give way to an
  *Unlock with …* link.
- A **button** with `data-tier="gold"` — every Exam button and every Paper
  button — reads *Exam · 1 free* while the free exam is unspent, then becomes a
  link to `/pricing`. `EXAM_TIER` in the script is the same tier; keep the two
  agreeing.

The menu is only the display. Every drill's `start()` begins with
`if(!admit("<id>", mode)) return;`, which checks the tier, spends the free exam
if that is what lets it through, and otherwise shows the lock screen. A new
drill needs that line in its own `start`. Inside a Day mode sitting the drills
are not checked again, so a drill that is a tier of its own names its id as the
fourth field in `DAY_ORDERS` and sits the day out for anyone without it.

While `PAYWALL` is false all of it is open. `?paywall=1&tier=standard` shows it
as a free visitor sees it, and `?paywall=1&tier=gold` as Gold. The free exams
spent in a preview are kept in `localStorage` under `cabready.tasted`; clear
site data to get them back.

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
```

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
you from phone to laptop and clearing site data wipes them. Nothing is uploaded
and there is no account.

## The disclaimer, which is not decorative

Nothing here reproduces a licensed test. Every exercise, passage, scenario and
photograph is original work built to the published description of the test it
drills, and the site is not affiliated with the Occupational Psychology Centre,
Schuhfried GmbH or any train operating company. Keep it that way: if a
contribution looks like it came off a real paper, it does not go in.
