/**
 * Queue relief (WoDX Chronicle 0.7.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatequeue.mjs?${Date.now()}`)).run()
 * It registers two test kinds of proposal, and puts back the queue, the standing rules and the NPC cap at the end.
 *   1. the module: Chronicle 0.7.0 or later, decideMany, setAuto, releaseHeld, the npcCap setting
 *   2. the window: a tick box on each entry, Approve the ticked, and the Approve on its own list
 *   3. bulk: three proposals, one unticked in the window; Approve the ticked decides the other two
 *   4. a standing rule: a ticked kind is approved the moment it is proposed, listed as approved on its own
 *   5. a player's request is never approved on its own
 *   6. the NPC cap: with a cap of 1, the second NPC proposal is held back; the window says so; putting them in queues it
 *   7. clean up
 * Result: Data/wodx-gate/gatequeue-result.json.
 */
const MOD = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = v => foundry.utils.deepClone(v);

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatequeue-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), A = M?.api?.approvals;
  const keep = {q: clone(game.settings.get(MOD, "approvals")), auto: clone(game.settings.get(MOD, "autoApprove") ?? {}), cap: game.settings.get(MOD, "npcCap")};
  const done = [];
  const win = () => document.querySelector("#wodx-approvals");
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.7.0", M.version) && typeof A?.decideMany === "function" && typeof A?.releaseHeld === "function"
      && game.settings.settings.has(`${MOD}.npcCap`), {version: M?.version});
    A.registerHandler("wodx-gate.queue", {label: "Gate test kind", approve: e => done.push(e.title)});
    A.registerHandler("wodx-npc.gate", {label: "Gate test faction move", approve: e => done.push(e.title)});
    for ( const t of ["gate one", "gate two", "gate three"] ) await A.propose({type: "wodx-gate.queue", title: t});
    await sleep(300);
    A.ApprovalsApp.open(); await sleep(800);
    const ticks = [...(win()?.querySelectorAll("input.wodx-tick") ?? [])];
    const autoBoxes = [...(win()?.querySelectorAll(".wodx-auto[data-type]") ?? [])];
    ok("2. the window", ticks.length >= 3 && !!win()?.querySelector("[data-action=approveTicked]") && autoBoxes.some(b => b.dataset.type === "wodx-gate.queue")
      && !autoBoxes.some(b => b.dataset.type === "request"), {ticks: ticks.length, kinds: autoBoxes.length});

    const ours = () => A.pending().filter(p => p.type === "wodx-gate.queue");
    const two = ours().find(p => p.title === "gate two");
    // Leave everything that is not ours, and "gate two", unticked
    for ( const b of win().querySelectorAll("input.wodx-tick") ) b.checked = ours().some(p => p.id === b.dataset.id) && b.dataset.id !== two.id;
    win().querySelector("[data-action=approveTicked]").click();
    await sleep(1200);
    ok("3. bulk with an exception", done.includes("gate one") && done.includes("gate three") && !done.includes("gate two") && ours().length === 1 && ours()[0].id === two.id, {done: [...done]});
    await A.decide(two.id, "reject");

    await A.setAuto("wodx-gate.queue", true);
    await A.propose({type: "wodx-gate.queue", title: "gate four"}); await sleep(500);
    const h4 = A.history().find(h => h.title === "gate four");
    ok("4. approved on its own", done.includes("gate four") && h4?.auto === true && !ours().length, {h4});
    await A.setAuto("wodx-gate.queue", false);

    await A.setAuto("request", true);
    const auto5 = clone(game.settings.get(MOD, "autoApprove"));
    ok("5. a request waits", !auto5.request, {auto5});

    await game.settings.set(MOD, "npcCap", 1);
    A.resetSession();
    const r1 = await A.addToQueue({id: foundry.utils.randomID(), type: "wodx-npc.gate", title: "gate move one", data: {}, createdAt: Date.now()});
    const r2 = await A.addToQueue({id: foundry.utils.randomID(), type: "wodx-npc.gate", title: "gate move two", data: {}, createdAt: Date.now()});
    A.ApprovalsApp.refresh(); await sleep(600);
    const note = win()?.querySelector(".wodx-held")?.textContent ?? "";
    const released = await A.releaseHeld(); await sleep(300);
    ok("6. the NPC cap", r1 === "queued" && r2 === "held" && /held back/.test(note) && released === 1 && A.pending().some(p => p.title === "gate move two"), {r1, r2, note});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await game.settings.set(MOD, "approvals", keep.q);
      await game.settings.set(MOD, "autoApprove", keep.auto);
      await game.settings.set(MOD, "npcCap", keep.cap ?? 0);
      A?.resetSession?.();
      await foundry.applications.instances?.get?.("wodx-approvals")?.close?.();
      ok("7. clean up", JSON.stringify(game.settings.get(MOD, "approvals")) === JSON.stringify(keep.q) && game.settings.get(MOD, "npcCap") === (keep.cap ?? 0));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
