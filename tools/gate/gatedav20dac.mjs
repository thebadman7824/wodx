/**
 * The V20 Dark Ages Companion: the Zoroastrian Roads and two Paths (B7701), the four monsters (B7702) and the Zoroastrian
 * rituals (B7703). WoDX Creation and WoDX Actions.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedav20dac.mjs?${Date.now()}`)).run()
 *   1. the Demons window lists the four monsters and makes the Black Dog and the Pishacha with its Make button
 *   2. the Black Dog: Charisma 5, Protean 7, blood 5, Willpower 7, its Road and rules in the notes, cited to p. 35
 *   3. the Pishacha: Dominate 5, the sheet's own health levels, its feeding rule in the notes, cited to p. 97
 *   4. the Road window shows the Road of Ahura Mazda's aura and page, and saving the Road of Angra Mainyu gives Conviction
 *      and Self-Control (pp. 83-84)
 *   5. Padyab is in the Cast a ritual window, cited to the V20 Companion (p. 86)
 * Makes its own actors and removes them with the folder if it made it. Result: Data/wodx-gate/gatedav20dac-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const FOLDER = "WoDX · Monsters (V20 Dark Ages Companion)";
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const made = key => game.actors.filter(a => a.getFlag("wodx-creation", "dacDemon") === key);
const item = (a, n) => a?.items?.find(i => i.name === n);
const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function work(open, re, {name, label, value} = {}) {
  for ( const old of windows().filter(x => re.test(x.title ?? "") && x.rendered) ) await old.close?.();
  open();
  let w = null;
  await waitFor(() => (w = titled(re)), 15000);
  const el = elOf(w), sel = name ? el?.querySelector?.(`select[name=${name}]`) : null;
  const opt = sel ? [...sel.options].find(o => value !== undefined ? o.value === value : o.textContent.includes(label)) : null;
  if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
  await sleep(300);
  return {w, el, sel, opt: !!opt, ok: async () => { await sleep(500); el?.querySelector?.('button[data-action="ok"]')?.click(); return waitFor(() => !w.rendered, 15000).then(() => true).catch(() => false); }};
}
const notes = a => String(a?.system?.notes ?? "").replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'");

export async function run() {
  const G = gate("gatedav20dac", {stepTimeout: 200000});
  if ( G.notLive() ) return "gatedav20dac never runs in the Live world";
  const D = game.modules.get("wodx-creation")?.api?.dacDemons;
  const hadFolder = !!game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  const mine = [];
  const seen = new Set(game.messages.contents.map(m => m.id));
  try {
    await waitFor(() => !!D?.open && !!game.wodxActions?.setRoad && !!game.wodxActions?.castRitual, 90000);

    await G.step("1. the window lists the monsters and makes two", async () => {
      D.open();
      let w = null;
      await waitFor(() => (w = titled(/^Demons of the Dark Ages Companion/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      const el = elOf(w);
      const opts = [...el.querySelector('select[name="who"]').options];
      const listed = opts.map(o => o.value).filter(v => ["black-dog", "fossegrim", "kallikantzaros", "pishacha"].includes(v));
      for ( const o of opts ) o.selected = ["black-dog", "pishacha"].includes(o.value);
      el.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => game.messages.contents.some(m => !seen.has(m.id) && /Demons made/.test(m.content ?? "")), 150000).catch(() => null);
      mine.push(...made("black-dog"), ...made("pishacha"));
      const b = made("black-dog")[0], p = made("pishacha")[0];
      const folder = game.folders.get(b?.folder?.id ?? b?.folder)?.name;
      G.ok("1. the window lists the monsters and makes two", listed.length === 4 && !!b && !!p && folder === FOLDER, {listed, dog: b?.name, pishacha: p?.name, folder});
    });

    await G.step("2. the Black Dog's sheet", async () => {
      const b = made("black-dog")[0], s = b?.system ?? {}, n = notes(b);
      const ok = Number(s.attributes?.charisma?.value) === 5 && Number(item(b, "Protean")?.system?.value) === 7 && Number(s.advantages?.bloodpool?.max) === 5
        && Number(s.advantages?.willpower?.permanent) === 7 && /Road 3\./.test(n) && /six unbroken hours/.test(n) && /V20 DA Companion p\. 35/.test(n);
      G.ok("2. the Black Dog's sheet", ok, {charisma: s.attributes?.charisma?.value, protean: item(b, "Protean")?.system?.value, blood: s.advantages?.bloodpool,
        willpower: s.advantages?.willpower?.permanent, notes: n.slice(0, 500)});
    });

    await G.step("3. the Pishacha's sheet", async () => {
      const p = made("pishacha")[0], s = p?.system ?? {}, n = notes(p), hl = s.health ?? {};
      const levels = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"].map(k => Number(hl[k]?.total ?? hl[k]?.value));
      const ok = Number(item(p, "Dominate")?.system?.value) === 5 && levels.every(v => v === 1) && /Thirteenth Generation/.test(n) && /V20 DA Companion p\. 97/.test(n);
      G.ok("3. the Pishacha's sheet", ok, {dominate: item(p, "Dominate")?.system?.value, levels, notes: n.slice(0, 500)});
    });

    const [v] = await G.make(Actor, [{name: "Gate Zoroastrian", type: "Vampire", system: {clan: "custom", custom: {clan: "Assamite"}}}]);
    await G.step("4. the Zoroastrian Roads in the Road window", async () => {
      const x = await work(() => game.wodxActions.setRoad({actor: v}), /^Road:/, {name: "road", value: "humanity|Road of Ahura Mazda"});
      const ahura = x.el?.querySelector(".wodx-road-info")?.textContent ?? "";
      x.sel.value = "set|Road of Angra Mainyu"; x.sel.dispatchEvent(new Event("change", {bubbles: true})); await sleep(300);
      const angra = x.el?.querySelector(".wodx-road-info")?.textContent ?? "";
      const closed = await x.ok();
      let card = null;
      await waitFor(() => (card = game.messages.contents.find(m => !seen.has(m.id) && /Road of Angra Mainyu/.test(text(m)) && /Virtues/.test(text(m)))), 150000).catch(() => null);
      const fl = v.getFlag("wodx-actions", "road");
      G.ok("4. the Zoroastrian Roads in the Road window", x.opt && /Goodness/.test(ahura) && /V20 DA Companion p\. 83/.test(ahura) && /Corruption/.test(angra) && closed
        && fl?.key === "set" && fl?.path === "Road of Angra Mainyu" && /Conviction and Self-Control/.test(text(card)) && /Corruption/.test(text(card)),
        {option: x.opt, ahura: ahura.slice(0, 300), angra: angra.slice(0, 200), flag: fl, card: text(card).slice(0, 300)});
    }, {timeout: 220000});

    await G.step("5. Padyab in the Cast a ritual window", async () => {
      const x = await work(() => game.wodxActions.castRitual({actor: v}), /^Cast a ritual/, {name: "rit", label: "Padyab"});
      const info = x.el?.querySelector?.(".wodx-ritual-info")?.textContent ?? "";
      await x.w?.close?.();
      G.ok("5. Padyab in the Cast a ritual window", x.opt && /V20 DA Companion p\. 86/.test(info) && /Conviction/.test(info), {option: x.opt, info: info.slice(0, 400)});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    for ( const a of mine ) await a?.delete?.().catch(() => null);
    if ( !hadFolder ) await game.folders.find(f => f.type === "Actor" && f.name === FOLDER)?.delete?.().catch(() => null);
  }
  return G.finish();
}
