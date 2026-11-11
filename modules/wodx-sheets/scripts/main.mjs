/**
 * WoDX Sheets 0.4 — character sheets that follow the era and each line's book (B74).
 *
 * Each WoDX sheet extends the World of Darkness system's own sheet for its actor type and keeps every tab the system
 * draws; only the Core tab (and, for the fae, the Dreaming tab) is replaced by the book's sheet, laid out from the
 * definitions in sheet-rules.mjs. The system's listeners bind to the same markup, so rolls, Attribute and Ability dots,
 * health, combat, gear, notes and settings keep working. Outside the sheet's era the system's own layout is shown.
 */
import ChangelingActorSheet from "../../../systems/worldofdarkness/module/actor/template/changeling-actor-sheet.js";
import MageActorSheet from "../../../systems/worldofdarkness/module/actor/template/mage-actor-sheet.js";
import HunterActorSheet from "../../../systems/worldofdarkness/module/actor/template/hunter-actor-sheet.js";
import WerewolfActorSheet from "../../../systems/worldofdarkness/module/actor/template/werewolf-actor-sheet.js";
import VampireActorSheet from "../../../systems/worldofdarkness/module/actor/template/vampire-actor-sheet.js";
import MortalActorSheet from "../../../systems/worldofdarkness/module/actor/template/mortal-actor-sheet.js";
import WraithActorSheet from "../../../systems/worldofdarkness/module/actor/template/wraith-actor-sheet.js";
import DemonActorSheet from "../../../systems/worldofdarkness/module/actor/template/demon-actor-sheet.js";
import MummyActorSheet from "../../../systems/worldofdarkness/module/actor/template/mummy-actor-sheet.js";
import { isDA as isFaeDA } from "../../wodx-actions/scripts/fae-da.js";
import { isDA as isMageDA } from "../../wodx-actions/scripts/mage-da.js";
import * as FR from "../../wodx-actions/scripts/fae-da-rules.js";
import * as MR from "../../wodx-actions/scripts/mage-da-rules.js";
import * as HR from "../../wodx-actions/scripts/hunter-rules.js";
import { lineNow } from "../../wodx-actions/scripts/hunter.js";
import { isKotE } from "../../wodx-actions/scripts/kote.js";
import { isOrpheus } from "../../wodx-actions/scripts/orpheus.js";
import * as RR from "../../wodx-actions/scripts/reckoning-rules.js";
import * as KR from "../../wodx-actions/scripts/kote-rules.js";
import * as UR from "../../wodx-actions/scripts/mummy-rules.js";
import * as CR from "../../wodx-actions/scripts/c20-rules.js";
import * as SR from "./sheet-rules.mjs";
import * as X from "./extras.mjs";
import * as AN from "./anachronism.mjs";

const MOD = "wodx-sheets", ACT = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const era = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
const inDA = () => ["dark-ages", "long-night"].includes(era());
const loc = s => { const t = game.i18n.localize(String(s ?? "")); return t === s && /^wod\./.test(String(s)) ? String(s).split(".").pop() : t; };
const profile = a => game.wodxActions?.getKind?.(a) ?? null;

/** Which WoDX sheet an actor gets, or null for the system's own layout. The Kuei-jin and Orpheus follow the sheet's variant. */
export function sheetFor(actor) {
  // A Storyteller's choice for one character (one out of their era, say): flags.wodx-sheets.sheet, a sheet for the actor's type
  const forced = actor?.getFlag?.(MOD, "sheet");
  if (forced && SR.SHEETS[forced]?.type === actor.type) return forced;
  switch (actor?.type) {
    case "Changeling": return isFaeDA(actor) ? "faeDA" : "c20";
    case "Mage": return isMageDA(actor) ? "mageDA" : "m20";
    case "Hunter": {
      if (actor.getFlag(ACT, "inquisitor") || inDA()) return "inqDA";
      let line = null; try { line = lineNow(); } catch (e) { /* no chronicle */ }
      return line === "reckoning" || actor.getFlag(ACT, "imbued") || actor.system?.creed ? "htr" : null;
    }
    case "Werewolf": return inDA() ? "werewolfDA" : "w20";
    case "Vampire": return isKotE(actor) ? "kote" : inDA() ? "kindredDA" : "v20";
    case "Mortal": return isOrpheus(actor) ? "orpheus" : profile(actor) === "ghoul" ? (inDA() ? "ghoulDA" : "ghoul20") : null;
    case "Wraith": return "wr20";
    case "Demon": return "demon";
    case "Mummy": return "mummy";
    default: return null;
  }
}

/* -------------------------------------------------------------- */
/*  Blocks                                                         */
/* -------------------------------------------------------------- */

const isDAsheet = a => SR.DA_SHEETS.includes(sheetFor(a));
const itemsOf = (a, test) => [...a.items].filter(test).sort((x, y) => x.name.localeCompare(y.name));
const itemRows = (list, withDots = true) => list.map(i => ({ id: i.id, name: i.name, dots: withDots ? SR.dots(i.system?.value, Math.max(5, n(i.system?.max) || 5)) : null }));
const isType = re => i => re.test(String(i.system?.type ?? ""));
const flagObj = (a, k) => a.getFlag(ACT, k) ?? {};
/** One of the system's own stat boxes (its helper, its markup, its rolls): permanent dots and/or temporary boxes, as its own sheet draws them. */
const stat = (key, s, roll = true, perm = true, temp = true) => ({ kind: "stat", key, stat: s, roll, perm, temp });
const strip = v => String(v ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const leaf = v => String(v ?? "").split(".").pop().toLowerCase().replace(/[^a-z]/g, "");
/** A weapon's line as the printed Combat box has it: difficulty, damage, and range and rate for a gun. */
function weaponLine(i) {
  const w = i.system ?? {}, d = w.damage ?? {}, kind = { b: "B", bashing: "B", l: "L", lethal: "L", a: "A", aggravated: "A" }[String(d.type ?? "").toLowerCase()] ?? "";
  const attr = String(d.attribute ?? "") ? `${String(d.attribute).slice(0, 3).replace(/^./, c => c.toUpperCase())}+` : "";
  const parts = [`diff ${n(w.difficulty) || 6}`, `${attr}${n(d.bonus)}${kind ? ` ${kind}` : ""}`];
  if (i.type === "Ranged Weapon") parts.push(`range ${n(w.range)}`, `rate ${n(w.rate)}`, `clip ${n(w.clip?.max)}`);
  if (w.conceal) parts.push(`conceal ${w.conceal}`);
  return parts.join(", ");
}
function armorLine(i) {
  const s = i.system?.soak ?? {}, pen = n(i.system?.dexpenalty);
  return [`soak ${n(s.bashing)}/${n(s.lethal)}/${n(s.aggravated)}`, pen ? `Dex -${Math.abs(pen)}` : ""].filter(Boolean).join(", ");
}
/** Fixed rows (the six Realms, the six Hekau paths) read from items by name: read-only dots, the item opens on a click. */
function fixedRows(a, names, test) {
  return names.map(([label, re]) => { const it = [...a.items].find(i => test(i) && re.test(`${i.name} ${i.system?.label ?? ""}`));
    return { id: it?.id ?? null, name: label, dots: SR.dots(it?.system?.value) }; });
}

function block(key, a) {
  const fae = flagObj(a, "daFae"), mage = flagObj(a, "daMage"), inq = flagObj(a, "inquisitor");
  const adv = a.system.advantages ?? {};
  switch (key) {
    case "backgrounds": return { kind: "items", title: "Backgrounds", rows: itemRows(itemsOf(a, i => i.type === "Feature" && isType(/background/)(i))), empty: "None yet: add them as Features (Background)." };
    case "otherTraits": return { kind: "items", title: "Other Traits", rows: itemRows(itemsOf(a, i => i.type === "Trait" && isType(/othertraits/)(i))), empty: "—" };
    case "meritsFlaws": return { kind: "items", title: a.type === "Werewolf" || a.type === "Hunter" ? "Blessings and Curses" : "Merits and Flaws",
      rows: itemRows(itemsOf(a, i => i.type === "Feature" && isType(/merit|flaw/)(i)), false).map(r => ({ ...r, name: `${r.name}${/flaw/.test(a.items.get(r.id)?.system?.type ?? "") ? " (Flaw)" : ""}` })), empty: "None." };
    case "blessingsCurses": return { ...block("meritsFlaws", a), title: "Blessings and Curses" };
    case "willpower": return stat("willpower", adv.willpower);
    case "rage": return stat("rage", adv.rage);
    case "gnosis": return stat("gnosis", adv.gnosis);
    case "bloodpool": return a.type === "Vampire" && !isDAsheet(a) ? { ...stat("bloodpool", adv.bloodpool, false, false, true), note: `Blood per turn: ${adv.bloodpool?.perturn ?? "—"}` } : stat("bloodpool", adv.bloodpool);
    case "road": return isDAsheet(a) ? stat("path", adv.path) : stat("path", adv.path, true, true, false);
    // Hunter: The Reckoning keeps Conviction as points (the system's own box); the inquisitor's has its rating too
    case "conviction": return a.type === "Hunter" && sheetFor(a) === "htr" ? stat("conviction", adv.conviction, false, false, true) : stat("conviction", adv.conviction);
    /* the later eras: the system's own stat boxes, as its sheets draw them */
    case "renown": return ["glory", "honor", "wisdom"].map(k => ({ ...stat(k, a.system.renown?.[k], false) }));
    case "rank": return { kind: "dots", title: "Rank", rows: [{ label: "Rank", path: "system.renown.rank", max: 5, dots: SR.dots(a.system.renown?.rank) }] };
    case "faith": return stat("faith", adv.faith);
    case "torment": return stat("torment", adv.torment, false);
    case "glamour": return stat("glamour", adv.glamour);
    case "banality": return stat("banality", adv.banality);
    case "nightmare": return stat("nightmare", adv.nightmare, false, false, true);
    case "corpus": return stat("corpus", adv.corpus, false);
    case "pathos": return stat("pathos", adv.pathos, false, false, true);
    case "angst": return stat("angst", adv.angst, false, false, true);
    case "balance": return stat("balance", adv.balance, true, true, false);
    case "sekhem": return stat("sekhem", adv.sekhem, false);
    case "vitality": return stat("vitality", adv.vitality);
    case "spite": return stat("spite", adv.spite);
    case "hun": return stat("hun", adv.hun, false, true, false);
    case "po": return stat("po", adv.po, false, true, false);
    case "demonchi": return stat("demonchi", adv.demonchi, false, false, true);
    case "dharma": return [stat("dharma", adv.dharma, false, true, false),
      { kind: "field", title: "The Dharma", path: "system.advantages.dharma.label", value: adv.dharma?.label ?? "", display: loc(adv.dharma?.label) || "—" }];
    case "yinYang": return [stat("yin", adv.yin, false, true, false), stat("yinchi", adv.yinchi, false, false, true), stat("yang", adv.yang, false, true, false), stat("yangchi", adv.yangchi, false, false, true)];
    case "imbalance": { const p = KR.permImbalance(adv.yin?.permanent, adv.yang?.permanent);
      const t = KR.tempImbalance({ yin: n(adv.yin?.permanent), yang: n(adv.yang?.permanent), yinChi: n(adv.yinchi?.temporary), yangChi: n(adv.yangchi?.temporary) });
      return { kind: "list", title: "Imbalance", lines: [...(p ? [{ bold: "Permanent:", text: p === "yin" ? "Yin" : "Yang" }] : []), ...t.map(k => ({ bold: "Temporary:", text: k === "yin" ? "Yin" : "Yang" }))],
        empty: "In balance." }; }
    case "arete": return { kind: "arete" };
    case "quintessenceWheel": return { kind: "quintessenceWheel" };
    case "hunterVirtues": return { kind: "hunterVirtues" };
    case "spheres1": case "spheres2": case "spheres3": {
      const k = Number(key.slice(-1)) - 1, list = ["correspondence", "entropy", "forces", "life", "matter", "mind", "prime", "spirit", "time"].slice(k * 3, k * 3 + 3);
      return { kind: "dots", title: "", rows: list.map(sp => ({ label: loc(a.system.spheres?.[sp]?.label) || sp.replace(/^./, c => c.toUpperCase()), path: `system.spheres.${sp}.value`, max: 5, dots: SR.dots(a.system.spheres?.[sp]?.value), roll: "m20Cast" })) };
    }
    case "arts": return { kind: "items", title: "Arts", roll: "c20Cantrip", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.art$/)(i))), empty: "None yet." };
    case "realms": return { kind: "items", title: "Realms", roll: "c20Cantrip", rows: fixedRows(a, Object.entries(CR.REALMS).map(([k, r]) => [r.label, new RegExp(`\\b${k}\\b`, "i")]), i => /types\.realms?$/.test(i.system?.type ?? "")), empty: "" };
    case "birthrights": { const s = a.system; return { kind: "list", title: "Birthright/Frailty", lines: [strip(s.birthright1), strip(s.birthright2), strip(s.frailty)].filter(Boolean).map((t, k, l) => ({ bold: k === l.length - 1 && strip(s.frailty) ? "Frailty:" : "", text: t })), empty: "On the Bio tab." }; }
    case "antithesis": return { kind: "text", title: "Antithesis", value: strip(a.system.antithesis) || "—" };
    case "threshold": return { kind: "text", title: "Ravaging/Musing Threshold", value: strip(a.system.threshold) || "—" };
    case "passions": return { kind: "items", title: "Passions", roll: "passion", rows: itemRows(itemsOf(a, i => i.type === "Trait" && isType(/types\.passion$/)(i))), empty: "None yet." };
    case "fetters": return { kind: "items", title: "Fetters", roll: "fetter", rows: itemRows(itemsOf(a, i => i.type === "Trait" && isType(/types\.fetter$/)(i))), empty: "None yet." };
    case "darkPassions": return { kind: "items", title: "Dark Passions", rows: itemRows(itemsOf(a, i => i.type === "Trait" && isType(/types\.darkpassion$/)(i))), empty: "None yet." };
    case "arcanoi": return { kind: "items", title: "Arcanoi", roll: "useArcanos", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.arcanoi$/)(i))), empty: "None yet." };
    case "psyche": return { kind: "list", title: "The Shadow", lines: [{ bold: "Psyche:", text: strip(a.system.psyche) || "—" }, { bold: "Archetype:", text: loc(a.system.archetype) || strip(a.system.archetype) || "—" }], empty: "", roll: "shadow", rollLabel: "The Shadow" };
    case "thorns": return { kind: "list", title: "Thorns", lines: strip(a.system.thorns) ? [{ text: strip(a.system.thorns) }] : [], empty: "None (the Bio tab)." };
    case "edges": return { kind: "items", title: "Edges", roll: "hunterPower", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.edge$/)(i))), empty: "None yet." };
    case "lores": return { kind: "items", title: "Lore", roll: "demonEvoke", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.lore$/)(i))), empty: "None yet." };
    case "apocalypticForm": return { kind: "list", title: "Apocalyptic Form", lines: itemsOf(a, i => i.type === "Trait" && isType(/types\.apocalypticform$/)(i)).map(i => ({ text: i.name, bold: i.system?.ishightorment ? "High Torment:" : "" })), empty: "None yet.", roll: "demonForm", rollLabel: "Take the form" };
    case "hekau": return { kind: "items", title: "Hekau", roll: "mummyCast", rows: fixedRows(a, ["amulets", "alchemy", "celestial", "effigy", "necromancy", "nomenclature"].map(k => [UR.HEKAU[k].label, new RegExp(k.replace(/s$/, ""), "i")]), i => i.type === "Power" && isType(/types\.hekau$/)(i)), empty: "" };
    case "horrors": return { kind: "items", title: "Horrors", roll: "orphHorror", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.horror$/)(i))), empty: "None yet." };
    case "stains": return { kind: "items", title: "Stains", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.stain$/)(i))), empty: "None." };
    case "defaultAbilities": return { kind: "list", title: "Default Abilities", lines: SR.ORPHEUS_DEFAULTS.map(([t, p]) => ({ text: `${t} (${p})` })), empty: "" };
    case "rites": return { kind: "items", title: "Rites", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.(rite|ritual)$/)(i)), false), empty: "None." };
    case "combat": {
      const weapons = itemsOf(a, i => i.type === "Melee Weapon" || i.type === "Ranged Weapon").map(i => ({ id: i.id, name: `${i.name} (${weaponLine(i)})`, dots: null }));
      const armor = itemsOf(a, i => i.type === "Armor").map(i => ({ id: i.id, name: `${i.name} (${armorLine(i)})`, dots: null }));
      return { kind: "items", title: "Combat", rows: [...weapons, ...armor], empty: "No weapons or armor: add them as items.", note: `Soak ${n(a.system.soak?.bashing)} bashing, ${n(a.system.soak?.lethal)} lethal, ${n(a.system.soak?.aggravated)} aggravated` };
    }
    case "gear": { const m = a.system.money ?? {}, g = strip(a.system.gear);
      return { kind: "items", title: "Possessions", rows: itemRows(itemsOf(a, i => i.type === "Item"), false), empty: g ? "" : "Nothing carried.", note: [g, n(m.carried) || n(m.bank) ? `Money: ${n(m.carried)} carried, ${n(m.bank)} put by` : ""].filter(Boolean).join(" · ") };
    }
    case "fetishes": return { kind: "items", title: "Fetishes and Talens", rows: itemsOf(a, i => i.type === "Fetish").map(i => ({ id: i.id, name: n(i.system?.gnosis) ? `${i.name} (Gnosis ${n(i.system.gnosis)})` : i.name, dots: SR.dots(i.system?.level ?? i.system?.value) })), empty: "None." };
    case "rotes": return { kind: "items", title: "Rotes", roll: sheetFor(a) === "m20" ? "m20Cast" : "daMage", rows: itemRows(itemsOf(a, i => i.type === "Rote"), false), empty: "None yet." };
    case "description": { const cut = t => t.length > 240 ? `${t.slice(0, 237)}...` : t;
      return { kind: "list", title: "History and Description", lines: [["Appearance:", strip(a.system.appearance)], ["History:", strip(a.system.background)]].filter(([, t]) => t).map(([bold, t]) => ({ bold, text: cut(t) })), empty: "Written on the Bio tab." };
    }
    case "health": return { kind: "health" };
    case "systemHealth": return { kind: "systemHealth" };
    case "experience": return { kind: "experience" };
    case "weakness": return { kind: "text", title: "Weakness", value: a.system.weakness || "—" };
    case "derangements": return { kind: "list", title: "Derangements", lines: String(a.system.derangement ?? "").split(/\n+/).filter(Boolean).map(t => ({ text: t })), empty: "None (the Bio tab)." };
    case "disciplines": return { kind: "items", title: "Disciplines", roll: "useDiscipline", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.discipline$/)(i))), empty: "None yet." };
    case "rituals": return { kind: "items", title: "Rituals", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/ritual/)(i)), false), empty: "None." };
    case "paths": return { kind: "items", title: "Paths", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/disciplinepath$/)(i))), empty: "None." };
    // The system's own Virtues (same markup, same data, same rolls as its Core tab)
    case "virtues": return { kind: "systemVirtues" };
    case "superiorVirtues": return { kind: "dots", title: "Superior Virtues", roll: "hunterPower",
      rows: [["Wisdom", "wisdom"], ["Faith", "faith"], ["Zeal", "zeal"]].map(([label, k]) => ({ label, path: `flag:${ACT}.inquisitor.${k}`, max: 5, dots: SR.dots(inq[k]) })),
      note: "Each at most its Virtue (Dark Ages: Inquisitor p. 157)." };
    case "piety": { const p = inq.piety ?? (n(adv.virtues?.conscience?.permanent) + n(adv.virtues?.selfcontrol?.permanent));
      return { kind: "track", title: "Piety", permPath: `flag:${ACT}.inquisitor.piety`, cells: SR.track(p, 0) }; }
    case "callous": { const c = n(adv.conviction?.permanent ?? adv.conviction?.temporary), p = inq.piety ?? (n(adv.virtues?.conscience?.permanent) + n(adv.virtues?.selfcontrol?.permanent));
      return { kind: "text", title: "Callous?", value: c > n(p) ? "Yes: Conviction above Piety" : "No", note: "Dark Ages: Inquisitor p. 162" }; }
    case "holyArt": return { kind: "items", title: "Holy Art", roll: "hunterPower", rows: itemRows(itemsOf(a, i => i.type === "Power")), empty: "None yet: Blessings and Holy Art paths are Powers." };
    case "gifts": case "gifts2": {
      const all = itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.gift$/)(i)), false);
      const half = Math.ceil(all.length / 2);
      return { kind: "items", title: "Gifts", roll: key === "gifts" ? "useGift" : null, rows: key === "gifts" ? all.slice(0, half) : all.slice(half), empty: key === "gifts" ? "None yet." : "" };
    }
    /* Dark Ages: Fae */
    case "dominions": { const fav = FR.COURTS[fae.court]?.favored;
      return { kind: "dots", title: "Dominions", rows: [["Day", "day"], ["Dawn", "dawn"], ["Dusk", "dusk"], ["Night", "night"]].map(([label, id]) => ({ label, path: `flag:${ACT}.daFae.dominions.${id}`, max: 5,
        dots: SR.dots(fae.dominions?.[id]), roll: "daCantrip", strong: fav === id, hint: `${FR.DOMINIONS[id].gloss}${fav === id ? " (the Court's Dominion)" : ""}` })) }; }
    case "cantrips": return { kind: "list", title: "Cantrips", lines: (fae.cantrips ?? []).map(c => ({ bold: c.name, text: `${FR.DOMINIONS[c.dominion]?.label ?? c.dominion} ${c.level}` })), empty: "None yet.",
      roll: "daCantrip", rollLabel: "Cast a cantrip", warn: n(fae.weaving?.perm) ? "" : "" };
    case "mistsWeaving": return null; // two tracks, see expand()
    case "oaths": return { kind: "list", title: "Oaths", lines: (fae.oaths ?? []).map(o => ({ bold: `${FR.OATHS[o.kind]?.label ?? o.kind} ${o.rating}`, text: o.terms, dim: o.active === false })), empty: "None.", roll: "daOath", rollLabel: "Keep an oath" };
    case "echoes": return { kind: "list", title: "Echoes", lines: (fae.echoes ?? []).map(e => ({ text: e.trigger })), empty: "None.", roll: "daEcho", rollLabel: "Face an Echo" };
    case "features": return { kind: "list", title: "Features", lines: [...(fae.greater ?? []).map(t => ({ bold: "Greater:", text: t })), ...(fae.lesser ?? []).map(t => ({ text: t }))], empty: "None.", roll: "daMien", rollLabel: "Take or drop the mien" };
    /* Dark Ages: Mage */
    case "foundation": { const F = MR.FELLOWSHIPS[mage.fellowship];
      return { kind: "dots", title: F ? `Foundation: ${F.foundation}` : "Foundation", roll: "daCast", rows: [{ label: F?.foundation ?? "Foundation", path: `flag:${ACT}.daMage.foundation`, max: 5, dots: SR.dots(mage.foundation), roll: "daCast" }],
        note: `Aura: ${MR.auraOf(mage.foundation)}${F ? ` (${F.label})` : ""}` }; }
    case "pillars": { const ps = MR.pillarsOf(mage.fellowship);
      return { kind: "dots", title: "Pillars", rows: ps.map(p => ({ label: p.label, path: `flag:${ACT}.daMage.pillars.${p.key}`, max: 5, dots: SR.dots(mage.pillars?.[p.key]), roll: "daCast", hint: p.domain })),
        note: ps.length ? "" : "Choose a fellowship first." }; }
    case "quintessence": return { kind: "stat", key: "quintessence", stat: a.system.quintessence };
    case "backlash": { const tw = mage.twilight ?? {}, br = mage.brandings ?? [];
      return { kind: "list", title: "Backlash: Branding and Twilight", lines: [{ bold: "Twilight", text: `${n(tw.temp)} temporary, ${n(tw.perm)} permanent` }, ...br.map(b => ({ bold: `Brand ${b.level}`, text: b.text ?? "" }))], empty: "", roll: "daMage", rollLabel: "Fellowship and Pillars" }; }
    default: return null;
  }
}
/** A block key may stand for more than one block (Mists and Weaving). */
function expand(key, a) {
  if (key === "mistsWeaving") {
    const f = flagObj(a, "daFae"), m = f.mists ?? {}, w = f.weaving ?? {}, imb = FR.imbalance(n(m.perm), n(w.perm));
    return [{ kind: "track", title: "Mists", roll: "daMists", hint: "The Mists: hide, cloak, Kenning", permPath: `flag:${ACT}.daFae.mists.perm`, tempPath: `flag:${ACT}.daFae.mists.temp`, cells: SR.track(m.perm, m.temp ?? m.perm) },
      { kind: "track", title: "Weaving", roll: "daUnleash", hint: "Unleash a Dominion", permPath: `flag:${ACT}.daFae.weaving.perm`, tempPath: `flag:${ACT}.daFae.weaving.temp`, cells: SR.track(w.perm, w.temp ?? w.perm),
        warn: imb ? `${imb === "mists" ? "Mists" : "Weaving"} imbalance: ${imb === "mists" ? "cantrips" : "Unleashing"} +1 difficulty (Dark Ages: Fae p. 102).` : "",
        note: f.origin ? (FR.ORIGINS[f.origin].alwaysMien ? "Firstborn: always in the fae mien." : f.mien ? "In the fae mien." : "In human shape.") : "Choose an Origin." }];
  }
  const b = block(key, a);
  return Array.isArray(b) ? b : b ? [b] : [];
}

const BUTTONS = {
  daFae: ["fa-scroll", "Edit Origin, Court, cantrips, Features, Echoes and Oaths"], daCounter: ["fa-shield-alt", "Counter"], daRest: ["fa-tree", "Rest in a faerie realm"],
  daMage: ["fa-scroll", "Fellowship and Pillars"], daQuintessence: ["fa-gem", "Gather Quintessence"],
  hunterSheet: ["fa-scroll", "Order, Superior Virtues, Piety"], hunterPower: ["fa-cross", "A Blessing"], prayer: ["fa-praying-hands", "Prayer"],
  rageRoll: ["fa-fire", "Rage"], useGift: ["fa-paw", "Use a Gift"], shiftForm: ["fa-exchange-alt", "Change form"],
  useDiscipline: ["fa-tint", "Use a Discipline"], frenzy: ["fa-angry", "Frenzy check"], feed: ["fa-glass-whiskey", "Feed"], ghoulBlood: ["fa-tint", "Vitae"],
  m20Cast: ["fa-magic", "Work magick"], m20Counter: ["fa-shield-alt", "Countermagick"],
  c20Cantrip: ["fa-star", "Cast a cantrip"], c20Unleash: ["fa-bolt", "Unleash"], c20Mists: ["fa-cloud", "The Mists"],
  useArcanos: ["fa-ghost", "Use an Arcanos"], passion: ["fa-heart", "A Passion"], fetter: ["fa-link", "A Fetter"], shadow: ["fa-mask", "The Shadow"],
  secondSight: ["fa-eye", "Second Sight"],
  demonEvoke: ["fa-fire-alt", "Evoke"], demonForm: ["fa-feather-alt", "Apocalyptic form"], demonReap: ["fa-hand-holding", "Reap Faith"],
  mummyCast: ["fa-ankh", "Hekau"], mummySekhem: ["fa-sun", "Sekhem"], mummyBalance: ["fa-balance-scale", "Balance"],
  kotFeed: ["fa-tint", "Feed on Chi"], kotSpend: ["fa-yin-yang", "Spend Chi"], kotDharma: ["fa-dharmachakra", "Dharma roll"],
  orphHorror: ["fa-skull", "A Horror"], orphVitality: ["fa-heartbeat", "Vitality"], orphSpite: ["fa-bolt", "Spite"]
};

function header(def, a) {
  const choices = {
    courts: () => Object.entries(FR.COURTS).map(([id, c]) => ({ id, label: c.label })), origins: () => Object.entries(FR.ORIGINS).map(([id, o]) => ({ id, label: o.label })),
    fellowships: () => Object.entries(MR.FELLOWSHIPS).map(([id, f]) => ({ id, label: f.label })), orders: () => Object.entries(HR.ORDERS).map(([id, o]) => ({ id, label: o.label }))
  };
  const computed = {
    clan: () => { const s = a.system; return s.clan === "custom" ? (s.custom?.clan || "") : loc(s.clan); },
    legacies: () => [strip(a.system.legacyseelie), strip(a.system.legacyunseelie)].filter(Boolean).join(" / ") || "(see the Bio tab)",
    startConviction: () => { const c = RR.CREEDS[leaf(a.system.creed)]; return c ? String(c.conviction) : "—"; },
    domitor: () => { const l = a.flags?.["wodx-creation"]?.lineage ?? {}; return game.actors.get(l.domitor)?.name ?? (l.domitor || "—"); },
    domitorClan: () => { const l = a.flags?.["wodx-creation"]?.lineage ?? {}; const d = game.actors.get(l.domitor); return d ? (d.system.clan === "custom" ? d.system.custom?.clan : loc(d.system.clan)) : "—"; }
  };
  return def.header.map(col => col.map(f => fieldView(f, a, choices, computed)));
}

/** What a stored value reads as: a system choice is a translation key; "custom" names its own text. */
function shownValue(a, path, v) {
  if (v === "custom") { const k = String(path).split(".").pop(); return a.system?.custom?.[k] || "custom"; }
  return loc(v) || (v === 0 ? "0" : "");
}
function fieldView(f, a, choices, computed) {
  const v = foundry.utils.getProperty(a, SR.propPath(f.path ?? ""));
  if (f.kind === "flagSelect") { const opts = choices[f.options](); return { ...f, kind: "select", display: opts.find(o => o.id === v)?.label ?? "—", options: [{ id: "", label: "(choose)" }, ...opts.map(o => ({ ...o, sel: o.id === v }))] }; }
  if (f.kind === "flagText") return { ...f, kind: "input", value: v ?? "", display: v || "—" };
  if (f.kind === "system") return { ...f, kind: "mirror", value: v ?? "", display: shownValue(a, f.path, v) || "—" };
  if (f.kind === "computed") return { ...f, value: computed[f.key]?.() || "—" };
  return { ...f, value: v ?? "" };
}
/** The flag fields the Bio tab shows too, built the same way as the header's. */
function bioView(def, a) {
  const fake = { ...def, header: [SR.bioFields(def)] };
  return header(fake, a)[0];
}

/** Everything the book's layout needs, from the actor. */
export function viewFor(id, a) {
  const def = SR.SHEETS[id];
  const rows = SR.abilityRows(def, a.system.abilities ?? {}, [...a.items]);
  const titles = { talents: "Talents", skills: "Skills", knowledges: "Knowledges" };
  const cols = list => list.map(c => c.flatMap(k => expand(k, a)));
  return {
    id, book: def.book, sheetPage: def.sheetPage, title: def.title,
    header: header(def, a), bio: bioView(def, a), bioTitle: def.title,
    abilityCols: Object.entries(rows).map(([k, list]) => ({ title: titles[k], rows: list.map(r => ({ ...r, dots: SR.dots(r.value) })) })),
    abilityNote: def.abilityNote ?? "",
    powers: def.powers ? { title: def.powers.title, cols: cols(def.powers.cols) } : null,
    advantages: cols(def.advantages), lower: cols(def.lower), hasLower: def.lower.length > 0, page2: cols(def.page2 ?? []),
    page2Title: id === "faeDA" ? "Oaths, Echoes and Features" : (def.page2Title ?? ""), page2InCore: !def.page2Tab,
    buttons: (def.buttons ?? []).filter(b => BUTTONS[b]).map(b => ({ api: b, icon: BUTTONS[b][0], label: BUTTONS[b][1] }))
  };
}

/* -------------------------------------------------------------- */
/*  The sheet classes                                              */
/* -------------------------------------------------------------- */

function wodxSheet(Base, type) {
  return class extends Base {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: [...(super.defaultOptions.classes ?? []), "wodx-sheet"] }); }
    get wodxId() { return sheetFor(this.actor); }
    get hasWodx() { return !!this.wodxId; }
    async getData() {
      const data = await super.getData();
      const id = this.wodxId;
      if (!id) return data;
      if (id === "faeDA" && data.actor.system.listdata?.settings) data.actor.system.listdata.settings.haschimericalhealth = false;
      data.wodx = viewFor(id, this.actor);
      data.wodxCore = true; // the system skips drawing its own Core tab, which _renderInner replaces
      return data;
    }
    async _renderInner(data) {
      const html = await super._renderInner(data);
      const id = this.wodxId;
      const el = html.find ? html : $(html);
      // The extras (strip, Possessions, Ties, notes, search) come on every WoDX sheet, in either layout
      try { await X.decorate(this, el); } catch (e) { console.error("WoDX Sheets | extras", e); }
      if (!id) return html;
      const core = el.find(".tab.core");
      if (core.length) core.html(await foundry.applications.handlebars.renderTemplate(`modules/${MOD}/templates/core.hbs`, data));
      // The header mirrors the Bio tab's own controls: the same options, the same value, the same lock
      const bio = el.find(".tab.bio");
      el.find(".wodx-mirror[data-mirror]").each((_, m) => {
        const path = m.dataset.mirror;
        const src = bio.find(`[name="${path}"]`)[0];
        let ctl;
        if (src) { ctl = src.cloneNode(true); ctl.removeAttribute("name"); ctl.removeAttribute("id"); if (src.tagName === "SELECT") ctl.value = src.value; }
        else { ctl = document.createElement("input"); ctl.type = "text"; ctl.value = m.dataset.value ?? ""; }
        ctl.classList.add("wodx-mirror-ctl"); ctl.dataset.set = path;
        if (src?.dataset?.dtype) ctl.dataset.dtype = src.dataset.dtype;
        m.replaceWith(ctl);
      });
      // The fields WoDX keeps for this line, on the Bio tab too (bound to the same data)
      if (bio.length && data.wodx.bio?.length) bio.prepend(await foundry.applications.handlebars.renderTemplate(`modules/${MOD}/templates/bio-extra.hbs`, data));
      const p2 = SR.SHEETS[id].page2Tab;
      if (p2) el.find(`.tab.${p2}`).html(await foundry.applications.handlebars.renderTemplate(`modules/${MOD}/templates/page2-tab.hbs`, data));
      el.find(".sheet-body > .sheet-headline").first().text(SR.SHEETS[id].title);
      // The system's own Virtues part, under the book's heading
      el.find(".tab.core .wodx-virtues .sheet-banner-text").first().text("Virtues");
      el.addClass(`wodx-${id}`);
      return html;
    }
    activateListeners(html) {
      super.activateListeners(html);
      try { X.listen(this, html[0] ?? html); } catch (e) { console.error("WoDX Sheets | extras", e); }
      if (this.wodxId) listeners(this, html[0] ?? html);
    }
    async _onDropItem(event, data) {
      const before = new Set(this.actor.items.map(i => i.id));
      const r = await super._onDropItem(event, data);
      const made = this.actor.items.find(i => !before.has(i.id));
      if (made && data?.wodx?.actor && data.wodx.actor !== this.actor.id) {
        await made.update({ [`flags.${MOD}.in`]: null });
        await X.afterDrop(this.actor, made, data);
      }
      return r;
    }
  };
}

function listeners(sheet, root) {
  const actor = sheet.actor;
  const get = p => foundry.utils.getProperty(actor, SR.propPath(p));
  const set = (p, v) => actor.update({ [SR.propPath(p)]: v });
  root.querySelectorAll(".wodx-book .wodx-roll[data-roll], .wodx-actions-row .wodx-roll[data-roll], .wodx-page2 .wodx-roll[data-roll]").forEach(el => el.addEventListener("click", ev => {
    ev.preventDefault();
    const fn = game.wodxActions?.[el.dataset.roll];
    if (fn) fn({ actor });
  }));
  root.querySelectorAll(".wodx-open[data-itemid]").forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); actor.items.get(el.dataset.itemid)?.sheet?.render(true); }));
  if (!sheet.options.editable) return;
  // As on the system's sheets: a locked sheet keeps its permanent traits; only points (boxes) still change
  const locked = () => { if (!sheet.locked) return false; ui.notifications.warn(game.i18n.localize("wod.system.sheetlocked")); return true; };
  root.querySelectorAll(".wodx-mirror-ctl[data-set]").forEach(el => el.addEventListener("change", () => {
    const raw = el.value, v = el.dataset.dtype === "Number" ? n(raw) : raw;
    set(el.dataset.set, v);
  }));
  root.querySelectorAll(".wodx-pick[data-set]").forEach(el => el.addEventListener("change", () => set(el.dataset.set, el.value || null)));
  root.querySelectorAll(".wodx-text[data-set]").forEach(el => el.addEventListener("change", () => set(el.dataset.set, el.dataset.number ? n(el.value) : String(el.value).slice(0, 200))));
  root.querySelectorAll(".wodx-dots[data-set]").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
    ev.preventDefault();
    if (locked()) return;
    set(box.dataset.set, Math.min(n(box.dataset.max) || 5, SR.clickValue(n(get(box.dataset.set)), n(dot.dataset.i))));
  })));
  root.querySelectorAll(".wodx-track").forEach(tr => {
    const pp = tr.dataset.perm, tp = tr.dataset.temp;
    tr.querySelectorAll(".wodx-dots .wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
      ev.preventDefault();
      if (locked()) return;
      const perm = SR.clickValue(n(get(pp)), n(dot.dataset.i));
      const upd = { [SR.propPath(pp)]: perm };
      if (tp) upd[SR.propPath(tp)] = Math.min(perm, n(get(tp) ?? get(pp)));
      actor.update(upd);
    }));
    tr.querySelectorAll(".wodx-boxes .wodx-box").forEach(b => b.addEventListener("click", ev => {
      ev.preventDefault();
      const cur = get(tp) ?? get(pp);
      set(tp, Math.min(pp ? n(get(pp)) : 10, SR.clickValue(n(cur), n(b.dataset.i))));
    }));
  });
  root.querySelectorAll(".wodx-dots[data-add-ability]").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", async ev => {
    ev.preventDefault();
    if (locked()) return;
    const v = n(dot.dataset.i), flat = box.dataset.flatkey;
    if (flat) return actor.update({ [`system.abilities.${flat}.value`]: v, [`system.abilities.${flat}.isvisible`]: true });
    return actor.createEmbeddedDocuments("Item", [{ name: box.dataset.addAbility, type: "Trait", system: { type: `wod.types.${box.dataset.group}secondability`, value: v, max: 5 } }]);
  })));
}

export const WodxChangelingSheet = wodxSheet(ChangelingActorSheet, "Changeling");
export const WodxMageSheet = wodxSheet(MageActorSheet, "Mage");
export const WodxHunterSheet = wodxSheet(HunterActorSheet, "Hunter");
export const WodxWerewolfSheet = wodxSheet(WerewolfActorSheet, "Werewolf");
export const WodxVampireSheet = wodxSheet(VampireActorSheet, "Vampire");
export const WodxMortalSheet = wodxSheet(MortalActorSheet, "Mortal");
export const WodxWraithSheet = wodxSheet(WraithActorSheet, "Wraith");
export const WodxDemonSheet = wodxSheet(DemonActorSheet, "Demon");
export const WodxMummySheet = wodxSheet(MummyActorSheet, "Mummy");
for (const [k, c] of Object.entries({ WodxChangelingSheet, WodxMageSheet, WodxHunterSheet, WodxWerewolfSheet, WodxVampireSheet, WodxMortalSheet, WodxWraithSheet, WodxDemonSheet, WodxMummySheet })) Object.defineProperty(c, "name", { value: k });

const LABELS = {
  Changeling: "WoDX: follows the era (Dark Ages: Fae, or Changeling 20th)", Mage: "WoDX: follows the era (Dark Ages: Mage, or Mage 20th)",
  Hunter: "WoDX: follows the era (Dark Ages: Inquisitor, Hunter: The Reckoning, or the system's Hunter)", Werewolf: "WoDX: follows the era (Dark Ages: Werewolf, or W20)",
  Vampire: "WoDX: follows the era (V20 Dark Ages, V20, or Kindred of the East)", Mortal: "WoDX: follows the era (a ghoul, Orpheus, or the system's Mortal)",
  Wraith: "WoDX: Wraith 20th", Demon: "WoDX: Demon: The Fallen", Mummy: "WoDX: Mummy: The Resurrection"
};

// The line skins (B91 to B94): WoDX's own fonts, papers and rules on every sheet, or the system's look as it ships
const skinOn = v => document.body.classList.toggle("wodx-skin", v !== "system");

Hooks.once("init", async () => {
  X.setup();
  AN.setup();
  game.settings.register(MOD, "sheetLook", {
    name: "Sheet look",
    hint: "WoDX gives each line's sheets their own fonts, paper and section rules, in light and dark mode. The system's look brings back the fonts and banners that come with the World of Darkness system.",
    scope: "world", config: true, type: String, default: "wodx",
    choices: { wodx: "WoDX line skins", system: "The system's own look" },
    onChange: skinOn
  });
  skinOn(game.settings.get(MOD, "sheetLook"));
  const reg = foundry.documents.collections.Actors;
  for (const [type, cls] of [["Changeling", WodxChangelingSheet], ["Mage", WodxMageSheet], ["Hunter", WodxHunterSheet], ["Werewolf", WodxWerewolfSheet], ["Vampire", WodxVampireSheet], ["Mortal", WodxMortalSheet],
    ["Wraith", WodxWraithSheet], ["Demon", WodxDemonSheet], ["Mummy", WodxMummySheet]])
    reg.registerSheet(MOD, cls, { types: [type], makeDefault: true, label: LABELS[type] });
  const tpl = foundry.applications.handlebars;
  const block = await tpl.getTemplate(`modules/${MOD}/templates/block.hbs`);
  const page2 = await tpl.getTemplate(`modules/${MOD}/templates/page2.hbs`);
  Handlebars.registerPartial("wodxBlock", block);
  Handlebars.registerPartial("wodxPage2", page2);
  game.modules.get(MOD).api = { version: "0.8.0", extras: X, rules: SR, sheetFor, viewFor,
    anachronism: { check: AN.check, scan: AN.scan, report: AN.report, keep: AN.keep } };
});
