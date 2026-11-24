/**
 * Gate for B7891-B7898: an inquisitor cell to live in (Dark Ages: Inquisitor Companion pp. 71-80, 95-98, 116; Dark
 * Ages: Inquisitor pp. 155-156). Makes its own player inquisitor and puts the cell record back afterwards; the dice are
 * fixed while a step rolls and put back.
 *   1. "Office today" in the cell window counts the day's office
 *   2. "The week's reckoning": from 1223 a player's inquisitor who broke the Rule is asked for a Piety roll; before
 *      1223 the card says no Rule binds them and asks none
 *   3. the chapter-house saved with Holy Ground 2 goes on the sheet; "Morning at the chapter-house" gives two Willpower
 *   4. prayer at the chapter-house: the window offers its Holy Ground, and the card says where it came from
 *   5. Sanctification of the Homestead from the window (every die a 10): the house is warded
 *   6. a retreat for an Endowment from the window, ended at once with "Back from retreat": rushed, the Curse roll follows
 *   7. a sin hidden and found out ("Hidden, and found out"): the member leaves the cell and the sheet's link goes
 * Run: await (await import(`/wodx-gate/gateinqcell.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const ST = "wodx-storyteller";
const AX = "wodx-actions";
const KEY = "gate-cell";
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** Fix every d10 to one face, trying both readings of randomUniform (as gateinqcurses.mjs does). */
const dice = async face => {
  for ( const u of [(face - 0.5) / 10, 1 - (face - 0.5) / 10] ) {
    CONFIG.Dice.randomUniform = () => u;
    if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return;
  }
  throw new Error(`could not fix the dice to ${face}`);
};

export async function run() {
  const G = gate("gateinqcell", {stepTimeout: 45000});
  if ( G.notLive() ) return "Not on the Live world.";
  const api = () => game.modules.get(ST)?.api?.upkeep?.cell;
  const A = game.wodxActions;
  const uniform = CONFIG.Dice.randomUniform;
  const keep = foundry.utils.deepClone(game.settings.get(ST, "cells") ?? {});
  const t0 = Date.now();
  const player = game.users.find(u => !u.isGM);
  const win = () => foundry.applications.instances.get("wodx-cell");
  const reopen = async () => { await api().open(KEY); await sleep(500); return win(); };
  const flag = a => game.actors.get(a.id)?.getFlag(AX, "inquisitor") ?? {};
  try {
    if ( !player ) { G.ok("a player user to own the inquisitor", false, {error: "No player user in the world"}); return; }
    const [clem] = await G.make(Actor, [{name: "Gate Cell: Clement", type: "Hunter", ownership: {default: 0, [player.id]: 3},
      flags: {[AX]: {inquisitor: {order: "john", faith: 2, wisdom: 0, zeal: 0, piety: 7, curses: []}}}}]);
    await clem.update({"system.advantages.willpower.permanent": 5, "system.advantages.willpower.temporary": 2,
      "system.advantages.conviction.permanent": 3, "system.advantages.conviction.temporary": 1,
      "system.virtues.conscience.value": 3, "system.attributes.intelligence.value": 3});
    await api().found(KEY, {name: "Gate cell"});
    await api().setMembers(KEY, [{id: clem.id, name: clem.name}]);

    await G.step("1. Office today in the cell window counts the day", async () => {
      const app = await reopen();
      app.element.querySelector(`button[data-action=round][data-id="${clem.id}"][data-kind=office]`).click();
      const day = Math.floor(game.time.worldTime / 86400);
      await waitFor(() => api().state(KEY).days[clem.id]?.office?.includes(day), 4000);
      G.ok("1. Office today in the cell window counts the day", !!api().state(KEY).days[clem.id]?.office?.includes(day), {days: api().state(KEY).days});
    });

    await G.step("2. the week's reckoning: the Rule from 1223, none before", async () => {
      const t1 = Date.now();
      const app = await reopen();
      app.element.querySelector("button[data-action=reckon]").click();
      let rc = null;
      await waitFor(() => (rc = game.messages.contents.find(m => m.timestamp >= t1 && /the week's reckoning/.test(m.content ?? ""))), 6000);
      await sleep(600);
      const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 2000;
      const prompt = game.messages.contents.find(m => m.timestamp >= t1 && /data-hx="sin"/.test(m.content ?? "") && /Rule/.test(m.content ?? ""));
      const ok = year >= 1223 ? !!prompt && /the Rule broken/.test(rc?.content ?? "") : !prompt && /no Rule binds them/.test(rc?.content ?? "");
      G.ok("2. the week's reckoning: the Rule from 1223, none before", ok && api().state(KEY).lastReckon !== null, {year, prompt: !!prompt, card: String(rc?.content ?? "").replace(/<[^>]+>/g, " ").slice(0, 300)});
    });

    await G.step("3. Holy Ground 2 at the chapter-house: on the sheet, and two Willpower on waking", async () => {
      const app = await reopen();
      const f = app.element.querySelector("form.wst-cell-house");
      f.elements.name.value = "Gate chapter-house"; f.elements.pooled.value = "3"; f.elements.size.value = "1"; f.elements.holy.value = "2";
      f.querySelector("button[data-action=house]").click();
      await waitFor(() => flag(clem).cell?.holy === 2, 5000);
      await clem.update({[`flags.${AX}.inquisitor.-=wakeDay`]: null});
      const before = Number(game.actors.get(clem.id).system.advantages.willpower.temporary);
      (await reopen()).element.querySelector("button[data-action=morning]").click();
      await waitFor(() => Number(game.actors.get(clem.id).system.advantages.willpower.temporary) === before + 2, 5000);
      G.ok("3. Holy Ground 2 at the chapter-house: on the sheet, and two Willpower on waking", flag(clem).cell?.holy === 2 && Number(game.actors.get(clem.id).system.advantages.willpower.temporary) === before + 2,
        {cell: flag(clem).cell, before, after: game.actors.get(clem.id).system.advantages.willpower.temporary});
    });

    await G.step("4. prayer at the chapter-house reads its Holy Ground", async () => {
      await clem.update({[`flags.${AX}.inquisitor.-=prayerDay`]: null});
      const t2 = Date.now();
      let offered = false;
      const grab = (app, el) => { const root = el instanceof HTMLElement ? el : el?.[0];
        if ( String(app.title ?? app.options?.window?.title ?? "").startsWith("Prayer:") ) { offered = !!root?.querySelector("input[name=house]"); setTimeout(() => root?.querySelector("button[data-action=ok]")?.click(), 150); } };
      const hk = Hooks.on("renderDialogV2", grab);
      await dice(10);
      try { await A.prayer({actor: clem}); await sleep(500); } finally { Hooks.off("renderDialogV2", hk); CONFIG.Dice.randomUniform = uniform; }
      let card = null;
      await waitFor(() => (card = game.messages.contents.find(m => m.timestamp >= t2 && /At the chapter-house: Holy Ground 2/.test(m.content ?? ""))), 5000);
      G.ok("4. prayer at the chapter-house reads its Holy Ground", offered && !!card, {offered, card: !!card});
    });

    await G.step("5. Sanctification of the Homestead wards the house", async () => {
      const app = await reopen();
      const f = app.element.querySelector("form.wst-cell-ward");
      f.elements.who.value = clem.id; f.elements.rating.value = "2";
      await dice(10);
      try { f.querySelector("button[data-action=sanctify]").click(); await waitFor(() => api().rules.warded(api().state(KEY).house, game.time.worldTime), 6000); }
      finally { CONFIG.Dice.randomUniform = uniform; }
      G.ok("5. Sanctification of the Homestead wards the house", api().rules.warded(api().state(KEY).house, game.time.worldTime), {house: api().state(KEY).house});
    });

    await G.step("6. a retreat for an Endowment ended at once is rushed: the Curse roll follows", async () => {
      const app = await reopen();
      const f = app.element.querySelector("form.wst-cell-retreat");
      f.elements.who.value = clem.id; f.elements.purpose.value = "endowment"; f.elements.days.value = "14";
      f.querySelector("button[data-action=retreat]").click();
      await waitFor(() => !!flag(clem).retreat, 5000);
      const away = !!flag(clem).retreat;
      await sleep(400);
      await dice(2);
      try {
        (await reopen()).element.querySelector(`button[data-action=back][data-id="${clem.id}"]`).click();
        await waitFor(() => !flag(clem).retreat && !!flag(clem).lastCurseRoll, 8000);
      } finally { CONFIG.Dice.randomUniform = uniform; }
      G.ok("6. a retreat for an Endowment ended at once is rushed: the Curse roll follows", away && !flag(clem).retreat && !!flag(clem).lastCurseRoll, {away, retreat: flag(clem).retreat ?? null, curseRoll: flag(clem).lastCurseRoll ?? null});
    });

    await G.step("7. a sin hidden and found out: the member leaves the cell", async () => {
      const app = await reopen();
      const f = app.element.querySelector("form.wst-cell-sin");
      f.elements.who.value = clem.id; f.elements.what.value = "Gate: a hidden fault";
      f.querySelector("button[data-action=sin][data-confessed=\"0\"]").click();
      await waitFor(() => !api().state(KEY).members.some(m => m.id === clem.id) && !flag(clem).cell, 5000);
      G.ok("7. a sin hidden and found out: the member leaves the cell", !api().state(KEY).members.some(m => m.id === clem.id) && !flag(clem).cell, {members: api().state(KEY).members, cell: flag(clem).cell ?? null});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    CONFIG.Dice.randomUniform = uniform;
    try { win()?.close(); } catch {}
    try { await game.settings.set(ST, "cells", keep); } catch {}
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (/Gate cell|Gate Cell|Gate:/.test(m.content ?? "") || /Clement/.test(m.content ?? "") || ["The cell"].includes(m.speaker?.alias))) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
