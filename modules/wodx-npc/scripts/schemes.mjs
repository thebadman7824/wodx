/**
 * WoDX NPC (Antagonist Lines Desk G5, B6674): foes with plans. scheme-rules.mjs has the rules.
 *
 * On each weekly faction turn every antagonist faction asks the Storyteller for one step of its scheme (the approval
 * queue). An approved step posts its sign to everyone, in the world's words, and is kept in the scheme log; the last
 * step applies its changes to the faction (a Background dot and a new goal) and, for the Wyrm's servants, plants a
 * source of corruption at the first place the faction holds, so the place's Penumbra sours week by week.
 * The clocks live in the world setting "wodx-npc.schemes": {factionId: {group, step, done, last, paused, log}}.
 */
import * as SR from "./scheme-rules.mjs";

export function build(ctx) {
  const {MOD, esc, gmIds, isActiveGM, chron, factions} = ctx;
  const TYPE = `${MOD}.scheme`;
  const clocks = () => { try { return foundry.utils.deepClone(game.settings.get(MOD, "schemes") ?? {}); } catch (e) { return {}; } };
  const save = c => game.settings.set(MOD, "schemes", c);
  const factionOf = id => factions.state()?.factions?.find(f => f.id === id) ?? null;
  const leaderOf = f => (f?.leader ? game.actors?.get(f.leader) : null) ?? null;

  function registerSettings() {
    game.settings.register(MOD, "schemes", {scope: "world", config: false, type: Object, default: {}});
  }
  /** The schemes due this turn, each sent to the queue as one step. */
  async function onTurn({turn = 0} = {}) {
    if ( !isActiveGM() ) return [];
    const s = factions.state(), year = factions.eraInfo()?.year ?? 1197;
    const leaders = Object.fromEntries(s.factions.map(f => [f.id, leaderOf(f)]));
    const out = [];
    for ( const d of SR.due(s.factions, clocks(), {year, leaders}) ) {
      const f = factionOf(d.faction), res = SR.stepOf(f, d.group, d.step);
      await chron()?.propose?.({type: TYPE, key: `scheme:${f.id}:${turn}`, title: `${f.name}: a step of its scheme`,
        detail: `The plan: ${res.goal}. Step ${res.step} of ${SR.STEPS}: ${res.sign}${res.finished ? " The plan is finished and changes the world." : ""}`,
        data: {faction: f.id, group: d.group, step: d.step}});
      out.push(d);
    }
    return out;
  }
  /** Approved: the step happens. */
  async function applyStep({faction, group}) {
    const f = factionOf(faction);
    if ( !f || !game.user.isGM ) return null;
    const all = clocks(), c = all[f.id] ?? {};
    const res = SR.stepOf(f, group, c.step ?? 0);
    all[f.id] = SR.advanced(c, res, group, game.time.worldTime);
    await save(all);
    if ( res.changes.length ) await factions.applyNow(res.changes, {reason: `${f.name}'s scheme`});
    if ( res.source ) await plant(f, res.source);
    // The sign everyone sees, in the world's words: who is behind it stays hidden when the faction is secret
    const where = placeName(f);
    await ChatMessage.create({speaker: {alias: where || "Word goes round"}, content: `<div class="wodx-card wnpc wnpc-scheme"><p>${esc(res.sign)}</p></div>`});
    Hooks.callAll("wodxScheme", {faction: f.id, group, step: res.step, finished: res.finished});
    return res;
  }
  const placeName = f => { const id = f.places?.[0]; return (id && (game.scenes?.get(id)?.name ?? factions.placeList?.()?.find?.(p => p.id === id)?.name)) || ""; };
  /** The Wyrm's servants foul the first place they hold: a source the corruption clock reads each week. */
  async function plant(f, kind) {
    const ow = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api?.corruption : null;
    const scene = (f.places ?? []).map(id => game.scenes?.get(id)).find(Boolean) ?? null;
    if ( !ow?.of || !ow?.set || !scene ) return null;
    const p = ow.of(scene) ?? {};
    const sources = [...(p.sources ?? [])];
    if ( !sources.some(x => x?.kind === kind) ) sources.push({kind});
    return ow.set(scene, {...p, sources});
  }
  /** Storyteller: set a faction's group by hand, or pause its scheme. */
  async function setClock(factionId, change = {}) {
    if ( !game.user.isGM ) return null;
    const all = clocks();
    all[factionId] = {...(all[factionId] ?? {}), ...change};
    await save(all);
    return all[factionId];
  }
  function registerHandler() {
    chron()?.registerApprovalHandler?.(TYPE, {label: "A foe's scheme takes a step", approve: e => applyStep(e.data ?? {})});
  }
  function hooks() {
    Hooks.on("wodxFactionTurn", ({turn} = {}) => { onTurn({turn}).catch(e => console.error(`${MOD} | schemes`, e)); });
  }
  return {registerSettings, registerHandler, hooks, onTurn, applyStep, setClock, clocks, TYPE, rules: SR};
}
