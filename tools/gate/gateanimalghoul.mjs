/**
 * WoDX Creation gate: ghouled animals (B5040 to B5049), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanimalghoul.mjs?${Date.now()}`)).run()
 * Works on a scratch scene with a scratch vampire, a Creature horse and a Mortal-sheet cat. Never moves the clock.
 *   1. the horse drinks: it becomes a ghoul with Potence 1 and a blood pool of 14, and keeps its Creature variant
 *   2. its sheet opens with the blood pool showing
 *   3. it may raise only Celerity, Fortitude and Potence, and has no Social Attributes to buy
 *   4. the token menu offers Feed vitae on the horse next to the vampire
 *   5. feeding from the menu tops the horse up and shows the drink on the map
 *   6. a cat on a Mortal sheet (NPC template cat) holds 3
 * Result: Data/wodx-gate/gateanimalghoul-result.json.
 */
import {gate} from "./kit.mjs";

export async function run() {
  const G = gate("gateanimalghoul");
  const C = () => game.modules.get("wodx-creation")?.api;
  const wait = async (f, ms = 6000) => { for ( let t = 0; t < ms && !f(); t += 100 ) await new Promise(r => setTimeout(r, 100)); return f(); };
  try {
    const scene = await G.scene();
    const [vamp, horse, cat] = await G.make(Actor, [
      {name: "Gate Animal Ghoul Domitor", type: "Vampire"},
      {name: "Gate Animal Ghoul Warhorse", type: "Creature", system: {settings: {variant: "general"}}},
      {name: "Gate Animal Ghoul Mouser", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "cat"}}}}
    ]);
    const [tv, th] = await G.tokens(scene, [{actor: vamp, x: 2, y: 2}, {actor: horse, x: 3, y: 2}]);

    await G.step("1. the horse drinks", async () => {
      const r = await C().giveVitae(horse, vamp, {points: 20});
      const pool = horse.system.advantages?.bloodpool ?? {};
      const disc = C().data.disciplinesOf(horse).map(d => `${d.name} ${d.value}`);
      G.ok("1. the horse drinks", r?.becameGhoul && C().data.lineOf(horse) === "ghoul" && Number(pool.max) === 14 && Number(pool.temporary) === 14
        && disc.includes("Potence 1") && horse.system.settings.variant === "general", {pool, disc, variant: horse.system.settings.variant});
    });

    await G.step("2. the sheet shows the blood pool", async () => {
      const sheet = horse.sheet;
      await sheet.render(true);
      await wait(() => sheet.rendered);
      const el = sheet.element instanceof HTMLElement ? sheet.element : sheet.element?.[0];
      const text = el?.textContent ?? "";
      const shown = horse.system.settings.hasbloodpool === true && /blood/i.test(text);
      await sheet.close();
      G.ok("2. the sheet shows the blood pool", shown, {hasbloodpool: horse.system.settings.hasbloodpool});
    });

    await G.step("3. only the physical Disciplines", async () => {
      const opts = C().data.purchaseOptions(horse);
      const social = opts.some(o => o.kind === "attribute" && ["charisma", "manipulation", "appearance"].includes(o.key));
      const obt = C().data.newDisciplineOption(horse, "Dominate")?.reason ?? "";
      const cel = C().data.newDisciplineOption(horse, "Celerity")?.reason ?? "";
      G.ok("3. only the physical Disciplines", !social && /only learn Celerity/.test(obt) && !/only learn/.test(cel), {social, obt, cel});
    });

    await G.step("4. Feed vitae on the token menu", async () => {
      const hud = canvas.hud.token;
      await hud.bind(th.object);
      await wait(() => hud.rendered);
      const el = hud.element instanceof HTMLElement ? hud.element : hud.element?.[0];
      const btn = el?.querySelector(".wodx-feed-vitae");
      await hud.close?.();
      G.ok("4. Feed vitae on the token menu", !!btn, {found: !!btn});
    });

    await G.step("5. feeding from the menu tops it up and shows it", async () => {
      await horse.update({"system.advantages.bloodpool.temporary": 5});
      let shown = false;
      const orig = canvas.interface.createScrollingText.bind(canvas.interface);
      canvas.interface.createScrollingText = (o, t, opt) => { if ( t === "Vitae" ) shown = true; return orig(o, t, opt); };
      try { await C().animals.feed(th.object, tv.object, 2); } finally { canvas.interface.createScrollingText = orig; }
      const t = Number(horse.system.advantages.bloodpool.temporary);
      G.ok("5. feeding from the menu tops it up and shows it", t === 7 && shown, {temporary: t, shown});
    });

    await G.step("6. a cat on a Mortal sheet holds 3", async () => {
      await C().giveVitae(cat, vamp, {points: 9});
      const pool = cat.system.advantages?.bloodpool ?? {};
      G.ok("6. a cat on a Mortal sheet holds 3", C().data.lineOf(cat) === "ghoul" && Number(pool.max) === 3 && Number(pool.temporary) === 3, {pool});
    });
  } finally {
    return G.finish();
  }
}
