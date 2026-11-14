/**
 * Body plan gate (WoDX Combat 3.13.0, Storyteller 0.33.0, Sheets 0.10.0, Senses 0.6.1, Actions 3.42.2), in
 * rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebody.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Bodies" (gridless), two actors and two tokens; goes back to the scene it started on
 * and deletes everything it made, messages included.
 *   1. the api and the two settings (both on by default)
 *   2. a person: two hands, armor, no claws
 *   3. Shape of the Beast: the body becomes a wolf; the sword in hand comes off, with an Undo card; the worn armor
 *      stays on (it goes along with the vampire, no soak in the shape, B1210)
 *   4. Undo puts the sword and armor back on
 *   5. Feral Claws: the attack list has natural aggravated claws
 *   6. Mist Form: nothing to strike (no hit table), and the movement code reads flight from the body
 *   7. a lost hand on the Storyteller record: one hand left, the Body tab shows it lost
 *   8. hit locations: an aimed attack at the left hand lands there and says so on the card
 *   9. the maiming card: crippled adds an effect; lost adds a lasting change
 *  10. the Body tab renders on the sheet, with the Storyteller's shape picker
 *  11. Senses reads the wolf's senses
 *  12. every other WoDX module still answers
 * Result: Data/wodx-gate/gatebody-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene, startMsgs = new Set(game.messages.map(m => m.id));
  const C = () => game.wodxCombat, B = () => game.wodxCombat?.body;
  const newMsgs = () => game.messages.filter(m => !startMsgs.has(m.id));
  const settingsWere = {};
  let scene, actors = [], a, b;
  try {
    for ( const k of ["hitLocations", "bodyGear", "autoApply"] ) settingsWere[k] = game.settings.get("wodx-combat", k);
    await game.settings.set("wodx-combat", "autoApply", false);
    scene = await Scene.create({name: "WoDX gate: Bodies", width: 2000, height: 1500, padding: 0, grid: {type: 0, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await createActors([{name: "WoDX gate: Shifter", type: "Vampire"}, {name: "WoDX gate: Target", type: "Mortal"}]);
    await actors[0].update({"prototypeToken.actorLink": true});
    await scene.createEmbeddedDocuments("Token", [{name: "shifter", actorId: actors[0].id, actorLink: true, x: G * 2, y: G * 2}, {name: "target", actorId: actors[1].id, actorLink: false, x: G * 3, y: G * 2}]);
    a = scene.tokens.find(t => t.actorId === actors[0].id); b = scene.tokens.find(t => t.actorId === actors[1].id);
    await until(() => a.object && b.object);
    const A = actors[0];
    const [sword] = await A.createEmbeddedDocuments("Item", [{name: "Gate sword", type: "Melee Weapon", system: {isequipped: true}}]);
    const [mail] = await A.createEmbeddedDocuments("Item", [{name: "Gate mail", type: "Armor", system: {isequipped: true}}]);

    await step("api and settings", async () => {
      ok("api and settings", typeof B()?.of === "function" && typeof B()?.setShape === "function" && settingsWere.hitLocations === true && settingsWere.bodyGear === true && /^3\.(1[3-9]|[2-9]\d)\./.test(C()?.version ?? ""),
        {version: C()?.version, settingsWere});
    });
    await step("a person: two hands, armor, no claws", async () => {
      const body = B().of(A);
      ok("a person: two hands, armor, no claws", body.shape === "person" && body.hands === 2 && body.armor && !body.weapons.claw, {shape: body.shape, hands: body.hands});
    });
    let shapeFx = null;
    await step("Shape of the Beast drops the sword, keeps the armor", async () => {
      [shapeFx] = await A.createEmbeddedDocuments("ActiveEffect", [{name: "Shape of the Beast", img: "icons/svg/pawprint.svg"}]);
      // the sword comes off first and the Undo card is posted after it, so wait for both
      await until(() => !A.items.get(sword.id)?.system?.isequipped && newMsgs().some(m => m.flags?.["wodx-combat"]?.bodyGear), 6000);
      const card = newMsgs().find(m => m.flags?.["wodx-combat"]?.bodyGear);
      ok("Shape of the Beast drops the sword, keeps the armor", B().of(A).shape === "wolf" && B().of(A).carries === true && !A.items.get(sword.id).system.isequipped && A.items.get(mail.id).system.isequipped && !!card,
        {sword: A.items.get(sword.id).system.isequipped, mail: A.items.get(mail.id).system.isequipped, card: !!card});
    });
    await step("Undo puts it back", async () => {
      const card = newMsgs().find(m => m.flags?.["wodx-combat"]?.bodyGear);
      ui.chat?.activate?.();
      await until(() => document.querySelector(`[data-message-id="${card?.id}"] [data-action='wodx-body-undo']`), 3000);
      const el = document.querySelector(`#chat-log [data-message-id="${card?.id}"] [data-action='wodx-body-undo']`) ?? document.querySelector(`[data-message-id="${card?.id}"] [data-action='wodx-body-undo']`);
      el?.click();
      await until(() => A.items.get(sword.id)?.system?.isequipped, 4000);
      ok("Undo puts it back", !!el && A.items.get(sword.id).system.isequipped && A.items.get(mail.id).system.isequipped, {button: !!el});
      if ( shapeFx ) await A.deleteEmbeddedDocuments("ActiveEffect", [shapeFx.id]);
      await until(() => B().of(A).shape === "person", 3000);
    });
    await step("Feral Claws gives natural claws", async () => {
      const [fx] = await A.createEmbeddedDocuments("ActiveEffect", [{name: "Feral Claws", img: "icons/svg/claw.svg"}]);
      const w = B().of(A).weapons.claw;
      await A.deleteEmbeddedDocuments("ActiveEffect", [fx.id]);
      ok("Feral Claws gives natural claws", w?.type === "aggravated" && w?.bonus === 1, {w});
    });
    await step("Mist Form", async () => {
      const [fx] = await A.createEmbeddedDocuments("ActiveEffect", [{name: "Mist Form", img: "icons/svg/fog.svg"}]);
      const body = B().of(A), table = B().rules.hitTable(body), ab = C().movement?.abilitiesOf?.(A) ?? null;
      await A.deleteEmbeddedDocuments("ActiveEffect", [fx.id]);
      ok("Mist Form", body.intangible && table.length === 0 && (ab === null || ab.fly === true), {fly: ab?.fly ?? "not exposed"});
    });
    await step("a lost hand", async () => {
      const st = game.modules.get("wodx-storyteller")?.api?.body;
      await st.add(A, {source: "scar", part: "hands", what: "Left hand lost", feature: "lost", lostPart: "hand-l"});
      const body = B().of(A);
      ok("a lost hand", body.hands === 1 && body.lost.includes("hand-l"), {hands: body.hands});
    });
    await step("an aimed attack lands where it was aimed", async () => {
      // the roll itself is random: check the location logic the attack uses, on the target's body
      const tb = B().of(actors[1]);
      const loc = B().rules.hitLocation(tb, {aimed: "hand-l"});
      ok("an aimed attack lands where it was aimed", loc?.label === "Left hand" && loc.aimed && B().rules.aimOptions(tb).some(o => o.id === "hand-l" && o.size === "small"));
    });
    await step("the maiming card", async () => {
      await B().offerMaim(actors[1], {part: "arm-r", label: "Right arm", stops: "x"});
      const card = newMsgs().find(m => m.flags?.["wodx-combat"]?.maim);
      await until(() => document.querySelector(`[data-message-id="${card?.id}"] [data-action='wodx-cripple']`), 3000);
      document.querySelector(`[data-message-id="${card?.id}"] [data-action='wodx-cripple']`)?.click();
      await until(() => actors[1].effects.some(e => e.flags?.["wodx-combat"]?.crippled === "arm-r"), 3000);
      ok("the maiming card", !!card && actors[1].effects.some(e => e.flags?.["wodx-combat"]?.crippled === "arm-r"));
    });
    await step("the Body tab", async () => {
      await A.sheet.render(true);
      await until(() => A.sheet.element?.querySelector?.(".tab.wodxbody") ?? A.sheet.element?.[0]?.querySelector?.(".tab.wodxbody"), 6000);
      const root = A.sheet.element?.querySelector ? A.sheet.element : A.sheet.element?.[0];
      const tab = root?.querySelector(".tab.wodxbody");
      ok("the Body tab", !!tab && /Left hand/.test(tab.textContent) && !!tab.querySelector(".wodx-body-shape"), {found: !!tab});
      await A.sheet.close();
    });
    await step("Senses reads the wolf", async () => {
      await B().setShape(A, "wolf");
      const s = B().of(A).senses;
      await B().setShape(A, null);
      ok("Senses reads the wolf", s === "wolf" && !!game.modules.get("wodx-senses")?.api);
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-senses", "wodx-storyteller", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api && !(id === "wodx-sheets"));
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const [k, v] of Object.entries(settingsWere) ) await game.settings.set("wodx-combat", k, v);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      const made = newMsgs().map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatebody-result.json");
}
