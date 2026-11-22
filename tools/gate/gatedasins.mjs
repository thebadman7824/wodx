/**
 * Dark Ages depth desk item 2 (B7633, B7634): the Road reacts to what the character does.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedasins.mjs?${Date.now()}`)).run()
 *   1. a lie through the action window (Credibility) by a Path of Christ walker sends the sin card at level 8, and its
 *      Degeneration button, clicked, opens the sin window there; an automatic loss takes a Conscience dot
 *   2. feeding without leave: the feeding window of a Path of Christ walker has the leave box, and drinking with it
 *      left empty sends the level 6 card ("Feeding on an innocent without leave")
 *   3. a vampire on the Road of the Beast who went hungry all night is asked at dawn (level 1); one who fed is not
 *   4. a boon refused, a theft, Dominate on a mortal and the Embrace go to the right line of each Road
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedasins-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(w => re.test(w.title ?? w.options?.window?.title ?? "") && w.rendered);
const vampire = (name, custom, extra = {}) => ({name, type: "Vampire", system: {advantages: {path: {label: "custom", custom, permanent: 8, temporary: 8},
  bloodpool: {temporary: 2, max: 10}, virtues: {conscience: {permanent: 3}, selfcontrol: {permanent: 3}, courage: {permanent: 3}, ...extra}}}});
const sinCards = (since, who) => game.messages.filter(m => !since.has(m.id) && /a sin\?/.test(m.content ?? "") && (m.content ?? "").includes(who));

export async function run() {
  const G = gate("gatedasins");
  if ( G.notLive() ) return "gatedasins never runs in the Live world";
  try {
    await waitFor(() => !!game.wodxActions?.sinPrompt && !!game.wodxActions?.roads?.(), 30000);
    const A = game.wodxActions, K = A.kindredRules;
    if ( game.settings.get("wodx-actions", "eventPrompts") === false ) await game.settings.set("wodx-actions", "eventPrompts", true);
    const [monk, wolf, sated, human] = await G.make(Actor, [vampire("Gate DA Sins Monk", "Path of Christ"),
      vampire("Gate DA Sins Wolf", "Road of the Beast", {conscience: {permanent: 3}, selfcontrol: {permanent: 0}, instinct: {permanent: 3}}),
      vampire("Gate DA Sins Sated", "Road of the Beast", {selfcontrol: {permanent: 0}, instinct: {permanent: 3}}), vampire("Gate DA Sins Burgher", "Road of Humanity")]);

    await G.step("1. a lie told through the action window takes a Conscience dot from the Path of Christ walker", async () => {
      const before = Number(monk.system.advantages.virtues.conscience.permanent ?? 0);
      const seen = new Set(game.messages.map(m => m.id));
      A.action({actor: monk, preset: "credibility"});
      let win = null;
      await waitFor(() => (win = titled(/^WoDX Action$/)), 6000);
      elOf(win)?.querySelector?.('button[data-action="ok"]')?.click();
      let card = null;
      await waitFor(() => (card = sinCards(seen, monk.name).at(-1)), 8000);
      const el = card ? (ui.chat.element?.querySelector(`[data-message-id="${card.id}"]`) ?? document.querySelector(`#chat [data-message-id="${card.id}"]`)) : null;
      const btn = el?.querySelector?.('button[data-kx="sin"]');
      const arg = btn?.dataset?.arg ?? "";
      btn?.click();
      let sw = null;
      await waitFor(() => (sw = titled(/Sin against the Road/)), 6000);
      const sel = elOf(sw);
      const level = sel?.querySelector?.("select[name=level]")?.value ?? "";
      const lose = sel?.querySelector?.("select[name=lose]"); if ( lose ) lose.value = "conscience";
      const auto = sel?.querySelector?.("input[name=automatic]"); if ( auto ) auto.checked = true;
      sel?.querySelector?.('button[data-action="ok"]')?.click();
      const dropped = await waitFor(() => Number(monk.system.advantages.virtues.conscience.permanent ?? 0) === before - 1, 8000);
      const after = Number(monk.system.advantages.virtues.conscience.permanent ?? 0);
      G.ok("1. a lie told through the action window takes a Conscience dot from the Path of Christ walker", !!card && /level 8/.test(card.content) && arg.startsWith("8|")
        && level === "8" && dropped, {card: !!card, arg, level, conscience: [before, after]});
    });

    await G.step("2. feeding without leave asks the Path of Christ walker at level 6", async () => {
      const seen = new Set(game.messages.map(m => m.id));
      const p = A.feed({actor: monk});
      let win = null;
      await waitFor(() => (win = titled(/^WoDX Feed$/)), 6000);
      const el = elOf(win);
      const box = el?.querySelector?.("input[name=leave]");
      const vessel = el?.querySelector?.("select[name=vessel]"); if ( vessel ) vessel.value = "human";
      const take = el?.querySelector?.("input[name=take]"); if ( take ) take.value = "1";
      el?.querySelector?.('button[data-action="ok"]')?.click();
      await Promise.race([p, new Promise(r => setTimeout(r, 4000))]);
      let card = null;
      await waitFor(() => (card = sinCards(seen, monk.name).find(m => /without leave/.test(m.content))), 8000);
      const fedAt = monk.getFlag("wodx-actions", "lastFed");
      G.ok("2. feeding without leave asks the Path of Christ walker at level 6", !!box && !box.checked && !!card && /level 6/.test(card?.content ?? "")
        && fedAt !== undefined && fedAt !== null, {box: !!box, card: !!card, lastFed: fedAt ?? null});
    });

    await G.step("3. at dawn the Road of the Beast asks the one who went hungry, not the one who fed", async () => {
      await sated.setFlag("wodx-actions", "lastFed", game.time.worldTime - 3600);
      const seen = new Set(game.messages.map(m => m.id));
      const asked = await A.hungryAtDawn([wolf, sated, human]);
      const card = sinCards(seen, wolf.name).at(-1);
      G.ok("3. at dawn the Road of the Beast asks the one who went hungry, not the one who fed", asked.length === 1 && asked[0] === wolf.name
        && /level 1/.test(card?.content ?? "") && !sinCards(seen, sated.name).length, {asked, card: !!card});
    });

    await G.step("4. a refused boon, a theft, Dominate and the Embrace land on the Road's own lines", async () => {
      const at = (a, ev) => { const f = A.roadOf(a); const lv = K.sinForEvent(f, ev); return [lv, lv === null ? "" : K.sinAt(K.hierarchyOf(f), lv)]; };
      const kings = K.roadFor(A.roads(), "Road of Kings"), breath = K.roadFor(A.roads(), "Path of Breath");
      const got = {theft: at(human, "theft"), embrace: at(human, "embrace"), wolfEmbrace: at(wolf, "embrace"),
        kingsWord: K.sinForEvent(kings, "wordBroken"), breathMind: K.sinForEvent(breath, "mindMortal")};
      G.ok("4. a refused boon, a theft, Dominate and the Embrace land on the Road's own lines", got.theft[0] === 7 && /theft/i.test(got.theft[1])
        && got.embrace[0] === 3 && got.wolfEmbrace[0] === null && got.kingsWord === 2 && got.breathMind === 10, got);
    });
  } catch (e) { G.ok("no error", false, {error: e.message}); }
  return G.finish();
}
