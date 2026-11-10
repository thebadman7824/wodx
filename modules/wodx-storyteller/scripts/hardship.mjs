/**
 * WoDX Storyteller 0.17.0: hardship on the road for the living. The rules are in hardship-rules.mjs.
 *
 *   Actor flag wodx-storyteller.needs {water, food, sleep, exposed, tired, checked, off}: the world time each was
 *   last had. Scene flag wodx-storyteller.weather: how harsh the weather is there.
 *   Setting "hardship" (off by default). When on, the active Storyteller's client checks the living player
 *   characters as the clock moves: weather on the scene they stand on, thirst, hunger and sleep. It posts one card a
 *   character with the rolls, applies bashing through WoDX Combat, and Undo takes it back. Nothing runs on players'
 *   machines. The Hardship window (Upkeep) marks who has eaten, drunk and slept, and sets the weather.
 */
import * as H from "./hardship-rules.mjs";
import {MOD, esc, isActiveGM, setting, isPC, chron} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const combat = () => game.wodxCombat ?? game.modules.get("wodx-combat")?.api ?? null;
let busy = false;

export function registerHardshipSettings() {
  game.settings.register(MOD, "hardship", {name: "Hardship on the road", hint: "Living characters suffer harsh weather, thirst, hunger and lost sleep as game time passes, by the books' rules (vampires and wraiths don't). Off: nothing is checked.",
    scope: "world", config: true, type: Boolean, default: false});
}

export const living = a => !!a && isPC(a) && H.isLiving(a.type, a.system?.clan);
export const needsOf = a => H.normNeeds(a?.flags?.[MOD]?.needs, now());
export const weatherOf = scene => (H.WEATHER[scene?.flags?.[MOD]?.weather] ? scene.flags[MOD].weather : "none");
const stamina = a => { const s = a?.system?.attributes?.stamina; return Math.max(1, num(s?.total ?? s?.value) || 1); };

async function rollStamina(a, diff) {
  const r = new Roll(`${stamina(a)}d10`);
  await r.evaluate();
  const faces = r.dice.flatMap(d => d.results.map(x => x.result));
  let s = 0, ones = 0;
  for ( const f of faces ) { if ( f === 1 ) ones++; if ( f >= diff ) s++; }
  return {successes: Math.max(0, s - ones), faces};
}

/** Check one character up to now. Returns {lines, bashing, before} or null when nothing came due. */
async function checkOne(a, t) {
  const raw = a.flags?.[MOD]?.needs;
  const before = raw ? foundry.utils.deepClone(raw) : null;
  const x = H.normNeeds(raw, t);
  if ( x.off ) return null;
  if ( !raw ) { await a.update({[`flags.${MOD}.needs`]: x}); return null; }
  const lines = [];
  let bashing = 0;
  // Weather, on the scene the character stands on
  const tok = game.scenes.contents.flatMap(s => s.tokens.contents.filter(k => k.actorId === a.id && !k.hidden).map(k => ({s, k})))[0];
  const sev = weatherOf(tok?.s);
  const due = H.weatherRolls(x.exposed, t, sev);
  if ( due ) {
    let hurt = 0;
    for ( let i = 0; i < due; i++ ) if ( !(await rollStamina(a, H.WEATHER_DIFF)).successes ) hurt++;
    bashing += hurt;
    lines.push(`The weather (${esc(H.WEATHER[sev].label.split(":")[0].toLowerCase())}): ${due} roll${due === 1 ? "" : "s"} of Stamina, ${hurt ? `${hurt} bashing` : "no harm"}.`);
  }
  x.exposed = sev === "none" ? t : x.exposed + due * (H.WEATHER[sev].every || 0);
  // Thirst and hunger
  for ( const [k, per, word] of [["water", 1, "thirst"], ["food", 3, "hunger"]] ) {
    const checks = H.needChecks(x[k], x.checked[k], t, stamina(a), per);
    let hurt = 0;
    for ( const c of checks ) if ( c.auto || !(await rollStamina(a, c.diff)).successes ) hurt++;
    if ( checks.length ) { lines.push(`${word[0].toUpperCase()}${word.slice(1)}: ${H.daysSince(x[k], t)} day${H.daysSince(x[k], t) === 1 ? "" : "s"} without, ${hurt ? `${hurt} bashing` : "held off"}${checks.some(c => c.auto) ? " (past what Stamina can hold off)" : ""}.`); bashing += hurt; }
    if ( checks.length ) x.checked[k] = checks.at(-1).day;
  }
  // Sleep
  const sl = H.sleepChecks(x.sleep, x.checked.sleep, t);
  if ( sl.length ) {
    let worse = 0;
    for ( const c of sl ) if ( !(await rollStamina(a, c.diff)).successes ) worse++;
    x.tired = Math.min(H.MAX_TIRED, x.tired + worse);
    x.checked.sleep = sl.at(-1).day;
    lines.push(`No sleep for ${H.daysSince(x.sleep, t)} days: ${x.tired ? `tired, ${x.tired} ${x.tired === 1 ? "die" : "dice"} off every roll until they sleep` : "still sharp"}.`);
  }
  if ( !lines.length ) { await a.update({[`flags.${MOD}.needs`]: x}); return null; }
  await a.update({[`flags.${MOD}.needs`]: x});
  if ( bashing ) await combat()?.applyDamage?.(a, "bashing", bashing);
  return {lines, bashing, before};
}

/** The active Storyteller checks every living player character. force: even with the setting off; actorIds: only these. */
export async function tick({force = false, actorIds = null} = {}) {
  if ( !isActiveGM() || busy || (!force && !setting("hardship")) ) return [];
  try { if ( chron()?.isHeld?.() ) return []; } catch (e) { /* no Chronicle */ }
  busy = true;
  const out = [];
  try {
    const t = now();
    for ( const a of game.actors.filter(x => living(x) && (!actorIds || actorIds.includes(x.id))) ) {
      const r = await checkOne(a, t);
      if ( !r ) continue;
      out.push({actor: a.id, ...r});
      await ChatMessage.create({speaker: ChatMessage.getSpeaker({actor: a}), whisper: [...gmIds(), ...ownerIds(a)],
        flags: {[MOD]: {hardship: {actor: a.id, before: r.before, bashing: r.bashing}}},
        content: `<div class="wodx-card wst-hardship-card"><p><b>${esc(a.name)}</b> on the road.</p><ul>${r.lines.map(l => `<li>${l}</li>`).join("")}</ul>
          <p><small>${esc(Object.values(H.REFS).join("; "))}</small></p><button type="button" data-action="wst-hardship-undo">Undo</button></div>`});
    }
  } finally { busy = false; }
  return out;
}

export async function undoTick(message) {
  const f = message.flags?.[MOD]?.hardship;
  const a = game.actors.get(f?.actor);
  if ( !a || !game.user.isGM || f.undone ) return;
  if ( f.bashing ) await combat()?.healDamage?.(a, "bashing", f.bashing);
  await a.update({[`flags.${MOD}.needs`]: f.before ?? H.normNeeds({}, now())});
  await message.update({[`flags.${MOD}.hardship.undone`]: true, content: `<div class="wodx-card wst-hardship-card"><p><s>${esc(a.name)} on the road</s> (undone)</p></div>`});
}

/** Mark that a character has eaten, drunk or slept (any of "food", "water", "sleep"). */
export async function mark(a, kinds = ["food", "water", "sleep"]) {
  if ( !game.user.isGM || !a ) return null;
  const x = needsOf(a), t = now();
  for ( const k of kinds ) { x[k] = t; x.checked[k] = 0; if ( k === "sleep" ) x.tired = 0; }
  await a.update({[`flags.${MOD}.needs`]: x});
  return x;
}

export async function setOff(a, off) {
  if ( !game.user.isGM || !a ) return null;
  const x = needsOf(a); x.off = !!off;
  await a.update({[`flags.${MOD}.needs`]: x});
  return x;
}

export async function setWeather(scene, severity) {
  if ( !game.user.isGM || !scene ) return null;
  const sev = H.WEATHER[severity] ? severity : "none";
  await scene.update({[`flags.${MOD}.weather`]: sev});
  // Weather counts from now, not from whenever the characters last met some
  if ( sev !== "none" ) for ( const a of game.actors.filter(living) ) if ( scene.tokens.some(k => k.actorId === a.id) ) {
    const x = needsOf(a); x.exposed = now(); await a.update({[`flags.${MOD}.needs`]: x});
  }
  return sev;
}

/** The Storyteller's window: who has gone without what, and the weather here. */
export async function hardshipDialog() {
  if ( !game.user.isGM ) return null;
  const t = now(), list = game.actors.filter(living);
  const scene = globalThis.canvas?.scene ?? null;
  const d = (x, k) => H.daysSince(x[k], t);
  const rows = list.map(a => { const x = needsOf(a); return `<tr><td>${esc(a.name)}${x.off ? " <i>(not checked)</i>" : ""}</td><td>${d(x, "water")}</td><td>${d(x, "food")}</td><td>${d(x, "sleep")}${x.tired ? `, tired ${x.tired}` : ""}</td>
    <td><button type="button" data-wst-hs="all" data-actor="${a.id}">Ate, drank, slept</button> <button type="button" data-wst-hs="water" data-actor="${a.id}">Drank</button> <button type="button" data-wst-hs="sleep" data-actor="${a.id}">Slept</button> <button type="button" data-wst-hs="off" data-actor="${a.id}">${x.off ? "Check" : "Don't check"}</button></td></tr>`; }).join("");
  const wire = (ev, dlg) => {
    for ( const b of dlg?.element?.querySelectorAll?.("[data-wst-hs]") ?? [] ) b.addEventListener("click", async () => {
      const a = game.actors.get(b.dataset.actor), k = b.dataset.wstHs;
      dlg.close();
      if ( k === "all" ) await mark(a); else if ( k === "off" ) await setOff(a, !needsOf(a).off); else await mark(a, [k]);
      hardshipDialog();
    });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 760}, window: {title: "Hardship on the road"}, classes: ["wodx-dialog", "wst-hardship"],
    content: `<p>${setting("hardship") ? "Checked as game time passes." : "Off in the settings: nothing is checked until it is turned on."} Days without water, food and sleep, for living characters only.</p>
      ${scene ? `<div class="form-group"><label>Weather on ${esc(scene.navName || scene.name)}</label><select name="weather" data-fixed>${Object.entries(H.WEATHER).map(([k, v]) => `<option value="${k}"${k === weatherOf(scene) ? " selected" : ""}>${esc(v.label)}</option>`).join("")}</select></div>` : ""}
      ${list.length > 5 ? searchBox("table.wst-hardship-t", "Search characters…", "Search characters") : ""}<div class="wst-scroll"><table class="wst-hardship-t"><thead><tr><th>Character</th><th>Water</th><th>Food</th><th>Sleep</th><th></th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No living player characters.</td></tr>"}</tbody></table></div>
      <p class="hint">A Stamina roll resists each turn of bad weather and each day without water or food; past a day a dot without water, or three days a dot without food, it hurts without a roll (M20 pp. 435-436). Willpower can hold off hunger a day a point: mark them as having eaten.</p>`,
    buttons: [{action: "save", label: "Set the weather", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "check", label: "Check now"}, {action: "close", label: "Close"}]});
  if ( res === "check" ) { const r = await tick({force: true}); if ( !r.length ) ui.notifications.info("Nothing came due."); return null; }
  if ( res && typeof res === "object" && scene ) await setWeather(scene, res.weather);
  return null;
}

export function registerHardshipHooks() {
  Hooks.on("wodxSkipEnd", () => { tick().catch(e => console.error(`${MOD} | hardship`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } tick().catch(e => console.error(`${MOD} | hardship`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !game.user.isGM || !html || !message.flags?.[MOD]?.hardship ) return;
    html.querySelector?.("[data-action=wst-hardship-undo]")?.addEventListener("click", () => undoTick(message));
  });
}
