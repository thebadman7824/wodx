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
const KA = await import(A("scripts/kote-arts.js"));
const F = await import(A("scripts/fae-da-rules.js"));
const MD = await import(A("scripts/mage-da-rules.js"));
const M20 = await import(A("scripts/m20-rules.js"));
const MU = await import(A("scripts/mummy-rules.js"));
const C20 = await import(A("scripts/c20-rules.js"));
const CA = await import(A("scripts/c20-arts.js"));
const MH = await import(A("scripts/mummy-hekau.js"));
const OH = await import(A("scripts/orpheus-horrors.js"));
const CB = await import(pathToFileURL(path.join(ROOT, "modules/wodx-combat/scripts/rules.js")).href);

/** Keywords that only tell the user something; they do not change the game. */
const INFO = new Set(["sense", "know", "speak"]);
const applyingKw = (ks = []) => ks.some(k => E.KEYWORDS[k] && E.KEYWORDS[k].tier !== "st" && !INFO.has(k));
const applyingSpec = s => !!s && !["note", "st"].includes(s.kind);
/** Keywords a power used with no roll applies (its Harm readies the user; the attack roll deals it, B3751). */
const noRollKw = (ks = []) => applyingKw(ks.map(k => k === "harm" ? "boost" : k));
/** Always-on Disciplines WoDX Combat reads by rating: soak, damage dice and extra actions or speed. */
const COMBAT_READS = new Set(["Celerity", "Fortitude", "Potence"]);
const slug = s => PK.slugOf ? PK.slugOf(s) : String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const rows = [];
const add = (line, group, name, o = {}) => rows.push({ line, group, name, status: o.status ?? "none", kw: o.kw ?? [], page: o.page ?? "", how: o.how ?? "", passive: !!o.passive });

/* -- Vampire: V20 Dark Ages Disciplines (kindred.js Use a Discipline) */
const disc = J("disciplines-daw.json").powers;
const daNames = new Map(disc.map(p => [slug(String(p.n).replace(/[’']/g, "")), p]));
const v20Lib = new Map(J("disciplines-v20.json").powers.map(p => [p.kw, p]));
for ( const p of disc ) {
  const kw = PK.keywordsOf("disc", p.id);
  const path = PE.PATH_EFFECTS[p.id];
  const passive = !!kw?.passive || !!p.passive, combat = passive && COMBAT_READS.has(p.d);
  let status = combat ? "applies" : path && p.r ? (applyingSpec(path) ? "applies" : "card")
    : (kw && !passive && (p.r ? applyingKw(kw.keywords) : noRollKw(kw.keywords)) ? "applies" : "card");
  add("Vampire (Dark Ages)", p.d, p.n, { status, kw: kw?.keywords ?? (path ? [path.kw] : []), page: `VtDA20 p. ${p.p ?? "?"}`, passive,
    how: combat ? "WoDX Combat reads the rating (soak, damage dice, actions and speed)" : path && p.r ? "path magic effect spec" : p.r ? "Discipline roll, keywords, timed effect on the token" : "no roll: one success, keywords and timed effect on the token" });
}
/* -- Vampire: V20 (modern) Disciplines: the same window when a Dark Ages power has the name, else the system roll */
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.v20) ) {
  const da = daNames.get(id), v = v20Lib.get(id);
  const kwA = applyingKw(e.k) && !e.p;
  add("Vampire (V20)", v ? v.d : "Disciplines", e.n, { status: da || v ? (kwA ? "applies" : "card") : "roll", kw: e.k, passive: !!e.p, page: v ? `V20 p. ${v.p}` : "V20",
    how: v ? "V20 library entry (data/disciplines-v20.json): Use a Discipline card, roll and keywords" : da ? "matches a Dark Ages power by name: same window" : "system roll only: no V20 entry in the Discipline library" });
}
/* -- Werewolf: Dark Ages Gifts (garou.js) */
for ( const g of J("gifts-daw.json").gifts ) {
  const kw = PK.keywordsOf("gift", g.id);
  add("Werewolf (Dark Ages)", "Gifts", g.n, { status: kw && !kw.passive && (g.r ? applyingKw(kw.keywords) : noRollKw(kw.keywords)) ? "applies" : "card", kw: kw?.keywords ?? [], passive: !!kw?.passive, page: `DA:W p. ${g.p}`, how: "Gift roll, keywords, timed effect" });
}
const daGift = new Set(J("gifts-daw.json").gifts.map(g => slug(g.n)));
/* -- Werewolf: W20 Gifts (garou.js reads data/gifts-w20.json by name: pool, cost, duration, effect and page) */
const w20Lib = new Map(J("gifts-w20.json").gifts.map(g => [g.kw, g]));
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.w20) ) {
  if ( daGift.has(id) ) continue;
  const g = w20Lib.get(id);
  add("Werewolf (W20)", "Gifts", e.n, { status: applyingKw(e.k) && !e.p ? "applies" : g ? "card" : "roll", kw: e.k, passive: !!e.p, page: g ? `W20 p. ${g.p}` : "W20",
    how: g ? "W20 library entry (data/gifts-w20.json): Use a Gift card, pool, cost, duration and keywords" : "Gift roll from the item's dice; keywords by name; no effect text" });
}
/* -- Wraith: W20 and The Great War Arcanoi (wraith.js shows the effect line; keywords not wired) */
for ( const [file, set, line] of [["arcanoi-w20.json", "wraith", "Wraith (W20)"], ["arcanoi-gw.json", "greatwar", "Wraith (Great War)"]] ) {
  for ( const a of Object.values(J(file).arts) ) {
    const kw = PK.keywordsOf(set, a.id);
    const st = a.r && kw && !kw.passive && applyingKw(kw.keywords) ? "applies" : a.e ? "card" : "roll";
    add(line, a.d, a.n, { status: st, kw: kw?.keywords ?? [], passive: !!kw?.passive, page: `p. ${a.p}`, how: "Arcanos roll and cost, effect line, keywords on the effects card (B3740)" });
  }
}
/* -- Mage: M20 Spheres (Cast window with keywords) */
for ( const s of M20.SPHERES ) for ( let l = 1; l <= 5; l++ )
  add("Mage (M20)", "Spheres", `${s[0].toUpperCase() + s.slice(1)} ${l}`, { status: "applies", page: "M20", how: "Cast window: keywords, spend plan, Undo" });
/* -- Mage: Dark Ages rotes (mage-da.js) */
for ( const r of MD.ROTES ) {
  const s = DAE.DA_EFFECTS[r.id];
  add("Mage (Dark Ages)", r.f, r.name, { status: applyingSpec(s) ? "applies" : "card", kw: s?.kw ? [s.kw] : [], page: `p. ${r.page}`, how: s ? `rote effect spec (${s.kind})` : "rote text only" });
}
/* -- Changeling: C20 Arts (cantrip roll by Art and level; no power names, no effect text) */
for ( const [id, c] of Object.entries(CA.CANTRIPS) ) {
  const st = c.dice || (applyingSpec(c.spec) && !INFO.has(c.spec.kw) && E.KEYWORDS[c.spec.kw]?.tier !== "st") ? "applies" : "card";
  add("Changeling (C20)", C20.ARTS[c.art].label, `${"•".repeat(c.level)} ${c.name}`, { status: st, kw: c.spec?.kw ? [c.spec.kw] : [], page: `C20 p. ${C20.ARTS[c.art].page}`,
    how: `named in Cast a cantrip: card (effect, duration, type)${st === "applies" ? `; effects card ${c.dice ? "damage dice" : c.spec.kind}` : ""}` });
}
/* -- Changeling: Dark Ages Fae (cantrips by Dominion and level) */
for ( const [id, d] of Object.entries(F.DOMINIONS) ) for ( let l = 1; l <= 5; l++ )
  add("Fae (Dark Ages)", `Dominion of ${d.label}`, `${d.label} ${l}`, { status: "applies", page: `DA:Fae p. ${d.page ?? "?"}`, how: "cantrip roll and reach; the keywords on the cantrip's sheet line, or picked in the cast window, go on the effects card" });
/* -- Demon: Lores and evocations (demon.js Evoke) */
const dtfNames = new Set();
for ( const [id, l] of Object.entries(D.LORES) ) for ( const [k, e] of (l.evo ?? []).entries() ) {
  dtfNames.add(slug(e.name));
  const kw = PK.keywordsOf("dtf", slug(e.name));
  const c = DE.evocationCard(id, k + 1);
  const st = !c ? "roll" : applyingSpec(c.spec) && !INFO.has(c.spec.kw) && E.KEYWORDS[c.spec.kw]?.tier !== "st" ? "applies" : "card";
  add("Demon (DtF)", `Lore of ${l.label.replace(/^the /, "")}`, `${"•".repeat(k + 1)} ${e.name}`, { status: st, kw: c?.spec?.kw ? [c.spec.kw] : kw?.keywords ?? [], page: `DtF p. ${l.page}`,
    how: c ? `evocation card (effect, duration, range, high Torment)${st === "applies" ? `; effects card ${c.spec.kind}` : ""}; running count against permanent Faith` : "Evoke rolls only" });
}
const dtfFull = Object.values(D.LORES).flatMap(l => (l.evo ?? []).map(e => e.name.toLowerCase()));
// A short name in the keyword list ("Manipulate", "Reach Across") is one of the Lore table's evocations, already counted
for ( const [id, e] of Object.entries(PK.LINE_KEYWORDS.dtf) ) if ( !dtfNames.has(id) && !dtfFull.some(f => f.startsWith(String(e.n).toLowerCase())) )
  add("Demon (DtF)", "Lores (keyword list only)", e.n, { status: "none", kw: e.k, page: "DtF", how: "named in the keyword list, not in the Lore table" });
for ( const l of Object.values(D.LORES) ) for ( const nm of [...(l.form ?? []), ...(l.high ?? [])] ) {
  const fp = DE.formPower(nm, l.visage);
  const sheet = fp && (fp.attrs || fp.init || fp.armor);
  add("Demon (DtF)", `Apocalyptic form: ${l.visage}`, nm, { status: !fp ? "roll" : sheet ? "applies" : "card", page: `DtF p. ${l.formPage}`, how: !fp ? "name only" : sheet ? "form puts it on the sheet for the scene" : "form card text" });
}
/* -- Hunter: the Reckoning edges (reckoning.js) */
for ( const e of R.EDGES ) {
  const kw = PK.keywordsOf("htr", `${e.path}-${e.id}`);
  add("Hunter (HtR)", `${R.PATHS?.[e.path]?.label ?? e.path}`, e.name, { status: kw && !kw.passive && applyingKw(kw.keywords) ? "applies" : e.e ? "card" : "roll", kw: kw?.keywords ?? [], page: `HtR p. ${e.p}`, how: "edge roll and Conviction, effect line, and its keywords on the effects card" });
}
/* -- Hunters Hunted II Numina and hedge sorcery, True Faith (hunter.js) */
for ( const [key, d] of Object.entries(H.NUMINA) ) for ( let l = 1; l <= (d.levels?.length ?? 5); l++ ) {
  const s = PE.NUMINA_EFFECTS[`${key}:${l}`];
  add("Hunter (HH2)", `Numina: ${d.label}`, `${d.label} ${l}`, { status: applyingSpec(s) ? "applies" : "card", kw: s?.kw ? [s.kw] : [], page: `HH2 p. ${d.p}`, how: s ? `Numen effect spec (${s.kind})` : "level text shown" });
}
for ( const [key, d] of Object.entries(H.SORCERY) )
  add("Hunter (HH2/DA)", "Hedge sorcery", d.label, { status: H.sorceryResults(key, { top: 2, successes: 2, need: 1, rating: 2 }).some(r => r.out.kind !== "note") ? "applies" : "card", kw: H.sorceryResults(key, { successes: 1 }).map(r => r.key), page: `Sorcerer p. ${d.p}`, how: "hedge magic roll and casting time; a working spell puts its effect on the card" });
for ( const [book, list] of Object.entries(H.FAITH_POWERS) ) for ( const [lvl, t] of list )
  add("Hunter (True Faith)", book === "da20" ? "True Faith (V20 Dark Ages)" : "True Faith (HH2)", `Faith ${lvl}`, { status: lvl === 1 && H.repelResults(book, 2).length ? "applies" : "card", kw: lvl === 1 ? ["banish"] : [], page: book,
    how: lvl === 1 ? "True Faith window: Repel puts Repelled on the creature's token" : "True Faith window shows the line" });
/* -- Mummy: Hekau spells and rituals, named in the Hekau window (mummy.js cast, mummy-hekau.js) */
for ( const [id, sp] of Object.entries(MH.SPELLS) ) {
  const pk = PK.LINE_KEYWORDS.mummy[id];
  const st = (sp.spec?.pool || applyingSpec(sp.spec)) && !INFO.has(sp.spec.kw) && E.KEYWORDS[sp.spec.kw]?.tier !== "st" ? "applies" : "card";
  add("Mummy (2nd)", `Hekau: ${MU.HEKAU[sp.path].label}`, `${"•".repeat(sp.level)} ${sp.name}`, { status: st, kw: pk?.k ?? (sp.spec?.kw ? [sp.spec.kw] : []), page: `MtR p. ${MH.PATH_PAGE[sp.path]}`,
    how: `named in the Hekau window: card (effect, pool, difficulty, Sekhem, duration)${st === "applies" ? `; effects card ${sp.spec.kind}` : ""}` });
}
/* -- Orpheus: Horrors */
for ( const [id, h] of Object.entries(O.HORRORS) ) {
  const kw = PK.keywordsOf("orpheus", slug(h.label));
  const fx = OH.HORROR_FX[id], res = fx ? OH.horrorResults(id, 3, 2, { name: h.label }) : [];
  add("Orpheus", `Horrors (${h.shade})`, h.label, { status: res.some(r => !["note", "st"].includes(r.out?.kind) && !r.st) ? "applies" : fx ? "card" : "roll", kw: kw?.keywords ?? [],
    page: fx ? `Orpheus ${fx.page}` : "Orpheus pp. 124, 190-193", how: fx ? "Horror window: the line for the Vitality put in, the usual pool, and the effects card" : "Vitality spend and roll; no effect" });
}
/* -- Kindred of the East: the Disciplines power by power (kote.js Spend Chi) */
for ( const p of KA.POWERS ) {
  const res = KA.artResults(p.id, 2);
  add("Kuei-jin (KotE)", KA.ART_LABEL[p.art], p.name, { status: res.some(r => !["note", "st"].includes(r.out?.kind) && !r.st) ? "applies" : "card", kw: [p.spec.kw],
    page: `KotE p. ${p.p}`, how: "Spend Chi: the named power fills the Chi, pool and difficulty, and the effects card carries the result" });
}
/* -- Book rituals and rites (the Storyteller's effect window only) */
for ( const [set, b] of Object.entries(BR.BOOK_RITUALS) ) for ( const r of b.list )
  add(`Rituals (${b.book})`, r.g, r.n, { status: applyingKw(r.k) ? "st" : "card", kw: r.k ?? [], page: `${b.book} ${r.page}`, how: "card and keywords in the Storyteller's effect window; the caster's own rite or ritual roll does not pull it" });
/* -- Combat maneuvers (wodx-combat) */
for ( const [id, m] of Object.entries({ ...CB.MANEUVERS, ...CB.CLASSIC }) ) {
  const mods = m.diff || m.dmg || m.dice || m.defDiff || m.noDamage || m.noDefense;
  add("Combat", id.startsWith("c_") ? "WoD: Combat maneuvers" : "Close combat maneuvers", m.label.replace(/ \(.*$/, ""), { status: mods ? (m.note ? "applies" : "applies") : "card", page: "VtDA20 pp. 346-349",
    how: m.note ? `roll modifiers applied; the extra effect is a note: ${m.note.slice(0, 120)}` : "roll modifiers applied" });
}
for ( const [id, u] of Object.entries(CB.UNARMED) ) add("Combat", "Unarmed attacks", u.name, { status: "applies", page: "VtDA20 pp. 346-347", how: "attack and damage pools" });

/* -- Lists WoDX does not hold yet: one row each, so the gap shows */
for ( const g of D.GIFTS ) add("Demon (DtF)", "Pact gifts to thralls", g.label, { status: "card", page: "DtF", how: "Thralls window lists the gift and its Faith; nothing is applied" });
add("Hunter (Inquisitor)", "Blessings (whole list)", "Benedictions, Investitures, Legacies, Psalms, Orisons, Holy Arts", { status: "roll", page: "DA:Inquisitor ch. 5", how: "the Blessing is typed in; roll and Conviction only; no list, no effect" });
add("Werewolf (Changing Breeds)", "Fera Gifts (whole list)", "Gifts of the Changing Breeds", { status: "roll", page: "W20 Changing Breeds", how: "breed traits are known; their own Gifts are not listed (W20 Gifts by name catch the shared ones)" });
const out = { made: new Date().toISOString(), counts: {}, byLine: {}, rows };
for ( const r of rows ) {
  out.counts[r.status] = (out.counts[r.status] ?? 0) + 1;
  const b = out.byLine[r.line] ??= { total: 0, applies: 0, card: 0, roll: 0, none: 0, kw: 0 };
  b.total++; b[r.status]++; if ( r.kw.length ) b.kw++;
}
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
if ( arg("--out") ) fs.writeFileSync(arg("--out"), JSON.stringify(out, null, 1));
console.log(`${rows.length} powers:`, out.counts);
if ( process.argv.includes("--summary") ) for ( const [l, b] of Object.entries(out.byLine) ) console.log(l.padEnd(26), JSON.stringify(b));
