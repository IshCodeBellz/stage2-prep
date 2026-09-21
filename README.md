# Stage 2 Test Simulators

Practice simulators for the GTS trainee train driver Stage 2 assessment day.
Static site, no build step, no dependencies — one HTML file plus an icon,
a web manifest and a service worker.

## Deploy to Vercel

### Option A — GitHub, then Vercel (works entirely from a phone)

1. On github.com, tap **+ → New repository**. Name it `stage2-prep`, set it
   **Private**, and create it without a README.
2. On the empty repo page, tap **uploading an existing file** and upload
   everything in this folder: `index.html`, `manifest.webmanifest`,
   `icon-180.png`, `icon-512.png`, `sw.js`, `vercel.json`, `.gitignore`, `README.md`.
3. Commit to `main`.
4. On vercel.com, **Add New → Project → Import Git Repository**, pick
   `stage2-prep`.
5. Framework preset: **Other**. Leave build command and output directory empty.
   Tap **Deploy**.

Live in about twenty seconds at `stage2-prep-<something>.vercel.app`.

### Option B — command line

```bash
cd stage2-prep
git init -b main
git add -A
git commit -m "Stage 2 test simulators"
gh repo create stage2-prep --private --source=. --push   # or add a remote manually
npx vercel --prod
```

### Option C — no GitHub at all

`npx vercel --prod` from inside this folder. Vercel will create the project and
give you a URL. You lose deploy-on-push, so you would re-run the command after
each change.

## Printing the stage 1 papers

Stage 1 is an afternoon of paper. The Tea-Occ is the exception — it comes through
headphones — so the other four have a **Paper** button beside Practice and Exam:
Group Bourdon, TRP1b, TRP2 and the DFFT. **Print the paper pack** above the list
prints all four in one go, behind a cover sheet with the running order and the
clock each one is given.

The preview is the printed page rather than a picture of it, so what is on screen
is what comes out. Print it, or choose Save as PDF in the same dialogue. Every
paper is generated fresh, so printing the same one twice gives two different
papers, and the answers are on the last sheets — **Answers: printed** toggles
them off if someone else is marking it.

Printing is sometimes blocked in a home-screen web app. If the button appears to
do nothing, open the site in Safari or Chrome instead.

## Put it on your home screen

Open the deployed URL in Safari or Chrome on your phone, then **Share → Add to
Home Screen**. It opens full screen with no browser chrome and works with no
signal, which is the point — the Underground and most of the network between
stations has nothing.

## Updating it

Push a change to `main` and Vercel redeploys automatically. **Bump the `CACHE`
constant in `sw.js`** whenever you change `index.html` — `stage2-v1` becomes
`stage2-v2` and so on. Without that, phones that already installed the app keep
serving the old cached copy.

## Notes on the files

- `index.html` — your original file, unchanged apart from two things: the
  `data:` URI manifest now points at the real `/manifest.webmanifest` (browsers
  will not install a PWA from a `data:` manifest), and a service worker
  registration is appended at the end.
- `sw.js` — network-first for the page so redeploys land as soon as you have
  signal, cache-first for icons.
- `vercel.json` — stops the HTML and service worker being cached at the edge,
  caches the icons for a year.

Your scores are kept in `localStorage`, which is per-browser and per-device.
They will not follow you from phone to laptop, and clearing site data wipes them.

## Optional fix worth knowing about

The HTML has no `<!DOCTYPE html>`, so browsers render it in quirks mode. It has
presumably always run that way, and adding the doctype switches the box model
and can shift the layout, so I left it alone. If you ever want to fix it, add
`<!DOCTYPE html>` as the very first line and check every screen on a phone
before you push.
