/**
 * Gate for B7934: the Dark Ages: Inquisitor Companion at work in play. Makes its own scene, a Knight of Acre (Brother
 * Anselm, with Divinely Favored and Grace, Piety 7 so a theft is rolled) and a Sister of St. John (Sister Odile, with Curse Prone); the dice are
 * fixed while a step rolls and put back.
 *   1. Divinely Favored: a theft's Piety roll botches from its card button (every die a 1), and the Curse roll that
 *      follows counts -2: a total of -1, so a Conviction point comes back (Companion p. 127)
 *   2. Grace: Conviction 6 over Piety 4 is not Callous; the Blessing window's Dream of Jacob from the book (every die
 *      a 10) spends its point and its card names the Companion's page (pp. 100, 126)
 *   3. Curse Prone: a Curse roll of 7 is 9, a second-stage Curse; the card offers the Sisters' three, the Companion's
 *      Slave to Visions among them, and the one clicked is on the sheet (pp. 124, 127)
 *   4. Lux Dei, given from the Storyteller's list: the roll window counts +2 on Stealth, not on Brawl (p. 119)
 * Run: await (await import(`/wodx-gate/gateinqcompanion.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
const rendered = msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); return el; };
const set = (root, name, value) => {
  const el = root.querySelector(`[name="${name}"]`);
  if ( !el ) return;
  if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value);
  el.dispatchEvent(new Event("change", {bubbles: true}));
};
/** Answer the next window whose title starts with `want`; fill(root) may return a note for the step. */
const answer = (want, fill) => { const seen = {}; const id = Hooks.on("renderDialogV2", (app, el) => {
  const root = el instanceof HTMLElement ? el : el?.[0];
  if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
  Hooks.off("renderDialogV2", id);
  setTimeout(() => { try { seen.note = fill?.(root); } catch (e) { console.warn(e); } setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 200); }, 150);
}); return {off: () => Hooks.off("renderDialogV2", id), seen}; };
async function actionWindow() {
  let app = null;
  await waitFor(() => (app = [...foundry.applications.instances.values()].filter(a => a.rendered && String(a.title ?? a.options?.window?.title ?? "").startsWith("WoDX Action")
    && a.element?.querySelector?.("select[name=preset]")).at(-1)), 5000);
  return app;
}
async function partsFor(app, attr, abilityLabel) {
  const el = app.element;
  const a = el.querySelector("[name=attr]"), b = el.querySelector("[name=ability]");
  a.value = attr;
  const opt = [...b.options].find(o => o.textContent.toLowerCase().startsWith(abilityLabel.toLowerCase()));
  b.value = opt ? opt.value : "";
  for ( const x of [a, b] ) { x.dispatchEvent(new Event("change", {bubbles: true})); x.dispatchEvent(new Event("input", {bubbles: true})); }
  await sleep(300);
  return el.querySelector(".vta-odds-parts")?.textContent ?? "";
}
const feat = (name, kind = "merit") => ({name, type: "Feature", system: {type: `wod.types.${kind}`, value: 1}});

export async function run() {
  const G = gate("gateinqcompanion", {stepTimeout: 90000});
  if ( G.notLive() ) return "Not on the Live world.";
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const A = game.wodxActions;
  try {
    await G.scene({name: "WoDX gate: the Inquisitor Companion"});
    const [ans, odi] = await G.make(Actor, [
      {name: "Gate Companion: Brother Anselm", type: "Hunter", items: [feat("Divinely Favored"), feat("Grace")],
        flags: {[AX]: {inquisitor: {order: "acre", faith: 1, wisdom: 1, zeal: 0, piety: 7, curses: []}}}},
      {name: "Gate Companion: Sister Odile", type: "Hunter", items: [feat("Curse Prone", "flaw")],
        flags: {[AX]: {inquisitor: {order: "john", faith: 1, wisdom: 2, zeal: 0, piety: 6, curses: []}}}}]);
    for ( const a of [ans, odi] ) await a.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
      "system.advantages.conviction.permanent": 3, "system.advantages.conviction.temporary": 3, "system.virtues.conscience.value": 3,
      "system.virtues.selfcontrol.value": 3, "system.attributes.stamina.value": 2, "system.attributes.dexterity.value": 2, "system.abilities.stealth.value": 2, "system.abilities.brawl.value": 2});
    const inq = a => A.inquisitorOf(game.actors.get(a.id));

    await G.step("1. Divinely Favored: the Curse roll after a botched Piety roll counts -2", async () => {
      const c0 = inq(ans).conviction;
      const msg = await A.pietyPrompt(ans, "theft", "Gate: a theft", {card: true});
      const btn = rendered(msg).querySelector("button[data-hx=sin]");
      await dice(1);
      // the Curse roll follows the sin's card, slowly on a busy lane (over 20 s on lane 9): the dice stay fixed until its card
      let card = null;
      try {
        btn.click();
        await waitFor(() => (card = game.messages.contents.find(m => m.timestamp >= t0 && m.speaker?.actor === ans.id && /a Curse roll/.test(m.content ?? ""))), 60000);
      } finally { CONFIG.Dice.randomUniform = uniform; }
      const r = inq(ans).f.lastCurseRoll;
      G.ok("1. Divinely Favored: the Curse roll after a botched Piety roll counts -2", !!btn && r?.total === -1 && r?.stage === 0 && inq(ans).conviction === c0 + 1 && /Divinely Favored/.test(text(card)),
        {roll: r, conviction: [c0, inq(ans).conviction], piety: inq(ans).piety, card: text(card).slice(0, 240)});
    });

    await G.step("2. Grace: not Callous at Piety + 2; Dream of Jacob from the book spends its point", async () => {
      await ans.update({"system.advantages.conviction.temporary": 6, [`flags.${AX}.inquisitor.piety`]: 4});
      const c0 = inq(ans).conviction, t1 = Date.now();
      await dice(10);
      const w = answer("A Blessing:", root => { const head = root.querySelector("p")?.textContent ?? ""; set(root, "bk", "c-jacob"); return head; });
      try { await A.blessing({actor: ans}); await waitFor(() => inq(ans).conviction !== c0, 6000); } finally { w.off(); CONFIG.Dice.randomUniform = uniform; }
      let card = null;
      await waitFor(() => (card = game.messages.contents.find(m => m.timestamp >= t1 && m.speaker?.actor === ans.id && /Dream of Jacob/.test(m.content ?? ""))), 5000);
      G.ok("2. Grace: not Callous at Piety + 2; Dream of Jacob from the book spends its point", /Conviction 6, Piety 4/.test(w.seen.note ?? "") && !/Callous/.test(w.seen.note ?? "")
        && inq(ans).conviction === c0 - 1 && /Dark Ages: Inquisitor Companion p\. 100/.test(text(card)), {header: w.seen.note, conviction: [c0, inq(ans).conviction], card: text(card).slice(0, 300)});
    });

    await G.step("3. Curse Prone: a 7 is a second-stage Curse; the Companion's Slave to Visions clicked is on the sheet", async () => {
      const t2 = Date.now();
      await dice(7);
      try { await A.curseRoll(odi, {why: "Gate: a forced roll"}); } finally { CONFIG.Dice.randomUniform = uniform; }
      let card = null;
      await waitFor(() => (card = game.messages.contents.find(m => m.timestamp >= t2 && /data-hx="curse"/.test(m.content ?? ""))), 5000);
      const el = rendered(card);
      const offered = [...el.querySelectorAll("button[data-hx=curse]")].map(b => b.dataset.arg);
      el.querySelector("button[data-arg=slave-to-visions]")?.click();
      await waitFor(() => inq(odi).curses.includes("slave-to-visions"), 5000);
      // the Curse's card posts after the sheet changes
      let shown = null;
      await waitFor(() => (shown = game.messages.contents.find(m => m.timestamp >= t2 && /Companion p\. 124/.test(m.content ?? "") && m.speaker?.actor === odi.id)), 5000).catch(() => null);
      G.ok("3. Curse Prone: a 7 is a second-stage Curse; the Companion's Slave to Visions clicked is on the sheet", inq(odi).f.lastCurseRoll?.total === 9 && offered.length === 3
        && offered.includes("slave-to-visions") && inq(odi).curses.includes("slave-to-visions") && !!shown, {roll: inq(odi).f.lastCurseRoll, offered, curses: inq(odi).curses});
    });

    await G.step("4. Lux Dei: +2 on Stealth in the roll window, not on Brawl", async () => {
      await A.takeCurse(odi, "lux-dei");
      await waitFor(() => inq(odi).curses.includes("lux-dei"), 4000);
      const p = A.action({actor: odi});
      const app = await actionWindow();
      const hide = await partsFor(app, "dexterity", "Stealth");
      const hit = await partsFor(app, "dexterity", "Brawl");
      G.ok("4. Lux Dei: +2 on Stealth in the roll window, not on Brawl", /Lux Dei/.test(hide) && !/Lux Dei/.test(hit), {hide, hit});
      await app?.close(); await p;
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate Companion|Gate: a /.test(m.content + (m.speaker?.alias ?? "") + (m.flavor ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
