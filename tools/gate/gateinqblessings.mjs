/**
 * WoDX Actions gate: two Dark Ages: Inquisitor Blessings that used to be card text only now work (B7065), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateinqblessings.mjs?${Date.now()}`)).run()
 * An inquisitor with Flock 3, Piety 3, Conviction 2 and the Blessings Catechumen (Wisdom) and Wreathed in Shadows
 * (Zeal). Every step answers the real window and reads the sheet and the card. The dice are fixed while it runs and
 * put back. Makes its own scene and actor and removes them; puts back every setting it touches; never moves the clock.
 *   1. prayer with the Flock, Wreathed in Shadows ticked, every die a 10: Conviction 2 rises by the Flock's 3 and the
 *      roll's 3 to 8, past Piety 3, and the card names the Blessing (p. 184)
 *   2. a Blessing roll that botches with the Catechumen box ticked: the botch is negated, 1 Willpower and 1
 *      Conviction are spent, and the story is recorded (p. 181)
 *   3. the next Blessing roll the same story: the window has no Catechumen box and the botch stands
 * Result: Data/wodx-gate/gateinqblessings-result.json.
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
  try { res = await f(root, app); } catch (e) { console.warn("gateinqblessings answer", e); }
  root.querySelector(`button[data-action="${res ?? "ok"}"]`)?.click();
}
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) throw new Error(`no field ${name}`);
  if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
};
/** The last WoDX card for an actor after a time. */
// B7885: the "grows Callous" card that a rise past Piety posts is not the roll's card
const rollCard = (actor, t0) => m => m.timestamp >= t0 && m.speaker?.actor === actor.id && /vta-card/.test(m.content ?? "") && !/grows Callous/.test(m.content ?? "");
const cardFor = (actor, t0, ms = 8000) => waitFor(() => game.messages.contents.find(rollCard(actor, t0)), ms)
  .then(() => game.messages.contents.filter(rollCard(actor, t0)).pop() ?? null);
/** Fix every d10 to one face, trying both readings of randomUniform (as gate-interact.mjs does). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};

export async function run() {
  const G = gate("gateinqblessings", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const touched = [[AX, "spendResources", true]];
  const was = [];
  const uniform = CONFIG.Dice.randomUniform;
  const hook = Hooks.on("renderDialogV2", onRender);
  try {
    for ( const [m, k, v] of touched ) {
      try { was.push([m, k, game.settings.get(m, k)]); await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting ${m}.${k}: ${e?.message ?? e}`); }
    }
    const A = game.wodxActions;
    await G.scene({name: "WoDX gate: inquisitor Blessings"});
    const [ines] = await G.make(Actor, [{name: "Gate Inquisitor", type: "Hunter",
      flags: {[AX]: {inquisitor: {order: "", faith: 1, wisdom: 2, zeal: 2, piety: 3}}}}]);
    // B6449: a new sheet works its Willpower out on creation, so set it after
    await ines.update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6,
      "system.advantages.conviction.permanent": 2, "system.advantages.conviction.temporary": 2,
      "system.attributes.perception.value": 2, "system.attributes.perception.total": 2});
    await ines.createEmbeddedDocuments("Item", [
      {name: "Flock", type: "Feature", system: {type: "wod.types.background", value: 3}},
      {name: "Catechumen (Wisdom)", type: "Power", system: {type: "wod.types.power", value: 1}},
      {name: "Wreathed in Shadows (Zeal)", type: "Power", system: {type: "wod.types.power", value: 1}}]);
    const conv = () => n(ines.system?.advantages?.conviction?.temporary);
    const wp = () => n(ines.system?.advantages?.willpower?.temporary);

    await G.step("1. Wreathed in Shadows adds the Flock at once, past Piety", async () => {
      await ines.update({[`flags.${AX}.inquisitor.-=prayerDay`]: null});
      await dice(10);
      const c0 = conv(), t0 = Date.now();
      let box = null;
      queue.length = 0;
      queue.push(root => { box = !!root.querySelector("[name=wreathed]"); set(root, "src", "flock"); set(root, "rating", 3); set(root, "hours", 1); set(root, "wreathed", true); });
      A.prayer({actor: ines});
      const m = await cardFor(ines, t0);
      await waitFor(() => conv() !== c0, 4000);
      G.ok("1. Wreathed in Shadows adds the Flock at once, past Piety", box && c0 === 2 && conv() === 8 && /Wreathed in Shadows/.test(text(m)) && /2 → 8/.test(text(m)),
        {box, conviction: [c0, conv()], card: text(m).slice(0, 300)});
    });

    const invoke = async (tick) => {
      await dice(1);
      const c0 = conv(), w0 = wp(), t0 = Date.now();
      let box = null;
      queue.length = 0;
      queue.push(root => {
        box = !!root.querySelector("[name=catechumen]");
        set(root, "other", "Gate test Blessing"); set(root, "sv", "virtue"); set(root, "attr", "perception");
        set(root, "rating", 2); set(root, "diff", 6); set(root, "cost", 0);
        if ( tick && box ) set(root, "catechumen", true);
      });
      A.blessing({actor: ines});
      const m = await cardFor(ines, t0);
      await sleep(500);
      return {box, conviction: [c0, conv()], willpower: [w0, wp()], card: text(m).slice(0, 320), story: ines.getFlag(AX, "inquisitor")?.catechumenStory ?? null};
    };

    await G.step("2. Catechumen negates a botch for 1 Willpower and 1 Conviction", async () => {
      const r = await invoke(true);
      G.ok("2. Catechumen negates a botch for 1 Willpower and 1 Conviction", r.box && /botch is negated/.test(r.card) && !/BOTCH/.test(r.card)
        && r.willpower[1] === r.willpower[0] - 1 && r.conviction[1] === r.conviction[0] - 1 && !!r.story, r);
    });

    await G.step("3. not again the same story", async () => {
      const r = await invoke(true);
      G.ok("3. not again the same story", r.box === false && !/botch is negated/.test(r.card) && /BOTCH/.test(r.card) && r.willpower[1] === r.willpower[0], r);
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    CONFIG.Dice.randomUniform = uniform;
    Hooks.off("renderDialogV2", hook);
    for ( const [m, k, v] of was ) { try { await game.settings.set(m, k, v); } catch (e) { G.R.notes.push(`setting back ${m}.${k}: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
