/**
 * Four more changes of state (WoDX Creation 0.9.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatestates2.mjs?${Date.now()}`)).run()
 * It makes four test mortals and deletes them, every sheet made from them, its chat cards, and the test folders if they were new.
 *   1. version and api
 *   2. a revenant: the same Mortal sheet, variant ghoul, Potence 1 and Celerity 1 (Grimaldi), blood 1 of 10, the weakness noted
 *   3. the Chrysalis: a Changeling sheet with the mortal's Traits, Glamour 5, Banality 3, Willpower 4, childling, kith kept
 *   4. a Fallen takes a host: a Demon sheet, House of Devourers, Faith 3, Torment 4, Conscience 3 / Conviction 1 / Courage 2, Willpower 5
 *   5. a new host: a willing thrall needs no roll and is taken; an ordinary body with set dice of 7s fails
 *   6. the Second Breath: a Vampire sheet set to Kindred of the East, Yin/Yang/Hun 1, P'o 3, Dharma 1, Willpower 5, direction kept
 *   7. the old sheets are linked and filed; the Creation window shows the five new buttons, and each dialog opens with search boxes
 *   8. put back
 * Result: Data/wodx-gate/gatestates2-result.json.
 */
const C = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const newer = (a, b) => !foundry.utils.isNewerVersion(b, a);
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatestates2-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const win = cls => [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains(cls));
const FOLDERS = ["WoDX · Before the Chrysalis", "WoDX · The host before the Fall", "WoDX · Before the Second Breath"];

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const made = [];
  const hadFolder = new Set(FOLDERS.filter(n => game.folders.find(f => f.type === "Actor" && f.name === n)));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const mk = async (name, up = {}) => { const a = await Actor.create({name, type: "Mortal"}); made.push(a); await sleep(300); if ( Object.keys(up).length ) await a.update(up); return a; };
  const A = x => x?.system?.advantages ?? {};
  try {
    const api = game.modules.get(C)?.api;
    ok("1. version and api", newer(game.modules.get(C)?.version, "0.9.0") && ["revenantBirth", "chrysalis", "fallenHost", "possess", "secondBreath"].every(k => typeof api?.[k] === "function"),
      {version: game.modules.get(C)?.version});

    const rev = await mk("Gate revenant");
    await api.revenantBirth(rev, {family: "grimaldi"}); await sleep(500);
    const r = game.actors.get(rev.id);
    const discs = Object.fromEntries(r.items.filter(i => i.type === "Power").map(i => [i.name, Number(i.system.value)]));
    ok("2. a revenant", r.type === "Mortal" && r.system.settings.variant === "ghoul" && discs.Potence === 1 && discs.Celerity === 1
      && A(r).bloodpool?.max === 10 && A(r).bloodpool?.temporary === 1 && !!r.getFlag(C, "revenant")?.weakness, {variant: r.system.settings.variant, discs, blood: A(r).bloodpool});

    const ch = await mk("Gate Chrysalis", {"system.attributes.dexterity.value": 4, "system.abilities.athletics.value": 3, "system.advantages.willpower.permanent": 2});
    const c = await api.chrysalis(ch, {kith: "Pooka", seeming: "childling", moveTokens: false}); made.push(c); await sleep(500);
    ok("3. the Chrysalis", c?.type === "Changeling" && c.system.attributes.dexterity.value === 4 && c.system.abilities.athletics.value === 3
      && A(c).glamour?.permanent === 5 && A(c).banality?.permanent === 3 && A(c).willpower?.permanent === 4 && c.system.kith === "Pooka" && c.system.seeming === "Childling",
      {type: c?.type, glamour: A(c).glamour, banality: A(c).banality, wp: A(c).willpower, kith: c?.system?.kith, seeming: c?.system?.seeming});

    const fh = await mk("Gate host", {"system.advantages.virtues.conscience.permanent": 4, "system.advantages.virtues.courage.permanent": 2, "system.abilities.firearms.value": 2});
    const d = await api.fallenHost(fh, {house: "devourers", celestial: "Gate celestial", moveTokens: false}); made.push(d); await sleep(500);
    const v = A(d).virtues ?? {};
    ok("4. a Fallen takes a host", d?.type === "Demon" && /Devourers/.test(d.system.house) && A(d).faith?.permanent === 3 && A(d).torment?.permanent === 4
      && v.conscience?.permanent === 3 && v.selfcontrol?.permanent === 1 && v.courage?.permanent === 2 && A(d).willpower?.permanent === 5 && d.system.abilities.firearms.value === 2,
      {type: d?.type, house: d?.system?.house, faith: A(d).faith, torment: A(d).torment, virtues: v, wp: A(d).willpower});

    const willing = d ? await api.possess(d, {target: "willing"}) : null;
    const plain = d ? await api.possess(d, {target: "ordinary", dice: [7, 7, 7]}) : null;
    ok("5. a new host", willing?.taken === true && willing.successes === null && plain?.taken === false && plain.diff === 8, {willing, plain});

    const sb = await mk("Gate Second Breath", {"system.advantages.willpower.permanent": 3, "system.attributes.strength.value": 3});
    const k = await api.secondBreath(sb, {direction: "East", moveTokens: false}); made.push(k); await sleep(500);
    ok("6. the Second Breath", k?.type === "Vampire" && k.system.settings.variant === "kindredeast" && A(k).yin?.permanent === 1 && A(k).yang?.permanent === 1
      && A(k).hun?.permanent === 1 && A(k).po?.permanent === 3 && A(k).dharma?.permanent === 1 && A(k).willpower?.permanent === 5 && k.system.direction === "East"
      && k.system.attributes.strength.value === 3, {variant: k?.system?.settings?.variant, yin: A(k).yin, po: A(k).po, wp: A(k).willpower, direction: k?.system?.direction});

    const linked = [[ch, c], [fh, d], [sb, k]].every(([o, nw]) => nw?.getFlag(C, "lineage")?.formerly?.id === o.id && game.actors.get(o.id)?.getFlag(C, "lineage")?.became?.id === nw.id)
      && FOLDERS.every(n => game.folders.find(f => f.type === "Actor" && f.name === n));
    await api.open(); await sleep(600);
    const cr = win("wodx-creation");
    const buttons = ["revenant", "chrysalis", "fallen", "possess", "secondBreath"].every(a => cr?.element.querySelector(`button[data-action=${a}]`));
    await cr?.close();
    const searches = {};
    for ( const [key, fn] of [["revenant", api.revenantDialog], ["chrysalis", api.chrysalisDialog], ["fallen", api.fallenDialog], ["possess", api.possessDialog], ["secondBreath", api.secondBreathDialog]] ) {
      // A mortal sheet must exist for the mortal dialogs; the revenant is one
      const p = fn(); await sleep(700);
      const dlg = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-dialog"));
      searches[key] = dlg?.element.querySelectorAll("input.wodx-search").length ?? -1;
      await dlg?.close(); await p;
    }
    ok("7. linked, filed, buttons and dialogs", linked && buttons && Object.values(searches).every(x => x >= 1), {linked, buttons, searches});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const a of made ) await game.actors.get(a?.id)?.delete();
      for ( const n of FOLDERS ) if ( !hadFolder.has(n) ) await game.folders.find(f => f.type === "Actor" && f.name === n)?.delete();
      const mine = game.messages.filter(x => !msgsBefore.has(x.id)).map(x => x.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      await game.modules.get(C)?.api?.writeLineageJournal?.();
      ok("8. put back", made.every(a => !game.actors.get(a?.id)));
    } catch (err) { ok("8. put back", false, {error: err.message}); }
  }
  return save(R);
}
