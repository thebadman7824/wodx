/**
 * The sample and bound demons of the Dark Ages Companion (2002) pp. 180-185 (B7698), WoDX Creation.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedadacdemons.mjs?${Date.now()}`)).run()
 *   1. the Demons window makes Jenny Green Teeth and the Huntsman with its Make button
 *   2. Jenny Green Teeth: Strength 7, Potence 7, blood 20, thirteen health levels with the book's penalties (p. 184)
 *   3. four lethal levels on Jenny leave it at -1: three OK levels, then the first -1 (WoDX Combat)
 *   4. the Huntsman: Larceny read as Legerdemain 6 (a Secondary Ability where the sheet has none), Rego Venalis 4, its attack in the notes (p. 181)
 *   5. Spite, made by the API, can use Maleficia's Evil Eye from Use a Discipline (p. 181)
 * Makes its own actors and removes them with the folder if it made it. Result: Data/wodx-gate/gatedadacdemons-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const FOLDER = "WoDX · Demons (Dark Ages Companion)";
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const made = key => game.actors.filter(a => a.getFlag("wodx-creation", "dacDemon") === key);
const item = (a, n) => a?.items?.find(i => i.name === n);

export async function run() {
  const G = gate("gatedadacdemons", {stepTimeout: 200000});
  if ( G.notLive() ) return "gatedadacdemons never runs in the Live world";
  const D = game.modules.get("wodx-creation")?.api?.dacDemons;
  const hadFolder = !!game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  const mine = [];
  const seen = new Set(game.messages.contents.map(m => m.id));
  try {
    await waitFor(() => !!D?.open && !!game.wodxActions?.useDiscipline, 90000);

    await G.step("1. the window makes two demons with its Make button", async () => {
      D.open();
      let w = null;
      await waitFor(() => (w = titled(/^Demons of the Dark Ages Companion/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      const el = elOf(w);
      for ( const o of el.querySelector('select[name="who"]').options ) o.selected = ["jenny-green-teeth", "huntsman"].includes(o.value);
      el.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => game.messages.contents.some(m => !seen.has(m.id) && /Demons made/.test(m.content ?? "")), 150000).catch(() => null);
      mine.push(...made("jenny-green-teeth"), ...made("huntsman"));
      const j = made("jenny-green-teeth")[0], h = made("huntsman")[0];
      G.ok("1. the window makes two demons with its Make button", !!j && !!h && j.system.attributes?.strength?.value === 7, {jenny: j?.name, huntsman: h?.name, strength: j?.system?.attributes?.strength?.value});
    });

    await G.step("2. Jenny Green Teeth's numbers", async () => {
      const j = made("jenny-green-teeth")[0], s = j?.system ?? {}, hl = s.health ?? {};
      const totals = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"].map(k => Number(hl[k]?.total ?? hl[k]?.value));
      const ok = Number(item(j, "Potence")?.system?.value) === 7 && Number(s.advantages?.bloodpool?.max) === 20 && Number(s.advantages?.willpower?.permanent) === 5
        && totals.join() === "3,3,0,3,2,1,1" && Number(hl.mauled?.penalty) === -3;
      G.ok("2. Jenny Green Teeth's numbers", ok, {potence: item(j, "Potence")?.system?.value, blood: s.advantages?.bloodpool, willpower: s.advantages?.willpower?.permanent, totals, mauled: hl.mauled});
    });

    await G.step("3. four lethal levels leave Jenny at -1", async () => {
      const j = made("jenny-green-teeth")[0];
      await game.wodxCombat?.applyDamage?.(j, "lethal", 4);
      await waitFor(() => Number(j.system?.health?.damage?.lethal) >= 4, 30000).catch(() => null);
      const d = j.system?.health?.damage ?? {};
      G.ok("3. four lethal levels leave Jenny at -1", Number(d.lethal) === 4 && Number(d.woundpenalty) === -1, {damage: d});
    });

    await G.step("4. the Huntsman's sheet", async () => {
      const h = made("huntsman")[0], s = h?.system ?? {};
      const leg = Number(s.abilities?.legerdemain?.value ?? item(h, "Legerdemain")?.system?.value);
      const ok = leg === 6 && Number(item(h, "Dark Thaumaturgy: Rego Venalis")?.system?.value) === 4
        && Number(item(h, "Daimoinon")?.system?.value) === 4 && /eight dice plus Potence/.test(s.notes ?? "") && /DAC 2002 p\. 181/.test(s.notes ?? "");
      G.ok("4. the Huntsman's sheet", ok, {legerdemain: leg, venalis: item(h, "Dark Thaumaturgy: Rego Venalis")?.system?.value,
        daimoinon: item(h, "Daimoinon")?.system?.value, notes: String(s.notes ?? "").slice(0, 300)});
    });

    await G.step("5. Spite can use Evil Eye", async () => {
      const sp = await D.make("spite");
      if ( sp ) mine.push(sp);
      game.wodxActions.useDiscipline({actor: sp});
      let w = null;
      await waitFor(() => (w = titled(/^Use a Discipline/)), 20000).catch(() => null);
      const sel = elOf(w)?.querySelector?.("select[name=power]");
      const opts = [...(sel?.options ?? [])].map(o => o.textContent);
      await w?.close?.();
      G.ok("5. Spite can use Evil Eye", opts.some(o => /Evil Eye/.test(o)) && Number(item(sp, "Maleficia")?.system?.value) === 4, {options: opts.filter(o => /Evil|Malef|Curse/.test(o)), maleficia: item(sp, "Maleficia")?.system?.value});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    for ( const a of mine ) await a?.delete?.().catch(() => null);
    if ( !hadFolder ) await game.folders.find(f => f.type === "Actor" && f.name === FOLDER)?.delete?.().catch(() => null);
  }
  return G.finish();
}
