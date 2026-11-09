/**
 * Printable props (WoDX Atmosphere 0.9.0), the pure rules. A handout or any journal, and a scene's night map, as a
 * print-ready page: the browser's print window then saves it as a PDF or sends it to the printer. The era's handout
 * styles come from the module's own stylesheet; the screen's shadows and dark frames are left off. No Foundry here.
 */

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** The page CSS for print: margins, no shadows, each journal page on a new sheet, colours kept. */
export const PRINT_CSS = `@page { margin: 14mm; }
html, body { background: #fff; color: #111; margin: 0; }
body { font-family: "Signika", Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.wodx-print-page { break-after: page; page-break-after: always; }
.wodx-print-page:last-child { break-after: auto; page-break-after: auto; }
.wodx-print-page > h1 { font-size: 1.1em; opacity: 0.6; margin: 0 0 0.6em; }
.wodx-handout { box-shadow: none !important; max-width: none; }
img { max-width: 100%; }
.wodx-print-map { text-align: center; }
.wodx-print-map img { max-width: 100%; max-height: 92vh; object-fit: contain; }
.wodx-print-map p { margin: 0.4em 0 0; font-size: 0.9em; }
@media screen { body { padding: 1em; } }`;

/** Is the picture wider than tall? Then the map prints across the sheet. */
export const landscape = (w, h) => Number(w) > Number(h);

function doc({title, body, base = "", styles = [], orient = null, fonts = ""}) {
  const links = styles.map(href => `<link rel="stylesheet" href="${esc(href)}">`).join("") + (fonts ? `<style>${String(fonts).replace(/<\/style/gi, "")}</style>` : "");
  const page = orient ? `<style>@page { size: ${orient}; }</style>` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${base ? `<base href="${esc(base)}">` : ""}<title>${esc(title)}</title>${links}<style>${PRINT_CSS}</style>${page}</head><body>${body}</body></html>`;
}

/**
 * A journal as a printable document. `pages` are {name, type, html, src}: text pages bring their HTML (already
 * enriched by Foundry), image pages a src. The journal's name heads each page only when it differs from the page's
 * own name and the page is not a handout (a handout carries its own title).
 */
export function journalDoc({title = "", pages = [], base = "", styles = [], fonts = ""} = {}) {
  const body = pages.filter(p => p && (p.html || p.src)).map(p => {
    const handout = /class="wodx-handout/.test(p.html ?? "");
    const head = !handout && p.name && p.name !== title ? `<h1>${esc(p.name)}</h1>` : "";
    const inner = p.type === "image" ? `<div class="wodx-print-map"><img src="${esc(p.src)}" alt="${esc(p.name ?? "")}"></div>` : (p.html ?? "");
    return `<section class="wodx-print-page">${head}${inner}</section>`;
  }).join("") || `<section class="wodx-print-page"><p>${esc(title)}: nothing to print.</p></section>`;
  return doc({title, body, base, styles, fonts});
}

/** A scene's map as a printable document: the picture as drawn, fitted to the sheet, with its name under it. */
export function mapDoc({title = "", src = "", width = 0, height = 0, caption = "", base = ""} = {}) {
  const body = src ? `<section class="wodx-print-page wodx-print-map"><img src="${esc(src)}" alt="${esc(title)}"><p>${esc(caption || title)}</p></section>`
    : `<section class="wodx-print-page"><p>${esc(title)} has no map picture to print.</p></section>`;
  return doc({title, body, base, orient: landscape(width, height) ? "landscape" : "portrait"});
}

/** A font rule's url()s made absolute against the stylesheet it came from, so the print page finds the files. */
export function absoluteUrls(cssText, sheetHref) {
  return String(cssText ?? "").replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/g, (m, q, u) => {
    if ( /^(data:|https?:|blob:)/i.test(u) || !sheetHref ) return m;
    try { return `url("${new URL(u, sheetHref).href}")`; } catch { return m; }
  });
}
