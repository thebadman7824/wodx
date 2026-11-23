/**
 * Dark Ages Storytellers Companion (2002) supporting-character templates (B7695), WoDX Creation.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedasupporting.mjs?${Date.now()}`)).run()
 *   1. the Supporting characters window makes an experienced Magus and an experienced Cat's Paw with its Make button
 *   2. the experienced Magus: a Tremere Cainite of the 10th Generation on the Road of Kings with the book's dots added
 *   3. the experienced Cat's Paw: a ghoul with Potence 2 (1 from the template, 1 from the table)
 *   4. the base Information Broker: a Nosferatu at Appearance 0, 12th Generation, Dodge read as Athletics
 *   5. the exceptional Heretic Priest: 8th Generation, Road of Night, Conviction shown and Conscience hidden
 * Makes its own actors and removes them with the folder if it made it. Result: Data/wodx-gate/gatedasupporting-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const FOLDER = "WoDX · Supporting characters (Dark Ages)";
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const disc = (a, n) => Number(a?.items?.find(i => i.type === "Power" && i.name === n)?.system?.value ?? -1);
const bg = (a, n) => Number(a?.items?.find(i => i.type === "Feature" && i.name === n)?.system?.value ?? 0);
const made = key => game.actors.filter(a => a.getFlag("wodx-creation", "supporting")?.key === key);

export async function run() {
  const G = gate("gatedasupporting", {stepTimeout: 300000});
  if ( G.notLive() ) return "gatedasupporting never runs in the Live world";
  const SC = game.modules.get("wodx-creation")?.api?.supportingCast;
  const hadFolder = !!game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  const mine = [];
  const seen = new Set(game.messages.contents.map(m => m.id));
  try {
    await waitFor(() => !!SC?.open, 90000);

    await G.step("1. the window makes two experienced templates with its Make button", async () => {
      SC.open();
      let w = null;
      await waitFor(() => (w = titled(/^Supporting characters/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      const el = elOf(w);
      for ( const o of el.querySelector('select[name="who"]').options ) o.selected = ["magus", "cats-paw"].includes(o.value);
      el.querySelector('select[name="tier"]').value = "experienced";
      el.querySelector('button[data-action="ok"]')?.click();
      // The window makes them one after the other and whispers a card when all are done
      await waitFor(() => game.messages.contents.some(m => !seen.has(m.id) && /Supporting characters/.test(m.content ?? "")), 270000).catch(() => null);
      mine.push(...made("magus"), ...made("cats-paw"));
      const m = made("magus")[0], c = made("cats-paw")[0];
      G.ok("1. the window makes two experienced templates with its Make button", !!m && !!c && m.system.generation === 10,
        {magus: m?.name, catsPaw: c?.name, generation: m?.system?.generation});
    });

    await G.step("2. the experienced Magus", async () => {
      const m = made("magus")[0];
      const s = m?.system ?? {};
      const ok = m?.type === "Vampire" && s.custom?.clan === "Tremere" && s.generation === 10 && s.advantages?.path?.custom === "Road of Kings"
        && disc(m, "Thaumaturgy") === 3 && disc(m, "Auspex") === 2 && s.attributes?.perception?.value === 5 && s.advantages?.willpower?.permanent === 4
        && s.advantages?.bloodpool?.temporary >= 1;
      G.ok("2. the experienced Magus", ok, {type: m?.type, clan: s.custom?.clan, generation: s.generation, road: s.advantages?.path,
        thaumaturgy: disc(m, "Thaumaturgy"), auspex: disc(m, "Auspex"), perception: s.attributes?.perception?.value,
        willpower: s.advantages?.willpower?.permanent, blood: s.advantages?.bloodpool});
    });

    await G.step("3. the experienced Cat's Paw is a ghoul with Potence 2", async () => {
      const c = made("cats-paw")[0];
      const s = c?.system ?? {};
      const ok = s.settings?.variant === "ghoul" && disc(c, "Potence") === 2 && s.advantages?.willpower?.permanent === 3 && bg(c, "Allies") + bg(c, "Contacts") === 5;
      G.ok("3. the experienced Cat's Paw is a ghoul with Potence 2", ok, {variant: s.settings?.variant, potence: disc(c, "Potence"),
        willpower: s.advantages?.willpower?.permanent, allies: bg(c, "Allies"), contacts: bg(c, "Contacts")});
    });

    await G.step("4. the base Information Broker", async () => {
      const b = await SC.make("information-broker", "base");
      if ( b ) mine.push(b);
      const s = b?.system ?? {};
      const ok = b?.type === "Vampire" && s.custom?.clan === "Nosferatu" && Number(s.attributes?.appearance?.value) === 0 && s.generation === 12
        && s.abilities?.athletics?.value === 2 && disc(b, "Obfuscate") === 2 && bg(b, "Contacts") === 3;
      G.ok("4. the base Information Broker", ok, {type: b?.type, clan: s.custom?.clan, appearance: s.attributes?.appearance?.value,
        generation: s.generation, athletics: s.abilities?.athletics?.value, obfuscate: disc(b, "Obfuscate"), contacts: bg(b, "Contacts")});
    });

    await G.step("5. the exceptional Heretic Priest", async () => {
      const p = await SC.make("heretic-priest", "exceptional");
      if ( p ) mine.push(p);
      const v = p?.system?.advantages?.virtues ?? {};
      const ok = p?.system?.generation === 8 && p?.system?.advantages?.path?.custom === "Road of Night" && v.conviction?.permanent === 3
        && v.conviction?.isvisible === true && v.conscience?.isvisible === false && p?.system?.advantages?.path?.permanent === 5;
      G.ok("5. the exceptional Heretic Priest", ok, {generation: p?.system?.generation, road: p?.system?.advantages?.path,
        conviction: v.conviction, conscience: v.conscience});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    for ( const a of mine ) await a?.delete?.().catch(() => null);
    if ( !hadFolder ) await game.folders.find(f => f.type === "Actor" && f.name === FOLDER)?.delete?.().catch(() => null);
  }
  return G.finish();
}
