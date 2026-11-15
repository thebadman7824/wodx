/**
 * WoDX NPC 0.56.0: bonds from the books, the Foundry side (B2840-B2846). The rules are in bond-rules.mjs.
 *
 *   A thrall's attack on the regnant (WoDX Combat wodxAttackRolled), harm to someone (wodxDamageApplied) and a death
 *   (a death date set, or the sheet deleted) call for cards to whoever a bond ties to them: the thrall, the wraith whose
 *   Fetter it was, the pack, cell, cabal or wu, the changeling whose Dreamer it was. Each card goes to the owners of the
 *   character told and to the Storyteller. Setting "Cards for bonds", on by default.
 *   api.bonds.stepToward(thrall, regnant) and api.bonds.socialShift(regnant, thrall) are what WoDX Actions reads.
 */
import * as BR from "./bond-rules.mjs";

const MOD = "wodx-npc";
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));

export function registerSettings() {
  game.settings.register(MOD, "bondCards", {scope: "world", config: true, type: Boolean, default: true,
    name: "Cards for bonds", hint: "When a thrall strikes the regnant, or someone a Fetter, pack, cell, cabal or Dreamer bond ties to is hurt or dies, a card tells the one bound to them."});
}
const on = () => { try { return !!game.settings.get(MOD, "bondCards"); } catch (e) { return false; } };

/** The Sabbat Vinculum from every faction's politics, {"a>b": rating}. */
export function vinculum() {
  const out = {};
  try { for ( const f of game.modules.get(MOD).api?.factions?.state?.()?.factions ?? [] ) Object.assign(out, f.politics?.vinculum ?? {}); } catch (e) { /* factions off */ }
  return out;
}

/** The bond step (0-3) a thrall has toward a regnant, from the lineage, WoDX Actions' oaths and the Vinculum. */
export function stepToward(thrallLike, regnantLike) {
  const t = actorOf(thrallLike), r = actorOf(regnantLike);
  if ( !t || !r || t.id === r.id ) return 0;
  return BR.stepToward({lineageBonds: t.flags?.["wodx-creation"]?.lineage?.bonds ?? {}, oaths: t.flags?.["wodx-actions"]?.oaths ?? {}, vinculum: vinculum(), thrallId: t.id, regnantId: r.id});
}
/** The difficulty change on the regnant's Social roll against the thrall. */
export const socialShift = (regnant, thrall) => BR.socialShift(stepToward(thrall, regnant));

async function tell(cards, title) {
  for ( const c of cards ) {
    const a = game.actors.get(c.to);
    if ( !a ) continue;
    const users = game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({whisper: users, speaker: {alias: a.name},
      content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p><p>${esc(c.text)}</p></div></div>`, flags: {[MOD]: {bondCard: true}}});
  }
  return cards;
}
const edges = () => game.modules.get(MOD).api?.ties?.edges?.() ?? [];

export async function onAttack(attacker, data = {}) {
  if ( !isActiveGM() || !on() ) return [];
  const by = actorOf(attacker), of = actorOf(data.target);
  if ( !by || !of ) return [];
  // B5102: when the bond was already rolled before this blow (WoDX Combat asks first), no card after it
  if ( Date.now() - (globalThis.__wodxRestrained?.get?.(`${by.id}>${of.id}`) ?? 0) < 60000 ) return [];
  return tell(BR.cardsFor({kind: "attack", by: by.id, of: of.id}, [], {stepOf: (a, b) => stepToward(a, b)}), `${by.name} strikes at ${of.name}`);
}
export async function onHarm(actor, data = {}) {
  if ( !isActiveGM() || !on() || !actor?.id ) return [];
  if ( !(Number(data.levels) > 0) && !(Number(data.after) > Number(data.before)) ) return [];
  return tell(BR.cardsFor({kind: "harm", of: actor.id}, edges()), `${actor.name} is hurt`);
}
const bgDots = (a, re) => Number([...(a?.items ?? [])].find(i => re.test(String(i.name ?? "").trim()))?.system?.value) || 0;
/** A familiar is dead: its mage pays the M20 cost (Willpower, Quintessence, Paradox for the shortfall) and the Background clears. */
export async function payFamiliar(mageLike, familiarName = "the familiar") {
  const m = actorOf(mageLike);
  if ( !m || m.getFlag?.(MOD, `familiarPaid.${familiarName}`) ) return null;
  const s = m.system ?? {}, item = [...(m.items ?? [])].find(i => /^familiar\b/i.test(String(i.name ?? "").trim()));
  const c = BR.familiarCost(bgDots(m, /^familiar\b/i), {willPerm: s.advantages?.willpower?.permanent, willTemp: s.advantages?.willpower?.temporary,
    quint: s.quintessence?.temporary, paradox: s.paradox?.temporary});
  const upd = {"system.advantages.willpower.permanent": c.willpower.permanent, "system.advantages.willpower.temporary": c.willpower.temporary};
  if ( s.quintessence ) upd["system.quintessence.temporary"] = c.quintessence;
  if ( s.paradox ) upd["system.paradox.temporary"] = c.paradox;
  await m.update(upd);
  await m.setFlag(MOD, `familiarPaid.${familiarName}`, game.time?.worldTime ?? 0);
  if ( item ) await item.update({"system.value": 0});
  return c;
}
export async function onDeath(actor, cards = null) {
  if ( !isActiveGM() || !on() || !actor?.id ) return [];
  const list = cards ?? BR.cardsFor({kind: "death", of: actor.id}, edges());
  for ( const e of edges().filter(x => x.kind === "familiar" && x.to?.id === actor.id) ) {
    const c = await payFamiliar(e.from, actor.name).catch(err => { console.error(`${MOD} | familiar`, err); return null; });
    const at = list.find(x => x.to === e.from && /familiar/.test(x.text));
    if ( c && at ) at.text = `${at.text} ${c.lines.join(" ")}`;
  }
  return tell(list, `${actor.name} is dead`);
}

export function listen() {
  Hooks.on("wodxAttackRolled", (a, d) => { onAttack(a, d).catch(e => console.error(`${MOD} | bonds`, e)); });
  Hooks.on("wodxDamageApplied", (a, d) => { onHarm(a, d).catch(e => console.error(`${MOD} | bonds`, e)); });
  Hooks.on("updateActor", (a, change) => { const d = change?.flags?.["wodx-creation"]?.chronology?.died; if ( d !== undefined && d !== null ) onDeath(a).catch(e => console.error(`${MOD} | bonds`, e)); });
  // A sheet deleted: work the edges out while it still exists
  Hooks.on("preDeleteActor", a => { if ( isActiveGM() && on() && !a.flags?.[MOD]?.passerbyBase ) { const cards = BR.cardsFor({kind: "death", of: a.id}, edges()); const fam = edges().filter(x => x.kind === "familiar" && x.to?.id === a.id).map(x => x.from); if ( cards.length ) setTimeout(async () => { for ( const f of fam ) { const c = await payFamiliar(f, a.name).catch(() => null); const at = cards.find(x => x.to === f && /familiar/.test(x.text)); if ( c && at ) at.text = `${at.text} ${c.lines.join(" ")}`; } await tell(cards, `${a.name} is gone`).catch(() => null); }, 0); } });
}

export const rules = BR;
