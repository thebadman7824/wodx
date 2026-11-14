/**
 * Trait effects gate (WoDX Chronicle 0.18.0, WoDX Actions 3.29.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetraits.mjs?${Date.now()}`)).run()
 * Makes a mortal, a Kindred, a Garou and a mage, as player-owned and as NPC copies, gives them merits and flaws,
 * reads what WoDX does with each, then deletes what it made.
 *   1. both apis are there and the world setting "Merits and flaws on rolls" is on
 *   2. each kind is read as Combat names it (mortal, kindred, lupine, mage)
 *   3. Iron Will on a mortal NPC: Dominate +3, Thaumaturgy +5 with Magic Resistance, Presence nothing
 *   4. Cast No Reflection on the mortal does nothing, with the reason; on the Kindred it is held
 *   5. Natural Leader gives +2 dice on Leadership; Acute Sense (Hearing) -2 on hearing, nothing on sight
 *   6. Eerie Presence on the Kindred: +2 difficulty against the mortal, nothing against the Garou
 *   7. Short Fuse on the Garou: +2 difficulty on frenzy
 *   8. player character and NPC copies give the same answers
 *   9. the item flag overrides the name, and "none" leaves a trait alone
 *  10. "Only when": merit, flaw, background >= n, and a trait the kind cannot hold fails
 *  11. the tick boxes show only for a character with a trait that needs one
 *  12. the Trait effects window opens and closes
 *  13. every other WoDX module still answers
 *  14. WoDX Senses reads the senses: Bad Sight +2 on sight, Acute Sense (Smell) -2 on smell, Deaf takes hearing, Medium opens the restless dead
 *  16. a Discipline's keywords reach the effects card (Actions 3.33.0): the setting is there, and a sensing power plans a Sense on the user
 *  17. a first meeting: the Kindred's Eerie Presence chills a mortal NPC one step, not a Kindred one; WoDX NPC's seed takes it
 *  18. Lucky counts three rerolls a story on the actor; Efficient Digestion, Thin Blood and Deep Sleeper read from the sheet
 *  15. signs others sense: the Kindred gives off Eerie Presence and Cast No Reflection, the mortal nothing; a Veil keeps its difficulty for Senses
 *  24. the no-effect audit (B3780-B3782): Introspection offers its own tick box and adds 2 dice only on a ticked Perception
 *      roll, Combat Novice is a card when a fight starts, and a mage's "Unbondable" is the Book of Secrets merit
 *  25. the no-effect audit, part 2 (B3783-B3785): a mage's "Bigot (Tremere)" sours a first meeting with a Tremere NPC
 *      read from its sheet and not with a Ventrue, Sanctity warms anyone, and Red Tape offers its own tick box
 *  26. the no-effect audit, part 3 (B3786-B3787): a mage's Gullible takes 3 dice from a lie, Pack Mentality offers
 *      its two boxes, and Jack-Of-All-Trades is a card when a fight starts
 *  27. the no-effect audit, part 4 (B3788-B3790): a vampire's Dulled Bite is a card at feeding, and Cloaked in Shadow
 *      adds 1 to Social rolls against a vampire
 * Result: Data/wodx-gate/gatetraits-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

const feat = (name, kind, value = 1) => ({name, type: "Feature", system: {type: `wod.types.${kind}`, value}});

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const T = () => game.modules.get("wodx-chronicle")?.api?.traits;
  const TH = await import(`/modules/wodx-actions/scripts/trait-hooks.js?${Date.now()}`);
  const made = [];
  const mk = async (name, type, items, pc = false) => {
    const a = await Actor.create({name: `WoDX gate: ${name}`, type, ownership: pc ? {default: 0, [game.user.id]: 3} : {}});
    made.push(a);
    await a.createEmbeddedDocuments("Item", items);
    return a;
  };
  const diff = (list) => list.reduce((n, e) => n + e.diff, 0);
  try {
    const human = await mk("Trait mortal", "Mortal", [feat("Iron Will", "merit", 3), feat("Magic Resistance", "merit", 2), feat("Cast No Reflection", "flaw", 1),
      feat("Natural Leader", "merit", 1), feat("Acute Sense (Hearing)", "merit", 1), feat("Allies", "background", 3), feat("Stubborn", "merit", 1)]);
    const vamp = await mk("Trait Kindred", "Vampire", [feat("Cast No Reflection", "flaw", 1), feat("Eerie Presence", "flaw", 2), feat("Herd", "background", 3)]);
    const wolf = await mk("Trait Garou", "Werewolf", [feat("Short Fuse", "flaw", 2)]).catch(e => { R.notes.push(`no Werewolf type: ${e.message}`); return null; });
    const mage = await mk("Trait mage", "Mage", [feat("Iron Will", "merit", 3)]);
    const humanPc = await mk("Trait mortal (player)", "Mortal", human.items.map(i => i.toObject()), true);

    await step("1 apis and setting", async () => {
      ok("1 apis and setting", !!T()?.view && !!T()?.rules?.effectsFor && game.settings.get("wodx-actions", "traitRolls") !== false,
        {setting: game.settings.get("wodx-actions", "traitRolls")});
    });

    await step("2 kinds", async () => {
      const k = {human: T().kindOf(human), vamp: T().kindOf(vamp), wolf: wolf ? T().kindOf(wolf) : null, mage: T().kindOf(mage)};
      ok("2 kinds", k.human === "mortal" && k.vamp === "kindred" && (!wolf || k.wolf === "lupine") && k.mage === "mage", k);
    });

    await step("3 power resistance", async () => {
      const dom = TH.resistMods(human, TH.powerTags("Dominate"), vamp), thau = TH.resistMods(human, TH.powerTags("Thaumaturgy"), vamp), pre = TH.resistMods(human, TH.powerTags("Presence"), vamp);
      ok("3 power resistance", dom.diff === 3 && thau.diff === 5 && pre.diff === 0 && dom.parts[0]?.includes(human.name), {dom, thau, pre});
    });

    await step("4 wrong kind", async () => {
      const h = T().of(human).matched.find(m => m.key === "cast-no-reflection"), v = T().of(vamp).matched.find(m => m.key === "cast-no-reflection");
      ok("4 wrong kind", h?.wrongKind && /kindred/.test(h.why) && v && !v.wrongKind && T().has(human, "cast-no-reflection") === 0 && T().has(vamp, "cast-no-reflection") === 1, {why: h?.why});
    });

    await step("5 roll effects", async () => {
      const lead = TH.traitMods(human, TH.tagsFor("charisma", "leadership")), hear = TH.traitMods(human, ["perception", "hearing"]), sight = TH.traitMods(human, ["perception", "sight"]);
      ok("5 roll effects", lead.dice === 2 && hear.diff === -2 && sight.diff === 0 && sight.dice === 0, {lead, hear, sight});
    });

    await step("6 against kinds", async () => {
      const onHuman = TH.traitMods(vamp, ["social"], {target: human}), onWolf = wolf ? TH.traitMods(vamp, ["social"], {target: wolf}) : {diff: 0};
      ok("6 against kinds", onHuman.diff === 2 && onWolf.diff === 0, {onHuman, onWolf});
    });

    await step("7 frenzy", async () => {
      if ( !wolf ) return ok("7 frenzy", true, {skipped: "no Werewolf actor type"});
      const f = TH.traitMods(wolf, ["frenzy"], {moon: "New moon"});
      ok("7 frenzy", f.diff === 2, f);
    });

    await step("8 player and NPC alike", async () => {
      const a = T().of(human).matched.map(m => `${m.key}:${m.wrongKind}`).sort(), b = T().of(humanPc).matched.map(m => `${m.key}:${m.wrongKind}`).sort();
      ok("8 player and NPC alike", humanPc.hasPlayerOwner !== undefined && JSON.stringify(a) === JSON.stringify(b) && TH.resistMods(humanPc, ["mind"]).diff === 3, {a, b, pc: T().view(humanPc).pc});
    });

    await step("9 flag override", async () => {
      const stub = human.items.find(i => i.name === "Stubborn"), iw = mage.items.find(i => i.name === "Iron Will");
      const before = T().has(human, "iron-will");
      await stub.update({"flags.wodx-chronicle.trait": {key: "iron-will"}});
      await iw.update({"flags.wodx-chronicle.trait": {key: "none"}});
      const stubKey = T().of(human).matched.find(m => m.id === stub.id)?.key, mageOff = TH.resistMods(mage, ["mind"]).diff;
      await iw.update({"flags.wodx-chronicle.-=trait": null});
      ok("9 flag override", before > 0 && stubKey === "iron-will" && mageOff === 0 && TH.resistMods(mage, ["mind"]).diff === 3, {stubKey, mageOff});
    });

    await step("10 Only when", async () => {
      const W = game.modules.get("wodx-chronicle").api.when;
      const c = (t, a) => W.check(t, {actor: a}).ok;
      ok("10 Only when", c("merit iron will", human) && c("background allies >= 3", human) && !c("background allies >= 4", human)
        && c("flaw eerie presence", vamp) && !c("flaw cast no reflection", human) && c("flaw cast no reflection", vamp) && c("not merit iron will", vamp));
    });

    await step("11 tick boxes", async () => {
      const h = TH.ticksHtml(human), v = TH.ticksHtml(vamp);
      ok("11 tick boxes", /tag-hearing/.test(h) && !/tag-sight/.test(h) && !/tag-hearing/.test(v), {human: (h.match(/tag-[a-z-]+/g) ?? []), vamp: (v.match(/tag-[a-z-]+/g) ?? [])});
    });

    await step("12 window", async () => {
      const p = T().open(human);
      await new Promise(r => setTimeout(r, 600));
      const el = document.querySelector(".wct-traits");
      const rows = el?.querySelectorAll(".wct-traits-list li").length ?? 0;
      const picks = el?.querySelectorAll("select[data-wct-item]").length ?? 0;
      const app = [...foundry.applications.instances.values()].find(a => a.element === el || a.element?.contains?.(el));
      await app?.close();
      await p;
      // only merit, flaw and background items are listed (the system may add other items of its own)
      const want = T().view(human).features.length;
      ok("12 window", want === 7 && rows === want && picks === rows, {rows, picks, want, items: human.items.size});
    });

    await step("13 other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-sheets", "wodx-storyteller", "wodx-npc"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("13 other modules", !off.length, {off});
    });

    await step("14 senses", async () => {
      const SN = game.modules.get("wodx-senses")?.api;
      if ( !SN ) return ok("14 senses", false, {error: "WoDX Senses is off"});
      const odd = await mk("Trait senses", "Mortal", [feat("Bad Sight", "flaw", 2), feat("Acute Sense (Smell)", "merit", 1), feat("Deaf", "flaw", 4), feat("Medium", "merit", 2)]);
      const pw = SN.rules.powersFor(SN.traitsOf(odd));
      const sight = SN.rules.difficulty("sight", {light: "bright"}, pw), smell = SN.rules.difficulty("smell", {}, pw), sound = SN.rules.difficulty("sound", {}, pw);
      ok("14 senses", sight.diff === 8 && smell.diff === 4 && sound.lost === "Deaf" && pw.channels.includes("restless"), {sight, smell, sound, channels: pw.channels});
    });

    await step("15 signs and Veil", async () => {
      const v = T().shows(vamp).map(x => x.key).sort(), h = T().shows(human);
      const C = game.modules.get("wodx-chronicle").api;
      const eff = await C.applyTimed(human, {name: "Veiled", description: "gate", duration: {kind: "scene"}, key: "wodx-effect-veil", data: {difficulty: 8}});
      const kept = eff?.flags?.["wodx-chronicle"]?.timed?.data?.difficulty;
      await eff?.delete();
      ok("15 signs and Veil", JSON.stringify(v) === JSON.stringify(["cast-no-reflection", "eerie-presence"]) && h.length === 0 && kept === 8, {v, h: h.map(x => x.key), kept});
    });

    await step("16 power keywords", async () => {
      const FX = game.modules.get("wodx-actions").api.effects;
      const set = game.settings.get("wodx-actions", "powerEffects");
      const plan = FX.powerPlan(vamp, {set: "disc", id: "abombwe-predators-communion", name: "Predator's Communion", successes: 2});
      ok("16 power keywords", set === true && typeof FX.powerPlan === "function" && (plan.items.length > 0 || !FX.isOn()), {items: plan.items.map(i => `${i.key}:${i.route}`), on: FX.isOn()});
    });

    await step("17 first meeting", async () => {
      const onMortal = T().attitudeSeed(vamp, human), onKindred = T().attitudeSeed(vamp, mage);
      const AT = game.modules.get("wodx-npc")?.api?.attitude;
      const seed = AT ? AT.seedFor(human, vamp.id) : null;
      ok("17 first meeting", onMortal.delta === -1 && onKindred.delta === 0 && (!AT || seed.step === -1), {onMortal, onKindred, seed});
    });

    await step("18 pools and Lucky", async () => {
      const k = await mk("Trait Lucky", "Vampire", [feat("Lucky", "merit", 3), feat("Efficient Digestion", "merit", 3), feat("Thin Blood", "flaw", 4), feat("Deep Sleeper", "flaw", 1)]);
      const before = TH.luckyLeft(k);
      const used = await TH.useLucky(k);
      ok("18 pools and Lucky", before === 3 && used?.left === 2 && TH.luckyLeft(k) === 2 && TH.digestionBonus(k, 4, 10) === 2 && TH.bloodCostMult(k) === 2 && TH.sleepMods(k).diff === 2,
        {before, used, digest: TH.digestionBonus(k, 4, 10), mult: TH.bloodCostMult(k)});
    });

    await step("19 map, night, Ledger and prompts", async () => {
      const k = await mk("Trait Moments", "Vampire", [feat("Can't Cross Running Water", "flaw", 3), feat("Hunted", "flaw", 4), feat("Dark Secret", "flaw", 1), feat("Flashbacks", "flaw", 6)]);
      const tr = T().triggers(k);
      const hit = T().rules.triggered(tr, ["The mill stream"]).map(t => t.key);
      const pulls = T().pulls(k, () => 0).map(p => p.key);
      const led = T().ledgerFor(k, 0).map(e => e.id);
      const pr = T().rules.promptsOn(T().view(k), "fight").map(p => p.key);
      const IA = game.modules.get("wodx-interactables")?.api;
      const ST = game.modules.get("wodx-storyteller")?.api;
      ok("19 map, night, Ledger and prompts", hit.includes("cant-cross-running-water") && pulls.includes("hunted") && led.includes(`trait-${k.id}-dark-secret`) && pr.includes("flashbacks")
        && (!IA || typeof IA.labelsOnPath === "function") && (!ST || typeof ST.ledger?.syncTraits === "function"), {hit, pulls, led, pr});
    });

    await step("20 backgrounds made real", async () => {
      const k = await mk("Trait World", "Vampire", [feat("Retainers", "background", 2), feat("Mentor", "background", 3), feat("Resources", "background", 2)]);
      const plan = T().worldPlan(k);
      const by = key => plan.find(p => p.key === key);
      ok("20 backgrounds made real", by("retainers")?.count === 2 && by("retainers")?.kind === "ghoul" && by("mentor")?.count === 1 && !by("resources") && typeof T().makeReal === "function",
        {plan: plan.map(p => `${p.key}:${p.count ?? p.size}:${p.kind ?? "place"}`)});
    });

    await step("21 codex thresholds and weather", async () => {
      const X = await import("/modules/wodx-storyteller/scripts/codex-rules.mjs");
      const H = await import("/modules/wodx-storyteller/scripts/hardship-rules.mjs");
      const needs = X.needsOf("Gate page [Occult 5]");
      ok("21 codex thresholds and weather", X.knowsEnough(needs, {intelligence: 3, abilities: {occult: 2}}) && !X.knowsEnough(needs, {intelligence: 2, abilities: {occult: 1}}) && H.weatherDice(2, 3) === 5,
        {needs});
    });

    await step("22 queued keywords", async () => {
      const E = await import("/modules/wodx-actions/scripts/effects-rules.js");
      const g = {ok: true, strength: 4, duration: 1, targets: 0};
      const kinds = ["shape", "sideways", "summon", "make", "weather"].map(k => E.outcome(k, g, {weather: "fog"})?.kind);
      const OW = game.modules.get("wodx-otherworlds")?.api, AW = game.modules.get("wodx-atmosphere")?.api?.weather;
      ok("22 queued keywords", kinds.join(",") === "timed,cross,summon,give,weather" && (!OW || typeof OW.sendAcross === "function") && (!AW || typeof AW.set === "function"), {kinds});
    });

    await step("23 other lines in the table", async () => {
      const merits = T().table.merits;
      const w20 = merits.filter(e => e.book === "W20").length, m20 = merits.filter(e => e.book === "M20 Book of Secrets").length;
      ok("23 other lines in the table", merits.length >= 450 && w20 > 50 && m20 > 50 && T().rules.problems().length === 0, {total: merits.length, w20, m20});
    });
    await step("24 no-effect audit", async () => {
      const seer = await mk("Trait seer", "Mortal", [feat("Introspection", "merit", 1), feat("Combat Novice", "flaw", 2)]);
      const adept = await mk("Trait adept", "Mage", [feat("Unbondable", "merit", 3)]);
      const box = /tag-same-nature/.test(TH.ticksHtml(seer));
      const ticked = TH.traitMods(seer, ["perception", "same-nature"]), plain = TH.traitMods(seer, ["perception"]), other = TH.traitMods(seer, ["social", "same-nature"]);
      const cards = T().rules.promptsOn(T().view(seer), "fight").map(c => c.key);
      const unb = T().of(adept).matched.map(m => m.key);
      ok("24 no-effect audit", box && ticked.dice === 2 && plain.dice === 0 && other.dice === 0 && cards.includes("combat-novice") && unb.includes("onbondable"),
        {box, ticked, plain, other, cards, unb});
    });
    await step("25 no-effect audit, part 2", async () => {
      const bigot = await mk("Trait bigot", "Mage", [feat("Bigot (Tremere)", "flaw", 3), feat("Red Tape", "flaw", 4)]);
      const saint = await mk("Trait saint", "Mortal", [feat("Sanctity", "merit", 2)]);
      const warlock = await mk("Trait Tremere", "Vampire", []), lord = await mk("Trait Ventrue", "Vampire", []);
      await warlock.update({"system.clan": "Tremere"});
      await lord.update({"system.clan": "Ventrue"});
      const groups = T().groupsOf?.(warlock) ?? [];
      const onTremere = T().attitudeSeed(bigot, warlock).delta, onVentrue = T().attitudeSeed(bigot, lord).delta;
      const warm = T().attitudeSeed(saint, lord).delta;
      const box = /tag-bureaucracy/.test(TH.ticksHtml(bigot));
      ok("25 no-effect audit, part 2", groups.includes("Tremere") && onTremere === -1 && onVentrue === 0 && warm === 1 && box,
        {groups, onTremere, onVentrue, warm, box});
    });
    await step("26 no-effect audit, part 3", async () => {
      const dupe = await mk("Trait dupe", "Mage", [feat("Gullible", "flaw", 2), feat("Jack-Of-All-Trades", "merit", 3)]);
      const lie = TH.traitMods(dupe, T().rules.rollTags("manipulation", "subterfuge"));
      const cards = T().rules.promptsOn(T().view(dupe), "fight").map(c => c.key);
      let boxes = null;
      if ( wolf ) {
        const packer = await mk("Trait packer", "Werewolf", [feat("Pack Mentality", "flaw", 2)]);
        const html = TH.ticksHtml(packer);
        boxes = /tag-with-pack/.test(html) && /tag-without-pack/.test(html);
      }
      ok("26 no-effect audit, part 3", lie.dice === -3 && cards.includes("jack-of-all-trades") && boxes !== false, {lie, cards, boxes});
    });
    await step("27 no-effect audit, part 4", async () => {
      const gloom = await mk("Trait gloom", "Vampire", [feat("Dulled Bite", "flaw", 2), feat("Cloaked in Shadow", "flaw", 3)]);
      const feedCards = T().rules.promptsOn(T().view(gloom), "feed").map(c => c.key);
      const social = T().rules.sumEffects(T().rules.effectsFor(T().view(gloom), {channel: "roll", tags: ["social"], against: "kindred"})).diff;
      ok("27 no-effect audit, part 4", feedCards.includes("dulled-bite") && social === 1, {feedCards, social});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    for ( const a of made ) await a.delete().catch(() => null);
  }
  return save(R, "gatetraits-result.json");
}
