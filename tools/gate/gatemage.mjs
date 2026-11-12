/**
 * Tradition, Craft and Convention features gate (WoDX Chronicle 0.32.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemage.mjs?${Date.now()}`)).run()
 * Makes its own mages and a mortal, turns "Tradition, Craft and Convention features (Mage)" on, and puts the setting,
 * actors and chat cards back afterwards. The clock is not moved.
 *   1. the api and the setting
 *   2. rows: the system's sect keys find their rows; a Hermetic with House Flambeau stacks two; the year's old name shows
 *   3. roll effects reach the traits api: a Verbena's Medicine die
 *   4. an Akashic meditates at dawn: a Willpower point, refused the second time that day
 *   5. a Euthanatos: a Good Death gives Willpower, a death in anger adds Jhor
 *   6. a Hermetic calls a certámen: a public card whose button logs the stake
 *   7. a Sister of Hippolyta swears an oath and breaks it: a Willpower point lost
 *   8. a Taftani binds a djinn (the servant ledger, with its own word)
 *   9. a Breach of the Masquerade sends the Watchers card when a New World Order character exists
 *  10. a Nephandus' won charm moves the mortal's hidden Corruption
 *  11. every other WoDX module still answers
 * Result: Data/wodx-gate/gatemage-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.signatures, S = () => api().rules;
  const t0 = Date.now(), was = game.settings.get(C, "sigMage");
  const sig = a => game.actors.get(a.id)?.flags?.[C]?.sig ?? {};
  const wp = a => Number(game.actors.get(a.id)?.system?.advantages?.willpower?.temporary) || 0;
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-sig"));
  const lastCard = () => cards().at(-1);
  const press = async msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); el.querySelector("[data-wct-sig-act]")?.click(); };
  const mage = (name, sect, more = {}) => ({name, type: "Mage", system: {affiliation: "tradition", sect, advantages: {willpower: {permanent: 6, temporary: 3}}, ...more}});
  let actors = [];
  try {
    await game.settings.set(C, "sigMage", true);
    actors = await Actor.create([mage("WoDX gate: Akashic", "wod.bio.mage.akashic"), mage("WoDX gate: Euthanatos", "wod.bio.mage.euthanatos"),
      mage("WoDX gate: Flambeau", "wod.bio.mage.hermes", {custom: {sect: "House Flambeau"}}), mage("WoDX gate: Verbena", "wod.bio.mage.verbena"),
      mage("WoDX gate: Sister", "wod.bio.mage.hippolyta"), mage("WoDX gate: Taftani", "wod.bio.mage.taftani"), mage("WoDX gate: Watcher", "wod.bio.mage.nwo"),
      mage("WoDX gate: Nephandus", "wod.bio.mage.nephandi"), {name: "WoDX gate: Mark", type: "Mortal"}]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.32.0") && typeof api()?.meditate === "function" && game.settings.get(C, "sigMage") === true, {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const keys = ["Akashic", "Euthanatos", "Verbena", "Watcher", "Nephandus"].map(n => api().rowOf(by(n))?.key ?? null);
      const fl = api().rowsOf(by("Flambeau")).map(r => r.key), yr = api().year(), nm = S().nameAt(api().rowOf(by("Verbena")), yr);
      ok("2 rows", JSON.stringify(keys) === JSON.stringify(["akashic", "euthanatos", "verbena", "nwo", "nephandi"]) && JSON.stringify(fl) === JSON.stringify(["hermes", "flambeau"]) && nm === (yr <= 1465 ? "the Old Faith" : "Verbena"), {keys, fl, nm});
    });
    await step("3 roll effects", async () => {
      const T = game.modules.get(C).api.traits, fx = T.effects(by("Verbena"), {channel: "roll", tags: T.rules.rollTags("medicine")});
      ok("3 roll effects", fx.some(e => e.name === "Verbena" && e.dice === 1), {n: fx.length});
    });
    await step("4 Akashic dawn", async () => {
      const a = by("Akashic"), w0 = wp(a), r1 = await api().meditate(a), r2 = await api().meditate(a);
      ok("4 Akashic dawn", r1 === w0 + 1 && r2 === null && wp(a) === w0 + 1, {w0, r1, r2});
    });
    await step("5 Euthanatos", async () => {
      const a = by("Euthanatos"), w0 = wp(a);
      await api().death(a, true); const j = await api().death(a, false);
      ok("5 Euthanatos", wp(a) === w0 + 1 && j === 1 && sig(a).jhor === 1, {wp: wp(a), j});
    });
    await step("6 certamen", async () => {
      const m = await api().certamen(by("Flambeau"), {foe: "Magus Albrecht", stake: "the chantry library"});
      ok("6 certamen", !!m && !m.whisper?.length && m.flags?.[C]?.sigAct?.key === "boon", {});
    });
    await step("7 Hippolyta oath", async () => {
      const a = by("Sister"), w0 = wp(a);
      await api().oath(a, {to: "the elder sister", what: "guard the grove"}); await api().breakOath(a);
      ok("7 Hippolyta oath", wp(a) === w0 - 1 && sig(a).oaths?.[0]?.broken === true, {wp: wp(a)});
    });
    await step("8 Taftani djinn", async () => {
      const a = by("Taftani"), w = await api().bindWraith(a, {name: "Shamhurish", fetter: "a brass lamp"});
      ok("8 Taftani djinn", w?.name === "Shamhurish" && sig(a).servants?.length === 1, {});
    });
    await step("9 the Watchers", async () => {
      const n0 = cards().length;
      Hooks.callAll("wodxBreach", {entry: {}, by: {uuid: by("Mark").uuid, name: "WoDX gate: Mark"}});
      await until(() => cards().length > n0 && lastCard()?.content?.includes("Watchers"));
      ok("9 the Watchers", lastCard()?.content?.includes("WoDX gate: Watcher"), {});
    });
    await step("10 Nephandus", async () => {
      const n = by("Nephandus"), m = by("Mark");
      Hooks.callAll("wodxSocial", {actor: n, npc: m, act: "charm", result: "win"});
      await until(() => (api().corruption(m)[n.id]?.step ?? 0) >= 1, 8000);
      ok("10 Nephandus", (api().corruption(m)[n.id]?.step ?? 0) >= 1, {step: api().corruption(m)[n.id]?.step ?? null});
    });
    await step("11 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("11 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      await game.settings.set(C, "sigMage", was);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatemage-result.json");
}
