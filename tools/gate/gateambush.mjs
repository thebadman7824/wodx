/**
 * An ambush from hiding in a real attack (combat.ambush), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateambush.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene, a hidden attacker and a mark, and removes them all.
 *   1. a hidden attacker who presses the attack window's own Attack button rolls the ambush first: Dexterity + Stealth
 *      against the mark's Perception + Alertness, each pool the size the sheets give, on the ambush card
 * Result: Data/wodx-gate/gateambush-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-combat";
const diceIn = roll => (roll?.dice ?? []).reduce((n, d) => n + (Number(d.number) || d.results?.length || 0), 0);

export async function run() {
  const G = gate("gateambush", {stepTimeout: 45000});
  try {
    const scene = await G.scene({name: "WoDX gate: ambush"});

    await G.step("1. a hidden attacker's Attack rolls the ambush with the sheets' pools", async () => {
      const [lurker, mark] = await G.make(Actor, [{name: "Gate Ambush Lurker", type: "Mortal"}, {name: "Gate Ambush Mark", type: "Mortal"}]);
      await lurker.update({"system.attributes.dexterity.value": 3, "system.attributes.dexterity.total": 3, "system.abilities.stealth.value": 2});
      await mark.update({"system.attributes.perception.value": 2, "system.attributes.perception.total": 2, "system.abilities.alertness.value": 1,
        "system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
      const [knife] = await lurker.createEmbeddedDocuments("Item", [{name: "Knife", type: "Melee Weapon"}]);
      await G.tokens(scene, [{actor: lurker, x: 2, y: 2, actorLink: true, hidden: true}, {actor: mark, x: 3, y: 2, actorLink: true}]);
      const since = Date.now();
      const said = [], kinds = ["info", "warn", "error"], keep = Object.fromEntries(kinds.map(k => [k, ui.notifications[k]]));
      for ( const k of kinds ) ui.notifications[k] = function (msg, ...rest) { said.push(`${k}: ${msg}`); return keep[k].call(this, msg, ...rest); };
      // the player's own path: the attack window opens on the knife, and its Attack button is pressed
      const blow = game.wodxCombat.attack({attacker: lurker, target: mark, weaponId: knife.id});
      const findBtn = () => [...document.querySelectorAll(".wodx-form-dialog")].find(d => /WoDX Attack/.test(d.textContent))
        ?.querySelector('button[data-action="attack"]') ?? null;
      await waitFor(findBtn, 10000);
      const btn = findBtn();
      // a press made while the window is still drawing can be lost: press again until the window closes
      for ( let i = 0; i < 4 && findBtn(); i++ ) { findBtn()?.click(); await waitFor(() => !findBtn(), 2500); }
      // in a world with a long chat log one card can take over half a minute to save (cloud lane 9, 5,629
      // messages: 0.5 s mostly, once 36 s), so the blow and its cards get a minute
      const res = await Promise.race([blow, new Promise(r => setTimeout(() => r("timeout"), 60000))])
        .finally(() => { for ( const k of kinds ) ui.notifications[k] = keep[k]; });
      const ambushCard = () => game.messages.contents.find(m => (m.timestamp ?? 0) >= since && m.getFlag(C, "ambush"));
      await waitFor(ambushCard, 10000);
      const m = ambushCard();
      const pools = (m?.rolls ?? []).map(diceIn);
      G.ok("1. a hidden attacker's Attack rolls the ambush with the sheets' pools", !!btn && !!m && pools[0] === 5 && pools[1] === 3,
        {button: !!btn, card: !!m, pools, res: res === "timeout" ? "timeout" : res == null ? String(res) : typeof res, said: said.slice(0, 6),
          result: m?.getFlag(C, "ambush")?.result ?? null, book: m?.getFlag(C, "ambush")?.book ?? null,
          recent: game.messages.contents.filter(x => (x.timestamp ?? 0) >= since).map(x => String(x.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 80)).slice(0, 5)});
    }, {timeout: 120000});
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const d of [...document.querySelectorAll(".wodx-form-dialog")].filter(d => /WoDX Attack/.test(d.textContent)) ) d.querySelector('button[data-action="close"], button[data-action="cancel"]')?.click();
    for ( const c of game.combats.contents.filter(c => c.scene?.name === "WoDX gate: ambush") ) { try { await c.delete(); } catch (e) { G.R.notes.push(`combat: ${e?.message ?? e}`); } }
    return G.finish();
  }
}
