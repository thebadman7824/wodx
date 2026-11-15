/**
 * WoDX NPC: NPCs of every line refill their own pools (B6319). The Foundry side of line-refill-rules.
 *
 * Once a night (and once at the end of a time skip) the Storyteller's client:
 *   1. marks each NPC shapechanger, mage and mummy for WoDX Actions' daily refill (the same rolls a player's character
 *      gets once marked in its dialog), once only, so a Storyteller who clears the mark later is not overridden;
 *   2. rolls tonight's refill for each NPC changeling, wraith and demon, writes the pool, floats the gain over the
 *      token and whispers the Storyteller one card for the night.
 * NPC rolls stay with the Storyteller (standing rule 19). Setting npcRefill turns it off.
 */
import * as RR from "./line-refill-rules.mjs";
import * as LM from "./line-mend.mjs";

const MOD = "wodx-npc", ACT = "wodx-actions";
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const act = () => (game.modules.get(ACT)?.active ? game.modules.get(ACT).api : null);
const isActiveGM = () => game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return true; } };
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const chron = () => game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api : null;

export function registerSettings() {
  game.settings.register(MOD, "npcRefill", {name: "NPCs refill their own pools", hint: "Each night NPCs of every line regain their line's pool as the book says: Gnosis, Quintessence and Sekhem by WoDX Actions' daily rolls, Glamour, Pathos and Faith here.",
    scope: "world", config: true, type: Boolean, default: true});
}

const isNpc = a => !!a && !a.hasPlayerOwner && a.type !== "Group";
const bg = (a, name) => num([...(a?.items ?? [])].find(i => i.type === "Feature" && /background/i.test(i.system?.type ?? "") && i.name.trim().toLowerCase().startsWith(name))?.system?.value);
const attr = (a, k) => { const x = a?.system?.attributes?.[k]; return x ? num(x.total ?? x.value) : 0; };
function ability(a, k) {
  const flat = a?.system?.abilities?.[k];
  if ( flat && flat.value !== undefined ) return num(flat.value);
  const it = [...(a?.items ?? [])].find(i => (i.type === "Ability" || (i.type === "Trait" && /secondability/.test(i.system?.type ?? ""))) && (i.system?.id === k || i.name.trim().toLowerCase() === k));
  return num(it?.system?.value);
}
/** A pool read through WoDX Actions' resources (sheet field or Advantage item), with a fallback to the sheet. */
function pool(a, id) {
  const r = act()?.profiles?.resource?.(a, id);
  if ( r?.ok ) return {temp: num(r.value), cap: num(r.perm) || num(r.max) || (id === "pathos" ? 10 : 0)};
  const p = a?.system?.advantages?.[id] ?? {};
  return {temp: num(p.temporary), cap: num(p.permanent) || num(p.max) || (id === "pathos" ? 10 : 0)};
}
async function addPool(a, id, n) {
  if ( !n ) return 0;
  const P = act()?.profiles;
  if ( P?.adjust && P.resource?.(a, id)?.ok ) { await P.adjust(a, id, n, {note: false}); return n; }
  const p = pool(a, id);
  await a.update({[`system.advantages.${id}.temporary`]: Math.min(p.cap || 99, p.temp + n)});
  return n;
}

/** The sheet as line-refill-rules reads it. */
export function sheetOf(a) {
  const passions = [...(a?.items ?? [])].filter(i => i.type === "Trait" && i.system?.type === "wod.types.passion").map(i => num(i.system?.value ?? i.system?.level));
  return {glamour: pool(a, "glamour"), pathos: pool(a, "pathos"), faith: pool(a, "faith"), holdings: bg(a, "holdings"), dreamers: bg(a, "dreamers"),
    perception: attr(a, "perception"), kenning: ability(a, "kenning"), manipulation: attr(a, "manipulation"),
    inspire: Math.max(...["empathy", "performance", "leadership", "intimidation"].map(k => ability(a, k))), passion: Math.max(0, ...passions), memoriam: bg(a, "memoriam"),
    willpower: num(a?.system?.advantages?.willpower?.permanent) || pool(a, "willpower").cap, thralls: (a?.flags?.[ACT]?.demon?.thralls ?? []).filter(t => !t.broken).length};
}

async function faces(dice) {
  if ( num(dice) <= 0 ) return [];
  const r = await new Roll(`${Math.max(1, Math.floor(num(dice)))}d10`).evaluate();
  return r.dice?.[0]?.results?.map(x => x.result) ?? [];
}

/** Mark an NPC for WoDX Actions' daily refill of its line, once. Returns the line's words when it was marked. */
export async function enroll(a, line = LM.keyOf(a)) {
  if ( !RR.ENROLL[line] || a.getFlag?.(MOD, "refillMarked") ) return null;
  const f = a.flags?.[ACT] ?? {};
  const patch = RR.enrollPatch(line, {meditates: f.meditates, m20: f.m20, mummy: f.mummy}, {node: bg(a, "node")});
  if ( patch ) await a.setFlag(ACT, patch.key, patch.value);
  await a.setFlag(MOD, "refillMarked", true);
  return patch ? RR.ENROLL[line].what : null;
}

/** Tonight's own refill for one NPC. Returns [{word, gained, pool}] for the card. */
export async function refillOne(a, night, line = LM.keyOf(a)) {
  const f = a.getFlag?.(MOD, "refill") ?? {};
  const steps = RR.refillSteps(line, sheetOf(a), f, night);
  if ( !steps.length ) return [];
  const out = [], mark = {night};
  for ( const st of steps ) {
    const s = sheetOf(a);
    let mine = 0, theirs = 0, botch = false;
    if ( st.fixed === undefined ) {
      const fs = await faces(st.contest ? st.contest.dice : st.dice), diff = st.contest ? st.contest.diff : st.diff;
      mine = RR.successes(fs, diff) + num(st.auto);
      botch = !num(st.auto) && RR.botched(fs, diff);
      if ( st.contest ) theirs = RR.successes(await faces(st.contest.vs), st.contest.vsDiff);
    }
    const gained = RR.stepGain(st, {mine, theirs}, s[st.pool]);
    if ( gained ) {
      await addPool(a, st.pool, gained);
      LM.floatOver(a, RR.gainWord(st.pool, gained), RR.POOL_COLOUR[st.pool]);
    }
    Object.assign(mark, st.mark ?? {}, RR.reverieMark(st, {succ: mine, botch}, night));
    out.push({word: st.word, ref: st.ref, gained, pool: st.pool, mine, theirs, botch, reverie: st.reverie, due: mark.reverieDue, fixed: st.fixed !== undefined});
  }
  await a.setFlag(MOD, "refill", {...f, ...mark});
  return out;
}

let busy = false;
/** The night's pass over every NPC. force: run even when the night key has not turned (a skip's end, a gate). */
export async function runNight({force = false} = {}) {
  if ( busy || !isActiveGM() || !setting("npcRefill") ) return null;
  if ( !force && chron()?.isSkipping?.() ) return null;
  const night = RR.nightOf(game.time.worldTime);
  if ( !force && num(game.settings.get(MOD, "refillNight")) === night ) return null;
  busy = true;
  const rows = [], marked = [];
  try {
    await game.settings.set(MOD, "refillNight", night);
    for ( const a of game.actors.filter(isNpc) ) {
      const line = LM.keyOf(a);
      if ( RR.ENROLL[line] ) { const w = await enroll(a, line); if ( w ) marked.push(`${esc(a.name)}: ${esc(w)}`); continue; }
      if ( !RR.OWN.has(line) ) continue;
      const got = await refillOne(a, night, line);
      const lines = got.filter(g => g.gained).map(g => `${esc(RR.gainWord(g.pool, g.gained, g.word))}`);
      for ( const g of got.filter(x => x.reverie === "study" && x.due !== undefined && x.due !== null) ) { const n = num(g.due) - night; lines.push(`finds what moves a Dreamer: ${n > 1 ? `${n} nights with them` : "a few hours with them"} before the Reverie`); }
      for ( const g of got.filter(x => x.reverie === "inspire" && !x.gained) ) lines.push(g.botch ? "pushes the Dreamer too hard: a creative block, and the musing starts over" : "the musing fails: another week with the Dreamer");
      if ( lines.length ) rows.push(`<li><b>${esc(a.name)}</b>: ${lines.join(", ")}</li>`);
    }
    if ( rows.length || marked.length ) {
      await ChatMessage.create({whisper: gmIds(), speaker: {alias: "NPCs refill"},
        content: `<div class="wodx-card wnpc-refill"><h3>NPCs refill their pools</h3>${rows.length ? `<ul>${rows.join("")}</ul>` : ""}${marked.length ? `<p>Marked for the daily roll in WoDX Actions: ${marked.join("; ")}.</p>` : ""}
          <p class="wodx-quiet">Sanctuary and Reverie (C20 pdf 170, 260-263); Passions and Memoriam (Wraith 20th pdf 370, 180); reaping (Demon p. 250). Gnosis, Quintessence and Sekhem come from the WoDX Actions daily rolls.</p></div>`});
    }
    return {night, rows: rows.length, marked: marked.length};
  } finally { busy = false; }
}

export function listen() {
  game.settings.register(MOD, "refillNight", {scope: "world", config: false, type: Number, default: -1});
  Hooks.on("updateWorldTime", () => { runNight().catch(e => console.error(`${MOD} | NPC refill`, e)); });
  Hooks.on("wodxSkipEnd", () => { runNight({force: true}).catch(e => console.error(`${MOD} | NPC refill`, e)); });
}
