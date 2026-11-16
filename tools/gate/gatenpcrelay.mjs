/**
 * WoDX NPC: a player's feeding reaches WoDX NPC on the Storyteller's client (B6760). Two browsers:
 *   node tools/harness/gate-two.mjs gatenpcrelay [--url https://localhost:30000]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's vampire and a mortal NPC
 *            vessel on it (linked token, no player owner)
 *   "player" (Player Test): fires wodxFed on the player's own client, exactly as WoDX Actions' feeding does after the
 *            player's vampire drinks two points from the vessel (unwilling, no struggle)
 *   "finish" (Gamemaster Test):
 *     1. the vessel is Dazed (WoDX Chronicle's condition, shown on the token) and marked kissed until the Daze lifts
 *        (WoDX NPC's aftercare, which acts on the Storyteller's client only)
 *     2. the vessel remembers losing time to the player's vampire: flags.wodx-npc.fedOn names the vampire (rivalry)
 *     3. it happened once: the vessel's fedOn count for the vampire is 1
 *   then removes what it made.
 * Result: Data/wodx-gate/gatenpcrelay-result.json. The clock never moves.
 */
import {gate, waitFor} from "./kit.mjs";

const NPC = "wodx-npc";
const PLAYER = "Player Test";

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const G = gate("gatenpcrelay", {stepTimeout: 30000});
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await G.scene({name: "WoDX gate: npc relay", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  const [vamp, vessel] = await G.make(Actor, [
    {name: "Gate Relay Vampire", type: "Vampire", ownership: OWN},
    {name: "Gate Relay Vessel", type: "Mortal", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED}}]);
  const [tv, tn] = await G.tokens(scene, [{actor: vamp, x: 2, y: 2, actorLink: true}, {actor: vessel, x: 3, y: 2, actorLink: true}]);
  await waitFor(() => tv?.object && tn?.object, 8000);
  globalThis.wodxGateNpcRelay = {G};
  return {scene: scene.id, vamp: vamp.id, vessel: vessel.id, vampUuid: vamp.uuid, vesselUuid: vessel.uuid};
}

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const vamp = game.actors.get(ids.vamp);
  ok("a. the player owns the vampire", !!vamp?.isOwner);
  // the hook as WoDX Actions' feedResolve fires it on the feeding player's client
  Hooks.callAll("wodxFed", {by: {uuid: ids.vampUuid, name: vamp?.name ?? ""}, vessel: {uuid: ids.vesselUuid, name: "Gate Relay Vessel"}, drunk: 2, willing: false, fought: false});
  ok("b. the player's client fired wodxFed", true);
  await new Promise(r => setTimeout(r, 3000));
  return steps;
}

async function finish(ids, playerSteps = []) {
  const S = globalThis.wodxGateNpcRelay;
  if ( !S ) return "0/1 passed; failed: no setup state on this client";
  const {G} = S;
  try {
    G.R.steps.push(...(playerSteps ?? []));
    const vessel = game.actors.get(ids.vessel);
    const C = game.modules.get("wodx-chronicle")?.api;
    const dazed = () => !!C?.conditions?.hasCondition?.(vessel, "dazed") || !!vessel?.statuses?.has?.("wodx-dazed");
    await waitFor(() => dazed() && !!vessel.getFlag(NPC, "kissed"), 8000);
    G.ok("1. the player's feeding leaves the mortal vessel Dazed and kissed", dazed() && !!vessel.getFlag(NPC, "kissed"),
      {kissed: vessel.getFlag(NPC, "kissed") ?? null, statuses: [...(vessel.statuses ?? [])]});
    await waitFor(() => !!vessel.getFlag(NPC, "fedOn")?.[ids.vamp], 6000);
    const fed = vessel.getFlag(NPC, "fedOn")?.[ids.vamp] ?? null;
    G.ok("2. the vessel remembers who fed on it", !!fed, {fedOn: vessel.getFlag(NPC, "fedOn") ?? null});
    G.ok("3. once, not twice", Number(fed?.times) === 1, {fed});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally { delete globalThis.wodxGateNpcRelay; }
  return G.finish();
}
