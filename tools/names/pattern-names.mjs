/**
 * Names made by pattern (B5600): for peoples whose recorded own names are two-part names in translation (a word that
 * describes, then a thing: Red Cloud, Spotted Tail, Two Crows), new names are made from the same parts, never from parts
 * the records lack. Writes modules/wodx-creation/data/people-patterned.mjs; the recorded names stay where they are.
 *   node tools/names/pattern-names.mjs
 */
import {writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));

// Peoples whose recorded own names are mostly two-part names in translation
export const PEOPLES = ["lakota", "cheyenne", "mandan", "hidatsa", "arikara", "pawnee", "crow", "blackfoot", "arapaho", "kiowa"];
// Only English words of the two kinds count as parts, so a name in the people's own language, a nation's name or a
// title (Mandan, King) never splits into one
const MODS = new Set("Bad Big Black Bloody Blue Bobtailed Brave Brown Charging Crazy Crooked Curly Cut Deaf Dull Fast Fighting Flying Forked Ghost Good Gray Hairy Hard Heavy High Hollow Holy Horned Howling Hunting Iron Jumping Kicking Lame Last Lean Left Little Lone Long Looking Low Mad Medicine Morning Moving Night Old Other Poor Pretty Rainy Rattling Red Rocky Rotten Running Scabby Scattered Sharp Short Silver Sitting Sleepy Small Spotted Standing Starving Stone Stumbling Swift Tall Thin Thunder Traveling Turning War Whistling White Wild Wooden Yellow Young".split(" "));
const HEADS = new Set("Antelope Arm Axe Bear Beaver Bird Blanket Bonnet Bow Buffalo Bull Calf Cloud Coat Corn Coyote Crane Crow Day Deer Dog Eagle Elk Feather Fox Hail Hand Hawk Head Heart Hill Horn Horse Knife Lance Leaf Lightning Magpie Moccasin Moon Mountain Owl Plume Rabbit Raven River Road Robe Rock Shadow Shawl Shell Shield Shirt Snake Star Sun Swan Tail Thunder Tree Turkey Water Weasel Whirlwind Wing Wolf".split(" "));
const NUM = new Set(["Two", "Three", "Four", "Six", "Ten"]);
const PLURALS = new Set("Arrows Bears Bulls Crows Feathers Horns Horses Moons Ravens Robes Swans Suns".split(" "));

/** The recorded own names of a people (no references, no "A woman of"). */
function recorded(o, sex) {
  const t = P.WORLD_PEOPLE_TABLES.find(t => t.id === `names.native.${sex}.${o}`);
  return [...new Set((t?.results ?? []).map(r => r.text).filter(s => !s.includes("{") && !/^A (woman|man) of/.test(s)))];
}

/** A steady shuffle, the same on every run. */
function shuffle(a, seed) {
  let h = 2166136261;
  for ( const c of seed ) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const r = () => ((h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0) / 4294967296);
  const b = [...a];
  for ( let i = b.length - 1; i > 0; i-- ) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** The parts of two-part names: describing words and things, with numbers kept for plural things. */
function parts(names) {
  const mods = new Set(), heads = new Set(), plurals = new Set(), nums = new Set();
  for ( const n of names ) {
    const w = n.replace(/ Woman$/, "").split(" ");
    if ( w.length !== 2 ) continue;
    if ( NUM.has(w[0]) && PLURALS.has(w[1]) ) { nums.add(w[0]); plurals.add(w[1]); continue; }
    if ( MODS.has(w[0]) ) mods.add(w[0]);
    if ( HEADS.has(w[1]) ) heads.add(w[1]);
  }
  return {mods: [...mods], heads: [...heads], plurals: [...plurals], nums: [...nums]};
}

const out = {};
for ( const o of PEOPLES ) {
  const men = recorded(o, "male"), women = recorded(o, "female");
  const have = new Set([...men, ...women]);
  const p = parts([...men, ...women]);
  const want = Math.max(0, 300 - have.size);
  const made = [];
  for ( const m of p.mods ) for ( const h of p.heads ) if ( m !== h ) made.push(`${m} ${h}`);
  for ( const n of p.nums ) for ( const h of p.plurals ) made.push(`${n} ${h}`);
  const fresh = shuffle(made.filter(n => !have.has(n)), o);
  // Women's names: the recorded women's pattern of a two-part name and "Woman" (Moving Robe Woman, Calf Woman)
  const fem = shuffle(fresh.filter(n => !NUM.has(n.split(" ")[0])).map(n => `${n} Woman`).filter(n => !have.has(n)), `${o}:f`);
  // A people with no recorded women's own names gets none made, as nothing shows how they were formed
  const nM = women.length ? Math.ceil(want * 0.6) : want, nF = women.length ? want - nM : 0;
  out[o] = {male: fresh.slice(0, nM), female: fem.slice(0, nF), parts: p.mods.length + p.heads.length + p.nums.length + p.plurals.length};
}

const body = Object.entries(out).map(([o, v]) => `  ${o}: {\n    male: ${JSON.stringify(v.male)},\n    female: ${JSON.stringify(v.female)}}`).join(",\n");
writeFileSync(join(root, "modules/wodx-creation/data/people-patterned.mjs"), `/**
 * WoDX Creation: names made by pattern (B5600), kept apart from the recorded names. Written by
 * tools/names/pattern-names.mjs; run it again rather than editing by hand.
 *
 * For each people below the recorded own names are two-part names in translation, a describing word and a thing (Red
 * Cloud, Spotted Tail) or a number and things (Two Crows), and women's names often end in "Woman". New names join only
 * parts the same people's records hold. They fill the people's own-name tables up to 300 names, drawn a third as often as
 * the recorded names, from a Roll Table of their own ("made by pattern").
 */
export const PATTERNED = {
${body}};
`);
for ( const [o, v] of Object.entries(out) ) console.log(o, v.male.length, v.female.length, "from", v.parts, "parts");
