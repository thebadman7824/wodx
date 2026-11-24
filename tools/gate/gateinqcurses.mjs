/**
 * Gate for B7883-B7890: hunters' sins and Curses from play (Dark Ages: Inquisitor pp. 159, 202-213). Makes its own scene
 * and inquisitor of the Oculi Dei (Piety 7, Conscience 3, Faith 1); the dice are fixed while a step runs and put back.
 *   1. a theft's card (a sin at 6): its Piety roll button, every die a 1: a botch, Piety 7 → 6, and the Curse roll follows by itself
 *   2. a Curse card's buttons give only the order's own Anathemae for the first Acolyte Curse; Scent of Hyacinth clicked
 *      is on the sheet
 *   3. the roll window: Scent of Hyacinth counts +1 on Subterfuge, not on Intimidation
 *   4. Endless Penitence: prayer gives no Conviction
 *   5. Cocytus: Curse stages reach Piety and the Superior Virtues; a Conviction spent then comes out of the bank too
 * Run: await (await import(`/wodx-gate/gateinqcurses.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const n = v => Number(v) || 0;
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
/** Fix every d10 to one face, trying both readings of randomUniform (as gateinqblessings.mjs does). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
/** Bind a card the way the chat log does, and hand back its element. */
const rendered = msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); return el; };
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

export async function run() {
  const G = gate("gateinqcurses", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const A = game.wodxActions;
  try {
    await G.scene({name: "WoDX gate: inquisitor Curses"});
    const [agnes] = await G.make(Actor, [{name: "Gate Curses: Agnes", type: "Hunter",
      flags: {[AX]: {inquisitor: {order: "oculi", faith: 1, wisdom: 0, zeal: 0, piety: 7, curses: []}}}}]);
    await agnes.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 5,
      "system.advantages.conviction.permanent": 3, "system.advantages.conviction.temporary": 3,
      "system.virtues.conscience.value": 3, "system.attributes.manipulation.value": 3, "system.attributes.charisma.value": 3,
      "system.abilities.subterfuge.value": 2, "system.abilities.intimidation.value": 2});
    const inq = () => A.inquisitorOf(game.actors.get(agnes.id));

    await G.step("1. a theft's Piety roll botches: Piety 7 to 6, and the Curse roll follows", async () => {
      const msg = await A.pietyPrompt(agnes, "theft", "Gate: a theft", {card: true});
      const el = rendered(msg);
      const btn = el.querySelector("button[data-hx=sin]");
      await dice(1);
      try {
        btn.click();
        await waitFor(() => inq()?.f?.lastCurseRoll, 8000);
      } finally { CONFIG.Dice.randomUniform = uniform; }
      G.ok("1. a theft's Piety roll botches: Piety 7 to 6, and the Curse roll follows", !!btn && inq().piety === 6 && !!inq().f.lastCurseRoll,
        {button: !!btn, piety: inq().piety, curseRoll: inq().f.lastCurseRoll});
    });

    await G.step("2. the first Acolyte Curse is the order's own; the one clicked is on the sheet", async () => {
      const t1 = Date.now();
      // The Curse roll with the die fixed at 7 and no modifiers: a Curse of the first stage, offered on its card
      await dice(7);
      try { await A.curseRoll(agnes, {why: "Gate: a forced roll"}); } finally { CONFIG.Dice.randomUniform = uniform; }
      let card = null;
      await waitFor(() => (card = game.messages.contents.find(m => m.timestamp >= t1 && /data-hx="curse"/.test(m.content ?? ""))), 5000);
      const el = rendered(card);
      const offered = [...el.querySelectorAll("button[data-hx=curse]")].map(b => b.dataset.arg);
      el.querySelector("button[data-arg=scent-of-hyacinth]").click();
      await waitFor(() => inq().curses.includes("scent-of-hyacinth"), 5000);
      // the Curse's card posts after the sheet changes
      let shown = null;
      await waitFor(() => (shown = game.messages.contents.find(m => m.timestamp >= t1 && /<b>Scent of Hyacinth<\/b>/.test(m.content ?? "") && m.speaker?.actor === agnes.id)), 5000).catch(() => null);
      const cat = id => A.curses.curseById(id)?.cat;
      // B7934: four Anathemae of the first stage, two of them the Companion's
      G.ok("2. the first Acolyte Curse is the order's own; the one clicked is on the sheet", offered.length === 4 && offered.every(id => cat(id) === "anathemae") && inq().curses.includes("scent-of-hyacinth") && !!shown,
        {offered, curses: inq().curses, card: text(shown).slice(0, 200)});
    });

    await G.step("3. the roll window counts Scent of Hyacinth on Subterfuge, not on Intimidation", async () => {
      const p = A.action({actor: agnes});
      const app = await actionWindow();
      const lie = await partsFor(app, "manipulation", "Subterfuge");
      const cow = await partsFor(app, "charisma", "Intimidation");
      G.ok("3. the roll window counts Scent of Hyacinth on Subterfuge, not on Intimidation", /Scent of Hyacinth/.test(lie) && !/Scent of Hyacinth/.test(cow), {lie, cow});
      await app?.close(); await p;
    });

    await G.step("4. Endless Penitence: prayer gives no Conviction", async () => {
      await A.takeCurse(agnes, "endless-penitence");
      await agnes.update({[`flags.${AX}.inquisitor.-=prayerDay`]: null});
      const c0 = inq().conviction, t2 = Date.now();
      await A.prayer({actor: agnes});
      await waitFor(() => game.messages.contents.some(m => m.timestamp >= t2 && /Endless Penitence/.test(m.content ?? "")), 5000);
      G.ok("4. Endless Penitence: prayer gives no Conviction", inq().conviction === c0 && game.messages.contents.some(m => m.timestamp >= t2 && /no Conviction comes of it/.test(m.content ?? "")),
        {before: c0, after: inq().conviction});
    });

    await G.step("5. Cocytus: a spent Conviction comes out of the bank too", async () => {
      // Stages now 1 + 2; Piety 6 + Faith 1 = 7. False Witness (3) and Unclean (2) make 8.
      await A.takeCurse(agnes, "false-witness");
      await A.takeCurse(agnes, "unclean");
      await waitFor(() => inq().cocytus, 4000);
      await agnes.update({[`flags.${AX}.inquisitor.banked`]: 5, "system.advantages.conviction.temporary": 3});
      await A.spendConviction(agnes, 1);
      await waitFor(() => inq().banked === 4, 4000);
      G.ok("5. Cocytus: a spent Conviction comes out of the bank too", inq().cocytus && inq().banked === 4 && inq().conviction === 2,
        {cocytus: inq().cocytus, banked: inq().banked, conviction: inq().conviction, stages: A.curses.stagesOf(inq().curses)});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (/Gate Curses|Gate:/.test(m.content ?? "") || m.speaker?.alias === "Gate" || /Agnes/.test(m.content ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
