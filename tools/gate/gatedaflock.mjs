/**
 * Dark Ages depth desk item 3, part 2 (B7649): a Road's walkers in a town as its local group. In rothenstein-wodx (or
 * any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedaflock.mjs?${Date.now()}`)).run()
 *   1. three vampires on the Road of Kings and one on the Road of Heaven stand in a scene; the Storyteller picks
 *      "Gather the Road's walkers" in the Road window: WoDX NPC holds "The Luminaries of <scene>", a secret Kindred
 *      faction on orders, led by the highest on the Road, with the three Luminaries and not the Faithful
 *   2. the Road window of a member names the group; gathering again with one gone replaces it with the two left
 * Makes its own scene, actors and tokens; puts back the factions record. Result: Data/wodx-gate/gatedaflock-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const A = () => game.wodxActions ?? game.modules.get("wodx-actions")?.api;
const FX = () => game.modules.get("wodx-npc")?.api?.factions;
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);

/** Open the Road window, pick a choice, press OK; returns the window's text before the press. */
async function roadWindow(actor, act) {
  A().roadFaith({actor});
  let w = null;
  await waitFor(() => (w = titled(/^The Road: /)), 10000);
  const el = elOf(w), text = el?.textContent ?? "";
  const sel = el?.querySelector?.('[name="act"]');
  const has = [...(sel?.options ?? [])].some(o => o.value === act);
  if ( sel && has ) { sel.value = act; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  el?.querySelector?.('button[data-action="ok"]')?.click();
  return {window: !!w, text, has};
}

export async function run() {
  const G = gate("gatedaflock");
  if ( G.notLive() ) return "gatedaflock never runs in the Live world";
  const keep = {};
  try {
    await waitFor(() => !!A()?.roadFaith && !!A()?.roads?.() && !!FX()?.gatherFlock, 30000);
    keep.factions = foundry.utils.deepClone(game.settings.get("wodx-npc", "factions"));
    const s = await G.scene({name: "Gate DA Flock Chapel"});
    const v = (name, rating) => ({name, type: "Vampire", system: {advantages: {path: {permanent: rating, value: rating}}}});
    const [lord, knight, squire, nun] = await G.make(Actor, [v("Gate Flock Lord", 8), v("Gate Flock Knight", 6), v("Gate Flock Squire", 2), v("Gate Flock Nun", 7)]);
    for ( const a of [lord, knight, squire] ) await a.setFlag("wodx-actions", "road", {key: "kings", path: null});
    await nun.setFlag("wodx-actions", "road", {key: "heaven", path: null});
    const toks = await G.tokens(s, [{actor: lord, x: 2, y: 2}, {actor: knight, x: 3, y: 2}, {actor: squire, x: 4, y: 2}, {actor: nun, x: 5, y: 2}]);
    const id = FX().flockRules.flockId("kings", s.uuid);
    const group = () => FX().state().factions.find(f => f.id === id) ?? null;

    await G.step("1. the Storyteller gathers the Luminaries of the scene from the Road window", async () => {
      const w = await roadWindow(knight, "gatherFlock");
      const made = await waitFor(() => !!group(), 30000);
      const g = group();
      G.ok("1. the Storyteller gathers the Luminaries of the scene from the Road window", w.has && made && g.name === `The Luminaries of ${s.navName || s.name}` && g.kind === "kindred"
        && g.secret && g.run === "orders" && g.leader === lord.id && g.members.length === 3 && !g.members.includes(nun.id) && g.places.includes(s.uuid),
        {window: w.window, choice: w.has, name: g?.name ?? null, leader: g?.leader === lord.id, members: g?.members?.length ?? 0, nun: g?.members?.includes(nun.id) ?? null, run: g?.run, secret: g?.secret});
    }, {timeout: 90000});

    await G.step("2. a member's Road window names the group; gathering again with one gone keeps the two left", async () => {
      const w = await roadWindow(squire, "");
      const named = w.text.includes(group()?.name ?? "\u0000");
      await toks[2].delete();
      await roadWindow(knight, "gatherFlock");
      const two = await waitFor(() => group()?.members?.length === 2, 30000);
      G.ok("2. a member's Road window names the group; gathering again with one gone keeps the two left", named && two && !group().members.includes(squire.id)
        && FX().state().factions.filter(f => f.id === id).length === 1, {named, members: group()?.members?.length ?? 0, copies: FX().state().factions.filter(f => f.id === id).length});
    }, {timeout: 90000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  finally {
    try { if ( keep.factions !== undefined ) await game.settings.set("wodx-npc", "factions", keep.factions); } catch (e) { G.ok("put back the factions", false, {error: e.message}); }
  }
  return G.finish();
}
