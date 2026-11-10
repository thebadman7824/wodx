/**
 * Before the players arrive: the Storyteller's guide's quick start as checks. No Foundry in this file.
 *
 *   checks(snapshot) -> [{id, label, state: "ok"|"warn"|"fail", detail, fix}]
 *
 * `fix` names a button the window may offer (null when there is nothing to press). In a world marked live the window
 * shows the checks but offers no fixes: changes there wait for the Storyteller's own hand.
 */

/** The WoDX modules a full table expects; the window reports which of them are off. */
export const WODX = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-creation", "wodx-npc", "wodx-otherworlds", "wodx-sheets", "wodx-storyteller",
  "wodx-interactables", "wodx-targeting", "wodx-library", "wodx-senses", "wodx-atmosphere", "wodx-paperdoll"];
/** Modules WoDX replaces: with these on, WoDX Actions and WoDX Combat stay off. */
export const CLASH = ["vtda20-actions", "vtda20-combat"];
/** Names that mark a test character or a gate's leftovers. */
export const TEST_NAME = /\(gate|\bgate[ -]?test\b|^test\b|\btest character\b|\(test\)/i;

const list = (a, n = 4) => (a.length > n ? `${a.slice(0, n).join(", ")} and ${a.length - n} more` : a.join(", "));

export function checks(s = {}) {
  const out = [];
  const add = (id, label, state, detail, fix = null) => out.push({id, label, state, detail, fix: s.live ? null : fix});
  const on = s.modules ?? {};

  const clash = CLASH.filter(m => on[m]);
  add("clash", "Old modules that WoDX replaces", clash.length ? "fail" : "ok",
    clash.length ? `${list(clash)} ${clash.length === 1 ? "is" : "are"} on: WoDX Actions and WoDX Combat stay off while ${clash.length === 1 ? "it is" : "they are"}.` : "vtda20-actions and vtda20-combat are off.",
    clash.length ? "modules" : null);

  const off = WODX.filter(m => m in on && !on[m]);
  add("wodx", "WoDX modules", off.length ? "warn" : "ok",
    off.length ? `Off in this world: ${list(off)}. Fine if that is on purpose.` : "Every installed WoDX module is on.", off.length ? "modules" : null);

  const era = s.era ?? {};
  add("era", "The date and era", era.year === null || era.year === undefined ? "fail" : era.mismatch ? "warn" : "ok",
    era.year === null || era.year === undefined ? "No date is set on the Chronicle Clock." :
      `${era.label ?? "The date"}: ${era.name ?? "an era"}${era.locked ? " (locked)" : ""}.${era.mismatch ? " The year falls in another era; set the date or lock the era." : ""}`, "clock");

  add("held", "The world clock", s.held ? "warn" : "ok", s.held ? "Hold the world is on: nothing moves with the clock until it is lifted." : "Running.", s.held ? "clock" : null);

  const q = Number(s.queue) || 0;
  add("queue", "The approval queue", q ? "warn" : "ok", q ? `${q} waiting. Clear test leftovers so tonight's proposals are easy to spot.` : "Empty.", q ? "queue" : null);

  const lost = s.playersWithout ?? [];
  add("players", "Players and characters", lost.length ? "warn" : "ok",
    lost.length ? `No character assigned: ${list(lost)}.` : `${s.players ?? 0} player${s.players === 1 ? "" : "s"}, each with a character.`, lost.length ? "users" : null);

  const tests = s.testActors ?? [];
  add("tests", "Test characters", tests.length ? (s.testWorld ? "ok" : "warn") : "ok",
    tests.length ? (s.testWorld ? `${tests.length} in this test world, as expected.` : `Found: ${list(tests)}. Gates leave these; move them out of sight before play.`) : "None found.",
    tests.length && !s.testWorld ? "actors" : null);

  add("scene", "The opening scene", s.scene ? "ok" : "warn", s.scene ? `${s.scene} is active.` : "No scene is active: players will see the setup screen.", s.scene ? null : "scenes");

  if ( s.xcard !== undefined ) add("xcard", "The X-card", s.xcard ? "ok" : "warn", s.xcard ? "Pausing the game is on." : "The X-card does not pause the game. Check House rules, Safety.", s.xcard ? null : "rules");
  if ( s.beats !== undefined ) add("beats", "Beats", s.beats ? "ok" : "warn", s.beats ? "On." : "Beats are off; they wait until switched back on.", s.beats ? null : "settings");
  if ( s.live ) add("live", "The live world", "ok", "This is the live world: the window shows the checks and changes nothing.");
  return out;
}

/** The worst state of a list, for the window's headline. */
export const worst = list => (list.some(c => c.state === "fail") ? "fail" : list.some(c => c.state === "warn") ? "warn" : "ok");
