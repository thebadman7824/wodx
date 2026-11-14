/**
 * Trials (B3608-B3609): the pure part. No Foundry here, so the harness can test it.
 *
 * A trial is a short contest read from the law of the land (law-rules.mjs): how guilt is proved there and then
 * decides its form. An ordeal is one roll against pain; trial by combat goes to WoDX Combat; compurgation is an oath
 * the defendant's word must carry; a court that needs a confession puts the defendant to the question; a jury or a
 * judge weighs the case, the defence rolling its best of Law, Politics or Expression against the prosecution's dice;
 * a show trial has its verdict written before it starts. The rolls go through WoDX Storyteller's call for a roll.
 * The Law Ability covers courts and procedure (V20 pdf 117; M20 pdf 287). Dice and difficulties are house figures
 * (docs/PENDING-REVIEW.md).
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The forms of trial. pools: the defendant's alternatives, [attribute, ability]. */
export const FORMS = {
  ordeal: {label: "Trial by ordeal", note: "Hot iron, boiling water or the cold river: the wound must heal clean, or the body must float or sink as the custom says.",
    pools: [["stamina", ""]], diff: 8},
  combat: {label: "Trial by combat", note: "The accused or a champion fights the accuser's champion. Run the fight with WoDX Combat; the side left standing is in the right.", combat: true},
  oath: {label: "Compurgation", note: "The accused swears innocence, and oath-helpers must swear to the accused's good word.",
    pools: [["charisma", "etiquette"], ["manipulation", "politics"]], diff: 7},
  confession: {label: "Inquiry by confession", note: "The court must have a confession, and may put the accused to the question under its rules to get one.",
    pools: [["stamina", ""]], diff: 7, contest: 5},
  judge: {label: "Trial before a judge", note: "Witnesses and evidence before a judge or a bench.",
    pools: [["manipulation", "law"], ["charisma", "politics"], ["manipulation", "expression"]], diff: 6, contest: 3},
  jury: {label: "Trial by jury", note: "Twelve neighbours weigh the evidence; a good advocate counts for much.",
    pools: [["manipulation", "law"], ["charisma", "expression"], ["manipulation", "politics"]], diff: 6, contest: 3},
  show: {label: "A show trial", note: "The verdict was written before the court sat. Only pull with the Party or a miracle helps.",
    pools: [["manipulation", "politics"], ["manipulation", "law"]], diff: 9, contest: 6}
};

/** The forms a land's law allows, the usual one first. */
export function formsFor(law = {}) {
  const p = new Set(law.proof ?? []);
  if ( p.has("party") ) return ["show", ...(p.has("evidence") ? ["judge"] : [])];
  const out = [];
  if ( p.has("jury") ) out.push("jury");
  if ( p.has("confession") ) out.push("confession");
  if ( p.has("evidence") || p.has("forensic") || p.has("witnesses") ) out.push("judge");
  if ( p.has("ordeal") ) out.push("ordeal");
  if ( p.has("oath") ) out.push("oath");
  if ( p.has("combat") ) out.push("combat");
  return out.length ? [...new Set(out)] : ["judge"];
}

/** What each line brings to the dock (B3609): a difficulty change and a note for the Storyteller. */
export const LINE_TRIAL = {
  vampire: {diff: 1, note: "Courts sit by day: a Kindred defendant must speak through a ghoul, a lawyer or a letter, or wake into the light.", ordeal: "Hot iron and fire are death to the Kindred; the cold river at least does not burn."},
  ghoul: {diff: 0, note: "A ghoul's domitor may pull strings for the servant, or cut it loose."},
  werewolf: {diff: 0, note: "Rage in the dock is a danger to everyone in the room."},
  mage: {diff: 0, note: "Magic in a court before so many sleepers is vulgar, and the Paradox follows it."},
  changeling: {diff: 0, note: "Cold iron in the cells and the manacles hurts the fae."},
  wraith: {diff: 0, note: "A wraith can whisper to a juror, or stand beside the one who lied."},
  hunter: {diff: 0, note: "No court will hear that the dead were monsters."},
  mummy: {diff: 0, note: "A long life leaves old names, and a court can find them."},
  demon: {diff: 0, note: "The host's past is on trial with the host."},
  revenant: {diff: -1, note: "The family's lawyers are good and its money is better."},
  mortal: {diff: 0, note: ""}
};

/**
 * The trial's roll, for WoDX Storyteller's call for a roll. form: a FORMS key (the land's usual when left out).
 * opts: witnesses (how many saw it), forensic (the age has forensic proof), bribed (a bribe was paid), courtRank (the
 * best court seat the accused or an ally holds, 0-4, -1 for none), line, standingDiff (B3611), deeds (how many).
 */
export function trialRequest(law = {}, {form = null, actorId = "", name = "", witnesses = 1, bribed = false, courtRank = -1, line = "mortal", standingDiff = 0, deeds = 1} = {}) {
  const forms = formsFor(law);
  const key = FORMS[form] ? form : forms[0];
  const f = FORMS[key];
  const lt = LINE_TRIAL[line] ?? LINE_TRIAL.mortal;
  const notes = [f.note];
  if ( f.combat ) return {form: key, label: f.label, combat: true, notes, forms};
  let diff = f.diff + n(standingDiff);
  if ( key !== "ordeal" && key !== "combat" ) diff += n(lt.diff);
  if ( lt.note ) notes.push(lt.note);
  if ( key === "ordeal" && lt.ordeal ) notes.push(lt.ordeal);
  if ( bribed && n(law.bribe) <= 4 ) { diff -= 1; notes.push("The bribe was taken."); }
  else if ( bribed ) notes.push("The bribe was refused, and noted.");
  if ( n(courtRank) >= 3 ) { diff -= 2; notes.push("A friend sits on the bench."); }
  else if ( n(courtRank) >= 1 ) { diff -= 1; notes.push("A friend in the court smooths the way."); }
  let contest = null;
  if ( f.contest ) {
    const proof = law.proof ?? [];
    const dice = f.contest + clamp(n(witnesses), 0, 4) + (proof.includes("forensic") ? 2 : 0) + (proof.includes("evidence") ? 1 : 0) + clamp(n(deeds) - 1, 0, 3);
    contest = {dice: clamp(dice, 1, 20), diff: 6, label: key === "confession" ? "The questioners" : "The prosecution"};
  }
  return {form: key, label: `${f.label}${name ? `: ${name}` : ""}`, forms, notes,
    request: {label: `${f.label}${name ? `: ${name}` : ""}`, pools: f.pools, diff: clamp(Math.round(diff), 3, 10), mode: "open", contest, actorIds: actorId ? [actorId] : []}};
}

/** Read the verdict from the call's answer: wins means acquitted. A botch at the ordeal or the question is a confession. */
export function verdictOf(answer = {}, form = "judge") {
  if ( !answer || answer.pending || answer.blocked ) return {guilty: null, words: "No verdict yet."};
  if ( answer.botch ) return {guilty: true, words: form === "ordeal" ? "The wound festers: guilty in the sight of God." : "Guilty, and the accused's own words sealed it."};
  if ( answer.wins ) return {guilty: false, words: form === "ordeal" ? "The ordeal shows the accused clean." : "Not guilty."};
  return {guilty: true, words: "Guilty."};
}
