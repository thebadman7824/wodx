#!/usr/bin/env node
/**
 * Every power WoDX lists, and what using it does in play (powers pass, 14 November 2026).
 *
 *   node tools/powers/inventory.mjs [--out file.json] [--summary]
 *
 * Status of each power:
 *   applies  its own roll puts an effect on the effects card that changes the game (health, pools, a condition, a
 *            timed effect, a token move), with Undo or through the approval queue
 *   card     using it shows what it does (effect, cost, page) but nothing is applied
 *   roll     it can be rolled and its cost is spent, but the card says nothing about what it does
 *   st       the Storyteller can apply it from the effect window, but the caster's own roll does not
 *   none     listed in WoDX's data, with no roll of its own and no effect text, or a whole list WoDX lacks
 * kw: the power already has effect keywords (power-keywords*.js), so wiring is the missing step.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const A = p => pathToFileURL(path.join(ROOT, "modules/wodx-actions", p)).href;
const J = p => JSON.parse(fs.readFileSync(path.join(ROOT, "modules/wodx-actions/data", p), "utf8"));

const E = await import(A("scripts/effects-rules.js"));
const PK = await import(A("scripts/power-keywords.js"));
const PE = await import(A("scripts/path-effects.js"));
const DAE = await import(A("scripts/mage-da-effects.js"));
const BR = await import(A("scripts/book-rituals.js"));
const D = await import(A("scripts/demon-rules.js"));
const DE = await import(A("scripts/demon-evocations.js"));
const H = await import(A("scripts/hunter-rules.js"));
const R = await import(A("scripts/reckoning-rules.js"));
const O = await import(A("scripts/orpheus-rules.js"));
const OS = await import(A("scripts/orpheus-stains.js"));
const OX = await import(A("scripts/orpheus-spectres.js"));
const KA = await import(A("scripts/kote-arts.js"));
const F = await import(A("scripts/fae-da-rules.js"));
const MD = await import(A("scripts/mage-da-rules.js"));
const M20 = await import(A("scripts/m20-rules.js"));
const M20R = await import(A("scripts/m20-rotes.js"));
const MU = await import(A("scripts/mummy-rules.js"));
const C20 = await import(A("scripts/c20-rules.js"));
const CA = await import(A("scripts/c20-arts.js"));
const MH = await import(A("scripts/mummy-hekau.js"));
const OH = await import(A("scripts/orpheus-horrors.js"));
const CB = await import(pathToFileURL(path.join(ROOT, "modules/wodx-combat/scripts/rules.js")).href);

/** Keywords that only tell the user something; they do not change the game. B5788-B5790: Sense lays a detection sense on the
 * token, Know finds out a secret or pins a clue, and Speak opens talk with beasts and ghosts, so none is only a card now. */
const INFO = new Set([]);
const applyingKw = (ks = []) => ks.map(k => String(k).split(":")[0]).some(k => E.KEYWORDS[k] && E.KEYWORDS[k].tier !== "st" && !INFO.has(k));
/** B4820: a Summon applies whatever its spec kind, since the effects card turns it into a summoning with its own rules. */
// B6854: a note on Know, Sense or Speak gives that keyword's own result (mage-da-effects outcomesOf)
// B6856: a Storyteller's spec on a working keyword gives that keyword's result too
const applyingSpec = s => !!s && (Array.isArray(s) ? s.some(x => applyingSpec(x)) : (!["note", "st"].includes(s.kind) || s.kw === "summon" || (s.kind === "note" && ["know", "sense", "speak"].includes(s.kw))
  || (s.kind === "st" && E.KEYWORDS[s.kw] && E.KEYWORDS[s.kw].tier !== "st" && !["free", "time"].includes(s.kw))));
/** Keywords a power used with no roll applies (its Harm readies the user; the attack roll deals it, B3751). */
const noRollKw = (ks = []) => applyingKw(ks.map(k => k === "harm" ? "boost" : k));
/** Always-on Disciplines WoDX Combat reads by rating: soak, damage dice and extra actions or speed. */
const COMBAT_READS = new Set(["Celerity", "Fortitude", "Potence"]);
const slug = s => PK.slugOf ? PK.slugOf(s) : String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const rows = [];
/** Every string in a power's own data, for --text (the world sweep, tools/powers/world-sweep.mjs). */
const WANT_TEXT = process.argv.includes("--text");
const textOf = (v, depth = 0) => v == null || depth > 4 ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(x => textOf(x, depth + 1)).join(" ")
  : typeof v === "object" ? Object.values(v).map(x => textOf(x, depth + 1)).join(" ") : "";
// B6855: story names why a power puts nothing on the card (read on its page): no system, or the Storyteller's alone
const add = (line, group, name, o = {}) => rows.push({ line, group, name, status: o.status ?? "none", kw: o.kw ?? [], page: o.page ?? "", how: o.how ?? "", passive: !!o.passive, ...(o.story ? { story: o.story } : {}),
  ...(WANT_TEXT ? { text: textOf(o.src).replace(/\s+/g, " ").trim() } : {}) }) && Object.defineProperty(rows.at(-1), "src", { value: o.src, enumerable: false });

/* -- Vampire: V20 Dark Ages Disciplines (kindred.js Use a Discipline) */
const disc = J("disciplines-daw.json").powers;
const daNames = new Map(disc.map(p => [slug(String(p.n).replace(/[’']/g, "")), p]));
const v20Lib = new Map(J("disciplines-v20.json").powers.map(p => [p.kw, p]));
for ( const p of disc ) {
  const kw = PK.keywordsOf("disc", p.id);
  const path = PE.PATH_EFFECTS[p.id];
  const passive = !!kw?.passive || !!p.passive, combat = passive && COMBAT_READS.has(p.d);
  let status = combat ? "applies" : path ? (applyingSpec(path) ? "applies" : "card")
    : (kw && (passive || !p.r ? noRollKw(kw.keywords) : applyingKw(kw.keywords)) ? "applies" : "card");
  add("Vampire (Dark Ages)", p.d, p.n, { src: p, status, story: status === "card" ? PE.PATH_STORY?.[p.id] : undefined, kw: kw?.keywords ?? (path ? [path.kw] : []), page: `VtDA20 p. ${p.p ?? "?"}`, passive,
    how: combat ? "WoDX Combat reads the rating (soak, damage dice, actions and speed)" : path && p.r ? "path magic effect spec" : p.r ? "Discipline roll, keywords, timed effect on the token" : "no roll: one success, keywords and timed effect on the token" });
}
/* -- Vampire: V20 (modern) Disciplines: the same window when a Dark Ages power has the name, else the system roll */
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.v20) ) {
  const da = daNames.get(id), v = v20Lib.get(id);
  const kwA = e.p ? noRollKw(e.k) : applyingKw(e.k); // B6853: a passive power picked from the menu turns on
  add("Vampire (V20)", v ? v.d : "Disciplines", e.n, { src: [e, v, da], status: da || v ? (kwA ? "applies" : "card") : "roll", kw: e.k, passive: !!e.p, page: v ? `V20 p. ${v.p}` : "V20",
    how: v ? "V20 library entry (data/disciplines-v20.json): Use a Discipline card, roll and keywords" : da ? "matches a Dark Ages power by name: same window" : "system roll only: no V20 entry in the Discipline library" });
}
/* -- Werewolf: Dark Ages Gifts (garou.js) */
for ( const g of J("gifts-daw.json").gifts ) {
  const kw = PK.keywordsOf("gift", g.id);
  add("Werewolf (Dark Ages)", "Gifts", g.n, { src: g, status: kw && (kw.passive || !g.r ? noRollKw(kw.keywords) : applyingKw(kw.keywords)) ? "applies" : "card", kw: kw?.keywords ?? [], passive: !!kw?.passive, page: `DA:W p. ${g.p}`, how: "Gift roll, keywords, timed effect" });
}
const daGift = new Set(J("gifts-daw.json").gifts.map(g => slug(g.n)));
/* -- Werewolf: W20 Gifts (garou.js reads data/gifts-w20.json by name: pool, cost, duration, effect and page) */
const w20Lib = new Map(J("gifts-w20.json").gifts.map(g => [g.kw, g]));
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.w20) ) {
  if ( daGift.has(id) ) continue;
  const g = w20Lib.get(id);
  add("Werewolf (W20)", "Gifts", e.n, { src: [e, g], status: (e.p ? noRollKw(e.k) : applyingKw(e.k)) ? "applies" : g ? "card" : "roll", kw: e.k, passive: !!e.p, page: g ? `W20 p. ${g.p}` : "W20",
    how: g ? "W20 library entry (data/gifts-w20.json): Use a Gift card, pool, cost, duration and keywords" : "Gift roll from the item's dice; keywords by name; no effect text" });
}
/* -- Wraith: W20 and The Great War Arcanoi (wraith.js shows the effect line; keywords not wired) */
for ( const [file, set, line] of [["arcanoi-w20.json", "wraith", "Wraith (W20)"], ["arcanoi-gw.json", "greatwar", "Wraith (Great War)"]] ) {
  for ( const a of Object.values(J(file).arts) ) {
    const kw = PK.keywordsOf(set, a.id);
    // B6731: an art with no roll counts one success (its Harm readies the user), as a Discipline with none does
    const st = kw && (kw.passive || !a.r ? noRollKw(kw.keywords) : applyingKw(kw.keywords)) ? "applies" : a.e ? "card" : "roll";
    add(line, a.d, a.n, { src: a, status: st, kw: kw?.keywords ?? [], passive: !!kw?.passive, page: `p. ${a.p}`, how: a.r ? "Arcanos roll and cost, effect line, keywords on the effects card (B3740)" : "no roll: one success, keywords on the effects card (B6731)" });
  }
}
/* -- Mage: M20 Spheres (Cast window with keywords) */
for ( const s of M20.SPHERES ) for ( let l = 1; l <= 5; l++ )
  add("Mage (M20)", "Spheres", `${s[0].toUpperCase() + s.slice(1)} ${l}`, { src: null, status: "applies", page: "M20", how: "Cast window: keywords, spend plan, Undo" });
/* -- Mage: M20 rotes, Adjustments and Procedures of the core book (B7836): Cast window presets */
for ( const r of M20R.ROTES ) add("Mage (M20)", "Rotes (core book)", r.name, { src: r, status: applyingKw(r.keywords) ? "applies" : "card", story: applyingKw(r.keywords) ? undefined : M20R.STORY[r.id], kw: r.keywords, page: `M20 ${r.page}`, how: "Cast window: the rote fills in its Spheres, keywords and kind" });
/* -- Mage: Dark Ages rotes (mage-da.js) */
for ( const r of MD.ROTES ) {
  const s = DAE.DA_EFFECTS[r.id];
  add("Mage (Dark Ages)", r.f, r.name, { src: [r, s], status: applyingSpec(s) ? "applies" : "card", story: applyingSpec(s) ? undefined : DAE.DA_STORY?.[r.id], kw: s?.kw ? [s.kw] : [], page: `p. ${r.page}`, how: s ? `rote effect spec (${s.kind})` : "rote text only" });
}
/* -- Changeling: C20 Arts (cantrip roll by Art and level; no power names, no effect text) */
for ( const [id, c] of Object.entries(CA.CANTRIPS) ) {
  const st = c.dice || (applyingSpec(c.spec) && !INFO.has(c.spec.kw) && E.KEYWORDS[c.spec.kw]?.tier !== "st") ? "applies" : "card";
  add("Changeling (C20)", C20.ARTS[c.art].label, `${"•".repeat(c.level)} ${c.name}`, { src: c, status: st, story: st === "card" ? CA.ART_STORY?.[id] : undefined, kw: c.spec?.kw ? [c.spec.kw] : [], page: `C20 p. ${C20.ARTS[c.art].page}`,
    how: `named in Cast a cantrip: card (effect, duration, type)${st === "applies" ? `; effects card ${c.dice ? "damage dice" : c.spec.kind}` : ""}` });
}
/* -- Changeling: Dark Ages Fae (cantrips by Dominion and level; B6550: every named cantrip of the four Dominions) */
const specList = sp => (Array.isArray(sp) ? sp : sp ? [sp] : []);
const anyApplying = sp => specList(sp).some(x => applyingSpec(x) && E.KEYWORDS[x.kw]?.tier !== "st" && x.kw !== "free");
for ( const [id, d] of Object.entries(F.DOMINIONS) ) for ( let l = 1; l <= 5; l++ )
  add("Fae (Dark Ages)", `Dominion of ${d.label}`, `${d.label} ${l} (by hand)`, { src: d, status: "applies", page: `DA:Fae p. ${d.page ?? "?"}`, how: "a cantrip of the Storyteller's own: roll and reach; the keywords on the sheet line, or picked in the cast window, go on the effects card" });
const DC = await import(A("scripts/fae-da-cantrips.js"));
for ( const [id, c] of Object.entries(DC.CANTRIPS) ) {
  const st = c.does || c.imbue || anyApplying(c.spec) ? "applies" : "card";
  add("Fae (Dark Ages)", `Dominion of ${F.DOMINIONS[c.dominion].label}`, `${"•".repeat(c.level)} ${c.name}`, { src: c.does || c.imbue ? { does: c.does ?? c.imbue } : c.spec, status: st, story: st === "card" ? DC.CANTRIP_STORY?.[id] : undefined, kw: DC.keywordsOf(c), page: `DA:Fae p. ${c.page}`,
    how: `book cantrip: its difficulty, needed successes and costs in Cast a cantrip${c.does ? `; ${c.does} (fae-da.js presetDoes)` : c.imbue ? "; makes a Treasure holding a known cantrip (treasures.js)" : st === "applies" ? "; effects card" : "; the card says what it does"}` });
}
/* -- Fae sprites: the Charms of Dark Ages: Fae p. 97 (charms.js) */
const SCH = await import(A("scripts/spirit-charms.js"));
for ( const c of SCH.CHARMS.filter(x => x.group === "sprite") )
  add("Fae (Dark Ages)", "Sprite Charms", c.name, { src: c.spec ?? { does: c.does }, status: "applies", kw: c.keywords ?? [], page: `DA:Fae p. ${c.p}`, how: `Spirit Charm window: Essence${c.roll ? `, ${c.roll} roll` : ", no roll"}; ${c.does ? `${c.does} (charms.js)` : "effects card"}` });
/* -- B7672: the demon Charms of V20 Dark Ages p. 402 (charms.js) */
for ( const c of SCH.CHARMS.filter(x => x.group === "demon") )
  add("Vampire (Dark Ages)", "Demon Charms", c.name, { src: c.spec ?? { does: c.does }, status: "applies", kw: c.keywords ?? [], page: `VtDA20 p. ${c.p}`, how: `Spirit Charm window: Essence${c.roll ? `, ${c.roll} roll` : ", no roll"}; ${c.does ? `${c.does} (charms.js)` : "effects card"}` });
/* -- Faerie Treasures, every era (treasures.js) */
const TRZ = await import(A("scripts/fae-treasures.js"));
for ( const [k, t] of Object.entries(TRZ.TREASURES) )
  add(t.book === "c20" ? "Changeling (C20)" : "Fae (Dark Ages)", "Treasures", t.name, { src: t.spec ?? { does: t.does }, status: t.does || anyApplying(t.spec) ? "applies" : "card", kw: specList(t.spec).map(x => x.kw), page: TRZ.pageOf(t),
    how: `Use a Treasure (${t.use})${t.does ? `; ${t.does} (treasures.js)` : "; effects card"}${t.oath ? "; its oath checked by the clock" : ""}` });
add("Changeling (C20)", "Treasures", "A Treasure of any Art", { src: null, status: "applies", kw: [], page: "C20 pp. 324-325", how: "Use a Treasure: a Glamour point (the Treasure's store first), Intelligence + Gremayre or Glamour, then the Art's cantrip on the effects card" });
/* -- Demon: Lores and evocations (demon.js Evoke) */
const dtfNames = new Set();
for ( const [id, l] of Object.entries(D.LORES) ) for ( const [k, e] of (l.evo ?? []).entries() ) {
  dtfNames.add(slug(e.name));
  const kw = PK.keywordsOf("dtf", slug(e.name));
  const c = DE.evocationCard(id, k + 1);
  const st = !c ? "roll" : applyingSpec(c.spec) && !INFO.has(c.spec.kw) && E.KEYWORDS[c.spec.kw]?.tier !== "st" ? "applies" : "card";
  add("Demon (DtF)", `Lore of ${l.label.replace(/^the /, "")}`, `${"•".repeat(k + 1)} ${e.name}`, { src: [e, c], status: st, kw: c?.spec?.kw ? [c.spec.kw] : kw?.keywords ?? [], page: `DtF p. ${l.page}`,
    how: c ? `evocation card (effect, duration, range, high Torment)${st === "applies" ? `; effects card ${c.spec.kind}` : ""}; running count against permanent Faith` : "Evoke rolls only" });
}
// B7062: the keyword list also names apocalyptic form powers by a short name ("Chameleon" for Chameleon Skin, "Conjure"
// for Conjure from Nothing, DtF pp. 207, 215); those are counted with the forms below, not as powers with no rules
const dtfFull = Object.values(D.LORES).flatMap(l => [...(l.evo ?? []).map(e => e.name), ...(l.form ?? []), ...(l.high ?? [])].map(x => String(x).toLowerCase()));
// A short name in the keyword list ("Manipulate", "Reach Across") is one of the Lore table's evocations, already counted
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.dtf) ) if ( !dtfNames.has(id) && !dtfFull.some(f => f.startsWith(String(e.n).toLowerCase())) )
  add("Demon (DtF)", "Lores (keyword list only)", e.n, { src: e, status: "none", kw: e.k, page: "DtF", how: "named in the keyword list, not in the Lore table" });
for ( const l of Object.values(D.LORES) ) for ( const nm of [...(l.form ?? []), ...(l.high ?? [])] ) {
  const fp = DE.formPower(nm, l.visage);
  const sheet = fp && (fp.attrs || fp.init || fp.armor);
  // B6851: the form's own effects card (FORM_SPECS) and its natural weapons (FORM_WEAPONS)
  const v = String(l.visage).split(",")[0].trim(), fs = DE.FORM_SPECS[`${nm}@${v}`] ?? DE.FORM_SPECS[nm], fw = DE.FORM_WEAPONS[nm];
  const story = !sheet && !fs && !fw ? DE.FORM_STORY[nm] : null;
  add("Demon (DtF)", `Apocalyptic form: ${l.visage}`, nm, { story: story ?? undefined, src: fs ? [fs] : fp, status: !fp ? "roll" : sheet || fs || fw ? "applies" : "card", page: `DtF p. ${l.formPage}`,
    how: !fp ? "name only" : sheet ? "form puts it on the sheet for the scene" : fs ? "form's effects card for the scene" : fw ? "a natural weapon on the sheet for the scene" : `form card text${story ? `: ${story}` : ""}` });
}
/* -- Hunter: the Reckoning edges (reckoning.js) */
for ( const e of R.EDGES ) {
  const kw = PK.keywordsOf("htr", `${e.path}-${e.id}`);
  add("Hunter (HtR)", `${R.PATHS?.[e.path]?.label ?? e.path}${e.book ? " (creed book)" : ""}`, e.name, { src: e, status: kw && (kw.passive ? noRollKw(kw.keywords) : applyingKw(kw.keywords)) ? "applies" : e.e ? "card" : "roll", kw: kw?.keywords ?? [], page: e.book ? e.ref : `HtR p. ${e.p}`, how: "edge roll and Conviction, effect line, and its keywords on the effects card" });
}
/* -- Hunters Hunted II Numina and hedge sorcery, True Faith (hunter.js) */
for ( const [key, d] of Object.entries(H.NUMINA) ) for ( let l = 1; l <= (d.levels?.length ?? 5); l++ ) {
  const s = PE.NUMINA_EFFECTS[`${key}:${l}`];
  add("Hunter (HH2)", `Numina: ${d.label}`, `${d.label} ${l}`, { src: [d.levels?.[l - 1], s], status: applyingSpec(s) ? "applies" : "card", story: applyingSpec(s) ? undefined : PE.NUMINA_STORY?.[`${key}:${l}`], kw: [s ?? []].flat().map(x => x.kw).filter(Boolean), page: `HH2 p. ${d.p}`, how: s ? `Numen effect spec (${s.kind})` : "level text shown" });
}
for ( const [key, d] of Object.entries(H.SORCERY) )
  add("Hunter (HH2/DA)", "Hedge sorcery", d.label, { src: d, status: H.sorceryResults(key, { top: 2, successes: 2, need: 1, rating: 2 }).some(r => r.out.kind !== "note") ? "applies" : "card", kw: H.sorceryResults(key, { successes: 1 }).map(r => r.key), page: `Sorcerer p. ${d.p}`, how: "hedge magic roll and casting time; a working spell puts its effect on the card" });
for ( const [book, list] of Object.entries(H.FAITH_POWERS) ) for ( const [lvl, t] of list )
  add("Hunter (True Faith)", book === "da20" ? "True Faith (V20 Dark Ages)" : "True Faith (HH2)", `Faith ${lvl}`, { src: t, status: (lvl === 1 && H.repelResults(book, 2).length) || lvl === 0 || ((lvl === 2 || lvl === 5) && H.faithPresence(book, lvl).length) || ((lvl === 3 || (lvl === 4 && book === "da20")) && ["sway", "fear"].some(k => H.faithStops(book, lvl, k))) ? "applies" : "card",
    story: lvl === 4 && book === "hh2" ? "HH2 p. 84: cannot be ghouled, blood bound or raised; WoDX keeps no ghouling or blood bond to refuse" : undefined, kw: lvl === 1 ? ["banish"] : lvl === 2 ? ["sense"] : lvl === 5 ? ["fear"] : [], page: book,
    how: lvl === 1 ? "True Faith window: Repel puts Repelled on the creature's token" : lvl === 0 ? "True Faith window: Resist a power works out the successes the power keeps (faithResist)" : lvl === 2 || lvl === 5 ? "True Faith window: Their presence puts the Sense (and at 5 the Rötschreck Fear) on the effects card (B6858)" : "an immunity: a power on the effects card that clouds or bends the faithful's mind is stopped when applied (effects.js faithShields, B6858)" });
/* -- Mummy: Hekau spells and rituals, named in the Hekau window (mummy.js cast, mummy-hekau.js) */
for ( const [id, sp] of Object.entries(MH.SPELLS) ) {
  const pk = PK.LINE_KEYWORDS.mummy[id];
  const st = (sp.spec?.pool || applyingSpec(sp.spec)) && !INFO.has(sp.spec.kw) && E.KEYWORDS[sp.spec.kw]?.tier !== "st" ? "applies" : "card";
  add("Mummy (2nd)", `Hekau: ${MU.HEKAU[sp.path].label}`, `${"•".repeat(sp.level)} ${sp.name}`, { src: sp, status: st, kw: pk?.k ?? (sp.spec?.kw ? [sp.spec.kw] : []), page: `MtR p. ${MH.PATH_PAGE[sp.path]}`,
    how: `named in the Hekau window: card (effect, pool, difficulty, Sekhem, duration)${st === "applies" ? `; effects card ${sp.spec.kind}` : ""}` });
}
/* -- Orpheus: Horrors */
for ( const [id, h] of Object.entries(O.HORRORS) ) {
  const kw = PK.keywordsOf("orpheus", slug(h.label));
  const fx = OH.HORROR_FX[id], res = fx ? OH.horrorResults(id, 3, 2, { name: h.label }) : [];
  add("Orpheus", `Horrors (${h.shade})`, h.label, { src: [h, fx], status: res.some(r => !["note", "st"].includes(r.out?.kind) && !r.st) ? "applies" : fx ? "card" : "roll", kw: kw?.keywords ?? [],
    page: fx ? `Orpheus ${fx.page}` : "Orpheus pp. 124, 190-193", how: fx ? "Horror window: the line for the Vitality put in, the usual pool, and the effects card" : "Vitality spend and roll; no effect" });
}
/* -- Orpheus: Stains (B7832, orpheus-stains.js), called up from Spite 4 */
for ( const [id, st] of Object.entries(OS.STAINS) ) {
  add("Orpheus", "Stains", st.label, { src: st, status: OS.applies(id) ? "applies" : "card", story: OS.applies(id) ? undefined : st.gain, kw: (st.fx ?? []).map(f => f.key),
    page: `Orpheus ${st.page}`, how: `Call up a Stain: Spite tapped, a die each at 7; ${st.weapon ? "its weapon on the sheet" : st.fx?.length ? "its effects card" : "the card for the Storyteller"}` });
}
/* -- Orpheus: the Spectral arsenal (B7833, orpheus-spectres.js), a Spectre's Horrors from Spite tapped and its Thorns */
for ( const [id, h] of Object.entries(OX.HORRORS) ) {
  add("Orpheus", "Spectral Horrors", h.label, { src: h, status: OX.applies(id) ? "applies" : "card", story: OX.applies(id) ? undefined : OX.horrorLine(id, OX.tapRange(id).max),
    kw: OX.horrorResults(id, 2).map(r => r.key), page: `Orpheus ${h.page}`, how: `A Spectre's Horror or Thorn: Spite tapped, its rating a scene; ${OX.applies(id) ? "the effects card" : "the card for the Storyteller"}` });
}
for ( const [id, t] of Object.entries(OX.THORNS) ) {
  const on = !!OX.thornItem(id);
  add("Orpheus", "Spectral Thorns", t.label, { src: t, status: on ? "applies" : "card", story: on ? undefined : t.text, kw: [],
    page: `Orpheus ${t.page}`, how: `A Spectre's Horror or Thorn: ${on ? "on the sheet as armour or a natural weapon" : "the card for the Storyteller"}` });
}
/* -- Kindred of the East: the Disciplines power by power (kote.js Spend Chi) */
for ( const p of KA.POWERS ) {
  const res = KA.artResults(p.id, 2);
  // B5161: a power that plays itself (Strengthening the Demon) has no effects spec: it changes the Demon Chi directly
  if ( p.stoke ) { add("Kuei-jin (KotE)", KA.ART_LABEL[p.art], p.name, { src: p, status: "applies", kw: ["boost"], page: `${p.book} p. ${p.p}`,
    how: "Spend Chi: the roll raises Demon Chi for a turn a success, then the stoked points fade and the Hun roll follows" }); continue; }
  add("Kuei-jin (KotE)", KA.ART_LABEL[p.art], p.name, { src: p, status: res.some(r => !["note", "st"].includes(r.out?.kind) && !r.st) ? "applies" : "card", kw: [p.spec].flat().map(x => x.kw),
    page: `KotE p. ${p.p}`, how: "Spend Chi: the named power fills the Chi, pool and difficulty, and the effects card carries the result" });
}
/* -- Book rituals and rites: the caster's own window pulls them (B3753) */
const RITE_WINDOW = { v20: "Cast a ritual", v20da: "Cast a ritual", w20: "Perform a rite", daw: "Perform a rite", mummy: "Hekau, by the spell's name" };
for ( const [set, b] of Object.entries(BR.BOOK_RITUALS) ) for ( const r of b.list )
  add(`Rituals (${b.book})`, r.g, r.n, { src: r, status: applyingKw(r.k) ? "applies" : "card", kw: r.k ?? [], page: `${b.book} ${r.page}`, how: `${RITE_WINDOW[set] ?? "the Storyteller's effect window"}: the caster's roll puts its keywords on the effects card` });
/* -- Combat maneuvers (wodx-combat) */
for ( const [id, m] of Object.entries({ ...CB.MANEUVERS, ...CB.CLASSIC }) ) {
  const mods = m.diff || m.dmg || m.dice || m.defDiff || m.noDamage || m.noDefense;
  const fo = CB.followOn?.(id, { hit: true, damageSuccesses: 3, profile: "vampire" }) ?? [];
  add("Combat", id.startsWith("c_") ? "WoD: Combat maneuvers" : "Close combat maneuvers", m.label.replace(/ \(.*$/, ""), { src: m, status: mods || fo.length || id === "normal" ? "applies" : "card", story: mods || fo.length ? undefined : m.story, page: "VtDA20 pp. 346-349",
    how: fo.length ? `roll modifiers applied; a hit marks ${fo.map(f => f.name).join(", ")} on the target's token (B3754)` : m.note ? `roll modifiers applied; the extra effect is a note: ${m.note.slice(0, 120)}` : "roll modifiers applied" });
}
for ( const [id, u] of Object.entries(CB.UNARMED) ) add("Combat", "Unarmed attacks", u.name, { src: u, status: "applies", page: "VtDA20 pp. 346-347", how: "attack and damage pools" });

/* -- Lists WoDX does not hold yet: one row each, so the gap shows */
for ( const g of D.GIFTS ) add("Demon (DtF)", "Pact gifts to thralls", g.label, { src: g, status: g.k === "offering" ? "applies" : "card", story: g.story, page: "DtF p. 253",
  how: g.k === "offering" ? "Thralls window: each thrall's offering reaches the demon's Faith at dawn (demon.js daily)" : "Thralls window lists the gift and its Faith" });
const IB = await import(A("scripts/inq-blessings.js"));
for ( const b of IB.BLESSINGS ) {
  // B7065: a Blessing whose rule is built into a window (b.applied names where) applies too
  const st = b.applied || (applyingSpec(b.spec) && !INFO.has(b.spec.kw) && E.KEYWORDS[b.spec.kw]?.tier !== "st" && b.spec.kw !== "free") ? "applies" : "card";
  add("Hunter (Inquisitor)", `Blessings: ${b.kind}`, `${b.use}: ${b.name}`, { src: b, status: st, story: st === "card" ? b.story : undefined, kw: [b.spec.kw], page: `DA:Inquisitor p. ${b.p}`,
    how: b.applied ? `built into a window: ${b.applied}` : `Blessing window: the book list sets the roll, difficulty and Conviction${st === "applies" ? `; effects card ${b.spec.kind}` : "; the card says what it does"}` });
}
for ( const g of J("gifts-fera.json").gifts ) {
  const st = applyingSpec(g.spec) && !INFO.has(g.spec.kw) && E.KEYWORDS[g.spec.kw]?.tier !== "st" && g.spec.kw !== "free" ? "applies" : "card";
  add("Werewolf (Changing Breeds)", `Gifts: ${g.breed}${g.sub ? ` (${g.sub})` : ""}`, `${"•".repeat(g.l)} ${g.n}`, { src: g, status: st, story: st === "card" ? g.story : undefined, kw: [g.spec.kw], page: `W20 CB p. ${g.p}`,
    how: `Use a Gift: the breed's own library entry sets the pool, cost and difficulty${st === "applies" ? `; effects card ${g.spec.kind}` : "; the card says what it does"}` });
}
/* B6852: a power whose name reaches the ground or a town (world-effects.js WORLD_POWERS) applies by that alone */
const WE = await import(A("scripts/world-effects.js"));
for ( const r of rows ) {
  if ( r.status !== "card" ) continue;
  const nm = String(r.name).replace(/^[•\s]+/, "");
  if ( WE.worldKinds(nm, r.line).length ) { r.status = "applies"; r.how += "; reaches the ground or the town by name (world-effects.js)"; r.world = true; }
}
/* B6015: is what each applying power puts on the card read by any system, or only a marker? (read-rules.mjs) */
const RR = await import(pathToFileURL(path.join(ROOT, "tools/powers/read-rules.mjs")).href);
const specsHave = r => { const s = r.src; const l = Array.isArray(s) ? s : [s]; return l.some(x => x && (x.kind || x.spec)); };
const kwOutcome = (k, ctx = {}) => (E.KEYWORDS[k] ? E.outcome(k, { ok: true, strength: 3, duration: 1, targets: 0 }, ctx) : null);
const specOutcomes = sp => { try { return DAE.outcomesOf(sp, { label: "x", source: "" }, 3, ""); } catch (e) { return null; } };
// B7065: a rule built into the line's own window (src.applied) is worked by that window, as "direct" is
for ( const r of rows ) r.read = r.status === "applies" ? (r.world || r.src?.applied ? "direct" : RR.powerRead(r, kwOutcome, specOutcomes)) : null;
const out = { made: new Date().toISOString(), counts: {}, reads: {}, byLine: {}, rows };
for ( const r of rows ) if ( r.read ) out.reads[r.read] = (out.reads[r.read] ?? 0) + 1;
for ( const r of rows ) {
  out.counts[r.status] = (out.counts[r.status] ?? 0) + 1;
  const b = out.byLine[r.line] ??= { total: 0, applies: 0, card: 0, roll: 0, none: 0, kw: 0 };
  b.total++; b[r.status]++; if ( r.kw.length ) b.kw++;
}
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if ( arg("--out") ) fs.writeFileSync(arg("--out"), JSON.stringify(out, null, 1));
out.story = rows.filter(r => r.status !== "applies" && r.story).length;
console.log(`${rows.length} powers:`, out.counts, "applying, read by the game:", out.reads, "story (no effect to apply, page read):", out.story);
if ( process.argv.includes("--unread") ) for ( const r of rows ) if ( ["unread", "partly"].includes(r.read) ) console.log(r.read.padEnd(7), r.line.padEnd(26), r.name, JSON.stringify(r.kw));
if ( process.argv.includes("--summary") ) for ( const [l, b] of Object.entries(out.byLine) ) console.log(l.padEnd(26), JSON.stringify(b));
