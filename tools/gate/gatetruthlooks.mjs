/**
 * WoDX Chronicle: a player's own token look, derangement edge and look on the map, seen from the player's screen
 * (B4632, B6163). Two browsers, rothenstein-wodx:
 *   node tools/harness/gate-two.mjs gatetruthlooks [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's own character (Megalomania
 *            in the Derangements box, owned by the player and made the player's character) and its token; listens on
 *            this client for the player's looks.show request on WoDX Chronicle's socket
 *   "player" (Player Test), on the player's own client:
 *     a. the player puts Frenzy on their own character: the token shows Frenzy's red aura on this screen
 *     b. the player gives in to their own Megalomania (api.derangements.hold, no roll): the bout's red edge rings this
 *        screen (#wodx-derangement-edge, data-edge "red")
 *     c. the player calls api.looks.show for fire round their token: an id comes back at once, and the shape the
 *        Storyteller places shows on this screen
 *   "finish" (Gamemaster Test):
 *     1. the looks.show request reached the Storyteller's client on the socket, and the look is stored on the scene
 *        with the shape the Storyteller drew
 *     2. the bout reached the Storyteller's side (the flag and the Deranged status), and no edge shows on this screen:
 *        the edge is for the character's own player only
 *     3. Frenzy's aura shows on the Storyteller's screen too: a token look is for everyone
 *   then ends the look and the bout, puts the player's character back and removes what it made.
 * Result: Data/wodx-gate/gatetruthlooks-result.json. The clock never moves.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-chronicle";
const SOCKET = `module.${MOD}`;
const PLAYER = "Player Test";
const SOURCE = "WoDX gate: truth looks";
const RED = 0xc0221b;
const api = () => game.modules.get(MOD)?.api;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const edgeEl = () => document.getElementById("wodx-derangement-edge");

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

async function setup() {
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const G = gate("gatetruthlooks", {stepTimeout: 45000});
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  const OWN = {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER};
  const scene = await G.scene({name: "WoDX gate: truth looks", ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  const [hero] = await G.make(Actor, [{name: "Gate Looks Character", type: "Mortal", ownership: OWN,
    system: {derangement: "Megalomania", attributes: {stamina: {value: 2}}, advantages: {willpower: {permanent: 3, temporary: 3}}}}]);
  const [th] = await G.tokens(scene, [{actor: hero, x: 4, y: 4, actorLink: true}]);
  await waitFor(() => th?.object, 8000);
  const keepCharacter = user.character?.id ?? null;
  await user.update({character: hero.id});
  // the player's looks.show arrives here as a socket message (looks.mjs askGM, main.mjs onSocket)
  const seen = [];
  const onSocket = data => { if ( data?.type === "looks.show" && data?.payload?.source === SOURCE ) seen.push({...data.payload}); };
  game.socket.on(SOCKET, onSocket);
  globalThis.wodxGateLooks = {G, seen, onSocket, keepCharacter, user: user.id};
  return {scene: scene.id, hero: hero.id, th: th.id};
}

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  const C = api();
  let fx0 = null;
  try { fx0 = game.settings.get(MOD, "fxLevel"); await game.settings.set(MOD, "fxLevel", "full"); } catch (e) { /* the default is full */ }
  try {
    const scene = game.scenes.get(ids.scene);
    await scene.view();
    await waitFor(() => canvas.ready && canvas.scene?.id === scene.id && scene.tokens.get(ids.th)?.object, 15000);
    const token = scene.tokens.get(ids.th).object, actor = game.actors.get(ids.hero);
    token.control({releaseOthers: true});
    await waitFor(() => game.user.character?.id === ids.hero, 5000);
    // a. the player's own Frenzy: the token look is drawn on this client
    try {
      await actor.toggleStatusEffect("wodx-frenzy", {active: true});
      const drawn = await waitFor(() => token._wodxLook?.aura && !token._wodxLook.aura.destroyed, 6000);
      const look = C?.tokenLooks?.looksOf?.(token);
      ok("a. the player's Frenzy shows its red aura on the player's screen", !!drawn && look?.aura?.color === RED,
        {aura: look?.aura ?? null, drawn: !!drawn});
    } catch (e) { ok("a. the player's Frenzy shows its red aura on the player's screen", false, {error: e.message}); }
    // b. the player gives in to their own derangement: the edge of this screen burns red
    try {
      const r = await C?.derangements?.hold?.(actor, "megalomania", {give: true});
      const edged = await waitFor(() => edgeEl()?.dataset?.edge === "red", 6000);
      ok("b. the player's Megalomania rings the player's screen with a red edge", !!edged && C?.tokenLooks?.edgeNow?.() === "red" && r?.held === false,
        {edge: edgeEl()?.dataset?.edge ?? null, edgeNow: C?.tokenLooks?.edgeNow?.() ?? null, held: r?.held ?? null});
    } catch (e) { ok("b. the player's Megalomania rings the player's screen with a red edge", false, {error: e.message}); }
    // c. the player asks for a look on the map round their token; the Storyteller places it, and this screen shows it
    try {
      const at = {x: token.center.x, y: token.center.y, radius: 120};
      const id = await C?.looks?.show?.({scene: scene.id, kind: "fire", at, until: {seconds: 600}, source: SOURCE});
      const stored = await waitFor(() => C.looks.list(scene).some(l => l.id === id), 8000);
      const shape = await waitFor(() => scene.drawings.find(d => d.flags?.[MOD]?.look === id)?.object, 8000);
      ok("c. the player's look on the map comes back with an id and shows on the player's screen", typeof id === "string" && !!stored && !!shape,
        {id: id ?? null, stored: !!stored, shape: !!shape});
      steps.lookId = id;
    } catch (e) { ok("c. the player's look on the map comes back with an id and shows on the player's screen", false, {error: e.message}); }
    await sleep(1500);
  } finally {
    if ( fx0 !== null ) { try { await game.settings.set(MOD, "fxLevel", fx0); } catch (e) { /* leave it */ } }
  }
  return steps.map(s => ({...s, lookId: steps.lookId ?? null}));
}

async function finish(ids, playerSteps = []) {
  const S = globalThis.wodxGateLooks;
  if ( !S ) return "0/1 passed; failed: no setup state on this client";
  const {G, seen, onSocket, keepCharacter, user} = S;
  const scene = game.scenes.get(ids.scene), actor = game.actors.get(ids.hero);
  const lookId = playerSteps.find(s => s.lookId)?.lookId ?? null;
  const C = api();
  try {
    G.R.steps.push(...(playerSteps ?? []).map(({lookId: _, ...s}) => s));
    // 1. the request arrived on the socket, and the Storyteller stored the look and drew its shape
    const look = C?.looks?.list?.(scene).find(l => l.id === lookId);
    G.ok("1. the player's looks.show reached the Storyteller, who stored and drew it", seen.some(p => p.id === lookId && p.kind === "fire" && p.scene === ids.scene)
      && look?.source === SOURCE && !!look?.drawing && !!scene.drawings.get(look.drawing),
      {seen: seen.map(p => ({id: p.id, kind: p.kind})), lookId, drawing: look?.drawing ?? null});
    // 2. the bout is on the character for everyone, but the edge only rings its own player's screen
    const bout = actor?.getFlag(MOD, "bout");
    G.ok("2. the bout reached the Storyteller's side, and no edge shows on the Storyteller's screen",
      (bout?.keys ?? []).includes("megalomania") && actor.statuses?.has?.("wodx-deranged") && !edgeEl() && C?.tokenLooks?.edgeNow?.() === null,
      {keys: bout?.keys ?? null, statuses: [...(actor?.statuses ?? [])], edge: edgeEl()?.dataset?.edge ?? null});
    // 3. Frenzy's aura is for everyone: the Storyteller's screen draws it too
    const token = scene.tokens.get(ids.th)?.object;
    const aura = canvas.scene?.id === scene.id ? await waitFor(() => token?._wodxLook?.aura && !token._wodxLook.aura.destroyed, 6000) : null;
    G.ok("3. the player's Frenzy aura shows on the Storyteller's screen too", C?.tokenLooks?.looksOf?.(token)?.aura?.color === RED && !!aura,
      {aura: C?.tokenLooks?.looksOf?.(token)?.aura ?? null, viewed: canvas.scene?.id === scene.id});
  } catch (e) { G.R.errors.push(e?.message ?? String(e)); }
  finally {
    game.socket.off(SOCKET, onSocket);
    if ( lookId ) { try { await C?.looks?.end?.(lookId, scene); } catch (e) { G.R.notes.push(`ending the look: ${e?.message ?? e}`); } }
    try { if ( actor ) { await C?.derangements?.end?.(actor); await actor.toggleStatusEffect("wodx-frenzy", {active: false}); } } catch (e) { G.R.notes.push(`ending the bout: ${e?.message ?? e}`); }
    try { await game.users.get(user)?.update({character: keepCharacter}); } catch (e) { G.R.notes.push(`putting the character back: ${e?.message ?? e}`); }
    delete globalThis.wodxGateLooks;
  }
  return G.finish();
}
