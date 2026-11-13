/**
 * WoDX Sheets 0.10.0: the Body tab (B1209). No Foundry calls here.
 *
 * Shows the body plan from WoDX Combat (body-rules.js bodyOf): the shape the character is in now and why, the parts as
 * a tree with what each hand holds and the natural weapons, parts added or lost, what the body can do (hold, wear
 * armor, speak, move), where blows land, and the lasting changes from WoDX Storyteller. The Storyteller also gets
 * controls to set the shape by hand and to add a lasting change.
 *
 * 0.16.0: the damage doll at the top (B2690): opts.doll = {spec (doll-draw specOf), wounds: [{label, text}], gm}. The
 * canvas is drawn by extras.mjs once the tab is on the page.
 */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));

const MOVE_LABEL = {fly: "flies", swimfast: "swims fast", waterbreath: "breathes water", wallwalk: "walks on walls", meld: "sinks into the earth"};

/**
 * body: from bodyOf. opts: {held: {partId: itemName}, changes: [{what, part, shows}], shapes: {key: label},
 * shapeFlag, gm, hitTable: [{label, chance}], outline: [{id, label, depth, added, lost, stops, holds, weapon}], doll}.
 */
export function dollHtml(doll) {
  if ( !doll?.spec ) return "";
  const rows = (doll.wounds ?? []).map(w => `<li><b>${esc(w.label)}</b> ${esc(w.text)}</li>`).join("");
  return `<div class="wodx-doll-wrap">
    <canvas class="wodx-doll" width="64" height="80" data-spec="${esc(JSON.stringify(doll.spec))}" role="img" aria-label="${esc(doll.wounds?.length ? `Wounds: ${doll.wounds.map(w => `${w.label} ${w.text}`).join("; ")}` : "Unhurt")}"></canvas>
    <div class="wodx-doll-side">
      <p class="wodx-doll-tip">${doll.gm ? "Point at a part to name it. Click a part to place or clear a wound." : "Point at a part to name it."}</p>
      ${rows ? `<ul class="wodx-doll-wounds">${rows}</ul>` : `<p class="wodx-hint">Unhurt.</p>`}
      <p class="wodx-doll-key"><span class="k b"></span>bashing <span class="k l"></span>lethal <span class="k a"></span>aggravated <span class="k x"></span>lost</p>
    </div>
  </div>`;
}

export function bodyHtml(body, opts = {}) {
  if ( !body ) return `<div class="wodx-body"><p class="wodx-hint">The body plan needs WoDX Combat 3.13.0 or later.</p></div>`;
  const o = opts.outline ?? [];
  const yes = (b, t, f) => `<li class="${b ? "ok" : "no"}">${esc(b ? t : f)}</li>`;
  const moves = Object.entries(body.moves ?? {}).filter(([, v]) => v).map(([k]) => MOVE_LABEL[k]).filter(Boolean);
  const walk = body.mobility === 0 ? "cannot walk: crawls" : body.mobility < 1 ? "walks at half speed" : null;
  const rows = o.map(p => `<li class="wodx-body-part${p.lost ? " lost" : ""}${p.added ? " added" : ""}" style="margin-left:${p.depth * 1.1}em" data-part="${esc(p.id)}">
      <span class="wodx-body-name">${esc(p.label)}</span>${p.added ? ` <span class="wodx-tag">added</span>` : ""}${p.lost ? ` <span class="wodx-tag bad">lost</span> <small>${esc(p.stops)}</small>` : ""}
      ${p.holds && opts.held?.[p.id] ? ` <small>holds ${esc(opts.held[p.id])}</small>` : ""}${p.weapon ? ` <small class="wodx-body-weapon">${esc(p.weapon)}</small>` : ""}</li>`).join("");
  const hits = (opts.hitTable ?? []).map(h => `<li>${esc(h.label)} <small>${h.chance}%</small></li>`).join("");
  const changes = (opts.changes ?? []).map(c => `<li>${esc(c.what)}${c.shows ? "" : " <small>(hidden)</small>"}</li>`).join("");
  const shapeSel = opts.gm ? `<div class="form-group"><label>Shape</label><select class="wodx-body-shape" data-fixed>
      <option value="">From the sheet and powers</option>${Object.entries(opts.shapes ?? {}).map(([k, v]) => `<option value="${esc(k)}"${k === opts.shapeFlag ? " selected" : ""}>${esc(v)}</option>`).join("")}</select></div>` : "";
  return `<div class="wodx-body">
    <h3>Shape: ${esc(body.label)}${body.why && body.why !== "form" ? ` <small>(${esc(body.why)})</small>` : ""}</h3>
    ${dollHtml(opts.doll)}
    ${shapeSel}
    ${body.notes?.length ? `<ul class="wodx-body-notes">${body.notes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
    <div class="wodx-body-cols">
      <div><h4>Parts</h4>${rows ? `<ul class="wodx-body-tree">${rows}</ul>` : `<p class="wodx-hint">${body.intangible ? "A body of mist: no parts to hold, wear or strike." : body.hidden ? "Sunk in the earth: nothing to strike." : "No parts."}</p>`}</div>
      <div><h4>Can</h4><ul class="wodx-body-can">
        ${yes(body.holds, `hold things (${body.hands} hand${body.hands === 1 ? "" : "s"})`, "hold nothing")}
        ${body.carries && !body.armor ? `<li class="no">wears nothing as such: clothes and armor go along and come back with the change (no soak from armor)</li>` : yes(body.armor, "wear armor and clothes", "wear no armor (it comes off)")}
        ${yes(body.speaks, body.speakHard ? "speak, with effort" : "speak", "not speak")}
        ${moves.map(m => `<li class="ok">${esc(m)}</li>`).join("")}${walk ? `<li class="no">${esc(walk)}</li>` : ""}
      </ul>
      ${hits ? `<h4>Where blows land</h4><ul class="wodx-body-hits">${hits}</ul>` : ""}</div>
    </div>
    <h4>Lasting changes</h4>${changes ? `<ul class="wodx-body-changes">${changes}</ul>` : `<p class="wodx-hint">None.</p>`}
    ${opts.gm ? `<button type="button" class="wodx-body-add">Add a lasting change</button>` : ""}
  </div>`;
}
