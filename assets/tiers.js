/* Access tiers.

   Three of them: standard, gold, platinum. Every guide in resources.js carries
   one, and that single field decides the badge on the card, the row in the
   pricing table and whether the body of the guide is shown.

   On the simulators the line is drawn by what is free, not how often — a
   count would live in this browser, and a private window resets it. Group
   Bourdon and the VSE are Standard whole. Every other drill in the battery is
   Gold, with a demo for Standard: one short paper, the same every time. Day
   mode and the paper pack are Gold; the enhanced VSE and the MMI, Platinum.

   Two switches, flipped together (the README has the steps): PAYWALL below for
   the browser, and PAYWALL=on in Vercel's environment for the server.

   While PAYWALL is false nothing is locked, and the tier is a preview control
   kept in localStorage: ?paywall=1&tier=standard on any URL, or the switch on
   the pricing page, shows what a visitor on that tier would get.

   Once it is true the tier comes from the account. The server sets it after a
   Stripe checkout or a sign-in link, in two cookies: cr_session, signed and out
   of reach of scripts, which is what the server believes, and cr_tier, the same
   tier in the clear, which is what this file reads. Paid guides are trimmed on
   the server before they are sent, so for them this file only draws the panel.
   The simulators run in the browser, so for them cr_tier is the gate — enough
   for anyone who does not go editing their cookies. */

(function () {
  "use strict";

  const PAYWALL = false;                 // ← the one switch. See note above.
  const ORDER = ["standard", "gold", "platinum"];
  const OLD = { starter: "standard" };  // names a stored tier or a link may still use
  const KEY_TIER = "cabready.tier";
  const KEY_WALL = "cabready.paywall";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const cookie = name => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  };

  // the preview controls only exist while the paywall is off
  const qs = new URLSearchParams(location.search);
  if (!PAYWALL && qs.has("tier")) store.set(KEY_TIER, qs.get("tier"));
  if (!PAYWALL && qs.has("paywall")) store.set(KEY_WALL, qs.get("paywall") === "1" ? "1" : "0");

  const Access = {
    tiers: ORDER,
    label: { standard: "Standard", gold: "Gold", platinum: "Platinum" },

    /* What the visitor currently has. Everyone is on standard until they buy. */
    tier() {
      const t = PAYWALL ? cookie("cr_tier") : store.get(KEY_TIER);
      return ORDER.indexOf(OLD[t] || t) > -1 ? (OLD[t] || t) : "standard";
    },
    setTier(t) {
      t = OLD[t] || t;
      if (!PAYWALL && ORDER.indexOf(t) > -1) store.set(KEY_TIER, t);
      return Access.tier();
    },

    /* signed in to an account — only once the paywall is on is there one */
    signedIn() { return PAYWALL && !!cookie("cr_tier"); },

    /* Locking is off until billing exists; ?paywall=1 previews it. */
    enforcing() {
      if (PAYWALL) return true;
      const override = store.get(KEY_WALL);
      if (override === "1") return true;
      if (override === "0") return false;
      return PAYWALL;
    },
    setEnforcing(on) { store.set(KEY_WALL, on ? "1" : "0"); },

    can(required) {
      if (!Access.enforcing()) return true;
      required = OLD[required] || required || "standard";
      return ORDER.indexOf(Access.tier()) >= ORDER.indexOf(required);
    },

    /* The cheapest tier that unlocks this guide. */
    upgradeTo(required) {
      return Access.label[required] || "Gold";
    }
  };

  window.Access = Access;

  /* Copy that is only true while nothing is locked ("everything is open") is
     marked .open-only, and copy for when it is, .paywall-only. */
  function markRoot() {
    document.documentElement.classList.toggle("paywall", Access.enforcing());
  }
  Access.markRoot = markRoot;

  function gateHTML(required) {
    const plan = Access.upgradeTo(required);
    return `<div class="gate">
      <span class="tag ${required}">${required}</span>
      <h3 style="margin-top:10px">The rest of this guide is ${plan}</h3>
      <p>Everything from here down — the method, the worked examples and the mistakes
         that cost people the sitting — comes with ${plan}. One payment, no subscription.</p>
      <div class="btnrow">
        <a class="btn go" href="/pricing">See what ${plan} includes</a>
        ${Access.signedIn() ? "" : '<a class="btn ghost" href="/account">Already bought? Sign in</a>'}
        <a class="btn ghost" href="/resources">Back to the free guides</a>
      </div>
    </div>`;
  }

  /* Trim a guide down to its free preview and put the gate under it. */
  function gateArticle() {
    const art = document.querySelector(".doc[data-tier]");
    if (!art) return;
    const required = art.dataset.tier;
    // data-trimmed: the server has already held the rest back
    if (Access.can(required) && !art.hasAttribute("data-trimmed")) return;

    // the prev/next block is navigation, not content — it survives the trim
    const nav = art.querySelector(".nextprev");
    if (nav) nav.remove();

    const kids = Array.from(art.children);
    let cut = kids.findIndex(n => n.hasAttribute("data-preview-end"));
    if (cut < 0) cut = kids.findIndex(n => n.tagName === "H2");
    if (cut < 1) cut = kids.length;

    // the first heading and the paragraph under it fade out, so it reads as
    // text disappearing rather than as a wall
    const teaser = kids.slice(cut, cut + 2);
    kids.slice(cut).forEach(n => n.remove());

    if (teaser.length) {
      const fade = document.createElement("div");
      fade.className = "fade";
      teaser.forEach(n => fade.appendChild(n));
      art.appendChild(fade);
    }
    art.insertAdjacentHTML("beforeend", gateHTML(required));
    if (nav) art.appendChild(nav);
    art.classList.add("locked");
  }

  /* Cards in the library get a lock instead of a read time when they are shut. */
  function markCards(root) {
    (root || document).querySelectorAll(".card[data-tier]").forEach(card => {
      const t = card.dataset.tier;
      card.classList.toggle("shut", !Access.can(t));
      const foot = card.querySelector(".cardmeta:last-child span");
      if (!foot) return;
      if (!Access.can(t)) {
        if (!foot.dataset.was) foot.dataset.was = foot.textContent;
        foot.textContent = "Locked — " + Access.label[t];
      } else if (foot.dataset.was) {
        foot.textContent = foot.dataset.was;
      }
    });
  }
  Access.markCards = markCards;

  /* The preview switch on the pricing page. Deliberately obvious that it is a
     preview and not a purchase. */
  function switcher() {
    const host = document.querySelector("#tierswitch");
    if (!host || PAYWALL) return;
    const draw = () => {
      const on = Access.enforcing(), t = Access.tier();
      host.className = "tierswitch";
      host.innerHTML =
        `<b>Preview the paywall</b>
         <span>Nothing is locked yet. Turn it on to see how each tier will read.</span>
         <button data-wall="${on ? 0 : 1}">${on ? "Locking: on" : "Locking: off"}</button>` +
        Access.tiers.map(x =>
          `<button data-tier="${x}" class="${t === x ? "on" : ""}">${Access.label[x]}</button>`).join("");
      host.querySelectorAll("button").forEach(b => {
        b.onclick = () => {
          if (b.dataset.tier) Access.setTier(b.dataset.tier);
          else Access.setEnforcing(b.dataset.wall === "1");
          draw(); markCards(); markRoot();
        };
      });
    };
    draw();
  }

  /* Sign in, or the account, in the header — once there are accounts to sign in to. */
  function accountLink() {
    const nav = document.querySelector("#navlinks");
    if (!PAYWALL || !nav || nav.querySelector(".acct")) return;
    const a = document.createElement("a");
    a.className = "acct";
    a.href = "/account";
    a.textContent = Access.signedIn() ? "Your account" : "Sign in";
    if (location.pathname === "/account") a.classList.add("here");
    nav.insertBefore(a, nav.querySelector(".cta"));
  }

  /* Once a day a signed-in visitor's tier is asked of the server again, which
     asks Stripe — how a refund, or a purchase on another device, reaches this one. */
  const KEY_CHECKED = "cabready.checked";
  function refresh() {
    if (!Access.signedIn()) return;
    if (Date.now() - Number(store.get(KEY_CHECKED) || 0) < 24 * 60 * 60 * 1000) return;
    store.set(KEY_CHECKED, String(Date.now()));
    fetch("/api/me", { credentials: "same-origin" }).catch(() => {});
  }

  markRoot();
  gateArticle();
  markCards();
  switcher();
  accountLink();
  refresh();
})();
