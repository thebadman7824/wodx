/**
 * More builds and the Mockery Breeds' healing (B7820-B7822), in Foundry, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemorebuilds.mjs?${Date.now()}`)).run()
 * It makes its own scratch scene, two Mortal sheets, a Creature sheet and a fight, and removes them all.
 *   1. the five new books are in the creation totals, and the Chronicle traits api hands out mockeryOf
 *   2. a Mortal sheet set to sorcerer opens the Creation check on Sorcerer Revised; its rows name the Numina
 *   3. switching the window to HH2: two Numina dots on a plain hunter cost 14 of the 21 freebies
 *   4. a War Wolf on a Creature sheet regenerates a bashing level at the new round, and the card names the breed and page
 * Result: Data/wodx-gate/gatemorebuilds-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const win = cls => [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains(cls));
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export async function run() {
  const G = gate("gatemorebuilds");
  let combat = null;
  try {
    const scene = await G.scene();
    const api = game.modules.get(C)?.api;

    await G.step("1. the new books and the traits api", async () => {
      const T = api?.totals?.TOTALS ?? {};
      const want = ["hh2", "mortal", "sorcerer", "kinfolk", "kinain"];
      G.ok("1. the new books and the traits api", want.every(k => T[k]?.ref && T[k]?.costRef) && typeof game.modules.get("wodx-chronicle")?.api?.traits?.mockeryOf === "function",
        {have: want.filter(k => T[k]), refs: want.map(k => T[k]?.ref)});
    });

    const [sorc, hunter] = await G.make(Actor, [{name: "Gate More Builds Sorcerer", type: "Mortal"}, {name: "Gate More Builds Hunter", type: "Mortal"}]);

    await G.step("2. a sorcerer's sheet opens on Sorcerer Revised", async () => {
      await sorc.update({"system.settings.variant": "sorcerer"}); await sleep(300);
      await api.check(sorc);
      await waitFor(() => win("wodx-creation-check"), 8000);
      const w = win("wodx-creation-check");
      const line = w?.element.querySelector("select[name=line]")?.value;
      const options = [...(w?.element.querySelectorAll("select[name=line] option") ?? [])].map(o => o.value);
      const body = w?.element.textContent ?? "";
      G.ok("2. a sorcerer's sheet opens on Sorcerer Revised", line === "sorcerer" && /Numina/.test(body) && ["hh2", "mortal", "kinfolk", "kinain"].every(k => options.includes(k)),
        {line, options: options.length, numina: /Numina/.test(body)});
      await w?.close();
    });

    await G.step("3. HH2: two Numina dots cost 14 freebies", async () => {
      const it = await hunter.createEmbeddedDocuments("Item", [{name: "Gate Telepathy", type: "Power", system: {type: "wod.types.numina", value: 2}}]);
      await sleep(300);
      const {totalsView} = await import("/modules/wodx-creation/scripts/totals-check.mjs");
      const view = totalsView(game.actors.get(hunter.id), "hh2");
      const res = api.totals.checkCreation(view, "hh2");
      const row = res.rows.find(r => r.group === "numina");
      // the window shows the same row once switched to HH2
      await api.check(game.actors.get(hunter.id));
      await waitFor(() => win("wodx-creation-check"), 8000);
      const w = win("wodx-creation-check");
      const sel = w?.element.querySelector("select[name=line]");
      if ( sel ) { sel.value = "hh2"; sel.dispatchEvent(new Event("change")); }
      await sleep(800);
      const shown = win("wodx-creation-check")?.element.textContent ?? "";
      G.ok("3. HH2: two Numina dots cost 14 freebies", view.powers.numina === 2 && row?.cost === 14 && res.freebies.allowed === 21 && /Numina/.test(shown) && /HH2|Hunters Hunted/.test(shown),
        {numina: view.powers.numina, row, freebies: res.freebies, item: it?.[0]?.id ?? null});
      await win("wodx-creation-check")?.close();
    });

    await G.step("4. a War Wolf regenerates at the new round", async () => {
      const [wolf] = await G.make(Actor, [{name: "Gate More Builds War Wolf", type: "Creature"}]);
      await wolf.update({"system.settings.variant": "warwolves", "system.health.damage.bashing": 2}); await sleep(400);
      // a linked token, so the round heals the sheet itself (an unlinked one would heal only its own copy)
      const [tok] = await G.tokens(scene, [{actor: wolf, x: 3, y: 3, actorLink: true}]);
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tok.id, sceneId: scene.id, actorId: wolf.id}]);
      await combat.startCombat(); await sleep(1500);
      const a = () => game.actors.get(wolf.id);
      const before = a().system.health.damage.bashing;
      const since = Date.now();
      await combat.nextRound();
      await waitFor(() => game.messages.contents.some(m => (m.timestamp ?? 0) >= since && /Regeneration/.test(m.content)), 8000);
      const card = game.messages.contents.filter(m => (m.timestamp ?? 0) >= since).find(m => /Regeneration/.test(m.content));
      const after = a().system.health.damage.bashing;
      G.ok("4. a War Wolf regenerates at the new round", game.modules.get("wodx-chronicle").api.traits.mockeryOf(a()) === "warwolves" && after === before - 1
        && /War Wolf, W20 Book of the Wyrm p\. 167/.test(text(card)), {before, after, card: text(card).slice(0, 200)});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    try { if ( combat && game.combats.get(combat.id) ) await combat.delete(); } catch (e) { G.R.notes.push(`combat: ${e?.message ?? e}`); }
    return G.finish();
  }
}
