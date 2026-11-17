/**
 * WoDX Actions gate: V20 merits and flaws that were only a card now change healing, waking and Aura Perception
 * (B7066, V20 pp. 480-493), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatev20bodyflaws.mjs?${Date.now()}`)).run()
 * Makes its own scene and actors and removes them; puts back every setting it touches; never moves the clock.
 *   1. Slow Healing: the Spend Blood window heals 2 lethal for 4 blood, and the card says why
 *   2. Slow Healing: an aggravated level committed sets the five-day wait, and the card says so
 *   3. the trait hooks read Early Riser (rises as Humanity 10), Permanent Wound and Disease Carrier off the sheet
 *   4. Aura Perception: a plain vampire reads pale; Deceptive Aura reads as living; Hidden Diablerie hides the veins
 * Result: Data/wodx-gate/gatev20bodyflaws-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const n = v => Number(v) || 0;
const text = m => String(m?.content ?? m ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const queue = [];
async function onRender(app, el) {
  const f = queue.shift();
  if ( !f ) return;
  const root = el instanceof HTMLElement ? el : el?.[0];
  await sleep(200);
  let res;
  try { res = await f(root, app); } catch (e) { console.warn("gatev20bodyflaws answer", e); }
  root.querySelector(`button[data-action="${res ?? "ok"}"]`)?.click();
}
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) throw new Error(`no field ${name}`);
  if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
};
const cardFor = (actor, t0, ms = 8000) => waitFor(() => game.messages.contents.find(m => m.timestamp >= t0 && m.speaker?.actor === actor.id), ms)
  .then(() => game.messages.contents.filter(m => m.timestamp >= t0 && m.speaker?.actor === actor.id).pop() ?? null);
const flaw = (name, value) => ({name, type: "Feature", system: {type: "wod.types.flaw", value}});
const merit = (name, value) => ({name, type: "Feature", system: {type: "wod.types.merit", value}});

export async function run() {
  const G = gate("gatev20bodyflaws", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const touched = [[AX, "spendResources", true], [AX, "applyChanges", true]];
  const was = [];
  const hook = Hooks.on("renderDialogV2", onRender);
  try {
    for ( const [m, k, v] of touched ) {
      try { was.push([m, k, game.settings.get(m, k)]); await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); }
    }
    const A = game.wodxActions;
    const TH = await import(`/modules/wodx-actions/scripts/trait-hooks.js`);
    await G.scene({name: "WoDX gate: V20 body flaws"});
    const vamp = sys => ({type: "Vampire", system: {advantages: {bloodpool: {temporary: 10, max: 10}, willpower: {permanent: 5, temporary: 5}, ...sys}}});
    const [slow, riser, plain, liar, hider] = await G.make(Actor, [
      {name: "Gate Slow Healer", ...vamp({})}, {name: "Gate Early Riser", ...vamp({})}, {name: "Gate Plain Vampire", ...vamp({})},
      {name: "Gate Bright Aura", ...vamp({})}, {name: "Gate Hidden Diablerist", ...vamp({})}]);
    await slow.createEmbeddedDocuments("Item", [flaw("Slow Healing", 3)]);
    await riser.createEmbeddedDocuments("Item", [merit("Early Riser", 1), flaw("Permanent Wound", 3), flaw("Disease Carrier", 4)]);
    await liar.createEmbeddedDocuments("Item", [merit("Deceptive Aura", 1)]);
    await hider.createEmbeddedDocuments("Item", [merit("Hidden Diablerie", 3)]);
    const blood = a => n(a.system?.advantages?.bloodpool?.temporary);
    const dmg = a => a.system?.health?.damage ?? {};
    await slow.update({"system.advantages.bloodpool.temporary": 10, "system.health.damage.lethal": 4, "system.health.damage.aggravated": 1});

    await G.step("1. Slow Healing: two blood a level", async () => {
      const b0 = blood(slow), t0 = Date.now();
      queue.length = 0;
      queue.push(root => { set(root, "healL", 2); set(root, "healB", 0); set(root, "healA", 0); });
      A.spendBlood({actor: slow});
      const m = await cardFor(slow, t0);
      await waitFor(() => blood(slow) !== b0, 4000);
      G.ok("1. Slow Healing: two blood a level", blood(slow) === b0 - 4 && n(dmg(slow).lethal) === 2 && /Slow Healing/.test(text(m)),
        {blood: [b0, blood(slow)], lethal: dmg(slow).lethal, card: text(m).slice(0, 300)});
    });

    await G.step("2. Slow Healing: aggravated waits five days", async () => {
      await slow.update({"system.advantages.bloodpool.temporary": 10});
      const t0 = Date.now(), now = n(game.time.worldTime);
      queue.length = 0;
      queue.push(root => { set(root, "healL", 0); set(root, "healB", 0); set(root, "healA", 1); });
      A.spendBlood({actor: slow});
      const m = await cardFor(slow, t0);
      await waitFor(() => !!slow.getFlag(AX, "aggDue"), 4000);
      const due = n(slow.getFlag(AX, "aggDue"));
      G.ok("2. Slow Healing: aggravated waits five days", due >= now + 5 * 86400 - 5 && /every five days/.test(text(m)) && n(slow.getFlag(AX, "aggHealing")) === 1,
        {due, now, agg: slow.getFlag(AX, "aggHealing"), card: text(m).slice(0, 300)});
    });

    await G.step("3. the hooks read Early Riser, Permanent Wound and Disease Carrier", async () => {
      const r = {riser: TH.riseRating(riser, 3), plain: TH.riseRating(plain, 3), wound: TH.risesWounded(riser), disease: TH.diseaseCarrier(riser), plainWound: TH.risesWounded(plain)};
      G.ok("3. the hooks read Early Riser, Permanent Wound and Disease Carrier", r.riser === 10 && r.plain === 3 && r.wound && r.disease && !r.plainWound, r);
    });

    await G.step("4. Aura Perception reads Deceptive Aura and Hidden Diablerie", async () => {
      const mark = {victim: "Gate victim", veinsUntil: n(game.time.worldTime) + 86400 * 365, taintUntil: n(game.time.worldTime) + 86400 * 30, at: n(game.time.worldTime), years: 1, months: 1};
      await plain.setFlag(AX, "diablerieMarks", [mark]);
      await hider.setFlag(AX, "diablerieMarks", [mark]);
      const DM = A.debtsMarks();
      const r = {plain: text(DM.auraNote(plain)), liar: text(DM.auraNote(liar)), hider: text(DM.auraNote(hider))};
      G.ok("4. Aura Perception reads Deceptive Aura and Hidden Diablerie",
        /pale/.test(r.plain) && /Black veins/.test(r.plain) && !/pale/.test(r.liar) && /living/.test(r.liar) && /pale/.test(r.hider) && !/Black veins/.test(r.hider), r);
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    Hooks.off("renderDialogV2", hook);
    for ( const [m, k, v] of was ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting back ${m}.${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
