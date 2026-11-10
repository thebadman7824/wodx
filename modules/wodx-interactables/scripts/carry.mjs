/**
 * WoDX Interactables 0.16.0: carried light that burns down. The rules are in carry-rules.mjs.
 *
 * A flame button on the token HUD opens a small window: pick what the character carries (only what the year allows),
 * light it, put it out, or take a fresh one. The light goes on the token. The active Storyteller's client burns every
 * lit one down as the clock moves, and tells the owner when it burns low and when it goes out (or the weather puts it
 * out out of doors). The token's own light is put back when it goes out.
 */
import * as C from "./carry-rules.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const num = v => Number(v) || 0;
const chron = () => game.modules.get("wodx-chronicle")?.api;
const atmo = () => game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere").api : null;
const stateOf = doc => doc?.flags?.[MOD]?.carried ?? null;

function yearNow() {
  try { return num(chron()?.eras?.currentYear?.()); } catch (e) { return 0; }
}
function weatherCtx(scene) {
  try {
    const a = atmo();
    return {outdoors: !!a?.weather?.isOutdoor?.(scene), tags: a?.weather?.now?.()?.tags ?? []};
  } catch (e) { return {outdoors: false, tags: []}; }
}
const ownLight = doc => {
  const l = doc?.light ?? {};
  return {bright: num(l.bright), dim: num(l.dim), angle: num(l.angle) || 360, color: l.color ?? null, alpha: num(l.alpha) || 0.5, animation: {type: l.animation?.type ?? null}};
};

async function save(doc, state, lit) {
  const prior = stateOf(doc);
  const before = prior?.before ?? ownLight(doc);
  const upd = {[`flags.${MOD}.carried`]: {...state, before}};
  if ( lit ) upd.light = C.lightData(state.kind, doc.parent?.grid?.units);
  else if ( prior?.lit ) upd.light = before;
  await doc.update(upd);
}

async function tell(doc, text) {
  const ids = game.users.filter(u => u.isGM || doc.actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  await ChatMessage.create({content: `<div class="wix-carry-note"><b>${esc(doc.name)}</b>: ${esc(text)}</div>`, whisper: ids, speaker: {alias: "Light"}});
}

/** Light, put out or replace a token's carried light. */
export async function carry(doc, what, kind) {
  const year = yearNow(), now = game.time.worldTime;
  let s = stateOf(doc);
  if ( what === "fresh" ) {
    if ( !C.kindsFor(year).some(k => k.id === kind) ) return ui.notifications.warn("That cannot be had in this year.");
    s = C.fresh(kind, year, now);
    const why = C.cannotLight(s, weatherCtx(doc.parent));
    if ( why ) { await save(doc, {...s, lit: false}, false); return ui.notifications.warn(why); }
    await save(doc, s, true);
    return tell(doc, `lights a ${C.CARRIED[kind].label.toLowerCase()} (${C.leftWords(s.left)}).`);
  }
  if ( !s ) return;
  if ( what === "light" ) {
    const why = C.cannotLight(s, weatherCtx(doc.parent));
    if ( why ) return ui.notifications.warn(why);
    await save(doc, {...s, lit: true, since: now}, true);
    return tell(doc, `lights the ${C.CARRIED[s.kind].label.toLowerCase()} again (${C.leftWords(s.left)}).`);
  }
  if ( what === "out" ) {
    const r = C.burn(s, now, {});
    await save(doc, {...r.state, lit: false}, false);
    return tell(doc, `puts out the ${C.CARRIED[s.kind].label.toLowerCase()} (${C.leftWords(r.state.left)}).`);
  }
  if ( what === "drop" ) {
    const before = s.before ?? ownLight(doc);
    const Del = globalThis.foundry?.data?.operators?.ForcedDeletion;
    const unset = Del ? {[`flags.${MOD}.carried`]: new Del()} : {[`flags.${MOD}.-=carried`]: null};
    await doc.update({...unset, ...(s.lit ? {light: before} : {})});
  }
}

/** The window from the token HUD. */
export async function openCarry(tok) {
  const doc = tok?.document ?? tok;
  if ( !doc?.isOwner ) return;
  const year = yearNow(), kinds = C.kindsFor(year), s = stateOf(doc);
  const now = s?.lit ? C.burn(s, game.time.worldTime, {}).state : s;
  const status = s ? `${C.CARRIED[s.kind]?.label ?? "A light"}, ${s.lit ? "lit" : "out"}, ${C.leftWords(now?.left)}.` : "Carrying no light.";
  const opts = kinds.map(k => `<option value="${k.id}">${esc(k.label)}</option>`).join("");
  const buttons = [{action: "fresh", label: "Light a fresh one", default: true}];
  if ( s && !s.lit && num(s.left) > 0 ) buttons.push({action: "light", label: "Light it again"});
  if ( s?.lit ) buttons.push({action: "out", label: "Put it out"});
  if ( s ) buttons.push({action: "drop", label: "Set it down"});
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, classes: ["wodx-dialog", "wix-carry"],
    window: {title: `Carried light: ${doc.name}`},
    content: `<p>${esc(status)}</p><div class="form-group"><label>Light</label><select name="kind" data-fixed>${opts}</select></div><p class="hint">A torch lasts about an hour, a candle four, a lantern's oil eight. Out of doors, wind puts out a candle and a downpour or a storm puts out a torch.</p>`,
    buttons: buttons.map(b => ({...b, callback: (ev, btn) => ({what: b.action, kind: btn.form?.elements?.kind?.value})}))});
  if ( res?.what ) await carry(doc, res.what, res.kind);
}

/** The Storyteller's client: burn every lit carried light down to now. */
export async function tick(now = game.time.worldTime) {
  for ( const scene of game.scenes ?? [] ) {
    const ctx = weatherCtx(scene);
    for ( const doc of scene.tokens ?? [] ) {
      const s = stateOf(doc);
      if ( !s?.lit ) continue;
      const r = C.burn(s, now, ctx);
      if ( r.out ) {
        await save(doc, r.state, false);
        await tell(doc, r.out === "spent" ? `the ${C.CARRIED[s.kind].label.toLowerCase()} ${C.CARRIED[s.kind].verb}.` : `${r.reason} puts out the ${C.CARRIED[s.kind].label.toLowerCase()}.`);
      } else if ( r.low ) {
        // Only the burning-low note is saved; otherwise the fuel is worked out from since, with no write per tick.
        await doc.update({[`flags.${MOD}.carried`]: {...r.state, before: s.before}});
        await tell(doc, `the ${C.CARRIED[s.kind].label.toLowerCase()} is burning low (${C.leftWords(r.state.left)}).`);
      }
    }
  }
}

let busy = null;
export function setupCarry() {
  const quiet = () => { try { return !!(chron()?.isHeld?.() || chron()?.isSkipping?.()); } catch (e) { return false; } };
  const run = () => {
    if ( !isActiveGM() || busy || quiet() ) return;
    busy = tick().catch(e => console.error(`${MOD} |`, e)).finally(() => { busy = null; });
  };
  // While the world is held or a skip runs nothing reacts; the fuel is worked out from the time lit when it does
  Hooks.on("updateWorldTime", run);
  Hooks.on("wodxSkipEnd", run);
  Hooks.on("renderTokenHUD", (hud, html) => {
    const root = html instanceof HTMLElement ? html : html?.[0];
    const tok = hud.object, col = root?.querySelector(".col.right");
    if ( !tok?.actor || !col || !tok.document.isOwner ) return;
    const b = document.createElement("div");
    b.className = "control-icon wix-hud wix-carry-hud";
    const s = stateOf(tok.document);
    b.dataset.tooltip = s ? `Carried light: ${C.CARRIED[s.kind]?.label ?? ""}, ${s.lit ? "lit" : "out"}` : "Carry a light: a candle, a torch, a lantern or an electric torch";
    b.innerHTML = `<i class="fa-solid fa-fire-flame-simple"></i>`;
    if ( s?.lit ) b.classList.add("active");
    b.addEventListener("click", () => openCarry(tok).catch(e => console.error(`${MOD} |`, e)));
    col.appendChild(b);
  });
  return {rules: C, carry, open: openCarry, tick};
}
