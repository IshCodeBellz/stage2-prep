# The mockup screens

Eleven screens built from `Train Driver Prep Mockups.dc.html` (rounds 2–4), the
Claude Design handover. They live at `/design/*`, they are `noindex`, and
**nothing on the live site links to them** — they are here to be looked at and
argued with, not shipped.

```
/design                  2a  home — the test list, grouped by assessment day
                         3g  the same page at phone width
/design/scores           2c  my scores
/design/day              3f  day mode — the full day in order
/design/resources        4a  guides, videos and downloads
/design/paper-pack       3e  the stage 1 paper pack, print preview
/design/group-bourdon    3g  the Group Bourdon player (phone mock, wide layout extrapolated)
/design/atavt            2b  a flashed scene, then recall
/design/wafv             3a  vigilance
/design/two-hand         3b  co-ordination
/design/sje              3c  rate each response 1–5
/design/mmi              3d  question bank + STAR frames

assets/design.css        the mockups' design system
assets/design.js         header, tab bar, and the selection behaviour
```

## What these are not

They are **UI and navigation with the state the mockup draws**. Scores, clocks,
tallies and question counts are the mock's numbers, not live ones. No scoring,
no timing, no question generation, nothing saved. `simulators.html` still owns
all of that and is untouched.

Buttons for tests with no mockup screen — Tea-Occ, TRP1b, TRP2, DFFT, VSE,
M7-SJT — are inert `<button>`s rather than links. Those screens were never
designed.

## The decision this is waiting on

These screens are a **different design system from the live site**, not a
variation on it:

| | live site | these screens |
|---|---|---|
| ground | `--desk:#0F151B`, dark | `#f6f7f8`, light |
| accent | `--amber:#E0A11B` | `--green:#0b6e4f` |
| type | system sans | Archivo / Public Sans / IBM Plex Mono |
| test list | hairline rows, stage toggle | card grids, both stages on one page |
| shell | 760px | 900–1200px |

Adopting them means re-skinning `simulators.html`, `index.html`, `/pricing` and
21 guides, or living with two visual identities. That is a product call, which
is why this is a parallel route rather than an edit to the app.

## Before any of this ships

- **The fonts are loaded from Google Fonts.** The app is offline-first and
  installed to home screens; an external stylesheet on the critical path is a
  regression. Self-host the three families first.
- `/resources` already exists with 21 real guides and a tier system. `4a` is a
  different design for the same page — reconcile them rather than running both.
- The Group Bourdon squares are the mock's braille placeholders. The live app
  draws real dot groups on a canvas, and how many fit on a line is part of the
  paper.
- `sw.js` does not precache anything here, so its `CACHE` constant did not need
  bumping. It will if these ever become the app.

## Where these depart from the mockups

Three places, all deliberate:

1. **The header from 2a is carried onto scores, day mode, resources, paper pack
   and MMI.** The mocks draw those as bare cards with no way out of them.
2. **The phone tab bar has four tabs, not 3g's three.** Guides is the fourth:
   the header link to it does not survive a 390px screen, and an unreachable
   page is worse than a tab the mock did not draw.
3. **The stage headings become mono eyebrows at phone width** rather than
   carrying 3g's separate wording, so there is one string per heading.

## Looking at them

```bash
node serve.js     # http://localhost:8000/design
```
