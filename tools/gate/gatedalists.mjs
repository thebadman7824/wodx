/**
 * Gate for B7931-B7933: the Dark Ages lists' missing merits and flaws at work in play. Makes its own fae and thralls,
 * each with the merit or flaw on the sheet; the dice are fixed while a step rolls and put back.
 *   1. Echo Intolerant: the Echo's roll from the fae window has six dice, not five
 *   2. Unleashing Control: a changeling's Unleashing from the window rolls three wild dice, not five
 *   3. Untainted on the sheet: a planned murder from the thrall window asks no degeneration check
 *   4. Unbound Diabolist on the sheet: the master's gift from the thrall window is refused
 *   5. Free Thinker: Weaving 3 above the Mists is not imbalance on the fae's info (it is at 4, p. 99)
 * Run: await (await import(`/wodx-gate/gatedalists.mjs?${Date.now()}`)).run()
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
const set = (root, name, value) => { const el = root.querySelector(`[name=${name}]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!value; else el.value = String(value); };
const pick = function (want, fn) { let id = null; id = Hooks.on("renderDialogV2", (app, el) => {
  const root = el instanceof HTMLElement ? el : el?.[0];
  if ( !String(app.title ?? app.options?.window?.title ?? "").startsWith(want) ) return;
  Hooks.off("renderDialogV2", id);
  try { fn?.(root); } catch (e) { console.warn(e); }
  setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150);
}); return id; };
/** Open a window by its api call and fill the windows named in `steps` ([title, fill]) as they come. */
async function through(call, steps) {
  const ids = steps.map(([t, f]) => pick(t, f));
  try { await call(); await sleep(900); } finally { for ( const id of ids ) Hooks.off("renderDialogV2", id); }
}
const feat = (name, kind) => ({name, type: "Feature", system: {type: `wod.types.${kind}`, value: 1}});
const faeFlag = {origin: "changeling", court: "summer", mien: true, mists: {perm: 3, temp: 3}, weaving: {perm: 3, temp: 3}, dominions: {day: 2}, echoes: [{trigger: "church bells"}], cantrips: [], lesser: [], greater: [], oaths: []};

export async function run() {
  const G = gate("gatedalists", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const A = game.wodxActions;
  const uniform = CONFIG.Dice.randomUniform;
  const t0 = Date.now();
  const lastMsg = who => game.messages.contents.filter(m => m.timestamp >= t0 && (m.speaker?.alias === who.name || m.speaker?.actor === who.id)).at(-1) ?? null;
  const diceIn = r => (r?.dice ?? []).reduce((s, d) => s + (d.results?.length ?? 0), 0);
  try {
    const [fi, fc, ft, tu, tb] = await G.make(Actor, [
      {name: "Gate Lists: Intolerant fae", type: "Changeling", items: [feat("Echo Intolerant", "flaw")]},
      {name: "Gate Lists: Controlled fae", type: "Changeling", items: [feat("Unleashing Control", "merit")]},
      {name: "Gate Lists: Free fae", type: "Changeling", items: [feat("Free Thinker", "merit")]},
      {name: "Gate Lists: Untainted thrall", type: "Mortal", items: [feat("Untainted", "merit")]},
      {name: "Gate Lists: Unbound thrall", type: "Mortal", items: [feat("Unbound Diabolist", "merit")]}]);
    for ( const a of [fi, fc] ) await a.setFlag(AX, "daFae", faeFlag);
    await ft.setFlag(AX, "daFae", {...faeFlag, mists: {perm: 2, temp: 2}, weaving: {perm: 5, temp: 5}});
    for ( const a of [tu, tb] ) await a.setFlag(AX, "thrall", {vice: "pride", resolve: {perm: 2, temp: 2}, torment: {perm: 3, temp: 0}, pacts: [], arcana: [], taints: [], rites: [], bound: []});

    await G.step("1. Echo Intolerant: the Echo's roll has six dice", async () => {
      await dice(1);
      await through(() => A.daEcho({actor: fi}), [["Face an Echo:", root => { set(root, "e", 0); set(root, "who", "none"); }]]);
      let msg = null;
      await waitFor(() => (msg = lastMsg(fi)) && msg.rolls?.length, 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("1. Echo Intolerant: the Echo's roll has six dice", diceIn(msg?.rolls?.[0]) === 6 && /Echo Intolerant/.test(msg?.content ?? ""), {dice: diceIn(msg?.rolls?.[0])});
    });

    await G.step("2. Unleashing Control: three wild dice", async () => {
      await dice(1);
      await through(() => A.daUnleash({actor: fc}), [["Unleash:", root => { set(root, "dominion", "day"); set(root, "clock", false); set(root, "intent", "light"); }]]);
      let msg = null;
      await waitFor(() => (msg = lastMsg(fc)) && (msg.rolls?.length ?? 0) >= 2, 5000);
      CONFIG.Dice.randomUniform = uniform;
      G.ok("2. Unleashing Control: three wild dice", diceIn(msg?.rolls?.[1]) === 3, {rolls: (msg?.rolls ?? []).map(diceIn)});
    });

    await G.step("3. Untainted on the sheet: no degeneration check for a murder", async () => {
      await dice(1);
      await through(() => A.thrall({actor: tu}), [["The thrall:", root => set(root, "what", "sin")], ["A sin:", root => { set(root, "level", 8); set(root, "what", "poison"); }]]);
      let msg = null;
      await waitFor(() => (msg = lastMsg(tu)), 5000);
      CONFIG.Dice.randomUniform = uniform;
      const t = game.actors.get(tu.id).getFlag(AX, "thrall")?.torment ?? {};
      G.ok("3. Untainted on the sheet: no degeneration check for a murder", /Untainted: no check/.test(msg?.content ?? "") && Number(t.temp) === 0, {torment: t});
    });

    await G.step("4. Unbound Diabolist: the master's gift is refused", async () => {
      await through(() => A.thrall({actor: tb}), [["The thrall:", root => set(root, "what", "invest")], ["The master's gift:", root => { set(root, "kind", "arcana"); set(root, "name", "Gate gift"); set(root, "value", 2); }]]);
      await sleep(600);
      const arc = game.actors.get(tb.id).getFlag(AX, "thrall")?.arcana ?? [];
      G.ok("4. Unbound Diabolist: the master's gift is refused", arc.length === 0, {arcana: arc});
    });

    await G.step("5. Free Thinker: Weaving 3 above the Mists is not imbalance", async () => {
      const i = A.daFaeInfo(ft);
      G.ok("5. Free Thinker: Weaving 3 above the Mists is not imbalance", i?.imbalance === null && i?.gaps?.weaving === 4, {imbalance: i?.imbalance, gaps: i?.gaps});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && /Gate Lists/.test(m.content + (m.speaker?.alias ?? "") + (m.flavor ?? ""))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
