/**
 * WoDX Creation gate: ghouled animals, step four (B5130 to B5137), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanimalkeepers.mjs?${Date.now()}`)).run()
 * Works on a scratch scene with scratch vampires, ghouls and a dog. Never moves the clock (long tasks' ends are sent as
 * their hook).
 *   1. a Nosferatu's dog with five points shows the clan's mark on its sheet and token
 *   2. the dog's token shows its blood as the second bar and carries the red eyes' light
 *   3. WoDX Actions knows the dog as its master's own beast (Animalism one easier, shared senses)
 *   4. a Tzimisce's fleshcraft long task remakes a ghoul as a szlachta when it is done
 *   5. an elder's long task grafts fifteen ghouls into a vozhd, and the ghouls are spent
 *   6. a Tzimisce household keeps its beasts: animal ghouls bound to the vampire
 * Result: Data/wodx-gate/gateanimalkeepers-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gateanimalkeepers");
  const C = () => game.modules.get("wodx-creation")?.api;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const extra = [];
  const disc = (name, v) => ({name, type: "Power", system: {type: "wod.types.discipline", value: v, level: v}});
  try {
    const scene = await G.scene();
    const [nos, tz, dog, serf] = await G.make(Actor, [
      {name: "Gate Keepers Nosferatu", type: "Vampire", system: {clan: "custom", custom: {clan: "Nosferatu"}}},
      {name: "Gate Keepers Tzimisce", type: "Vampire", system: {clan: "custom", custom: {clan: "Tzimisce"}}},
      {name: "Gate Keepers Dog", type: "Creature", system: {settings: {variant: "general"}}},
      {name: "Gate Keepers Serf", type: "Mortal"}
    ]);
    await nos.createEmbeddedDocuments("Item", [disc("Animalism", 2)]);
    await tz.createEmbeddedDocuments("Item", [disc("Vicissitude", 5), disc("Animalism", 2)]);
    const [, td] = await G.tokens(scene, [{actor: nos, x: 2, y: 2}, {actor: dog, x: 3, y: 2}]);

    await G.step("1. the clan's mark at five points", async () => {
      await C().giveVitae(dog, nos, {points: 6});
      await wait(() => [...dog.effects].some(e => e.getFlag("wodx-creation", "clanMark")));
      const fx = [...dog.effects].find(e => e.getFlag("wodx-creation", "clanMark"));
      // the dog's token is unlinked, so look at the token's own actor; a status effect is what the token shows
      const tokActor = td.actor ?? td.object?.actor;
      await wait(() => [...(tokActor?.temporaryEffects ?? [])].some(e => e.getFlag?.("wodx-creation", "clanMark")));
      const onToken = [...(tokActor?.temporaryEffects ?? [])].some(e => e.getFlag?.("wodx-creation", "clanMark"));
      G.ok("1. the clan's mark at five points", !!fx?.name?.includes("Hideous") && onToken, {mark: fx?.name, onToken});
    });

    await G.step("2. the blood bar and the red eyes", async () => {
      await wait(() => td.light?.color?.toString?.()?.toLowerCase?.() === "#ff2a2a" || String(td.light?.color ?? "").toLowerCase() === "#ff2a2a");
      const bar = td.bar2?.attribute, color = String(td.light?.color ?? "").toLowerCase();
      G.ok("2. the blood bar and the red eyes", bar === "advantages.bloodpool" && color === "#ff2a2a" && Number(td.light?.darkness?.min) > 0, {bar, color, darkness: td.light?.darkness});
    });

    await G.step("3. the master's own beast", async () => {
      const own = C().animals.ownBeast(nos, dog), other = C().animals.ownBeast(tz, dog);
      G.ok("3. the master's own beast", own === true && other === false, {own, other});
    });

    await G.step("4. a szlachta by long task", async () => {
      await C().giveVitae(serf, tz, {points: 2});
      const task = await C().animals.craft(tz, "szlachta", serf);
      Hooks.callAll("wodxTaskDone", {actor: tz, task: {...task, status: "done"}});
      // the flag lands first and the flaw after it, so wait for the flaw
      await wait(() => !!serf.getFlag("wodx-creation", "szlachta") && [...serf.items].some(i => /monstrous/i.test(i.name)));
      const str = Number(serf.system.attributes?.strength?.value), monstrous = [...serf.items].some(i => /monstrous/i.test(i.name));
      G.ok("4. a szlachta by long task", !!task && task.opts?.fleshcraft === "szlachta" && !!serf.getFlag("wodx-creation", "szlachta") && str >= 5 && monstrous, {task: task?.name, str, monstrous});
    });

    // fifteen ghouls made before the step, so the step's time is the graft's alone
    const list = await G.make(Actor, Array.from({length: 15}, (_, i) => ({name: `Gate Keepers Ghoul ${i + 1}`, type: "Mortal"})));
    for ( const g of list ) await C().giveVitae(g, tz, {points: 1});

    await G.step("5. a vozhd from fifteen ghouls", async () => {
      const task = await C().animals.craft(tz, "vozhd");
      Hooks.callAll("wodxTaskDone", {actor: tz, task: {...task, status: "done"}});
      // the vozhd is made first and the ghouls are spent into it after, so wait for the last of them
      await wait(() => list.filter(g => g.getFlag("wodx-creation", "grafted")).length >= 15, 20000);
      const v = game.actors.find(a => a.getFlag("wodx-creation", "vozhd")?.by === tz.id);
      if ( v ) extra.push(v);
      const spent = list.filter(g => g.getFlag("wodx-creation", "grafted")).length;
      G.ok("5. a vozhd from fifteen ghouls", !!task && !!v && Number(v.system.attributes?.strength?.value) === 8 && spent >= 14, {task: task?.name, vozhd: v?.name, spent});
    });

    await G.step("6. a household's beasts", async () => {
      const beasts = await C().animals.householdBeasts(tz, {seed: 3, rural: true});
      extra.push(...beasts);
      const bound = beasts.every(b => C().data.lineOf(b) === "ghoul" && C().data.domitorOf(b)?.id === tz.id);
      G.ok("6. a household's beasts", beasts.length >= 1 && bound, {kinds: beasts.map(b => b.name)});
    });
  } finally {
    for ( const a of extra ) { try { await a.delete(); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
