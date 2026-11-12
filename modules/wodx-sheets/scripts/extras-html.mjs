/**
 * WoDX Sheets 0.7.0: the markup of the sheet extras, built from the views in extras-rules.mjs. Pure strings, so the
 * sample page and the tests draw exactly what the sheet draws.
 */
import { CONCEAL, TIE_ROLES } from "./extras-rules.mjs";

export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const searchBox = (target, placeholder) => `<input type="search" class="wodx-search" data-search="${esc(target)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off" spellcheck="false">`;

/** The strip across the top of every tab. */
export function stripHtml(view) {
  const cells = view.cells.map(c => `<div class="wodx-strip-cell${c.warn ? " warn" : ""}" data-key="${esc(c.key)}"><span class="wodx-strip-label">${esc(c.label)}</span><span class="wodx-strip-val">${esc(c.text)}</span></div>`).join("");
  const conds = view.conditions.length ? `<div class="wodx-strip-conds">${view.conditions.map(c => `<span class="wodx-cond">${esc(c)}</span>`).join("")}</div>` : "";
  return `<div class="wodx-strip" role="status" aria-label="In play">${cells}${conds}</div>`;
}

function rowHtml(r, editable) {
  const pad = r.depth ? ` style="padding-left:${r.depth * 18}px"` : "";
  const qty = r.qty > 1 || r.kind === "money" ? `<span class="wodx-qty" title="How many">${r.qty}</span>` : "";
  const era = r.eraNote ? `<span class="wodx-era-flag" title="${esc(r.eraNote)}"><i class="fa-solid fa-hourglass-half"></i> ${esc(r.eraNote)}</span>` : "";
  const value = r.value ? `<span class="wodx-value" title="Value for the time">${esc(r.value)}</span>` : "";
  const box = r.isContainer ? `<span class="wodx-holds" title="Holds things up to this size">${esc(r.holds)}, ${r.count} inside</span>` : "";
  const tools = editable ? `<span class="wodx-poss-tools">
      ${r.isContainer ? "" : `<a class="wodx-act" data-act="qty-minus" title="One fewer"><i class="fa-solid fa-minus"></i></a><a class="wodx-act" data-act="qty-plus" title="One more"><i class="fa-solid fa-plus"></i></a>`}
      ${r.qty > 1 ? `<a class="wodx-act" data-act="split" title="Split the stack"><i class="fa-solid fa-scissors"></i></a>` : ""}
      ${r.depth ? `<a class="wodx-act" data-act="take-out" title="Take it out"><i class="fa-solid fa-arrow-up-from-bracket"></i></a>` : ""}
      ${r.usable ? `<a class="wodx-act" data-act="use" title="Use it"><i class="fa-solid fa-hand-sparkles"></i></a>` : ""}
      <a class="wodx-act" data-act="give" title="Give to someone"><i class="fa-solid fa-hand-holding"></i></a>
      <a class="wodx-act" data-act="leave" title="Leave it here, on the map"><i class="fa-solid fa-location-dot"></i></a>
      <a class="wodx-act" data-act="container" title="${r.isContainer ? "Container settings" : "Make it a container"}"><i class="fa-solid fa-box-open"></i></a>
      <a class="wodx-act" data-act="edit" title="Edit"><i class="fa-solid fa-pen-to-square"></i></a>
      <a class="wodx-act" data-act="delete" title="Delete"><i class="fa-solid fa-trash-can"></i></a>
    </span>` : "";
  const head = `<div class="wodx-poss-row${r.isContainer ? " is-container" : ""}${r.eraNote ? " off-era" : ""}" data-search-item data-wodx-item="${esc(r.id)}" draggable="${editable}"${pad}>
    ${r.isContainer ? `<a class="wodx-act wodx-fold" data-act="fold" title="Open or close"><i class="fa-solid fa-caret-down"></i></a>` : `<span class="wodx-fold-pad"></span>`}
    ${qty}<a class="wodx-poss-name wodx-act" data-act="open">${esc(r.name)}</a>${r.desc ? ` <a class="wodx-act wodx-desc-fold" data-act="desc" title="Show or hide the description" aria-expanded="false"><i class="fa-solid fa-circle-info"></i></a>` : ""}${r.equipped ? ` <i class="fa-solid fa-hand wodx-quiet" title="In hand or worn"></i>` : ""}
    ${box}${value}${era}${tools}</div>${r.desc ? `<div class="wodx-poss-desc" data-desc-of="${esc(r.id)}" hidden${pad ? ` style="padding-left:${r.depth * 18 + 32}px"` : ""}>${esc(r.desc)}</div>` : ""}`;
  const kids = r.contents.length ? `<div class="wodx-poss-contents" data-in="${esc(r.id)}">${r.contents.map(k => rowHtml(k, editable)).join("")}</div>`
    : r.isContainer ? `<div class="wodx-poss-contents wodx-quiet" data-in="${esc(r.id)}" style="padding-left:${(r.depth + 1) * 18 + 20}px">Empty. Drag things here.</div>` : "";
  return head + kids;
}

/**
 * The Possessions tab. view: possessions() from the rules; money: {coins: moneyOf, inUse: coinsAt, carried, bank};
 * gear: the system's gear notes (HTML, shown as it is); editable: whether the owner may change things.
 */
export function possessionsHtml(view, { money, editable = true, gearNotes = "" } = {}) {
  const coins = money.coins.length ? money.coins.map(c => `<span class="wodx-coin"><b>${c.count}</b> ${esc(c.denom)}</span>`).join("") : `<span class="wodx-quiet">No coin carried as things.</span>`;
  const moneyBox = `<div class="wodx-money">
    <div class="wodx-money-coins">${coins}</div>
    <div class="wodx-money-sums">${editable
      ? `<label>Carried <input type="number" name="system.money.carried" data-dtype="Number" value="${esc(money.carried)}"></label><label>Put by <input type="number" name="system.money.bank" data-dtype="Number" value="${esc(money.bank)}"></label>`
      : `<span>Carried: <b>${esc(money.carried)}</b></span><span>Put by: <b>${esc(money.bank)}</b></span>`}</div>
    <div class="wodx-quiet">Coin of the time: ${money.inUse.map(esc).join(", ")}.${editable ? ` <a class="wodx-act" data-act="add-coins">Add coins</a>` : ""}</div>
  </div>`;
  const groups = view.groups.map(g => `<div class="wodx-poss-group" data-group="${esc(g.id)}">
    <div class="wodx-poss-head splatFont" data-drop-loose="1">${esc(g.label)}</div>
    ${g.rows.map(r => rowHtml(r, editable)).join("")}
  </div>`).join("");
  const warn = view.outOfEra ? `<div class="wodx-warn">${view.outOfEra === 1 ? "One thing does not belong to this year" : `${view.outOfEra} things do not belong to this year`}.</div>` : "";
  return `<div class="wodx-possessions">
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text">Money</span></div>
    ${moneyBox}
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text">Possessions</span></div>
    <div class="wodx-poss-bar">${searchBox(".wodx-poss-list", "Search possessions")}
      <select class="wodx-poss-filter" aria-label="Show" data-fixed>
        <option value="">Everything</option><option value="weapons">Weapons</option><option value="armor">Armor</option><option value="fetishes">Fetishes and talens</option>
        <option value="money">Money</option><option value="goods">Goods and gear</option><option value="containers">Containers</option><option value="off-era">Out of era</option>
      </select>
      ${editable ? `<a class="wodx-act wodx-btn" data-act="new-item"><i class="fa-solid fa-square-plus"></i> Add</a>` : ""}</div>
    ${warn}
    <div class="wodx-poss-list" data-search-item-parent>${groups || `<div class="wodx-quiet">Nothing carried.</div>`}</div>
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text">Other gear</span></div>
    <div class="wodx-gear-notes">${gearNotes || `<span class="wodx-quiet">Notes on gear are written on the system's Gear notes.</span>`}</div>
  </div>`;
}

/** The container settings window. */
export function containerFormHtml(item, holds) {
  return `<div class="wodx-container-form">
    <label><input type="checkbox" name="iscontainer" ${item.system?.iscontainer ? "checked" : ""}> It holds other things</label>
    <label>Largest thing it takes <select name="holds" data-fixed>${CONCEAL.map((c, i) => `<option value="${c.id}" ${i === holds ? "selected" : ""}>${esc(c.label)}</option>`).join("")}</select></label>
  </div>`;
}

/** The Ties tab. */
export function tiesHtml(rows, { editable = true } = {}) {
  const list = rows.length ? rows.map(r => `<div class="wodx-tie" data-search-item data-uuid="${esc(r.uuid)}">
    <span class="wodx-tie-role">${editable && !r.auto ? `<select class="wodx-tie-role-pick" aria-label="Role" data-fixed>${Object.entries(TIE_ROLES).map(([k, v]) => `<option value="${k}" ${k === r.role ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : esc(r.roleLabel)}</span>
    <a class="wodx-tie-name wodx-act${r.gone ? " wodx-missing" : ""}" data-act="tie-open">${esc(r.name)}</a>
    <span class="wodx-quiet">${esc(r.kind)}${r.xpSpent !== null ? `, ${r.xpSpent} XP spent` : ""}${r.auto ? ", from their sheet" : ""}</span>
    ${editable && !r.auto ? `<input class="wodx-tie-note" type="text" value="${esc(r.note)}" placeholder="A note" aria-label="Note"><a class="wodx-act" data-act="tie-remove" title="Remove the tie"><i class="fa-solid fa-xmark"></i></a>` : `<span class="wodx-quiet">${esc(r.note)}</span>`}
  </div>`).join("") : `<div class="wodx-quiet">No ties yet. Drag a character, a scene or a journal entry here.</div>`;
  return `<div class="wodx-ties" data-drop-tie="1">
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text">Ties</span></div>
    <div class="wodx-poss-bar">${searchBox(".wodx-tie-list", "Search ties")}</div>
    <div class="wodx-tie-list">${list}</div>
    <div class="wodx-quiet">Ghouls, retainers, allies, mentors, kin and havens. Drag one in to add it.</div>
  </div>`;
}

/**
 * WoDX Sheets 0.11.0 (B1300): the Relationships tab, every tie WoDX keeps in one place. rows: from WoDX NPC's
 * ties [{kind, label, groupLabel, name, uuid, note, source, hidden, secret, hand, kindText, xpSpent, gone}];
 * roles: [[key, label]] for a hand-made tie; known: secrets this character found [{holder, text}]; own: this
 * character's own secrets [{text}]; regard: the Storyteller's "how they regard the characters" markup (NPCs only).
 */
const FROM = { lineage: "from the lineage", sheet: "from the Sire box", background: "from a Background", ledger: "in the Ledger", hand: "" };
export function relationsHtml(rows = [], { editable = true, gm = false, roles = [], known = [], own = [], regard = "", tree = true } = {}) {
  const groups = new Map();
  for ( const r of rows ) { if ( !groups.has(r.groupLabel) ) groups.set(r.groupLabel, []); groups.get(r.groupLabel).push(r); }
  const row = r => {
    const mine = !!r.hand && editable;
    const from = r.hand ? "" : r.source === "hand" ? "from their sheet" : FROM[r.source] ?? "";
    const meta = [r.kindText, r.xpSpent !== null && r.xpSpent !== undefined ? `${r.xpSpent} XP spent` : "", from].filter(Boolean).join(", ");
    const role = mine ? `<select class="wodx-tie-role-pick" aria-label="Role" data-fixed>${roles.map(([k, v]) => `<option value="${esc(k)}" ${k === r.kind ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>` : esc(r.label);
    const marks = gm && (r.hidden || r.secret) ? ` <i class="fa-solid fa-eye-slash" title="${r.secret ? "A secret: players see it once found out" : "Only you see this"}"></i>` : "";
    const name = r.uuid ? `<a class="wodx-tie-name wodx-act${r.gone ? " wodx-missing" : ""}" data-act="tie-open">${esc(r.name)}</a>` : `<span class="wodx-tie-name">${esc(r.name)}</span>`;
    const tools = mine ? `<input class="wodx-tie-note" type="text" value="${esc(r.note)}" placeholder="A note" aria-label="Note">`
      + `${gm ? `<a class="wodx-act" data-act="tie-hide" title="${r.hidden ? "Show it to players" : "Hide it from players"}"><i class="fa-solid ${r.hidden ? "fa-eye" : "fa-eye-slash"}"></i></a>` : ""}`
      + `<a class="wodx-act" data-act="tie-remove" title="Remove the tie"><i class="fa-solid fa-xmark"></i></a>` : r.note ? `<span class="wodx-quiet">${esc(r.note)}</span>` : "";
    return `<div class="wodx-tie" data-search-item data-uuid="${esc(r.hand ?? r.uuid ?? "")}" data-open-uuid="${esc(r.uuid ?? "")}">
    <span class="wodx-tie-role">${role}</span>${name}${marks}${meta ? ` <span class="wodx-quiet">${esc(meta)}</span>` : ""} ${tools}</div>`;
  };
  const list = groups.size ? [...groups].map(([g, rs]) => `<div class="wodx-tie-group"><div class="wodx-tie-head">${esc(g)}</div>${rs.map(row).join("")}</div>`).join("")
    : `<div class="wodx-quiet">No relationships yet. Drag a character, a scene or a journal entry here.</div>`;
  const secrets = (known.length || own.length) ? `<div class="wodx-tie-group wodx-tie-secrets"><div class="wodx-tie-head">Secrets</div>
    ${own.map(s => `<div class="wodx-tie" data-search-item><span class="wodx-tie-role">Their own</span> ${esc(s.text)}</div>`).join("")}
    ${known.map(s => `<div class="wodx-tie" data-search-item><span class="wodx-tie-role">Knows of ${esc(s.holder)}</span> ${esc(s.text)}</div>`).join("")}</div>` : "";
  const buttons = [tree ? `<button type="button" class="wodx-act" data-act="tie-tree"><i class="fa-solid fa-sitemap"></i> Family and lineage</button>` : "",
    gm ? `<button type="button" class="wodx-act" data-act="tie-secrets"><i class="fa-solid fa-user-secret"></i> Secrets</button>` : ""].filter(Boolean).join(" ");
  return `<div class="wodx-ties" data-drop-tie="1">
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text">Relationships</span></div>
    <div class="wodx-poss-bar">${searchBox(".wodx-tie-list", "Search relationships")}${buttons ? ` ${buttons}` : ""}</div>
    <div class="wodx-tie-list">${list}${secrets}</div>
    ${regard ? `<div class="wodx-tie-group wodx-tie-regard"><div class="wodx-tie-head"><i class="fa-solid fa-eye-slash"></i> How they regard the characters</div>${regard}</div>` : ""}
    <div class="wodx-quiet">Sire and childer, blood bonds, ghouls, family and Kinfolk, mentors, allies, rivals and debts, from every part of WoDX. Drag a character, scene or journal entry in to add one by hand.</div>
  </div>`;
}

/** The Storyteller's own notes on a character (never sent to players). */
export function stNotesHtml(text) {
  return `<div class="wodx-st-notes">
    <div class="sheet-headline sheet-banner splatFont"><span class="sheet-banner-text"><i class="fa-solid fa-eye-slash"></i> Storyteller's notes</span></div>
    <textarea class="wodx-st-text" rows="6" aria-label="Storyteller's notes" placeholder="Only the Storyteller sees these.">${esc(text)}</textarea>
  </div>`;
}

/** The history window's list. */
export function historyHtml(entries, now = Date.now()) {
  if ( !entries.length ) return `<p class="wodx-quiet wodx-history-empty">No changes in this session yet.</p>`;
  const ago = t => { const m = Math.round((now - t) / 60000); return m < 1 ? "just now" : m === 1 ? "a minute ago" : `${m} minutes ago`; };
  return `<div class="wodx-history">${entries.map((e, i) => `<div class="wodx-hist-row" data-search-item>
    <span>${esc(e.label)}</span><span class="wodx-quiet">${esc(e.user)}, ${ago(e.at)}</span>
    <button type="button" class="wodx-hist-undo" data-i="${i}">Undo</button></div>`).join("")}</div>`;
}
