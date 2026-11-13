/**
 * WoDX NPC 0.56.0: bonds from the books as relationships, with what each one does (B2840-B2846). Pure: no Foundry.
 *
 * Every game line has bonds of its own that its rules already know: the blood bond and the Vinculum, a ghoul's need,
 * a Garou pack and its totem, Kinfolk, a mage's cabal and familiar, a changeling's oaths and Dreamers, a wraith's
 * Fetters, a hunter's cell, a demon's pacts and thralls, a mummy's cult, a Kuei-jin's wu. Here they become tie kinds
 * the Relationships tab shows, each with a line saying what it does in play, and the moments that call for a card:
 * a thrall about to strike the regnant, a Fetter hurt or killed, a packmate or cellmate down.
 *
 * Page numbers follow the books WoDX already cites elsewhere for the same rule; a book check pins the rest.
 */

/** The new kinds, in the ties-rules shape. group "bonds": oaths, packs and circles. */
export const BOND_KINDS = {
  packmate: {label: "Packmate", back: "packmate", group: "bonds"},
  cabal: {label: "Cabal", back: "cabal", group: "bonds"},
  familiar: {label: "Familiar", back: "familiarOf", group: "bonds"},
  familiarOf: {label: "Familiar of", back: "familiar", group: "bonds", up: true},
  sworn: {label: "Sworn to", back: "swornBy", group: "bonds", up: true},
  swornBy: {label: "Holds the oath of", back: "sworn", group: "bonds"},
  troth: {label: "Troth (fae oath of love)", back: "troth", group: "bonds"},
  dreamer: {label: "Dreamer (muse)", back: "dreamerOf", group: "bonds"},
  dreamerOf: {label: "Inspires", back: "dreamer", group: "bonds", up: true},
  fetter: {label: "Fetter", back: "fetterOf", group: "bonds"},
  fetterOf: {label: "Is a Fetter of", back: "fetter", group: "bonds", up: true},
  cellmate: {label: "Cellmate", back: "cellmate", group: "bonds"},
  thrallOf: {label: "Pact with", back: "pactThrall", group: "bonds", up: true},
  pactThrall: {label: "Thrall by pact", back: "thrallOf", group: "bonds"},
  cultOf: {label: "Cult of", back: "cultist", group: "bonds", up: true},
  cultist: {label: "Cultist", back: "cultOf", group: "bonds"},
  wuOf: {label: "Wu", back: "wuOf", group: "bonds"}
};
export const BOND_GROUP = {bonds: "Oaths, packs and circles"};
export const BOND_HAND_ROLES = Object.keys(BOND_KINDS);

/** What each bond does, in a line the Relationships tab shows. */
export const RULE_OF = {
  bondTo: "A blood bond. At the second drink, harming the regnant takes a Willpower roll; at the third, the regnant's Social rolls against the thrall are 2 easier and Dominate needs no eye contact (V20 Dark Ages p. 342).",
  thrall: "Bound to this one: your Social rolls against them are easier (1 at the second drink, 2 at the third) (V20 Dark Ages p. 342).",
  domitor: "A ghoul needs a drink from the domitor each month or the vitae runs low and the years come back (V20 Dark Ages p. 399).",
  ghoul: "Your ghoul needs your vitae each month (V20 Dark Ages p. 399).",
  packmate: "A Garou pack shares one totem: its ban binds every member, and breaking it costs the whole pack the totem's favour (W20). Sabbat packmates share the Vinculum.",
  cabal: "Cabal-mates share a Sanctum, a Node and a Library as they agreed (M20).",
  familiar: "A familiar is bound to the mage and needs feeding with Quintessence or its own fare (M20).",
  familiarOf: "Bound to this mage as their familiar.",
  sworn: "A changeling's oath binds by the Dreaming: breaking it brings the price the oath named (C20).",
  swornBy: "Holds this one's oath, and the Dreaming holds them to it (C20).",
  troth: "An oath of love sworn before the Dreaming; breaking it brings its price (C20).",
  dreamer: "A mortal whose dreams feed this changeling's Glamour; Ravaging hurts them, Musing inspires them (C20).",
  dreamerOf: "Your dreams feed this changeling's Glamour.",
  fetter: "A Fetter: the wraith feels it threatened and must act; if it is destroyed the wraith faces a Harrowing (Wraith 20th p. 309).",
  fetterOf: "This wraith is bound to you as a Fetter: harm to you reaches them.",
  cellmate: "A hunter's cell shares safehouses and what each has seen; losing a cellmate tests Willpower or Conviction.",
  thrallOf: "A demon's pact: the thrall gains what was promised, and the demon draws Faith from them (Demon: the Fallen).",
  pactThrall: "Your thrall by pact: they give you Faith, and the pact binds you both.",
  cultOf: "A mummy's cult keeps the vessel safe between lives and serves the Amenti (Mummy).",
  cultist: "Your cultist: a mortal servant of the cult.",
  wuOf: "A Kuei-jin wu: its members act as one at court and in feuds (Kindred of the East)."
};

/** The Sabbat Vinculum as a bond step: 8 to 10 is a full bond, 5 to 7 a second drink, less nothing (B2841, house reading of V20 p. 297). */
export const vinculumStep = rating => (Number(rating) >= 8 ? 3 : Number(rating) >= 5 ? 2 : 0);

/**
 * The bond step a thrall has toward a regnant. lineageBonds: flags["wodx-creation"].lineage.bonds {id: {drinks}};
 * oaths: flags["wodx-actions"].oaths {key: {uuid, stage}}; vinculum: politics {"a>b": rating} (thrall>regnant).
 */
export function stepToward({lineageBonds = {}, oaths = {}, vinculum = {}, thrallId = "", regnantId = ""} = {}) {
  let step = 0;
  const lb = lineageBonds?.[regnantId];
  if ( lb ) step = Math.max(step, Number(lb.drinks) >= 3 ? 3 : Number(lb.drinks) || 0);
  for ( const o of Object.values(oaths ?? {}) ) if ( String(o?.uuid ?? "").endsWith(`Actor.${regnantId}`) || o?.id === regnantId ) step = Math.max(step, Math.min(3, Number(o.stage) || 0));
  step = Math.max(step, vinculumStep(vinculum?.[`${thrallId}>${regnantId}`]));
  return step;
}
/** How much easier the regnant's Social roll is against the thrall (V20 Dark Ages p. 342). */
export const socialShift = step => (step >= 3 ? -2 : step >= 2 ? -1 : 0);
/** Does striking at the regnant need a Willpower roll first? */
export const harmNeedsWillpower = step => step >= 2;

/**
 * The moments a bond calls for a card. ev: {kind: "attack" | "harm" | "death", by, of}. edges: ties-rules edges.
 * Returns [{to (actor id told), text}].
 */
export function cardsFor(ev = {}, edges = [], {stepOf = () => 0} = {}) {
  const out = [];
  const say = (to, text) => { if ( to && !out.some(o => o.to === to && o.text === text) ) out.push({to, text}); };
  if ( ev.kind === "attack" && ev.by && ev.of ) {
    const s = stepOf(ev.by, ev.of);
    if ( harmNeedsWillpower(s) ) say(ev.by, `Bound by blood${s >= 3 ? " fully" : ""} to the one under attack: a Willpower roll first, at the bond's difficulty, or the blow is not struck (V20 Dark Ages p. 342; WoDX Actions Blood Oath, Resist).`);
  }
  if ( (ev.kind === "harm" || ev.kind === "death") && ev.of ) {
    for ( const e of edges ) {
      if ( e.to?.id !== ev.of ) continue;
      if ( e.kind === "fetter" ) say(e.from, ev.kind === "death" ? `Your Fetter ${e.to.name} is gone: a Fetter's Harrowing waits, and the Fetter's dots are lost (Wraith 20th p. 309).` : `Your Fetter ${e.to.name} is hurt: you feel it, wherever you are.`);
      if ( e.kind === "dreamer" && ev.kind === "death" ) say(e.from, `Your Dreamer ${e.to.name} is dead: that well of Glamour is gone.`);
      if ( (e.kind === "packmate" || e.kind === "cellmate" || e.kind === "cabal" || e.kind === "wuOf") && ev.kind === "death" )
        say(e.from, `${e.to.name}, of your ${e.kind === "packmate" ? "pack" : e.kind === "cellmate" ? "cell" : e.kind === "cabal" ? "cabal" : "wu"}, has fallen.${e.kind === "cellmate" ? " A Willpower roll (difficulty 7) or lose a point of temporary Willpower (house rule)." : ""}`);
      if ( e.kind === "familiar" && ev.kind === "death" ) say(e.from, `Your familiar ${e.to.name} is dead; the Storyteller rules on what the loss costs.`);
    }
  }
  return out;
}

/**
 * Packmates from the sheets: every Garou (or anyone with a pack name) who shares a pack name is a packmate of the
 * others, with the totem as the note. actors: [{id, name, system: {packname, packtotem}}]. Returns [{a, b, note}].
 */
export function packPairs(actors = []) {
  const packs = new Map();
  for ( const a of actors ) {
    const p = String(a?.system?.packname ?? "").trim();
    if ( !p ) continue;
    const k = p.toLowerCase();
    if ( !packs.has(k) ) packs.set(k, {name: p, totem: "", members: []});
    const g = packs.get(k);
    g.members.push(a);
    if ( !g.totem && a.system?.packtotem ) g.totem = String(a.system.packtotem).trim();
  }
  const out = [];
  for ( const g of packs.values() ) for ( let i = 0; i < g.members.length; i++ ) for ( let j = i + 1; j < g.members.length; j++ )
    out.push({a: g.members[i], b: g.members[j], note: `${g.name}${g.totem ? `, totem ${g.totem}` : ""}`});
  return out;
}

/** A wraith's Fetter items that name an actor: [{wraithId, actorId, name, rating}]. items: [{name, system: {type, value}, flags}]. */
export function fetterLinks(wraith, byName) {
  const out = [];
  for ( const i of wraith?.items ?? [] ) {
    if ( i?.system?.type !== "wod.types.fetter" ) continue;
    const linked = i.flags?.["wodx-npc"]?.tie;
    const target = linked ? linked : byName.get(String(i.name ?? "").trim().toLowerCase())?.id;
    if ( target && target !== wraith.id ) out.push({wraithId: wraith.id, actorId: target, name: i.name, rating: Number(i.system?.value) || 0});
  }
  return out;
}
