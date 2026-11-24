/**
 * Gate for B7874-B7882: a sept to live in and Renown from play (Dark Ages: Werewolf pp. 29-36, 98-101, 144-145, 167-170).
 * Makes its own two player Garou; puts the sept record back afterwards and rejects what it left on the approval queue.
 *   1. "Done today" in the sept window counts the day's chore
 *   2. the moot (the window's button): the Garou who stayed away gets the Wisdom suggestion; approved, a Wisdom goes
 *   3. refusing an office (the window's button): approved, Glory, Honor and Wisdom go
 *   4. a fox frenzy (the Rage card's button) suggests Glory and Wisdom lost; approved, both go
 *   5. a rite lesson's last week (the window's button): the rite is on the student's sheet
 *   6. Renown meets the next rank: the challenge waits; set and passed in the window, the rank goes up on the sheet
 * Run: await (await import(`/wodx-gate/gatesept.mjs?${Date.now()}`)).run()
 */
import {gate, waitFor} from "./kit.mjs";

const ST = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const G = gate("gatesept", {stepTimeout: 45000});
  const api = () => game.modules.get(ST)?.api?.sept;
  const Q = () => game.modules.get("wodx-chronicle")?.api?.approvals;
  const keep = foundry.utils.deepClone(game.settings.get(ST, "septs"));
  const t0 = Date.now();
  const player = game.users.find(u => !u.isGM);
  const pendingFor = (id, deed) => (Q()?.pending?.() ?? []).find(p => p.type === "wodx-actions.renown" && p.data?.actorId === id && p.data?.deed === deed);
  const renown = (a, k) => Number(game.actors.get(a.id).system?.renown?.[k]?.temporary ?? 0);
  /** Approve the suggestion when it waits (a standing rule may have approved it already). */
  const approve = async (a, deed) => { await waitFor(() => pendingFor(a.id, deed), 4000); const p = pendingFor(a.id, deed); if ( p ) await Q().decide(p.id, "approve", "gatesept"); await sleep(400); };
  const win = () => foundry.applications.instances.get("wodx-sept");
  const reopen = async () => { await api().open("sept"); await sleep(500); return win(); };
  try {
    if ( !player ) { G.ok("a player user to own the Garou", false, {error: "No player user in the world"}); return; }
    const own = {default: 0, [player.id]: 3};
    const renownSys = {glory: {permanent: 1, temporary: 3}, honor: {permanent: 1, temporary: 3}, wisdom: {permanent: 1, temporary: 3}, rank: 1};
    const [ilse, mirek] = await G.make(Actor, [{name: "Gate Sept: Ilse", type: "Werewolf", ownership: own, system: {renown: renownSys, auspice: "Theurge"}},
      {name: "Gate Sept: Mirek", type: "Werewolf", ownership: own, system: {renown: renownSys, auspice: "Ahroun"}}]);
    await api().setMembers("sept", [{id: ilse.id, name: ilse.name, chore: "watch"}, {id: mirek.id, name: mirek.name, chore: "firewood"}]);

    await G.step("1. Done today in the sept window counts the chore", async () => {
      const app = await reopen();
      app.element.querySelector(`button[data-action=chore][data-id="${ilse.id}"]`).click();
      const day = Math.floor(game.time.worldTime / 86400);
      await waitFor(() => api().state("sept").days[ilse.id]?.includes(day), 4000);
      G.ok("1. Done today in the sept window counts the chore", api().state("sept").days[ilse.id]?.includes(day), {days: api().state("sept").days});
    });

    await G.step("2. the moot: the Garou who stayed away loses a Wisdom once approved", async () => {
      const before = renown(mirek, "wisdom");
      const app = await reopen();
      const f = app.element.querySelector("form.wst-sept-moot");
      f.elements[`here_${mirek.id}`].checked = false;
      f.querySelector("button[data-action=moot]").click();
      await approve(mirek, "missed-moot");
      await waitFor(() => renown(mirek, "wisdom") < before, 5000);
      G.ok("2. the moot: the Garou who stayed away loses a Wisdom once approved", renown(mirek, "wisdom") === before - 1 && api().state("sept").lastMoot !== null,
        {before, after: renown(mirek, "wisdom")});
    });

    await G.step("3. refusing an office costs Glory, Honor and Wisdom once approved", async () => {
      const b = {glory: renown(ilse, "glory"), honor: renown(ilse, "honor"), wisdom: renown(ilse, "wisdom")};
      const app = await reopen();
      const f = app.element.querySelector("form.wst-sept-office");
      f.elements.who.value = ilse.id;
      f.querySelector("button[data-action=office][data-accepts='0']").click();
      await approve(ilse, "refuse-office");
      await waitFor(() => renown(ilse, "honor") < b.honor, 5000);
      G.ok("3. refusing an office costs Glory, Honor and Wisdom once approved", renown(ilse, "glory") === b.glory - 1 && renown(ilse, "honor") === b.honor - 2 && renown(ilse, "wisdom") === b.wisdom - 1,
        {b, after: {glory: renown(ilse, "glory"), honor: renown(ilse, "honor"), wisdom: renown(ilse, "wisdom")}});
    });

    await G.step("4. a fox frenzy costs Glory and Wisdom once approved", async () => {
      const b = {glory: renown(mirek, "glory"), wisdom: renown(mirek, "wisdom")};
      const msg = await ChatMessage.create({speaker: {alias: "Gate"}, whisper: [game.user.id],
        content: `<div class="vta-card"><button type="button" class="vta-btn" data-garou="fox" data-actor="${mirek.uuid}">Fox</button></div>`});
      const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el);
      el.querySelector("button[data-garou]").click();
      await approve(mirek, "fox-frenzy");
      await waitFor(() => renown(mirek, "glory") < b.glory, 5000);
      G.ok("4. a fox frenzy costs Glory and Wisdom once approved", renown(mirek, "glory") === b.glory - 1 && renown(mirek, "wisdom") === b.wisdom - 1,
        {b, after: {glory: renown(mirek, "glory"), wisdom: renown(mirek, "wisdom")}});
      try { await game.actors.get(mirek.id).update({"system.conditions.isfrenzy": false}); } catch {}
    });

    await G.step("5. a rite lesson's last week puts the rite on the sheet", async () => {
      await game.actors.get(ilse.id).update({"system.attributes.intelligence.value": 4, "system.abilities.rituals.value": 2});
      const r = await api().beginLesson("sept", {student: ilse.id, teacher: "Gate elder", rite: "Gate Rite of Cleansing", level: 1, tribute: "a month of firewood"});
      const was = CONFIG.Dice.randomUniform;
      CONFIG.Dice.randomUniform = () => 0.95;
      try {
        const app = await reopen();
        app.element.querySelector(`button[data-action=week][data-id="${r.lesson?.id}"]`).click();
        await waitFor(() => game.actors.get(ilse.id).items.some(i => i.name === "Gate Rite of Cleansing"), 6000);
      } finally { CONFIG.Dice.randomUniform = was; }
      const it = game.actors.get(ilse.id).items.find(i => i.name === "Gate Rite of Cleansing");
      G.ok("5. a rite lesson's last week puts the rite on the sheet", it?.type === "Power" && it.system.type === "wod.types.rite" && api().state("sept").lessons.find(l => l.id === r.lesson?.id)?.state === "learned",
        {item: it?.system, ok: r.ok});
    });

    await G.step("6. a rank challenge set and passed in the window raises the rank", async () => {
      Hooks.callAll("wodxRankReady", {actorId: ilse.id, name: ilse.name, rank: 2, from: 1});
      await waitFor(() => api().state("sept").challenges.some(c => c.actorId === ilse.id && c.rank === 2), 4000);
      const c = api().state("sept").challenges.find(x => x.actorId === ilse.id);
      let app = await reopen();
      app.element.querySelector(`button[data-action=setc][data-id="${c.id}"]`).click();
      await waitFor(() => api().state("sept").challenges.find(x => x.id === c.id)?.state === "set", 4000);
      app = await reopen();
      app.element.querySelector(`button[data-action=endc][data-id="${c.id}"][data-passed='1']`).click();
      await waitFor(() => Number(game.actors.get(ilse.id).system.renown?.rank) === 2, 5000);
      G.ok("6. a rank challenge set and passed in the window raises the rank", Number(game.actors.get(ilse.id).system.renown?.rank) === 2 && !!api().state("sept").challenges.find(x => x.id === c.id)?.task,
        {rank: game.actors.get(ilse.id).system.renown?.rank, challenge: api().state("sept").challenges.find(x => x.id === c.id)});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    try { await win()?.close(); } catch {}
    try { await game.settings.set(ST, "septs", keep); } catch (e) { G.R.errors.push(`restore: ${e.message}`); }
    for ( const p of (Q()?.pending?.() ?? []).filter(p => p.type === "wodx-actions.renown" && /Gate Sept/.test(p.title)) ) { try { await Q().decide(p.id, "reject", "gatesept"); } catch {} }
    for ( const m of game.messages.contents.filter(m => m.timestamp >= t0 && (m.content?.includes("wst-sept") || m.content?.includes("Gate Sept") || m.speaker?.alias === "Gate")) ) { try { await m.delete(); } catch {} }
    return G.finish();
  }
}
