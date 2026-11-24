/**
 * Black powder in a real shot (B2712-B2714), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepowder.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene, a musketeer and a mark, and removes them all.
 *   1. a matchlock with wet powder, fired from the attack window's own Attack button, does not fire: the mark takes
 *      no harm, the charge stays in the gun, and the one firing is told the powder is wet
 * Result: Data/wodx-gate/gatepowder-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-combat";

export async function run() {
  const G = gate("gatepowder", {stepTimeout: 45000});
  const said = [], kinds = ["info", "warn", "error"], keep = Object.fromEntries(kinds.map(k => [k, ui.notifications[k]]));
  let powder = null;
  try {
    if ( game.settings.settings.has(`${C}.blackPowder`) ) { powder = game.settings.get(C, "blackPowder"); await game.settings.set(C, "blackPowder", true); }
    const scene = await G.scene({name: "WoDX gate: powder"});

    await G.step("1. wet powder will not fire from the attack window", async () => {
      const [gunman, mark] = await G.make(Actor, [{name: "Gate Powder Musketeer", type: "Mortal"}, {name: "Gate Powder Mark", type: "Mortal"}]);
      const made = await gunman.createEmbeddedDocuments("Item", [{name: "Matchlock arquebus", type: "Ranged Weapon", system: {clip: {value: 1, max: 1}}}]);
      const gun = made.find(i => i.type === "Ranged Weapon");
      await gun.setFlag(C, "powder", {wet: true});
      await G.tokens(scene, [{actor: gunman, x: 2, y: 2, actorLink: true}, {actor: mark, x: 4, y: 2, actorLink: true}]);
      const hurt = () => { const d = game.actors.get(mark.id).system.health.damage; return Number(d.bashing) + Number(d.lethal) + Number(d.aggravated); };
      const before = hurt(), clip = () => Number(game.actors.get(gunman.id).items.get(gun.id)?.system?.clip?.value);
      for ( const k of kinds ) ui.notifications[k] = function (m, ...rest) { said.push(`${k}: ${m}`); return keep[k].call(this, m, ...rest); };
      // the player's own path: the attack window opens on the gun, and its Attack button is pressed
      const shot = game.wodxCombat.attack({attacker: gunman, target: mark, weaponId: gun.id});
      const findBtn = () => [...document.querySelectorAll(".wodx-form-dialog")].find(d => /WoDX Attack/.test(d.textContent))
        ?.querySelector('button[data-action="attack"]') ?? null;
      await waitFor(findBtn, 10000);
      const btn = findBtn();
      // a press made while the window is still drawing can be lost: press again until the window closes
      for ( let i = 0; i < 4 && findBtn(); i++ ) { findBtn()?.click(); await waitFor(() => !findBtn(), 2500); }
      const res = await Promise.race([shot, new Promise(r => setTimeout(() => r("timeout"), 15000))]);
      const after = hurt();
      const why = said.find(s => /cannot fire/.test(s) && /wet/.test(s)) ?? null;
      G.ok("1. wet powder will not fire from the attack window", !!btn && after === before && clip() === 1 && !!why,
        {button: !!btn, res: res === "timeout" ? "timeout" : res === null ? null : typeof res, before, after, clip: clip(), why, said: said.slice(0, 6)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const k of kinds ) ui.notifications[k] = keep[k];
    for ( const d of [...document.querySelectorAll(".wodx-form-dialog")].filter(d => /WoDX Attack/.test(d.textContent)) ) d.querySelector('button[data-action="close"], button[data-action="cancel"]')?.click();
    if ( powder !== null ) { try { await game.settings.set(C, "blackPowder", powder); } catch (e) { G.R.notes.push(`setting: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
