/**
 * WoDX Actions (Servants and Bonds Desk, B5112-B5119): the actions that make servants, on WoDX NPC's one ledger
 * (api.servants). Rules in servant-actions-rules.js.
 *   condition(actor)      v1  Dominate Conditioning on the targeted token, once a scene (the tally is the Storyteller's)
 *   enchant(actor)        c1  a changeling pours Glamour into a mortal; a point a day runs out, then it is a dream
 *   partedMists(actor)    c1  the lasting Enchantment, with the Storyteller's approval
 *   onAttack(...)         c2  attacking someone an oath binds you to breaks it; the price applies after approval
 *   pact(actor)           d1  a demon seals a pact with the targeted mortal: thrall entry, gifts on the sheet, sigil
 *   useGift(actor)        d1  a thrall uses a pact gift: Willpower at its difficulty
 *   names(actor)          d2  the Celestial and True Names a character knows; evocations read them
 *   pressName(actor)      d2  summon and press a demon by its True Name (Storyteller's approval)
 *   chainThrall(actor)    r1  a wraith holds another as a Thrall, chained in Stygian steel or not
 *   onEffect(...)         r2  a Puppeteer riding the same mortal again makes them a consort
 * Every change that needs the Storyteller goes through Chronicle's approvals, and approving does it.
 */
import * as R from "./servant-actions-rules.js";

const MOD = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));
const T_MISTS = "wodx-actions.partedMists", T_OATH = "wodx-actions.oathBroken", T_PACT = "wodx-actions.pact", T_PRESS = "wodx-actions.pressName";

export function build(ctx) {
  const {post, dialog, rollPool, rollBlock, notify, kindOf, dm, dx} = ctx;
  const S = () => game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api?.servants ?? null : null;
  const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
  const activeGM = () => game.user.isGM && game.users.activeGM?.id === game.user.id;
  const target = () => [...(game.user.targets ?? [])][0]?.actor ?? null;
  const needS = () => { const s = S(); if ( !s ) notify("Servants and bonds need WoDX NPC."); return s; };
  const gp = a => a?.system?.advantages?.glamour ?? {};
  const wp = a => a?.system?.advantages?.willpower ?? {};

  /* v1: Dominate Conditioning */
  async function condition(actor) {
    const s = needS(), t = target();
    if ( !s ) return null;
    if ( !t || t.id === actor.id ) return notify("Target the one to condition first.");
    const content = `<form><p>${esc(actor.name)} works on ${esc(t.name)}: Charisma + Leadership at ${esc(t.name)}'s current Willpower, once a scene (V20 pp. 162 to 163). Only the Storyteller sees the tally.</p>
      <div class="form-group"><label>${esc(t.name)} is</label><select name="nature" data-fixed><option value="">ordinary (7 times Self-Control)</option><option value="yielding">yielding (5 times)</option><option value="wilful">wilful (10 times)</option></select></div></form>`;
    return dialog(`Conditioning: ${actor.name}`, content, "Condition", async fd => s.condition(actor, t, {nature: fd.nature || ""}));
  }

  /* c1: Enchantment */
  async function enchant(actor) {
    const s = needS(), t = target();
    if ( !s ) return null;
    if ( !t || t.id === actor.id ) return notify("Target the mortal to enchant first.");
    const have = n(gp(actor).temporary);
    if ( have < 1 ) return notify(`${actor.name} has no Glamour to give.`);
    const content = `<form><p>${esc(actor.name)} breathes Glamour into ${esc(t.name)}, who sees the Dreaming until it runs out, a point a day (C20 p. 461 of the pdf).</p>
      <div class="form-group"><label>Glamour to give (of ${have})</label><input type="number" name="g" min="1" max="${have}" value="1"/></div></form>`;
    return dialog(`Enchant: ${actor.name}`, content, "Enchant", async fd => {
      const g = Math.max(1, Math.min(have, n(fd.g)));
      await actor.update({"system.advantages.glamour.temporary": have - g});
      const data = {glamour: g, day: R.dayOf(game.time.worldTime), lasting: false};
      const rec = await s.bind(t, actor, "enchant", {step: R.enchantStep(data), data});
      return post(actor, `${actor.name} enchants ${t.name}`, `<div class="vta-res good">${esc(t.name)} sees the Dreaming: ${g} Glamour, a point gone each day.${rec?.waiting ? " The Storyteller approves it." : ""}</div><div class="wodx-quiet">C20 Appendix II</div>`);
    });
  }
  async function partedMists(actor) {
    const s = needS(), t = target();
    if ( !s ) return null;
    if ( !t || t.id === actor.id ) return notify("Target the mortal first.");
    const fae = game.actors.filter(a => a.id !== t.id && kindOf(a) === "fae" && (a.id === actor.id || canvas?.scene?.tokens?.some(x => x.actorId === a.id)));
    const content = `<form><p>The Ritual of Parted Mists: the changelings here pour Glamour into ${esc(t.name)} for an Enchantment that lasts until all of it is spent or stolen.</p>
      ${fae.map(a => `<div class="form-group"><label>${esc(a.name)} (${n(gp(a).temporary)})</label><input type="number" name="g-${a.id}" min="0" max="${n(gp(a).temporary)}" value="${a.id === actor.id ? 1 : 0}"/></div>`).join("")}</form>`;
    return dialog(`The Parted Mists: ${t.name}`, content, "Begin", async fd => {
      const givers = fae.map(a => ({id: a.id, glamour: Math.min(n(gp(a).temporary), n(fd[`g-${a.id}`]))}));
      const pm = R.partedMists(givers);
      if ( !pm.ok ) return notify(`The Parted Mists: ${pm.why}.`);
      const data = {target: t.id, lead: actor.id, givers: givers.filter(g => g.glamour > 0)};
      if ( activeGM() ) return applyMists(data);
      await chron()?.propose?.({type: T_MISTS, key: `mists:${t.id}`, title: `The Parted Mists: ${t.name}`, detail: `${pm.total} Glamour from ${data.givers.length} changelings. Approving spends it and makes the Enchantment lasting.`, data});
      return post(actor, `The Parted Mists for ${t.name}`, `<div class="vta-note">Waiting for the Storyteller.</div>`);
    });
  }
  async function applyMists(d) {
    const t = game.actors.get(d.target), lead = game.actors.get(d.lead);
    if ( !t || !lead ) return null;
    let total = 0;
    for ( const g of d.givers ?? [] ) {
      const a = game.actors.get(g.id); if ( !a ) continue;
      const have = n(gp(a).temporary), give = Math.min(have, n(g.glamour));
      total += give;
      await a.update({"system.advantages.glamour.temporary": have - give});
    }
    await S()?.bind?.(t, lead, "enchant", {step: 3, data: {glamour: total, lasting: true, day: R.dayOf(game.time.worldTime)}});
    return post(lead, `The Parted Mists: ${t.name}`, `<div class="vta-res good">${esc(t.name)} is enchanted for good (${total} Glamour). Only spending or stealing all of it ends it.</div>`);
  }
  /** The daily clock: each temporary Enchantment loses a point a day, then becomes a dream (GM). */
  async function enchantDaily() {
    if ( !activeGM() ) return;
    const today = R.dayOf(game.time.worldTime);
    for ( const a of game.actors ) {
      for ( const [key, rec] of Object.entries(a.flags?.["wodx-npc"]?.held ?? {}) ) {
        if ( rec?.kind !== "enchant" || rec.data?.lasting ) continue;
        const left = R.enchantLeft(rec.data, today);
        if ( left.glamour === n(rec.data?.glamour) && !left.ended ) continue;
        if ( left.ended ) {
          await S()?.unbind?.(a, rec.master, "enchant");
          try { await ctx.kx?.().setWitnessState?.(a, "dream", "after Enchantment"); } catch (e) { /* no record */ }
          await ChatMessage.create({speaker: {alias: "The Dreaming"}, whisper: game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id),
            content: `<div class="vta-card wodx-x"><div class="vta-body"><p><b>${esc(a.name)} wakes from the Dreaming</b></p><p>The Glamour is gone. What ${esc(a.name)} saw now feels like a dream.</p></div></div>`});
        } else await a.update({[`flags.wodx-npc.held.${key}.data`]: {...rec.data, glamour: left.glamour, day: today}, [`flags.wodx-npc.held.${key}.step`]: R.enchantStep({glamour: left.glamour})});
      }
    }
  }

  /* c2: an attack breaks an oath */
  async function onAttack(attacker, {target: tgt} = {}) {
    if ( !activeGM() || !attacker || !tgt ) return;
    const list = attacker.getFlag?.(MOD, "c20oaths") ?? [];
    const k = R.oathHarmed(list, tgt.name);
    if ( k < 0 ) return;
    const o = list[k];
    await chron()?.propose?.({type: T_OATH, key: `oath:${attacker.id}:${k}`, title: `${attacker.name} breaks an oath`,
      detail: `${attacker.name} attacked ${tgt.name}, whom an oath binds them to (${o.terms}). Approving breaks it and the oath's price applies.`, data: {actor: attacker.id, k}});
  }
  async function applyOath(d) {
    const a = game.actors.get(d.actor);
    if ( !a ) return null;
    const r = await dm().breakOath(a, n(d.k), {willing: true});
    try { chron()?.tokenLooks?.refresh?.(); } catch (e) { /* none */ }
    return r;
  }
  /** The oathbreaker's mark on the token: a dark ring all can see (C20 p. 188). */
  const oathLook = tok => {
    const list = tok?.actor?.getFlag?.(MOD, "c20oaths") ?? [];
    return list.some(o => o?.broken && o.willing !== false) ? {aura: {color: 0x40205a, alpha: 0.35, radius: 0.55}} : null;
  };

  /* d1: pacts */
  async function pact(actor) {
    const t = target();
    if ( !t || t.id === actor.id ) return notify("Target the mortal who will make the pact.");
    const D = dx().rules;
    const guess = R.potentialGuess({trueFaith: n(t.system?.advantages?.faith?.permanent ?? t.items?.find?.(i => /true faith/i.test(i.name))?.system?.value), set: t.getFlag?.(MOD, "faithPotential")});
    const content = `<form><p>${esc(actor.name)} offers ${esc(t.name)} a pact (Demon: The Fallen pp. 251 to 253).</p>
      <div class="form-group"><label>Terms</label><input type="text" name="terms" placeholder="what each side gives"/></div>
      <div class="form-group"><label>Faith potential</label><select name="pot" data-fixed>${D.POTENTIAL.map((t2, k) => `<option value="${k}"${k === guess ? " selected" : ""}>${k}: ${esc(t2)}</option>`).join("")}</select></div>
      <fieldset><legend>Gifts the potential buys</legend>${D.GIFTS.map(g => `<div class="form-group"><label><input type="checkbox" name="g-${g.k}"/> ${esc(g.label)}</label>${g.k === "evocation" ? ` <input type="number" name="lvl" min="1" max="5" value="1"/>` : g.k === "offering" ? ` <input type="number" name="pts" min="0" max="3" value="1"/>` : ""}</div>`).join("")}</fieldset></form>`;
    return dialog(`A pact: ${actor.name} and ${t.name}`, content, "Seal it", async fd => {
      const pot = Math.max(0, Math.min(5, n(fd.pot)));
      if ( !pot ) return notify(`${t.name} is spiritually dead: no pact is possible.`);
      const picks = D.GIFTS.filter(g => fd[`g-${g.k}`]).map(g => ({k: g.k, level: n(fd.lvl), points: n(fd.pts)}));
      const cost = D.giftsCost(pot, picks);
      if ( !cost.ok ) return notify(`Those gifts cost ${cost.spent}; ${t.name}'s potential is ${pot}.`);
      const data = {demon: actor.id, thrall: t.id, potential: pot, terms: String(fd.terms || "").trim(), picks, offered: picks.find(p => p.k === "offering")?.points ?? 0};
      if ( activeGM() ) return applyPact(data);
      await chron()?.propose?.({type: T_PACT, key: `pact:${actor.id}:${t.id}`, title: `A pact: ${actor.name} and ${t.name}`, detail: `Potential ${pot}; gifts: ${picks.map(p => p.k).join(", ") || "none"}. Approving seals it.`, data});
      return post(actor, `${actor.name} offers a pact`, `<div class="vta-note">Waiting for the Storyteller.</div>`);
    });
  }
  async function applyPact(d) {
    const demon = game.actors.get(d.demon), t = game.actors.get(d.thrall);
    if ( !demon || !t ) return null;
    const f = demon.getFlag(MOD, "demon") ?? {};
    const linked = R.linkThralls(f.thralls ?? [], game.actors.contents ?? [...game.actors]);
    const entry = R.thrallEntry({name: t.name, actorId: t.id, potential: d.potential, offered: d.offered, willpower: n(wp(t).permanent) || 3, terms: d.terms, gifts: d.picks});
    const i = linked.findIndex(x => x.actorId === t.id);
    if ( i >= 0 ) linked[i] = {...linked[i], ...entry}; else linked.push(entry);
    await demon.setFlag(MOD, "demon", {...f, thralls: linked, lastDawn: f.lastDawn ?? Math.floor(((game.time?.worldTime ?? 0) - 6 * 3600) / 86400)});
    const items = R.giftItems(d.picks, {demon: demon.name});
    if ( items.length ) await t.createEmbeddedDocuments("Item", items);
    await t.setFlag(MOD, "faithPotential", d.potential);
    await S()?.bind?.(t, demon, "pact", {step: 2, data: {potential: d.potential}});
    return post(demon, `A pact sealed: ${t.name}`, `<div class="vta-res good">${esc(t.name)} is ${esc(demon.name)}'s thrall: potential ${d.potential}, ${entry.offered} Faith each dawn${items.length ? `; ${items.length} gift${items.length === 1 ? "" : "s"} on the sheet` : ""}.</div><div class="wodx-quiet">Demon: The Fallen pp. 251 to 253</div>`);
  }
  async function useGift(actor) {
    const gifts = actor.items.filter(i => i.flags?.[MOD]?.pactGift?.diff);
    if ( !gifts.length ) return notify(`${actor.name} has no pact gift to use.`);
    const content = `<form><div class="form-group"><label>Gift</label><select name="g" data-fixed>${gifts.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join("")}</select></div></form>`;
    return dialog(`A pact gift: ${actor.name}`, content, "Use", async fd => {
      const g = actor.items.get(fd.g), diff = n(g?.flags?.[MOD]?.pactGift?.diff) || 7;
      const r = await rollPool(n(wp(actor).temporary ?? wp(actor).permanent) || n(wp(actor).permanent), diff);
      return post(actor, `${actor.name} calls on a pact gift`, rollBlock(`Willpower at ${diff}`, r) + `<div class="vta-res ${r.successes > 0 ? "good" : ""}">${esc(g.name)}: ${r.successes > 0 ? "it answers" : "nothing comes"}.</div><div class="wodx-quiet">Demon: The Fallen p. 253</div>`, [r.roll].filter(Boolean));
    });
  }

  /* d2: names */
  const namesOf = a => a?.getFlag?.(MOD, "names") ?? [];
  const demons = () => game.actors.filter(a => { try { return dx().isDemon(a); } catch (e) { return false; } });
  async function names(actor) {
    const list = namesOf(actor), ds = demons().filter(d => d.id !== actor.id);
    const rows = list.map((x, k) => `<div class="form-group" data-search-item><label><input type="checkbox" name="drop-${k}"/> Forget</label> ${esc(x.demonName)}: the ${x.kind === "true" ? "True" : "Celestial"} Name</div>`).join("");
    const content = `<form><p>The names ${esc(actor.name)} knows. Evocations reaching by a name use the best one known (Demon: The Fallen pp. 132, 171).</p>${rows || "<p>No names known.</p>"}
      ${ds.length ? `<fieldset><legend>Learn a name</legend><div class="form-group"><label>Demon</label><select name="d"><option value="">none</option>${ds.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("")}</select></div>
      <div class="form-group"><label>Which</label><select name="k" data-fixed><option value="celestial">the Celestial Name</option><option value="true">the True Name</option></select></div></fieldset>` : ""}</form>`;
    return dialog(`Names known: ${actor.name}`, content, "Save", async fd => {
      let next = list.filter((x, k) => !fd[`drop-${k}`]);
      const d = game.actors.get(fd.d);
      if ( d ) next = [...next.filter(x => !(x.demonId === d.id && x.kind === fd.k)), {demonId: d.id, demonName: d.name, kind: fd.k === "true" ? "true" : "celestial", at: game.time.worldTime}];
      await ctx.setFlag(actor, "names", next);
      return post(actor, `${actor.name}'s names`, `<div class="vta-sec">${next.length ? next.map(x => `${esc(x.demonName)}: ${x.kind === "true" ? "True" : "Celestial"} Name`).join("<br>") : "None."}</div>`);
    });
  }
  /** The difficulty an evocation reaches its target by, with the names this actor knows; null when the card names none. */
  function nameDifficulty(actor, cardText, targetActor) {
    const t = R.nameDifficulties(cardText);
    if ( !t ) return null;
    if ( targetActor && t.thrall && (actor.getFlag?.(MOD, "demon")?.thralls ?? []).some(x => x.actorId === targetActor.id && !x.broken) ) return {difficulty: t.thrall, by: "own thrall"};
    const b = targetActor ? R.bestName(namesOf(actor), targetActor.id) : null;
    if ( b?.kind === "true" ) return {difficulty: t.true, by: "the True Name"};
    if ( b?.kind === "celestial" ) return {difficulty: t.celestial, by: "the Celestial Name"};
    return {difficulty: t.mundane || 8, by: "a mundane name"};
  }
  async function pressName(actor) {
    const known = namesOf(actor).filter(x => x.kind === "true" && game.actors.get(x.demonId));
    if ( !known.length ) return notify(`${actor.name} knows no True Name.`);
    const content = `<form><p>Calling a demon by its True Name draws it and presses it to obey: Willpower against its Willpower, both at 6 (a house reading; the Storyteller rules on what it is made to do).</p>
      <div class="form-group"><label>Demon</label><select name="d" data-fixed>${known.map(x => `<option value="${x.demonId}">${esc(x.demonName)}</option>`).join("")}</select></div>
      <div class="form-group"><label>The command</label><input type="text" name="cmd"/></div></form>`;
    return dialog(`By the True Name: ${actor.name}`, content, "Call", async fd => {
      const data = {caller: actor.id, demon: fd.d, cmd: String(fd.cmd || "").trim(), scene: canvas?.scene?.id ?? null};
      if ( activeGM() ) return applyPress(data);
      await chron()?.propose?.({type: T_PRESS, key: `press:${actor.id}:${fd.d}`, title: `${actor.name} calls ${game.actors.get(fd.d)?.name} by the True Name`, detail: `Approving brings the demon beside the caller and rolls the contest.`, data});
      return post(actor, `${actor.name} speaks a True Name`, `<div class="vta-note">Waiting for the Storyteller.</div>`);
    });
  }
  async function applyPress(d) {
    const me = game.actors.get(d.caller), dem = game.actors.get(d.demon);
    if ( !me || !dem ) return null;
    const sc = game.scenes.get(d.scene) ?? canvas?.scene;
    const mine = sc?.tokens?.find?.(t => t.actorId === me.id);
    if ( sc && mine && !sc.tokens.some(t => t.actorId === dem.id) ) {
      const td = (await dem.getTokenDocument({x: mine.x + (sc.grid?.size ?? 100), y: mine.y})).toObject();
      await sc.createEmbeddedDocuments("Token", [td]);
      S()?.flashBetween?.("pact", me, dem);
    }
    const a = await rollPool(n(wp(me).permanent), 6), b = await rollPool(n(wp(dem).permanent), 6);
    const out = R.pressResult(a.successes, b.successes);
    return post(me, `${me.name} calls ${dem.name} by the True Name`, rollBlock(`${me.name}: Willpower`, a) + rollBlock(`${dem.name}: Willpower`, b)
      + `<div class="vta-res ${out === "yields" ? "good" : "bad"}">${esc(dem.name)} ${out === "yields" ? "yields" : out === "holds" ? "comes, but holds firm" : "comes, and refuses"}${d.cmd ? `: ${esc(d.cmd)}` : ""}.</div><div class="wodx-quiet">Demon: The Fallen pp. 132, 172 to 176 (the command roll is a house reading)</div>`, [a.roll, b.roll].filter(Boolean));
  }

  /* r1: Thralls */
  async function chainThrall(actor) {
    const s = needS(), t = target();
    if ( !s ) return null;
    if ( !t || t.id === actor.id ) return notify("Target the wraith to hold as a Thrall.");
    const content = `<form><p>${esc(actor.name)} holds ${esc(t.name)} as a Thrall.</p>
      <div class="form-group"><label><input type="checkbox" name="chained" checked/> Chained in Stygian steel (cannot flee or refuse an ordinary order)</label></div></form>`;
    return dialog(`A Thrall: ${actor.name}`, content, "Bind", async fd => {
      const rec = await s.bind(t, actor, "thrall", {step: R.thrallStep(!!fd.chained), data: {chained: !!fd.chained}});
      return post(actor, `${actor.name} takes a Thrall`, `<div class="vta-res">${esc(t.name)} serves ${esc(actor.name)}${fd.chained ? ", chained" : " from fear, and can run"}.${rec?.waiting ? " The Storyteller approves it." : ""}</div><div class="wodx-quiet">Wraith 20th p. 88</div>`);
    });
  }

  /* r2: Puppeteer consorts */
  async function onEffect(item, rec, casterName) {
    if ( !activeGM() || item?.key !== "possess" ) return;
    const cu = item.casterUuid ?? item.caster;
    const cd = cu ? await fromUuid(cu).catch(() => null) : null;
    const caster = cd?.actor ?? (cd?.documentName === "Actor" ? cd : null) ?? game.actors.getName?.(casterName);
    const tDoc = item.target ? await fromUuid(item.target).catch(() => null) : null;
    const mortal = tDoc?.actor ?? tDoc;
    if ( !caster || !mortal || caster.id === mortal.id || kindOf(caster) !== "wraith" || kindOf(mortal) === "wraith" ) return;
    const rides = caster.getFlag(MOD, "rides") ?? {};
    const c = R.rideCount(rides[mortal.id]);
    await caster.setFlag(MOD, "rides", {...rides, [mortal.id]: c.rides});
    if ( c.consort ) await S()?.bind?.(mortal, caster, "consort", {step: Math.min(3, c.rides - 1), data: {rides: c.rides}, quiet: c.rides > R.CONSORT_AT});
  }
  /** The easier ride: one less difficulty for a Puppeteer on a consort from the fourth ride (house reading). */
  const rideEase = (caster, mortal) => R.rideCount(n((caster?.getFlag?.(MOD, "rides") ?? {})[mortal?.id]) - 1).easier;

  function registerHandlers() {
    const reg = chron()?.registerApprovalHandler;
    if ( !reg ) return;
    reg(T_MISTS, {label: "The Parted Mists", approve: e => applyMists(e.data ?? {})});
    reg(T_OATH, {label: "Oaths broken by an attack", approve: e => applyOath(e.data ?? {})});
    reg(T_PACT, {label: "Demon pacts", approve: e => applyPact(e.data ?? {})});
    reg(T_PRESS, {label: "A demon called by its True Name", approve: e => applyPress(e.data ?? {})});
    try { chron()?.tokenLooks?.register?.("wodx-actions.oathbreaker", oathLook); } catch (e) { /* no looks */ }
  }

  return {condition, enchant, partedMists, applyMists, enchantDaily, onAttack, applyOath, pact, applyPact, useGift, names, nameDifficulty, pressName, applyPress,
    chainThrall, onEffect, rideEase, registerHandlers, rules: R};
}
