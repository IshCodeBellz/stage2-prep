/* Shared chrome for every marketing and resource page.
   The header and footer are injected rather than copied into twenty-odd files;
   the page content itself is static HTML so it still reads without JavaScript. */

window.SITE = {
  name: "Cab Ready",
  tagline: "Train driver assessment practice that behaves like the real thing.",
  app: "/simulators"
};

(function () {
  "use strict";

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
  const here = location.pathname.replace(/\/index\.html$/, "/").replace(/\.html$/, "");

  const NAV = [
    { href: "/resources", label: "Resources" },
    { href: "/pricing",   label: "Pricing" },
    { href: "/simulators", label: "Open the simulators", cta: true }
  ];

  function active(href) {
    if (href === "/") return here === "/" || here === "";
    return here === href || here.indexOf(href + "/") === 0;
  }

  function header() {
    const links = NAV.map(n =>
      `<a href="${n.href}"${n.cta ? ' class="cta"' : active(n.href) ? ' class="here"' : ""}>${esc(n.label)}</a>`
    ).join("");
    const h = document.createElement("header");
    h.className = "nav";
    h.innerHTML =
      `<div class="wrap">
         <a class="brand" href="/"><span class="lamp"></span>${esc(window.SITE.name)}</a>
         <button class="burger" aria-expanded="false" aria-controls="navlinks">Menu</button>
         <nav id="navlinks">${links}</nav>
       </div>`;
    const btn = h.querySelector(".burger"), nav = h.querySelector("nav");
    btn.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
    document.body.insertBefore(h, document.body.firstChild);
  }

  function footer() {
    const guides = (window.RESOURCES || []).slice(0, 5)
      .map(r => `<li><a href="/resources/${r.slug}">${esc(r.title)}</a></li>`).join("");
    const f = document.createElement("footer");
    f.className = "foot";
    f.innerHTML =
      `<div class="wrap">
        <div class="cols">
          <div>
            <h4>${esc(window.SITE.name)}</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/simulators">Simulators</a></li>
              <li><a href="/resources">Resource library</a></li>
              <li><a href="/pricing">Pricing</a></li>
            </ul>
          </div>
          <div>
            <h4>Start here</h4>
            <ul>${guides}</ul>
          </div>
          <div>
            <h4>Honest small print</h4>
            <ul>
              <li><a href="/resources/sources">Where this comes from</a></li>
              <li><a href="/resources/test-variants">Which tests you will sit</a></li>
              <li><a href="/pricing#refund">Refunds</a></li>
            </ul>
          </div>
        </div>
        <div class="rule">
          <p class="small">
            Independent practice material. ${esc(window.SITE.name)} is not affiliated with, endorsed by or
            connected to the Occupational Psychology Centre, Schuhfried GmbH, any train operating company
            or any awarding body. Test names are used only to describe which skill each exercise drills.
            The exercises here are original work built to the published description of each test —
            they are not the tests themselves, and no licensed material is reproduced.
          </p>
          <p class="small">Practice sharpens the skill. It cannot buy the result. Use these alongside
            whatever material your operator sends you, not instead of it.</p>
          <p class="small">&copy; <span id="yr"></span> ${esc(window.SITE.name)}.</p>
        </div>
      </div>`;
    document.body.appendChild(f);
    const yr = f.querySelector("#yr");
    if (yr) yr.textContent = new Date().getFullYear();
  }

  /* A resource card, shared by the library and the landing page. */
  window.Site = {
    card(r) {
      return `<a class="card" href="/resources/${r.slug}" data-tier="${r.tier}">
        <div class="cardmeta"><span class="tag ${r.tier}">${r.tier}</span>
          <span class="tag stage">${esc(r.stage)}</span></div>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.dek)}</p>
        <div class="cardmeta"><span>${r.minutes} min read</span></div>
      </a>`;
    },
    esc: esc
  };

  /* Inside a guide: where it sits in the reading order. */
  function prevNext() {
    const art = document.querySelector(".doc[data-slug]");
    if (!art || !window.RESOURCES) return;
    const list = window.RESOURCES;
    const i = list.findIndex(r => r.slug === art.dataset.slug);
    if (i < 0) return;
    const prev = list[i - 1], next = list[i + 1];
    const box = document.createElement("div");
    box.className = "nextprev";
    box.innerHTML =
      (prev ? `<a href="/resources/${prev.slug}"><span>Previous</span><b>${esc(prev.title)}</b></a>` : "") +
      (next ? `<a href="/resources/${next.slug}"><span>Next</span><b>${esc(next.title)}</b></a>` : "") +
      `<a href="/resources"><span>Library</span><b>All ${list.length} guides</b></a>`;
    art.appendChild(box);
  }

  header();
  prevNext();
  footer();
})();
