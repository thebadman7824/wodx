/**
 * WoDX Interactables and Combat gate: cover on the map (B4671 to B4673), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecover.mjs?${Date.now()}`)).run()
 * Makes its own scene, tile, actors and tokens and removes them; never moves the clock.
 *   1. a table between a shooter and a target crouched behind it is light cover: +1 on the shot
 *   2. the target tips the table over through Interact: it is marked tipped over, and good cover: +2
 *   3. a shot through WoDX Combat says so on its card ("Cover: ... +2")
 *   4. nothing between them: no cover
 * Result: Data/wodx-gate/gatecover-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-interactables";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 5000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };

export async function run() {
  const G = gate("gatecover");
  try {
    const I = game.modules.get(MOD)?.api, C = game.modules.get("wodx-combat")?.api ?? game.wodxCombat;
    const scene = await G.scene({activate: true});
    const [table] = await G.make(TileDocument, [{x: 500, y: 600, width: 200, height: 100, texture: {src: null},
      flags: {[MOD]: {cover: true, coverKind: "table", title: "The gate table"}}}], {parent: scene});
    const [shooter, crouch, open] = await G.make(Actor, [{name: "Gate Cover Shooter", type: "Mortal"}, {name: "Gate Cover Crouching", type: "Mortal"},
      {name: "Gate Cover Standing", type: "Mortal"}]);
    await shooter.createEmbeddedDocuments("Item", [{name: "Gate Cover pistol", type: "Ranged Weapon", system: {isequipped: true, difficulty: 6, range: 20,
      damage: {attribute: "", bonus: 4, type: "lethal"}, attack: {attribute: "dexterity", ability: "firearms"}, clip: {value: 6, max: 6}}}]);
    const [ts, tc, to] = await G.tokens(scene, [{actor: shooter, x: 5, y: 2}, {actor: crouch, x: 5, y: 7}, {actor: open, x: 12, y: 7}]);
    await settle(() => [ts, tc, to].every(d => d?.object));

    await G.step("1. light cover behind a table", async () => {
      const c = I.coverOnShot(ts, tc);
      G.ok("1. light cover behind a table", c?.diff === 1 && /behind/.test(c.note), {diff: c?.diff, note: c?.note});
    });

    await G.step("2. tip the table over", async () => {
      await I.attempt(tc.object, table.id, "tipOver");
      await settle(() => scene.tiles.get(table.id)?.flags?.[MOD]?.tipped === true);
      const c = I.coverOnShot(ts, tc);
      const name = I.rules.nameOf(I.describeTile(scene.tiles.get(table.id)));
      G.ok("2. tip the table over", scene.tiles.get(table.id)?.flags?.[MOD]?.tipped === true && c?.diff === 2 && /tipped over/.test(name), {diff: c?.diff, name});
    });

    await G.step("3. the shot's card names the cover", async () => {
      const t0 = Date.now();
      await C.quickAttack({attacker: ts.object, target: tc.object});
      let card = null;
      await settle(() => (card = game.messages.contents.filter(m => m.timestamp >= t0).find(m => /Cover:/.test(m.content))));
      G.ok("3. the shot's card names the cover", !!card && /\+2/.test(card.content), {card: !!card});
    });

    await G.step("4. nothing between: no cover", async () => {
      const c = I.coverOnShot(ts, to);
      G.ok("4. nothing between: no cover", c?.diff === 0 && !c.note, {diff: c?.diff});
    });
  } finally { return G.finish(); }
}
