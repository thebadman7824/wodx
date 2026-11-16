/**
 * WoDX Otherworlds: Technica, the Cyberpunks' Discipline, and the bloodline's weakness (B6604 to B6611), in Foundry.
 * Rules in net-rules.mjs (TECHNICA, waysFor, touchComputer, remoteReach, machineTalk, leansOnBlood). The Net window
 * offers the Technica ways in and actions to a character with the Discipline on the sheet (a Power named Technica).
 */
import {MODULE_ID} from "./ratings.mjs";
import * as N from "./net-rules.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const num = v => Number(v) || 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const owners = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const whisperFor = a => [...new Set([...owners(a), ...gmIds()])];
const card = (title, body) => `<div class="wodx-card wodx-crossing wodx-net"><h3>${esc(title)}</h3>${body}</div>`;
const at = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const ab = (a, k) => num(a?.system?.abilities?.[k]?.value);
const isActiveGM = () => !!game.users.activeGM?.isSelf;
async function d10(k) {
  const c = Math.max(0, Math.trunc(num(k)));
  if ( !c ) return {dice: [], roll: null};
  const r = await new Roll(`${c}d10`).evaluate();
  return {dice: r.dice?.[0]?.results?.map(x => x.result) ?? [], roll: r};
}

/** A character's dots of a Discipline on the sheet (a Power item whose name starts with it), as WoDX Combat reads them. */
export function disc(actor, name) {
  const it = actor?.items?.find(i => i.type === "Power" && (!i.system?.type || /discipline/.test(String(i.system.type))) && i.name.trim().toLowerCase().startsWith(name));
  return it ? num(it.system?.value) : 0;
}
export const technica = actor => disc(actor, "technica");
/** Whether the character is of the Cyberpunks bloodline (the sheet's clan or bloodline). */
export function isCyberpunk(actor) {
  const s = actor?.system ?? {};
  return [actor?.flags?.["wodx-actions"]?.bloodline, s.clan, s.custom?.clan].some(v => /cyberpunk/i.test(String(v ?? "")));
}

/** Technical Touch on jacking in: Perception + Computer at 6; returns the successes (0 below level 2). */
export async function touchRoll(actor) {
  if ( technica(actor) < 2 ) return 0;
  const r = await d10(at(actor, "perception") + ab(actor, "computer"));
  return N.tally(r.dice, 6).successes;
}

async function spendWillpower(actor, n = 1) {
  const w = actor?.system?.advantages?.willpower ?? {};
  if ( num(w.temporary) < n ) return false;
  await actor.update({"system.advantages.willpower.temporary": num(w.temporary) - n});
  return true;
}

/** Empower Device (Technica 3): a Willpower point and the deck runs again. */
export async function empower(actor) {
  if ( technica(actor) < 3 ) throw new Error(`${actor.name} needs Technica 3.`);
  if ( !["net-deck-dead", "net-deck-down"].some(s => actor.statuses?.has(s)) ) throw new Error("The deck is running.");
  if ( !(await spendWillpower(actor, 1)) ) throw new Error(`${actor.name} has no Willpower to spend.`);
  for ( const s of ["net-deck-dead", "net-deck-down"] ) if ( actor.statuses?.has(s) ) await actor.toggleStatusEffect(s, {active: false});
  await machineUsed(actor);
  await ChatMessage.create({speaker: {alias: actor.name}, whisper: whisperFor(actor), content: card("Empower Device", `<p>${esc(actor.name)} spends a Willpower point: the deck hums again on nothing but the charge in the air.</p>`)});
  return true;
}

/**
 * Remote Touch (Technica 4), in Realspace: the nearest keypad door, the lights, or a vehicle within 100 feet of the
 * token obeys. what: "door", "lights" or "vehicle". Returns the line.
 */
export async function remoteTouch(token, what = "door") {
  const a = token?.actor, scene = token?.parent;
  if ( technica(a) < 4 ) throw new Error(`${a?.name ?? "That character"} needs Technica 4.`);
  const reach = N.remoteReach(scene.grid?.distance, scene.grid?.units) * (scene.grid?.size ?? 100);
  const c = {x: token.x + (token.width ?? 1) * (scene.grid?.size ?? 100) / 2, y: token.y + (token.height ?? 1) * (scene.grid?.size ?? 100) / 2};
  const d = (x, y) => Math.hypot(x - c.x, y - c.y);
  let line = "Nothing answers within 100 feet.";
  if ( what === "door" ) {
    const doors = scene.walls.filter(w => w.door && (w.flags?.["wodx-interactables"]?.electronic ?? "none") !== "none" && d((w.c[0] + w.c[2]) / 2, (w.c[1] + w.c[3]) / 2) <= reach)
      .sort((p, q) => d((p.c[0] + p.c[2]) / 2, (p.c[1] + p.c[3]) / 2) - d((q.c[0] + q.c[2]) / 2, (q.c[1] + q.c[3]) / 2));
    const w = doors[0];
    if ( w ) { const open = w.ds !== 1; await w.update({ds: open ? 1 : 0, "flags.wodx-interactables.locked": false}); line = `A keypad door ${open ? "clicks open" : "swings shut"}.`; }
  } else if ( what === "lights" ) {
    const ls = scene.lights.filter(l => d(l.x, l.y) <= reach);
    if ( ls.length ) { const off = ls.some(l => !l.hidden); await scene.updateEmbeddedDocuments("AmbientLight", ls.map(l => ({_id: l.id, hidden: off}))); line = `The lights within 100 feet go ${off ? "out" : "on"}.`; }
  } else if ( what === "vehicle" ) {
    const v = scene.tiles.filter(t => t.flags?.["wodx-interactables"]?.mount && d(t.x + t.width / 2, t.y + t.height / 2) <= reach);
    if ( v.length ) line = `${esc(v[0].flags["wodx-interactables"].title || "A vehicle")} answers ${esc(a.name)}'s touch from afar: it moves at the character's word.`;
  }
  if ( !/^Nothing/.test(line) ) await machineUsed(a);
  if ( scene.id === canvas?.scene?.id && token.object ) canvas.ping?.(token.object.center, {color: "#5fffe6"});
  await ChatMessage.create({speaker: {alias: a.name}, whisper: whisperFor(a), content: card("Remote Touch", `<p>${line}</p><p class="wodx-quiet">Technica 4, World of Future Darkness.</p>`)});
  return line;
}

/**
 * Spiritus ex Machina (Technica 5) inside a fortress: Charisma + Computer at 6. From 3 successes the system stands its
 * ICE down against the speaker while the alarm is quiet (parley); from 4 it names its files, at 5 its ICE as well.
 */
export async function speak(actor, scene, model, save) {
  if ( technica(actor) < 5 ) throw new Error(`${actor.name} needs Technica 5.`);
  const r = await d10(at(actor, "charisma") + ab(actor, "computer"));
  const t = N.machineTalk(N.tally(r.dice, 6).successes);
  const lines = [`Charisma + Computer ${r.dice.length} at 6 (${r.dice.join(", ")}): ${t.text}`];
  if ( t.parley ) {
    model.parley = [...new Set([...(model.parley ?? []), actor.id])];
    await save(model);
    lines.push(`${model.mind ? `The AI (${esc(model.mind.personality)})` : "The system's spirit"} lets ${esc(actor.name)} be while the alarm is quiet.`);
  }
  if ( t.files ) lines.push(`Its files: ${esc(model.memories.flatMap(m => m.files.map(f => f.label)).join(", "))}.`);
  if ( t.ice ) lines.push(`Its ICE: ${esc(model.ice.filter(i => i.up).map(i => `${i.label} (${i.strength})`).join(", "))}.`);
  await machineUsed(actor);
  await ChatMessage.create({speaker: {alias: actor.name}, rolls: r.roll ? [r.roll] : [], whisper: whisperFor(actor), content: card("Spiritus ex Machina", `<p>${lines.join("</p><p>")}</p>`)});
  return t;
}

/* ---- the weakness: a night's Discipline uses against its machine uses ---- */
const night = () => Math.floor((game.time.worldTime ?? 0) / DAY);
function tallyOf(actor) {
  const t = actor?.flags?.[MODULE_ID]?.cyberTally;
  return t?.night === night() ? t : {night: night(), disc: 0, tech: 0, paid: 0};
}
/** A machine use (a program run, a Technica power): the tally's tech side. */
export async function machineUsed(actor) {
  if ( !isCyberpunk(actor) || !isActiveGM() ) return;
  const t = tallyOf(actor);
  await actor.setFlag(MODULE_ID, "cyberTally", {...t, tech: t.tech + 1});
}
/** A Discipline shown (WoDX Actions wodxPowerShown): outside Celerity, Potence and Technica it counts against them. */
export async function onPowerShown(actor, info = {}) {
  if ( !isActiveGM() || !isCyberpunk(actor) || info.kind !== "disc" && !/discipline/i.test(String(info.group ?? info.kind ?? "")) ) return;
  const name = String(info.power ?? "").toLowerCase(), group = String(info.group ?? "").toLowerCase();
  if ( N.CYBERPUNK_DISCIPLINES.some(d => name.startsWith(d) || group.startsWith(d)) ) return;
  const t = {...tallyOf(actor)};
  t.disc += 1;
  const pay = N.leansOnBlood(t) && t.paid < t.disc - t.tech;
  if ( pay ) t.paid += 1;
  await actor.setFlag(MODULE_ID, "cyberTally", t);
  if ( pay ) {
    const ok = await spendWillpower(actor, 1);
    await ChatMessage.create({speaker: {alias: actor.name}, whisper: whisperFor(actor), content: card("The Cyberpunks' weakness",
      `<p>Tonight ${esc(actor.name)} has reached for the blood ${t.disc} time${t.disc === 1 ? "" : "s"} and for machines ${t.tech}. ${ok ? "It costs a Willpower point." : "It would cost a Willpower point, and there is none left."}</p><p class="wodx-quiet">World of Future Darkness pdf 6.</p>`)});
  }
}

export function setupTechnica() {
  Hooks.on("wodxPowerShown", (actor, info) => { onPowerShown(actor, info).catch(e => console.error("WoDX | Cyberpunks", e)); });
}
