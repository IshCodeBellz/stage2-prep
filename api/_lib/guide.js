/* Trimming a guide to its free preview, on the server.

   The same cut tiers.js makes in the browser — everything before the first <h2>,
   or before the element marked data-preview-end — plus that heading and the one
   element after it, which the browser fades out as the teaser. What is past that
   never leaves the server. The article gets data-trimmed, which tells tiers.js
   to put the upgrade panel underneath whatever the visitor's cookie says.

   The guides are hand-written with every section a direct child of the article,
   so this works on the text rather than a parsed tree. */

export function guideTier(html) {
  const m = /<article\b[^>]*\bdata-tier="([a-z]+)"/.exec(html);
  return m ? m[1] : "standard";
}

/* The index just past the element that starts at `from`: its closing tag, or the
   end of the tag itself for one that does not close. */
function endOf(html, from) {
  const m = /^<([a-zA-Z0-9]+)/.exec(html.slice(from));
  if (!m) return from;
  const close = html.indexOf("</" + m[1] + ">", from);
  return close < 0 ? html.indexOf(">", from) + 1 : close + m[1].length + 3;
}

const nextElement = (html, from, stop) => {
  const i = html.indexOf("<", from);
  return i < 0 || i >= stop || html[i + 1] === "/" ? -1 : i;
};

export function trimGuide(html) {
  const open = html.search(/<article\b/);
  const shut = html.lastIndexOf("</article>");
  if (open < 0 || shut < 0) return html;
  const startBody = html.indexOf(">", open) + 1;

  let cut = -1;
  const marked = html.slice(startBody, shut).search(/<[a-zA-Z0-9]+\b[^>]*\bdata-preview-end\b/);
  if (marked >= 0) cut = startBody + marked;
  else {
    const h2 = html.slice(startBody, shut).search(/<h2\b/);
    if (h2 >= 0) cut = startBody + h2;
  }
  if (cut < 0) cut = shut;               // nothing to hold back but the gate still goes on

  // the teaser: the element at the cut and the one after it
  let keep = cut;
  if (cut < shut) {
    keep = endOf(html, cut);
    const after = nextElement(html, keep, shut);
    if (after >= 0) keep = endOf(html, after);
  }

  const tag = html.slice(open, startBody).replace(/>$/, " data-trimmed>");
  return html.slice(0, open) + tag + html.slice(startBody, keep) + "\n</article>" + html.slice(shut + "</article>".length);
}
