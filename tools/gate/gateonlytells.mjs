/**
 * Final systems audit, worker 1 (B6727, B6729): rules that were only text now act. In rothenstein-wodx as a Gamemaster:
 *   await (await import(`/wodx-gate/gateonlytells.mjs?${Date.now()}`)).run()
 *   1. a Redcap changeling (WoDX Chronicle signatures on): an Intimidation roll is two easier, a Charisma + Persuasion
 *      roll two harder (C20 p. 101)
 *   2. a Rock Giant changeling has one more Bruised level in the toughness WoDX Combat reads (C20 p. 402)
 *   3. a Demon's apocalyptic form Trait Chimerical Aura, made on the actor, carries its Dodge bonus (system B6729)
 *   4. WoDX Combat: a switched-on Mirage makes a ranged attack on the bearer two harder, a close one one harder
 *   6. WoDX Combat: a switched-on Claws form Trait gives the demon aggravated claws (Strength + 2) on its body
 *   5. (B6727) a line werewolf's form change puts the Crinos icon on the actor and Homid takes it off
 *   7. (B6922) a Bodach changeling has two fewer health levels: in the toughness WoDX Combat reads and, after the
 *      system's recompute, on the sheet's health track (C20 p. 373)
 * Makes its own actors and removes them; puts the setting back. Result: Data/wodx-gate/gateonlytells-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const CH = "wodx-chronicle";

export async function run() {
  const G = gate("gateonlytells");
  if ( G.notLive() ) return "gateonlytells never runs in the Live world";
  let keep;
  try { keep = game.settings.get(CH, "sigChangeling"); } catch (e) { keep = undefined; }
  try {
    const T = game.modules.get(CH)?.api?.traits;
    if ( keep !== undefined ) await game.settings.set(CH, "sigChangeling", true);
    const fae = (name, kith) => ({name, type: "Changeling", system: {kith}});
    const [redcap, giant, demon, wolf] = await G.make(Actor, [fae("Gate OnlyTells Redcap", "redcap"), fae("Gate OnlyTells Rock Giant", "rockgiants"),
      {name: "Gate OnlyTells Demon", type: "Demon"}, {name: "Gate OnlyTells Werewolf", type: "Werewolf"}]);

    await G.step("1. a Redcap's Intimidation is easier and other Social rolls harder", async () => {
      const sum = (a, tags) => (T?.effects?.(a, {tags}) ?? []).filter(e => e.key === "signature").reduce((s, e) => s + (Number(e.diff) || 0), 0);
      const intim = sum(redcap, ["intimidation", "social"]), pers = sum(redcap, ["social", "voice"]);
      G.ok("1. a Redcap's Intimidation is easier and other Social rolls harder", intim === -2 && pers === 2, {intim, pers});
    });
    await G.step("2. a Rock Giant has one more Bruised level", async () => {
      const b = T?.toughness?.(giant) ?? null;
      G.ok("2. a Rock Giant has one more Bruised level", (b?.bruised ?? 0) >= 1 && (b?.names ?? []).some(x => /Rock Giant/.test(x)), {bruised: b?.bruised, names: b?.names});
    });
    let aura = null;
    await G.step("3. a pack form Trait carries the bonus its text names", async () => {
      [aura] = await demon.createEmbeddedDocuments("Item", [{name: "Chimerical Aura", type: "Trait", system: {type: "wod.types.apocalypticform", bonuslist: []}}]);
      const b = demon.items.get(aura.id)?.system?.bonuslist ?? [];
      G.ok("3. a pack form Trait carries the bonus its text names", b.some(x => x.type === "ability_diff" && x.settingtype === "wod.abilities.dodge" && Number(x.value) === -2), {bonuslist: b});
    });
    await G.step("4. a switched-on Mirage makes attacks on the bearer harder", async () => {
      const R = await import("/modules/wodx-combat/scripts/rules.js");
      const [m] = await demon.createEmbeddedDocuments("Item", [{name: "Mirage", type: "Trait", system: {type: "wod.types.apocalypticform", isactive: true}}]);
      const sh = close => R.shieldFor({shields: R.formDefences(demon.items), close}).attackDiff;
      const ranged = sh(false), close = sh(true);
      await demon.items.get(m.id)?.update({"system.isactive": false});
      const off = sh(false);
      G.ok("4. a switched-on Mirage makes attacks on the bearer harder", ranged === 2 && close === 1 && off === 0, {ranged, close, off});
    });
    await G.step("6. a switched-on Claws Trait grows aggravated claws", async () => {
      await demon.createEmbeddedDocuments("Item", [{name: "Claws", type: "Trait", system: {type: "wod.types.apocalypticform", isactive: true, description: "<p>Claws.</p>"}}]);
      const w = game.wodxCombat?.body?.of?.(game.actors.get(demon.id))?.weapons?.claw ?? null;
      G.ok("6. a switched-on Claws Trait grows aggravated claws", w?.type === "aggravated" && Number(w?.bonus) === 2, {claw: w});
    });
    await G.step("5. a werewolf's form shows on its tokens", async () => {
      const TH = (await import("/systems/worldofdarkness/module/scripts/token-helpers.js")).default;
      await TH.formShift(wolf, "wod.shapes.homid", "wod.shapes.crinos");
      const has = k => [...(game.actors.get(wolf.id)?.effects ?? [])].some(e => e.statuses?.has?.(`wod_shapeform_form_${k}`));
      const crinos = has("crinos");
      await TH.formShift(wolf, "wod.shapes.crinos", "wod.shapes.homid");
      G.ok("5. a werewolf's form shows on its tokens", crinos && !has("crinos"), {crinos, after: has("crinos")});
    });
    await G.step("7. a Bodach has two fewer health levels", async () => {
      const [bod] = await G.make(Actor, [fae("Gate OnlyTells Bodach", "bodachs")]);
      const b = T?.toughness?.(bod) ?? null;
      const levels = () => Number(game.actors.get(bod.id)?.system?.traits?.health?.totalhealthlevels?.max) || 0;
      const base = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"].reduce((s, k) => s + (Number(bod.system?.health?.[k]?.value) || 1), 0);
      await bod.update({"system.settings.isupdated": false});
      await waitFor(() => levels() === base - 2, 6000);
      G.ok("7. a Bodach has two fewer health levels", (b?.fewer ?? 0) === 2 && levels() === base - 2 && (b?.names ?? []).some(x => /Deadly Exposure/.test(x)),
        {fewer: b?.fewer, base, levels: levels(), hurt: game.actors.get(bod.id)?.system?.health?.hurt?.total, names: b?.names});
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  finally { if ( keep !== undefined ) await game.settings.set(CH, "sigChangeling", keep).catch(() => null); }
  return G.finish();
}
