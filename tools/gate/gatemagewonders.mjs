/**
 * Gate for B7927-B7930: a Dark Ages mage's everyday wonders and Tass (Dark Ages: Mage pp. 190-207; Dark Ages: Fae
 * p. 182). Makes its own Hermetic mage and a mortal; the dice are fixed while a step rolls and put back.
 *   1. unbreakable iron enchanted from the household window (every die a 10): the sword strikes +3 on its sheet
 *   2. a draught of truth enchanted (every die a 10): an item with its wonder on the mage's sheet
 *   3. the draught given to the mortal from the window: +4 difficulty to lie this scene, and the flask is gone
 *   4. an enchanting gone wrong (every die a 1): the Backlash card has the casting's buttons
 *   5. Tass from a goblin's heart: five Quintessence
 *   6. a living fae's blood twice in a week: the second is refused
 *   7. a leech poultice on a wound of two lethal: the wound closes
 *   8. a sauce of strength eaten: +2 physical dice for three days
 * Run: await (await import(`/wodx-gate/gatemagewonders.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
const set = (root, name, value) => { const el = root.querySelector(`[name=${name}]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value); };
/** Open the household window, choose `what`, then fill the next window. */
async function household(A, actor, what, title, fill) {
  const pick = function (want, fn) { let id = null; id = Hooks.on("renderDialogV2", (app, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
    Hooks.off("renderDialogV2", id);
    try { fn?.(root); } catch (e) { console.warn(e); }
    setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150);
  }); return id; };
  const h2 = pick(title, fill), h1 = pick("The household:", root => set(root, "what", what));
  try { await A.daHousehold({actor}); await sleep(900); } finally { Hooks.off("renderDialogV2", h1); Hooks.off("renderDialogV2", h2); }
}

export async function run() {
  const G = gate("gatemagewonders", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.wodxActions;
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const Q = a => Number(A.daMageInfo(a)?.quintessence?.value) || 0;
  const fx = (a, key) => game.actors.get(a.id).effects.find(e => e.getFlag("wodx-chronicle", "timed")?.key === key) ?? null;
  const wonders = a => game.actors.get(a.id).items.filter(i => i.getFlag(AX, "wonder"));
  try {
    const [mg, mo] = await G.make(Actor, [{name: "Gate Wonders: Magus", type: "Mage"}, {name: "Gate Wonders: Smith", type: "Mortal"}]);
    await mg.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5});
    await mg.setFlag(AX, "daMage", {fellowship: "hermes", foundation: 3, pillars: {anima: 1, corona: 2, primus: 2, vires: 2}, twilight: {temp: 0, perm: 0}, brandings: [], system: null});
    const qp = A.daMageInfo(mg)?.quintessence?.path;
    if ( qp ) await mg.update({[qp]: 2});
    const [sword] = await mg.createEmbeddedDocuments("Item", [{name: "Gate Wonders: sword", type: "Melee Weapon", system: {damage: {bonus: 2, type: "lethal"}}}]);

    await G.step("1. unbreakable iron from the household window: the sword strikes +3", async () => {
      await dice(10);
      await household(A, mg, "enchant", "Enchant a wonder:", root => { set(root, "key", "unbreakable"); set(root, "item", sword.id); set(root, "q", 0); });
      await waitFor(() => Number(mg.items.get(sword.id)?.system?.damage?.bonus) === 5, 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("1. unbreakable iron from the household window: the sword strikes +3", Number(mg.items.get(sword.id)?.system?.damage?.bonus) === 5, {system: mg.items.get(sword.id)?.system?.damage, charms: mg.items.get(sword.id)?.getFlag(AX, "charms")});
    });

    await G.step("2. a draught of truth enchanted: an item on the sheet", async () => {
      await dice(10);
      await household(A, mg, "enchant", "Enchant a wonder:", root => { set(root, "key", "truth"); set(root, "q", 0); });
      await waitFor(() => wonders(mg).some(i => i.getFlag(AX, "wonder").key === "truth"), 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("2. a draught of truth enchanted: an item on the sheet", wonders(mg).some(i => i.getFlag(AX, "wonder").key === "truth"), {items: wonders(mg).map(i => i.name)});
    });

    await G.step("3. the draught given to the smith: +4 to lie this scene", async () => {
      const flask = wonders(mg).find(i => i.getFlag(AX, "wonder").key === "truth");
      await household(A, mg, "use", "Use a wonder:", root => { set(root, "id", flask?.id); set(root, "to", mo.id); });
      await waitFor(() => !!fx(mo, "wodx-effect-fortune:wonder-truth"), 5000);
      const e = fx(mo, "wodx-effect-fortune:wonder-truth")?.getFlag("wodx-chronicle", "timed");
      G.ok("3. the draught given to the smith: +4 to lie this scene", e?.data?.shift === 4 && (e?.data?.tags ?? []).includes("subterfuge") && !mg.items.get(flask?.id), {timed: e});
    });

    await G.step("4. an enchanting gone wrong: the Backlash card has the casting's buttons", async () => {
      await dice(1);
      await household(A, mg, "enchant", "Enchant a wonder:", root => { set(root, "key", "cask"); set(root, "local", false); set(root, "q", 0); });
      let msg = null;
      await waitFor(() => (msg = game.messages.contents.find(m => m.timestamp >= t0 && m.getFlag(AX, "daBacklash"))), 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("4. an enchanting gone wrong: the Backlash card has the casting's buttons", !!msg && /data-mx="cancel"/.test(msg.content) && msg.getFlag(AX, "daBacklash")?.ones > 0, {flag: msg?.getFlag(AX, "daBacklash") ?? null});
    });

    await G.step("5. Tass from a goblin's heart: five Quintessence", async () => {
      const before = Q(mg);
      await household(A, mg, "tass", "Harvest Tass:", root => set(root, "key", "goblin"));
      await waitFor(() => Q(mg) > before, 5000);
      G.ok("5. Tass from a goblin's heart: five Quintessence", Q(mg) - before === 5, {before, after: Q(mg)});
    });

    await G.step("6. a living fae's blood twice in a week: the second is refused", async () => {
      const before = Q(mg);
      const fill = root => { set(root, "key", "fae"); set(root, "origin", "changeling"); set(root, "living", true); set(root, "who", "Gate fae"); };
      await household(A, mg, "tass", "Harvest Tass:", fill);
      await waitFor(() => Q(mg) > before, 5000);
      const mid = Q(mg);
      await household(A, mg, "tass", "Harvest Tass:", fill);
      await sleep(600);
      G.ok("6. a living fae's blood twice in a week: the second is refused", mid - before === 2 && Q(mg) === mid, {before, mid, after: Q(mg)});
    });

    await G.step("7. a leech poultice on two lethal: the wound closes", async () => {
      await mo.update({"system.health.damage.lethal": 2, "system.health.damage.bashing": 0, "system.health.damage.aggravated": 0});
      const [p] = await mg.createEmbeddedDocuments("Item", [{name: "Gate Wonders: poultice", type: "Item", flags: {[AX]: {wonder: {key: "health", successes: 2}}}}]);
      await household(A, mg, "use", "Use a wonder:", root => { set(root, "id", p.id); set(root, "to", mo.id); });
      await waitFor(() => Number(game.actors.get(mo.id).system.health?.damage?.lethal) === 0, 5000);
      G.ok("7. a leech poultice on two lethal: the wound closes", Number(game.actors.get(mo.id).system.health?.damage?.lethal) === 0, {damage: game.actors.get(mo.id).system.health?.damage});
    });

    await G.step("8. a sauce of strength eaten: +2 physical dice", async () => {
      const [s] = await mg.createEmbeddedDocuments("Item", [{name: "Gate Wonders: sauce", type: "Item", flags: {[AX]: {wonder: {key: "strength", successes: 1}}}}]);
      await household(A, mg, "use", "Use a wonder:", root => { set(root, "id", s.id); set(root, "to", mo.id); });
      await waitFor(() => !!fx(mo, "wodx-effect-boost"), 5000);
      const e = fx(mo, "wodx-effect-boost")?.getFlag("wodx-chronicle", "timed");
      G.ok("8. a sauce of strength eaten: +2 physical dice", e?.data?.dice === 2 && e?.data?.on === "physical" && (e?.until - e?.applied) === 3 * 86400, {timed: e});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate Wonders/.test(m.content + (m.speaker?.alias ?? "") + (m.flavor ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
