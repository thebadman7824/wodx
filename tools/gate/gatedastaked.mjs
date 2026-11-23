/**
 * Full check of V20 Dark Ages (B7666-B7668), WoDX Actions and WoDX Creation: the staked vampire and Becoming Mortal.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedastaked.mjs?${Date.now()}`)).run()
 *   1. a staked vampire with blood pays one blood point on New Night, and no more (p. 354)
 *   2. with no blood, New Night marks a health level instead of spending blood (p. 354)
 *   3. at the seventh level the body mummifies into torpor, and Rise refuses while past Injured (p. 354)
 *   4. Becoming Mortal makes a Mortal sheet with Humanity from the Road, no Disciplines, the vampire kept (pp. 359-360)
 *   5. High Winds rolls Dexterity at 6 for everyone near the caster on the caster's turn; a failure knocks down (p. 298, B7668)
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedastaked-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const custom = clan => ({clan: "custom", custom: {clan}});
const disc = (name, value) => ({name, type: "Power", system: {type: "wod.types.discipline", value}});
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const filledOf = a => { const h = a.system?.health?.damage ?? {}; return ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(h[k]) || 0), 0); };

export async function run() {
  const G = gate("gatedastaked");
  if ( G.notLive() ) return "gatedastaked never runs in the Live world";
  const A = () => game.wodxActions;
  const cond = () => game.modules.get("wodx-chronicle")?.api?.conditions;
  const api = () => game.modules.get("wodx-creation")?.api;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 150000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }); };
  const made = [];
  // New Night writes the night-work journal; put it back as it was (as gatedatedplay does)
  const stored = key => game.settings.storage.get("world").getSetting?.(key) ?? null;
  const WRITTEN = ["wodx-chronicle.nightWork"];
  const writtenBefore = Object.fromEntries(WRITTEN.map(k => [k, stored(k)?.toObject?.() ?? null]));
  try {
    await waitFor(() => !!A()?.newNight && !!A()?.torpor && !!cond()?.setCondition && typeof api()?.becomeMortal === "function", 90000);
    const v = await G.make(Actor, {name: "Gate DA Staked", type: "Vampire", system: {...custom("Ventrue"), generation: 10, advantages: {bloodpool: {temporary: 2, max: 13}}},
      items: [disc("Dominate", 2), disc("Fortitude", 1)]});
    await v.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6});
    await cond().setCondition(v, "staked", true);
    await G.step("1. a staked vampire with blood pays one a night", async () => {
      await A().newNight({actors: [v]});
      await waitFor(() => Number(v.system.advantages.bloodpool.temporary) === 1, 60000);
      G.ok("1. a staked vampire with blood pays one a night", Number(v.system.advantages.bloodpool.temporary) === 1 && filledOf(v) === 0,
        {blood: v.system.advantages.bloodpool.temporary, filled: filledOf(v)});
    }, {timeout: 150000});
    await G.step("2. with no blood, a health level withers", async () => {
      await v.update({"system.advantages.bloodpool.temporary": 0});
      await A().newNight({actors: [v]});
      await waitFor(() => filledOf(v) === 1, 60000);
      G.ok("2. with no blood, a health level withers", filledOf(v) === 1 && Number(v.system.advantages.bloodpool.temporary) === 0 && !v.flags?.["wodx-actions"]?.torpor,
        {filled: filledOf(v), lethal: v.system.health?.damage?.lethal});
    }, {timeout: 150000});
    await G.step("3. the seventh level mummifies; Rise refuses", async () => {
      await v.update({"system.health.damage.lethal": 6});
      await A().newNight({actors: [v]});
      await waitFor(() => !!v.flags?.["wodx-actions"]?.torpor?.withered, 60000);
      const t = v.flags?.["wodx-actions"]?.torpor;
      for ( const old of windows().filter(x => /^Torpor/.test(x.title ?? "") && x.rendered) ) await old.close?.();
      A().torpor({actor: v});
      let w = null;
      await waitFor(() => (w = titled(/^Torpor/)), 20000);
      const sel = elOf(w)?.querySelector?.("select[name=act]");
      if ( sel ) { sel.value = "rise"; sel.dispatchEvent(new Event("change", {bubbles: true})); }
      await new Promise(r => setTimeout(r, 500));
      elOf(w)?.querySelector?.('button[data-action="ok"]')?.click();
      const m = await fresh(x => /cannot rise/i.test(text(x)), 60000);
      G.ok("3. the seventh level mummifies; Rise refuses", !!t?.withered && filledOf(v) === 7 && /Mummified/.test(text(m)),
        {withered: !!t?.withered, filled: filledOf(v), card: text(m).slice(0, 200)});
    }, {timeout: 200000});
    await G.step("4. Becoming Mortal", async () => {
      const w = await G.make(Actor, {name: "Gate DA Lifted", type: "Vampire", system: {...custom("Toreador"), generation: 11, advantages: {bloodpool: {temporary: 5, max: 12}}},
        items: [disc("Auspex", 2), disc("Presence", 1)]});
      await w.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.advantages.path.permanent": 6, "system.advantages.path.value": 6});
      const m = await api().becomeMortal(w, {catalyst: "love", note: "gate"});
      if ( m ) made.push(m);
      const card = await fresh(x => /The Curse lifts/.test(text(x)), 60000);
      const powers = [...(m?.items ?? [])].filter(i => i.type === "Power" && /discipline/.test(i.system?.type ?? "")).length;
      G.ok("4. Becoming Mortal", m?.type === "Mortal" && powers === 0 && Number(m.system?.advantages?.path?.permanent) === 6 && Number(m.system?.advantages?.willpower?.permanent) === 5
        && !!game.actors.get(w.id) && /true love/i.test(text(card)),
        {type: m?.type, powers, humanity: m?.system?.advantages?.path?.permanent, kept: !!game.actors.get(w.id), card: text(card).slice(0, 160)});
    }, {timeout: 200000});
    await G.step("5. High Winds knocks down those who fail", async () => {
      const scene = await G.scene({name: "WoDX gate: high winds"});
      const [caster, near] = await G.make(Actor, [{name: "Gate DA Wind Caller", type: "Vampire", system: custom("Tremere")}, {name: "Gate DA Wind Walker", type: "Mortal"}]);
      const [ct, nt] = await G.tokens(scene, [{actor: caster, x: 2, y: 2}, {actor: near, x: 4, y: 2}]);
      const fight = await Combat.create({scene: scene.id, active: true});
      await fight.createEmbeddedDocuments("Combatant", [{tokenId: ct.id, sceneId: scene.id, actorId: caster.id}, {tokenId: nt.id, sceneId: scene.id, actorId: near.id}]);
      await fight.startCombat();
      const TR = A().turnRules;
      const rec = TR.resolveRec(TR.everyTurnOf("High Winds", "Vampire (Dark Ages)"), {successes: 2, by: ct.uuid});
      const uuid = await A().turns.attach(scene.tokens.get(ct.id)?.actor ?? caster, rec, {label: "High Winds", by: caster.name});
      const idx = fight.turns.findIndex(x => x.tokenId === ct.id);
      await fight.update({turn: (idx + 1) % fight.turns.length});
      await fight.update({turn: idx});
      const isCard = x => /High Winds/.test(text(x)) && /knockdown:|keeps their feet/.test(text(x));
      let m = await fresh(isCard, 45000), err = null;
      const eff = (scene.tokens.get(ct.id)?.actor ?? caster).effects.find(e => e.getFlag?.("wodx-actions", "everyTurn"));
      const dbg = {uuid: !!uuid, eff: !!eff, rec: Object.keys(eff?.getFlag?.("wodx-actions", "everyTurn") ?? {}).join(","), turn: fight.turn, idx, started: fight.started, cActor: fight.combatant?.actor?.name};
      if ( !m ) {
        if ( eff ) await eff.setFlag("wodx-actions", "everyTurn", {...eff.getFlag("wodx-actions", "everyTurn"), lastTurn: null});
        try { dbg.direct = await A().turns.onTurn(fight); } catch ( e ) { err = String(e?.stack ?? e).slice(0, 400); }
        m = await fresh(isCard, 20000);
      }
      const fell = /knockdown:/.test(text(m)), down = !!cond().hasCondition(scene.tokens.get(nt.id)?.actor ?? near, "knockdown");
      G.ok("5. High Winds knocks down those who fail", !!uuid && !!m && fell === down && (!fell || /Wind Walker/.test(text(m))),
        {card: text(m).slice(0, 200), fell, down, ...dbg, err});
      await fight.delete().catch(() => null);
    }, {timeout: 150000});
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    for ( const m of made ) await m.delete?.().catch(() => null);
    // the night's log is written a while after New Night on a slow lane: let it land, then put it back
    await new Promise(r => setTimeout(r, 40000));
    for ( const k of WRITTEN ) {
      const now = stored(k), was = writtenBefore[k];
      if ( !was && now ) await now.delete().catch(() => null);
      else if ( was && now && now.value !== was.value ) await now.update({value: was.value}).catch(() => null);
    }
  }
  return G.finish();
}
