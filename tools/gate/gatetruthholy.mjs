/**
 * WoDX Interactables and WoDX Actions truth gate: holy ground keeps the faith of its house (B6362), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetruthholy.mjs?${Date.now()}`)).run()
 * A region tagged as a mosque kept for Islam (as adopting a town's chapel in Cairo writes it: flags.wodx-npc.place
 * {kind: "mosque", faith: "islamic"}). Every step moves a token into it for real, answers the real window, and reads
 * the number on the card. Makes its own scene, region, actors, tokens and fight and removes them; puts back every
 * setting it touches; never moves the clock.
 *   1. a believer in Islam with True Faith 3 (Mortals with True Faith) stands in the mosque: the True Faith roll is 4
 *   2. the same believer set to the Western church in the True Faith window: the roll is 3 and the card says why
 *   3. prayer for Conviction, Holy Ground typed as 5: kept for another faith, the roll is Holy Ground 0; set back to
 *      Islam, the roll is the mosque's own Holy Ground 1
 *   4. a demon of Torment 5 starts its turn in the mosque: 1 lethal, and the card names the house and its faith
 * Result: Data/wodx-gate/gatetruthholy-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const n = v => Number(v) || 0;
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const queue = [];
async function onRender(app, el) {
  const f = queue.shift();
  if ( !f ) return;
  const root = el instanceof HTMLElement ? el : el?.[0];
  await sleep(200);
  let res;
  try { res = await f(root, app); } catch (e) { console.warn("gatetruthholy answer", e); }
  root.querySelector(`button[data-action="${res ?? "ok"}"]`)?.click();
}
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) throw new Error(`no field ${name}`);
  if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
};
/** The first WoDX card for an actor after a time. */
const cardFor = (actor, t0, ms = 8000) => waitFor(() => game.messages.contents.find(m => m.timestamp >= t0 && m.speaker?.actor === actor.id && /vta-card/.test(m.content ?? "")), ms)
  .then(() => game.messages.contents.filter(m => m.timestamp >= t0 && m.speaker?.actor === actor.id && /vta-card/.test(m.content ?? "")).pop() ?? null);

export async function run() {
  const G = gate("gatetruthholy", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const touched = [["wodx-chronicle", "sigHunter", true], ["wodx-interactables", "hazards", true]];
  const was = [];
  const hook = Hooks.on("renderDialogV2", onRender);
  try {
    for ( const [m, k, v] of touched ) {
      try { was.push([m, k, game.settings.get(m, k)]); await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); }
    }
    const A = game.wodxActions, ix = game.modules.get("wodx-interactables")?.api;
    const scene = await G.scene({name: "WoDX gate: truth holy"});
    const g = scene.grid.size;
    await scene.createEmbeddedDocuments("Region", [{name: "Gate mosque", color: "#7a6a4f",
      shapes: [{type: "rectangle", x: 10 * g, y: 2 * g, width: 6 * g, height: 6 * g, rotation: 0, hole: false}],
      flags: {"wodx-npc": {place: {kind: "mosque", faith: "islamic"}}, world: {wodxGate: {gate: G.name, run: G.run}}}}]);
    const [hasan, demon] = await G.make(Actor, [
      {name: "Gate Holy Believer", type: "Hunter", flags: {"wodx-chronicle": {splat: "faithful"}, [AX]: {trueFaith: 3, faith: "islamic"}},
        system: {advantages: {willpower: {permanent: 6, temporary: 6}, virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}}}}},
      {name: "Gate Holy Demon", type: "Demon", system: {advantages: {torment: {permanent: 5, temporary: 5}, willpower: {permanent: 1, temporary: 1}}}}]);
    const [tH, tD] = await G.tokens(scene, [{actor: hasan, x: 2, y: 3, actorLink: true}, {actor: demon, x: 2, y: 6, actorLink: true}]);
    await waitFor(() => tH?.object && tD?.object, 8000);
    // into the mosque, by a real move
    await tH.update({x: 12 * g, y: 3 * g});
    await waitFor(() => tH.x === 12 * g && !!ix?.holyUnder?.(tH), 6000);

    const faithRoll = async (pick = null) => {
      const t0 = Date.now();
      queue.length = 0;
      queue.push(root => { set(root, "k", "resist"); set(root, "ps", 0); if ( pick !== null ) set(root, "faith", pick); });
      A.trueFaith({actor: hasan});
      const m = await cardFor(hasan, t0);
      const r = text(m).match(/True Faith \(?(\d+)/);
      return {m, rating: r ? n(r[1]) : null, txt: text(m).slice(0, 260)};
    };

    await G.step("1. True Faith in a house of their own faith counts one higher", async () => {
      const under = ix.holyUnder(tH);
      const r = await faithRoll();
      G.ok("1. True Faith in a house of their own faith counts one higher", r.rating === 4 && /kept for Islam/.test(r.txt),
        {rating: r.rating, under: under ? {faith: under.o.faith, house: under.o.house, rating: under.o.rating} : null, card: r.txt});
    });

    await G.step("2. set to another faith in the window, the roll is the plain rating", async () => {
      const r = await faithRoll("western");
      G.ok("2. set to another faith in the window, the roll is the plain rating", r.rating === 3 && hasan.getFlag(AX, "faith") === "western" && /not theirs/.test(r.txt),
        {rating: r.rating, faith: hasan.getFlag(AX, "faith"), card: r.txt});
    });

    await G.step("3. prayer reads the house's rating and its faith", async () => {
      const pray = async () => {
        await hasan.update({[`flags.${AX}.inquisitor.-=prayerDay`]: null});
        const t0 = Date.now();
        queue.length = 0;
        queue.push(root => { set(root, "src", "ground"); set(root, "rating", 5); set(root, "hours", 1); });
        A.prayer({actor: hasan});
        const m = await cardFor(hasan, t0);
        const r = text(m).match(/Holy Ground \((\d+)\)/);
        return {rating: r ? n(r[1]) : null, txt: text(m).slice(0, 260)};
      };
      const other = await pray();
      await hasan.setFlag(AX, "faith", "islamic");
      const own = await pray();
      G.ok("3. prayer reads the house's rating and its faith", other.rating === 0 && own.rating === 1, {other, own});
    });

    await G.step("4. a demon starting its turn in the mosque is seared", async () => {
      await tD.update({x: 12 * g, y: 6 * g});
      await waitFor(() => tD.x === 12 * g, 4000);
      const l0 = n(demon.system?.health?.damage?.lethal);
      const combat = await G.make(Combat, {scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [tH, tD].map(t => ({tokenId: t.id, sceneId: scene.id, actorId: t.actorId})));
      await combat.startCombat();
      const t0 = Date.now();
      const idx = combat.turns.findIndex(c => c.tokenId === tD.id);
      if ( combat.turn === idx ) await combat.update({turn: (idx + 1) % combat.turns.length});
      await combat.update({turn: idx});
      const seared = await waitFor(() => n(demon.system?.health?.damage?.lethal) >= l0 + 1, 8000);
      const card = game.messages.contents.filter(m => m.timestamp >= t0 && /holy ground/i.test(text(m))).pop();
      G.ok("4. a demon starting its turn in the mosque is seared", seared && n(demon.system?.health?.damage?.lethal) === l0 + 1 && /Gate mosque, kept for Islam/.test(text(card)),
        {lethal: [l0, demon.system?.health?.damage?.lethal], card: text(card).slice(0, 260)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    Hooks.off("renderDialogV2", hook);
    for ( const [m, k, v] of was ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting back ${m}.${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
