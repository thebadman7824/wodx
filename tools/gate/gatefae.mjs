/**
 * Kith, seeming and court features gate (WoDX Chronicle 0.34.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefae.mjs?${Date.now()}`)).run()
 * Makes its own changelings, turns "Kith, seeming and court features (Changeling)" on, and puts the setting, actors and
 * chat cards back afterwards. The clock is not moved.
 *   1. the api and the setting
 *   2. rows stack: a Satyr wilder of the Unseelie Court in House Fiona has four; a Night-Hag is a Thallain; a Glome an Inanimae
 *   3. roll effects reach the traits api: a Boggan's Crafts die
 *   4. a Satyr's revel: the button gives the Satyr two Glamour and a Pooka one
 *   5. a Pooka tells the plain truth: a Willpower point lost
 *   6. a Selkie takes the seal coat; losing it sends a card
 *   7. a troll swears an oath and breaks it: a Willpower point lost
 *   8. the court in power shows for the month on the clock
 *   9. every other WoDX module still answers
 * Result: Data/wodx-gate/gatefae-result.json.
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
  const t0 = Date.now(), was = game.settings.get(C, "sigChangeling");
  const sig = a => game.actors.get(a.id)?.flags?.[C]?.sig ?? {};
  const adv = (a, k) => Number(game.actors.get(a.id)?.system?.advantages?.[k]?.temporary) || 0;
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-sig"));
  const lastCard = () => cards().at(-1);
  const press = async msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); el.querySelector("[data-wct-sig-act]")?.click(); };
  const fae = (name, kith, more = {}) => ({name, type: "Changeling", system: {kith, seeming: "Wilder", court: "Seelie",
    advantages: {willpower: {permanent: 6, temporary: 3}, glamour: {permanent: 6, temporary: 2}}, ...more}});
  let actors = [];
  try {
    await game.settings.set(C, "sigChangeling", true);
    actors = await Actor.create([fae("WoDX gate: Satyr", "wod.bio.changeling.satyrs", {court: "Unseelie", house: "Fiona"}), fae("WoDX gate: Pooka", "wod.bio.changeling.pooka"),
      fae("WoDX gate: Selkie", "wod.bio.changeling.selkies"), fae("WoDX gate: Troll", "wod.bio.changeling.troll"), fae("WoDX gate: Boggan", "wod.bio.changeling.boggans"),
      fae("WoDX gate: Hag", "wod.bio.changeling.nighthags"), fae("WoDX gate: Glome", "wod.bio.changeling.glomes")]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.34.0") && typeof api()?.revel === "function" && game.settings.get(C, "sigChangeling") === true, {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const st = api().rowsOf(by("Satyr")).map(r => r.key), hag = api().rowOf(by("Hag"))?.key, gl = api().rowOf(by("Glome"))?.key;
      ok("2 rows", JSON.stringify(st) === JSON.stringify(["satyr", "wilder", "unseelie", "fiona"]) && hag === "thallain" && gl === "inanimae", {st, hag, gl});
    });
    await step("3 roll effects", async () => {
      const T = game.modules.get(C).api.traits, fx = T.effects(by("Boggan"), {channel: "roll", tags: T.rules.rollTags("crafts")});
      ok("3 roll effects", fx.some(e => e.name === "Boggans" && e.dice === 1), {n: fx.length});
    });
    await step("4 revel", async () => {
      const s = by("Satyr"), p = by("Pooka");
      const m = await api().revel(s, null);
      await game.messages.get(m.id)?.setFlag(C, "sigAct", {...m.flags[C].sigAct, data: {ids: [s.id, p.id]}});
      await press(game.messages.get(m.id));
      await until(() => adv(s, "glamour") === 4 && adv(p, "glamour") === 3);
      ok("4 revel", adv(s, "glamour") === 4 && adv(p, "glamour") === 3, {satyr: adv(s, "glamour"), pooka: adv(p, "glamour")});
    });
    await step("5 Pooka truth", async () => {
      const p = by("Pooka"), w0 = adv(p, "willpower"); await api().toldTruth(p);
      ok("5 Pooka truth", adv(p, "willpower") === w0 - 1, {});
    });
    await step("6 Selkie coat", async () => {
      const k = by("Selkie"), it = await api().giveCoat(k), n0 = cards().length;
      await game.actors.get(k.id).items.get(it.id).delete();
      await until(() => cards().length > n0 && lastCard()?.content?.includes("coat is gone"));
      ok("6 Selkie coat", !!it && lastCard()?.content?.includes("coat is gone"), {});
    });
    await step("7 troll oath", async () => {
      const t = by("Troll"), w0 = adv(t, "willpower");
      await api().oath(t, {to: "the duke", what: "hold the bridge"}); await api().breakOath(t);
      ok("7 troll oath", adv(t, "willpower") === w0 - 1 && sig(t).oaths?.[0]?.broken === true, {});
    });
    await step("8 court in power", async () => {
      const r = api().rowsOf(by("Pooka")).find(x => x.feature === "court");
      ok("8 court in power", r?.key === "seelie" && ["seelie", "unseelie"].includes(S().courtInPower(6)), {court: r?.key});
    });
    await step("9 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("9 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      await game.settings.set(C, "sigChangeling", was);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatefae-result.json");
}
