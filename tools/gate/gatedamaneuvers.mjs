/**
 * Full check of the Dark Ages Companion (2002) maneuvers (B7694), WoDX Combat, in rothenstein-wodx as Gamemaster:
 *   await (await import(`/wodx-gate/gatedamaneuvers.mjs?${Date.now()}`)).run()
 *   1. Joint Break picked in the attack window and pressed: the victim's arm is marked broken (p. 36)
 *   2. Neck Snap on a mortal: the victim soaks with Strength + Stamina, and the neck breaks: death (p. 36)
 *   3. Gobbet Rend by a Cainite with Potence 2 on a Cainite: a blood point torn away (p. 35)
 *   4. Choke Hold: the victim is held by the throat (a grip of kind choke) and takes no damage the first turn (p. 35)
 *   5. Joint Break without Brawl 4: the Storyteller is told the prerequisite (p. 36)
 * Every die is forced to a 10 so the outcome is certain; the fight the first blow starts is ended at the close. Makes its own scene, actors and tokens and removes them.
 * Result: Data/wodx-gate/gatedamaneuvers-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-combat";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 8000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const body = (str, dex, sta, brawl) => ({attributes: {strength: {value: str, total: str}, dexterity: {value: dex, total: dex}, stamina: {value: sta, total: sta}, wits: {value: 3, total: 3}},
  abilities: {brawl: {value: brawl}, athletics: {value: 0}, dodge: {value: 0}}});
const disc = (name, value) => ({name, type: "Power", system: {type: "wod.types.discipline", value}});

/** Start an attack, pick the maneuver and no defense, and press Attack. */
async function attackWith(C, aTok, tTok, maneuver) {
  const run = C.attack({attacker: aTok, target: tTok, weaponId: "unarmed:punch", noAim: true});
  let dlg = null;
  await settle(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.("select[name='maneuver']"))));
  const root = dlg?.element;
  const set = (name, v) => { const el = root?.querySelector(`select[name='${name}']`); if ( el ) { el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); } };
  set("weapon", "unarmed:punch"); set("maneuver", maneuver); set("defense", "none");
  await wait(200);
  root?.querySelector("button[data-action='attack']")?.click();
  return run;
}

export async function run() {
  const G = gate("gatedamaneuvers", {stepTimeout: 120000});
  if ( G.notLive() ) return "gatedamaneuvers never runs in the Live world";
  const C = game.modules.get(MOD)?.api;
  const dice0 = CONFIG.Dice.randomUniform;
  // the fight's New Night bookkeeping writes this setting late, after the kit has put the others back
  let night0 = null;
  try { night0 = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "nightWork")); } catch { night0 = null; }
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = test => game.messages.contents.filter(x => !seen.has(x.id) && test(x));
  try {
    const scene = await G.scene({name: "WoDX gate: 2002 maneuvers"});
    const [brute, weak, v1, v2, kin, kinV, v3] = await G.make(Actor, [
      {name: "Gate Man Brute", type: "Mortal", system: body(3, 5, 2, 4)},
      {name: "Gate Man Weak", type: "Mortal", system: body(3, 5, 2, 2)},
      {name: "Gate Man Victim A", type: "Mortal", system: body(1, 1, 1, 0)},
      {name: "Gate Man Victim B", type: "Mortal", system: body(1, 1, 1, 0)},
      {name: "Gate Man Cainite", type: "Vampire", system: body(3, 5, 2, 4), items: [disc("Potence", 2)]},
      {name: "Gate Man Cainite Victim", type: "Vampire", system: body(1, 1, 1, 0)},
      {name: "Gate Man Victim C", type: "Mortal", system: body(1, 1, 1, 0)}]);
    await kinV.update({"system.advantages.bloodpool.temporary": 5, "system.advantages.bloodpool.max": 10});
    const docs = await G.tokens(scene, [brute, weak, v1, v2, kin, kinV, v3].map((actor, i) => ({actor, x: 2 + (i % 2), y: 2 + Math.floor(i / 2), actorLink: true})));
    await settle(() => docs.every(d => d?.object));
    const [tBrute, tWeak, tV1, tV2, tKin, tKinV, tV3] = docs.map(d => d.object ?? d);
    CONFIG.Dice.randomUniform = () => 0.01; // Foundry's d10 reads this as a 10

    await G.step("1. Joint Break breaks the arm", async () => {
      // the attack window by hand: Punch, Joint Break, no defense, and the Attack button
      const run = C.attack({attacker: tBrute, target: tV1, weaponId: "unarmed:punch", noAim: true});
      let dlg = null;
      await settle(() => (dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector?.("select[name='maneuver']"))));
      for ( const [name, v] of [["weapon", "unarmed:punch"], ["maneuver", "jointbreak"], ["defense", "none"]] ) {
        const el = dlg?.element?.querySelector(`select[name='${name}']`);
        if ( el ) { el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); }
      }
      await wait(200);
      dlg?.element?.querySelector("button[data-action='attack']")?.click();
      await run;
      await settle(() => v1.effects.some(e => e.flags?.[MOD]?.da2002 === "cripple"), 30000);
      const strength = v1.system.attributes.strength.value;
      G.ok("1. Joint Break breaks the arm", v1.effects.some(e => e.flags?.[MOD]?.crippled === "arm-r" && e.flags?.[MOD]?.da2002 === "cripple"),
        {strength, effects: v1.effects.map(e => [e.name, e.flags]), cards: fresh(m => /Gate Man Victim A/.test(text(m))).map(m => text(m).slice(0, 200))});
    });

    await G.step("2. Neck Snap kills a mortal", async () => {
      await attackWith(C, tBrute, tV2, "necksnap");
      await settle(() => fresh(m => /neck breaks: death/.test(text(m))).length > 0, 30000);
      const card = fresh(m => /Neck Snap|neck/i.test(text(m)) && /Gate Man Victim B/.test(text(m))).map(m => text(m));
      await wait(3000);
      const lethal = Number(v2.system.health?.damage?.lethal ?? 0);
      G.ok("2. Neck Snap kills a mortal", fresh(m => /neck breaks: death/.test(text(m))).length > 0 && lethal + Number(v2.system.health?.damage?.aggravated ?? 0) >= 7, {lethal, health: v2.system.health, cards: card.map(c => c.slice(0, 300))});
    });

    await G.step("3. Gobbet Rend tears away a blood point", async () => {
      await attackWith(C, tKin, tKinV, "gobbet");
      await settle(() => Number(kinV.system.advantages.bloodpool.temporary) === 4, 30000);
      G.ok("3. Gobbet Rend tears away a blood point", Number(kinV.system.advantages.bloodpool.temporary) === 4, {blood: kinV.system.advantages.bloodpool.temporary});
    });

    await G.step("4. Choke Hold holds by the throat", async () => {
      await attackWith(C, tBrute, tV3, "choke");
      await settle(() => v3.getFlag(MOD, "grip")?.kind === "choke", 30000);
      const g = v3.getFlag(MOD, "grip");
      G.ok("4. Choke Hold holds by the throat", g?.kind === "choke" && g?.byName === "Gate Man Brute" && !Number(v3.system.health?.damage?.bashing ?? 0), {grip: g, health: v3.system.health?.damage});
    });

    await G.step("5. Joint Break without Brawl 4 is flagged", async () => {
      await attackWith(C, tWeak, tV3, "jointbreak");
      let card = null;
      await settle(() => (card = fresh(m => /Joint Break needs Brawl 4/.test(text(m)))[0]), 30000);
      G.ok("5. Joint Break without Brawl 4 is flagged", !!card, {card: text(card).slice(0, 300)});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
    // the first blow outside a fight starts one (an ambush): end it, and let its log writes land before the kit puts settings back
    for ( const c of [...game.combats].filter(c => /Gate Man/.test(c.combatants.map(x => x.name).join(" "))) ) await c.delete().catch(() => null);
    await wait(45000);
    if ( night0 !== null ) await game.settings.set("wodx-chronicle", "nightWork", night0).catch(() => null);
  }
  return G.finish();
}
