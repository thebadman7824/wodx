/**
 * A ghoul's monthly need, carried out by itself (B5050 to B5054; Ben's rule that what the rules say happens, happens).
 * Every ghoul, human or animal, player's or Storyteller's: the active Storyteller's client checks once a game day.
 *   - each month unfed takes the month's vitae off the sheet, then Discipline dots, Potence last (B5050)
 *   - a craving roll each month unfed; a botch means it must drink at once (B5051, hook wodxGhoulCraving)
 *   - an animal with its vitae gone ages a year a week, dies past its span, turns to dust past twice that (B5052)
 *   - shown on the token: red "-1 vitae" rises, an empty ghoul greys, a dead one takes the dead mark, dust fades (B5053)
 *   - a drink from the domitor (WoDX Creation's Give vitae or Feed vitae, or the card's button) starts the month again
 *     and puts the token's colour back (B5054)
 * WoDX Clan features' own ghoul card stands aside while this is on.
 */
import {MODULE_ID, esc, isActiveGM} from "./util.mjs";
import * as R from "./ghoul-need-rules.mjs";
import {getEngine} from "./calendar.mjs";
import {isSkipping} from "./skip.mjs";
import {MONTH} from "./terms.mjs";

const FLAG = "ghoulNeed";
const SIG = "sig";
const DAY = R.DAY;
const GREY = "#8a8a8a";

const now = () => game.time?.worldTime ?? 0;
const creation = () => game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api : null;
export const on = () => { try { return game.settings.get(MODULE_ID, "ghoulNeed") !== false; } catch (e) { return true; } };

export function registerGhoulNeedSettings() {
  // Time skips' spans (world time): the skip's own plan settles what passes in those years, so the monthly need
  // does not count them again
  game.settings.register(MODULE_ID, "ghoulNeedSkips", {scope: "world", config: false, type: Array, default: []});
  game.settings.register(MODULE_ID, "ghoulNeed", {
    name: "Ghouls need vitae each month", scope: "world", config: true, type: Boolean, default: true,
    hint: "Every ghoul, human or animal, loses a month's vitae when it goes a month without a drink from its domitor, then its Disciplines, Potence last, and rolls against the craving (V20 Dark Ages pp. 400 to 401). An animal ghoul with no vitae left ages back to its true years. Shown on the token."
  });
}

/** Is this actor a ghoul? Creation's line when it is there, else the sheet's own marks. */
export function isGhoul(a) {
  if ( !a ) return false;
  const c = creation();
  if ( c?.data?.lineOf ) return c.data.lineOf(a) === "ghoul";
  return a.system?.settings?.variant === "ghoul" || !!a.flags?.["wodx-creation"]?.animalGhoul;
}
const isAnimal = a => { try { return !!creation()?.animals?.isAnimal?.(a); } catch (e) { return false; } };
const kindOf = a => { try { return creation()?.animals?.kindOf?.(a) ?? null; } catch (e) { return null; } };
const monthlyOf = a => { const k = isAnimal(a) ? kindOf(a) : null; return k ? creation().animals.rules.monthlyNeed(k) : 1; };
const disciplinesOf = a => [...(a.items ?? [])].filter(i => i.type === "Power" && i.system?.type === "wod.types.discipline")
  .map(i => ({id: i.id, name: i.name, value: Number(i.system?.value) || 0}));
const stateOf = a => foundry.utils.deepClone(a.flags?.[MODULE_ID]?.[FLAG] ?? {});
const ownerIds = a => game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const tokensOf = a => (canvas?.scene?.tokens ?? []).filter(t => t.actorId === a.id);

function float(a, text) {
  for ( const t of tokensOf(a) ) {
    const o = t.object;
    if ( !o ) continue;
    try { canvas.interface?.createScrollingText?.(o.center, text, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, fill: "#b3121f", stroke: "#1a0306", strokeThickness: 4, fontSize: 26, duration: 2400}); } catch (e) { /* no canvas */ }
  }
}

async function card(a, title, body) {
  await ChatMessage.create({speaker: {alias: "Chronicle"}, whisper: ownerIds(a),
    content: `<div class="wodx-card wodx-ghoul-need"><h3>${esc(title)}</h3>${body}</div>`, flags: {[MODULE_ID]: {ghoulNeed: a.id}}});
}

/** Grey the ghoul's tokens (keeping the old tint), or put the colour back. */
async function tint(a, grey, {alpha = null} = {}) {
  for ( const t of tokensOf(a) ) {
    const keep = t.flags?.[MODULE_ID]?.ghoulTint;
    if ( grey ) {
      const patch = {texture: {tint: GREY}};
      if ( keep === undefined ) patch[`flags.${MODULE_ID}.ghoulTint`] = {tint: t.texture?.tint ?? null, alpha: t.alpha ?? 1};
      if ( alpha !== null ) patch.alpha = alpha;
      await t.update(patch);
    } else if ( keep !== undefined ) {
      await t.update({texture: {tint: keep.tint ?? "#ffffff"}, alpha: keep.alpha ?? 1, [`flags.${MODULE_ID}.-=ghoulTint`]: null});
    }
  }
}

async function rollCraving(a) {
  const animal = isAnimal(a);
  const dice = Math.max(1, animal ? Number(a.system?.advantages?.willpower?.permanent) || 1 : Number(a.system?.advantages?.virtues?.selfcontrol?.permanent) || 1);
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice?.[0]?.results?.map(r => r.result) ?? [];
  const out = R.craving(faces, R.CRAVING_DIFF);
  const what = animal ? "Willpower" : "Self-Control";
  const said = {held: "holds back for now", craves: "craves blood and drinks the first chance it gets", botch: "cannot hold back: it must drink blood now, from whoever is nearest"}[out.result];
  await card(a, `${a.name}: the craving`, `<p>${esc(what)} ${dice} dice at difficulty ${R.CRAVING_DIFF}: ${esc(faces.join(", "))}. ${esc(a.name)} ${esc(said)}.</p><p class="wodx-quiet">V20 Dark Ages p. 401</p>`);
  Hooks.callAll("wodxGhoulCraving", {actor: a, result: out.result});
  return out;
}

const skips = () => { try { return game.settings.get(MODULE_ID, "ghoulNeedSkips") ?? []; } catch (e) { return []; } };
/** Seconds of [a, b] that fell inside a time skip. */
export function skippedBetween(a, b, list = skips()) {
  let out = 0;
  for ( const k of list ) out += Math.max(0, Math.min(b, Number(k.to)) - Math.max(a, Number(k.from)));
  return out;
}
async function noteSkip({from, to} = {}) {
  if ( !Number.isFinite(from) || !Number.isFinite(to) || to <= from ) return;
  const list = [...skips(), {from, to}].sort((x, y) => x.from - y.from);
  // join spans that touch, so the list stays short
  const merged = [];
  for ( const k of list ) { const l = merged.at(-1); if ( l && k.from <= l.to ) l.to = Math.max(l.to, k.to); else merged.push({...k}); }
  await game.settings.set(MODULE_ID, "ghoulNeedSkips", merged.slice(-50));
}

/** One ghoul's check. */
export async function check(a, t = now()) {
  if ( !isGhoul(a) ) return null;
  const st = stateOf(a);
  const fedAt = a.flags?.[MODULE_ID]?.[SIG]?.ghoul?.fedAt ?? st.fedAt;
  if ( fedAt === undefined || fedAt === null ) { await a.update({[`flags.${MODULE_ID}.${FLAG}`]: {...st, fedAt: t, warned: 0}}); return null; }
  const months = Math.max(0, Math.floor((t - fedAt - skippedBetween(fedAt, t)) / MONTH));
  // Months the Clan features' card already told of are not taken again
  st.warned = Math.max(Number(st.warned) || 0, Number(a.flags?.[MODULE_ID]?.[SIG]?.ghoul?.warned) || 0);
  const out = {months, taken: 0, cuts: [], state: "alive"};
  if ( months > (st.warned ?? 0) ) {
    const pool = Number(a.system?.advantages?.bloodpool?.temporary) || 0;
    const plan = R.drain({months, warned: st.warned ?? 0, monthly: monthlyOf(a), pool, disciplines: disciplinesOf(a)});
    if ( plan.taken ) await a.update({"system.advantages.bloodpool.temporary": plan.pool});
    for ( const c of plan.cuts ) await a.items.get(c.id)?.update({"system.value": c.to, "system.level": c.to});
    const newly = (months - (st.warned ?? 0));
    st.warned = months;
    if ( plan.empty && !st.emptySince ) st.emptySince = t;
    await a.update({[`flags.${MODULE_ID}.${FLAG}`]: {...st, fedAt}});
    const lines = [];
    if ( plan.taken ) lines.push(`${plan.taken} vitae fade${plan.taken === 1 ? "s" : ""}; ${plan.pool} left`);
    for ( const c of plan.cuts ) lines.push(`${c.name} falls from ${c.from} to ${c.to}`);
    if ( plan.empty && !plan.cuts.length && !plan.taken ) lines.push("no vitae left and no Disciplines to lose");
    await card(a, `${a.name}: ${months} month${months === 1 ? "" : "s"} without vitae`,
      `<p>${esc(lines.join(". "))}.</p>${plan.empty ? `<p>With no vitae left, the years held off begin to come back.</p>` : ""}<p class="wodx-quiet">V20 Dark Ages p. 400</p>`);
    float(a, plan.taken ? `-${plan.taken} vitae` : "Withering");
    if ( plan.empty ) await tint(a, true);
    Hooks.callAll("wodxGhoulFix", {actor: a, drank: false, months, need: true});
    if ( newly > 0 ) await rollCraving(a);
    out.taken = plan.taken; out.cuts = plan.cuts;
  }
  // An animal catches up with its years (B5052)
  const s2 = stateOf(a);
  if ( s2.emptySince && isAnimal(a) && !s2.dust ) {
    const k = kindOf(a), span = creation()?.animals?.rules?.lifespan?.(k) ?? 13;
    const chron = a.flags?.["wodx-creation"]?.chronology ?? {};
    const toYear = y => { if ( y === undefined || y === null ) return null; try { return getYear(y); } catch (e) { return null; } };
    const ghouledY = toYear(chron.ghouled), nowY = toYear(t);
    const heldOff = ghouledY !== null && nowY !== null ? Math.max(0, nowY - ghouledY) : 0;
    const bornY = Number.isFinite(Number(chron.bornYear)) && chron.bornYear !== null ? Number(chron.bornYear) : null;
    const ageAt = bornY !== null && ghouledY !== null ? Math.max(0, ghouledY - bornY) : Math.ceil(span / 2);
    const g = R.ageing({ageAtGhouling: ageAt, heldOff, emptySince: s2.emptySince, now: t - skippedBetween(s2.emptySince, t), span});
    out.state = g.state;
    if ( g.state !== (s2.aged ?? "alive") ) {
      await a.update({[`flags.${MODULE_ID}.${FLAG}`]: {...s2, aged: g.state, dust: g.state === "dust"}});
      if ( g.state === "dead" ) {
        try { await a.toggleStatusEffect?.("dead", {active: true, overlay: true}); } catch (e) { /* no status */ }
        await card(a, `${a.name} dies of age`, `<p>The years come back all at once: ${esc(a.name)} was ${g.age} years old in truth, past an animal's span.</p>`);
      } else if ( g.state === "dust" ) {
        try { await a.toggleStatusEffect?.("dead", {active: true, overlay: true}); } catch (e) { /* no status */ }
        await tint(a, true, {alpha: 0.3});
        await card(a, `${a.name} crumbles to dust`, `<p>Far past its span, ${esc(a.name)} falls to dust and dry hide where it stood.</p>`);
      }
    }
  }
  return out;
}
const getYear = t => getEngine()?.timeToDate?.(t)?.year ?? null;

/** The ghoul drank from the domitor: the month starts again and the token's colour comes back. */
export async function fed(a, t = now()) {
  if ( !a ) return;
  const st = stateOf(a);
  await a.update({[`flags.${MODULE_ID}.${FLAG}`]: {fedAt: t, warned: 0, emptySince: null, aged: st.aged === "dust" ? "dust" : "alive"}});
  if ( !st.dust ) await tint(a, false);
}

let last = -1, busy = false;
export async function tick({force = false} = {}) {
  if ( !on() || !isActiveGM() || busy || isSkipping() ) return;
  const t = now(), day = Math.floor(t / DAY);
  if ( day === last && !force ) return;
  last = day; busy = true;
  try { for ( const a of game.actors ) if ( isGhoul(a) ) await check(a, t); }
  finally { busy = false; }
}

export function registerGhoulNeedHooks() {
  Hooks.on("updateWorldTime", () => { tick().catch(e => console.error(`${MODULE_ID} | ghoul need`, e)); });
  Hooks.on("wodxSkipEnd", info => { if ( isActiveGM() ) noteSkip(info).catch(e => console.error(`${MODULE_ID} | ghoul need`, e)); });
  Hooks.on("wodxGhoulFix", e => { if ( e?.drank && isActiveGM() ) fed(e.actor).catch(err => console.error(`${MODULE_ID} | ghoul need`, err)); });
}

export const ghoulNeedApi = {check, fed, tick, isGhoul, on, rules: R};
