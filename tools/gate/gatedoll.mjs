/**
 * Damage doll gate (WoDX Combat 3.22.0, Sheets 0.16.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedoll.mjs?${Date.now()}`)).run()
 * Makes one mortal "WoDX gate: Doll" and its own chat cards; deletes all of it at the end and puts the settings back.
 *   1. the api: wound notes in Combat, the doll in Sheets
 *   2. a Mokole in Lupus has a body (3.21.0 threw), drawn as a crocodile
 *   3. Apply on an attack card notes the part the blow landed on, one note per level
 *   4. Undo on the card takes the damage and its notes back
 *   5. healing a level drops the oldest note of that kind
 *   6. damage with no place shows on the torso
 *   7. the Storyteller places a level on a part and clears it
 *   8. a shape without the part: a left arm wound shows on the left fore leg of a wolf
 *   9. the Body tab draws the doll (pixels on the canvas) and names a part under the pointer
 *  10. a false limb: a lost left leg with a false one is drawn again, in the era's material
 *  11. every other WoDX module still answers
 * Result: Data/wodx-gate/gatedoll-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const verAtLeast = (v, want) => { const a = String(v ?? "0").split(".").map(Number), b = want.split(".").map(Number); for ( let i = 0; i < 3; i++ ) { if ( (a[i] ?? 0) !== b[i] ) return (a[i] ?? 0) > b[i]; } return true; };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const startMsgs = new Set(game.messages.map(m => m.id));
  const C = () => game.wodxCombat, B = () => game.wodxCombat?.body;
  const newMsgs = () => game.messages.filter(m => !startMsgs.has(m.id));
  const settingsWere = {};
  let A = null;
  const notes = () => A.flags?.["wodx-combat"]?.wounds ?? [];
  const track = () => B().track(A);
  const card = async (type, levels, part) => ChatMessage.create({speaker: {alias: "WoDX gate"},
    content: `<div class="vtc-card"><p>Gate blow</p><div class="vtc-pending"><button type="button" class="vtc-apply">Apply</button></div></div>`,
    flags: {"wodx-combat": {data: {attacker: null, target: A.uuid, targetToken: null, type, levels, applied: false, location: {id: part, label: part}}}}});
  const press = async (msg, sel) => { await until(() => document.querySelector(`#chat-log [data-message-id="${msg.id}"] ${sel}`) ?? document.querySelector(`[data-message-id="${msg.id}"] ${sel}`), 4000);
    const el = document.querySelector(`#chat-log [data-message-id="${msg.id}"] ${sel}`) ?? document.querySelector(`[data-message-id="${msg.id}"] ${sel}`); el?.click(); return !!el; };
  try {
    for ( const k of ["hitLocations", "autoApply"] ) settingsWere[k] = game.settings.get("wodx-combat", k);
    await game.settings.set("wodx-combat", "autoApply", false);
    [A] = await Actor.create([{name: "WoDX gate: Doll", type: "Mortal"}]);

    await step("the api", async () => {
      const sv = game.modules.get("wodx-sheets")?.version;
      ok("the api", verAtLeast(C()?.version, "3.22.0") && verAtLeast(sv, "0.16.0") && ["wounds", "placeWound", "clearWound", "recordWound", "undoWound", "track"].every(k => typeof B()?.[k] === "function"),
        {combat: C()?.version, sheets: sv});
    });
    await step("a Mokole in Lupus has a body", async () => {
      const b = B().rules.bodyOf({shifter: true, garouForm: "lupus", feraKey: "Mokole"});
      ok("a Mokole in Lupus has a body", b.shape === "lupus" && b.animal === "croc" && b.parts.length > 5, {shape: b.shape, animal: b.animal});
    });
    let first = null;
    await step("Apply notes where it landed", async () => {
      first = await card("lethal", 2, "arm-l");
      const pressed = await press(first, "button.vtc-apply");
      await until(() => notes().length === 2, 5000);
      ok("Apply notes where it landed", pressed && track().lethal === 2 && notes().length === 2 && notes().every(w => w.part === "arm-l" && w.msg === first.id),
        {pressed, track: track(), notes: notes().length});
    });
    await step("Undo takes damage and notes back", async () => {
      const pressed = await press(first, ".vtc-undo");
      await until(() => !notes().length && track().lethal === 0, 5000);
      ok("Undo takes damage and notes back", pressed && !notes().length && track().lethal === 0, {pressed, track: track(), notes: notes().length});
    });
    await step("healing drops the oldest note", async () => {
      const m1 = await card("lethal", 1, "head"); await press(m1, "button.vtc-apply"); await until(() => notes().length === 1, 4000);
      const m2 = await card("lethal", 1, "leg-r"); await press(m2, "button.vtc-apply"); await until(() => notes().length === 2, 4000);
      await C().healDamage(A, "lethal", 1);
      await until(() => notes().length === 1, 4000);
      ok("healing drops the oldest note", track().lethal === 1 && notes().length === 1 && notes()[0].part === "leg-r", {notes: notes().map(w => w.part)});
    });
    await step("damage with no place shows on the torso", async () => {
      await C().applyDamage(A, "bashing", 2);
      const map = B().wounds(A);
      ok("damage with no place shows on the torso", map.body?.b === 2 && map["leg-r"]?.l === 1, {map});
    });
    await step("the Storyteller places and clears", async () => {
      const placed = await B().placeWound(A, "head", "bashing");
      const a = B().wounds(A).head?.b;
      await B().clearWound(A, "head");
      const b = B().wounds(A).head?.b, torso = B().wounds(A).body?.b;
      ok("the Storyteller places and clears", placed === true && a === 1 && !b && torso === 2, {a, b, torso});
    });
    await step("a wolf shows the arm on the fore leg", async () => {
      const m = await card("lethal", 1, "arm-l"); await press(m, "button.vtc-apply"); await until(() => notes().length === 2, 4000);
      await B().setShape(A, "wolf");
      const map = B().wounds(A);
      await B().setShape(A, null);
      ok("a wolf shows the arm on the fore leg", map["leg-lf"]?.l === 1 && !map["arm-l"], {map});
    });
    await step("the Body tab draws the doll", async () => {
      await A.sheet.render(true);
      const root = () => A.sheet.element?.querySelector ? A.sheet.element : A.sheet.element?.[0];
      await until(() => root()?.querySelector?.(".tab.wodxbody canvas.wodx-doll[data-drawn]"), 8000);
      const cv = root()?.querySelector(".tab.wodxbody canvas.wodx-doll");
      let lit = 0;
      if ( cv ) { const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; for ( let i = 3; i < d.length; i += 4 ) if ( d[i] ) lit++; }
      // name a part: point at the middle of the torso
      root()?.querySelector(".tab.wodxbody")?.classList.add("active");
      const r = cv?.getBoundingClientRect(), tip = root()?.querySelector(".wodx-doll-tip");
      if ( r?.width ) cv.dispatchEvent(new PointerEvent("pointermove", {clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.36, bubbles: true}));
      const named = tip?.textContent ?? "";
      ok("the Body tab draws the doll", !!cv && lit > 300 && (!r?.width || /Body/.test(named)) && /lethal/.test(root()?.querySelector(".wodx-doll-wounds")?.textContent ?? ""),
        {canvas: !!cv, lit, named, sized: !!r?.width});
      await A.sheet.close();
    });
    await step("a false limb is drawn in the era's material", async () => {
      const st = game.modules.get("wodx-storyteller")?.api?.body;
      await st.add(A, {source: "scar", part: "legs", what: "Left leg lost", feature: "lost", lostPart: "leg-l"});
      await st.add(A, {source: "scar", part: "legs", what: "A wooden leg", feature: "prosthetic", lostPart: "leg-l"});
      await A.sheet.render(true);
      const root = () => A.sheet.element?.querySelector ? A.sheet.element : A.sheet.element?.[0];
      await until(() => root()?.querySelector?.(".tab.wodxbody canvas.wodx-doll"), 8000);
      const spec = JSON.parse(root()?.querySelector(".tab.wodxbody canvas.wodx-doll")?.dataset.spec ?? "{}");
      await A.sheet.close();
      ok("a false limb is drawn in the era's material", ["wood", "steel", "chrome"].includes(spec.fakes?.["leg-l"]) && spec.parts?.includes("leg-l") && !spec.lost?.includes("leg-l"), {fakes: spec.fakes});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-senses", "wodx-storyteller", "wodx-sheets"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api && id !== "wodx-sheets");
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const [k, v] of Object.entries(settingsWere) ) await game.settings.set("wodx-combat", k, v);
      if ( A ) { await A.sheet?.close?.(); await game.actors.get(A.id)?.delete(); }
      const made = newMsgs().map(m => m.id);
      if ( made.length ) await ChatMessage.deleteDocuments(made);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatedoll-result.json");
}
