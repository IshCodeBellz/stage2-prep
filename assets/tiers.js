/* Access tiers.

   Three of them: starter, gold, platinum. Every guide in resources.js carries
   one, and that single field decides the badge on the card, the row in the
   pricing table and whether the body of the guide is shown.

   Nothing is charged for yet and nothing is locked yet: PAYWALL is false, so
   the whole library is open while the site is being built out. When billing is
   wired up, flip PAYWALL to true and the gate below starts doing its job — no
   guide needs editing. Until then you can see exactly what a visitor on a
   lower tier would get by adding ?paywall=1&tier=starter to any URL, which is
   what the preview switch on the pricing page does.

   The tier is kept in localStorage, which is a stand-in for an account. It is
   a preview control, not a security boundary — when this sells, entitlement
   has to be checked on the server and paid guides served from behind it. */

(function () {
  "use strict";

  const PAYWALL = false;                 // ← the one switch. See note above.
  const ORDER = ["starter", "gold", "platinum"];
  const KEY_TIER = "cabready.tier";
  const KEY_WALL = "cabready.paywall";

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const qs = new URLSearchParams(location.search);
  if (qs.has("tier")) store.set(KEY_TIER, qs.get("tier"));
  if (qs.has("paywall")) store.set(KEY_WALL, qs.get("paywall") === "1" ? "1" : "0");

  const Access = {
    tiers: ORDER,
    label: { starter: "Starter", gold: "Gold", platinum: "Platinum" },

    /* What the visitor currently has. Everyone is on starter until they buy. */
    tier() {
      const t = store.get(KEY_TIER);
      return ORDER.indexOf(t) > -1 ? t : "starter";
    },
    setTier(t) {
      if (ORDER.indexOf(t) > -1) store.set(KEY_TIER, t);
      return Access.tier();
    },

    /* Locking is off until billing exists; ?paywall=1 previews it. */
    enforcing() {
      const override = store.get(KEY_WALL);
      if (override === "1") return true;
      if (override === "0") return false;
      return PAYWALL;
    },
    setEnforcing(on) { store.set(KEY_WALL, on ? "1" : "0"); },

    can(required) {
      if (!Access.enforcing()) return true;
      return ORDER.indexOf(Access.tier()) >= ORDER.indexOf(required || "starter");
    },

    /* The cheapest tier that unlocks this guide. */
    upgradeTo(required) {
      return Access.label[required] || "Gold";
    }
  };

  window.Access = Access;

  function gateHTML(required) {
    const plan = Access.upgradeTo(required);
    return `<div class="gate">
      <span class="tag ${required}">${required}</span>
      <h3 style="margin-top:10px">The rest of this guide is ${plan}</h3>
      <p>Everything from here down — the method, the worked examples and the mistakes
         that cost people the sitting — comes with ${plan}. One payment, no subscription.</p>
      <div class="btnrow">
        <a class="btn go" href="/pricing">See what ${plan} includes</a>
        <a class="btn ghost" href="/resources">Back to the free guides</a>
      </div>
    </div>`;
  }

  /* Trim a guide down to its free preview and put the gate under it. */
  function gateArticle() {
    const art = document.querySelector(".doc[data-tier]");
    if (!art) return;
    const required = art.dataset.tier;
    if (Access.can(required)) return;

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
    if (!host) return;
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
          draw(); markCards();
        };
      });
    };
    draw();
  }

  gateArticle();
  markCards();
  switcher();
})();
