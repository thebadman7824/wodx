/**
 * Rules at a glance: the rules the Storyteller checks most at the table, gathered from the WoDX rules files (no copy
 * of their numbers lives here), and filtered to the era in force and the lines at the table. No Foundry in this file.
 *
 *   sections({lines, profile}) -> [{id, title, lines: [{label, value, ref}], ref, for}]
 *
 * A section's `for` lists the lines it belongs to; "all" sections are always shown.
 */
import {DIFFICULTIES, FRENZY_PROVOCATIONS, ROTSCHRECK_PROVOCATIONS, SUNLIGHT_INTENSITY, SUNLIGHT_EXPOSURE, FIRE_HEAT, FIRE_SIZE} from "../../wodx-actions/scripts/rules.js";
import {QUIET, STAVE, KINDS as MAGICK_KINDS} from "../../wodx-actions/scripts/m20-rules.js";
import {HARROWING_KINDS, escapeDifficulty} from "../../wodx-actions/scripts/wraith-rules.js";
import {FORM_DIFF} from "../../wodx-actions/scripts/garou-rules.js";
import {CHECKS} from "../../wodx-actions/scripts/checks-rules.js";
import {CHARTS, DEFAULT_CHART} from "../../wodx-otherworlds/scripts/rules.mjs";

/** The lines a section can belong to (the same ids as the prelude templates). */
export const LINES = ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant", "mortal"];

const label = s => String(s ?? "").replace(/\s*\(p\. [^)]*\)/g, "");
const pageOf = s => (String(s ?? "").match(/\(p\. ([^)]*)\)/) ?? [])[1] ?? "";
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());

const PLACES = {laboratory: "Laboratory or factory", metropolis: "City", town: "Town", village: "Village", wilderness: "Wilderness",
  "caern-urban": "Urban caern", "caern-active": "Active caern", "caern-powerful": "Powerful caern", "caern-legendary": "Legendary caern", "broken-land": "Broken land"};

/** The Gauntlet chart in force: the era profile names it, W20's otherwise. */
export function gauntletChart(profile) {
  const id = profile?.rules?.gauntletChart;
  return CHARTS[id] ? id : DEFAULT_CHART;
}

function difficulties() {
  return {id: "difficulty", title: "Difficulties", for: "all", ref: "V20 p. 249 printed (pdf 257)",
    lines: [...Object.entries(DIFFICULTIES).map(([d, t]) => ({label: t, value: `difficulty ${d}`})),
      {label: "Successes", value: "1 marginal, 2 moderate, 3 complete, 4 exceptional, 5 phenomenal"},
      {label: "Botch", value: "no successes and at least one 1"},
      {label: "Willpower", value: "one point before the roll: one automatic success, and no botch"},
      {label: "Specialty", value: "4 dots or more: each 10 counts twice"}]};
}

function health() {
  const pen = [["Bruised", "0"], ["Hurt", "-1"], ["Injured", "-1"], ["Wounded", "-2"], ["Mauled", "-2"], ["Crippled", "-5"], ["Incapacitated", "no actions"]];
  return {id: "health", title: "Health and soak", for: "all", ref: "V20 health chart; each line's book has the last word",
    lines: [...pen.map(([l, p]) => ({label: l, value: `dice ${p}`})),
      {label: "Bashing", value: "soaked with Stamina; vampires halve what gets through"},
      {label: "Lethal", value: "mortals soak only with armour; the supernatural soak with Stamina"},
      {label: "Aggravated", value: "vampires soak with Fortitude only; Garou with Stamina; mortals not at all"},
      {label: "Damage", value: "the weapon's dice, plus one for each attack success after the first"}]};
}

function checks() {
  return {id: "checks", title: "Common checks", for: "all", ref: "the Common checks list in every menu",
    lines: CHECKS.map(c => ({label: label(c.label), value: `difficulty ${c.diff}`, ref: c.ref}))};
}

function frenzy() {
  return {id: "frenzy", title: "Frenzy (Self-Control or Instinct)", for: ["vampire"], ref: "the Frenzy window's list",
    lines: Object.values(FRENZY_PROVOCATIONS).filter(p => p.diff !== null && !/^Other/.test(p.label))
      .map(p => ({label: label(p.label), value: `difficulty ${p.diff}`, ref: pageOf(p.label) ? `p. ${pageOf(p.label)}` : ""}))};
}

function rotschreck() {
  return {id: "rotschreck", title: "Rötschreck (Courage)", for: ["vampire"], ref: "VtDA20 p. 357",
    lines: Object.values(ROTSCHRECK_PROVOCATIONS).filter(p => !/^Other/.test(p.label)).map(p => ({label: label(p.label), value: `difficulty ${p.diff}`}))};
}

function fireAndSun() {
  const diffRows = (o, head) => Object.values(o ?? {}).map(x => ({label: `${head}: ${x.label}`, value: `soak difficulty ${x.diff}`}));
  const levelRows = (o, head) => Object.entries(o ?? {}).map(([k, t]) => ({label: `${head}: ${t}`, value: `${k} health level${k === "1" ? "" : "s"} a turn`}));
  return {id: "burns", title: "Fire and sunlight", for: ["vampire"], ref: "sunlight VtDA20 p. 359; fire as the Fire window",
    lines: [...diffRows(FIRE_HEAT, "Heat"), ...levelRows(FIRE_SIZE, "Size"), ...diffRows(SUNLIGHT_INTENSITY, "Sun"), ...levelRows(SUNLIGHT_EXPOSURE, "Exposure")]};
}

function gauntlet(profile) {
  const id = gauntletChart(profile), c = CHARTS[id];
  return {id: "gauntlet", title: `The Gauntlet (${c.name})`, for: ["werewolf", "mage", "changeling"], ref: c.source,
    lines: Object.entries(c.values).map(([k, v]) => ({label: PLACES[k] ?? cap(k), value: `rating ${v}`, ref: c.ourCall?.[k] ? `house reading: ${c.ourCall[k]}` : ""}))};
}

function shifting() {
  return {id: "forms", title: "Changing form (Stamina + Primal-Urge)", for: ["werewolf"], ref: "W20 p. 285; Rage W20 p. 262",
    lines: [...Object.entries(FORM_DIFF).map(([f, d]) => ({label: cap(f), value: `difficulty ${d}`})),
      {label: "Successes needed", value: "one for each form passed through"},
      {label: "Rage", value: "the Rage window rolls it by the moon and form"}]};
}

function paradox() {
  const kinds = Object.values(MAGICK_KINDS ?? {}).map(k => ({label: k.label, value: `difficulty Arete level + ${k.add}`}));
  return {id: "paradox", title: "Magick and Paradox", for: ["mage"], ref: "M20 p. 506, 549",
    lines: [...kinds,
      {label: "Backlash", value: "one die for each Paradox point, difficulty 6"},
      {label: "Up to 5 successes", value: "one die of bashing a success, and a trivial Paradox Flaw"},
      {label: "6 to 10", value: "a Burn, or a minor Paradox Flaw"},
      {label: "11 to 15", value: "a lethal Burn, or a significant Flaw, a Paradox spirit, a mild Quiet"},
      {label: "16 to 20", value: "a lethal Burn and a permanent point, or two worse effects"},
      {label: "21 or more", value: "an aggravated Burn and two permanent points, or worse"},
      ...QUIET.map(([top, t], i) => ({label: `Quiet ${i + 1}${Number.isFinite(top) ? ` (up to ${top})` : ""}`, value: t})),
      {label: "Staving off", value: STAVE}]};
}

function harrowing() {
  return {id: "harrowing", title: "Harrowings", for: ["wraith"], ref: "Wraith 20th p. 242",
    lines: [...Object.values(HARROWING_KINDS).map(t => ({label: t, value: ""})),
      {label: "Escape roll", value: `permanent Willpower at difficulty ${escapeDifficulty(0)}, as low as ${escapeDifficulty(2)} for good play; no Shadow dice`}]};
}

const ALL = [difficulties, health, checks, frenzy, rotschreck, fireAndSun, gauntlet, shifting, paradox, harrowing];

/** The sections for this table: "all" ones, then those of the lines in play (every section when no line is known). */
export function sections({lines = [], profile = null, every = false} = {}) {
  const set = new Set((lines ?? []).filter(l => LINES.includes(l)));
  const out = [];
  for ( const make of ALL ) {
    const s = make(profile);
    s.lines = s.lines.filter(l => l && l.label);
    const fits = s.for === "all" || every || !set.size || s.for.some(l => set.has(l));
    if ( fits && s.lines.length ) out.push(s);
  }
  return out;
}

/** One search string for a section line, so the panel's search box finds it by any word. */
export const searchText = (s, l) => `${s.title} ${l.label} ${l.value} ${l.ref ?? ""}`.toLowerCase();
