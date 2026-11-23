/**
 * Full check of V20 Dark Ages chapter 8 (B7675-B7678), WoDX Actions and WoDX Combat: Holy Artifacts, ghosts, swarms
 * and the spider. In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedach8.mjs?${Date.now()}`)).run()
 *   1. the Pacifist's Ji (True Faith 3) in a believer's hands: Faith 2 counts as 5; straying, back to 2 (pp. 394-395)
 *   2. the Masked Trickster: a Wraith sheet marked as a Dark Ages ghost, Passion 10, its Disciplines (p. 403)
 *   3. Passion is the ghost's blood: spending a point for a power takes it from Pathos (p. 403)
 *   4. manifesting costs a point of Passion and gives Strength 3 for the turn (p. 403)
 *   5. a rat swarm bites the one inside it (dice forced to tens): three lethal before soak, knocked down and overrun (p. 399)
 *   5b. the card's Dodge button: the one inside dodges at 8, and the next bite (at 4 now) loses the dodge's successes (p. 399)
 *   6. harm to the swarm: a blade does one level; fire does its full six and disperses it (p. 399)
 *   7. a spider on someone who does not notice it (dice forced to ones): a strong poison does two lethal and a die off (pp. 399, 360)
 * Makes its own actors and scene and removes them. Result: Data/wodx-gate/gatedach8-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const filledOf = a => { const h = a?.system?.health?.damage ?? {}; return ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(h[k]) || 0), 0); };

export async function run() {
  const G = gate("gatedach8", {stepTimeout: 90000});
  if ( G.notLive() ) return "gatedach8 never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const WC = game.modules.get("wodx-combat")?.api;
  const dice0 = CONFIG.Dice.randomUniform;
  const force = async face => {
    for ( const u of [0.01, 0.05, 0.5, 0.95, 0.99] ) { CONFIG.Dice.randomUniform = () => u; if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return true; }
    return false;
  };
  const made = [];
  try {
    await waitFor(() => !!A?.makeArtifact && !!A?.ghosts?.make && !!WC?.swarm?.make, 90000);
    const scene = await G.scene({name: "WoDX gate: chapter 8"});

    await G.step("1. a Holy Artifact adds its Faith while the holder keeps to the light", async () => {
      const [b] = await G.make(Actor, [{name: "Gate DA Believer", type: "Mortal"}]);
      await b.update({"system.advantages.faith.permanent": 2});
      const it = await A.makeArtifact(b, {key: "pacifist-ji"});
      const held = A.faithOf(b);
      await b.setFlag("wodx-actions", "artifactStrayed", true);
      const strayed = A.faithOf(b);
      G.ok("1. a Holy Artifact adds its Faith while the holder keeps to the light", !!it && held === 5 && strayed === 2, {item: it?.name, held, strayed});
    });

    let ghost = null;
    await G.step("2. the Masked Trickster, a Dark Ages ghost", async () => {
      ghost = await A.ghosts.make();
      if ( ghost ) made.push(ghost);
      const disc = (ghost?.items ?? []).filter(i => i.system?.type === "wod.types.discipline").map(i => `${i.name} ${i.system.value}`).sort();
      G.ok("2. the Masked Trickster, a Dark Ages ghost", !!ghost && ghost.type === "Wraith" && A.ghosts.blood(ghost).value === 10 && disc.length === 4 && A.getKind(ghost) === "wraith",
        {type: ghost?.type, passion: A.ghosts.blood(ghost)?.value, disc, kind: A.getKind(ghost)});
    });

    await G.step("3. Passion is the ghost's blood", async () => {
      const ch = await A.ghosts.spend(ghost, 1);
      const p = Number(ghost.system?.advantages?.pathos?.temporary);
      G.ok("3. Passion is the ghost's blood", ch?.before === 10 && ch?.after === 9 && p === 9, {ch, pathos: p});
    });

    await G.step("4. manifesting: a point of Passion, Strength 3 for the turn", async () => {
      await A.ghosts.manifest(ghost);
      await waitFor(() => ghost.effects.some(e => e.flags?.["wodx-actions"]?.ghostManifest), 15000).catch(() => null);
      const str = Number(ghost.system?.attributes?.strength?.value);
      G.ok("4. manifesting: a point of Passion, Strength 3 for the turn", Number(ghost.system?.advantages?.pathos?.temporary) === 8 && str === 3,
        {pathos: ghost.system?.advantages?.pathos?.temporary, strength: str, effects: ghost.effects.map(e => e.name)});
    });

    let swarmTok = null, victim = null, vTok = null;
    await G.step("5. a rat swarm overruns the one inside it", async () => {
      const sw = await WC.swarm.make("rats");
      if ( sw ) made.push(sw);
      await waitFor(() => !!scene.tokens.find(t => t.actorId === sw?.id), 15000).catch(() => null);
      swarmTok = scene.tokens.find(t => t.actorId === sw?.id);
      await swarmTok?.update({x: 400, y: 400, width: 2, height: 2});
      [victim] = await G.make(Actor, [{name: "Gate DA Swarmed", type: "Mortal"}]);
      [vTok] = await G.tokens(scene, [{actor: victim, x: 4, y: 4}]);
      await waitFor(() => !!swarmTok?.object && !!vTok?.object, 15000).catch(() => null);
      const inside = WC.swarm.victimsOf(swarmTok.object).map(t => t.id);
      const f0 = filledOf(vTok.actor ?? victim);
      const va = () => scene.tokens.get(vTok.id)?.actor ?? victim;
      const forced = await force(10);
      try { await WC.swarm.turn(swarmTok.object); } finally { CONFIG.Dice.randomUniform = dice0; }
      await waitFor(() => filledOf(va()) > f0, 20000).catch(() => null);
      const over = va().getFlag("wodx-combat", "swarmOverrun");
      G.ok("5. a rat swarm overruns the one inside it", forced && inside.includes(vTok.id) && filledOf(va()) - f0 === 3 && !!over,
        {forced, inside, harm: filledOf(va()) - f0, overrun: over, statuses: [...(va().statuses ?? [])]});
    });

    await G.step("5b. dodging the swarm from its card takes the dodge's successes off the next bite", async () => {
      const va = () => scene.tokens.get(vTok.id)?.actor ?? victim;
      const card = [...game.messages.contents].reverse().find(m => /data-wodx-swarm-dodge/.test(m.content ?? ""));
      vTok.object?.control?.({releaseOthers: true});
      ui.chat?.render?.(true);
      await waitFor(() => !!document.querySelector(`[data-message-id="${card?.id}"] [data-wodx-swarm-dodge]`), 15000).catch(() => null);
      const btn = document.querySelector(`[data-message-id="${card?.id}"] [data-wodx-swarm-dodge]`);
      const dice = Number(va().system?.attributes?.dexterity?.value) + Number(va().system?.abilities?.athletics?.value || 0);
      const forced = await force(10);
      let dodged = null, before = 0, harm = -1;
      try {
        btn?.click();
        await waitFor(() => !!va().getFlag("wodx-combat", "swarmDodge"), 20000).catch(() => null);
        dodged = va().getFlag("wodx-combat", "swarmDodge");
        before = filledOf(va());
        await WC.swarm.turn(swarmTok.object);
        await waitFor(() => filledOf(va()) !== before, 20000).catch(() => null);
        harm = filledOf(va()) - before;
      } finally { CONFIG.Dice.randomUniform = dice0; vTok.object?.release?.(); }
      // three dice at 4 forced to tens: three successes, less the dodge's
      const want = Math.max(0, 3 - Number(dodged?.successes));
      G.ok("5b. dodging the swarm from its card takes the dodge's successes off the next bite", forced && !!btn && Number(dodged?.successes) === dice && harm === want,
        {button: !!btn, dice, dodged, harm, want});
    });

    await G.step("6. harm to the swarm: a blade does one, fire disperses it", async () => {
      const sa = () => scene.tokens.get(swarmTok.id)?.actor;
      await WC.soakAndApply(swarmTok.object ?? swarmTok, {mode: "levels", amount: 4, type: "lethal", soak: true, apply: true});
      await waitFor(() => Number(sa()?.flags?.["wodx-combat"]?.swarm?.harm) === 1, 15000).catch(() => null);
      const blade = Number(sa()?.flags?.["wodx-combat"]?.swarm?.harm);
      await WC.soakAndApply(swarmTok.object ?? swarmTok, {mode: "levels", amount: 6, type: "aggravated", fireSun: true, of: "fire", soak: true, apply: true});
      await waitFor(() => Number(sa()?.flags?.["wodx-combat"]?.swarm?.harm) === 7, 15000).catch(() => null);
      const fire = Number(sa()?.flags?.["wodx-combat"]?.swarm?.harm);
      await waitFor(() => scene.tokens.get(swarmTok.id)?.hidden === true, 10000).catch(() => null);
      G.ok("6. harm to the swarm: a blade does one, fire disperses it", blade === 1 && fire === 7 && scene.tokens.get(swarmTok.id)?.hidden === true,
        {blade, fire, hidden: scene.tokens.get(swarmTok.id)?.hidden});
    });

    await G.step("7. an unnoticed spider's strong poison", async () => {
      const [s] = await G.make(Actor, [{name: "Gate DA Bitten", type: "Mortal"}]);
      const [st] = await G.tokens(scene, [{actor: s, x: 10, y: 10}]);
      await waitFor(() => !!st?.object, 10000).catch(() => null);
      const sa = () => scene.tokens.get(st.id)?.actor ?? s;
      const forced = await force(1);
      let bite = null;
      try { bite = await WC.swarm.spider(st.object, {venom: "strong"}); } finally { CONFIG.Dice.randomUniform = dice0; }
      await waitFor(() => filledOf(sa()) === 2, 20000).catch(() => null);
      const pen = sa().effects.some(e => /Poisoned/.test(e.name));
      G.ok("7. an unnoticed spider's strong poison", forced && bite?.bitten && filledOf(sa()) === 2 && pen, {forced, bite, filled: filledOf(sa()), penalty: pen});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
    for ( const m of made ) await m.delete?.().catch(() => null);
  }
  return G.finish();
}
