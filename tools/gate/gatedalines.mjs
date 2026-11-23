/**
 * Full check of V20 Dark Ages (B7660-B7661), WoDX Creation, WoDX Actions and WoDX Chronicle: the clan and bloodline rules the check found missing. In rothenstein-wodx
 * (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedalines.mjs?${Date.now()}`)).run()
 *   1. a sheet given the clan Nosferatu loses its Appearance dots, and the experience spend refuses one (V20 Dark Ages p. 55)
 *   2. the Embrace window refuses a Child of Osiris as sire: no new vampire is made (p. 78)
 *   3. the Give vitae window with a Valkyrje's blood: the mortal stays a mortal and no bond is written (p. 71)
 *   4. a Ramanga works Dread Gaze on a target through the Use a Discipline window: +1 on the roll; with a piece of the
 *      victim ticked, no +1 (p. 98)
 * Makes its own scene, actors and tokens and removes them. Result: Data/wodx-gate/gatedalines-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const C = () => game.modules.get("wodx-creation")?.api;
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const custom = clan => ({clan: "custom", custom: {clan}});

/** Open a window, set its fields by name, press its OK button. */
async function fill(open, re, fields, button = 'button[data-action="ok"]') {
  const p = open();
  let w = null;
  await waitFor(() => (w = titled(re)), 10000);
  const el = elOf(w);
  for ( const [k, v] of Object.entries(fields) ) {
    const f = el?.querySelector?.(`[name="${k}"]`);
    if ( !f ) continue;
    if ( f.type === "checkbox" ) f.checked = !!v; else f.value = String(v);
    f.dispatchEvent(new Event("change", {bubbles: true}));
  }
  el?.querySelector?.(button)?.click();
  try { await p; } catch (e) { /* the window's own promise */ }
  return !!w;
}

export async function run() {
  const G = gate("gatedalines");
  if ( G.notLive() ) return "gatedalines never runs in the Live world";
  try {
    await waitFor(() => !!C()?.data?.purchaseOptions && !!C()?.change?.embraceDialog && !!game.wodxActions?.useDiscipline, 30000);

    await G.step("1. a Nosferatu's Appearance goes to 0 and cannot be bought back", async () => {
      const a = await G.make(Actor, {name: "Gate DA Nosferatu", type: "Vampire"});
      await a.update({"system.attributes.appearance.value": 3});
      await a.update({system: custom("Nosferatu")});
      const zero = await waitFor(() => Number(a.system.attributes?.appearance?.value) === 0, 20000);
      await C().award([a], 20, "Gate DA lines");
      const opt = C().data.purchaseOptions(a).find(o => o.kind === "attribute" && o.key === "appearance");
      G.ok("1. a Nosferatu's Appearance goes to 0 and cannot be bought back", zero && opt && !opt.ok && /p\. 55/.test(opt.reason),
        {appearance: a.system.attributes?.appearance?.value, ok: opt?.ok ?? null, reason: opt?.reason ?? null});
    }, {timeout: 180000});

    await G.step("2. the Embrace window refuses a Child of Osiris as sire", async () => {
      const sire = await G.make(Actor, {name: "Gate DA Penitent", type: "Vampire", system: {...custom("Children of Osiris (Brujah)"), generation: 8}});
      const mortal = await G.make(Actor, {name: "Gate DA Mortal One", type: "Mortal"});
      const made = () => game.actors.filter(x => x.type === "Vampire" && x.name === mortal.name).length;
      const before = made();
      const w = await fill(() => C().change.embraceDialog(), /^The Embrace/, {mortal: mortal.id, sire: sire.id, generation: 9});
      await new Promise(r => setTimeout(r, 5000));
      const after = made();
      G.ok("2. the Embrace window refuses a Child of Osiris as sire", w && after === before, {window: w, before, after});
    }, {timeout: 120000});

    await G.step("3. a Valkyrje's blood makes no ghoul and no bond", async () => {
      const v = await G.make(Actor, {name: "Gate DA Valkyrje", type: "Vampire", system: {...custom("Valkyrjer"), generation: 9}});
      const m = await G.make(Actor, {name: "Gate DA Mortal Two", type: "Mortal"});
      const n0 = game.messages.size;
      const w = await fill(() => C().change.vitaeDialog(), /^Give vitae/, {drinker: m.id, regnant: v.id, points: 1});
      let card = null;
      await waitFor(() => (card = game.messages.contents.slice(n0).find(x => /no bond forms/.test(x.content ?? ""))), 30000);
      const bonds = m.getFlag("wodx-creation", "lineage")?.bonds ?? {};
      G.ok("3. a Valkyrje's blood makes no ghoul and no bond", w && !!card && m.type === "Mortal" && !bonds[v.id]?.drinks,
        {window: w, card: !!card, type: m.type, bond: bonds[v.id] ?? null});
    }, {timeout: 60000});

    await G.step("4. a Ramanga's Dread Gaze is one harder on another, unless a piece of the victim is held", async () => {
      const s = await G.scene({name: "WoDX gate: gatedalines"});
      const r = await G.make(Actor, {name: "Gate DA Ramanga", type: "Vampire", system: {...custom("Ramanga"), advantages: {bloodpool: {temporary: 10, max: 10}}},
        items: [{name: "Presence", type: "Power", system: {type: "wod.types.discipline", value: 2}}]});
      const t = await G.make(Actor, {name: "Gate DA Victim", type: "Mortal"});
      const [, tt] = await G.tokens(s, [{actor: r, x: 2, y: 2}, {actor: t, x: 4, y: 2}]);
      await waitFor(() => !!tt?.object, 8000);
      const seen = new Set(game.messages.contents.map(x => x.id));
      const work = async piece => {
        for ( const old of windows().filter(x => /^Use a Discipline/.test(x.title ?? "") && x.rendered) ) await old.close?.();
        if ( game.user.updateTokenTargets ) await game.user.updateTokenTargets([tt.id]); else tt.object?.setTarget?.(true, {releaseOthers: true});
        await waitFor(() => game.user.targets?.size === 1, 5000).catch(() => null);
        const targets = game.user.targets?.size ?? 0;
        game.wodxActions.useDiscipline({actor: r});
        let w = null;
        await waitFor(() => (w = titled(/^Use a Discipline/)), 10000);
        const el = elOf(w), sel = el?.querySelector?.("select[name=power]");
        const opt = [...(sel?.options ?? [])].find(o => o.textContent.includes("Dread Gaze"));
        if ( opt ) { sel.value = opt.value; sel.dispatchEvent(new Event("change", {bubbles: true})); }
        const box = el?.querySelector?.("[name=piece]");
        if ( box ) box.checked = piece;
        await new Promise(r => setTimeout(r, 500));
        el?.querySelector?.('button[data-action="ok"]')?.click();
        const closed = await waitFor(() => !w.rendered, 10000);
        let card = null;
        await waitFor(() => (card = game.messages.contents.find(x => !seen.has(x.id) && /Dread Gaze/.test((x.content ?? "") + (x.flavor ?? "")) && (x.rolls?.length ?? 0) > 0)), 150000);
        if ( card ) seen.add(card.id);
        const others = game.messages.contents.filter(x => !seen.has(x.id)).map(x => String(x.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 160));
        for ( const x of game.messages.contents ) seen.add(x.id);
        const notes = (ui.notifications?.queue ?? []).concat([...(ui.notifications?.active ?? [])]).map(x => String(x?.message ?? x?.textContent ?? "").slice(0, 120)).slice(-5);
        return {window: !!w, closed, option: !!opt, box: !!box, card: !!card, plus: /Ramanga \+1/.test(card?.content ?? ""), targets, others, notes, text: String(card?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 400)};
      };
      const a = await work(false);
      const b = await work(true);
      await game.user.updateTokenTargets?.([]);
      G.ok("4. a Ramanga's Dread Gaze is one harder on another, unless a piece of the victim is held", a.card && a.plus && b.card && !b.plus && a.box, {without: a, withPiece: b});
    }, {timeout: 400000});
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
