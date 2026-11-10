/**
 * Prelude and Embrace scene templates (WoDX Storyteller 0.9.0), the pure rules. A one-on-one session that plays a
 * character's life before the change and the change itself. Each line has a template in four parts: questions to ask
 * before, the beats of the turn, the first nights after, and which WoDX button records it. The Storyteller fills it in;
 * nothing here speaks for an NPC. No Foundry here.
 */

/** The templates, one per line. Plain prompts for the Storyteller, never lines for characters to say. */
export const PRELUDES = {
  vampire: {label: "Vampire: the Embrace", title: "The Embrace", creation: "Embrace a mortal (WoDX Creation)",
    before: ["Who was this person by day: work, home, faith, the people who would miss them?",
      "What did the sire see in them? Beauty, skill, spite, a debt, an accident?",
      "Where did the sire watch from, and for how long, before choosing?",
      "One thing the mortal loved that the Kindred will lose: sunlight, a meal, a face."],
    turn: ["The night it happens: where, and was the mortal alone?",
      "The draining. Play it short and frightening; the player decides what the mortal felt last.",
      "Death, then the first taste of vitae. The Hunger wakes before the mind does.",
      "Was the Embrace sanctioned by the prince or lord, or done in secret? This sets the first danger."],
    after: ["The first hunt, with or without the sire. Who is the first vessel?",
      "What the sire teaches, and what is held back: the clan, the Traditions, the Masquerade.",
      "The release, or the abandonment: is the childe presented to the city or left to fend?",
      "Someone from the mortal life who comes looking."]},
  ghoul: {label: "Ghoul: the first draught", title: "The first draught", creation: "Give vitae (WoDX Creation)",
    before: ["What was the mortal useful for: a key, a trade, a name, a strong back?",
      "Did the domitor court the mortal, or simply take them?",
      "What does the mortal want badly enough to drink?"],
    turn: ["The first taste of vitae: the rush, the strength, the wrongness.",
      "The first step of the blood bond, if the domitor intends one.",
      "A first order. Small, and a test."],
    after: ["The second draught, and the third. Count them: three on three nights binds fully.",
      "The first time the ghoul goes without, and what the craving is like.",
      "Who in the mortal's life notices the change?"]},
  werewolf: {label: "Werewolf: the First Change", title: "The First Change", creation: "The First Change (WoDX Creation)",
    before: ["The Kinfolk family, if any: did anyone know what the child might become?",
      "Rage before the Change: fights, dreams of running, animals that would not come near.",
      "Was a pack or sept already watching? Who?",
      "For a lupus: the wolf pack, the territory, the first sign that something was different."],
    turn: ["The trigger: fear, fury, the moon, or a Garou who forced it.",
      "The Change itself. The player chooses what is broken or hurt in the first frenzy.",
      "Who sees it, and what does the Veil make of it?"],
    after: ["The Garou who come: rescue or capture?",
      "The Rite of Passage, set for the next few nights. Which camp or sept runs it?",
      "The auspice: what was the moon that night?",
      "The human, or wolf, life that cannot go on as it was."]},
  mage: {label: "Mage: the Awakening", title: "The Awakening", creation: "The Awakening (WoDX Creation)",
    before: ["What did the mortal believe about how the world works? Faith, science, nothing at all?",
      "The question or pain that kept them up at night.",
      "Signs before: coincidences, dreams, a stranger who seemed to know them."],
    turn: ["The moment the Avatar wakes: a crisis, a vision, a slow dawning, or a teacher's push.",
      "What the mage saw in that moment. This sets the Essence and the first paradigm.",
      "The first act of will that bends the world, and the first taste of how Paradox answers it."],
    after: ["Who finds the new mage first: a Tradition, the Technocracy, a Marauder, a Nephandus?",
      "The mentor, and what the mentor asks in return.",
      "The Seeking that waits: the first dream of the Avatar's next lesson."]},
  changeling: {label: "Changeling: the Chrysalis", title: "The Chrysalis", creation: "The Chrysalis (WoDX Creation)",
    before: ["The childhood: imaginary friends, stories that felt real, a sense of being a stranger.",
      "What has grown dull in this person's life? Banality's weight.",
      "Which kith waits underneath, and how has it shown itself already?"],
    turn: ["The trigger: art, love, terror, or a fae who brought it on.",
      "The fae mien opening over the mortal face. What does the changeling see in a mirror?",
      "The first glimpse of the Dreaming: a freehold, a chimera, a trod."],
    after: ["Who fosters the new changeling: a noble, a commoner, a motley?",
      "Seelie or Unseelie: the first choice that shows which Court suits them.",
      "The mortal life still there by day, and the threat of forgetting."]},
  wraith: {label: "Wraith: death and the Caul", title: "Death and the Caul", creation: "Death into a wraith (WoDX Creation)",
    before: ["The life: loves, grudges, the work left unfinished.",
      "The Passions that will hold the wraith to the Skinlands. Name two or three.",
      "The Fetters: places, people and objects that matter enough to anchor a ghost."],
    turn: ["The death itself. Sudden or slow? Who was there?",
      "Waking in the Caul, the Shadowlands grey and decaying around them.",
      "The Shadow's first whisper. Let the player hear it as the Shadow, from their own fears."],
    after: ["The Reaping: who pulls the new wraith from the Caul? A Hierarchy reaper, a Renegade, a Heretic, a Spectre?",
      "The first visit to a Fetter, and what has changed there.",
      "The Guild or faction that wants the newcomer, and why."]},
  hunter: {label: "Hunter: the first sight", title: "The first sight", creation: "",
    before: ["Who was this person, and what did they protect: family, parish, town, a trade?",
      "What did they half-see before and explain away?"],
    turn: ["The night the truth is undeniable: a monster at work, and the person who was there to see it.",
      "Fight, flight, or freeze. The player chooses; the cost comes later.",
      "Who else saw, and who will not believe it?"],
    after: ["The first ally, or the first person who calls them mad.",
      "Proof, a weapon, a book: what do they look for first?",
      "The monster that knows they saw."]},
  mummy: {label: "Mummy: the Spell of Life", title: "The Spell of Life", creation: "",
    before: ["The first life, in Egypt or later: who was this person when they first lived?",
      "Who performed the Spell of Life, and what was promised in return?",
      "How many times has the mummy died and risen since? What was lost each time?"],
    turn: ["The waking: in a tomb, a museum, a cellar? Who or what is there?",
      "The body knitting itself whole. Hunger, cold and memory return in that order or another.",
      "The first sign of the Duat and the judges' purpose for this life."],
    after: ["The cult, the Amenti, or the Shemsu-heru who come for the risen one.",
      "The modern world, or the era's world, seen fresh.",
      "The enemy of Set's line who was waiting for this."]},
  demon: {label: "Demon: the host", title: "The host", creation: "A Fallen takes a host (WoDX Creation)",
    before: ["The host's life: why was this body empty enough to take? Coma, despair, a death?",
      "The demon's memory of the war in Heaven, and of the Abyss.",
      "The House, and the name the demon held before the Fall."],
    turn: ["The escape from the Abyss and the first breath in a human body.",
      "The host's memories flooding in. What does the demon feel about this person's life?",
      "The first use of Faith, and the first mortal who sees something they should not."],
    after: ["The host's family, coworkers, friends: how long can the demon play the part?",
      "Other Fallen who come calling, and which faction they speak for.",
      "The first thrall offered, or demanded."]},
  revenant: {label: "Revenant: birth into the family", title: "Born into the family", creation: "A revenant (WoDX Creation)",
    before: ["Which family, and which house or holding? What is the place like?",
      "The family's master, and what the family owes it."],
    turn: ["The first time the blood shows: the Discipline that wakes, the body that stops ageing.",
      "The first task the family sets."],
    after: ["Kin who are rivals, kin who are allies.", "The first outsider to learn what the family is."]},
  mortal: {label: "Mortal: a life before", title: "A life before", creation: "",
    before: ["Where and when was this person born? What did the family do?",
      "The person they trust most, and the one they fear.",
      "Something they want that the chronicle can threaten."],
    turn: ["The first brush with the supernatural: something seen, heard or lost.",
      "What they told themselves afterwards to make sense of it."],
    after: ["Who they told, and what that person did.", "The thread that pulls them into the chronicle."]}
};

/** Fixed order for the line list. */
export const LINE_ORDER = ["vampire", "ghoul", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon", "revenant", "mortal"];

/** The template a character's sheet suggests. */
export function lineFor(type, variant = "") {
  const t = String(type ?? "").toLowerCase(), v = String(variant ?? "").toLowerCase();
  if ( t === "mortal" && v === "ghoul" ) return "ghoul";
  if ( t === "mortal" && v === "revenant" ) return "revenant";
  if ( ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mummy", "demon"].includes(t) ) return t;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  return "mortal";
}

/**
 * Hunters follow the era: inquisitors in the Dark Ages, Hunters Hunted until 1998, the Imbuing from 1999. On the
 * Future Darkness branch the first imbued wake in 2023.
 */
export function hunterKind(year, {futureBranch = false} = {}) {
  const y = year === null || year === undefined || year === "" ? NaN : Number(year);
  if ( !Number.isFinite(y) ) return "mortal";
  if ( y < 1500 ) return "inquisitor";
  if ( y < (futureBranch ? 2023 : 1999) ) return "mortal";
  return "imbued";
}

function hunterTemplate(year, opts = {}) {
  const base = PRELUDES.hunter, kind = hunterKind(year, opts);
  if ( kind === "imbued" ) return {...base, title: "The Imbuing",
    turn: ["The night the truth is undeniable: a monster at work, and the person who was there to see it.",
      "The Messengers' words, which the player hears as text and feeling, never as a voice the Storyteller plays.",
      "The first edge or power, used without understanding.", "Who else was imbued that night, nearby?"]};
  if ( kind === "inquisitor" ) return {...base, title: "The calling",
    before: [...base.before, "The faith: which order, saint or confessor shapes this person's sense of right?"],
    after: [...base.after, "The order or Church office that hears of it, and what it asks."]};
  return base;
}

/** The parts of one prelude for a line, a character's name and the year. */
export function composePrelude({line, name = "", year = null, futureBranch = false} = {}) {
  const key = PRELUDES[line] ? line : "mortal";
  const tpl = key === "hunter" ? hunterTemplate(year, {futureBranch}) : PRELUDES[key];
  const who = String(name ?? "").trim();
  return {line: key, title: who ? `${tpl.title}: ${who}` : tpl.title, label: tpl.label, creation: tpl.creation,
    parts: [{heading: "Before", items: tpl.before}, {heading: "The turn", items: tpl.turn}, {heading: "After", items: tpl.after}]};
}

/** The journal text: the parts as lists with a blank notes line under each, then where to record it. */
export function preludeHtml(p) {
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
  const parts = p.parts.map(part => `<h2>${esc(part.heading)}</h2><ul>${part.items.map(i => `<li>${esc(i)}</li>`).join("")}</ul><p><em>Notes:</em></p>`).join("");
  const rec = p.creation ? `<p>Record it with ${esc(p.creation)} when the scene ends.</p>` : "<p>Nothing to record in Creation: write what changed on the sheet.</p>";
  return `<p>A one-on-one session. Questions and beats to steer by; the player decides what the character feels and does.</p>${parts}<h2>When it ends</h2>${rec}`;
}
