/**
 * What each of book one's twists does when the Storyteller reveals it (Rothenstein Rebuilt, Volume Three picks x1,
 * x2 and x5, B6650-B6659). The twists' own words stay in the Storyteller's third volume; these are short handles in
 * our own words.
 *
 * show (x1): the reveal's sight. item: a thing put in the hands of a character on the company's map; sight: marks on
 * a map through the town looks; sound: a line the characters near it hear (WoDX Senses), on the map it names.
 * after (x2): what the people who know do next, on their own. comes: they come to the company's map, and keep a home
 * and a round; runs: they leave the valley (off every map, out of the roles); talk: street talk; push: a front is
 * pushed; step: a front's step lands if it is next; lean: a name leaned on for a role. A variant key limits an action
 * to that heart.
 * favour (x5): someone who now owes the company, tracked as a debt to call in from a chapter.
 * Pure data: reveal-rules.mjs reads it.
 */

export const REVEALS = {
  1: {show: {item: {name: "A letter in cheap red wax", text: "Carried a long way against someone's ribs. Addressed to a Kindred in Olomouc."}},
    after: [{do: "push", front: "court"}, {do: "talk", text: "A rider left for Olomouc in a hurry, asking the road for a stranger's name."}]},
  2: {show: {item: {name: "A hollow harvest ball", text: "Horsehair and leather around a hollow, and a folded note in Latin inside."}},
    after: [{do: "comes", who: "A Moravian elder", preset: "recluse", home: "Dolany"}, {do: "talk", text: "An old man of the Moravian families asks which of the newcomers found the ball."}]},
  3: {show: {sound: {scene: "Lower Town", text: "Through a shutter, someone talks in their sleep, and the words are about one of you."}},
    after: [{do: "comes", who: "Hynek", preset: "labourer", home: "Lower Town"}, {do: "push", front: "cult"}]},
  4: {show: {sound: {scene: "Dolany", text: "In a dark cottage someone weeps and says one name over and over."}},
    after: [{do: "talk", text: "The madwoman of Dolany names a girl in a red scarf, and the village listens."}]},
  5: {show: {item: {name: "A packet in black wax", text: "Sealed in the east. The courier would not let go of it."}},
    after: [{do: "push", front: "court"}, {do: "talk", text: "The voivode's riders were on the ridge road asking for a courier."}]},
  6: {show: {item: {name: "A small stoppered vial", text: "Bitter at the cork. Not a remedy for anyone's digestion."}},
    after: [{do: "runs", who: "Master Eckhart"}, {do: "push", front: "council"}]},
  7: {show: {sight: {scene: "Lower Town · Craftsmen's Lane", looks: [{kind: "rubble", spots: 2, r: 0.04}, {kind: "calm", spots: 1, r: 0.03, text: "✎", color: "#5a4a3a"}]}},
    after: [{do: "comes", who: "Graff's clerk", preset: "clerk", home: "Lower Town"}, {do: "push", front: "council"}]},
  8: {show: {item: {name: "A small child's boot", text: "Worn through at the toe. It hung in the hermit's lodge."}},
    after: [{do: "runs", who: "Egon"}, {do: "comes", who: "A Dolany mother", preset: "labourer", home: "Dolany"}]},
  9: {show: {item: {name: "A gold signet ring", text: "Three lines and a circle cut in dull gold, worn smooth by many hands."}},
    after: [{do: "talk", text: "Someone in Dolany asks whether the Altenhof family ever kept the stones."}]},
  10: {show: {item: {name: "A rusted iron collar", text: "A brass tag, half worn away: a name and a village."}},
    after: [{do: "talk", text: "A family in Dolany asks after a hound that ran off with its master years ago."}]},
  11: {show: {sight: {scene: "Lower Town · Market Square", looks: [{kind: "fire", spots: 1, r: 0.03, mark: "torch"}]}},
    after: [{do: "push", front: "court"}, {do: "talk", text: "The players' fire-eater has not been seen eating or drinking, and asks the way to the keep."}]},
  12: {show: {sound: {scene: "Lower Town · Market Square", text: "A boy's whisper behind the stalls: it went to a man in the clerk's office."}},
    after: [{do: "comes", who: "Jan Dvorak", preset: "clerk", home: "Lower Town"}, {do: "push", front: "council"}]},
  13: {show: {item: {name: "A small iron tube sealed with lead", text: "Never opened. Given by a dying man in Esztergom."}},
    after: [{do: "push", front: "court"}, {do: "talk", text: "A foreign Kindred has been asking at the toll-post after a traveller from Hungary."}]},
  14: {show: {sound: {scene: "Ivo's Ferry", text: "A fevered woman mutters the way to a shrine that is on no map."}},
    after: [{do: "push", front: "marta"}, {do: "lean", who: "Jitka"}]},
  15: {show: {sound: {scene: "Dolany", text: "A shepherd, half drunk, swears the cousin in the north wood is dead, and looks over a shoulder."}},
    after: [{do: "talk", text: "A shepherd of Dolany will not take the flock past the north wood any more."}]},
  16: {show: {sight: {scene: "The Water Mill", looks: [{kind: "calm", spots: 1, r: 0.03, text: "✂", color: "#5a4a3a"}]}},
    after: [{do: "runs", who: "Graff's clerk"}, {do: "comes", who: "Otto the miller", preset: "labourer", home: "The Water Mill"}, {do: "push", front: "council"}]},
  17: {show: {sight: {scene: "Dolany", looks: [{kind: "calm", spots: 1, r: 0.04, text: "✦", color: "#e8e8f0"}]}},
    after: [{do: "push", front: "church"}, {do: "talk", text: "The child came home holding a cold hand that was not there."}]},
  18: {show: {item: {name: "A coin of red-veined silver", text: "Not struck in this valley, but dug from it."}},
    after: [{do: "runs", who: "Ludwig"}, {do: "push", front: "council"}]},
  19: {show: {sound: {scene: "Lower Town · West Gate and the Common", text: "A girl at the shrine speaks a name one of you has not heard since childhood."}},
    after: [{do: "step", front: "church", step: "message"}, {do: "comes", who: "Jindrich", preset: "merchant", home: "Lower Town · West Gate and the Common"}]},
  20: {show: {sound: {scene: "The Tavern", text: "The knight says a name, Dietrich, and asks who has seen the man."}},
    after: [{do: "comes", who: "Reinhold", preset: "innkeeper", home: "The Tavern"}, {do: "push", front: "council"}]},
  21: {show: {sound: {scene: "Dolany", text: "Old Vlasta, very quietly: an old midwife knows who does not breathe."}},
    after: [{do: "talk", text: "Baba Yaroslava has been asking Vlasta what was seen."}], favour: {who: "Old Vlasta", from: "c8", what: "a remedy, a bite hidden, a face read"}},
  22: {show: {sight: {scene: "The Mountain Trail", looks: [{kind: "calm", spots: 1, r: 0.04, text: "♞", color: "#c9b27a"}]}},
    after: [{do: "push", front: "court"}, {do: "talk", text: "The voivode was seen at the blind man's cross after midnight."}]},
  23: {show: {item: {name: "An old arrow with a spiral cut", text: "Shot a generation ago, and carried in a boar's hide ever since."}},
    after: [{do: "talk", text: "The huntsman saw the spiral on the arrow, and has said nothing since."}], favour: {who: "Baba Yaroslava", from: "c8", what: "lore of the binding, early"}},
  24: {show: {item: {name: "A page in the clerk's hand", text: "Copied from the margrave's office, folded small for someone in the Adit."}},
    after: [{do: "push", front: "cult"}, {do: "runs", who: "Ctibor's clerk", variant: "killed"}, {do: "talk", text: "The auditor's clerk has been seen on the Adit road at night.", variant: "turned"}]}
};

/** Favours that come from a judgement, not a twist: told the truth, Reinhold owes the company. */
export const JUDGED_FAVOURS = [{judgement: "reinhold", choice: "truth", who: "Reinhold", from: "c8", what: "a sword at the company's side"}];

/** The three murders (pick x5): after the third, the Lower Town turns cold toward the company. */
export const MURDERS = ["Havel", "Old Vlasta", "Ctibor's clerk"];
/** How the Lower Town shows it: shutters closed on its maps, and each of its people one step cooler. */
export const COLD = {scenes: "Lower Town", talk: "In the Lower Town doors shut when the newcomers pass, and nobody sells them bread.",
  looks: [{kind: "calm", spots: 6, r: 0.02, text: "▮", color: "#2e2a26"}], delta: -1};
