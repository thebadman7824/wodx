/**
 * Dreams and visions you write (WoDX Storyteller 0.6.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedreams.mjs?${Date.now()}`)).run()
 * It makes a character of its own and two dreams, and deletes the character, the dreams' journals and the dream list
 * entries at the end. The clock never moves: a dream set in the past is due at once.
 *   1. the module: Storyteller 0.6.0 or later, api.dreams
 *   2. two dreams kept: one an hour ago, one with no time; the window lists both as waiting
 *   3. the clock check releases the one whose time has come: a journal in WoDX dreams, seen by nobody else by default, and a card
 *   4. the untimed one waits until Release now; then it comes too
 *   5. a second check releases nothing more
 *   6. clean up
 * Result: Data/wodx-gate/gatedreams-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/6 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedreams-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), D = M?.api?.dreams;
  const keepMsgs = new Set(game.messages.map(m => m.id));
  let actor = null;
  const ids = [];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.6.0", M.version) && typeof D?.release === "function", {version: M?.version});
    actor = await Actor.create({name: "WoDX gate: Dreamer", type: "Mortal"});
    const a = await D.save({actorId: actor.id, title: "WoDX gate: the drowned bell", text: "Water.\n\nA bell under the river.", at: game.time.worldTime - 3600});
    const b = await D.save({actorId: actor.id, title: "WoDX gate: the white stag", text: "A stag in the snow.", at: null});
    ids.push(a.id, b.id);
    D.open(); await sleep(800);
    const rows = [...document.querySelectorAll("#wodx-dreams .wstory-dreams-waiting .wstory-dream-row")].map(r => r.textContent);
    ok("2. kept", rows.some(r => r.includes("the drowned bell")) && rows.some(r => r.includes("the white stag") && /release it/.test(r)), {rows: rows.length});

    const due = await D.check({force: true}); await sleep(500);
    const ja = game.journal.find(j => j.flags?.[MOD]?.dream === a.id);
    const card = game.messages.find(m => !keepMsgs.has(m.id) && /dreams\./.test(m.content ?? "") && (m.content ?? "").includes(ja?.uuid ?? "@@"));
    ok("3. the clock brings it", due.includes(a.id) && !due.includes(b.id) && ja?.folder?.name === "WoDX dreams" && ja.ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
      && /A bell under the river/.test(ja.pages.contents[0]?.text?.content ?? "") && !!card && D.list().find(d => d.id === a.id)?.released, {due, journal: ja?.name});

    const waitingB = !D.list().find(d => d.id === b.id)?.released;
    const jb = await D.release(b.id); await sleep(400);
    ok("4. by hand", waitingB && !!jb && D.list().find(d => d.id === b.id)?.released, {jb: jb?.name});

    const again = await D.check({force: true});
    ok("5. once only", again.length === 0 && game.journal.filter(j => ids.includes(j.flags?.[MOD]?.dream)).length === 2, {again});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-dreams")?.close?.();
      for ( const j of game.journal.filter(j => ids.includes(j.flags?.[MOD]?.dream)) ) await j.delete();
      for ( const id of ids ) await D?.remove?.(id);
      for ( const m of game.messages.filter(m => !keepMsgs.has(m.id) && /dreams\./.test(m.content ?? "") && /WoDX gate/.test(m.content ?? "")) ) await m.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      const folder = game.folders.find(f => f.type === "JournalEntry" && f.name === "WoDX dreams");
      if ( folder && !folder.contents?.length && !game.journal.some(j => j.folder?.id === folder.id) ) R.notes.push("the empty WoDX dreams folder is left in place");
      ok("6. clean up", !D?.list?.().some(d => ids.includes(d.id)) && (!actor || !game.actors.get(actor.id)) && !game.journal.some(j => ids.includes(j.flags?.[MOD]?.dream)));
    } catch (err) { ok("6. clean up", false, {error: err.message}); }
  }
  return save(R);
}
