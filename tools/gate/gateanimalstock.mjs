/**
 * WoDX Creation gate: ghouled animals, step three (B5058 to B5064), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanimalstock.mjs?${Date.now()}`)).run()
 * Works on a scratch scene with a scratch vampire, a trainer with Animal Ken, a Creature horse and a Creature dog.
 * Never moves the clock (the long task's end is sent as its hook).
 *   1. training bought for the horse gives it the bracket traits and marks it trained, and war comes next
 *   2. the token menu offers Train on the dog next to the trainer
 *   3. training as a long task: the task lands on the trainer, and when it is done the dog is trained and shows it
 *   4. a Retainers dot made into a beast: book traits and breed, full pool, the full oath, Fortitude for the second dot
 *   5. the wizard's Backgrounds page offers animal retainers, and the breed list follows the kind picked
 *   6. an untrained animal follower refuses an order it was not trained for (WoDX NPC)
 * Result: Data/wodx-gate/gateanimalstock-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gateanimalstock");
  const C = () => game.modules.get("wodx-creation")?.api;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  const extra = [];
  try {
    const scene = await G.scene();
    const [vamp, trainer, horse, dog] = await G.make(Actor, [
      {name: "Gate Animal Stock Domitor", type: "Vampire"},
      {name: "Gate Animal Stock Trainer", type: "Mortal"},
      {name: "Gate Animal Stock Courser", type: "Creature", system: {settings: {variant: "general"}}},
      {name: "Gate Animal Stock Hound", type: "Creature", system: {settings: {variant: "general"}}}
    ]);
    await trainer.update({"system.abilities.animalken.value": 3, "system.abilities.animalken.isvisible": true});
    const [, tt, , td] = await G.tokens(scene, [{actor: vamp, x: 2, y: 2}, {actor: trainer, x: 5, y: 5}, {actor: horse, x: 3, y: 2}, {actor: dog, x: 6, y: 5}]);
    await C().giveVitae(horse, vamp, {points: 3});
    await C().giveVitae(dog, vamp, {points: 3});
    await dog.update({"flags.wodx-creation.animal.training": "untrained"});

    await G.step("1. training bought with experience", async () => {
      const opt = C().data.trainingOption(horse, 99);
      await C().data.applyPurchase(horse, opt);
      const brawl = Number(horse.system.abilities?.brawl?.value);
      const next = C().data.trainingOption(horse, 99)?.key;
      G.ok("1. training bought with experience", opt?.key === "trained" && opt.cost === 5 && C().animals.training(horse) === "trained" && brawl === 3 && next === "war",
        {opt: opt?.key, cost: opt?.cost, brawl, next});
    });

    await G.step("2. Train on the token menu", async () => {
      const hud = canvas.hud.token;
      await hud.bind(td.object);
      await wait(() => hud.rendered);
      const el = hud.element instanceof HTMLElement ? hud.element : hud.element?.[0];
      const btn = el?.querySelector(".wodx-train-animal");
      await hud.close?.();
      G.ok("2. Train on the token menu", !!btn, {found: !!btn});
    });

    await G.step("3. training as a long task", async () => {
      const ST = game.modules.get("wodx-storyteller")?.api;
      const task = await C().animals.train(dog, trainer);
      const onSheet = ST?.tasks?.of?.(trainer)?.find(t => t.id === task?.id);
      let shown = false;
      const orig = canvas.interface.createScrollingText.bind(canvas.interface);
      canvas.interface.createScrollingText = (o, t, opt) => { if ( t === "Trained" ) shown = true; return orig(o, t, opt); };
      try {
        Hooks.callAll("wodxTaskDone", {actor: trainer, task: {...onSheet, status: "done"}});
        await wait(() => C().animals.training(dog) === "trained", 5000);
      } finally { canvas.interface.createScrollingText = orig; }
      G.ok("3. training as a long task", !!onSheet && onSheet.ability === "animalken" && onSheet.opts?.animalTraining === "trained" && C().animals.training(dog) === "trained" && shown,
        {task: onSheet?.name, ability: onSheet?.ability, training: C().animals.training(dog), shown});
    });

    await G.step("4. a Retainers dot made into a beast", async () => {
      await vamp.createEmbeddedDocuments("Item", [{name: "Retainers", type: "Feature", system: {type: "wod.types.background", value: 3, level: "3"}}]);
      const beast = await C().animals.makeBeast(vamp, {kind: "guard-dog", breed: "mastiff", training: "trained", dots: 2});
      if ( beast ) extra.push(beast);
      const disc = C().data.disciplinesOf(beast).map(d => `${d.name} ${d.value}`).sort();
      const pool = beast.system.advantages?.bloodpool ?? {};
      const bond = beast.flags?.["wodx-creation"]?.lineage?.bonds?.[vamp.id]?.drinks;
      G.ok("4. a Retainers dot made into a beast", Number(beast.system.attributes?.strength?.value) === 4 && Number(pool.max) === 6 && Number(pool.temporary) === 6
        && bond === 3 && disc.join() === "Fortitude 1,Potence 1" && C().animals.dotsLeft(vamp) === 1,
        {str: beast.system.attributes?.strength?.value, pool, bond, disc, left: C().animals.dotsLeft(vamp)});
    });

    await G.step("5. the wizard offers animal retainers", async () => {
      const app = C().wizard ? await C().wizard(vamp, "backgrounds") : null;
      let html = null, filtered = false;
      if ( app ) {
        await wait(() => app.rendered && !!app.element.querySelector(".wodx-wz-animal"));
        const box = app.element.querySelector(".wodx-wz-animal");
        html = !!box;
        if ( box ) {
          const kind = box.querySelector("[name=animal-kind]");
          kind.value = "horse"; kind.dispatchEvent(new Event("change"));
          const visible = [...box.querySelectorAll("[name=animal-breed] option")].filter(o => o.value && !o.hidden).map(o => o.dataset.kind);
          filtered = visible.length > 0 && visible.every(k => k === "horse");
        }
        await app.close();
      }
      G.ok("5. the wizard offers animal retainers", html && filtered, {opened: !!app, panel: html, filtered});
    });

    await G.step("6. an untrained follower refuses an untrained order", async () => {
      const N = game.modules.get("wodx-npc")?.api;
      const pup = await G.make(Actor, {name: "Gate Animal Stock Pup", type: "Creature", system: {settings: {variant: "general"}},
        flags: {"wodx-creation": {animal: {kind: "stray-dog", training: "untrained"}}, "wodx-npc": {serves: [vamp.id]}}});
      const [tp] = await G.tokens(scene, [{actor: pup, x: 8, y: 2}]);
      const was = game.settings.get("wodx-npc", "followerOrders");
      if ( !was ) await game.settings.set("wodx-npc", "followerOrders", true);
      let res;
      try { res = await N.orders.give({sceneId: scene.id, tokenId: tp.id, kind: "guard", leader: vamp.id}); }
      finally { if ( !was ) await game.settings.set("wodx-npc", "followerOrders", false); }
      G.ok("6. an untrained follower refuses an untrained order", res && res.ok === false && /untrained/i.test(res.why ?? ""), {res});
    });
  } finally {
    for ( const a of extra ) { try { await a.delete(); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
