import {MODULE_ID, esc, rule, setting} from "./util.mjs";
import {describeTime} from "./calendar.mjs";
import * as eras from "./eras.mjs";
import * as church from "./church.mjs";
import * as conditions from "./conditions.mjs";
import * as W from "./when-rules.mjs";
import {whenFeats} from "./traits.mjs";

/**
 * WoDX Chronicle 0.14.0: "Only when" and "Then" lists on the Foundry side. when-rules.mjs holds the language; this
 * file reads the world and the character into a context, and carries out outcomes through the module that owns each.
 * Other modules call game.wodx.chronicle.when.check(text, {actor, token, scene}) and .run(text, {...}).
 */

const api = id => game.modules.get(id)?.active ? game.modules.get(id)?.api ?? null : null;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const card = html => `<div class="vta-card wodx-x"><div class="vta-body">${html}</div></div>`;

/** The era ids the language accepts. */
export const eraIds = () => eras.profiles().map(p => String(p.id).toLowerCase());

/** The world now: year, era, hour, night, moon, church day, Future Darkness branch. */
export function worldContext(time = game.time.worldTime) {
  const out = {time: Number(time)};
  try {
    const d = describeTime(time, setting("latitude"));
    Object.assign(out, {year: d.year, hour: d.hour, night: !!d.isNight, moon: d.moon?.name ?? "", date: d.dateLabel});
  } catch (e) { /* no calendar yet */ }
  try { out.era = eras.activeEra()?.profile?.id ?? ""; } catch (e) { out.era = ""; }
  try {
    const c = church.at(time);
    out.feast = c?.active ? (c.feast ?? "") : "";
    out.fast = c?.active ? (c.fast ?? "") : "";
    out.season = c?.active ? (c.season ?? "") : "";
  } catch (e) { /* church days off */ }
  out.branch = rule("futureBranch") ? "future" : "";
  return out;
}

/** Health levels lost, read the way WoDX NPC does (WoDX Combat's Corpus track for wraiths). */
function woundsOf(actor) {
  const ct = api("wodx-combat")?.corpusTrack?.(actor);
  const d = ct?.damage ?? actor?.system?.health?.damage ?? {};
  return (num(d.bashing) ?? 0) + (num(d.lethal) ?? 0) + (num(d.aggravated) ?? 0);
}

/** What a check can read about one character. */
export function actorContext(actor) {
  if ( !actor ) return null;
  const s = actor.system ?? {}, adv = s.advantages ?? {};
  const loc = v => (typeof v === "string" && v.startsWith("wod.") ? game.i18n.localize(v) : String(v ?? ""));
  const fields = {};
  for ( const k of Object.keys(W.FIELDS) ) {
    const v = s[k] ?? s.settings?.[k] ?? (k === "tradition" ? s.affiliation : undefined);
    if ( v !== undefined && v !== null && typeof v !== "object" ) fields[k] = loc(v === "custom" ? s.custom?.[k] : v);
  }
  let kind = "mortal";
  try { kind = api("wodx-combat")?.getKind?.(actor) ?? String(actor.type ?? "mortal").toLowerCase(); } catch (e) { /* default */ }
  const statuses = [...(actor.statuses ?? [])].map(x => String(x).replace(/^wodx-/, ""));
  const conds = new Set(statuses);
  try { for ( const c of conditions.conditionsOf(actor) ?? [] ) conds.add(String(c?.id ?? c)); } catch (e) { /* none */ }
  if ( s.conditions?.isfrenzy ) conds.add("frenzy");
  let factions = [];
  try {
    const st = api("wodx-npc")?.factions?.state?.();
    factions = (st?.factions ?? []).filter(f => (f.members ?? []).includes(actor.id) || f.leader === actor.id).flatMap(f => [f.name, f.key]).filter(Boolean);
  } catch (e) { factions = []; }
  let standing = {};
  try { standing = api("wodx-npc")?.factions?.peopleOf?.(actor.id) ?? {}; } catch (e) { standing = {}; }
  const codex = game.journal?.find(j => j.flags?.["wodx-storyteller"]?.codex === actor.id);
  const path = adv.path ?? {};
  return {
    pc: !!actor.hasPlayerOwner, name: actor.name ?? "", kind, fields, factions, standing,
    // Won social rolls (WoDX Actions' "With this person"), read off the flags so it works with Actions off
    sways: Array.isArray(actor.flags?.["wodx-actions"]?.sways) ? actor.flags["wodx-actions"].sways : [],
    items: [...(actor.items ?? [])].map(i => i.name),
    // Chronicle 0.31.0: what they wear and how they are (WoDX Library's look), for dressed, wears, station, out of time, bloody
    look: (() => { try { return api("wodx-library")?.look?.of?.(actor) ?? null; } catch (e) { return null; } })(),
    codex: codex ? [...(codex.pages ?? [])].map(p => p.name) : [],
    conditions: [...conds],
    ...(() => { try { return whenFeats(actor); } catch (e) { return {feats: [], powers: []}; } })(),
    traits: {
      blood: num(adv.bloodpool?.temporary), willpower: num(adv.willpower?.temporary), rage: num(adv.rage?.temporary), gnosis: num(adv.gnosis?.temporary),
      glamour: num(adv.glamour?.temporary), banality: num(adv.banality?.temporary), quintessence: num(s.quintessence?.temporary ?? adv.quintessence?.temporary),
      paradox: num(s.paradox?.temporary), humanity: num(path.permanent ?? path.value), faith: num(adv.faith?.permanent),
      wounds: woundsOf(actor), generation: num(s.generation) !== null ? num(s.generation) - (num(s.generationmod) ?? 0) : null,
      arete: num(s.arete?.permanent ?? adv.arete?.permanent)
    }
  };
}

/** The NPC a check is about (a talk line, a social roll): its id, name and attitude toward the character. */
export function npcContext(npc, actor) {
  const n = npc?.actor ?? npc;
  if ( !n?.id ) return null;
  let attitude = null;
  try { attitude = api("wodx-npc")?.attitude?.of?.(n, actor)?.step ?? null; } catch (e) { attitude = null; }
  // Chronicle 0.31.0: the NPC's station, the character's dress against it, and how a disguise went with this NPC
  let station = null, dressed = null, disguise = null;
  try {
    const L = api("wodx-library")?.look;
    const d = actor?.flags?.["wodx-actions"]?.disguise?.[n.id];
    if ( d ) disguise = d.held ? "held" : "seen";
    if ( L ) {
      const tpl = n.getFlag?.("wodx-npc", "behavior")?.template ?? null;
      station = L.station(n, tpl);
      const look = L.asSeen(L.of(actor), disguise === "held");
      const year = Number(api("wodx-chronicle")?.eras?.currentYear?.()) || null;
      dressed = station === null ? null : L.dressedVs(look, station, year);
    }
  } catch (e) { station = null; }
  return {id: n.id, name: n.name ?? "", attitude, station, dressed, disguise};
}

/** The full context for a check. opts: {actor, token, scene, time, npc}. */
export function contextFor({actor = null, token = null, scene = null, time, npc = null} = {}) {
  const a = actor ?? token?.actor ?? null;
  return {...worldContext(time ?? game.time.worldTime), actor: actorContext(a), npc: a ? npcContext(npc, a) : null, scene: scene?.name ?? token?.parent?.name ?? canvas?.scene?.name ?? ""};
}

/** Check an "Only when" text. Returns when-rules' {ok, failed, unknown, problems}. */
export function check(text, opts = {}) {
  if ( !String(text ?? "").trim() ) return {ok: true, failed: [], unknown: [], problems: []};
  return W.checkWhen(W.parseWhen(text, {eras: eraIds()}), contextFor(opts));
}

/**
 * Carry out a "Then" text. Runs on the active Storyteller's client only (outcomes change shared things).
 * opts: {actor, token, scene, label, event}. Returns {done: [does], skipped: [why]}.
 */
export async function run(text, opts = {}) {
  const {actions, problems} = W.parseThen(text);
  const done = [], skipped = [...problems];
  if ( !game.user?.isGM ) return {done, skipped: ["only the Storyteller's client carries out outcomes"]};
  const actor = opts.actor ?? opts.token?.actor ?? null;
  const scene = opts.scene ?? opts.token?.parent ?? canvas?.scene ?? null;
  const ctx = worldContext();
  const vars = {name: actor?.name ?? opts.token?.name ?? "someone", place: opts.label || scene?.name || "here", date: ctx.date ?? ""};
  for ( const a of actions ) {
    const text = W.fillText(a.text, vars);
    try {
      if ( a.does === "tell" ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(), content: card(`<p>${esc(text)}</p>`)});
      else if ( a.does === "whisper" ) {
        const to = actor ? game.users.filter(u => !u.isGM && actor.testUserPermission?.(u, "OWNER")).map(u => u.id) : [];
        if ( !to.length ) { skipped.push(`whisper: ${vars.name} has no player`); continue; }
        await ChatMessage.create({speaker: {alias: scene?.name ?? "WoDX"}, whisper: [...to, ...gmIds()], content: card(`<p>${esc(text)}</p>`)});
      }
      else if ( a.does === "alarm" ) {
        const npc = api("wodx-npc");
        if ( !npc?.routines?.raiseAlarmFull ) { skipped.push("alarm: WoDX NPC is off"); continue; }
        await npc.routines.raiseAlarmFull(scene, text || `${vars.name} at ${vars.place}`);
      }
      else if ( a.does === "event" ) {
        Hooks.callAll("wodxMapEvent", {...(opts.event ?? {}), v: 1, kind: "trigger", scene: scene?.id ?? null, at: game.time.worldTime, noise: "silent",
          who: opts.token?.uuid ?? actor?.uuid ?? null, whoName: vars.name, objectName: text || vars.place, objectKind: "when", state: (text || vars.place).toLowerCase().slice(0, 60), undone: false});
      }
      else if ( a.does === "cue" ) {
        const atm = api("wodx-atmosphere");
        if ( !atm?.kit?.cue ) { skipped.push("cue: WoDX Atmosphere is off"); continue; }
        if ( !atm.kit.cue(a.text) ) { skipped.push(`cue: no cue called ${a.text}, or cues are off`); continue; }
      }
      else if ( a.does === "standing" ) {
        const fx = api("wodx-npc")?.factions;
        if ( !fx?.adjustPeople ) { skipped.push("standing: WoDX NPC is off"); continue; }
        if ( !actor ) { skipped.push("standing: no character"); continue; }
        const n = await fx.adjustPeople(a.faction, actor.id, {delta: a.delta, to: a.to});
        if ( n === null || n === undefined ) { skipped.push(`standing: no faction called ${a.faction}`); continue; }
      }
      else if ( a.does === "fight" ) {
        const fight = game.wodxCombat?.fight;
        if ( !fight?.start ) { skipped.push("fight: WoDX Combat is off"); continue; }
        const tok = opts.token?.document ?? opts.token ?? null;
        if ( !tok || tok.parent?.id !== canvas?.scene?.id ) { skipped.push("fight: no character on the scene in view"); continue; }
        const me = canvas.tokens.get(tok.id), npcApi = api("wodx-npc");
        const per = ["ft", "feet", "foot", "'"].includes(String(canvas.scene.grid?.units ?? "").toLowerCase()) ? 3 : 1;
        const npcs = canvas.tokens.placeables.filter(t => t.actor && t.id !== tok.id && !t.actor.hasPlayerOwner && !t.document.hidden).map(t => {
          let yards = null; try { yards = canvas.grid.measurePath([me.center, t.center]).distance / per; } catch (e) { /* none */ }
          return {id: t.id, name: t.name, household: t.actor.getFlag?.("wodx-npc", "behavior")?.household ?? "", step: npcApi?.attitude?.of?.(t.actor, actor)?.step ?? 0, yards};
        });
        let reach = 30; try { reach = Number(game.settings.get("wodx-combat", "fightSightYards")) || 30; } catch (e) { /* default */ }
        const foes = W.fightFoes(a.text, npcs, {reach});
        if ( !foes.length ) { skipped.push(`fight: no one here to fight${a.text ? ` (${a.text})` : ""}`); continue; }
        const r = await fight.start({scene: canvas.scene, tokens: [tok.id, ...foes], source: "outcome", why: `${vars.name} at ${vars.place}`});
        if ( r?.done === "off" ) { skipped.push("fight: fights are set to start by hand"); continue; }
      }
      else if ( a.does === "ledger" ) {
        const st = api("wodx-storyteller");
        if ( !st?.ledger?.save ) { skipped.push("ledger: WoDX Storyteller is off"); continue; }
        await st.ledger.save({kind: a.kind, what: text, from: actor ? {id: actor.id, name: actor.name} : "", to: ""});
      }
      done.push(a.does);
    } catch (err) {
      console.error(`${MODULE_ID} | outcome ${a.does}`, err);
      skipped.push(`${a.does}: ${err.message}`);
    }
  }
  if ( skipped.length ) await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: gmIds(),
    content: card(`<p>Some of what was set to happen at ${esc(vars.place)} did not:</p><ul>${skipped.map(s => `<li>${esc(s)}</li>`).join("")}</ul>`)});
  return {done, skipped};
}

/** The Storyteller's checker: write a list and see whether the selected token passes it now. */
export async function checker(initial = "") {
  const D = foundry.applications?.api?.DialogV2;
  if ( !D ) return null;
  const help = W.helpText().map(l => `<li>${esc(l)}</li>`).join("");
  return D.wait({
    window: {title: "Check an \"Only when\" list"}, position: {width: 520},
    content: `<p>Select a token, write the list, and press Check. Nothing is changed.</p>
      <textarea name="when" rows="8" style="width:100%;font-family:monospace">${esc(initial)}</textarea>
      <details><summary>What you can write</summary><ul>${help}</ul></details><div class="wodx-when-out"></div>`,
    buttons: [{action: "check", label: "Check", default: true, callback: (event, button, dialog) => {
      const root = dialog.element ?? dialog;
      const text = root.querySelector("textarea[name=when]")?.value ?? "";
      const tok = canvas?.tokens?.controlled?.[0] ?? null;
      const r = check(text, {token: tok?.document ?? null, actor: tok?.actor ?? null});
      const out = root.querySelector(".wodx-when-out");
      const who = tok ? esc(tok.name) : "No token is selected";
      if ( out ) out.innerHTML = r.problems.length ? `<p><b>Fix first:</b></p><ul>${r.problems.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`
        : r.ok ? `<p><b>${who}: passes.</b></p>` : `<p><b>${who}: does not pass.</b></p><ul>${r.failed.map(p => `<li>${esc(p)}</li>`).join("")}</ul>`;
      return false;
    }}, {action: "close", label: "Close"}],
    rejectClose: false
  });
}

export {W as rules};
