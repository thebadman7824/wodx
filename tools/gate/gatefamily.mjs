/**
 * Family systems gate (B3220-B3222: pregnancy and birth, supernatural story hooks), in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefamily.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes actors and deletes them, deletes its chat cards and its approval entries.
 *   1. the family API is there
 *   2. two adults start a pregnancy: the one who carries is found by sex, due about nine months on
 *   3. a minor cannot be a parent, and a Kindred cannot have a child
 *   4. the Relationships tab shows the due season under Family news, and the couple's tie has the child button
 *   5. a birth that goes well: a child with parent ties, rest after the birth, the pregnancy gone, the hook called
 *   6. a loss: no child, and the card goes to the Storyteller only
 *   7. a due birth comes by itself when the clock is past the due time (safe: no roll)
 *   8. a player's ask goes to the approval queue, and approving it starts the pregnancy
 *   9. a Garou with a mortal: the Storyteller's card has the story hook
 *  10. a newborn is a child sheet: the mark, the caps
 *  11. growing up from 6 to 14 by an approved plan: caps, a Nature, no scene about love
 *  12. at 18 the child is grown and the mark comes off
 *  13. with the setting off, a player cannot be given a child's sheet
 *  14. a proposal to a Devoted NPC: yes, the banns on the clock, the wedding card, and approving it marries them
 *  15. a proposal to a minor is refused
 *  16. clean up
 * Result: Data/wodx-gate/gatefamily-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chron = () => game.modules.get("wodx-chronicle").api;
const npc = () => game.modules.get("wodx-npc").api;
const act = () => game.modules.get("wodx-actions").api;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const msgs = new Set(game.messages.map(m => m.id));
  const made = [];
  const fam = () => npc().family;
  const exp = a => game.actors.get(a.id)?.flags?.["wodx-npc"]?.expecting ?? null;
  const kidsOf = a => game.actors.filter(x => (x.flags?.["wodx-npc"]?.child?.parents ?? []).includes(a.id));
  const births = [];
  const hookId = Hooks.on("wodxBirth", p => births.push(p.outcome));
  let ana, bo, teen, vamp, wolf, cara, baby = null;
  try {
    await step("1. api", async () => {
      ok("1. the family API is there", typeof fam()?.conceive === "function" && typeof fam()?.birth === "function" && typeof fam()?.rules?.birthDifficulty === "function");
    });
    await step("2. conceive", async () => {
      const year = (await import("/modules/wodx-chronicle/scripts/calendar.mjs")).getEngine().timeToDate(t0).year;
      [ana, bo, teen, vamp, wolf, cara] = await Actor.createDocuments([
        {name: "Gate Family Ana", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: year - 28}, sex: "female"}}},
        {name: "Gate Family Bo", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: year - 30}, sex: "male"}}},
        {name: "Gate Family Teen", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: year - 15}, sex: "female"}}},
        {name: "Gate Family Vampire", type: "Vampire", flags: {"wodx-creation": {chronology: {bornYear: year - 90}, sex: "male"}}},
        {name: "Gate Family Wolf", type: "Werewolf", flags: {"wodx-creation": {chronology: {bornYear: year - 25}, sex: "male"}}},
        {name: "Gate Family Cara", type: "Mortal", flags: {"wodx-creation": {chronology: {bornYear: year - 26}, sex: "female"}}}]);
      made.push(ana, bo, teen, vamp, wolf, cara);
      const r = await fam().conceive(bo, ana);
      const e = exp(ana);
      const months = e ? (e.due - e.start) / 2629746 : 0;
      ok("2. two adults start a pregnancy; the one who carries is found by sex; due about nine months on", r?.ok && !!e && !exp(bo) && Math.abs(months - 9) < 0.01 && !!e.season,
        {ok: r?.ok, why: r?.why, carrier: r?.mother?.name, months, season: e?.season, dueYear: e?.dueYear});
    });
    await step("3. refused", async () => {
      const a = await fam().conceive(bo, teen), b = await fam().conceive(vamp, cara);
      ok("3. a minor cannot be a parent, and a Kindred cannot have a child", a?.ok === false && b?.ok === false && !exp(teen) && !exp(cara), {minor: a?.why, kindred: b?.why});
    });
    await step("4. sheet", async () => {
      await ana.setFlag("wodx-sheets", "ties", [{uuid: bo.uuid, name: bo.name, role: "spouse"}]);
      await ana.sheet.render(true);
      await sleep(1200);
      const el = ana.sheet.element?.[0] ?? ana.sheet.element;
      const fam4 = el?.querySelector?.(".wodx-tie-family")?.textContent ?? "";
      const btn = !!el?.querySelector?.('.wodxties [data-act="tie-child"]');
      await ana.sheet.close();
      ok("4. the Relationships tab shows the due season under Family news, and the couple's tie has the child button", /Expecting, due in/.test(fam4) && btn, {family: fam4.trim().slice(0, 120), btn});
    });
    await step("5. birth", async () => {
      const r = await fam().birth(ana, {outcome: "well"});
      if ( r?.child ) { made.push(r.child); baby = r.child; }
      const ties = (r?.child?.flags?.["wodx-sheets"]?.ties ?? []).filter(t => t.role === "parent").length;
      const rest = game.actors.get(ana.id)?.flags?.["wodx-npc"]?.lyingIn;
      ok("5. a birth that goes well: a child with parent ties, rest after the birth, the pregnancy gone, the hook called", r?.ok && !!r.child && ties === 2 && !!rest && !exp(ana) && births.includes("well"),
        {child: r?.child?.name, ties, rest: rest?.label, hook: births});
    });
    await step("6. loss", async () => {
      await fam().conceive(bo, cara);
      const before = kidsOf(cara).length;
      const r = await fam().birth(cara, {outcome: "loss"});
      await sleep(300);
      const card = game.messages.contents.filter(m => !msgs.has(m.id) && /ends in a loss/.test(m.content)).at(-1);
      const gmOnly = !!card && card.whisper.length > 0 && card.whisper.every(id => game.users.get(id)?.isGM);
      ok("6. a loss: no child, and the card goes to the Storyteller only", r?.outcome === "loss" && kidsOf(cara).length === before && gmOnly && !exp(cara), {gmOnly, kids: kidsOf(cara).length - before});
    });
    await step("7. due", async () => {
      await fam().conceive(bo, cara, {safe: true});
      const e = exp(cara);
      await cara.setFlag("wodx-npc", "expecting", {...e, due: game.time.worldTime - 1});
      const before = kidsOf(cara).length;
      await fam().check();
      const kids = kidsOf(cara);
      made.push(...kids);
      ok("7. a due birth comes by itself once the clock is past the due time (safe: no roll)", kids.length === before + 1 && !exp(cara), {kids: kids.length - before});
    });
    await step("8. ask", async () => {
      const key = `wodx-npc.family-child.${[ana.id, bo.id].sort().join(".")}`;
      await fam().askChild(ana, bo);
      await sleep(500);
      const q = game.settings.get("wodx-chronicle", "approvals") ?? {pending: []};
      const entry = q.pending.find(p => p.key === key);
      if ( entry ) await chron().approvals.decide(entry.id, "approve");
      await sleep(500);
      ok("8. a player's ask goes to the approval queue, and approving it starts the pregnancy", !!exp(ana) || !!q.history?.find?.(h => h.key === key), {queued: !!entry, expecting: !!exp(ana)});
      await fam().end(ana);
    });
    await step("9. hook", async () => {
      const r = await fam().conceive(wolf, cara);
      await sleep(300);
      const card = game.messages.contents.filter(m => !msgs.has(m.id) && /For the Storyteller: Gate Family Cara/.test(m.content)).at(-1);
      ok("9. a Garou with a mortal: the Storyteller's card has the story hook", r?.ok && /Rage/.test(card?.content ?? ""), {why: r?.why, card: !!card});
      await fam().end(cara);
    });
    const year = (await import("/modules/wodx-chronicle/scripts/calendar.mjs")).getEngine().timeToDate(t0).year;
    await step("10. child sheet", async () => {
      const b = game.actors.get(baby?.id);
      const attrs = Object.values(b?.system?.attributes ?? {}).map(x => Number(x?.value) || 0);
      ok("10. a newborn is a child sheet with the mark and Attributes of 1", !!b?.flags?.["wodx-npc"]?.childSheet && b?.flags?.["wodx-chronicle"]?.minor === true && attrs.length > 0 && attrs.every(v => v <= 1) && chron().age.minor(b),
        {sheet: !!b?.flags?.["wodx-npc"]?.childSheet, mark: b?.flags?.["wodx-chronicle"]?.minor, attrs});
    });
    await step("11. grow", async () => {
      const b = game.actors.get(baby?.id);
      await b.setFlag("wodx-creation", "chronology", {...(b.flags["wodx-creation"]?.chronology ?? {}), bornYear: year - 6});
      const plan = await fam().growthPlan(b, year + 8);
      await fam().grow(plan);
      const c = game.actors.get(b.id);
      const attrs = Object.values(c.system?.attributes ?? {}).map(x => Number(x?.value) || 0);
      const abs = Object.values(c.system?.abilities ?? {}).filter(x => x && typeof x === "object").map(x => Number(x.value) || 0);
      const love = /love|court|marri|wed|betroth/i.test(JSON.stringify(plan?.scene ?? {}));
      ok("11. growing up from 6 to 14 by an approved plan: caps held, a Nature, no scene about love", plan?.to === 14 && attrs.every(v => v <= 3) && abs.every(v => v <= 3) && !!c.system?.nature && !love && !plan.grown,
        {to: plan?.to, bands: plan?.bands, scene: plan?.scene?.title, school: plan?.school?.label, nature: c.system?.nature, maxAttr: Math.max(...attrs), maxAb: Math.max(0, ...abs)});
    });
    await step("12. grown", async () => {
      const b = game.actors.get(baby?.id);
      const plan = await fam().growthPlan(b, year + 12);
      await fam().grow(plan);
      const c = game.actors.get(b.id);
      ok("12. at 18 the child is grown and the mark comes off", plan?.grown === true && c.flags?.["wodx-chronicle"]?.minor === undefined && !!c.flags?.["wodx-npc"]?.childSheet?.grown, {to: plan?.to, mark: c.flags?.["wodx-chronicle"]?.minor});
    });
    await step("13. player guard", async () => {
      const player = game.users.find(u => !u.isGM);
      const on = game.settings.get("wodx-npc", "childCharacters");
      if ( !player || on ) { ok("13. with the setting off, a player cannot be given a child's sheet", true, {skipped: !player ? "no player account" : "the setting is on"}); return; }
      await teen.update({[`ownership.${player.id}`]: 3});
      const lvl = game.actors.get(teen.id).ownership?.[player.id];
      ok("13. with the setting off, a player cannot be given a child's sheet", lvl !== 3, {player: player.name, level: lvl ?? null});
    });
    await step("14. proposal", async () => {
      await bo.setFlag("wodx-npc", "warmth", {[ana.id]: {value: 3}});
      const r = await fam().propose(ana, bo);
      const rec = game.actors.get(ana.id).flags?.["wodx-npc"]?.proposal;
      if ( rec?.stage === "waiting" ) await ana.setFlag("wodx-npc", "proposal", {...rec, due: game.time.worldTime - 1});
      await fam().checkWeddings();
      await sleep(400);
      const q = game.settings.get("wodx-chronicle", "approvals") ?? {pending: []};
      const entry = q.pending.find(p => String(p.key ?? "").startsWith(`wodx-npc.family-wedding.${rec?.id}`));
      if ( entry ) await chron().approvals.decide(entry.id, "approve");
      await sleep(400);
      const wed = (game.actors.get(ana.id).flags?.["wodx-npc"]?.marriages ?? []).some(m => m.with?.id === bo.id && !m.ended);
      ok("14. a proposal to a Devoted NPC: yes, the waiting on the clock, the wedding card, and approving it marries them", r?.answer === "yes" && rec?.stage === "waiting" && !!entry && wed && !game.actors.get(ana.id).flags?.["wodx-npc"]?.proposal,
        {answer: r?.answer, wait: rec?.wait, card: !!entry, married: wed});
    });
    await step("15. minor", async () => {
      const r = await fam().propose(bo, teen);
      ok("15. a proposal to a minor is refused", r?.ok === false && !game.actors.get(bo.id).flags?.["wodx-npc"]?.proposal, {why: r?.why});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("16. clean up", async () => {
      Hooks.off("wodxBirth", hookId);
      for ( const p of [ana, bo, cara, wolf] ) if ( p ) for ( const k of kidsOf(p) ) if ( !made.includes(k) ) made.push(k);
      for ( const x of made ) await x.delete().catch(() => null);
      await sleep(500);
      for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
      const q = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals") ?? {pending: [], history: []});
      q.pending = (q.pending ?? []).filter(p => !/^wodx-npc\.family-(child|wedding)\./.test(String(p.key ?? "")));
      q.history = (q.history ?? []).filter(p => !/^wodx-npc\.family-(child|wedding)\./.test(String(p.key ?? "")) || !made.some(x => JSON.stringify(p.data ?? {}).includes(x.id) || String(p.key).includes(x.id)));
      await game.settings.set("wodx-chronicle", "approvals", q);
      ok("16. actors, cards and approval entries gone, clock untouched", game.time.worldTime === t0 && !made.some(x => game.actors.get(x.id)));
    });
  }
  return save(R, "gatefamily-result.json");
}
