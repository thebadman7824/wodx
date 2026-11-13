/**
 * The Player UI Desk's creation step (WoDX Creation 0.25.0, B2827 to B2829), in Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplayercreation.mjs?${Date.now()}`)).run()
 * It makes one Vampire actor and deletes it after.
 *   1. the module: Creation 0.25.0 or later with the wizard, the lifepath and the hub
 *   2. the wizard's book page offers 12 concepts; Soldier or guard fills Attributes, Abilities and Virtues to the
 *      book's totals (the wizard's own ledger shows nothing over and nothing unspent there) with no question asked
 *   3. the wizard then shows its last page, Concept and Nature are filled in, and every dot can still be lowered
 *   4. the lifepath starts on Short; a few Surprise me clicks reach the end page, which shows the story as a paragraph
 *   5. Before the First Night: one step marked Next, a count of steps left, done steps folded
 * Result: Data/wodx-gate/gateplayercreation-result.json.
 */
const N = 5;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayercreation-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const el = app => app?.element?.[0] ?? app?.element ?? null;
const appOf = pred => [...foundry.applications.instances.values()].find(pred) ?? null;

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get("wodx-creation"), C = M?.api ?? game.wodx?.creation;
  let actor = null;
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.25.0", M.version) && typeof C?.wizard === "function" && typeof C?.lifepath === "function" && typeof C?.firstNight === "function",
      {creation: M?.version});
    actor = await Actor.create({name: "WoDX gate: quick start", type: "Vampire"});
    await sleep(500);
    await C.wizard(actor, "book"); await sleep(900);
    let wz = appOf(a => a.id === `wodx-wizard-${actor.id}`);
    const sel = el(wz)?.querySelector("select[name=quick-concept]");
    const concepts = sel?.options.length ?? 0;
    if ( sel ) sel.value = "soldier";
    el(wz)?.querySelector("button[data-action=quick]")?.click(); await sleep(1500);
    const asked = !!appOf(a => a instanceof foundry.applications.api.DialogV2 && a.rendered);
    const led = C.wizardLedger?.(actor);
    const rows = led?.check?.rows ?? [];
    const attrAb = rows.filter(r => ["physical", "social", "mental", "talent", "skill", "knowledge"].includes(r.group));
    const virt = rows.find(r => /virtue/i.test(`${r.group} ${r.label}`));
    ok("2. quick start", concepts === 12 && !asked && attrAb.length === 6 && attrAb.every(r => !r.over && !r.under) && (!virt || (!virt.over && !virt.under)),
      {concepts, asked, rows: rows.map(r => `${r.label} ${r.have}/${r.allowed}`)});
    wz = appOf(a => a.id === `wodx-wizard-${actor.id}`);
    const last = el(wz)?.querySelector(".wodx-wz-nav .wodx-wz-here")?.textContent ?? "";
    const s = actor.system ?? {};
    await wz?.close(); await sleep(200);
    await C.wizard(actor, "attributes"); await sleep(800);
    wz = appOf(a => a.id === `wodx-wizard-${actor.id}`);
    const minus = [...(el(wz)?.querySelectorAll("button[data-action=step][data-d='-1']") ?? [])];
    ok("3. last look and still editable", /Last look/.test(last) && (typeof s.concept !== "string" || /Soldier/.test(s.concept)) && (typeof s.nature !== "string" || !!s.nature)
      && minus.some(b => !b.disabled), {last, concept: s.concept, nature: s.nature, lowerable: minus.filter(b => !b.disabled).length});
    await wz?.close();

    await C.lifepath(actor); await sleep(900);
    let lp = appOf(a => a.id === `wodx-lifepath-${actor.id}`);
    const shortOn = !!el(lp)?.querySelector("input[name=length_][value=short]:checked");
    el(lp)?.querySelector("button[data-action=begin]")?.click(); await sleep(600);
    let clicks = 0;
    for ( ; clicks < 12; clicks++ ) {
      lp = appOf(a => a.id === `wodx-lifepath-${actor.id}`);
      if ( el(lp)?.querySelector(".wodx-lp-paragraph") ) break;
      const b = el(lp)?.querySelector("button[data-action=surprise]");
      if ( !b ) break;
      b.click(); await sleep(500);
    }
    const para = el(lp)?.querySelector(".wodx-lp-paragraph")?.textContent ?? "";
    ok("4. short lifepath", shortOn && clicks <= 6 && /^Born in \d{3,4}/.test(para), {shortOn, clicks, para: para.slice(0, 200)});
    await lp?.close();

    await C.firstNight(actor); await sleep(1200);
    const fn = appOf(a => el(a)?.classList?.contains("wodx-first-night") && a.rendered);
    const root = el(fn);
    const next = root?.querySelectorAll(".wodx-fn-next").length ?? 0;
    const head = root?.querySelector(".wodx-prompt")?.textContent ?? "";
    const done = root?.querySelectorAll(".wodx-fn-done").length ?? 0;
    const folded = root?.querySelectorAll(".wodx-fn-done > details:not([open])").length ?? 0;
    ok("5. first night checklist", next === 1 && /left\.|Every step is done/.test(head) && done === folded, {next, head: head.slice(-80), done, folded});
    await fn?.close();
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( actor ) await actor.delete(); } catch (e) { R.errors.push(`actor: ${e}`); }
  }
  return save(R);
}
