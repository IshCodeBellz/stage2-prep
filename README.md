# Cab Ready

Marketing site, resource library and practice simulators for the trainee train
driver assessment. Static: no build step, no dependencies, no framework.

```
index.html              the landing page                    →  /
pricing.html            Starter / Gold / Platinum           →  /pricing
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

Three: **starter**, **gold**, **platinum**. Each guide carries one, in
`assets/resources.js`, and that single field drives the badge on the card, the
row in the pricing table and whether the body of the guide is shown.

Nothing is locked yet. `assets/tiers.js` has one constant:

```js
const PAYWALL = false;   // flip to true when billing exists
```

While it is false the whole library is open. To see how it will read once it is
on, add `?paywall=1&tier=starter` to any URL, or use the preview switch on
`/pricing`, which does the same thing.

When it is flipped on, a guide whose tier the visitor does not hold is trimmed
to its free preview — everything before the first `<h2>`, or before the element
marked `data-preview-end` if you want a longer one — and the upgrade panel is
inserted underneath. No guide needs editing for that to work.

**The current gate is a preview, not a security boundary.** The tier lives in
`localStorage` and the full text of every guide is in the HTML the browser
already downloaded. Before charging for any of it, entitlement has to be checked
on the server and paid guides served from behind that check.

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
