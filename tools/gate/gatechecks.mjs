/**
 * Common checks gate (WoDX Actions 3.13.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatechecks.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes one mortal of its own ("WoDX gate: Watcher", Perception 3, Alertness 2, Willpower 6), rolls with it, and
 * deletes it and its chat cards at the end. Rothenstein's own actors and scenes are not touched; the clock never moves.
 *   1. the module: WoDX Actions 3.13.0 or later, quickCheck, 41 checks, the new presets
 *   2. the menu: "Any roll / dramatic system" then "Common checks" in the Act group, with a description
 *   3. the Common checks window: one select of 41 checks with a search box; the pool line names Perception 3 + Alertness 2
 *   4. a Perception check: Notice something rolls 5 dice at 6 and posts a card with the page
 *   5. an untrained Knowledge (First aid with no Medicine) is refused on the card
 *   6. a Willpower roll rolls the Willpower rating (6 dice)
 *   7. the free roll's preset "Common: Sense the uncanny" sets Perception at difficulty 7
 *   8. the menu button opens the window
 *   9. clean up
 * Result: Data/wodx-gate/gatechecks-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
/** The newest open dialog whose title starts with the text, waited for. */
async function dialogTitled(text, ms = 4000) {
  const t0 = Date.now();
  while ( Date.now() - t0 < ms ) {
    const app = [...foundry.applications.instances.values()].filter(a => a.rendered && String(a.title ?? a.options?.window?.title ?? "").startsWith(text)).at(-1);
    if ( app?.element ) return app;
    await sleep(100);
  }
  return null;
}
async function closeAll() {
  for ( const app of [...foundry.applications.instances.values()] ) {
    if ( app instanceof foundry.applications.api.DialogV2 && app.rendered && app.element?.querySelector?.(".wodx-menu2, .vta-check-pool, select[name=preset]") ) await app.close();
  }
  await sleep(200);
}
/** Open the Common checks window, pick a check, press Roll, and return the new chat card's text. */
async function rollCheck(actor, key, made) {
  const before = game.messages.size;
  const p = game.wodxActions.quickCheck({actor, check: key});
  const app = await dialogTitled("Common checks");
  if ( !app ) return {error: "no window"};
  const sel = app.element.querySelector("select[name=check]");
  sel.value = key;
  sel.dispatchEvent(new Event("change", {bubbles: true}));
  await sleep(100);
  const pool = app.element.querySelector(".vta-check-pool")?.textContent ?? "";
  app.element.querySelector('button[data-action="ok"]').click();
  await p;
  await sleep(500);
  const msgs = [...game.messages].slice(before);
  for ( const m of msgs ) made.push(m.id);
  const text = msgs.map(m => m.content).join(" ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return {pool, text};
}

export async function run() {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const made = [];
  let actor = null;
  try {
    await step("1 module", async () => {
      const m = game.modules.get("wodx-actions");
      const A = game.wodxActions;
      const P = A?.presets ?? {};
      ok("1 module", m?.active && newer(m.version, "3.13.0") && typeof A?.quickCheck === "function" && A.checks?.CHECKS?.length === 41
        && ["check-notice", "drive", "computer", "carrying"].every(k => P[k]), {version: m?.version, checks: A?.checks?.CHECKS?.length});
    });

    actor = await Actor.create({name: "WoDX gate: Watcher", type: "Mortal"});
    await actor.update({"system.attributes.perception.value": 3, "system.abilities.alertness.value": 2, "system.abilities.medicine.value": 0,
      "system.abilities.awareness.value": 0, "system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6});
    R.notes.push(`Watcher: Perception ${actor.system.attributes.perception.total ?? actor.system.attributes.perception.value}, Alertness ${actor.system.abilities.alertness?.value}`);

    await step("2 menu", async () => {
      const p = game.wodxActions.menu({actor});
      const app = await dialogTitled("WoDX Actions");
      const btns = [...(app?.element.querySelectorAll(".vta-band-act button[data-k]") ?? [])].map(b => b.dataset.k);
      const q = app?.element.querySelector('button[data-k="api:quickCheck"]');
      ok("2 menu", btns[0] === "action" && btns[1] === "api:quickCheck" && !!q?.dataset.hint, {act: btns.slice(0, 4), hint: q?.dataset.hint});
      await app?.close();
      await p;
    });

    await step("3 window", async () => {
      const p = game.wodxActions.quickCheck({actor});
      const app = await dialogTitled("Common checks");
      const sel = app?.element.querySelector("select[name=check]");
      const box = app?.element.querySelector('input.wodx-search[data-search="select[name=check]"]');
      const pool = app?.element.querySelector(".vta-check-pool")?.textContent ?? "";
      ok("3 window", sel?.options.length === 41 && !!box && /Perception 3 \+ Alertness 2/.test(pool), {options: sel?.options.length, search: !!box, pool});
      await app?.close();
      await p;
    });

    await step("4 notice", async () => {
      const r = await rollCheck(actor, "notice", made);
      ok("4 notice", /Notice something/.test(r.text) && /5 dice, diff 6/.test(r.text) && /V20 p\. 100/.test(r.text), {pool: r.pool, card: r.text?.slice(0, 300)});
    });

    await step("5 untrained knowledge", async () => {
      const r = await rollCheck(actor, "firstaid", made);
      ok("5 untrained knowledge", /untrained Knowledge cannot be attempted/.test(r.text), {pool: r.pool, card: r.text?.slice(0, 300)});
    });

    await step("6 willpower", async () => {
      const r = await rollCheck(actor, "willpower", made);
      ok("6 willpower", /Willpower/.test(r.text) && /6 dice, diff 6/.test(r.text), {pool: r.pool, card: r.text?.slice(0, 300)});
    });

    await step("7 preset", async () => {
      const p = game.wodxActions.action({actor, preset: "check-uncanny"});
      const app = await dialogTitled("WoDX Action");
      await sleep(200);
      const f = n => app?.element.querySelector(`[name=${n}]`)?.value;
      ok("7 preset", f("preset") === "check-uncanny" && f("attr") === "perception" && f("diff") === "7", {attr: f("attr"), ability: f("ability"), diff: f("diff")});
      await app?.close();
      await p;
    });

    await step("8 menu button", async () => {
      const p = game.wodxActions.menu({actor});
      const app = await dialogTitled("WoDX Actions");
      app?.element.querySelector('button[data-k="api:quickCheck"]')?.click();
      const win = await dialogTitled("Common checks");
      ok("8 menu button", !!win, {});
      await win?.close();
      await p;
    });
  } catch (e) {
    R.errors.push(String(e.stack ?? e));
  } finally {
    await step("9 clean up", async () => {
      await closeAll();
      for ( const id of made ) await game.messages.get(id)?.delete();
      await actor?.delete();
      ok("9 clean up", !game.actors.getName("WoDX gate: Watcher") && made.every(id => !game.messages.get(id)), {cards: made.length});
    });
  }
  return save(R, "gatechecks-result.json");
}
