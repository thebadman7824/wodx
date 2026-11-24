/**
 * Gate for B7920-B7926: the infernal thrall of Dark Ages: Devil's Due (pp. 85-103, 124-125, 133). Makes its own
 * mortals and an inquisitor; the dice are fixed while a step rolls and put back.
 *   1. the thrall window makes a mortal a thrall: Wrath, Resolve 2, Torment 3
 *   2. a planned murder (level 8) from the window, Conscience failing (every die a 1): a point of Torment
 *   3. a sin from play: the prompt's button rolls the thrall's degeneration (every die a 1): another point
 *   4. a Pact sealed in the window, Obligation 3, Frequency 3, Consequence 2: worth 2, two Torment off
 *   5. the Pact failed by choice: an unsoakable level of harm
 *   6. a relic of Faith 3 held a turn (every die a 10): three bashing
 *   7. a binding performed from the window (every die a 10): the imp is bound; at the next dawn (every die a 10)
 *      Resolve comes back a point, Consumption bites, and the imp (Willpower 10 against Wits 1) breaks the bond
 *   8. Absolution from an inquisitor (every die a 10): a mortal again, and the price in lethal for the Arcana
 * Run: await (await import(`/wodx-gate/gatethrall.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const AX = "wodx-actions";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};
const rendered = msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); return el; };
const set = (root, name, value) => { const el = root.querySelector(`[name=${name}]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value); };
/** Open the thrall window, choose `what`, then fill the next window. */
async function thrallDo(A, actor, what, title, fill) {
  const pick = function (want, fn) { let id = null; id = Hooks.on("renderDialogV2", (app, el) => {
    const root = el instanceof HTMLElement ? el : el?.[0];
    if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
    Hooks.off("renderDialogV2", id);
    try { fn?.(root); } catch (e) { console.warn(e); }
    setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150);
  }); return id; };
  const h2 = pick(title, fill), h1 = what ? pick("The thrall:", root => set(root, "what", what)) : null;
  try { await A.thrall({actor}); await sleep(900); } finally { if ( h1 ) Hooks.off("renderDialogV2", h1); Hooks.off("renderDialogV2", h2); }
}

export async function run() {
  const G = gate("gatethrall", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.wodxActions;
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const st = a => game.actors.get(a.id).getFlag(AX, "thrall") ?? {};
  const hurt = a => { const d = game.actors.get(a.id).system.health?.damage ?? {}; return ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(d[k]) || 0), 0); };
  const heal = a => game.actors.get(a.id).update({"system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
  try {
    const [th, inq] = await G.make(Actor, [{name: "Gate Thrall: Apothecary", type: "Mortal"}, {name: "Gate Thrall: Inquisitor", type: "Mortal"}]);
    await th.update({"system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4, "system.advantages.virtues.conscience.permanent": 2,
      "system.advantages.virtues.selfcontrol.permanent": 2, "system.advantages.virtues.courage.permanent": 2, "system.attributes.wits.value": 3});
    await inq.setFlag(AX, "inquisitor", {precursor: "faithful", faith: 1, wisdom: 0, zeal: 0, curses: []});

    await G.step("1. the thrall window makes a mortal a thrall", async () => {
      await thrallDo(A, th, null, "The thrall's traits:", root => { set(root, "vice", "wrath"); set(root, "resolve", 2); set(root, "torment", 3); set(root, "tormentTemp", 0); });
      await waitFor(() => st(th).vice === "wrath", 4000);
      G.ok("1. the thrall window makes a mortal a thrall", st(th).vice === "wrath" && st(th).resolve?.perm === 2 && st(th).torment?.perm === 3, {flag: st(th)});
    });

    await G.step("2. a planned murder from the window: Conscience fails and a point of Torment", async () => {
      await dice(1);
      await thrallDo(A, th, "sin", "A sin:", root => { set(root, "level", 8); set(root, "what", "poison in the cup"); });
      await waitFor(() => st(th).torment?.temp === 1, 4000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("2. a planned murder from the window: Conscience fails and a point of Torment", st(th).torment?.temp === 1 && st(th).torment?.perm === 3, {torment: st(th).torment});
    });

    await G.step("3. a sin from play: the prompt's button rolls degeneration", async () => {
      await A.thralls.sinPrompt(th, "kill", "Gate victim is killed");
      let msg = null;
      await waitFor(() => (msg = game.messages.contents.find(m => m.timestamp >= t0 && m.content?.includes("data-thx"))), 4000);
      await dice(1);
      rendered(msg).querySelector("button[data-thx]")?.click();
      await waitFor(() => st(th).torment?.temp === 2, 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("3. a sin from play: the prompt's button rolls degeneration", !!msg && st(th).torment?.temp === 2, {torment: st(th).torment, level: /level 8/.test(msg?.content ?? "")});
    });

    await G.step("4. a Pact sealed in the window: worth 2, two Torment off", async () => {
      await thrallDo(A, th, "pact", "A pact:", root => { set(root, "oath", "a draught a week"); set(root, "obligation", 3); set(root, "frequency", 3); set(root, "consequence", 2); });
      await waitFor(() => (st(th).pacts ?? []).length === 1, 4000);
      const p = (st(th).pacts ?? [])[0];
      G.ok("4. a Pact sealed in the window: worth 2, two Torment off", p?.value === 2 && st(th).torment?.temp === 0 && st(th).torment?.perm === 3, {pact: p, torment: st(th).torment});
    });

    await G.step("5. the Pact failed by choice: an unsoakable level of harm", async () => {
      await heal(th);
      const before = hurt(th);
      await thrallDo(A, th, "fail", "A pact failed:", root => set(root, "forced", false));
      await waitFor(() => hurt(th) > before, 4000);
      G.ok("5. the Pact failed by choice: an unsoakable level of harm", hurt(th) - before === 1, {before, after: hurt(th)});
    });

    await G.step("6. a relic of Faith 3 held a turn: three bashing", async () => {
      await heal(th);
      await dice(10);
      await thrallDo(A, th, "faith", "Holy ground:", root => { set(root, "faith", 3); set(root, "turns", 1); });
      await waitFor(() => (game.actors.get(th.id).system.health?.damage?.bashing ?? 0) > 0, 4000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("6. a relic of Faith 3 held a turn: three bashing", Number(game.actors.get(th.id).system.health?.damage?.bashing) === 3, {damage: game.actors.get(th.id).system.health?.damage});
    });

    await G.step("7. a binding from the window, then dawn: Resolve, Consumption, the bond tested", async () => {
      await heal(th);
      await th.setFlag(AX, "thrall", {...st(th), rites: [{id: "rite-gate", demon: "Gate imp", kind: "bind", resolve: 2, torment: 5, willpower: 4, ready: true, known: {}}], resolve: {perm: 2, temp: 1}});
      await dice(10);
      await thrallDo(A, th, "perform", "Perform a rite:", root => { set(root, "id", "rite-gate"); set(root, "helpers", 0); });
      await waitFor(() => (st(th).bound ?? []).some(b => b.name === "Gate imp"), 4000);
      const bound = (st(th).bound ?? []).find(b => b.name === "Gate imp");
      const day = A.thralls.rules.dawnIndex(game.time.worldTime, 86400, 3600);
      // the imp's Willpower 10 against Wits 1: with every die a 10 the imp wins the day's contest
      await th.update({"system.attributes.wits.value": 1});
      await th.setFlag(AX, "thrall", {...st(th), lastDawn: day - 1, torment: {perm: 4, temp: 0}, bound: [{...bound, willpower: 10, sinceDay: day - 1, lastDay: null}]});
      await dice(10);
      await A.thralls.dawn();
      await waitFor(() => st(th).lastDawn === day, 5000);
      CONFIG.Dice.randomUniform = uniform;
      const after = st(th), imp = (after.bound ?? []).find(b => b.name === "Gate imp");
      G.ok("7. a binding from the window, then dawn: Resolve, Consumption, the bond tested", !!bound && after.resolve?.temp === 2 && Number(game.actors.get(th.id).system.health?.damage?.lethal) === 2 && imp?.free === true,
        {bound: !!bound, resolve: after.resolve, damage: game.actors.get(th.id).system.health?.damage, imp});
    });

    await G.step("8. Absolution from an inquisitor: a mortal again, at a price", async () => {
      await heal(th);
      await th.setFlag(AX, "thrall", {...st(th), torment: {perm: 3, temp: 0}, arcana: [{name: "Perfect Lie", cost: 3}, {name: "Read the Sin", cost: 3}, {name: "Sense Vitality", cost: 4}]});
      await dice(10);
      await thrallDo(A, th, "absolve", "Absolution:", root => { set(root, "who", inq.id); set(root, "art", 3); set(root, "confessed", true); });
      await waitFor(() => st(th).absolved === true, 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("8. Absolution from an inquisitor: a mortal again, at a price", st(th).absolved === true && hurt(th) === 2, {flag: st(th), hurt: hurt(th)});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate Thrall/.test(m.content + (m.speaker?.alias ?? "") + (m.flavor ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
