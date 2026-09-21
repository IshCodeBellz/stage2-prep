/* Shared chrome and behaviour for the mockup screens.

   These are design screens: the state they hold is the state the mockup
   draws, and nothing is saved. The real scoring, timing and question
   generation all still live in simulators.html and are not touched here.

   Everything below is driven off data attributes so the pages stay readable
   as HTML. No build step, no dependencies — same rules as the rest of the
   site. */
(function () {
  "use strict";

  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };

  /* ---------------------------------------------------------------- chrome
     The mock only draws the header on the home screen (2a). It is carried
     onto the other non-player screens so they are reachable, and mirrored by
     the three-tab bar from the phone mock (3g) at narrow widths.

     Players (ATAVT, WAFV, 2-Hand, SJE, Group Bourdon) draw their own dark bar
     instead and opt out with data-nav="none".

     3g draws three tabs. Guides is the fourth because the header link to it
     does not survive a 390px screen, and a page you cannot reach is worse
     than a tab the mock did not draw. */
  var TABS = [
    { href: "/design", label: "Tests", key: "tests" },
    { href: "/design/day", label: "Day mode", key: "day" },
    { href: "/design/scores", label: "Scores", key: "scores" },
    { href: "/design/resources", label: "Guides", key: "resources" }
  ];

  function chrome() {
    var here = document.body.getAttribute("data-nav");
    if (!here || here === "none") return;

    var head = document.createElement("header");
    head.className = "night sitehead";
    head.innerHTML =
      '<a class="brand" href="/design"><span class="mark">S2</span>' +
      '<span>Stage 2 Test Simulators</span></a>' +
      '<nav class="sitenav">' +
      '<span class="offline">● Works offline</span>' +
      '<a class="keep" href="/design/resources"' +
      (here === "resources" ? ' aria-current="page"' : "") +
      ">Resources</a>" +
      '<a class="pill' + (here === "day" ? " here" : "") + '" href="/design/day">Day mode</a>' +
      '<a class="pill' + (here === "scores" ? " here" : "") + '" href="/design/scores">My scores</a>' +
      "</nav>";
    document.body.insertBefore(head, document.body.firstChild);

    var bar = document.createElement("nav");
    bar.className = "tabbar";
    bar.setAttribute("aria-label", "Sections");
    bar.innerHTML = TABS.map(function (t) {
      return (
        '<a href="' + t.href + '"' +
        (t.key === here ? ' aria-current="page"' : "") +
        ">" + esc(t.label) + "</a>"
      );
    }).join("");
    document.body.appendChild(bar);
  }

  /* ------------------------------------------------------------ selection
     Three shapes, all keyboard-operable because they are real buttons:

       data-pick="multi"   independent toggles   (ATAVT objects, GB squares)
       data-pick="single"  one of a set          (an SJE row, a filter row)
       data-pick="current" one of a set, marked with aria-current (MMI bank)

     A "single" group can be cleared by pressing the selected item again,
     which is how the rating rows in 3c behave — you can change your mind
     before moving on. */
  function pickable(group) {
    return Array.prototype.filter.call(
      group.querySelectorAll("button,[role=button]"),
      function (b) { return b.closest("[data-pick]") === group; }
    );
  }

  function selection(group) {
    var mode = group.getAttribute("data-pick");
    var attr = mode === "current" ? "aria-current" : "aria-pressed";
    var on = mode === "current" ? "true" : "true";

    pickable(group).forEach(function (btn) {
      if (!btn.hasAttribute(attr)) btn.setAttribute(attr, "false");

      btn.addEventListener("click", function () {
        var was = btn.getAttribute(attr) === on;

        if (mode !== "multi") {
          pickable(group).forEach(function (b) { b.setAttribute(attr, "false"); });
        }
        btn.setAttribute(attr, mode === "multi" ? (was ? "false" : "true") : (was && mode === "single" ? "false" : "true"));

        group.dispatchEvent(new CustomEvent("picked", {
          bubbles: true,
          detail: { button: btn, on: btn.getAttribute(attr) === on }
        }));
      });
    });
  }

  /* -------------------------------------------------------------- switches
     The "Answers: printed" toggle on the paper pack (3e). */
  function switches() {
    document.querySelectorAll(".switch").forEach(function (sw) {
      if (!sw.hasAttribute("aria-checked")) sw.setAttribute("aria-checked", "false");
      sw.setAttribute("role", "switch");
      sw.addEventListener("click", function () {
        sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") === "true" ? "false" : "true");
      });
    });
  }

  /* ------------------------------------------------------- resource filter
     Cards carry data-stage; the filter row carries data-filter. "all" shows
     everything, and the downloads block is shown only under All or Downloads
     because that is where the mock puts it. */
  function filters() {
    var row = document.querySelector("[data-filter]");
    if (!row) return;
    var cards = document.querySelectorAll("[data-stage]");
    var dl = document.querySelector("[data-downloads]");

    row.addEventListener("picked", function (e) {
      var want = e.detail.button.getAttribute("data-value");
      cards.forEach(function (c) {
        var tags = (c.getAttribute("data-stage") || "").split(/\s+/);
        c.hidden = want !== "all" && tags.indexOf(want) < 0;
      });
      if (dl) dl.hidden = want !== "all" && want !== "downloads";
    });
  }

  /* ------------------------------------------------------------ MMI bank
     Picking a question in the bank swaps the heading, the group eyebrow and
     the four STAR prompts. The prompts live on the button as JSON so the
     page is still one readable file. */
  function bank() {
    var list = document.querySelector("[data-bank]");
    if (!list) return;
    var pane = document.querySelector("[data-rehearse]");
    if (!pane) return;

    var eyebrow = pane.querySelector(".eyebrow");
    var title = pane.querySelector("h1");
    var parts = pane.querySelectorAll(".star-part p");

    list.addEventListener("picked", function (e) {
      var btn = e.detail.button;
      var star;
      try { star = JSON.parse(btn.getAttribute("data-star") || "[]"); }
      catch (err) { star = []; }

      eyebrow.textContent = "REHEARSING · " + (btn.getAttribute("data-group") || "");
      title.textContent = btn.textContent.trim();
      parts.forEach(function (p, i) {
        p.textContent = star[i] || "Your own words here — one or two sentences.";
      });
    });
  }

  /* --------------------------------------------------------------- counts
     The ATAVT and Group Bourdon screens show a live count of what you have
     ticked, so the number under the sheet is not a picture of a number. */
  function counters() {
    document.querySelectorAll("[data-count-of]").forEach(function (out) {
      var group = document.querySelector(out.getAttribute("data-count-of"));
      if (!group) return;
      var tick = function () {
        out.textContent = group.querySelectorAll('[aria-pressed="true"]').length;
      };
      group.addEventListener("picked", tick);
      tick();
    });
  }

  /* The site's own icon, rather than a 404 on every page for /favicon.ico. */
  function icon() {
    if (document.querySelector('link[rel="icon"]')) return;
    var l = document.createElement("link");
    l.rel = "icon";
    l.href = "/icon-512.png";
    document.head.appendChild(l);
  }

  function start() {
    icon();
    chrome();
    document.querySelectorAll("[data-pick]").forEach(selection);
    switches();
    filters();
    bank();
    counters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
