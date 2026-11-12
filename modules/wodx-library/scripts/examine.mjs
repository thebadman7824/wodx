/**
 * WoDX Library 0.7.0: Examine an item (rules in examine-rules.mjs, words in data/goods-text.mjs).
 *
 *   Every everyday good made into an item gets its description for the year, unless it already has one.
 *   Examine (item sheet header, or api.examine.open(item)): the description and the item's facts.
 *   Look closer: Perception + the category's best Ability, difficulty 6; the card goes to the roller and the Storyteller.
 *   Examine notes (Storyteller only): where it is from, how well made, false, stolen, worn, uncanny, and their own lines.
 */
import * as X from "./examine-rules.mjs";

const MOD = "wodx-library";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
let G = null, T = null;
async function load() {
  if ( !G ) G = await import("../data/goods.mjs");
  if ( !T ) T = await import("../data/goods-text.mjs");
  return {G, T};
}
const yearNow = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } };
const goodOfItem = item => {
  if ( !G ) return null;
  const id = item?.flags?.[MOD]?.good;
  return (id && G.GOODS.find(g => g.id === id)) || X.goodOf(item?.name, G.GOODS);
};
const flagOf = item => item?.flags?.[MOD]?.examine ?? {};
/** What a closer look reads: the Storyteller's notes, with a made thing's quality and maker filled in. */
const lookOf = item => X.withMade(flagOf(item), item?.flags?.["wodx-storyteller"] ?? {});
const ownerOf = item => item?.flags?.["wodx-storyteller"]?.owner ?? null;

/** Fill an everyday good's description as it is made (any path: a container, a stock list, a gift). */
function onPreCreateItem(item, data) {
  if ( !G || !T ) return;
  const good = X.goodOf(data?.name ?? item.name, G.GOODS);
  if ( !good ) return;
  const patch = {[`flags.${MOD}.good`]: good.id};
  // An older list line "claret (in a bottle)" becomes the item "claret": nothing starts in a container (2026-11-12).
  if ( good.container && /\(in (an?|\d+) [^)]+\)\s*$/.test(String(data?.name ?? item.name)) ) patch.name = good.name;
  const has = String(data?.system?.description ?? item.system?.description ?? "").trim();
  const text = T.describe(good.former ?? good.name, yearNow());
  if ( !has && text ) patch["system.description"] = `<p>${esc(text)}</p>`;
  item.updateSource(patch);
}

/* ---------------------------------------------------------------- the abilities a character has */

function abilitiesOf(actor) {
  const out = {};
  const flat = actor?.system?.abilities ?? {};
  for ( const [k, a] of Object.entries(flat) ) if ( a && typeof a === "object" ) out[k.toLowerCase()] = X.num(a.value);
  for ( const i of actor?.items ?? [] ) {
    if ( i.type !== "Ability" && !(i.type === "Trait" && String(i.system?.type ?? "").includes("secondability")) ) continue;
    const k = String(i.system?.id || i.name || "").trim().toLowerCase().replace(/[^a-z]/g, "");
    if ( k ) out[k] = Math.max(out[k] ?? 0, X.num(i.system?.value));
  }
  return out;
}
const perceptionOf = actor => { const a = actor?.system?.attributes?.perception; return a ? X.num(a.total ?? a.value) : 0; };
const abilityLabel = k => k ? k.replace(/^animalken$/, "animal ken").replace(/^hearthwisdom$/, "hearth wisdom").replace(/^\w/, c => c.toUpperCase()) : "";

/** Who looks closer: the character holding the item, else the user's character, else a selected token's. */
function looker(item) {
  const a = item?.parent?.documentName === "Actor" ? item.parent : null;
  if ( a?.isOwner ) return a;
  const sel = canvas?.tokens?.controlled?.[0]?.actor;
  if ( sel?.isOwner ) return sel;
  return game.user.character ?? null;
}

/* ---------------------------------------------------------------- Examine */

async function facts(item, good) {
  let price = null;
  try {
    const m = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
    const p = good && m?.priceSync ? m.priceSync(good.name) : null;
    // A made thing's quality moves its worth (Storyteller's priceFactor)
    const fx = Number(item?.flags?.["wodx-storyteller"]?.priceFactor) || 1;
    if ( p?.text ) price = fx !== 1 && m?.format ? m.format(Math.max(1, Math.round(p.total * fx))) : p.text;
  } catch (e) { price = null; }
  const f = lookOf(item);
  const era = game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id;
  return X.factsOf(good, {kinds: G.KINDS, values: G.VALUES, conceal: G.CONCEAL, tier: era ? good?.values?.[era] : null, price, quality: f.quality});
}

export async function examine(item) {
  if ( !item ) return;
  await load();
  const good = goodOfItem(item);
  const desc = String(item.system?.description ?? "").trim() || (good ? `<p>${esc(T.describe(good.former ?? good.name, yearNow()))}</p>` : "<p>Nothing more is known about it.</p>");
  const rows = (await facts(item, good)).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  const who = looker(item);
  const f = flagOf(item);
  const gmBits = game.user.isGM ? [f.forged ? "false" : "", (f.stolen || ownerOf(item)?.stolen) ? "stolen" : "", f.worn ? "worn" : "", f.uncanny ? "uncanny" : "", (f.lines?.length ? `${f.lines.length} line${f.lines.length > 1 ? "s" : ""} of your own` : "")].filter(Boolean) : [];
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 460}, window: {title: `Examine: ${item.name}`}, classes: ["wodx-dialog", "wlib-examine"],
    content: `<div class="wlib-ex-desc">${desc}</div>${rows ? `<table class="wlib-ex-facts" data-fixed>${rows}</table>` : ""}
      ${gmBits.length ? `<p class="hint">Only you see this: ${esc(gmBits.join(", "))}.</p>` : ""}
      ${good ? `<p class="hint">Look closer: Perception + ${esc(abilityLabel(X.closerPool(good.kind).ability))} or a like Ability, difficulty ${X.DIFFICULTY}.</p>` : ""}`,
    buttons: [...(good && who ? [{action: "closer", label: `Look closer (${esc(who.name)})`, default: true}] : []),
      ...(game.user.isGM ? [{action: "notes", label: "Examine notes"}] : []), {action: "close", label: "Close"}]});
  if ( res === "closer" ) return lookCloser(item, who);
  if ( res === "notes" ) return editNotes(item);
}

/** Roll a closer look and post what it finds to the roller and the Storyteller. */
export async function lookCloser(item, actor = looker(item)) {
  await load();
  const good = goodOfItem(item);
  if ( !good || !actor ) return null;
  const p = X.closerPool(good.kind, {perception: perceptionOf(actor), abilities: abilitiesOf(actor)});
  const roll = await new Roll(`${p.pool}d10`).evaluate();
  const faces = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
  const {successes, botch} = X.countSuccesses(faces, p.difficulty);
  const found = X.findings(good.kind, successes, lookOf(item), ownerOf(item), T.detailsOf(good.former ?? good.name));
  const dice = faces.map(v => `<span class="vta-die ${v === 1 ? "one" : v >= p.difficulty ? "hit" : "miss"}">${v}</span>`).join("");
  const body = botch ? "<p>A botch. The Storyteller may tell something misleading.</p>"
    : found.length ? `<p class="wodx-quiet">What the look shows. The Storyteller fills in the details.</p><ul>${found.map(l => `<li>${esc(l.text)}</li>`).join("")}</ul>` : "<p>Nothing more than meets the eye.</p>";
  const gms = game.users.filter(u => u.isGM).map(u => u.id);
  await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor}), rolls: [roll], whisper: [...new Set([game.user.id, ...gms])],
    content: `<div class="vta-card wodx-x"><header class="vta-head"><h3>${esc(actor.name)} looks closer at ${esc(item.name)}</h3><span class="vta-verdict">${botch ? "Botch" : `${successes} success${successes === 1 ? "" : "es"}`}</span></header>
      <div class="vta-body"><p class="wodx-quiet">Perception + ${esc(abilityLabel(p.ability))}: ${p.pool} dice at ${p.difficulty}</p><div class="vta-dice">${dice}</div>${body}</div></div>`,
    flags: {[MOD]: {examine: {item: item.uuid, successes, botch}}}});
  return {successes, botch, found};
}

/* ---------------------------------------------------------------- the Storyteller's notes */

export async function editNotes(item) {
  if ( !game.user.isGM || !item ) return;
  await load();
  const f = flagOf(item), dressed = item.flags?.[MOD]?.look?.dressedAs ?? null;
  const q = Object.entries(X.QUALITY).map(([k, v]) => `<option value="${k}"${f.quality === k ? " selected" : ""}>${esc(v)}</option>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 520}, window: {title: `Examine notes: ${item.name}`}, classes: ["wodx-dialog", "wlib-examine-notes"],
    content: `<p class="hint">What a closer look can find. One success shows how it was made, two where it comes from, three whether it is false, stolen or worn, four anything uncanny. Players never see these notes until a roll opens them.</p>
      <label>How well made <select name="quality" data-fixed><option value="">(not said)</option>${q}</select></label>
      <label>Where it comes from <input type="text" name="origin" maxlength="300" value="${esc(f.origin ?? "")}"></label>
      <label><input type="checkbox" name="forged"${f.forged ? " checked" : ""}> It is a forgery or a fake</label>
      <label>What gives the fake away <input type="text" name="forgedTell" maxlength="300" value="${esc(f.forgedTell ?? "")}"></label>
      <label><input type="checkbox" name="stolen"${f.stolen ? " checked" : ""}> It was stolen</label>
      <label><input type="checkbox" name="worn"${f.worn ? " checked" : ""}> It is worn out</label>
      <label><input type="checkbox" name="bloody"${f.bloody ? " checked" : ""}> It is bloodstained (shows on whoever wears it)</label>
      <label>Worn as a disguise: the station it passes for (0 to 5, blank for none) <input type="number" name="dressedStation" min="0" max="5" value="${dressed ? X.num(dressed.station) : ""}"></label>
      <label>Sides it passes for, comma between (kind:church, livery, kind:watch) <input type="text" name="dressedSides" maxlength="200" value="${esc((dressed?.sides ?? []).join(", "))}"></label>
      <label>Something uncanny about it <textarea name="uncanny" rows="2" maxlength="400">${esc(f.uncanny ?? "")}</textarea></label>
      <label>Successes needed for the uncanny <input type="number" name="uncannyNeed" min="4" max="10" value="${X.num(f.uncannyNeed) || X.NEEDS.uncanny}"></label>
      <label>Your own lines, one per row as "successes: text" <textarea name="lines" rows="4" placeholder="2: A maker's mark of a crowned fish.">${esc(X.joinLines(f.lines ?? []))}</textarea></label>
      <label>Notes for yourself <textarea name="note" rows="2" maxlength="500">${esc(f.note ?? "")}</textarea></label>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => new foundry.applications.ux.FormDataExtended(b.form).object}, {action: "cancel", label: "Cancel"}]});
  if ( !res || res === "cancel" ) return;
  const next = {quality: X.QUALITY[res.quality] ? res.quality : "", origin: String(res.origin ?? "").trim(), forged: !!res.forged, forgedTell: String(res.forgedTell ?? "").trim(),
    stolen: !!res.stolen, worn: !!res.worn, uncanny: String(res.uncanny ?? "").trim(), uncannyNeed: Math.max(X.NEEDS.uncanny, X.num(res.uncannyNeed) || X.NEEDS.uncanny),
    lines: X.parseLines(res.lines ?? ""), note: String(res.note ?? "").trim()};
  next.bloody = !!res.bloody;
  // 0.14.0: a disguise (WoDX Library's look reads it; WoDX Actions' "Pass as someone else" rolls against it)
  const ds = String(res.dressedStation ?? "").trim();
  const look = ds === "" ? null : {station: Math.max(0, Math.min(5, X.num(ds))), sides: String(res.dressedSides ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean)};
  await item.update({[`flags.${MOD}.examine`]: next, [`flags.${MOD}.look`]: {dressedAs: look}});
  return next;
}

/* ---------------------------------------------------------------- wiring */

export async function setupExamine() {
  await load();
  Hooks.on("preCreateItem", onPreCreateItem);
  const can = it => !!it && (game.user.isGM || it.testUserPermission?.(game.user, "OBSERVER"));
  Hooks.on("getHeaderControlsItemSheetV2", (app, controls) => {
    const it = app.document;
    if ( !can(it) || controls.some(c => c.action === "wlibExamine") ) return;
    const go = () => examine(it);
    if ( app.options?.actions ) app.options.actions.wlibExamine = go;
    controls.push({icon: "fa-solid fa-magnifying-glass", label: "Examine", action: "wlibExamine", onClick: go});
  });
  Hooks.on("getItemSheetHeaderButtons", (sheet, buttons) => {
    const it = sheet.item ?? sheet.document;
    if ( !can(it) || buttons.some(b => b.class === "wlib-examine") ) return;
    buttons.unshift({label: "Examine", class: "wlib-examine", icon: "fa-solid fa-magnifying-glass", onclick: () => examine(it)});
  });
}

export const examineApi = () => ({open: examine, closer: lookCloser, notes: editNotes, describe: (name, year) => T?.describe(name, year ?? yearNow()) ?? "", rules: X});
