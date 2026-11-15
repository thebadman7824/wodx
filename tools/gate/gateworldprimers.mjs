/**
 * Era primers by region (B5880 to B5882), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldprimers.mjs?${Date.now()}`)).run()
 * Uses the players' primer journal the setup made, or makes one of its own; moves the homeland to Egypt and back.
 * The clock does not move.
 *   1. the rules give the lands of Islam their own lines and keep the era's lines for Western Christendom
 *   2. a homeland in Egypt rewrites "What everyone knows" by itself, with the way of life named
 *   3. back in Moravia the page is the era's own again
 *   4. the Storyteller's pages beside it are left alone
 * Result: Data/wodx-gate/gateworldprimers-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

export async function run() {
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const G = gate("gateworldprimers");
  const ST = "wodx-storyteller", CH = "wodx-chronicle";
  const before = game.settings.get(CH, "homeland");
  try {
    const P = await import(`/modules/${ST}/data/primers-world.mjs`);
    const S = await import(`/modules/${ST}/scripts/setup-rules.mjs`);
    let j = [...game.journal].find(d => d.flags?.[ST]?.template?.kind === "primer");
    if ( !j ) {
      [j] = await G.make(JournalEntry, [{name: "The world in this era", flags: {[ST]: {template: {kind: "primer", version: S.TEMPLATE_VERSION}}},
        ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}}]);
      await j.createEmbeddedDocuments("JournalEntryPage", [{name: "What everyone knows", type: "text", text: {content: "<p>Old text</p>", format: 1}}]);
    }
    const [own] = await j.createEmbeddedDocuments("JournalEntryPage", [{name: "WoDX gate: the Storyteller's own page", type: "text", text: {content: "<p>Kept</p>", format: 1}}]);
    const text = () => j.pages.find(p => p.name === "What everyone knows")?.text?.content ?? "";
    const W = game.modules.get(CH)?.api?.world;
    const year = Number(game.modules.get(CH)?.api?.eras?.currentYear?.()) || 1197;

    await G.step("1. the rules answer", async () => {
      const isl = S.playerPrimer({id: "dark-ages", name: "The Dark Ages"}, {sphere: "islamic", sphereLabel: "The lands of Islam", year: 1197});
      const lat = S.playerPrimer({id: "dark-ages", name: "The Dark Ages"}, {sphere: "latin", year: 1197});
      G.ok("1. the rules answer", /call to prayer/.test(isl) && /feudal order/.test(lat) && typeof P.worldPrimer === "function", {year});
    });
    await G.step("2. a homeland in Egypt rewrites the page", async () => {
      await game.settings.set(CH, "homeland", "egypt");
      const label = W?.rules?.SPHERES?.[W.rules.sphereFor("egypt", year)] ?? "";
      await waitFor(() => label && text().includes(label), 10000);
      G.ok("2. a homeland in Egypt rewrites the page", !!label && text().includes(label) && !/feudal order/.test(text()), {label, text: text().slice(0, 200)});
    });
    await G.step("3. back in Moravia the era's own lines", async () => {
      await game.settings.set(CH, "homeland", "moravia");
      await waitFor(() => !text().includes("The lands of Islam"), 10000);
      G.ok("3. back in Moravia the era's own lines", !text().includes("The lands of Islam") && text().length > 40, {text: text().slice(0, 200)});
    });
    await G.step("4. the Storyteller's own page is kept", async () => {
      const p = j.pages.get(own.id);
      G.ok("4. the Storyteller's own page is kept", p?.text?.content === "<p>Kept</p>", {kept: p?.text?.content});
      await p?.delete();
    });
  } finally {
    try { if ( game.settings.get(CH, "homeland") !== before ) await game.settings.set(CH, "homeland", before); } catch (e) { /* kept */ }
    return G.finish();
  }
}
