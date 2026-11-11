/**
 * The trait effect table (WoDX Chronicle 0.18.0). One entry per merit, flaw and background; every module reads it.
 * Built from the PC book checks of 2026-11-11 (names, costs and printed pages; pdf pages in `pdf`). Mechanics live in
 * `effects`, written in WoDX's own words; an entry with no effects yet works as a name match, a pattern and a
 * kind check. Patterns P1-P20 are listed in PATTERNS. `holders`: the kinds that can have it ("any" for all);
 * `against`: the kinds it works on or reacts to.
 */
export const PATTERNS = {
 "P1": "Roll modifier",
 "P2": "Sense change",
 "P3": "Standing condition",
 "P4": "Triggered condition",
 "P5": "Pool change",
 "P6": "Feeding rule",
 "P7": "Attitude seed",
 "P8": "Night draw weight",
 "P9": "Rumour",
 "P10": "Ledger entry",
 "P11": "Prompt to the Storyteller",
 "P12": "Reroll or save",
 "P13": "Sleep and waking",
 "P14": "Combat rule",
 "P15": "Shows on the token",
 "P16": "Experience cost",
 "P17": "Gate (Only when)",
 "P18": "Frenzy and Virtue",
 "P19": "Power resistance",
 "P20": "Storyteller only"
};

/** Where each background's hook goes (see the design doc's Backgrounds section). */
export const BACKGROUND_HOOKS = {
 "people": "named NPCs with their own attitude",
 "rumour": "rumour sources and identities",
 "attitude": "attitude floor or seed with a group",
 "lever": "weekly lever on breaches, heat and rumours",
 "money": "WoDX Storyteller money",
 "reroll": "a banked reroll or die a story",
 "pool": "a pool or its recovery",
 "feeding": "feeding and herd upkeep",
 "place": "a region on the map",
 "condition": "a standing condition",
 "prompt": "a card to the Storyteller",
 "item": "items that unlock powers",
 "task": "long tasks go faster",
 "codex": "codex pages open",
 "story": "Storyteller only"
};

export const MERITS_FLAWS = [
  {"key": "acute-sense", "name": "Acute Sense", "kind": "merit", "cost": "1", "book": "V20", "page": 479, "pdf": 487, "type": "physical", "patterns": ["P1", "P2"], "holders": ["any"], "against": ["any"], "aliases": ["Acute Senses"], "effects": [{"ch": "roll", "tags": ["sight", "hearing", "smell", "taste", "touch"], "diff": -2, "nameTags": true, "note": "-2 difficulty with the sense named on the merit"}]},
  {"key": "ambidextrous", "name": "Ambidextrous", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P14"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "bruiser", "name": "Bruiser", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P1", "P14"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["intimidation"], "diff": -1, "note": "-1 difficulty to intimidate someone who has not shown they are stronger"}]},
  {"key": "catlike-balance", "name": "Catlike Balance", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P14"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["balance"], "diff": -2, "note": "-2 difficulty on balance rolls"}]},
  {"key": "early-riser", "name": "Early Riser", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P13"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "eat-food", "name": "Eat Food", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P11"], "holders": ["kindred"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "friendly-face", "name": "Friendly Face", "kind": "merit", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["first-meeting"], "diff": -1, "note": "-1 difficulty on friendly social rolls with a stranger at the first meeting"}]},
  {"key": "blush-of-health", "name": "Blush of Health", "kind": "merit", "cost": "2", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P15", "P1"], "holders": ["kindred"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "enchanting-voice", "name": "Enchanting Voice", "kind": "merit", "cost": "2", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["voice"], "diff": -2, "note": "-2 difficulty to persuade, charm or command by voice"}]},
  {"key": "daredevil", "name": "Daredevil", "kind": "merit", "cost": "3", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["risky"], "dice": 3, "note": "+3 dice on a risky action (difficulty 8 or more, three health levels at stake)"}]},
  {"key": "efficient-digestion", "name": "Efficient Digestion", "kind": "merit", "cost": "3", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P6"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "huge-size", "name": "Huge Size", "kind": "merit", "cost": "4", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P14", "P3"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "hard-of-hearing", "name": "Hard of Hearing", "kind": "flaw", "cost": "1", "book": "V20", "page": 480, "pdf": 488, "type": "physical", "patterns": ["P2", "P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["hearing"], "diff": 2, "note": "+2 difficulty on hearing rolls"}]},
  {"key": "short", "name": "Short", "kind": "flaw", "cost": "1", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P3"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "smell-of-the-grave", "name": "Smell of the Grave", "kind": "flaw", "cost": "1", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P15", "P7"], "holders": ["kindred"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": 1, "againstKinds": ["mortal"], "note": "+1 difficulty on social rolls with mortals"}]},
  {"key": "twitch", "name": "Twitch", "kind": "flaw", "cost": "1", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": ["Tic", "Tic/Twitch"], "effects": []},
  {"key": "bad-sight", "name": "Bad Sight", "kind": "flaw", "cost": "1/3", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P2", "P1"], "holders": ["any"], "against": ["any"], "aliases": ["Poor Sight"], "effects": [{"ch": "roll", "tags": ["sight"], "diff": 2, "note": "+2 difficulty on sight rolls"}]},
  {"key": "fourteenth-generation", "name": "Fourteenth Generation", "kind": "flaw", "cost": "2", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P5", "P6"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "fifteenth-generation", "name": "Fifteenth Generation", "kind": "flaw", "cost": "4", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P5", "P6"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "disfigured", "name": "Disfigured", "kind": "flaw", "cost": "2", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": 2, "note": "+2 difficulty on social rolls"}]},
  {"key": "dulled-bite", "name": "Dulled Bite", "kind": "flaw", "cost": "2", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P6"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "infectious-bite", "name": "Infectious Bite", "kind": "flaw", "cost": "2", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P11"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "one-eye", "name": "One Eye", "kind": "flaw", "cost": "2", "book": "V20", "page": 481, "pdf": 489, "type": "physical", "patterns": ["P2", "P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["sight"], "diff": 2, "note": "+2 difficulty on sight rolls"}, {"ch": "roll", "tags": ["ranged"], "diff": 1, "note": "+1 difficulty on ranged attacks"}]},
  {"key": "vulnerability-to-silver", "name": "Vulnerability to Silver", "kind": "flaw", "cost": "2", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P14"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "open-wound", "name": "Open Wound", "kind": "flaw", "cost": "2/4", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P3", "P5"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": 1, "note": "+1 difficulty on social rolls while the wound shows"}]},
  {"key": "addiction", "name": "Addiction", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P11", "P6"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "child", "name": "Child", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P3", "P17"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["leadership"], "diff": 2, "againstKinds": ["mortal"], "note": "+2 difficulty to lead or direct mortal adults"}]},
  {"key": "deformity", "name": "Deformity", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "glowing-eyes", "name": "Glowing Eyes", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P15", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["intimidation"], "diff": -1, "againstKinds": ["mortal"], "note": "-1 difficulty to intimidate mortals"}, {"ch": "roll", "tags": ["sight", "ranged"], "diff": 1, "note": "+1 difficulty on sight rolls and ranged attacks"}, {"ch": "roll", "tags": ["stealth"], "diff": 2, "note": "+2 difficulty on Stealth in the dark"}]},
  {"key": "lame", "name": "Lame", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P3"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "lazy", "name": "Lazy", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["unplanned"], "diff": 1, "note": "+1 difficulty on unplanned physical actions"}]},
  {"key": "monstrous", "name": "Monstrous", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "permanent-fangs", "name": "Permanent Fangs", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P15"], "holders": ["kindred"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "permanent-wound", "name": "Permanent Wound", "kind": "flaw", "cost": "3", "book": "V20", "page": 482, "pdf": 490, "type": "physical", "patterns": ["P3", "P5"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "slow-healing", "name": "Slow Healing", "kind": "flaw", "cost": "3", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P3", "P5"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "disease-carrier", "name": "Disease Carrier", "kind": "flaw", "cost": "4", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P9"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "deaf", "name": "Deaf", "kind": "flaw", "cost": "4", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P2", "P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["hearing"], "diff": 3, "note": "+3 difficulty on hearing rolls"}]},
  {"key": "mute", "name": "Mute", "kind": "flaw", "cost": "4", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "thin-blood", "name": "Thin Blood", "kind": "flaw", "cost": "4", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P5", "P6"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "flesh-of-the-corpse", "name": "Flesh of the Corpse", "kind": "flaw", "cost": "5", "book": "V20", "page": 483, "pdf": 491, "type": "physical", "patterns": ["P14"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "infertile-vitae", "name": "Infertile Vitae", "kind": "flaw", "cost": "5", "book": "V20", "page": 484, "pdf": 492, "type": "physical", "patterns": ["P17"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "blind", "name": "Blind", "kind": "flaw", "cost": "6", "book": "V20", "page": 484, "pdf": 492, "type": "physical", "patterns": ["P2", "P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["dexterity"], "diff": 2, "note": "+2 difficulty on Dexterity rolls"}]},
  {"key": "coldly-logical", "name": "Coldly Logical", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["logic"], "diff": -1, "note": "-1 difficulty to sort fact from feeling"}]},
  {"key": "common-sense", "name": "Common Sense", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "concentration", "name": "Concentration", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "introspection", "name": "Introspection", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "language", "name": "Language", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P17"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "time-sense", "name": "Time Sense", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P13"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "useful-knowledge", "name": "Useful Knowledge", "kind": "merit", "cost": "1", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "code-of-honor", "name": "Code of Honor", "kind": "merit", "cost": "2", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["code"], "dice": 2, "note": "+2 dice on Willpower and Virtue rolls to keep the code"}]},
  {"key": "computer-aptitude", "name": "Computer Aptitude", "kind": "merit", "cost": "2", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["computer"], "diff": -2, "note": "-2 difficulty on computer rolls"}]},
  {"key": "eidetic-memory", "name": "Eidetic Memory", "kind": "merit", "cost": "2", "book": "V20", "page": 484, "pdf": 492, "type": "mental", "patterns": ["P17"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "light-sleeper", "name": "Light Sleeper", "kind": "merit", "cost": "2", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P13"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "natural-linguist", "name": "Natural Linguist", "kind": "merit", "cost": "2", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P17"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["linguistics"], "dice": 3, "note": "+3 dice on language rolls"}]},
  {"key": "calm-heart", "name": "Calm Heart", "kind": "merit", "cost": "3", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P18"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["frenzy"], "dice": 2, "note": "+2 dice to resist frenzy"}]},
  {"key": "iron-will", "name": "Iron Will", "kind": "merit", "cost": "3", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P19"], "holders": ["any"], "against": ["any"], "aliases": ["Strong-Willed"], "effects": [{"ch": "resist", "tags": ["mind", "thaumaturgy"], "diff": 3, "note": "+3 difficulty to Dementation, Dominate, mind magic and Thaumaturgy used on them (not Presence)"}]},
  {"key": "precocious", "name": "Precocious", "kind": "merit", "cost": "3", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P16"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "deep-sleeper", "name": "Deep Sleeper", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P13"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["wake"], "diff": 2, "note": "+2 difficulty to wake by day"}]},
  {"key": "impatient", "name": "Impatient", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "nightmares", "name": "Nightmares", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P13"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "prey-exclusion", "name": "Prey Exclusion", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P6", "P18"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "shy", "name": "Shy", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["first-meeting"], "diff": 2, "note": "+2 difficulty on social rolls with strangers"}]},
  {"key": "soft-hearted", "name": "Soft-Hearted", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P1", "P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "speech-impediment", "name": "Speech Impediment", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["voice", "speech"], "diff": 2, "note": "+2 difficulty on spoken communication"}]},
  {"key": "unconvinced", "name": "Unconvinced", "kind": "flaw", "cost": "1", "book": "V20", "page": 485, "pdf": 493, "type": "mental", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "amnesia", "name": "Amnesia", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P20", "P17"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "lunacy", "name": "Lunacy", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P3"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["frenzy"], "moon": {"crescent": 1, "half": 2, "quarter": 2, "gibbous": 2, "full": 3}, "note": "Frenzy difficulty rises with the moon: +1 crescent, +2 half or gibbous, +3 full"}]},
  {"key": "phobia", "name": "Phobia", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P11", "P18"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "short-fuse", "name": "Short Fuse", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P18"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["frenzy"], "diff": 2, "note": "+2 difficulty to resist frenzy"}]},
  {"key": "stereotype", "name": "Stereotype", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P1", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "territorial", "name": "Territorial", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P18"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "thirst-for-innocence", "name": "Thirst for Innocence", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P6", "P18"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "vengeful", "name": "Vengeful", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P18"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "victim-of-the-masquerade", "name": "Victim of the Masquerade", "kind": "flaw", "cost": "2", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P11"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "weak-willed", "name": "Weak-Willed", "kind": "flaw", "cost": "3", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P19"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["resist-social", "resist-mind"], "diff": 2, "note": "+2 difficulty to resist social pressure and mind magic"}]},
  {"key": "conspicuous-consumption", "name": "Conspicuous Consumption", "kind": "flaw", "cost": "4", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "guilt-wracked", "name": "Guilt-Wracked", "kind": "flaw", "cost": "4", "book": "V20", "page": 486, "pdf": 494, "type": "mental", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "flashbacks", "name": "Flashbacks", "kind": "flaw", "cost": "6", "book": "V20", "page": 487, "pdf": 495, "type": "mental", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "elysium-regular", "name": "Elysium Regular", "kind": "merit", "cost": "1", "book": "V20", "page": 487, "pdf": 495, "type": "social", "patterns": ["P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "former-ghoul", "name": "Former Ghoul", "kind": "merit", "cost": "1", "book": "V20", "page": 487, "pdf": 495, "type": "social", "patterns": ["P1"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": -1, "againstKinds": ["kindred"], "note": "-1 difficulty on social rolls with neonates"}]},
  {"key": "harmless", "name": "Harmless", "kind": "merit", "cost": "1", "book": "V20", "page": 487, "pdf": 495, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "natural-leader", "name": "Natural Leader", "kind": "merit", "cost": "1", "book": "V20", "page": 487, "pdf": 495, "type": "social", "patterns": ["P1", "P7", "P16"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["leadership"], "dice": 2, "note": "+2 dice on Leadership"}]},
  {"key": "prestigious-sire", "name": "Prestigious Sire", "kind": "merit", "cost": "1", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P1", "P10"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "rep", "name": "Rep", "kind": "merit", "cost": "1", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "sabbat-survivor", "name": "Sabbat Survivor", "kind": "merit", "cost": "1", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P1", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "boon", "name": "Boon", "kind": "merit", "cost": "1-6", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P10"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "bullyboy", "name": "Bullyboy", "kind": "merit", "cost": "2", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P1"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "old-pal", "name": "Old Pal", "kind": "merit", "cost": "2", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "lawmans-friend", "name": "Lawman’s Friend", "kind": "merit", "cost": "2", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": ["Lawman's Friend"], "effects": []},
  {"key": "open-road", "name": "Open Road", "kind": "merit", "cost": "2", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "sanctity", "name": "Sanctity", "kind": "merit", "cost": "2", "book": "V20", "page": 488, "pdf": 496, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "scholar-of-enemies", "name": "Scholar of Enemies", "kind": "merit", "cost": "2", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P1", "P17"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "scholar-of-others", "name": "Scholar of Others", "kind": "merit", "cost": "2", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P17"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "friend-of-the-underground", "name": "Friend of the Underground", "kind": "merit", "cost": "3", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P1", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "mole", "name": "Mole", "kind": "merit", "cost": "3", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P10"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "rising-star", "name": "Rising Star", "kind": "merit", "cost": "3", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P1"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "broken-bond", "name": "Broken Bond", "kind": "merit", "cost": "4", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P19"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "clan-friendship", "name": "Clan Friendship", "kind": "merit", "cost": "4", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P1", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "bishop-friendship", "name": "Bishop Friendship", "kind": "merit", "cost": "4", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": ["Primogen Friendship", "Primogen/Bishop Friendship"], "effects": []},
  {"key": "botched-presentation", "name": "Botched Presentation", "kind": "flaw", "cost": "1", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P1", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "dark-secret", "name": "Dark Secret", "kind": "flaw", "cost": "1", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P10", "P9"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "expendable", "name": "Expendable", "kind": "flaw", "cost": "1", "book": "V20", "page": 489, "pdf": 497, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "incomplete-understanding", "name": "Incomplete Understanding", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "infamous-sire", "name": "Infamous Sire", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P10"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "mistaken-identity", "name": "Mistaken Identity", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "arrival", "name": "Arrival", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P8", "P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "kid", "name": "Kid", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P1"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "recruitment-target", "name": "Recruitment Target", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "sires-resentment", "name": "Sire’s Resentment", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P10"], "holders": ["kindred"], "against": ["any"], "aliases": ["Sire's Resentment"], "effects": []},
  {"key": "special-responsibility", "name": "Special Responsibility", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "sympathizer", "name": "Sympathizer", "kind": "flaw", "cost": "1", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "enemy", "name": "Enemy", "kind": "flaw", "cost": "1-5", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P8"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "bound", "name": "Bound", "kind": "flaw", "cost": "2", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "catspaw", "name": "Catspaw", "kind": "flaw", "cost": "2", "book": "V20", "page": 490, "pdf": 498, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "escaped-target", "name": "Escaped Target", "kind": "flaw", "cost": "2", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P1"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "failure", "name": "Failure", "kind": "flaw", "cost": "2", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "masquerade-breaker", "name": "Masquerade Breaker", "kind": "flaw", "cost": "2", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P10", "P9"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "hunted", "name": "Hunted", "kind": "flaw", "cost": "4", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P8", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "old-flame", "name": "Old Flame", "kind": "flaw", "cost": "2", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P10", "P9"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "rival-sires", "name": "Rival Sires", "kind": "flaw", "cost": "2", "book": "V20", "page": 491, "pdf": 499, "type": "social", "patterns": ["P10", "P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "uppity", "name": "Uppity", "kind": "flaw", "cost": "2", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P1", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "disgrace-to-the-blood", "name": "Disgrace to the Blood", "kind": "flaw", "cost": "3", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P6", "P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "former-prince", "name": "Former Prince", "kind": "flaw", "cost": "3", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "hunted-like-a-dog", "name": "Hunted Like a Dog", "kind": "flaw", "cost": "3", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P8", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "narc", "name": "Narc", "kind": "flaw", "cost": "3", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P1", "P10"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "sleeping-with-the-enemy", "name": "Sleeping With the Enemy", "kind": "flaw", "cost": "3", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P10", "P9"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "clan-enmity", "name": "Clan Enmity", "kind": "flaw", "cost": "4", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P8", "P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "loathsome-regnant", "name": "Loathsome Regnant", "kind": "flaw", "cost": "4", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "overextended", "name": "Overextended", "kind": "flaw", "cost": "4", "book": "V20", "page": 492, "pdf": 500, "type": "social", "patterns": ["P8", "P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "probationary-sect-member", "name": "Probationary Sect Member", "kind": "flaw", "cost": "4", "book": "V20", "page": 493, "pdf": 501, "type": "social", "patterns": ["P7"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "blood-hunted", "name": "Blood Hunted", "kind": "flaw", "cost": "4/6", "book": "V20", "page": 493, "pdf": 501, "type": "social", "patterns": ["P8", "P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "laughingstock", "name": "Laughingstock", "kind": "flaw", "cost": "5", "book": "V20", "page": 493, "pdf": 501, "type": "social", "patterns": ["P1"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "red-list", "name": "Red List", "kind": "flaw", "cost": "7", "book": "V20", "page": 493, "pdf": 501, "type": "social", "patterns": ["P8", "P7"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "deceptive-aura", "name": "Deceptive Aura", "kind": "merit", "cost": "1", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P2"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "healing-touch", "name": "Healing Touch", "kind": "merit", "cost": "1", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P5"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "inoffensive-to-animals", "name": "Inoffensive to Animals", "kind": "merit", "cost": "1", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "medium", "name": "Medium", "kind": "merit", "cost": "2", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P2"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["ghosts"], "diff": -2, "note": "-2 difficulty on Awareness about the restless dead"}]},
  {"key": "magic-resistance", "name": "Magic Resistance", "kind": "merit", "cost": "2", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P19"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "resist", "tags": ["magic"], "diff": 2, "note": "+2 difficulty to magic aimed at them, helpful or harmful"}]},
  {"key": "hidden-diablerie", "name": "Hidden Diablerie", "kind": "merit", "cost": "3", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P2"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "lucky", "name": "Lucky", "kind": "merit", "cost": "3", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P12"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "oracular-ability", "name": "Oracular Ability", "kind": "merit", "cost": "3", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "spirit-mentor", "name": "Spirit Mentor", "kind": "merit", "cost": "3", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P7"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "true-love", "name": "True Love", "kind": "merit", "cost": "4", "book": "V20", "page": 493, "pdf": 501, "type": "supernatural", "patterns": ["P1", "P5"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "additional-discipline", "name": "Additional Discipline", "kind": "merit", "cost": "5", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P16"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "unbondable", "name": "Unbondable", "kind": "merit", "cost": "5", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P19"], "holders": ["kindred", "ghoul"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "nine-lives", "name": "Nine Lives", "kind": "merit", "cost": "6", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P12"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "true-faith", "name": "True Faith", "kind": "merit", "cost": "7", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P19", "P14"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "cast-no-reflection", "name": "Cast No Reflection", "kind": "flaw", "cost": "1", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P15"], "holders": ["kindred"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "cold-breeze", "name": "Cold Breeze", "kind": "flaw", "cost": "1", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P15", "P7"], "holders": ["kindred", "ghoul"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": 1, "againstKinds": ["mortal"], "note": "+1 difficulty on social rolls with mortals"}]},
  {"key": "garlic", "name": "Garlic", "kind": "flaw", "cost": "1", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P4"], "holders": ["kindred"], "against": ["any"], "aliases": ["Repulsed by Garlic"], "effects": []},
  {"key": "touch-of-frost", "name": "Touch of Frost", "kind": "flaw", "cost": "1", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P15", "P7"], "holders": ["kindred", "ghoul"], "against": ["mortal"], "aliases": [], "effects": []},
  {"key": "cursed", "name": "Cursed", "kind": "flaw", "cost": "1-5", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "beacon-of-the-unholy", "name": "Beacon of the Unholy", "kind": "flaw", "cost": "2", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P8"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "deathsight", "name": "Deathsight", "kind": "flaw", "cost": "2", "book": "V20", "page": 494, "pdf": 502, "type": "supernatural", "patterns": ["P2"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": [{"ch": "roll", "tags": ["perception"], "diff": 2, "note": "+2 difficulty on Perception rolls"}, {"ch": "roll", "tags": ["social"], "diff": 1, "note": "+1 difficulty on social rolls"}]},
  {"key": "eerie-presence", "name": "Eerie Presence", "kind": "flaw", "cost": "2", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P15", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["social"], "diff": 2, "againstKinds": ["mortal"], "note": "+2 difficulty on social rolls with mortals"}]},
  {"key": "lord-of-the-flies", "name": "Lord of the Flies", "kind": "flaw", "cost": "2", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P15", "P7"], "holders": ["any"], "against": ["mortal"], "aliases": [], "effects": [{"ch": "roll", "tags": ["stealth"], "diff": 2, "note": "+2 difficulty on Stealth"}, {"ch": "roll", "tags": ["social"], "diff": 1, "note": "+1 difficulty on social rolls"}]},
  {"key": "cant-cross-running-water", "name": "Can’t Cross Running Water", "kind": "flaw", "cost": "3", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P4"], "holders": ["kindred"], "against": ["any"], "aliases": ["Can't Cross Running Water"], "effects": []},
  {"key": "haunted", "name": "Haunted", "kind": "flaw", "cost": "3", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P8"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "crosses", "name": "Crosses", "kind": "flaw", "cost": "3", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P4"], "holders": ["kindred"], "against": ["any"], "aliases": ["Repelled by Crosses"], "effects": []},
  {"key": "grip-of-the-damned", "name": "Grip of the Damned", "kind": "flaw", "cost": "4", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P6"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "dark-fate", "name": "Dark Fate", "kind": "flaw", "cost": "5", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P11"], "holders": ["any"], "against": ["any"], "aliases": [], "effects": []},
  {"key": "light-sensitive", "name": "Light-Sensitive", "kind": "flaw", "cost": "5", "book": "V20", "page": 495, "pdf": 503, "type": "supernatural", "patterns": ["P4"], "holders": ["kindred"], "against": ["any"], "aliases": [], "effects": []}
];

export const BACKGROUNDS = [
  {"key": "allies", "name": "Allies", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "W20 core", "W20 Changing Breeds", "M20 core", "M20 Book of Secrets", "Wraith 20", "Hunters Hunted II", "Demon: The Fallen", "Mummy: The Resurrection", "Mummy 2nd", "Kindred of the East", "Orpheus"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "W20 core": 113, "W20 Changing Breeds": 127, "M20 core": 23, "M20 Book of Secrets": 60, "Wraith 20": 77, "Hunters Hunted II": 162, "Demon: The Fallen": 124, "Mummy: The Resurrection": null, "Mummy 2nd": null, "Kindred of the East": null, "Orpheus": 124}, "hook": "people"},
  {"key": "alternate-identity", "name": "Alternate Identity", "kind": "background", "books": ["V20 core"], "page": {"V20 core": 82}, "hook": "rumour"},
  {"key": "ancestors", "name": "Ancestors", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 113, "W20 Changing Breeds": null}, "hook": "prompt"},
  {"key": "arcane", "name": "Arcane", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "artifact", "name": "Artifact", "kind": "background", "books": ["Wraith 20", "Mummy: The Resurrection", "Mummy 2nd"], "page": {"Wraith 20": 77, "Mummy: The Resurrection": null, "Mummy 2nd": null}, "hook": "item"},
  {"key": "avatar", "name": "Avatar", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 45, "M20 Book of Secrets": 47}, "hook": "pool"},
  {"key": "backing", "name": "Backing", "kind": "background", "books": ["Kindred of the East"], "page": {"Kindred of the East": null}, "hook": "story"},
  {"key": "backup", "name": "Backup", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "black-hand-membership", "name": "Black Hand Membership", "kind": "background", "books": ["V20 core"], "page": {"V20 core": 82}, "hook": "story"},
  {"key": "blessing", "name": "Blessing", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "certification", "name": "Certification", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "chantry", "name": "Chantry", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 139, "M20 Book of Secrets": 214}, "hook": "place"},
  {"key": "chimera", "name": "Chimera", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "item"},
  {"key": "contacts", "name": "Contacts", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "W20 core", "W20 Changing Breeds", "M20 core", "M20 Book of Secrets", "Wraith 20", "C20", "Hunters Hunted II", "Demon: The Fallen", "Mummy: The Resurrection", "Mummy 2nd", "Kindred of the East", "Orpheus"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "W20 core": 113, "W20 Changing Breeds": 127, "M20 core": 252, "M20 Book of Secrets": null, "Wraith 20": 77, "C20": null, "Hunters Hunted II": 156, "Demon: The Fallen": 124, "Mummy: The Resurrection": null, "Mummy 2nd": 62, "Kindred of the East": null, "Orpheus": 124}, "hook": "rumour"},
  {"key": "cult", "name": "Cult", "kind": "background", "books": ["M20 core", "M20 Book of Secrets", "Mummy: The Resurrection", "Mummy 2nd"], "page": {"M20 core": 146, "M20 Book of Secrets": 219, "Mummy: The Resurrection": null, "Mummy 2nd": 33}, "hook": "people"},
  {"key": "cypher", "name": "Cypher", "kind": "background", "books": ["Orpheus"], "page": {"Orpheus": null}, "hook": "story"},
  {"key": "demesne", "name": "Demesne", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "place"},
  {"key": "destiny", "name": "Destiny", "kind": "background", "books": ["M20 core", "M20 Book of Secrets", "Mummy: The Resurrection", "Mummy 2nd"], "page": {"M20 core": 252, "M20 Book of Secrets": null, "Mummy: The Resurrection": null, "Mummy 2nd": null}, "hook": "reroll"},
  {"key": "domain", "name": "Domain", "kind": "background", "books": ["V20 core", "V20 Dark Ages"], "page": {"V20 core": 82, "V20 Dark Ages": 158}, "hook": "place"},
  {"key": "dream", "name": "Dream", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 92, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "dreamers", "name": "Dreamers", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "pool"},
  {"key": "eidolon", "name": "Eidolon", "kind": "background", "books": ["Wraith 20"], "page": {"Wraith 20": 77}, "hook": "story"},
  {"key": "eminence", "name": "Eminence", "kind": "background", "books": ["Demon: The Fallen"], "page": {"Demon: The Fallen": 124}, "hook": "attitude"},
  {"key": "enhancement", "name": "Enhancement", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 252, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "face", "name": "Face", "kind": "background", "books": ["Kindred of the East"], "page": {"Kindred of the East": 118}, "hook": "attitude"},
  {"key": "fame", "name": "Fame", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "M20 core", "M20 Book of Secrets", "Demon: The Fallen", "Orpheus"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "M20 core": 314, "M20 Book of Secrets": null, "Demon: The Fallen": 124, "Orpheus": null}, "hook": "attitude"},
  {"key": "familiar", "name": "Familiar", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "fate", "name": "Fate", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 114, "W20 Changing Breeds": null}, "hook": "reroll"},
  {"key": "fetish", "name": "Fetish", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 113, "W20 Changing Breeds": 174}, "hook": "item"},
  {"key": "followers", "name": "Followers", "kind": "background", "books": ["Demon: The Fallen"], "page": {"Demon: The Fallen": 124}, "hook": "people"},
  {"key": "generation", "name": "Generation", "kind": "background", "books": ["V20 core", "V20 Dark Ages"], "page": {"V20 core": 82, "V20 Dark Ages": 158}, "hook": "pool"},
  {"key": "haunt", "name": "Haunt", "kind": "background", "books": ["Wraith 20"], "page": {"Wraith 20": 77}, "hook": "place"},
  {"key": "herd", "name": "Herd", "kind": "background", "books": ["V20 core", "V20 Dark Ages"], "page": {"V20 core": 82, "V20 Dark Ages": 158}, "hook": "feeding"},
  {"key": "holdings", "name": "Holdings", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "place"},
  {"key": "horde", "name": "Horde", "kind": "background", "books": ["Kindred of the East"], "page": {"Kindred of the East": null}, "hook": "story"},
  {"key": "influence", "name": "Influence", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "M20 core", "M20 Book of Secrets", "Hunters Hunted II", "Demon: The Fallen"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "M20 core": 253, "M20 Book of Secrets": null, "Hunters Hunted II": 37, "Demon: The Fallen": 124}, "hook": "lever"},
  {"key": "jade", "name": "Jade", "kind": "background", "books": ["Kindred of the East"], "page": {"Kindred of the East": 14}, "hook": "pool"},
  {"key": "kinfolk", "name": "Kinfolk", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 111, "W20 Changing Breeds": 49}, "hook": "people"},
  {"key": "legacy", "name": "Legacy", "kind": "background", "books": ["Wraith 20", "Demon: The Fallen", "Mummy: The Resurrection", "Mummy 2nd"], "page": {"Wraith 20": 77, "Demon: The Fallen": 124, "Mummy: The Resurrection": 220, "Mummy 2nd": null}, "hook": "codex"},
  {"key": "library", "name": "Library", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "task"},
  {"key": "memento", "name": "Memento", "kind": "background", "books": ["Orpheus"], "page": {"Orpheus": null}, "hook": "story"},
  {"key": "memoriam", "name": "Memoriam", "kind": "background", "books": ["Wraith 20"], "page": {"Wraith 20": 77}, "hook": "pool"},
  {"key": "memory", "name": "Memory", "kind": "background", "books": ["Mummy: The Resurrection", "Mummy 2nd"], "page": {"Mummy: The Resurrection": 61, "Mummy 2nd": 48}, "hook": "reroll"},
  {"key": "mentor", "name": "Mentor", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "W20 core", "W20 Changing Breeds", "M20 core", "M20 Book of Secrets", "Wraith 20", "C20", "Hunters Hunted II", "Demon: The Fallen", "Mummy: The Resurrection", "Mummy 2nd", "Kindred of the East", "Orpheus"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "W20 core": 113, "W20 Changing Breeds": 108, "M20 core": 253, "M20 Book of Secrets": 60, "Wraith 20": 77, "C20": null, "Hunters Hunted II": null, "Demon: The Fallen": 124, "Mummy: The Resurrection": null, "Mummy 2nd": null, "Kindred of the East": null, "Orpheus": 123}, "hook": "people"},
  {"key": "node", "name": "Node", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 92, "M20 Book of Secrets": 146}, "hook": "place"},
  {"key": "notoriety", "name": "Notoriety", "kind": "background", "books": ["Wraith 20"], "page": {"Wraith 20": 77}, "hook": "attitude"},
  {"key": "pacts", "name": "Pacts", "kind": "background", "books": ["Demon: The Fallen"], "page": {"Demon: The Fallen": 124}, "hook": "people"},
  {"key": "paragon", "name": "Paragon", "kind": "background", "books": ["Demon: The Fallen"], "page": {"Demon: The Fallen": 124}, "hook": "story"},
  {"key": "past-lives", "name": "Past Lives", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "reroll"},
  {"key": "patron", "name": "Patron", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "pure-breed", "name": "Pure Breed", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 113, "W20 Changing Breeds": 235}, "hook": "attitude"},
  {"key": "rank", "name": "Rank", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 68, "M20 Book of Secrets": null}, "hook": "attitude"},
  {"key": "relic", "name": "Relic", "kind": "background", "books": ["Wraith 20"], "page": {"Wraith 20": 77}, "hook": "item"},
  {"key": "remembrance", "name": "Remembrance", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "codex"},
  {"key": "requisitions", "name": "Requisitions", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": 6}, "hook": "story"},
  {"key": "resources", "name": "Resources", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "W20 core", "W20 Changing Breeds", "M20 core", "M20 Book of Secrets", "C20", "Hunters Hunted II", "Demon: The Fallen", "Mummy: The Resurrection", "Mummy 2nd", "Kindred of the East", "Orpheus"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "W20 core": 113, "W20 Changing Breeds": 183, "M20 core": 253, "M20 Book of Secrets": 61, "C20": null, "Hunters Hunted II": 38, "Demon: The Fallen": 122, "Mummy: The Resurrection": null, "Mummy 2nd": 63, "Kindred of the East": null, "Orpheus": 124}, "hook": "money"},
  {"key": "retainers", "name": "Retainers", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "M20 core", "M20 Book of Secrets", "Hunters Hunted II", "Kindred of the East"], "page": {"V20 core": 82, "V20 Dark Ages": 158, "M20 core": 253, "M20 Book of Secrets": null, "Hunters Hunted II": 170, "Kindred of the East": null}, "hook": "people"},
  {"key": "retinue", "name": "Retinue", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "people"},
  {"key": "rites", "name": "Rites", "kind": "background", "books": ["W20 core", "W20 Changing Breeds", "Kindred of the East"], "page": {"W20 core": 114, "W20 Changing Breeds": 84, "Kindred of the East": 79}, "hook": "item"},
  {"key": "rituals", "name": "Rituals", "kind": "background", "books": ["V20 core"], "page": {"V20 core": 82}, "hook": "item"},
  {"key": "sanctum", "name": "Sanctum", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "place"},
  {"key": "secret-weapons", "name": "Secret Weapons", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "spies", "name": "Spies", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": null}, "hook": "story"},
  {"key": "spirit-heritage", "name": "Spirit Heritage", "kind": "background", "books": ["W20 core", "W20 Changing Breeds"], "page": {"W20 core": 114, "W20 Changing Breeds": null}, "hook": "story"},
  {"key": "status", "name": "Status", "kind": "background", "books": ["V20 core", "V20 Dark Ages", "M20 core", "M20 Book of Secrets", "Wraith 20", "Mummy: The Resurrection", "Mummy 2nd", "Kindred of the East", "Orpheus"], "page": {"V20 core": 118, "V20 Dark Ages": 183, "M20 core": 253, "M20 Book of Secrets": null, "Wraith 20": 77, "Mummy: The Resurrection": null, "Mummy 2nd": null, "Kindred of the East": 54, "Orpheus": null}, "hook": "attitude"},
  {"key": "title", "name": "Title", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "attitude"},
  {"key": "tomb", "name": "Tomb", "kind": "background", "books": ["Mummy: The Resurrection", "Mummy 2nd"], "page": {"Mummy: The Resurrection": 56, "Mummy 2nd": null}, "hook": "place"},
  {"key": "totem", "name": "Totem", "kind": "background", "books": ["W20 core", "W20 Changing Breeds", "M20 core", "M20 Book of Secrets"], "page": {"W20 core": 110, "W20 Changing Breeds": 116, "M20 core": 253, "M20 Book of Secrets": 7}, "hook": "condition"},
  {"key": "treasure", "name": "Treasure", "kind": "background", "books": ["C20"], "page": {"C20": null}, "hook": "item"},
  {"key": "vessels", "name": "Vessels", "kind": "background", "books": ["Mummy: The Resurrection", "Mummy 2nd"], "page": {"Mummy: The Resurrection": null, "Mummy 2nd": null}, "hook": "story"},
  {"key": "wonder", "name": "Wonder", "kind": "background", "books": ["M20 core", "M20 Book of Secrets"], "page": {"M20 core": 253, "M20 Book of Secrets": 6}, "hook": "item"}
];

/** Books whose merits and flaws are in MERITS_FLAWS. The rest come with their own rows later (the design's step 11). */
export const BOOKS_DONE = ["V20"];

/**
 * Step 3 (Chronicle 0.19.0): what others can sense about a character (pattern P15), for WoDX Senses. Lines are WoDX's own
 * words; {{dir}} is where the character stands from the one sensing. need: successes needed (0 shows to a plain look).
 * indoor: only indoors (a mirror or a window pane to show in). Senses: sight, sound, smell, touch.
 */
export const SHOWS = {
  "smell-of-the-grave": {smell: [{t: "A smell of wet earth and old graves hangs about someone {{dir}}.", n: 0}], strong: true},
  "cold-breeze": {touch: [{t: "The air turns cold and still near someone {{dir}}.", n: 0}]},
  "glowing-eyes": {sight: [{t: "Eyes {{dir}} catch the light and shine like an animal's.", n: 0}], glows: true},
  "eerie-presence": {touch: [{t: "Something about the one {{dir}} sets the teeth on edge.", n: 1}]},
  "lord-of-the-flies": {sound: [{t: "Flies drone around someone {{dir}}.", n: 0}], sight: [{t: "Flies circle someone {{dir}} and will not leave.", n: 1}]},
  "permanent-fangs": {sight: [{t: "The one {{dir}} has long, sharp eyeteeth.", n: 2}]},
  "cast-no-reflection": {sight: [{t: "The one {{dir}} throws no reflection in the glass.", n: 2}], indoor: true},
  "touch-of-frost": {sight: [{t: "Flowers and leaves close to someone {{dir}} have gone black, as if frost had bitten them.", n: 2}]}
};

/** Senses a trait takes away (V20 Blind and Deaf), by WoDX Senses' sense names. */
export const SENSE_LOSS = {blind: "sight", deaf: "sound"};

/** Senses channels a trait opens (house reading of V20 Medium and Deathsight; channel lines are in WoDX Senses). */
export const SENSE_CHANNELS = {medium: "restless", deathsight: "deathsight"};

/**
 * Step 5 (Chronicle 0.20.0): how a trait moves an NPC's first regard for the character (pattern P7), read by WoDX NPC
 * when the two first meet. delta: steps on NPC attitude (-3 Hunted to +3 Honoured). againstKinds: only NPCs of these
 * kinds react (the Masquerade flaws unsettle mortals, not other Kindred). House readings of V20 core pp. 480-495 printed.
 */
export const ATTITUDE = {
  "friendly-face": {delta: 1},
  "harmless": {delta: 1},
  "inoffensive-to-animals": {delta: 1, againstKinds: ["beast"]},
  "disfigured": {delta: -1, againstKinds: ["mortal"]},
  "deformity": {delta: -1, againstKinds: ["mortal"]},
  "monstrous": {delta: -2, againstKinds: ["mortal"]},
  "smell-of-the-grave": {delta: -1, againstKinds: ["mortal"]},
  "glowing-eyes": {delta: -1, againstKinds: ["mortal"]},
  "eerie-presence": {delta: -1, againstKinds: ["mortal"]},
  "lord-of-the-flies": {delta: -1, againstKinds: ["mortal"]},
  "cold-breeze": {delta: -1, againstKinds: ["mortal"]}
};

/** Step 6 (Chronicle 0.21.0): traits WoDX Actions carries out in its own windows, for the Trait effects window. */
export const HANDLED = {
  "lucky": "a failed roll is rolled again, three times a story (the action window)",
  "efficient-digestion": "one more blood point for every two drunk (feeding)",
  "thin-blood": "every blood cost doubled (Spend Blood)",
  "deep-sleeper": "+2 difficulty to wake by day",
  "light-sleeper": "wakes at once by day, with no Road cap on the dice",
  "prey-exclusion": "a reminder on every feeding card"
};

/**
 * Step 7 (Chronicle 0.22.0): traits that go off when the character walks into something on the map (pattern P4), read
 * by WoDX Interactables when a token moves. words: a tile or region whose name or title holds one of these sets it
 * off; fromName: the words come from the item's own name in brackets, as in "Phobia (rats)". stop: a player's move is
 * held at the edge (the Storyteller's own moves go through, with the card). roll: what the card asks for. House
 * readings of V20 core printed pp. 486-495.
 */
export const TRIGGERS = {
  "cant-cross-running-water": {words: ["running water", "river", "stream", "brook", "creek", "millrace", "ford"], stop: true,
    text: "cannot cross the running water here without a bridge or being carried over it"},
  "garlic": {words: ["garlic"], stop: true, text: "is driven back by the reek of garlic"},
  "crosses": {words: ["crucifix", "cross", "calvary", "rood"], stop: true, text: "recoils from the cross",
    roll: "Willpower, difficulty 9, to hold ground; touching it costs a health level"},
  "light-sensitive": {words: ["sunlit", "daylight", "floodlight", "spotlight", "bonfire"], stop: false, text: "is hurt and dazzled by the bright light"},
  "phobia": {fromName: true, stop: false, text: "comes face to face with what they fear", roll: "Courage, or flee from it"}
};

/**
 * Step 7: traits that put something in the night's draw (pattern P8), read by WoDX Storyteller. chance: the share of
 * nights it turns up (house rule); text: the line for the Storyteller, {{name}} the character. aid: a story aid
 * (WoDX Storyteller's aids) drawn for the character instead of a line.
 */
export const PULLS = {
  "arrival": {chance: 0.25, text: "Someone in the city still asks why {{name}} came here, and who sent them."},
  "enemy": {chance: 0.25, text: "{{name}}'s enemy makes a move against them tonight, through others if not in person."},
  "hunted": {chance: 0.33, text: "A hunter has picked up {{name}}'s trail and is closer tonight than last night."},
  "hunted-like-a-dog": {chance: 0.33, text: "Others of the line have word of where {{name}} sleeps and send someone to look."},
  "clan-enmity": {chance: 0.2, text: "Members of the clan that hates {{name}} cross their path and make trouble."},
  "overextended": {chance: 0.2, text: "One of {{name}}'s many obligations calls for attention tonight, at the worst time."},
  "blood-hunted": {chance: 0.33, text: "Someone who knows of the blood hunt on {{name}} sees them and spreads the word."},
  "red-list": {chance: 0.33, text: "An archon or a hunter of the Red List is in the area asking after {{name}}."},
  "beacon-of-the-unholy": {chance: 0.25, text: "A priest, a dog or a child marks {{name}} as wrong and will not be quiet about it."},
  "haunted": {chance: 0.33, text: "The ghost that follows {{name}} makes itself known: a cold room, a broken glass, a name whispered."},
  "oracular-ability": {chance: 0.25, aid: "augury"}
};

/**
 * Step 7: traits that open a Ledger entry for the character (pattern P10), read by WoDX Storyteller. kind and size are
 * the Ledger's own; dir "to" means the debt or boon is owed to the character, "from" by them. dueNights: a secret's
 * reveal clock, in nights from the day the entry is opened (house rule; the Storyteller moves it in the Ledger).
 */
export const LEDGER = {
  "prestigious-sire": {kind: "boon", size: "trivial", dir: "to", what: "A favour owed for the sake of the sire's good name."},
  "boon": {kind: "boon", size: "minor", dir: "to", what: "A boon owed to the character (set its size to match the merit)."},
  "mole": {kind: "debt", dir: "to", what: "An informant inside a rival group who passes word to the character."},
  "dark-secret": {kind: "consequence", dueNights: 180, what: "The character's secret comes out unless they keep it buried."},
  "infamous-sire": {kind: "debt", dir: "from", what: "Old grudges against the sire that others mean to collect from the childe."},
  "sires-resentment": {kind: "consequence", dueNights: 120, what: "The sire works against the character in some way that comes to light."},
  "masquerade-breaker": {kind: "consequence", dueNights: 90, what: "Word of the old breach reaches someone who wants it answered."},
  "old-flame": {kind: "consequence", dueNights: 120, what: "The old flame turns up, and their side is not the character's."},
  "rival-sires": {kind: "debt", dir: "from", what: "Two sires each say the character owes them; both mean to collect."},
  "narc": {kind: "debt", dir: "from", what: "The authorities expect information in return for leaving the character alone."},
  "sleeping-with-the-enemy": {kind: "consequence", dueNights: 120, what: "The forbidden tie is found out unless it stays hidden."}
};

/**
 * Step 7: traits that should bite at a given moment (pattern P11). WoDX sends the Storyteller one card a moment for
 * each character, through the approval queue: approve and it goes in the log, dismiss and nothing happens. on: feed
 * (feeding), social (a social act on an NPC), fight (a fight starts), night (the night's draw is approved). text: the
 * reminder, in WoDX's own words; the book page is added from the table.
 */
export const PROMPTS = {
  "eat-food": {on: ["social"], text: "can eat and drink at the table to pass as mortal, and must be rid of it later"},
  "infectious-bite": {on: ["feed"], text: "the bite may sicken the vessel unless the wound is closed"},
  "addiction": {on: ["night"], text: "craves the substance tonight; without it, penalties until fed"},
  "common-sense": {on: ["fight", "social"], text: "the player is owed a word of warning before a foolish step"},
  "impatient": {on: ["social"], text: "waiting or a long negotiation tests the character's patience"},
  "soft-hearted": {on: ["fight"], text: "seeing someone suffer may shake the character (difficulty 8 to act against it)"},
  "victim-of-the-masquerade": {on: ["feed"], text: "feeding sits badly with someone who will not accept what they are"},
  "conspicuous-consumption": {on: ["feed"], text: "the flaw's demand when feeding"},
  "guilt-wracked": {on: ["feed", "fight"], text: "guilt over harm done to a mortal (difficulty 7)"},
  "flashbacks": {on: ["fight"], text: "violence may set off a flashback"},
  "failure": {on: ["fight", "social"], text: "the flaw's curse on a moment that matters"},
  "cursed": {on: ["night"], text: "the curse may show itself tonight"},
  "dark-fate": {on: ["night"], text: "the dark fate draws a little closer"}
};
