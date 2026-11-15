/**
 * NPC memory and grudges, the Foundry side (B3346-B3349). The rules are in memory-rules.mjs.
 *
 *   notes     on the NPC, flags["wodx-npc"].memory {charId: [note]}; taken from attitude changes (wodxAttitude) and
 *             trust events (trust.mjs), or written by api.memory.remember
 *   seen      a short word per NPC on the character, flags["wodx-npc"].remembered {npcId: {name, word}}, so a player
 *             reads what their character would know without seeing the NPC's sheet
 *   seasons   every 91 days of world time the active Storyteller's client runs a memory turn: each NPC with a grudge
 *             strong enough and the means picks one move, which goes to the approval queue (type wodx-npc.grudge);
 *             approving it starts a rumour, tips off the hunters of the region, or tells the Storyteller what to play
 *   heirs     a death recorded on the sheet passes strong grudges to the heirs at half weight
 *   Hooks out wodxGrudgeMove {npc, character, move}.
 */
import * as M from "./memory-rules.mjs";
import * as GR from "./grudge-rules.mjs";

const MOD = "wodx-npc";
const TYPE = `${MOD}.grudge`;
const CREATION = "wodx-creation";
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const chron = () => game.modules.get("wodx-chronicle")?.api;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const now = () => Number(game.time?.worldTime) || 0;
const isNpc = a => !!a && !a.hasPlayerOwner;
const temperFor = a => M.temperOf(a?.system?.nature);
const memOf = a => M.normMemory(a?.flags?.[MOD]?.memory);

export function registerSettings() {
  game.settings.register(MOD, "memory", {name: "NPCs remember and bear grudges", hint: "NPCs keep what characters did to them. Once a season one with a strong grudge and the means may act on it, with the Storyteller's leave.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "memoryTurn", {scope: "world", config: false, type: Number, default: 0});
}
const on = () => { try { return !!game.settings.get(MOD, "memory"); } catch (e) { return false; } };

/** Write the word a character sees for one NPC. */
async function mirror(npc, ch) {
  if ( !ch?.hasPlayerOwner ) return;
  const s = M.seenBy(memOf(npc)[ch.id] ?? [], now(), temperFor(npc));
  await ch.setFlag(MOD, "remembered", {...(ch.flags?.[MOD]?.remembered ?? {}), [npc.id]: {name: npc.name, word: s.word}});
}

/** Storyteller: add a note. note: {kind, weight?, text?, seen?}. */
export async function remember(npcLike, charLike, note = {}) {
  const npc = actorOf(npcLike), ch = actorOf(charLike);
  if ( !game.user.isGM || !on() || !isNpc(npc) || !ch || npc.id === ch.id ) return null;
  const m = M.remember(npc.flags?.[MOD]?.memory, ch.id, {at: now(), ...note});
  await npc.update({[`flags.${MOD}.memory.${ch.id}`]: m[ch.id]});
  await mirror(npc, ch);
  return m[ch.id].at(-1);
}

/** {grudge, favour, net, temper} of one NPC toward one character. */
export function balanceOf(npcLike, charLike) {
  const npc = actorOf(npcLike), ch = actorOf(charLike);
  const t = temperFor(npc);
  return {...M.balance(memOf(npc)[ch?.id ?? charLike] ?? [], now(), t), temper: t};
}

/** What a player's character knows: [{npc, word}]. */
export function knownBy(charLike) {
  const ch = actorOf(charLike);
  return Object.entries(ch?.flags?.[MOD]?.remembered ?? {}).map(([id, v]) => ({id, name: v?.name ?? "", word: v?.word ?? ""})).filter(x => x.word && x.word !== "Nothing much");
}

/* ---- The season turn (B3348) ---- */

function meansOf(npc, ch) {
  const s = st();
  const owes = (s?.ledger?.state?.()?.entries ?? []).some(e => e.status === "open" && e.from?.id === ch.id && e.to?.id === npc.id);
  const ventures = (s?.upkeep?.ventures?.state?.()?.list ?? []).some(v => v.state === "open" && v.actor === ch.id);
  const household = (ch.flags?.[MOD]?.household ?? []).length > 0;
  const seat = (s?.upkeep?.institutions?.seatsOf?.(npc.id) ?? []).some(x => x.rank >= 2);
  return {boon: owes, rumours: !!s?.rumours?.start, seat, venture: ventures, hunters: !!s?.hunters?.add, kin: household,
    violent: M.temperOf(npc.system?.nature) === "unforgiving"};
}

export async function turn({force = false} = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const t = now();
  let last = 0;
  try { last = Number(game.settings.get(MOD, "memoryTurn")) || 0; } catch (e) { /* first run */ }
  if ( !force && last && !M.seasonDue(last, t) ) return [];
  await game.settings.set(MOD, "memoryTurn", t);
  if ( !last && !force ) return [];
  const out = [];
  for ( const npc of game.actors.filter(isNpc) ) {
    const mem = memOf(npc);
    const done = npc.flags?.[MOD]?.memoryMoves ?? {};
    for ( const [cid, notes] of Object.entries(mem) ) {
      const ch = game.actors.get(cid);
      if ( !ch ) continue;
      const b = M.balance(notes, t, temperFor(npc));
      await mirror(npc, ch);
      const move = M.pickMove({grudge: b.grudge, means: meansOf(npc, ch), last: done[cid] ?? {}, now: t});
      if ( !move ) continue;
      out.push({npc: npc.id, character: ch.id, move: move.key});
      await npc.setFlag(MOD, "memoryMoves", {...done, [cid]: {...(done[cid] ?? {}), [move.key]: t}});
      await chron()?.propose?.({type: TYPE, key: `grudge:${npc.id}:${ch.id}:${move.key}`, title: `${npc.name} acts on a grudge against ${ch.name}`,
        detail: `${move.label}. Grudge ${b.grudge}, ${M.TEMPERS[temperFor(npc)].label.toLowerCase()}. Last: ${notes.at(-1)?.text ?? ""}`,
        data: {npc: npc.id, character: ch.id, move: move.key}});
    }
  }
  return out;
}

async function approve(e) {
  const {npc: nid, character: cid, move} = e?.data ?? {};
  const npc = game.actors.get(nid), ch = game.actors.get(cid);
  if ( !npc || !ch ) return;
  const m = M.MOVES.find(x => x.key === move);
  let did = "";
  try { did = await act(npc, ch, move); } catch (er) { console.error(`${MOD} | grudge`, er); }
  await ChatMessage.create({whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: npc.name},
    content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${npc.name}</b>: ${m?.label ?? move} (${ch.name}).</p><p class="wodx-quiet">${did || "An old grudge. How it plays out is the Storyteller's."}</p></div></div>`});
  Hooks.callAll("wodxGrudgeMove", {npc, character: ch, move});
}

/** B5690 (g1): every grudge move does what it says. Returns what happened, for the card. */
export async function act(npc, ch, move) {
  const s = st(), t = now();
  switch ( move ) {
    case "talk":
      await s?.rumours?.start?.({text: `${npc.name} has a bad word to say about ${ch.name}`, tellers: [npc.id], source: npc.id, about: ch.id, truth: "half"});
      return "The tale is out in the town.";
    case "hunters":
      await s?.hunters?.add?.(s.hunters.regionAt?.(), "manual", {n: 1, why: `${npc.name} told someone where to look`, who: {id: ch.id, name: ch.name}});
      return "The hunters of the region have a name.";
    case "boon": {
      const entry = (s?.ledger?.state?.()?.entries ?? []).find(x => x.status === "open" && x.from?.id === ch.id && x.to?.id === npc.id);
      if ( !entry ) return "";
      await s.ledger.save({...entry, due: GR.boonDue(t), history: [...(entry.history ?? []), {at: t, what: `Called in by ${npc.name}, at the worst time.`}]});
      return `The boon is called in: due within ${GR.BOON_DAYS} days, or it is broken.`;
    }
    case "seat": {
      const Inst = s?.upkeep?.institutions;
      const seat = (Inst?.seatsOf?.(npc.id) ?? []).sort((a, b) => b.rank - a.rank)[0];
      const inst = seat ? Inst.byId(seat.inst) : null;
      const key = inst ? GR.pickLever(Inst.rules.leversFor(inst.kind, seat.rank)) : null;
      if ( !key ) return "";
      const done = await s?.reach?.lever?.({actor: npc, inst, key, target: ch, words: `${npc.name} has not forgotten`});
      return `${npc.name} works against ${ch.name} in ${inst.name}${done?.length ? `: ${done.join("; ")}` : ""}.`;
    }
    case "venture": {
      const out = await s?.upkeep?.ventures?.hit?.("spoiled", {actor: ch.id}, `${npc.name} spoils it`);
      return out?.length ? out.map(o => o.text).join(" ") : "";
    }
    case "kin": {
      const dear = dearOf(ch);
      for ( const d of dear ) {
        await remember(d, ch, {kind: "cold", text: `Heard ${npc.name}'s tale about them`, seen: false});
        if ( (d.flags?.[MOD]?.warmth ?? {})[ch.id] ) await game.modules.get(MOD)?.api?.hearts?.court?.(d, ch, "slight", {why: `${npc.name}'s tale`}).catch(() => null);
      }
      return dear.length ? `${dear.map(d => d.name).join(", ")} heard ${npc.name}'s tale and think less of ${ch.name}.` : "";
    }
    case "violence": {
      await npc.setFlag(MOD, "harm", {character: ch.id, at: t});
      const sent = await harmCheck();
      return sent.length ? sent.join(" ") : `${npc.name} waits for a night when ${ch.name} can be found (a week at most).`;
    }
  }
  return "";
}

/** Those dear to a character: the household's people and anyone who holds warm feelings for them. */
function dearOf(ch) {
  const ids = new Set((ch.flags?.[MOD]?.household ?? []).map(h => h?.id).filter(Boolean));
  for ( const a of game.actors ) if ( isNpc(a) && Number((a.flags?.[MOD]?.warmth ?? {})[ch.id]?.value) > 0 ) ids.add(a.id);
  return [...ids].map(id => game.actors.get(id)).filter(a => isNpc(a) && a.id !== ch.id);
}

/** g1 violence: a waiting harm comes at night to where the character is, through the fight starter. */
let harmBusy = false;
export async function harmCheck() {
  if ( !isActiveGM() || harmBusy ) return [];
  harmBusy = true;
  const out = [];
  try {
    const t = now();
    let night = false;
    try { const R = game.modules.get(MOD)?.api?.routines; await R?.loadCalendar?.(); night = !!R?.describer?.()?.(t)?.isNight; } catch (e) { night = false; }
    for ( const npc of game.actors.filter(a => isNpc(a) && a.flags?.[MOD]?.harm) ) {
      const p = npc.flags[MOD].harm, ch = game.actors.get(p.character);
      if ( !ch || GR.harmLapsed(p, t) ) { await npc.unsetFlag(MOD, "harm"); continue; }
      const where = st()?.reach?.whereIs?.(ch.id);
      if ( !GR.harmNow({night, found: !!where?.token}) ) continue;
      await npc.unsetFlag(MOD, "harm");
      const why = `${npc.name} means ${ch.name} harm`;
      const made = await st()?.reach?.send?.({kind: "secret", scene: where.scene, near: where.token, hostile: true, why, flag: {grudge: npc.id}});
      out.push(`Men sent by ${npc.name} come for ${ch.name} at ${where.scene.name} (${made?.length ?? 0}).`);
    }
  } finally { harmBusy = false; }
  return out;
}

export function registerHandler() {
  chron()?.approvals?.registerHandler?.(TYPE, {label: "An NPC acts on a grudge", approve, reject: async () => {}});
}

/* ---- Heirs (B3349) ---- */

async function onDeath(dead) {
  if ( !isActiveGM() || !on() || !dead ) return;
  const mem = dead.flags?.[MOD]?.memory;
  if ( !mem || !Object.keys(mem).length ) return;
  const heirs = game.actors.filter(a => a.id !== dead.id && (a.flags?.[CREATION]?.lineage?.family?.heirOf?.id === dead.id
    || (dead.flags?.["wodx-storyteller"]?.will?.heirs ?? []).some(h => h.id === a.id)) && isNpc(a));
  const pass = M.inherited(mem, now(), temperFor(dead), dead.name);
  for ( const h of heirs ) for ( const [cid, notes] of Object.entries(pass) ) for ( const x of notes ) await remember(h, cid, x);
}

/* ---- Taking notes from what already happens (B3346) ---- */

export function listen() {
  Hooks.on("wodxAttitude", ({npc, character, change} = {}) => {
    if ( !isActiveGM() ) return;
    const x = M.noteFromAttitude(change, now());
    if ( x ) remember(npc, character, x).catch(e => console.error(`${MOD} | memory`, e));
  });
  Hooks.on("updateWorldTime", () => { turn().catch(e => console.error(`${MOD} | memory`, e)); harmCheck().catch(e => console.error(`${MOD} | harm`, e)); });
  Hooks.on("wodxSkipEnd", () => { turn().catch(e => console.error(`${MOD} | memory`, e)); });
  Hooks.on("updateActor", (actor, change) => {
    const d = change?.flags?.[CREATION]?.chronology?.died;
    if ( d !== undefined && d !== null ) onDeath(actor).catch(e => console.error(`${MOD} | memory`, e));
  });
}

/** From trust.mjs: a trust event an NPC felt about a character becomes a note too. */
export async function fromTrust(whoLike, otherLike, event, why = "") {
  const kind = M.TRUST_KIND[event];
  if ( !kind ) return null;
  return remember(whoLike, otherLike, {kind, text: why || M.KINDS[kind].label, seen: true});
}

/** A player's window: who remembers the character, and how. */
export async function rememberedDialog(charLike = null) {
  const ch = actorOf(charLike) ?? game.user.character ?? game.actors.find(a => a.isOwner && a.hasPlayerOwner);
  if ( !ch ) return ui.notifications.warn("No character to look at.");
  const rows = knownBy(ch).sort((a, b) => a.name.localeCompare(b.name));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  return foundry.applications.api.DialogV2.prompt({window: {title: `Who remembers ${ch.name}`}, classes: ["wodx-dialog", "wnpc-remembered"],
    content: `<p>People who have not forgotten what ${esc(ch.name)} did to them, kind or unkind, as far as ${esc(ch.name)} can tell.</p>
      <ul data-fixed>${rows.map(r => `<li><b>${esc(r.name)}</b>: ${esc(r.word)}</li>`).join("") || "<li>Nobody that the character knows of.</li>"}</ul>`,
    ok: {label: "Close"}});
}

export const rules = M;
