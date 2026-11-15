/**
 * Done-claims audit fixes, group 6 (WoDX Sheets, Creation, Library; B6175 to B6179), in rothenstein-wodx as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetruthsheets.mjs?${Date.now()}`)).run()
 * Each step goes through the path a player's click takes and checks the number that should change.
 * Makes its own scene, actors and tokens and removes them; puts back the one setting it touches
 * (wodx-sheets sheetRollMods) and the Storyteller's own assigned character. Never moves the clock.
 *   1. modules: Sheets, Creation, Library, Actions, Combat and Chronicle answer
 *   2. a roll from the sheet counts WoDX: after two drinks of brandy, clicking Dexterity on the sheet and Roll in the
 *      system's window rolls one die fewer and the card names why; with the world setting off it rolls the full pool
 *   3. the Nature button on a plain mortal's sheet (the system's layout): it is there with Set off, and a click with
 *      "Yes" gives a Willpower point back
 *   4. the Embrace hands the player over: the user whose character was the mortal now has the vampire
 *   5. first aid: a medic treats a mortal Wounded with lethal damage; the success puts the patient under care, and
 *      WoDX Actions' healing plan then heals the lethal levels it would not heal before
 *   6. an item named in free text ("a battle-axe") comes from Gear by era, and WoDX Combat's attack plan reads its pool
 *   7. lineage links follow the archive: with the sire archived, the lineage journal links the archive's entry;
 *      brought back, the world actor again
 *   8. clean up (the kit)
 * Result: Data/wodx-gate/gatetruthsheets-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const SH = "wodx-sheets", CR = "wodx-creation", LIB = "wodx-library", CB = "wodx-combat", ACT = "wodx-actions", CH = "wodx-chronicle";
const wait = ms => new Promise(r => setTimeout(r, ms));
const num = v => Number(v) || 0;
const mortal = (name, extra = {}) => foundry.utils.mergeObject({name, type: "Mortal", system: {
  attributes: {strength: {value: 3}, dexterity: {value: 3}, stamina: {value: 2}, perception: {value: 2}, intelligence: {value: 2}, wits: {value: 2}},
  abilities: {melee: {value: 2}}}}, extra, {inplace: false});
/** Answer the next DialogV2 that test() picks out by clicking its button. */
function answer(test, action = "ok", fill = null) {
  const id = Hooks.on("renderDialogV2", async (app, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    if ( !root || !test(root) ) return;
    Hooks.off("renderDialogV2", id);
    await wait(200);
    try { fill?.(root); } catch (e) { /* the window's fields */ }
    root.querySelector(`button[data-action="${action}"]`)?.click();
  });
  return () => Hooks.off("renderDialogV2", id);
}
const lethalOf = a => num(a.system?.health?.damage?.lethal);

export async function run() {
  const G = gate("gatetruthsheets");
  if ( G.notLive() ) return "gatetruthsheets never runs in the Live world";
  let keepRollMods, keepChar = game.user.character?.id ?? null;
  try { keepRollMods = game.settings.get(SH, "sheetRollMods"); } catch (e) { keepRollMods = undefined; }
  try {
    const lib = game.modules.get(LIB)?.api, C = game.modules.get(CB)?.api ?? game.wodxCombat, cr = game.modules.get(CR)?.api;
    const scene = await G.scene();
    // the lineage journal, as the lane had it: written again without the gate's actors, or removed if the gate made it
    const hadLineage = !!game.journal.find(j => j.getFlag?.(CR, "kind") === "lineage");
    const relineage = async () => {
      const j = game.journal.find(x => x.getFlag?.(CR, "kind") === "lineage");
      if ( !hadLineage ) await j?.delete(); else await cr.writeLineageJournal();
    };

    await G.step("1. modules", async () => {
      const on = [SH, CR, LIB, ACT, CB, CH].map(id => [id, !!game.modules.get(id)?.active]);
      G.ok("1. modules", on.every(([, x]) => x) && !!lib?.itemByName && !!game.modules.get(SH)?.api?.sheetRollMods && !!cr?.embrace && keepRollMods !== undefined,
        {on: Object.fromEntries(on), itemByName: !!lib?.itemByName, rollMods: keepRollMods});
    });

    await G.step("2. a sheet roll counts WoDX", async () => {
      const [eater] = await G.make(Actor, [mortal("Gate TruthSheets Drinker", {system: {attributes: {dexterity: {value: 4}}}})]);
      const [b1, b2] = await eater.createEmbeddedDocuments("Item", [{name: "a flask of brandy", type: "Item"}, {name: "a flask of brandy", type: "Item"}]);
      await lib.use.run(b1, "drink", eater);
      await wait(500);
      await lib.use.run(eater.items.get(b2.id) ?? b2, "drink", eater);
      await wait(800);
      const sheet = eater.sheet;
      await sheet.render(true);
      const label = () => (sheet.element?.[0] ?? sheet.element)?.querySelector?.("label.vrollable[data-attribute='true'][data-key='dexterity']");
      await waitFor(() => sheet.rendered && label(), 6000);
      const rollOnce = async () => {
        const t0 = Date.now();
        label()?.click();
        let dlg = null;
        await waitFor(() => (dlg = Object.values(ui.windows).find(w => w.constructor?.name === "DialogGeneralRoll" && w.actor?.id === eater.id && w.rendered)), 6000);
        (dlg?.element?.[0] ?? dlg?.element)?.querySelector?.(".actionbutton")?.click();
        let m = null;
        await waitFor(() => (m = [...game.messages].filter(x => (x.timestamp ?? 0) >= t0 && x.speaker?.actor === eater.id && (x.rolls?.length ?? 0) > 0).at(-1)), 8000);
        await dlg?.close?.();
        const W = CONFIG.worldofdarkness, explodes = W?.useexplodingDice && ["always", "nospeciality"].includes(W?.explodingDice);
        const faces = (m?.rolls ?? []).map(r => num(r.total));
        return {rolled: faces.length - (explodes ? faces.filter(f => f === 10).length : 0), mods: m?.flags?.[SH]?.rollMods ?? null, named: /WoDX:/.test(m?.content ?? ""), card: !!m};
      };
      const dex = num(eater.system.attributes.dexterity.total ?? eater.system.attributes.dexterity.value);
      await game.settings.set(SH, "sheetRollMods", true);
      const on = await rollOnce();
      await game.settings.set(SH, "sheetRollMods", false);
      const off = await rollOnce();
      await game.settings.set(SH, "sheetRollMods", keepRollMods);
      await sheet.close();
      G.ok("2. a sheet roll counts WoDX", on.card && on.rolled === dex - 1 && on.mods?.dice === -1 && on.named && off.card && off.rolled === dex && !off.mods,
        {dex, on, off, intox: eater.flags?.[LIB]?.intox ?? null});
    });

    await G.step("3. the Nature button on a plain mortal", async () => {
      const [plain] = await G.make(Actor, [mortal("Gate TruthSheets Plain Mortal", {system: {nature: "Survivor", derangement: "Fear of the dark"}})]);
      await plain.update({"system.nature": "Survivor", "system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 3});
      const sheet = plain.sheet;
      await sheet.render(true);
      const el = () => sheet.element?.[0] ?? sheet.element;
      await waitFor(() => sheet.rendered && el()?.querySelector?.("[data-roll='nature']"), 6000);
      const button = el()?.querySelector?.("[data-roll='nature']"), setOff = !!el()?.querySelector?.("[data-roll='derangement']");
      const stop = answer(root => /Did they act to their Nature/.test(root.textContent ?? ""), "yes");
      button?.click();
      await waitFor(() => num(plain.system.advantages.willpower.temporary) === 4, 6000);
      stop();
      await sheet.close();
      G.ok("3. the Nature button on a plain mortal", !!button && setOff && num(plain.system.advantages.willpower.temporary) === 4,
        {button: !!button, setOff, layout: game.modules.get(SH)?.api?.sheetFor?.(plain) ?? null, willpower: plain.system.advantages.willpower.temporary});
    });

    await G.step("4. the Embrace hands the player over", async () => {
      const folderName = "WoDX · Before the Embrace", hadFolder = game.folders.some(f => f.type === "Actor" && f.name === folderName);
      const [m] = await G.make(Actor, [mortal("Gate TruthSheets Embraced")]);
      await game.user.update({character: m.id});
      const v = await cr.embrace(m, {sire: null, clanName: "Brujah", generation: 12, moveTokens: false});
      await waitFor(() => game.user.character?.id === v?.id, 4000);
      const now = game.user.character?.id ?? null;
      await game.user.update({character: keepChar});
      // the Embrace writes the lineage journal: take the gate's two out of it again
      await Actor.deleteDocuments([v?.id, m.id].filter(id => id && game.actors.get(id)));
      await relineage();
      if ( !hadFolder ) await game.folders.find(f => f.type === "Actor" && f.name === folderName && !f.contents?.length)?.delete();
      G.ok("4. the Embrace hands the player over", !!v && v.type === "Vampire" && now === v.id, {vampire: v?.id ?? null, assigned: now, mortal: m.id});
    });

    await G.step("5. first aid puts the patient under care", async () => {
      const [medic, patient] = await G.make(Actor, [mortal("Gate TruthSheets Medic", {system: {attributes: {intelligence: {value: 5}}, abilities: {medicine: {value: 5}}}}),
        mortal("Gate TruthSheets Patient")]);
      await medic.update({"system.attributes.intelligence.value": 5, "system.abilities.medicine.value": 5});
      await patient.update({"system.health.damage.lethal": 4});
      const [, pt] = await G.tokens(scene, [{actor: medic, x: 2, y: 4, actorLink: true}, {actor: patient, x: 3, y: 4, actorLink: true}]);
      await waitFor(() => !!pt?.object, 5000);
      pt.object?.setTarget?.(true, {releaseOthers: true});
      const before = game.wodxActions.healPlan(patient, 30 * 86400);
      const [kit] = await medic.createEmbeddedDocuments("Item", [{name: "a roll of clean linen bandage", type: "Item", flags: {"wodx-sheets": {qty: 5}}}]);
      let tries = 0;
      while ( !patient.getFlag(ACT, "treated") && tries < 3 ) {
        tries++;
        const stop = answer(root => !!root.querySelector("select[name=check]"), "ok");
        await lib.use.run(medic.items.get(kit.id) ?? kit, "treat", medic);
        stop();
        await waitFor(() => !!patient.getFlag(ACT, "treated"), 3000);
      }
      pt.object?.setTarget?.(false, {releaseOthers: true});
      const after = game.wodxActions.healPlan(patient, 30 * 86400);
      G.ok("5. first aid puts the patient under care", !!patient.getFlag(ACT, "treated") && before?.needsCare === true && num(before?.healed?.lethal) === 0
        && after?.needsCare === false && num(after?.healed?.lethal) > 0 && lethalOf(patient) === 4,
        {tries, treated: !!patient.getFlag(ACT, "treated"), before: before ? {needsCare: before.needsCare, healed: before.healed} : null, after: after ? {needsCare: after.needsCare, healed: after.healed} : null});
    });

    await G.step("6. an item named in free text, in a fight", async () => {
      const [fighter, foe] = await G.make(Actor, [mortal("Gate TruthSheets Smith"), mortal("Gate TruthSheets Foe")]);
      const data = await lib.itemByName("a battle-axe");
      const [ax] = data ? await fighter.createEmbeddedDocuments("Item", [data]) : [];
      const p = C.bestAttack(fighter, foe, {}, {ignoreDistance: true}).plans.find(x => x.w?.name === ax?.name);
      const dex = num(fighter.system.attributes.dexterity.total ?? fighter.system.attributes.dexterity.value);
      const want = {dice: dex + num(fighter.system.abilities.melee.value), diff: num(ax?.system?.difficulty)};
      G.ok("6. an item named in free text, in a fight", ax?.type === "Melee Weapon" && !!p?.valid && p.atkDice === want.dice && p.atkDiff === want.diff && p.w.dmgBonus === 4 && p.dmgType === "lethal",
        {item: data ? {name: data.name, type: data.type} : null, want, got: p ? {valid: p.valid, dice: p.atkDice, diff: p.atkDiff, dmgBonus: p.w.dmgBonus, type: p.dmgType} : null});
    });

    await G.step("7. lineage links follow the archive", async () => {
      const [sire, childe] = await G.make(Actor, [{name: "Gate TruthSheets Sire", type: "Vampire"}, {name: "Gate TruthSheets Childe", type: "Vampire"}]);
      await childe.setFlag(CR, "lineage", {sire: {id: sire.id, name: sire.name}});
      await cr.writeLineageJournal();
      const blood = () => game.journal.find(j => j.getFlag?.(CR, "kind") === "lineage")?.pages?.getName?.("Blood")?.text?.content ?? "";
      const sid = sire.id;
      const r = await cr.archive.archive([sid]);
      const archived = blood().includes(`Compendium.world.wodx-archive.Actor.${sid}`);
      await cr.archive.restore([sid]);
      const back = blood().includes(`@UUID[Actor.${sid}]`) && !blood().includes(`Compendium.world.wodx-archive.Actor.${sid}`);
      G.ok("7. lineage links follow the archive", (r?.archived?.length ?? 0) === 1 && archived && back, {archived, back, gone: r?.archived?.length ?? 0, kept: r?.kept});
      await Actor.deleteDocuments([sid, childe.id].filter(id => game.actors.get(id)));
      await relineage();
    });
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    try { if ( keepRollMods !== undefined ) await game.settings.set(SH, "sheetRollMods", keepRollMods); } catch (e) { G.R.notes.push(`setting back: ${e?.message ?? e}`); }
    try { if ( (game.user.character?.id ?? null) !== keepChar ) await game.user.update({character: keepChar}); } catch (e) { G.R.notes.push(`character back: ${e?.message ?? e}`); }
    return G.finish();
  }
}
