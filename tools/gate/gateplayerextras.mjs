/**
 * The Player UI Desk's steps 6 and 7 (B2830 to B2838), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplayerextras.mjs?${Date.now()}`)).run()
 * It makes one Vampire actor and deletes it, and puts back every WoDX setting of this screen it touches.
 *   1. the modules: Chronicle 0.52.0, Sheets 0.19.0, Solo 0.3.0, Interactables 0.39.0, Paperdoll 0.18.0, Library 0.20.0 or later
 *   2. the Possessions tab says "You carry ..." in one line; the coins fold is open in Full view and closed in Beginner view
 *   3. the solo panel opens on What happens next?, with the five other buttons under More
 *   4. a new case board's rules lay out Who, Where and What we know; the figure menu lists the main parts first, the rest under More
 *   5. the Glossary journal exists with a page per letter and opens at a term's letter
 *   6. Find anything has a ? in its title bar; with tips reset, the tip shows, and Got it marks it seen
 *   7. My WoDX preferences lists the player's own settings; Light changes some, Standard puts the defaults back
 *   8. the sheet's title bar has Sheet tools, which lists the other buttons by name
 *   9. the first-night tour opens on six steps with the first lit up; Skip moves on to the roll (B2838)
 * Result: Data/wodx-gate/gateplayerextras-result.json.
 */
const N = 9;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayerextras-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const el = app => app?.element?.[0] ?? app?.element ?? null;
const at = (id, v) => !!game.modules.get(id)?.active && !foundry.utils.isNewerVersion(v, game.modules.get(id).version);

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const V = game.modules.get("wodx-chronicle")?.api?.playerView;
  // Every client WoDX setting, to put back at the end
  const kept = [...game.settings.settings.values()].filter(s => String(s.namespace).startsWith("wodx") && (s.scope === "client" || s.scope === "user"))
    .map(s => { try { return [s.namespace, s.key, game.settings.get(s.namespace, s.key)]; } catch { return null; } }).filter(Boolean);
  let actor = null;
  try {
    ok("1. modules", at("wodx-chronicle", "0.52.0") && at("wodx-sheets", "0.19.0") && at("wodx-solo", "0.3.0") && at("wodx-interactables", "0.39.0")
      && at("wodx-paperdoll", "0.18.0") && at("wodx-library", "0.20.0"), {versions: ["wodx-chronicle", "wodx-sheets", "wodx-solo", "wodx-interactables", "wodx-paperdoll", "wodx-library"].map(m => `${m} ${game.modules.get(m)?.version}`)});

    actor = await Actor.create({name: "WoDX gate: extras", type: "Vampire"});
    V.preview("full");
    await actor.sheet.render(true); await sleep(1500);
    let sh = el(actor.sheet);
    const line = sh?.querySelector(".wodx-purse-line")?.textContent ?? "";
    const openFull = !!sh?.querySelector("details.wodx-purse-more[open]");
    // 8 is checked here too, on the same sheet
    const tools = sh?.querySelector(".window-header .wodx-sheet-tools");
    tools?.click(); await sleep(200);
    const listed = [...document.querySelectorAll(".wodx-sheet-tools-list button")].map(b => b.textContent.trim());
    document.querySelector(".wodx-sheet-tools-list")?.remove();
    await actor.sheet.close(); await sleep(300);
    V.preview("beginner");
    await actor.sheet.render(true); await sleep(1500);
    sh = el(actor.sheet);
    const closedBeg = !!sh?.querySelector("details.wodx-purse-more:not([open])");
    const worded = !!sh?.querySelector(".window-header .wodx-sheet-tools.wodx-worded");
    await actor.sheet.close(); await sleep(300);
    V.preview("full");
    ok("2. purse in one line", /^You carry /.test(line.trim()) && openFull && closedBeg, {line, openFull, closedBeg});

    await game.modules.get("wodx-solo")?.api?.panel?.open?.(); await sleep(800);
    const panel = document.getElementById("wodx-solo-panel");
    const next = panel?.querySelector(".wsolo-next")?.textContent?.trim() ?? "";
    const more = panel?.querySelectorAll("details.wsolo-more button[data-id]").length ?? 0;
    await foundry.applications.instances.get("wodx-solo-panel")?.close();
    ok("3. solo panel", /What happens next/.test(next) && more === 5, {next, more});

    const CR = await import(`/modules/wodx-interactables/scripts/case-rules.mjs?${Date.now()}`);
    const cards = CR.starterBoard().cards.map(c => c.title);
    await game.modules.get("wodx-paperdoll")?.api?.figure?.open?.(actor); await sleep(1500);
    const fig = [...foundry.applications.instances.values()].find(a => el(a)?.classList?.contains("wodx-figure-app"));
    const mainSlots = [...(el(fig)?.querySelectorAll(".wodx-figure-mid > ul > li > button.wodx-figure-slot") ?? [])].length;
    const moreSlots = el(fig)?.querySelectorAll(".wodx-figure-more button.wodx-figure-slot").length ?? 0;
    await fig?.close();
    ok("4. case board and figure menu", cards.join("|") === "Who|Where|What we know" && mainSlots === 6 && moreSlots >= 5, {cards, mainSlots, moreSlots, figure: !!fig});

    const L = game.modules.get("wodx-library")?.api;
    const gj = await L?.glossary?.ensure?.();
    await L?.glossary?.open?.("Rötschreck"); await sleep(900);
    const gPages = gj?.pages?.size ?? 0;
    const shown = gj?.sheet?.rendered;
    await gj?.sheet?.close();
    ok("5. glossary", gPages >= 15 && shown, {pages: gPages, shown});

    await game.settings.set("wodx-chronicle", "tipsOn", true);
    await game.settings.set("wodx-chronicle", "tipsSeen", []);
    await V.find(); await sleep(900);
    const find = document.getElementById("wodx-find");
    const mark = !!find?.querySelector(".window-header .wodx-help-mark");
    const tip = find?.querySelector(".window-content > .wodx-tip");
    const tipText = tip?.textContent?.trim() ?? "";
    tip?.querySelector("[data-tip=ok]")?.click(); await sleep(300);
    const seen = game.settings.get("wodx-chronicle", "tipsSeen");
    await foundry.applications.instances.get("wodx-find")?.close();
    ok("6. help mark and tip", mark && !!tip && seen.includes("wodx-find") && !find?.querySelector(".wodx-tip"), {mark, tipText: tipText.slice(0, 120), seen});

    await V.prefs(); await sleep(900);
    let pr = document.getElementById("wodx-prefs");
    const rows = pr?.querySelectorAll(".form-group [data-id]").length ?? 0;
    pr?.querySelector("[data-preset=light]")?.click(); await sleep(1500);
    const cues = kept.find(([n, k]) => n === "wodx-atmosphere" && k === "cues") ? game.settings.get("wodx-atmosphere", "cues") : null;
    document.getElementById("wodx-prefs")?.querySelector("[data-preset=standard]")?.click(); await sleep(1500);
    const cuesStd = cues === null ? null : game.settings.get("wodx-atmosphere", "cues");
    await foundry.applications.instances.get("wodx-prefs")?.close();
    ok("7. my preferences", rows >= 5 && (cues === null || (cues === false && cuesStd === game.settings.settings.get("wodx-atmosphere.cues").default)), {rows, cues, cuesStd});

    ok("8. sheet tools", !!tools && listed.length >= 3 && worded, {listed, worded});

    await V.tour({again: true}); await sleep(1500);
    const g = document.getElementById("wodx-guide");
    const steps = g?.querySelectorAll(".wodx-guide-steps > li").length ?? 0;
    const first = g?.querySelector(".wodx-guide-next b")?.textContent?.trim() ?? "";
    const lit = document.querySelectorAll(".wodx-guide-glow").length;
    g?.querySelector("[data-skip]")?.click(); await sleep(800);
    const second = document.getElementById("wodx-guide")?.querySelector(".wodx-guide-next b")?.textContent?.trim() ?? "";
    await foundry.applications.instances.get("wodx-guide")?.close(); await sleep(200);
    ok("9. first-night tour", steps === 6 && /sheet/i.test(first) && lit >= 1 && /roll/i.test(second) && !document.querySelector(".wodx-guide-glow"), {steps, first, lit, second});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { V?.preview?.(null); } catch (e) { R.errors.push(`preview back: ${e}`); }
    for ( const [n, k, v] of kept ) { try { if ( game.settings.get(n, k) !== v ) await game.settings.set(n, k, v); } catch (e) { R.errors.push(`setting ${n}.${k}: ${e}`); } }
    try { if ( actor ) await actor.delete(); } catch (e) { R.errors.push(`actor: ${e}`); }
  }
  return save(R);
}
