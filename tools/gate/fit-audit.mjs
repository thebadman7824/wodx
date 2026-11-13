/**
 * Layout checks shared by the UI fit tool (tools/harness/ui-fit.mjs) and the in-Foundry gate (gateuifit.mjs).
 * audit(app) runs in the page on one drawn window and returns a list of {kind, msg, el}:
 *   cut    a control an ancestor hides, with no way to scroll to it
 *   clip   words that do not fit their own box (a title, a label, the chosen entry of a pick)
 *   crowd  two controls drawn over each other
 *   over   words drawn over other words
 *   shade  a field or button darker or lighter than the others of its kind in the window
 *   dim    words too close to the shade behind them to read
 * It must stay self-contained: the tool passes its source text to the browser.
 */
export function audit(app) {
  const out = [];
  const say = (kind, el, msg) => out.push({kind, msg, el: (el.outerHTML || "").replace(/\s+/g, " ").slice(0, 110)});
  // Inside a closed <details> (not its summary) nothing is drawn, though newer browsers still give it a box
  const folded = el => { const d = el.closest("details:not([open])"); return !!d && app.contains(d) && !el.closest("summary")?.parentElement?.isSameNode(d); };
  const vis = el => { if (!el.getClientRects().length || folded(el)) return false; const s = getComputedStyle(el); return s.visibility !== "hidden" && Number(s.opacity) > 0.05; };
  const ar = app.getBoundingClientRect();
  const clipBox = el => { // the box an element is cut to, by ancestors that hide or scroll their overflow
    let box = {l: ar.left, t: ar.top, r: ar.right, b: ar.bottom}, scrollY = false, scrollX = false;
    for (let p = el.parentElement; p && app.contains(p); p = p.parentElement) {
      const s = getComputedStyle(p); if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const r = p.getBoundingClientRect();
      const sx = /auto|scroll/.test(s.overflowX) && p.scrollWidth > p.clientWidth, sy = /auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight;
      if (s.overflowX !== "visible" && !sx) { box.l = Math.max(box.l, r.left); box.r = Math.min(box.r, r.right); } else if (sx) scrollX = true;
      if (s.overflowY !== "visible" && !sy) { box.t = Math.max(box.t, r.top); box.b = Math.min(box.b, r.bottom); } else if (sy) scrollY = true;
    }
    return {box, scrollX, scrollY};
  };
  const seen = el => { // the part of an element on show now: cut to every ancestor that hides or scrolls its overflow
    const r = el.getBoundingClientRect(); let l = r.left, t = r.top, rr = r.right, b = r.bottom;
    for (let p = el.parentElement; p && app.contains(p); p = p.parentElement) { const s = getComputedStyle(p); if (s.overflowX === "visible" && s.overflowY === "visible") continue;
      const q = p.getBoundingClientRect(); l = Math.max(l, q.left); t = Math.max(t, q.top); rr = Math.min(rr, q.right); b = Math.min(b, q.bottom); }
    return {left: l, top: t, right: rr, bottom: b, width: Math.max(0, rr - l), height: Math.max(0, b - t)};
  };
  const onTop = (el, r) => { const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !hit || hit === el || el.contains(hit) || hit.contains(el); };
  const controls = [...app.querySelectorAll("input:not([type=hidden]), select, textarea, button, a[data-action], [data-action]:not(form), .wodx-btn, .item-control, nav [data-tab], .tabs [data-tab], .sheet-tabs [data-tab]")].filter(vis);
  // 1. Cut off: a control or its text that an ancestor hides with no way to scroll to it
  for (const c of controls) {
    const r = c.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const {box, scrollX, scrollY} = clipBox(c);
    const cutX = !scrollX && (r.right > box.r + 2 || r.left < box.l - 2), cutY = !scrollY && (r.bottom > box.b + 2 || r.top < box.t - 2);
    if (cutX || cutY) say("cut", c, `control is cut off ${cutX ? "sideways" : "top or bottom"} (${Math.round(r.left - ar.left)},${Math.round(r.top - ar.top)} ${Math.round(r.width)}x${Math.round(r.height)})`);
  }
  // 2. Text that does not fit its own box and is clipped (labels, buttons, picks)
  for (const e of app.querySelectorAll("label, button, th, td, summary, h1, h2, h3, h4, a, span, div, li, select")) {
    if (!vis(e)) continue;
    const own = e.tagName === "SELECT" || [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!own) continue;
    const s = getComputedStyle(e);
    if (e.tagName === "SELECT") { const o = e.selectedOptions[0]; if (!o) continue; const cv = document.createElement("canvas").getContext("2d"); cv.font = s.font; const w = cv.measureText(o.textContent.trim()).width;
      const row = e.parentElement.clientWidth; if ((e.offsetWidth >= row * 0.85 && row > 250) || e.clientWidth >= 400) continue; // already as wide as its row: nothing more the layout can give
      if (e.closest("td") && e.clientWidth - 18 >= 110) continue; // a pick in a table column shows a fair part of a long name
      if (w > e.clientWidth - 18 && e.clientWidth > 0) say("clip", e, `the chosen entry "${o.textContent.trim().slice(0, 30)}" needs ${Math.round(w)}px, the box gives ${e.clientWidth - 18}`); continue; }
    if (s.overflowX === "visible" && s.overflowY === "visible") continue;
    if (s.textOverflow === "ellipsis" && e.title) continue; // a deliberate ellipsis with the full text on hover
    if (e.matches(".window-title") && e.clientWidth >= Math.min(120, e.scrollWidth * 0.4)) continue; // a long title may end in an ellipsis, but must not vanish
    if (e.scrollWidth > e.clientWidth + 2 && !/auto|scroll/.test(s.overflowX)) say("clip", e, `text is ${e.scrollWidth}px wide in a ${e.clientWidth}px box`);
    else if (e.scrollHeight > e.clientHeight + 3 && !/auto|scroll/.test(s.overflowY) && e.clientHeight > 0) say("clip", e, `text is ${e.scrollHeight}px tall in a ${e.clientHeight}px box`);
  }
  // 3. Crowded: two controls drawn over each other
  const rects = controls.filter(c => !c.closest("svg")).map(c => [c, seen(c)]).filter(([c, r]) => r.width > 3 && r.height > 3 && onTop(c, r));
  let crowd = 0;
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const [a, x] = rects[i], [b, y] = rects[j]; if (a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(x.right, y.right) - Math.max(x.left, y.left), oy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
    if (ox > 3 && oy > 3) { if (a.closest("label")?.contains(b) || b.closest("label")?.contains(a)) continue;
      if (crowd++ < 6) say("crowd", a, `overlaps ${(b.outerHTML || "").replace(/\s+/g, " ").slice(0, 70)} by ${Math.round(ox)}x${Math.round(oy)}`); }
  }
  // 4. Uneven shade: a control or panel darker or lighter than the others of its kind on this sheet
  const parse = c => { const m = c.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0, 0]; return [m[0], m[1], m[2], m[3] ?? 1]; };
  const shade = el => { let stack = []; for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const s = getComputedStyle(p); const c = parse(s.backgroundColor); stack.push([c, s.backgroundImage !== "none"]); if (c[3] >= 1) break; if (p === app) break; }
    let base = [48, 48, 48]; for (const [c] of stack.reverse()) base = base.map((u, k) => c[k] * c[3] + u * (1 - c[3])); return 0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2]; };
  const kinds = {};
  for (const c of controls) { const t = c.tagName === "INPUT" ? `input[${c.type}]` : c.tagName.toLowerCase(); if (!/^(input\[(text|number|search)\]|select|textarea|button)$/.test(t)) continue; if (t === "button" && (c.textContent.trim().length < 2 || c.matches(".active, .selected, [aria-pressed=true], .fullSplatColor, [type=submit], .default, .bright, [autofocus]"))) continue; (kinds[t] ??= []).push([c, shade(c)]); }
  for (const [t, list] of Object.entries(kinds)) { if (list.length < 3) continue; const sorted = list.map(l => l[1]).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    let n = 0; for (const [c, v] of list) if (Math.abs(v - med) > 28 && n++ < 4) say("shade", c, `${t} shade ${Math.round(v)} against ${Math.round(med)} for the others on this sheet`); }
  // 6. Words drawn over other words (headings of a list squeezed into columns too narrow for them)
  const words = [];
  for (const e of app.querySelectorAll("div, span, label, th, td, a, b, small, li, h3, h4")) {
    if (!vis(e)) continue; const tn = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1); if (!tn.length) continue;
    if (e.closest("svg, option")) continue;
    const rg = document.createRange(); rg.selectNodeContents(tn[0]); const v = seen(e);
    for (const q of rg.getClientRects()) { // line by line: words that wrap are not one big box
      const r = {left: Math.max(q.left, v.left), top: Math.max(q.top, v.top), right: Math.min(q.right, v.right), bottom: Math.min(q.bottom, v.bottom)};
      if (r.right - r.left < 4 || r.bottom - r.top < 4 || !onTop(e, r)) continue;
      words.push([e, r, tn[0].textContent.trim()]);
    }
  }
  let over = 0;
  for (let i = 0; i < words.length; i++) for (let j = i + 1; j < words.length; j++) {
    const [a, x, ta] = words[i], [b, y, tb] = words[j]; if (a === b || a.contains(b) || b.contains(a)) continue;
    const ox = Math.min(x.right, y.right) - Math.max(x.left, y.left), oy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
    if (ox > 3 && oy > 5 && over++ < 8) say("over", a, `"${ta.slice(0, 24)}" runs into "${tb.slice(0, 24)}" by ${Math.round(ox)}px`);
  }
  // 5. Hard to read: a button, link or pick whose words are close to the shade behind them
  const rgbOf = el => { let stack = []; for (let p = el; p && p !== document.documentElement; p = p.parentElement) { const c = parse(getComputedStyle(p).backgroundColor); stack.push(c); if (c[3] >= 1) break; }
    const wc = app.querySelector(".window-content"); let base = wc ? parse(getComputedStyle(wc).backgroundColor).slice(0, 3) : [48, 48, 48]; if (wc && parse(getComputedStyle(wc).backgroundColor)[3] < 0.5) base = [48, 48, 48];
    for (const c of stack.reverse()) base = base.map((u, k) => c[k] * c[3] + u * (1 - c[3])); return base; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  let dim = 0;
  for (const c of app.querySelectorAll("button, select, a.wodx-btn, a.wodx-act, [data-action], input[type=text], input[type=number], input[type=search]")) {
    if (!vis(c) || c.disabled || (c.tagName === "INPUT" && !/^(text|number|search)$/.test(c.type))) continue; const txt = c.tagName === "INPUT" ? c.value : c.tagName === "SELECT" ? c.selectedOptions[0]?.textContent : [...c.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join("");
    if (!txt || txt.trim().length < 2) continue; const s = getComputedStyle(c); if (parseFloat(s.fontSize) < 2) continue;
    const fg = parse(s.color), bg = rgbOf(c), mix = fg.slice(0, 3).map((v, k) => v * fg[3] + bg[k] * (1 - fg[3]));
    const a = lum(mix), b = lum(bg), ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 2.6 && dim++ < 6) say("dim", c, `"${txt.trim().slice(0, 30)}" is hard to read: contrast ${ratio.toFixed(1)} to 1`);
  }
  // Tab buttons a module adds must carry the same tile colour as the sheet's own tab buttons
  for (const nav of app.querySelectorAll("nav.sheet-tabs")) {
    const own = nav.querySelector(".item:not(.wodx-tab-icon) svg path[fill]");
    if (!own) continue;
    const want = getComputedStyle(own).fill.replace(/\s+/g, "");
    for (const i of nav.querySelectorAll(".wodx-tab-icon")) {
      if (i.offsetParent === null) continue;
      const got = getComputedStyle(i).backgroundColor.replace(/\s+/g, "");
      if (got !== want) say("shade", i, `tab button tile ${got}, the sheet's own tab buttons ${want}`);
    }
  }
  return out;
}
