import * as RR from "./rumour-rules.mjs";
import * as T from "./tale-rules.mjs";
import * as Media from "../../wodx-chronicle/scripts/media-rules.mjs";
import {MOD, esc, chron, npc, isActiveGM, isPC, setting, mutate} from "./core.mjs";
import {nightNow} from "./night.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * The rumour network: a rumour, once started (from the night's draw when approved, or by hand), passes between the
 * Storyteller's characters night by night, along factions and shared scenes. The Storyteller sees who has heard what,
 * so a player asking around meets the people who know.
 */

const all = c => (c ? [...(c.contents ?? c)] : []);
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch { return false; } };
const isNpc = a => !!a && !isPC(a) && !/group/i.test(String(a.type ?? ""));

export function registerRumourSettings() {
  game.settings.register(MOD, "rumours", {scope: "world", config: false, type: Array, default: [], onChange: () => RumoursApp.refresh()});
  game.settings.register(MOD, "rumourNetwork", {name: "Rumours spread between people", hint: "A rumour from the night's draw, once approved, or one you start by hand, passes between your characters each night along factions and shared scenes.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "rumourGarble", {name: "Rumours change in the telling", hint: "Each time someone passes a rumour on, it may twist a little. The rumour mill counts the twists for you to play; the words stay yours.",
    scope: "world", config: true, type: Boolean, default: false});
  // B3350: public deeds become tales that change as they are retold
  game.settings.register(MOD, "tales", {name: "Deeds become tales", hint: "What characters do in public (a standing won or lost, a boon kept or broken) starts a tale that NPCs pass on and retell their own way. NPCs meet a character with the version they heard in mind.",
    scope: "world", config: true, type: Boolean, default: true});
}
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const futureOn = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
/** The chronicle's homeland (0.57.0): word travels by its years, the wireless in Buenos Aires before Brno. */
const homeNow = () => { try { const h = chron()?.world?.homeland?.(); return (typeof h === "string" ? h : h?.id) ?? null; } catch (e) { return null; } };
/** How the year carries word, for the window. */
export const mediaNow = () => Media.mediaFor(yearNow(), {future: futureOn(), region: homeNow()});
export const rumours = () => RR.normRumours(setting("rumours"));

/** Who talks to whom now: each faction's members, and the characters with tokens on each scene (not players'). */
export function contacts() {
  const groups = [];
  try { for ( const f of npc()?.factions?.state?.()?.factions ?? [] ) groups.push([f.leader, ...(f.members ?? [])].filter(id => isNpc(game.actors.get(id)))); } catch (e) { /* no factions */ }
  for ( const s of all(game.scenes) ) groups.push(all(s.tokens).map(t => t.actorId).filter(id => isNpc(game.actors.get(id))));
  // 0.62.0: NPCs tell their friends, lovers, kin and servants too (WoDX NPC's ties)
  try { groups.push(...RR.tiePairs(npc()?.ties?.edges?.() ?? [], id => isNpc(game.actors.get(id)))); } catch (e) { /* ties off */ }
  return RR.buildContacts({groups});
}
const rand = key => chron()?.gen?.random?.(key) ?? Math.random;

/** Start a rumour. tellers: actor ids who know it first; none given, one is picked (the scene in view first). */
export async function startRumour({text, tellers = [], big = false, source = null, about = null, truth = "unknown"} = {}) {
  if ( !game.user.isGM || !String(text ?? "").trim() ) return null;
  const id = foundry.utils.randomID();
  let first = (tellers ?? []).filter(Boolean);
  if ( !first.length ) {
    const here = all(canvas?.scene?.tokens).map(t => t.actorId).filter(x => isNpc(game.actors.get(x)));
    const t = RR.firstTeller(contacts(), rand(`rumour:${id}:first`), here);
    if ( t ) first = [t];
  }
  const at = await nightNow();
  const r = RR.normRumour({id, text, started: game.time?.worldTime ?? 0, night: at.jdn, knownBy: first, big: !!big, source: source ?? first[0] ?? null, about, truth, log: [{night: at.jdn, heard: first.length, label: at.label}]});
  await mutate("rumours", cur => ({value: [...RR.normRumours(cur), r]}));
  return r;
}

/** B3351: how each knower of a tale leans toward the one it is about (their attitude in WoDX NPC, or a gossip's Nature). */
const GOSSIP_NATURES = /^(celebrant|bon vivant|conniver|child|gallant|jester|bravo)/i;
function leaningsFor(r) {
  const out = {};
  if ( !r.about ) return out;
  for ( const id of r.knownBy ) {
    const a = game.actors.get(id);
    let att = null;
    try { const x = npc()?.attitude?.of?.(id, r.about); att = x?.met ? x.step : null; } catch (e) { att = null; }
    out[id] = T.leaningOf({att, gossip: GOSSIP_NATURES.test(String(a?.system?.nature ?? "")) || /harp(y|ies)|galliard/i.test(String(a?.name ?? ""))});
  }
  return out;
}

const fameOf = a => { for ( const i of a?.items ?? [] ) if ( i.type === "Feature" && /^fame\b/i.test(i.name ?? "") ) return Number(i.system?.value) || 0; return Number(a?.system?.backgrounds?.fame?.value) || 0; };

/**
 * B3350, B3353: start a tale about a character's deed. did: what they did ("broke a boon to the Prince"); tone -3..3;
 * where: a place name; crowd: done in front of many. Tellers: the ones named, else people near, one more for each dot of
 * Fame. Returns the rumour, or null when tales are off.
 */
export async function startTale({about, did, where = null, tone = 0, tellers = [], crowd = false, truth = "true", big = false} = {}) {
  if ( !game.user.isGM || setting("tales") === false ) return null;
  const a = game.actors.get(about?.id ?? about);
  if ( !a || !String(did ?? "").trim() ) return null;
  const tale = T.normTale({who: a.name, did, where: where === null ? (canvas?.scene?.name ?? "") : where, tone, how: T.HOW[String(T.normTale({tone}).tone)]});
  let first = (tellers ?? []).filter(id => isNpc(game.actors.get(id)));
  const want = T.firstTellers({fame: fameOf(a), crowd});
  if ( first.length < want ) {
    const net = contacts();
    const here = all(canvas?.scene?.tokens).map(t => t.actorId).filter(x => isNpc(game.actors.get(x)) && !first.includes(x));
    const pool = [...here, ...Object.keys(net).filter(x => net[x].length && !first.includes(x) && !here.includes(x)).sort()];
    first = [...first, ...pool.slice(0, want - first.length)];
  }
  const r = await startRumour({text: T.taleText(tale), tellers: first, big, source: first[0] ?? null, about: a.id, truth});
  if ( !r ) return null;
  let out = r;
  await mutate("rumours", cur => ({value: RR.normRumours(cur).map(x => x.id === r.id ? (out = RR.normRumour({...x, tale, versions: [tale], heardAs: Object.fromEntries(first.map(id => [id, 0]))})) : x)}));
  return out;
}

/** B3352: the first-meeting shift an NPC carries from the tales they heard about a character (-1, 0, +1). */
export const toneFor = (npcId, charId) => T.toneFor(rumours(), npcId, charId);
/** B3354: what is said about a character, grouped by the knowers' first faction. */
export function aboutView(charId) {
  const facs = (() => { try { return npc()?.factions?.state?.()?.factions ?? []; } catch (e) { return []; } })();
  const groupOf = id => facs.find(f => f.leader === id || (f.members ?? []).includes(id))?.name ?? "the town";
  return T.aboutView(rumours(), charId, groupOf);
}

/** B3354: the players' window, What they say about you. */
export async function aboutDialog(charLike = null) {
  const ch = game.actors.get(charLike?.id ?? charLike) ?? game.user.character ?? all(game.actors).find(a => a.isOwner && isPC(a));
  if ( !ch ) return ui.notifications.warn("No character to look at.");
  const rows = aboutView(ch.id);
  const tone = t => (t <= -2 ? "dark" : t < 0 ? "unkind" : t >= 2 ? "glowing" : t > 0 ? "kind" : "plain");
  return foundry.applications.api.DialogV2.prompt({window: {title: `What they say about ${ch.name}`}, classes: ["wodx-dialog", "wst-about"],
    content: `<p>The tales going round about ${esc(ch.name)}, as each part of the town tells them, and how many have heard each version.</p>
      ${rows.map(g => `<h4>${esc(g.community)} (${g.heard})</h4><ul data-fixed>${g.versions.map(v => `<li>${esc(v.text)} <small>(${tone(v.tone)}, ${v.count})</small></li>`).join("")}</ul>`).join("") || "<p>Nobody is talking about them that the character knows of.</p>"}`,
    ok: {label: "Close"}});
}

/** Work through the nights since each rumour last moved. once: just one more night for each, now. */
let ticking = Promise.resolve();
export function tick({force = false, once = null} = {}) {
  ticking = ticking.then(async () => {
    if ( !isActiveGM() || (skipping() && !force) ) return [];
    if ( setting("rumourNetwork") === false && !once ) return [];
    const at = await nightNow();
    const net = contacts();
    const moved = [];
    const year = yearNow(), future = futureOn(), region = homeNow(), twist = setting("rumourGarble") ? Media.TWIST_CHANCE : 0;
    const taleTwist = setting("tales") !== false ? Media.TWIST_CHANCE : twist;
    await mutate("rumours", cur => {
      const list = RR.normRumours(cur).map(r => {
        if ( once && r.id !== once ) return r;
        const nights = once ? [(r.night ?? at.jdn) + 1] : RR.nightsDue(r, at.jdn);
        let x = r;
        for ( const n of nights ) {
          const {rumour, heard} = RR.spreadNight(x, net, rand(`rumour:${r.id}:${n}`), {heat: RR.heatAfterDoubt(Media.rumourHeat(year, {big: r.big, future, region}), x.doubt),
            twist: x.tale ? taleTwist : twist, leanings: x.tale ? leaningsFor(x) : {}});
          x = {...rumour, night: once ? r.night : n, log: [...rumour.log, ...(heard.length ? [{night: n, heard: heard.length, label: once ? "by hand" : ""}] : [])].slice(-40)};
          if ( heard.length ) moved.push(r.id);
        }
        return x;
      });
      return {value: list};
    });
    return [...new Set(moved)];
  }).catch(e => { console.error(`${MOD} |`, e); return []; });
  return ticking;
}

export async function endRumour(id) { return mutate("rumours", cur => ({value: RR.normRumours(cur).map(r => r.id === id ? {...r, ended: true} : r)})); }
export async function removeRumour(id) { return mutate("rumours", cur => ({value: RR.normRumours(cur).filter(r => r.id !== id)})); }
/** What one character has heard. */
export const heardBy = actorId => rumours().filter(r => r.knownBy.includes(actorId));

/** B3350: a boon or a promise kept or broken where a player character is the debtor becomes a tale. */
async function onBoon({entry, status} = {}) {
  if ( !isActiveGM() || !entry?.from?.id || !["kept", "broken"].includes(status) ) return;
  const a = game.actors.get(entry.from.id);
  if ( !isPC(a) ) return;
  const what = entry.kind === "boon" ? "a boon" : entry.kind === "oath" ? "an oath" : "a promise";
  const to = entry.to?.name ? ` to ${entry.to.name}` : "";
  await startTale({about: a.id, did: status === "kept" ? `kept ${what}${to}` : `broke ${what}${to}`, tone: status === "kept" ? 1 : -2,
    tellers: entry.to?.id && isNpc(game.actors.get(entry.to.id)) ? [entry.to.id] : [], where: ""});
}

export function registerRumourHooks() {
  Hooks.on("wodxBoonSettled", p => { onBoon(p).catch(e => console.error(`${MOD} | tales`, e)); });
  Hooks.on("updateWorldTime", () => { if ( !skipping() ) tick(); });
  Hooks.on("wodxSkipEnd", () => { if ( !chron()?.isHeld?.() ) tick({force: true}); });
}

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};

export class RumoursApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-rumours",
    classes: ["wodx", "wodx-rumours-app"],
    window: {title: "The rumour mill", icon: "fa-solid fa-comments", resizable: true},
    position: {width: 620, height: "auto"},
    actions: {start: RumoursApp.#onStart, spread: RumoursApp.#onSpread, end: RumoursApp.#onEnd, remove: RumoursApp.#onRemove}
  };
  static #instance;
  static open() { if ( !game.user.isGM ) return null; this.#instance ??= new RumoursApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const list = rumours().sort((a, b) => b.started - a.started);
    const name = id => game.actors.get(id)?.name ?? "someone gone";
    const people = all(game.actors).filter(isNpc).sort((a, b) => a.name.localeCompare(b.name));
    const net = contacts();
    const linked = Object.keys(net).length;
    const row = r => {
      const names = r.knownBy.map(name);
      return `<div class="wstory-rumour" data-search-item data-search-text="${esc(`${r.text} ${names.join(" ")}`)}">
        <div><strong>${esc(r.text)}</strong></div>
        <div class="wodx-quiet">${r.ended ? "Ended." : RR.live(r) ? "Spreading." : "Gone quiet: nobody new has heard it for a while."} ${r.big ? "Big news. " : ""}${r.twists ? `Changed in the telling ${r.twists === 1 ? "once" : `${r.twists} times`}. ` : ""}Known to ${r.knownBy.length}${names.length ? `: ${esc(names.slice(0, 12).join(", "))}${names.length > 12 ? ` and ${names.length - 12} more` : ""}` : ""}.</div>
        <div class="wodx-buttons">${RR.live(r) ? `<button type="button" data-action="spread" data-id="${esc(r.id)}">Spread a night now</button><button type="button" data-action="end" data-id="${esc(r.id)}">End it</button>` : ""}<button type="button" data-action="remove" data-id="${esc(r.id)}">Remove</button></div></div>`;
    };
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <p class="wodx-quiet">A rumour passes each night from those who know it to the people they talk to: their faction, and anyone with a token on the same scene. ${linked} of your characters talk to someone now.${setting("rumourNetwork") === false ? " Spreading on its own is off in Configure Settings." : ""} The night's draw starts one when you approve it. Word travels now by ${esc(mediaNow().label.toLowerCase())}: each who knows tells ${mediaNow().heat} a night${mediaNow().flood ? ", and big news reaches everyone they can in one night" : mediaNow().bigHeat ? `, ${mediaNow().bigHeat} for big news` : ""}.</p>
      <section><h3>Start a rumour</h3><form class="wstory-rumour-new">
        <div class="form-group stacked"><label>What is said</label><input type="text" name="text" maxlength="1000" placeholder="They say the miller's wife walks at night"></div>
        ${people.length > 8 ? searchBox("select[name=teller]", "Search people…", "Search people") : ""}
        <div class="form-group"><label>Who starts it</label><select name="teller"${people.length > 8 ? "" : " data-fixed"}><option value="">Someone in the scene in view</option>${people.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>
        <div class="form-group"><label><input type="checkbox" name="big"> Big news (the print shop, the papers, the wireless or the Net would carry it)</label></div>
        <div class="wodx-buttons"><button type="button" data-action="start"><i class="fa-solid fa-comment-dots"></i> Start it</button></div></form></section>
      <section><h3>Rumours (${list.length})</h3>${searchBox(".wstory-rumours", "Search rumours or people…", "Search rumours or who knows them")}
        <div class="wstory-rumours">${list.map(row).join("") || "<p class=\"wodx-quiet\">None yet.</p>"}</div></section>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onStart(event, target) {
    const f = target.closest("form").elements;
    if ( !f.text.value.trim() ) return ui.notifications.warn("Say what the rumour is first.");
    const r = await startRumour({text: f.text.value, tellers: f.teller.value ? [f.teller.value] : [], big: !!f.big?.checked});
    if ( r && !r.knownBy.length ) ui.notifications.warn("Nobody was found to start it: name who starts it, or view a scene with people on it.");
  }
  static async #onSpread(event, target) { await tick({force: true, once: target.dataset.id}); }
  static async #onEnd(event, target) { await endRumour(target.dataset.id); }
  static async #onRemove(event, target) { await removeRumour(target.dataset.id); }
}

/** 0.62.0: someone denies a rumour or works to stop it: each denial slows how fast it spreads (at most three). */
export async function doubtRumour(id, {by = null} = {}) {
  if ( !game.user.isGM ) return null;
  let out = null;
  await mutate("rumours", cur => ({value: RR.normRumours(cur).map(r => r.id === id ? (out = {...r, doubt: Math.min(3, r.doubt + 1), log: [...r.log, {denied: by ?? true}]}) : r)}));
  return out;
}
/** 0.62.0: the rumours about a character, with who started them and how true they are, for the Storyteller. */
export const rumoursAbout = actorId => rumours().filter(r => r.about === actorId);
