/**
 * Gate for B7936 to B7939: the fill-lists rows of Dark Ages: Werewolf and Dark Ages: Fae at work in play. Makes its own
 * scene, a Bone Gnawer (Survivor), a foe, and a changeling fae with Armored Hide; the dice are fixed while a step rolls.
 *   1. Survivor (DA:W p. 131): used from the Gift window, three more soak dice against the foe's blow (the attack plan)
 *   2. Taunt (DA:W p. 103): a die for each two successes off the foe's next attack in the plan; the foe's attack spends it
 *   3. Armored Hide (DA:Fae p. 106): taking the mien from its roll adds three soak dice against the foe's blow
 *   4. The Skull Pig (DA:W p. 187): made from the Storyteller's demons window with the book's Stamina, Rage and Gnosis;
 *      its Regeneration closes a lethal level on a new round
 * Run: await (await import(`/wodx-gate/gatedawfill.mjs?${Date.now()}`)).run()
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
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) return false;
  if ( el.multiple ) for ( const o of el.options ) o.selected = [].concat(value).includes(o.value);
  else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
  return true;
};
/** Answer the next window whose title starts with `want`: fill(root), then press its first button. */
const answer = (want, fill) => { const seen = {}; const id = Hooks.on("renderDialogV2", (app, el) => {
  const root = el instanceof HTMLElement ? el : el?.[0];
  if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
  Hooks.off("renderDialogV2", id);
  setTimeout(() => { try { seen.note = fill?.(root); } catch (e) { seen.error = e.message; }
    setTimeout(() => (root?.querySelector("button[data-action=ok]") ?? root?.querySelector("footer button, button[type=submit]"))?.click(), 200); }, 200);
}); return {off: () => Hooks.off("renderDialogV2", id), seen}; };
/** Start a WoDX Combat attack and press Attack with no defense. */
async function attackWith(C, aTok, tTok) {
  const run = C.attack({attacker: aTok, target: tTok, noAim: true});
  let dlg = null;
  await waitFor(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.(".vtc-dialog, select[name='weapon']"))), 8000);
  const root = dlg?.element;
  const def = root?.querySelector("select[name='defense']");
  if ( def ) { def.value = "none"; def.dispatchEvent(new Event("change", {bubbles: true})); }
  root?.querySelector("button[data-action='attack']")?.click();
  return run;
}

export async function run() {
  const G = gate("gatedawfill", {stepTimeout: 90000});
  if ( G.notLive() ) return "Not on the Live world.";
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const A = game.modules.get(AX)?.api ?? game.wodxActions;
  const C = game.modules.get("wodx-combat")?.api ?? game.wodxCombat;
  const CR = game.modules.get("wodx-creation")?.api;
  let pig = null, pigFolderNew = false, combat = null;
  try {
    const scene = await G.scene({name: "WoDX gate: DA:W and DA:Fae fill-lists"});
    const [gn, foe, fae] = await G.make(Actor, [
      {name: "Gate DAW Fill: Gnawer", type: "Werewolf", items: [{name: "Survivor", type: "Power", system: {type: "wod.types.gift", level: 5}, flags: {[AX]: {gift: "survivor"}}}]},
      {name: "Gate DAW Fill: Foe", type: "Mortal"},
      {name: "Gate DAW Fill: Fae", type: "Mortal"}]);
    await gn.update({"system.advantages.gnosis.permanent": 6, "system.advantages.gnosis.temporary": 6, "system.advantages.rage.permanent": 3, "system.advantages.rage.temporary": 3,
      "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.attributes.stamina.value": 3, "system.abilities.survival.value": 3,
      "system.attributes.manipulation.value": 3, "system.abilities.intimidation.value": 2});
    for ( const a of [foe, fae] ) await a.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5, "system.attributes.strength.value": 3,
      "system.attributes.dexterity.value": 3, "system.attributes.stamina.value": 2, "system.attributes.wits.value": 2, "system.abilities.brawl.value": 3});
    await fae.setFlag(AX, "daFae", {origin: "changeling", court: "summer", mists: {perm: 3, temp: 3}, weaving: {perm: 3, temp: 3}, dominions: {}, greater: ["Armored Hide"], mien: false});
    const [tg, tf, tz] = await G.tokens(scene, [{actor: gn, x: 3, y: 3, actorLink: true}, {actor: foe, x: 4, y: 3, actorLink: true}, {actor: fae, x: 4, y: 4, actorLink: true}]);
    await waitFor(() => [tg, tf, tz].every(d => d?.object), 5000);
    const plan = (a, b) => C.bestAttack(game.actors.get(a.id), game.actors.get(b.id), {}, {ignoreDistance: true}).best;

    await G.step("1. Survivor: three more soak dice against the foe's blow", async () => {
      const s0 = plan(foe, gn)?.soakDice;
      await dice(10);
      const w = answer("", root => set(root, "gift", gn.items.getName("Survivor").id));
      try { A.useGift({actor: gn}); await waitFor(() => plan(foe, gn)?.soakDice >= s0 + 3, 20000).catch(() => null); }
      finally { w.off(); CONFIG.Dice.randomUniform = uniform; }
      const s1 = plan(foe, gn)?.soakDice;
      G.ok("1. Survivor: three more soak dice against the foe's blow", Number.isFinite(s0) && s1 === s0 + 3, {before: s0, after: s1, error: w.seen.error});
    });

    await G.step("2. Taunt: dice off the foe's next attack, spent by it", async () => {
      const d0 = plan(foe, gn)?.atkDice;
      await dice(10);
      let r = null;
      try { r = await C.daw.taunt(game.actors.get(gn.id), game.actors.get(foe.id)); } finally { CONFIG.Dice.randomUniform = uniform; }
      const d1 = plan(foe, gn)?.atkDice;
      await attackWith(C, tf.object, tg.object);
      await waitFor(() => !C.daw.tauntedDice(game.actors.get(foe.id)), 10000).catch(() => null);
      const d2 = plan(foe, gn)?.atkDice;
      G.ok("2. Taunt: dice off the foe's next attack, spent by it", r?.dice >= 1 && d1 === d0 - r.dice && d2 === d0, {taunt: r, dice: [d0, d1, d2]});
    });

    await G.step("3. Armored Hide: the mien taken adds three soak dice", async () => {
      const s0 = plan(foe, fae)?.soakDice;
      await dice(10);
      try { await A.daMien({actor: fae}); } finally { CONFIG.Dice.randomUniform = uniform; }
      await waitFor(() => game.actors.get(fae.id).getFlag(AX, "daFae")?.mien, 5000).catch(() => null);
      const s1 = plan(foe, fae)?.soakDice;
      await attackWith(C, tf.object, tz.object);
      G.ok("3. Armored Hide: the mien taken adds three soak dice", Number.isFinite(s0) && s1 === s0 + 3 && !!game.actors.get(fae.id).getFlag(AX, "daFae")?.mien, {before: s0, after: s1});
    });

    await G.step("4. The Skull Pig from the demons window, regenerating", async () => {
      pigFolderNew = !game.folders.some(f => f.type === "Actor" && f.name === "WoDX · Monsters (Dark Ages: Werewolf)");
      const had = new Set(game.actors.filter(a => a.name === "Skull Pig").map(a => a.id));
      const w = answer("Demons of the Dark Ages Companion", root => set(root, "who", ["skull-pig"]));
      try { CR.dacDemons.open(); await waitFor(() => (pig = game.actors.find(a => a.name === "Skull Pig" && !had.has(a.id))), 15000); } finally { w.off(); }
      await waitFor(() => pig.items.getName("Regeneration") && pig.items.getName("Tusks"), 8000).catch(() => null);
      const sys = pig.system;
      const [pt] = await G.tokens(scene, [{actor: pig, x: 6, y: 6, actorLink: true}]);
      await pig.update({"system.health.damage.lethal": 2});
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: pt.id, sceneId: scene.id, actorId: pig.id}]);
      await combat.startCombat();
      await sleep(800);
      await combat.nextRound();
      await waitFor(() => Number(game.actors.get(pig.id).system?.health?.damage?.lethal) === 1, 8000).catch(() => null);
      const lethal = Number(game.actors.get(pig.id).system?.health?.damage?.lethal);
      G.ok("4. The Skull Pig from the demons window, regenerating", sys.attributes.stamina.value === 8 && Number(sys.advantages.rage?.permanent) === 5
        && Number(sys.advantages.gnosis?.permanent) === 3 && lethal === 1 && pig.folder?.name === "WoDX · Monsters (Dark Ages: Werewolf)",
        {stamina: sys.attributes.stamina.value, rage: sys.advantages.rage?.permanent, gnosis: sys.advantages.gnosis?.permanent, lethal, folder: pig.folder?.name, items: pig.items.map(i => i.name)});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    try { if ( combat && game.combats.get(combat.id) ) await combat.delete(); } catch {}
    try { const f = pig?.folder; if ( pig && game.actors.get(pig.id) ) await pig.delete(); if ( pigFolderNew && f && !f.contents?.length ) await f.delete(); } catch (e) { G.R.errors.push(`pig: ${e.message}`); }
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate DAW Fill|Skull Pig|Demons made/.test(String(m.content) + (m.speaker?.alias ?? "") + (m.flavor ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
