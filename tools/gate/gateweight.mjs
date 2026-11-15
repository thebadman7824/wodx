/**
 * WoDX Library, Interactables and Combat gate: what things weigh, and loose gear on the map (B6080 to B6089), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateweight.mjs?${Date.now()}`)).run()
 * Makes its own scratch scene, actors, items, tokens and tiles, and removes them; never moves the clock (each weight
 * is asked for a year of its own).
 *   1. the Library serves weights: mail of 1300 weighs about 18 kg, a vest of 1990 about 5, a wheelchair less in 2010
 *   2. a chest weighs what is in it: an anvil inside makes it 130 kg, and the Interact menu names the weight
 *   3. a fallen character in mail is heavier to carry than one without, and the Carry option says how much is gear
 *   4. Set gear down: the sword leaves the sheet, a pile tile stands on the square, and its heap is drawn on the map
 *   5. more gear on the same square joins the pile; the haul menu offers to haul it at its real weight
 *   6. picking it up from the Interact menu gives back the items as they were (the sword's own damage), and the heap
 *      is gone
 *   7. a swimmer with a heavy pack is weighed down by it, and setting the pack down lightens the load
 * Result: Data/wodx-gate/gateweight-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const IX = "wodx-interactables";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const body = (name, {str = 2} = {}) => ({name, type: "Mortal",
  system: {attributes: {strength: {value: str, total: str}, dexterity: {value: 3, total: 3}, stamina: {value: 2, total: 2}}, abilities: {athletics: {value: 2}}}});
async function applied(msg, ms = 8000) {
  const t = Date.now();
  while ( Date.now() - t < ms ) {
    const m = game.messages.get(msg?.id);
    if ( m?.flags?.[IX]?.done || m?.flags?.[IX]?.ask?.state ) return m;
    await sleep(100);
  }
  return game.messages.get(msg?.id);
}
const heapDrawn = () => {
  const find = c => (c?.name === "wodxLoosePiles" ? c : (c?.children ?? []).map(find).find(Boolean));
  const layer = find(canvas.primary) ?? find(canvas.interface);
  return layer ? layer.children.length : 0;
};

export async function run() {
  const G = gate("gateweight");
  if ( G.notLive() ) return "Not on the Live world.";
  try {
    const W = () => game.modules.get("wodx-library")?.api?.weight, ix = () => game.modules.get(IX)?.api;
    const scene = await G.scene({width: 2000, height: 1500});
    const [ana, bruno, cira] = await G.make(Actor, [body("Gate Weight Ana", {str: 3}), body("Gate Weight Bruno"), body("Gate Weight Cira", {str: 2})]);
    const [ta, tb, tc] = await G.tokens(scene, [{actor: ana, x: 2, y: 2, actorLink: true}, {actor: bruno, x: 3, y: 2, actorLink: true}, {actor: cira, x: 10, y: 6, actorLink: true}]);
    await waitFor(() => ta?.object && tb?.object && tc?.object);

    await G.step("1. the Library serves weights", async () => {
      const w = W();
      const mail = {name: "Mail", type: "Armor", system: {soak: {lethal: 4}}, flags: {}};
      const vest = {name: "Vest", type: "Armor", system: {soak: {lethal: 3}}, flags: {}};
      const chair = {name: "a wheelchair", type: "Item", system: {}, flags: {}};
      const r = {ready: !!w?.ready, mail1300: w?.itemKg(mail, 1300), vest1990: w?.itemKg(vest, 1990), chair1800: w?.itemKg(chair, 1800), chair2010: w?.itemKg(chair, 2010),
        lines: w?.linesKg(["an anvil", "silver pennies (7)"], 1300)};
      G.ok("1. the Library serves weights", r.ready && r.mail1300 === 18 && r.vest1990 === 5 && r.chair2010 < r.chair1800 && r.lines?.kg > 100, r);
    });

    await G.step("2. a chest weighs what is in it", async () => {
      const [chest] = await scene.createEmbeddedDocuments("Tile", [{x: 500, y: 200, width: 100, height: 100, texture: {src: null},
        flags: {[IX]: {container: true, kind: "chest", ds: "open", items: ["an anvil"]}}}]);
      const th = ix().haul.thingOf(scene.tiles.get(chest.id));
      const o = ix().describeTile(scene.tiles.get(chest.id));
      const opts = ix().rules.optionsFor(o, ix().characterFor(ana, ta.object.center, chest));
      const take = opts.find(x => x.id === "take");
      G.ok("2. a chest weighs what is in it", th?.kg === 130 && th.inside === 100 && /about 100 kg/.test(take?.label ?? ""), {th, take: take?.label});
      await chest.delete();
    });

    await G.step("3. a body in mail is heavier", async () => {
      await bruno.toggleStatusEffect("unconscious", {active: true});
      await waitFor(() => ix().haul.fallenOf(tb).down, 4000);
      const bare = ix().haul.bodyWeight(tb);
      await bruno.createEmbeddedDocuments("Item", [{name: "Gate Weight mail", type: "Armor", system: {isequipped: true, soak: {bashing: 4, lethal: 4, aggravated: 0}, dexpenalty: 2}}]);
      await sleep(200);
      const dressed = ix().haul.bodyWeight(tb);
      const carry = ix().haul.optionsFor(ta).find(o => o.op === "take" && o.want === "carry" && o.what === tb.uuid);
      G.ok("3. a body in mail is heavier", dressed.kg > bare.kg && dressed.gear > 0 && /of gear/.test(carry?.note ?? ""), {bare, dressed, note: carry?.note});
      await bruno.toggleStatusEffect("unconscious", {active: false});
    });

    let pile = null;
    await G.step("4. set gear down", async () => {
      const [sword] = await cira.createEmbeddedDocuments("Item", [{name: "Gate Weight sword", type: "Melee Weapon", system: {difficulty: 6,
        damage: {attribute: "strength", bonus: 3, type: "lethal"}, attack: {attribute: "dexterity", ability: "melee"}}}]);
      const offered = ix().haul.optionsFor(tc).some(o => o.op === "setdown");
      pile = await ix().loose.setDown(tc, [sword.id]);
      await sleep(300);
      const f = pile?.flags?.[IX] ?? {};
      const drawn = await waitFor(() => heapDrawn() > 0, 3000);
      G.ok("4. set gear down", offered && !cira.items.get(sword.id) && f.pile && f.items?.[0] === "Gate Weight sword" && f.loose?.[0]?.data?.system?.damage?.bonus === 3 && drawn,
        {offered, onSheet: !!cira.items.get(sword.id), flags: {items: f.items, kind: f.kind}, drawn: heapDrawn()});
    });

    await G.step("5. the pile grows and can be hauled", async () => {
      const [rope] = await cira.createEmbeddedDocuments("Item", [{name: "a coil of hemp rope", type: "Item"}]);
      const again = await ix().loose.setDown(tc, [rope.id]);
      const f = scene.tiles.get(pile.id)?.flags?.[IX] ?? {};
      // the tile keeps its list as lines of text once saved through an update
      const lines = (Array.isArray(f.items) ? f.items : String(f.items ?? "").split(/\r?\n/)).map(s => String(s).trim()).filter(Boolean);
      const haul = ix().haul.optionsFor(tc).find(o => o.op === "take" && o.what === again?.uuid);
      G.ok("5. the pile grows and can be hauled", again?.id === pile.id && lines.length === 2 && f.loose?.length === 2 && /Haul the pile of gear/.test(haul?.label ?? "") && /About \d/.test(haul?.note ?? ""),
        {same: again?.id === pile.id, items: lines, loose: f.loose?.length, haul: haul ? [haul.label, haul.note] : null});
    });

    await G.step("6. picking it up", async () => {
      const msg = await applied(await ix().attempt(ta.object, pile.id, "take"));
      await sleep(400);
      const sword = ana.items.find(i => i.name === "Gate Weight sword");
      const gone = !ix().describeTile(scene.tiles.get(pile.id));
      await waitFor(() => heapDrawn() === 0, 3000);
      G.ok("6. picking it up", !!sword && sword.system?.damage?.bonus === 3 && ana.items.some(i => i.name === "a coil of hemp rope") && gone && heapDrawn() === 0,
        {card: String(msg?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200), sword: sword?.system?.damage, gone, drawn: heapDrawn()});
    });

    await G.step("7. a swimmer weighed down by a pack", async () => {
      const C = game.wodxCombat;
      const [pack] = await cira.createEmbeddedDocuments("Item", [{name: "Gate Weight stones", type: "Item", flags: {"wodx-library": {kg: 40}}}]);
      const loaded = C?.movement?.loadOf?.(cira) ?? C?.loadOf?.(cira) ?? null;
      await ix().loose.setDown(tc, [pack.id]);
      await sleep(300);
      const light = C?.movement?.loadOf?.(cira) ?? C?.loadOf?.(cira) ?? null;
      G.ok("7. a swimmer weighed down by a pack", loaded && light && loaded.steps > light.steps && /kg of gear/.test(loaded.note), {loaded, light, api: Object.keys(C ?? {}).slice(0, 30)});
    });
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { return G.finish(); }
}
