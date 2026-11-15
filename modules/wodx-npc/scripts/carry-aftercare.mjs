/**
 * WoDX NPC: aftercare, what NPCs do once they have carried someone where they meant to (Aftercare Desk a1-a12,
 * B5710 to B5721). The rules are carry-aftercare-rules.mjs; arriving is carry-goals.mjs, which fires wodxBodyTaken.
 *
 *   wards     world setting wodx-npc.wards: the hurt and the torpid laid down at a haven or home, and the dead foes
 *             waiting to be disposed of. The hurt are tended on arrival and mend each day off the map (on the map,
 *             WoDX Actions' clock heals them); a Cainite is fed and mends with blood; a torpid Cainite's own may
 *             feed them to wake them (approval type npc-torpor-blood).
 *   the dead  a mortal ally: their faith's rite, a grave pin on the map, their family's grudge against whoever hurt
 *             them last (flags.wodx-npc.hurtBy, from wodxDamageApplied). A Cainite's Final Death: the remains are
 *             gathered, a rumour, the faction's Status falls. A dead foe hidden or taken as proof is disposed of
 *             by the takers' kind a few hours later: the token goes, the body's marks and the evidence go with it.
 *   prisoners WoDX NPC's prisoners list (carry-goals.mjs). Each day: fed (a mortal mends), questioned (each success
 *             gives up one of their secrets), fed on by a Cainite captor every other night, a try at the bonds by
 *             night; after a week the faction decides (approval type npc-prisoner-fate for a killing or any choice
 *             about a player's character); on each faction turn the prisoner's own faction may come for them.
 *             A player's character gets a card each day: try the bonds, talk, or wait.
 *   stores    the fallen foe's and the captive's things go into a container at the captors' place (a copy of each
 *             as a world item, its line in the container), or into world setting wodx-npc.stores for a place off
 *             this map. Taking them back is the container's own Take.
 */
import * as A from "./carry-aftercare-rules.mjs";
import * as SX from "./secrets-rules.mjs";
const IX = "wodx-interactables", ACT = "wodx-actions";
// WoDX Interactables' container kinds (interact-rules.mjs CONTAINERS), named here so NPC runs without it
const CONTAINERS = {chest: {label: "Chest"}, box: {label: "Box or casket"}, cabinet: {label: "Cabinet or wardrobe"}, drawers: {label: "Desk or filing drawers"}, strongbox: {label: "Strongbox"}, safe: {label: "Safe"}, pile: {label: "Gear on the ground"}};
const FATE = "npc-prisoner-fate", BLOOD = "npc-torpor-blood", TALK = "npc-prisoner-talk";

export function build({MOD, esc, gmIds, chron, factions, routines, people, MEMORY, isActiveGM, carryGoals, st}) {
  const on = () => { try { return game.settings.get(MOD, "carryAftercare") !== false; } catch (e) { return false; } };
  const now = () => game.time?.worldTime ?? 0;
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const baseOf = a => (a?.isToken ? (a.baseActor ?? a) : a);
  const kindOf = a => { try { return game.modules.get("wodx-combat")?.api?.getKind?.(a) ?? game.wodxCombat?.getKind?.(a) ?? null; } catch (e) { return null; } };
  const kindred = a => a?.type === "Vampire" || kindOf(a) === "kindred";
  const combat = () => game.wodxCombat ?? game.modules.get("wodx-combat")?.api ?? null;
  const acts = () => (game.modules.get(ACT)?.active ? game.modules.get(ACT).api : null);
  const ix = () => (game.modules.get(IX)?.active ? game.modules.get(IX).api : null);
  const card = (title, html, whisper = gmIds()) => ChatMessage.create({speaker: {alias: "WoDX NPC"}, whisper,
    content: `<div class="wodx-card wnpc-aftercare"><h3>${esc(title)}</h3>${html}</div>`}).catch(() => null);
  const get = k => foundry.utils.deepClone(game.settings.get(MOD, k) ?? []);
  const set = (k, v) => game.settings.set(MOD, k, v);
  const stat = (a, group, k) => num(a?.system?.[group]?.[k]?.value);
  const powerDots = (a, re) => Math.max(0, ...[...(a?.items ?? [])].filter(i => i.type === "Power" && re.test(i.name ?? "")).map(i => num(i.system?.value)));
  const damageOf = a => ({bashing: num(a?.system?.health?.damage?.bashing), lethal: num(a?.system?.health?.damage?.lethal), aggravated: num(a?.system?.health?.damage?.aggravated)});
  const levels = a => { const h = a?.system?.health ?? {}; const t = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"].reduce((s, k) => s + (Number(h[k]?.total ?? h[k]?.value) || 1), 0); return t || 7; };
  const ownersOf = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
  const tokenOf = (uuid, actorId) => {
    const d = uuid ? fromUuidSync(uuid) : null;
    if ( d ) return d;
    for ( const s of game.scenes ?? [] ) { const t = s.tokens.find(x => x.actorId === actorId); if ( t ) return t; }
    return null;
  };
  const factionOf = id => { try { return (factions.state()?.factions ?? []).find(f => !f.dormant && (f.members ?? []).includes(id)) ?? null; } catch (e) { return null; } };
  const factionById = id => { try { return (factions.state()?.factions ?? []).find(f => f.id === id) ?? null; } catch (e) { return null; } };
  const rumour = (text, about = null) => { try { return st()?.rumours?.start?.({text, about}); } catch (e) { return null; } };
  const tiesOf = a => { try { return people.ties?.of?.(a) ?? []; } catch (e) { return []; } };
  const regionOf = scene => { try { const r = chron()?.world?.here?.(scene ?? null); return (typeof r === "string" ? r : r?.id) || ""; } catch (e) { return ""; } };

  /* ---------------- settings and the hurt ---------------- */

  function registerSettings() {
    game.settings.register(MOD, "carryAftercare", {name: "Aftercare of the carried", hint: "What NPCs do once they have carried someone home: tend and heal the hurt, bury the dead by their faith, dispose of dead foes, and keep, question, feed on, ransom or free their prisoners.",
      scope: "world", config: true, type: Boolean, default: true});
    game.settings.register(MOD, "wards", {scope: "world", config: false, type: Array, default: []});
    game.settings.register(MOD, "stores", {scope: "world", config: false, type: Object, default: {}});
    game.settings.register(MOD, "aftercareClock", {scope: "world", config: false, type: Number, default: -1});
  }

  /** The household at a place: NPCs whose routine names it home, haven or post, and the carrier. */
  function householdAt(placeId, also = []) {
    const out = new Map();
    for ( const a of also ) if ( a ) out.set(a.id, a);
    if ( placeId ) for ( const a of game.actors ?? [] ) {
      if ( a.hasPlayerOwner || a.type === "Group" ) continue;
      const r = routines.routineOf?.(a)?.roles ?? {};
      if ( [r.home, r.haven, r.post].includes(placeId) ) out.set(a.id, a);
    }
    return [...out.values()];
  }

  /** a1: tend a hurt ally on arrival. */
  async function tend(actor, {place, placeName, carrier}) {
    const dmg = damageOf(actor);
    if ( kindred(actor) ) {
      const b = {value: num(actor.system?.advantages?.bloodpool?.temporary), max: num(actor.system?.advantages?.bloodpool?.max) || 10};
      const m = A.kindredMend(b, dmg);
      await actor.update({"system.advantages.bloodpool.temporary": m.blood});
      if ( m.spent ) await combat()?.setDamage?.(actor, m.damage);
      return `${placeName}'s people bring ${actor.name} ${m.fed ? `${m.fed} blood from a vessel` : "blood"}; ${m.spent ? `${m.spent} of it mends their wounds` : "the wounds are past what blood mends tonight"}.`;
    }
    const healer = A.bestHealer(householdAt(place, [carrier]).map(a => ({id: a.id, name: a.name, int: stat(a, "attributes", "intelligence"), medicine: stat(a, "abilities", "medicine")})));
    if ( !healer ) return `${actor.name} is laid down at ${placeName}; no one there knows medicine, so the wounds mend slowly.`;
    const r = A.roll(healer.int + healer.medicine, A.tendDiff(dmg));
    if ( r.net > 0 ) await actor.setFlag(ACT, "treated", true);
    return `${healer.name} tends ${actor.name}'s wounds (Intelligence + Medicine, ${r.diff}: ${r.dice.join(" ")}): ${r.net > 0 ? "treated, the wounds will mend as the days pass" : r.botch ? "a botch; the wounds are no better for it" : "no good; they mend untreated"}.`;
  }

  async function addWard(w) {
    const list = get("wards").filter(x => !(x.actor === w.actor && x.kind === w.kind));
    await set("wards", [...list, {since: now(), ...w}]);
  }

  /* ---------------- the dead ---------------- */

  /** a3: a mortal ally's funeral. */
  async function funeral(actor, {place, placeName, carrier}) {
    const p = place ? routines.listPlaces().find(x => x.id === place) : null;
    const scene = p?.scene ?? tokenOf(null, actor.id)?.parent ?? null;
    const f = (() => { try { return chron()?.church?.faithOf?.(scene, yearNow()) ?? {faith: "western", region: ""}; } catch (e) { return {faith: "western", region: ""}; } })();
    const rite = A.riteFor(f.faith, yearNow(), f.region || regionOf(scene));
    let pin = null;
    if ( scene ) {
      const s = p?.region?.shapes?.[0], d = scene.dimensions ?? {};
      const x = s ? num(s.x) + num(s.width) / 2 : num(d.sceneX) + num(d.sceneWidth || scene.width) / 2;
      const y = s ? num(s.y) + num(s.height) / 2 : num(d.sceneY) + num(d.sceneHeight || scene.height) / 2;
      try { pin = (await scene.createEmbeddedDocuments("Note", [{x: Math.round(x), y: Math.round(y), text: `${A.RITE_WORDS[rite.rite] ?? "Grave of"} ${actor.name}`, fontSize: 24,
        texture: {src: "icons/svg/tombstone.svg"}, flags: {[MOD]: {grave: actor.id}}}]))[0]; } catch (e) { pin = null; }
    }
    await actor.setFlag(MOD, "funeral", {rite: rite.rite, at: placeName, worldTime: now(), note: pin?.uuid ?? null});
    // the family learns, and holds it against whoever hurt them last
    const by = actor.getFlag(MOD, "hurtBy"), killer = by?.id ? game.actors.get(by.id) : null;
    const kin = tiesOf(actor).filter(t => ["family", "love"].includes(t.group)).map(t => game.actors.get(t.to)).filter(a => a && !a.hasPlayerOwner && a.id !== actor.id);
    const grudges = [];
    if ( killer ) for ( const k of kin ) if ( k.id !== killer.id && await MEMORY.remember(k, killer, {kind: "kin", text: `Killed ${actor.name}`}).catch(() => null) ) grudges.push(k.name);
    rumour(`${actor.name} is dead and ${rite.rite === "burial" ? "buried" : "laid to rest"} at ${placeName}`, actor.id);
    return `${actor.name} is ${rite.words} at ${placeName}${pin ? "; the grave is marked on the map" : ""}.${grudges.length ? ` ${grudges.join(", ")} will not forget who did it: ${killer.name}.` : kin.length ? " The family mourns." : ""}`;
  }

  /** a4: a Cainite's Final Death. */
  async function finalDeath(actor, tok, {placeName}) {
    if ( tok && !tok.hidden ) await tok.update({hidden: true}).catch(() => null);
    await actor.setFlag(MOD, "finalDeath", {at: placeName, worldTime: now()});
    const fac = factionOf(actor.id);
    if ( fac ) await factions.applyNow?.([{op: "bg", faction: fac.id, key: "status", delta: -1}], {reason: `${actor.name} met Final Death`}).catch(() => null);
    const sire = tiesOf(actor).find(t => t.kind === "sire");
    rumour(`${actor.name} has met Final Death${fac ? `; ${fac.name} is the weaker for it` : ""}`, actor.id);
    return `What is left of ${actor.name} is gathered at ${placeName}. ${sire ? `${game.actors.get(sire.to)?.name ?? "The sire"} hears of it; ` : ""}${fac ? `${fac.name} loses a dot of Status` : "the news spreads"}.`;
  }

  /** a5: dispose of a dead foe. */
  async function dispose(w) {
    const actor = game.actors.get(w.actor), tok = tokenOf(w.token, w.actor);
    const taker = game.actors.get(w.by);
    const lawful = ["church", "mortal", "folk"].includes(factionById(w.faction)?.kind);
    const how = A.disposalFor(kindOf(taker) ?? "mortal", {lawful, water: false, year: yearNow()});
    if ( tok ) {
      const scene = tok.parent;
      for ( const t of scene?.tiles ?? [] ) {
        const occ = t.flags?.[IX]?.occupants ?? [];
        if ( occ.some(o => o.a === w.actor) ) await t.update({[`flags.${IX}.occupants`]: occ.filter(o => o.a !== w.actor)});
      }
      await tok.update({hidden: true, "flags.wodx-storyteller.remains": null, [`flags.${MOD}.disposed`]: {how: how.how, worldTime: now()}}).catch(() => null);
      // the evidence goes with the body: what the takers' side left on that scene around the death
      try {
        const side = new Set([w.by, ...(factionById(w.faction)?.members ?? [])]);
        const ev = game.settings.get(IX, "evidence") ?? {list: []};
        const list = (ev.list ?? []).filter(e => !(e.scene === scene?.id && side.has(e.by) && num(e.at) >= num(w.since) - A.DAY));
        if ( list.length !== (ev.list ?? []).length ) await game.settings.set(IX, "evidence", {...ev, list});
      } catch (e) { /* no evidence kept */ }
    }
    if ( actor ) await actor.setFlag(MOD, "disposed", {how: how.how, by: taker?.name ?? "", worldTime: now()});
    if ( how.how === "law" ) rumour(`The body of ${w.name} was handed to the law`, w.actor);
    await card(`${w.name}: disposed of`, `<p>${esc(taker?.name ?? "Their killers")} see to the body: ${esc(how.words)}. It is gone from the map, and the traces with it.</p>`);
  }

  /* ---------------- a6: their things ---------------- */

  async function folder() {
    const name = "WoDX: captors' stores";
    return game.folders.find(f => f.type === "Item" && f.name === name) ?? await Folder.create({name, type: "Item"});
  }
  /** Take the body's things into the captors' stores. -> words */
  async function takeThings(actor, {scene, place, placeName}) {
    const items = A.lootable([...(actor?.items ?? [])]);
    if ( !items.length ) return "";
    const fo = await folder();
    const made = await Item.createDocuments(items.map(i => { const o = i.toObject(); delete o._id; return {...o, folder: fo.id, flags: {...(o.flags ?? {}), [MOD]: {takenFrom: actor.id}}}; }));
    await actor.deleteEmbeddedDocuments("Item", items.map(i => i.id));
    await actor.setFlag(MOD, "takenGoods", {to: placeName, items: made.map(m => m.uuid), worldTime: now()});
    const lines = made.map(m => m.uuid);
    // a container at the place on this map, else the nearest on the scene, else the place's stores off the map
    const p = place ? routines.listPlaces().find(x => x.id === place) : null;
    const sc = p?.scene ?? scene;
    const b = p?.region?.shapes?.[0];
    const inside = t => !b || (num(t.x) >= num(b.x) && num(t.x) <= num(b.x) + num(b.width) && num(t.y) >= num(b.y) && num(t.y) <= num(b.y) + num(b.height));
    const box = [...(sc?.tiles ?? [])].filter(t => CONTAINERS[t.flags?.[IX]?.kind] && t.flags[IX].kind !== "pile").sort((a, c) => Number(inside(c)) - Number(inside(a)))[0] ?? null;
    if ( box ) {
      const was = String(box.flags?.[IX]?.items ?? "").split("\n").map(x => x.trim()).filter(Boolean);
      await box.update({[`flags.${IX}.items`]: [...was, ...lines].join("\n"), [`flags.${IX}.taken`]: false});
    } else {
      const stores = foundry.utils.deepClone(game.settings.get(MOD, "stores") ?? {});
      stores[place || "away"] = [...(stores[place || "away"] ?? []), ...lines];
      await game.settings.set(MOD, "stores", stores);
    }
    return ` Their things (${made.map(m => m.name).join(", ")}) go into ${box ? `the ${(box.flags?.[IX]?.title || CONTAINERS[box.flags[IX].kind].label).toLowerCase()} at ${placeName}` : `the stores at ${placeName}`}.`;
  }

  /* ---------------- on arrival ---------------- */

  async function onTaken(d = {}) {
    if ( !on() || !isActiveGM() ) return;
    const actor = game.actors.get(d.actor);
    if ( !actor ) return;
    const tok = d.body ? fromUuidSync(d.body) : null, carrier = d.byActor ? game.actors.get(d.byActor) : null;
    const scene = tok?.parent ?? null, placeName = d.placeName || "their place";
    const o = {place: d.place, placeName, carrier, scene};
    let words = "";
    const torpid = !!actor.getFlag(ACT, "torpor");
    if ( d.intent === "safe" ) {
      words = await tend(actor, o);
      await addWard({kind: "hurt", actor: actor.id, token: d.body, name: actor.name, place: d.place, placeName});
    } else if ( d.intent === "rest" && kindred(actor) && (torpid || !d.dead) ) {
      if ( !torpid ) await acts()?.enterTorpor?.(actor, {cause: "wounds"});
      await addWard({kind: "torpor", actor: actor.id, token: d.body, name: actor.name, place: d.place, placeName, faction: factionOf(actor.id)?.id ?? null});
      words = `${actor.name} lies in torpor at ${placeName}, hidden and watched over.`;
    } else if ( d.intent === "rest" ) words = await finalDeath(actor, tok, o);
    else if ( d.intent === "burial" ) words = await funeral(actor, o);
    else if ( d.dead && ["hidden", "proof"].includes(d.intent) ) {
      // a few hours to fetch what the body needs; proof is shown first and disposed of the next day (house)
      await addWard({kind: "dispose", actor: actor.id, token: d.body, name: actor.name, by: d.byActor, faction: d.faction, due: now() + (d.intent === "proof" ? A.DAY : 6 * 3600)});
      words = (await takeThings(actor, o)).trim();
    } else if ( d.intent === "prison" ) {
      words = (await takeThings(actor, o)).trim();
      if ( actor.hasPlayerOwner ) await heldCard(actor, carryGoals.prisoners().find(p => p.captive === actor.id), {first: true});
    }
    if ( words ) await card(`${actor.name}: aftercare`, `<p>${esc(words)}</p>`);
  }

  /* ---------------- the days ---------------- */

  let busy = false;
  async function onClock() {
    if ( busy || !on() || !isActiveGM() ) return;
    busy = true;
    try {
      const t = now(), last = game.settings.get(MOD, "aftercareClock");
      if ( last < 0 || last > t ) { await game.settings.set(MOD, "aftercareClock", t); return; }
      // the dead foes whose time has come, at any hour
      const wards = get("wards");
      for ( const w of wards.filter(x => x.kind === "dispose" && num(x.due) <= t) ) await dispose(w);
      const keep = wards.filter(x => !(x.kind === "dispose" && num(x.due) <= t));
      const days = A.daysCrossed(last, t);
      if ( !days ) { if ( keep.length !== wards.length ) await set("wards", keep); return; }
      await game.settings.set(MOD, "aftercareClock", t);
      await set("wards", await wardDays(keep, days, t - last));
      for ( let i = 0; i < days; i++ ) await prisonDay(t - (days - 1 - i) * A.DAY);
    } catch (e) { console.error(`${MOD} | aftercare`, e); }
    finally { busy = false; }
  }

  /** The hurt mend off the map (on it, Actions' clock heals them); the torpid get a visit. */
  async function wardDays(list, days, seconds) {
    const onScene = new Set((game.scenes?.active?.tokens ?? []).map(t => t.actorId));
    const out = [];
    for ( const w of list ) {
      const a = game.actors.get(w.actor);
      if ( !a ) continue;
      if ( w.kind === "hurt" ) {
        if ( kindred(a) ) {
          const m = A.kindredMend({value: num(a.system?.advantages?.bloodpool?.temporary), max: num(a.system?.advantages?.bloodpool?.max) || 10}, damageOf(a), days);
          await a.update({"system.advantages.bloodpool.temporary": m.blood});
          if ( m.spent ) await combat()?.setDamage?.(a, m.damage);
        } else if ( !onScene.has(a.id) && !a.hasPlayerOwner ) {
          const plan = acts()?.healPlan?.(a, seconds);
          if ( plan ) { await combat()?.setDamage?.(a, plan.damage); await a.setFlag(ACT, "healCarry", plan.carry); }
        }
        const d = damageOf(a);
        if ( d.bashing + d.lethal + d.aggravated > 0 ) out.push(w);
        else await card(`${a.name} is whole again`, `<p>${esc(a.name)} is back on their feet at ${esc(w.placeName)}.</p>`);
      } else if ( w.kind === "torpor" ) {
        if ( !a.getFlag(ACT, "torpor") ) continue;
        if ( !w.asked ) {
          const feeder = torporFeeder(a, w);
          if ( feeder ) {
            await chron()?.propose?.({type: BLOOD, key: `torpor:${a.id}`, title: `${feeder.name} would wake ${a.name} with blood`,
              detail: `${a.name} lies in torpor at ${w.placeName}. ${feeder.name} offers two points of their own blood to wake them before their time. Approve and ${a.name} tries to rise.`,
              data: {actor: a.id, feeder: feeder.id}});
            w.asked = now();
          }
        }
        out.push(w);
      } else out.push(w);
    }
    return out;
  }
  function torporFeeder(a, w) {
    const t = tiesOf(a);
    const near = t.filter(x => ["sire", "childe", "bondTo"].includes(x.kind)).map(x => game.actors.get(x.to));
    const mates = (factionById(w.faction)?.members ?? []).map(id => game.actors.get(id));
    return [...near, ...mates].find(x => x && x.id !== a.id && kindred(x) && !x.getFlag(ACT, "torpor") && num(x.system?.advantages?.bloodpool?.temporary) >= 3) ?? null;
  }
  async function wakeWithBlood(entry) {
    const a = game.actors.get(entry.data?.actor), f = game.actors.get(entry.data?.feeder);
    if ( !a ) return;
    if ( f ) await f.update({"system.advantages.bloodpool.temporary": Math.max(0, num(f.system?.advantages?.bloodpool?.temporary) - 2)});
    await a.update({"system.advantages.bloodpool.temporary": Math.min(num(a.system?.advantages?.bloodpool?.max) || 10, num(a.system?.advantages?.bloodpool?.temporary) + 2)});
    const t = a.getFlag(ACT, "torpor");
    if ( t ) await a.setFlag(ACT, "torpor", {...t, until: now(), retryAt: 0});
    await acts()?.clock?.();
    await card(`${a.name} is given blood`, `<p>${esc(f?.name ?? "One of their own")} opens a vein for ${esc(a.name)}, who stirs and tries to rise.</p>`);
  }

  /* ---------------- prisoners ---------------- */

  const prisonList = () => get("prisoners");
  async function patch(captive, fn) { await set("prisoners", prisonList().map(x => (x.captive === captive && !x.freed ? fn(x) : x))); }

  async function prisonDay(day) {
    for ( const p of prisonList().filter(x => !x.freed) ) {
      const a = game.actors.get(p.captive);
      if ( !a ) continue;
      const tok = tokenOf(p.token, p.captive);
      const captor = game.actors.get(p.captor) ?? game.actors.get(factionById(p.faction)?.leader ?? "") ?? null;
      const lines = [];
      // a7: fed; a mortal mends a day's worth (the books' healing, untended)
      if ( !kindred(a) ) {
        const plan = acts()?.healPlan?.(a, A.DAY);
        // on the map in play, WoDX Actions' clock heals them already
        if ( plan && !a.hasPlayerOwner && !(game.scenes?.active?.tokens ?? []).some(t => t.actorId === a.id) ) await combat()?.setDamage?.(a, plan.damage);
        lines.push(`${a.name} is given bread and water.`);
      }
      // a9: a Cainite captor feeds, carefully
      if ( captor && kindred(captor) && !kindred(a) && day - num(p.fedOn) >= A.FEED_EVERY ) {
        const b = captor.system?.advantages?.bloodpool ?? {};
        const draw = A.feedDraw({hunger: num(b.max) - num(b.temporary) > 4 ? 2 : 1, healthLeft: A.healthLeft(damageOf(a), levels(a))});
        if ( draw ) {
          await captor.update({"system.advantages.bloodpool.temporary": Math.min(num(b.max) || 10, num(b.temporary) + draw)});
          await combat()?.applyDamage?.(a, "bashing", draw);
          Hooks.callAll("wodxFed", {by: {uuid: captor.uuid, name: captor.name}, vessel: {uuid: a.uuid, name: a.name}, drunk: draw, willing: false, fought: false});
          lines.push(`${captor.name} feeds on ${a.name}: ${draw} blood, and ${a.name} weakens.`);
          p.fedOn = day;
        }
      }
      // a8: questioning
      if ( captor && day - num(p.askedOn) >= A.DAY ) {
        const found = SX.secretsOf(a.flags).filter(s => !SX.knownBy(s, captor.id));
        if ( found.length ) {
          const q = A.question({manipulation: stat(captor, "attributes", "manipulation"), charisma: stat(captor, "attributes", "charisma"), intimidation: stat(captor, "abilities", "intimidation"),
            dominate: powerDots(captor, /dominate/i), presence: powerDots(captor, /presence/i)}, num(a.system?.willpower?.permanent ?? a.system?.advantages?.willpower?.permanent), found);
          for ( const s of q.secrets ) await people.secrets?.reveal?.(a, s.id, captor, {how: `questioned while held at ${p.placeName}`});
          lines.push(`${captor.name} questions ${a.name} (${q.words}: ${q.roll.dice.join(" ")} at ${q.roll.diff}): ${q.secrets.length ? `learns ${q.secrets.map(s => s.text || SX.SECRET_KINDS[s.kind]?.label || "a secret").join("; ")}` : "nothing given up"}.`);
        }
        p.askedOn = day;
      }
      // a7 / a12: the bonds by night
      if ( a.hasPlayerOwner ) await heldCard(a, p);
      else {
        const r = A.tryBonds(p.bonds, {dex: stat(a, "attributes", "dexterity"), larceny: stat(a, "abilities", "larceny"), str: stat(a, "attributes", "strength"), athletics: stat(a, "abilities", "athletics")});
        p.bonds = r.progress;
        if ( r.free ) {
          await setFree(p, tok, `${a.name} works free of the bonds by night (${r.words}) and slips away.`);
          if ( lines.length ) await card(`${a.name}, held at ${p.placeName}`, `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`);
          continue;
        }
        if ( r.botch ) lines.push(`${a.name} is caught at the bonds; they are tied again, tighter.`);
      }
      await patch(p.captive, x => ({...x, fedOn: p.fedOn ?? x.fedOn, askedOn: p.askedOn ?? x.askedOn, bonds: p.bonds ?? x.bonds}));
      // a10: after a week
      if ( day - num(p.since) >= A.WEEK && !p.fateAsked ) await decide(p, a, tok);
      if ( lines.length ) await card(`${a.name}, held at ${p.placeName}`, `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>`);
    }
  }

  async function setFree(p, tok, words) {
    if ( tok ) await carryGoals.freePrisoner(tok, "");
    else await set("prisoners", prisonList().map(x => (x.captive === p.captive && !x.freed ? {...x, freed: now() || 1} : x)));
    rumour(`${p.name} is no longer held${p.factionName ? ` by ${p.factionName}` : ""}`, p.captive);
    await card(`${p.name} is free`, `<p>${esc(words)}</p>`);
  }

  /** a10: the faction's choice after a week. */
  async function decide(p, a, tok) {
    const cap = factionById(p.faction), own = factionOf(p.captive);
    const held = prisonList().filter(x => !x.freed && x.captive !== p.captive);
    const swap = !!own && held.find(x => x.faction === own.id && (cap?.members ?? []).includes(x.captive));
    const lawHere = !!chron()?.law?.trial?.card;
    const f = A.decideFate({kind: cap?.kind ?? "other", payer: num(own?.assets?.resources) > 0, swap: !!swap, lawHere, pc: !!a.hasPlayerOwner});
    if ( f.ask ) {
      await patch(p.captive, x => ({...x, fateAsked: now()}));
      await chron()?.propose?.({type: FATE, key: `fate:${p.captive}`, title: `${p.factionName || p.captorName || "The captors"}: ${p.name} to be ${f.words}`,
        detail: `${p.name} has been held a week at ${p.placeName}. The captors mean ${p.name} to be ${f.words}. Approve and it is done; reject and they are kept another week.`,
        data: {captive: p.captive, fate: f.fate, swap: swap?.captive ?? null}});
      return;
    }
    await doFate(p, f.fate, {swap: swap?.captive ?? null, tok});
  }
  async function doFate(p, fate, {swap = null, tok = null} = {}) {
    const a = game.actors.get(p.captive), cap = factionById(p.faction), own = factionOf(p.captive);
    tok ??= tokenOf(p.token, p.captive);
    if ( fate === "ransom" && own && cap ) await factions.applyNow?.([{op: "bg", faction: own.id, key: "resources", delta: -1}, {op: "bg", faction: cap.id, key: "resources", delta: 1}], {reason: `ransom for ${p.name}`}).catch(() => null);
    if ( fate === "trade" && swap ) { const o = prisonList().find(x => x.captive === swap && !x.freed); if ( o ) await setFree(o, tokenOf(o.token, o.captive), `${o.name} is given back in trade for ${p.name}.`); }
    if ( fate === "law" ) await chron()?.law?.trial?.card?.({actor: p.captive, name: p.name, region: regionOf(tok?.parent), deeds: [{deed: `handed over by ${p.factionName || p.captorName || "their captors"}`}]});
    if ( fate === "kill" && a ) {
      await setFree(p, null, `${p.name} is put to death by ${p.factionName || p.captorName || "their captors"}.`);
      await combat()?.applyDamage?.(a, "lethal", levels(a) + 1);
      return;
    }
    await setFree(p, tok, `${p.name} is ${A.FATES[fate] ?? "let go"}${fate === "ransom" && own ? `; ${own.name} pays` : ""}.`);
  }

  /** a11: on each faction turn, the prisoner's own faction may come for them. */
  async function onFactionTurn() {
    if ( !on() || !isActiveGM() ) return;
    for ( const p of prisonList().filter(x => !x.freed && !x.pc && !x.playersOn) ) {
      const own = factionOf(p.captive), cap = factionById(p.faction);
      if ( !own || own.id === p.faction ) continue;
      const r = A.rescueTry({retainers: own.assets?.retainers, herd: own.assets?.herd, security: cap?.assets?.security, guard: !!cap?.guard});
      if ( r.freed ) {
        await factions.applyNow?.([...(cap ? [{op: "standing", faction: cap.id, other: own.id, delta: -1}, {op: "standing", faction: own.id, other: cap.id, delta: -1}] : [])], {reason: `rescue of ${p.name}`}).catch(() => null);
        await setFree(p, tokenOf(p.token, p.captive), `${own.name} raids ${p.placeName} and takes ${p.name} back (${r.roll.dice.join(" ")} at ${r.roll.diff}).`);
      } else if ( r.botch ) {
        await factions.applyNow?.([{op: "bg", faction: own.id, key: "retainers", delta: -1}], {reason: `failed rescue of ${p.name}`}).catch(() => null);
        await card(`A rescue fails`, `<p>${esc(own.name)} tries to take ${esc(p.name)} back from ${esc(p.placeName)} and loses people in the attempt.</p>`);
      }
    }
    await soloRescue();
  }
  /** a12, Lone Chronicle: one who serves the lone player's character comes for them. */
  async function soloRescue() {
    if ( !game.modules.get("wodx-solo")?.active ) return;
    for ( const p of prisonList().filter(x => !x.freed && x.pc) ) {
      const friend = game.actors.find(a => !a.hasPlayerOwner && servesOf(a).includes(p.captive) && !prisonList().some(x => x.captive === a.id && !x.freed));
      if ( !friend ) continue;
      const cap = factionById(p.faction);
      const r = A.rescueTry({retainers: 1 + Math.floor((stat(friend, "attributes", "wits") + stat(friend, "abilities", "stealth")) / 2), security: cap?.assets?.security});
      if ( r.freed ) await setFree(p, tokenOf(p.token, p.captive), `${friend.name} comes for ${p.name} at ${p.placeName} and gets them out.`);
      else await card(`${friend.name} looks for a way in`, `<p>${esc(friend.name)} watches ${esc(p.placeName)} but finds no way to ${esc(p.name)} yet.</p>`, [...gmIds(), ...ownersOf(game.actors.get(p.captive))]);
    }
  }
  function servesOf(actor) {
    const f = actor?.flags ?? {}, id = v => (typeof v === "string" ? v.split(".").pop() : v?.id ?? null);
    return [...(Array.isArray(f[MOD]?.serves) ? f[MOD].serves.map(id) : []), id(f["wodx-chronicle"]?.bound?.actor), id(f["wodx-creation"]?.ally?.patron)].filter(Boolean);
  }

  /* ---------------- a12: a player's character held ---------------- */

  async function heldCard(a, p, {first = false} = {}) {
    if ( !p ) return;
    const b = (k, l) => `<button type="button" data-wnpc-held="${k}" data-actor="${esc(a.id)}">${esc(l)}</button>`;
    await card(first ? `${a.name} wakes a prisoner` : `${a.name}, still held`, `<p>${esc(a.name)} is tied at <b>${esc(p.placeName)}</b>, held by ${esc(p.factionName || p.captorName || "strangers")}.${p.bonds ? ` The bonds are looser (${p.bonds} of ${A.BONDS}).` : ""}</p><p>${b("escape", "Try the bonds")} ${b("talk", "Talk to the captors")} ${b("wait", "Wait")}</p>`,
      [...gmIds(), ...ownersOf(a)]);
  }
  async function heldChoice(actorId, choice, userName = "") {
    const a = game.actors.get(actorId), p = prisonList().find(x => x.captive === actorId && !x.freed);
    if ( !a || !p ) return;
    if ( choice === "escape" ) {
      if ( num(p.triedOn) && now() - num(p.triedOn) < A.DAY / 2 ) return card(`${a.name}`, `<p>${esc(a.name)} has tried the bonds tonight already.</p>`, [...gmIds(), ...ownersOf(a)]);
      const r = A.tryBonds(p.bonds, {dex: stat(a, "attributes", "dexterity"), larceny: stat(a, "abilities", "larceny"), str: stat(a, "attributes", "strength"), athletics: stat(a, "abilities", "athletics")});
      await patch(actorId, x => ({...x, bonds: r.progress, triedOn: now()}));
      if ( r.free ) return setFree(p, tokenOf(p.token, p.captive), `${a.name} works free of the bonds (${r.words}: ${r.roll.dice.join(" ")} at 7).`);
      return card(`${a.name} tries the bonds`, `<p>${r.words}: ${r.roll.dice.join(" ")} at 7. ${r.botch ? "The captors catch them at it and tie them again, tighter." : `Looser: ${r.progress} of ${A.BONDS}.`}</p>`, [...gmIds(), ...ownersOf(a)]);
    }
    if ( choice === "talk" ) {
      return chron()?.propose?.({type: TALK, key: `talk:${actorId}:${Math.floor(now() / A.DAY)}`, title: `${a.name} asks to talk to the captors`,
        detail: `${a.name}, held at ${p.placeName} by ${p.factionName || p.captorName || "strangers"}, wants to talk${userName ? ` (${userName})` : ""}. Approve and the Storyteller plays the talk; the captor comes to them.`,
        data: {actor: actorId}});
    }
    return card(`${a.name} waits`, `<p>${esc(a.name)} keeps still and watches the captors.</p>`, [...gmIds(), ...ownersOf(a)]);
  }

  /* ---------------- wiring ---------------- */

  function registerHandlers() {
    const reg = () => {
      const c = chron();
      c?.registerApprovalHandler?.(FATE, {label: "Captors decide a prisoner's fate",
        approve: async e => { const p = prisonList().find(x => x.captive === e.data?.captive && !x.freed); if ( p ) await doFate(p, e.data.fate, {swap: e.data.swap}); },
        reject: async e => patch(e.data?.captive, x => ({...x, fateAsked: null, since: now()}))});
      c?.registerApprovalHandler?.(BLOOD, {label: "A Cainite in torpor is woken with blood", approve: e => wakeWithBlood(e),
        reject: async e => { const l = get("wards").map(w => (w.actor === e.data?.actor && w.kind === "torpor" ? {...w, asked: null} : w)); await set("wards", l); }});
      c?.registerApprovalHandler?.(TALK, {label: "A prisoner asks to talk", approve: async e => {
        const p = prisonList().find(x => x.captive === e.data?.actor && !x.freed);
        await card(`The captors come to talk`, `<p>${esc(p?.captorName || p?.factionName || "A captor")} comes to hear ${esc(p?.name ?? "the prisoner")} out.</p>`, [...gmIds(), ...ownersOf(game.actors.get(e.data?.actor))]);
      }, reject: async () => null});
    };
    if ( chron()?.registerApprovalHandler ) reg(); else Hooks.once("wodxChronicleReady", reg);
  }
  function hooks() {
    Hooks.on("wodxBodyTaken", d => { onTaken(d).catch(e => console.error(`${MOD} | aftercare`, e)); });
    Hooks.on("updateWorldTime", () => { onClock().catch(e => console.error(`${MOD} | aftercare clock`, e)); });
    Hooks.on("wodxFactionTurn", () => { onFactionTurn().catch(e => console.error(`${MOD} | rescue`, e)); });
    // who hurt them last, for the family's grudge
    Hooks.on("wodxDamageApplied", (actor, d = {}) => {
      if ( !isActiveGM() || !d.attacker || !actor ) return;
      const att = game.actors.get(d.attacker) ?? fromUuidSync(String(d.attacker))?.actor ?? fromUuidSync(String(d.attacker));
      const base = baseOf(actor);
      if ( att?.id && att.id !== base?.id ) base.setFlag(MOD, "hurtBy", {id: baseOf(att).id, name: att.name, worldTime: now()}).catch(() => null);
    });
    Hooks.on("renderChatMessageHTML", (msg, el) => {
      for ( const btn of el.querySelectorAll?.("[data-wnpc-held]") ?? [] ) btn.addEventListener("click", ev => {
        ev.preventDefault();
        const k = btn.dataset.wnpcHeld, id = btn.dataset.actor;
        if ( isActiveGM() ) heldChoice(id, k, game.user.name);
        else game.socket.emit(`module.${MOD}`, {type: "aftercare.held", actor: id, choice: k, userId: game.user.id});
      });
    });
    Hooks.once("ready", () => game.socket?.on?.(`module.${MOD}`, m => {
      if ( m?.type !== "aftercare.held" || !isActiveGM() ) return;
      const u = game.users.get(m.userId), a = game.actors.get(m.actor);
      if ( u && a?.testUserPermission?.(u, "OWNER") ) heldChoice(m.actor, m.choice, u.name);
    }));
  }

  /** One day for every ward and prisoner, as the clock would run it (WoDX's gates use it so the clock stays put). */
  async function day(t = now()) { await set("wards", await wardDays(get("wards"), 1, A.DAY)); await prisonDay(t); }

  return {registerSettings, registerHandlers, hooks, onTaken, onClock, onFactionTurn, heldChoice, doFate, dispose, tend, funeral, day, wards: () => get("wards"),
    stores: () => foundry.utils.deepClone(game.settings.get(MOD, "stores") ?? {}), rules: A};
}
