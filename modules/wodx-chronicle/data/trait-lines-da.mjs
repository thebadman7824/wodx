/**
 * B7931-B7933: the merits and flaws of Dark Ages: Werewolf (printed pp. 86-89) that the W20 rows do not already carry,
 * every merit and flaw of Dark Ages: Fae (printed pp. 97-101), of Dark Ages: Devil's Due (printed pp. 98-100) and of the
 * Dark Ages: Inquisitor Companion (printed pp. 124-127, B7934). Summaries in WoDX's own words with the printed page;
 * `pdf` is the scan's page. Roll effects work from the roll window (a tick box where the roll cannot tell the moment);
 * the rest are cards to the Storyteller, marks others can see, or WoDX Actions' fae window (DA_HANDLED).
 */
const row = (key, name, kind, cost, book, page, type, holders, effects = [], o = {}) => ({key, name, kind, cost: String(cost), book, page, pdf: page + 1, type,
  patterns: o.patterns ?? (effects.length ? ["P1"] : ["P11"]), holders, against: o.against ?? ["any"], aliases: o.aliases ?? [], effects});
const W = "DA:W", F = "DA:F", DD = "DA:DD", IC = "DA:IC";
const INQ = ["hunter", "mortal"];
const GAROU = ["lupine"], FAE = ["fae"];
const tick = (tag, label, diff, note, need = ["social"], dice = 0) => ({ch: "roll", tags: [tag], need, tick: label, ...(diff ? {diff} : {}), ...(dice ? {dice} : {}), note});

export const DA_LINE_ROWS = [
  // Dark Ages: Werewolf (B7931)
  row("mixed-morph", "Mixed Morph", "merit", 1, W, 86, "physical", GAROU, [tick("partial-change", "Changing only part of the body", -2, "a partial change at difficulty 6, still for a Willpower (Dark Ages: Werewolf p. 86)", [])]),
  row("unobtrusive", "Unobtrusive", "merit", 2, W, 87, "physical", ["lupine", "kinfolk", "mortal"], [], {patterns: ["P11"]}),
  row("wolf-years", "Wolf Years", "flaw", 2, W, 87, "physical", GAROU),
  row("callous", "Callous", "flaw", 4, W, 87, "mental", GAROU, [tick("pack-tactics", "A pack tactic", 1, "+1 difficulty on pack tactics; a Willpower to come to another's aid (Dark Ages: Werewolf p. 87)", [])]),
  row("devils-own", "Devil's Own", "flaw", 5, W, 87, "mental", GAROU, [tick("knows-devils-own", "With Garou who know the belief", 2, "+2 difficulty on Social rolls with Garou who know (Dark Ages: Werewolf p. 87)")], {patterns: ["P1", "P18"]}),
  row("foreigner", "Foreigner", "flaw", 1, W, 88, "social", ["lupine", "kinfolk", "mortal", "kindred", "ghoul", "hunter", "mage", "fae"], [{ch: "roll", tags: ["social"], diff: 1, note: "+1 difficulty on every Social roll in a strange land (Dark Ages: Werewolf p. 88)"}]),
  row("wolfs-obsession", "Wolf's Obsession", "flaw", 4, W, 88, "social", GAROU),
  row("spirit-rapport", "Spirit Rapport", "merit", 4, W, 88, "supernatural", GAROU, [tick("spirits", "Dealing with spirits", -1, "-1 difficulty with spirits (Dark Ages: Werewolf p. 88)", []), tick("spirit-bargain", "Bargaining with a spirit", -2, "-2 difficulty to bargain with spirits (Dark Ages: Werewolf p. 88)", [])]),
  row("slips-sideways", "Slips Sideways", "flaw", 1, W, 89, "supernatural", GAROU, [], {patterns: ["P4"]}),

  // Dark Ages: Fae (B7932)
  row("angelic", "Angelic", "merit", 3, F, 97, "physical", FAE, [tick("mortals-see-mien", "Mortals who see the fae mien", -1, "-1 difficulty with mortals who see the mien: wonder, not fear (Dark Ages: Fae p. 97)")]),
  row("demonic", "Demonic", "flaw", 3, F, 97, "physical", FAE, [tick("mortals-see-mien", "Mortals who see the fae mien", 2, "+2 difficulty with mortals who see the mien: fear, prayer and violence (Dark Ages: Fae p. 97)")], {patterns: ["P1", "P4"]}),
  row("frailty-of-the-flesh", "Frailty of the Flesh", "flaw", 3, F, 97, "physical", FAE, [{ch: "roll", tags: ["disease"], diff: 1, note: "falls ill as a mortal; a deadly illness is a deep sleep until cured (Dark Ages: Fae p. 97)"}]),
  row("unearthly-mien", "Unearthly Mien", "flaw", 4, F, 97, "physical", FAE, [tick("strong-willed-mortal", "With a mortal of Willpower 7 or more", 2, "+2 difficulty with strong-willed mortals, even in disguise (Dark Ages: Fae p. 97)")]),
  row("cherished", "Cherished", "merit", 1, F, 97, "social", FAE, [tick("knows-legend", "With mortals who know the fae's tale", 0, "+1 die on Social rolls with mortals who know the tale (Dark Ages: Fae p. 97)", ["social"], 1)], {aliases: ["Cherished and Feared"]}),
  row("feared", "Feared", "flaw", 1, F, 98, "social", FAE, [tick("knows-legend", "With mortals who know the fae's tale", 0, "-1 die on Social rolls with mortals who know the tale (Dark Ages: Fae p. 98)", ["social"], -1)], {aliases: ["Cherished and Feared"]}),
  row("prodigal-changeling", "Prodigal Changeling", "merit", 2, F, 98, "social", FAE, [tick("fae-and-humans", "Knowing how fae and mortals deal", -2, "-2 difficulty on rolls about fae and mortal affairs (Dark Ages: Fae p. 98)", [])]),
  row("child-of-inanimae", "Child of Inanimae", "flaw", 1, F, 98, "social", FAE, [tick("fae-who-know", "With fae who know the shame", 1, "+1 difficulty on Social rolls with fae who know the birth (Dark Ages: Fae p. 98)")]),
  row("inanimae-parent", "Inanimae Parent", "flaw", 2, F, 98, "social", FAE, [tick("fae-who-know", "With fae who know the shame", 3, "+3 difficulty on Social rolls with fae who know (Dark Ages: Fae p. 98)")]),
  row("known-echo", "Known Echo", "flaw", "2-5", F, 98, "social", FAE, [], {patterns: ["P9", "P11"]}),
  row("fosterling", "Fosterling", "flaw", 3, F, 98, "social", FAE, [], {patterns: ["P11"]}),
  row("oathbreaker-fae", "Oathbreaker", "flaw", "1, 3 or 5", F, 98, "social", FAE, [{ch: "roll", tags: ["social"], againstKinds: ["fae"], diff: 3, note: "+3 difficulty with other fae; no Oaths dots at the start (Dark Ages: Fae p. 98)"}], {against: ["fae"]}),
  row("gift-of-the-bard", "Gift of the Bard", "merit", 1, F, 98, "mental", FAE, [tick("tale-of-it", "Recalling a tale of this thing or place", -2, "-2 difficulty on Academics, Hearth Wisdom or Gramarye to recall it (Dark Ages: Fae p. 98)", [])]),
  row("gifted-teacher", "Gifted Teacher", "merit", 2, F, 99, "mental", FAE),
  row("riddlemaster", "Riddlemaster", "merit", 2, F, 99, "mental", FAE, [{ch: "roll", tags: ["enigmas"], diff: -2, note: "-2 difficulty on Enigmas (Dark Ages: Fae p. 99)"}]),
  row("mind-of-the-mists", "Mind of the Mists", "merit", 4, F, 99, "mental", FAE, [{ch: "resist", tags: ["mind"], diff: 1, note: "+1 difficulty to read or rule the mind; a non-fae may lose a Willpower to the tangle (Dark Ages: Fae p. 99)"}], {patterns: ["P19"]}),
  row("free-thinker", "Free Thinker", "merit", 5, F, 99, "mental", FAE),
  row("stable-mind", "Stable Mind", "merit", 5, F, 99, "mental", FAE),
  row("undereducated", "Undereducated", "flaw", "2-3", F, 100, "mental", FAE, [tick("courtly-tongue", "Reading or understanding the Court's tongue", 2, "only the Fostering tongue without Linguistics; at 3 points no reading at all (Dark Ages: Fae p. 100)", [])]),
  row("chattel-appetites", "Chattel Appetites", "flaw", 3, F, 100, "mental", FAE, [], {patterns: ["P11"]}),
  row("delicate-soul", "Delicate Soul", "flaw", 6, F, 100, "mental", FAE),
  row("iron-tongue", "Iron Tongue", "flaw", 6, F, 100, "mental", FAE, [], {patterns: ["P11"]}),
  row("cantrip-affinity", "Cantrip Affinity", "merit", 2, F, 100, "supernatural", FAE),
  row("attuned", "Attuned", "merit", 3, F, 100, "supernatural", FAE, [], {patterns: ["P11"]}),
  row("kenning-affinity", "Kenning Affinity", "merit", 3, F, 100, "supernatural", FAE, [{ch: "roll", tags: ["kenning"], diff: -1, note: "Kenning 1 tasks succeed at once; -1 difficulty on Kenning 2 rolls (Dark Ages: Fae p. 100)"}]),
  row("unleashing-control", "Unleashing Control", "merit", 4, F, 100, "supernatural", ["fae"]),
  row("echo-intolerant", "Echo Intolerant", "flaw", 2, F, 100, "supernatural", FAE),
  row("unseasonal", "Unseasonal", "flaw", 2, F, 100, "supernatural", FAE, [tick("own-court", "With the fae's own Court", 2, "+2 difficulty on Social rolls with the fae's own Court (Dark Ages: Fae p. 100)")]),
  row("crafted", "Crafted", "flaw", 4, F, 100, "supernatural", FAE, [], {patterns: ["P11"]}),
  row("dominion-ineptitude", "Dominion Ineptitude", "flaw", 6, F, 101, "supernatural", FAE, [], {patterns: ["P11"]}),

  // Dark Ages: Devil's Due (B7933): thralls are mortals in WoDX; the demons' own rows are for a possessing demon's sheet
  row("unbound-diabolist", "Unbound Diabolist", "merit", "2 or 4", DD, 98, "social", ["mortal"]),
  row("beloved-disciple", "Beloved Disciple", "merit", 3, DD, 98, "social", ["mortal"]),
  row("brash-diabolist", "Brash Diabolist", "flaw", 2, DD, 98, "social", ["demon"], [], {patterns: ["P11", "P9"]}),
  row("out-of-touch", "Out of Touch", "flaw", 3, DD, 99, "social", ["demon"], [{ch: "roll", tags: ["social"], diff: 2, note: "+2 difficulty on Social rolls without a guide to the age's tongue and ways (house reading of Devil's Due p. 99)"}]),
  row("cruel-master", "Cruel Master", "flaw", "2 or 5", DD, 99, "social", ["mortal"]),
  row("known-name", "Known Name", "flaw", "1, 3 or 5", DD, 99, "social", ["demon"]),
  row("known-name", "Known Name", "merit", 1, DD, 99, "social", ["demon"]),
  row("untainted", "Untainted", "merit", 5, DD, 100, "supernatural", ["mortal"]),
  row("penitent", "Penitent", "merit", 7, DD, 100, "supernatural", ["demon"]),
  row("strong-host", "Strong Host", "flaw", 4, DD, 100, "supernatural", ["demon"]),

  // Dark Ages: Inquisitor Companion (B7934, printed pp. 124-127)
  row("tough-as-nails", "Tough as Nails", "merit", 3, IC, 124, "physical", INQ, [tick("soak", "Soaking a blow", -1, "-1 difficulty on soak rolls (Dark Ages: Inquisitor Companion p. 124)", [])]),
  row("low-pain-threshold", "Low Pain Threshold", "flaw", 2, IC, 124, "physical", INQ, [{ch: "roll", tags: ["wounded"], dice: -1, note: "a die more off every pool when hurt, even Bruised (Dark Ages: Inquisitor Companion p. 124)"}]),
  row("talented-liar", "Talented Liar", "merit", 2, IC, 124, "mental", INQ, [{ch: "resist", tags: ["empathy"], diff: 2, note: "+2 difficulty to tell their lies (+1 for a plainly wild one) (Dark Ages: Inquisitor Companion p. 125)"}]),
  row("davids-aim", "David's Aim", "merit", 3, IC, 125, "mental", INQ),
  row("gullible-inq", "Gullible", "flaw", 2, IC, 125, "mental", INQ, [{ch: "roll", tags: ["empathy"], diff: 2, note: "+2 difficulty to see through lies or tricks (Dark Ages: Inquisitor Companion p. 125)"}]),
  row("insomniac", "Insomniac", "flaw", 2, IC, 125, "mental", INQ),
  row("supernaturally-ignorant", "Supernaturally Ignorant", "flaw", 3, IC, 125, "mental", INQ),
  row("orthodox", "Orthodox", "merit", 1, IC, 125, "social", INQ, [tick("church", "With the Church's people, obedient", -2, "-2 difficulty on Social rolls with the Church while they do as they are told (Dark Ages: Inquisitor Companion p. 126)")]),
  row("arrogant", "Arrogant", "flaw", 1, IC, 126, "social", INQ, [tick("equals-or-lower", "Swaying a friend or ally of equal or lower standing", 1, "+1 difficulty to sway friends and allies of equal or lower standing (Dark Ages: Inquisitor Companion p. 126)")]),
  row("criminal-past", "Criminal Past", "flaw", 1, IC, 126, "social", INQ, [tick("knows-past", "With someone who knows the old crimes", 2, "+2 difficulty on Social rolls with those who know the past (Dark Ages: Inquisitor Companion p. 126)")], {patterns: ["P1", "P18"]}),
  row("malicious-zealot", "Malicious Zealot", "flaw", 2, IC, 126, "mental", INQ),
  row("convert", "Convert", "flaw", 3, IC, 126, "social", INQ, [tick("inquisitor-stranger", "With inquisitors who do not know them", 1, "+1 difficulty with inquisitors who do not know them, +2 with the Callous (Dark Ages: Inquisitor Companion p. 126)")]),
  row("bitter-blood", "Bitter Blood", "merit", 1, IC, 126, "supernatural", INQ),
  row("callous-sensitive", "Callous-Sensitive", "merit", 1, IC, 126, "supernatural", INQ),
  row("grace", "Grace", "merit", 2, IC, 126, "supernatural", INQ),
  row("order-prodigy", "Order Prodigy", "merit", 3, IC, 126, "supernatural", INQ),
  row("saints-conscience", "Saint's Conscience", "merit", 3, IC, 127, "supernatural", INQ),
  row("vampiric-recognition", "Vampiric Recognition", "merit", 3, IC, 127, "supernatural", INQ),
  row("divinely-favored", "Divinely Favored", "merit", 4, IC, 127, "supernatural", INQ, [], {aliases: ["Divinely Favoured"]}),
  row("inviolate", "Inviolate", "merit", 4, IC, 127, "supernatural", INQ),
  row("gifted-exorcist", "Gifted Exorcist", "merit", 5, IC, 127, "supernatural", INQ, [tick("exorcism", "An exorcism", -3, "-3 difficulty on exorcism; a permanent Willpower saves a group's successes from another's botch (Dark Ages: Inquisitor Companion p. 127)", [])]),
  row("halo", "Halo", "merit", 5, IC, 127, "supernatural", INQ),
  row("devils-puppet", "Devil's Puppet", "flaw", 3, IC, 127, "supernatural", INQ),
  row("curse-prone", "Curse Prone", "flaw", 4, IC, 127, "supernatural", INQ),
  row("unlucky-inq", "Unlucky", "flaw", 4, IC, 127, "supernatural", INQ),
  row("spiritual-cripple", "Spiritual Cripple", "flaw", 5, IC, 127, "supernatural", INQ)
];

/** The DA:W rows the W20 table had only for others: Asthma and Geas are open to the Garou too (pp. 87, 89). */
export const DA_WIDEN = {"asthma": ["lupine", "kinfolk"], "geas": ["lupine", "kinfolk"]};

/** Cards to the Storyteller at their moment. */
export const DA_PROMPTS = {
  "unobtrusive": {on: ["social"], text: "others are at +1 difficulty to remember anything particular about them (Dark Ages: Werewolf p. 87)"},
  "wolf-years": {on: ["night"], text: "lives a wolf's span, 12 to 20 years; Attributes begin to fall after about six (Dark Ages: Werewolf p. 87)"},
  "wolfs-obsession": {on: ["night"], text: "cannot regain Willpower away from the beloved; under the auspice moon, Willpower every other scene not to go to them (Dark Ages: Werewolf p. 88)"},
  "devils-own": {on: ["fight"], text: "a change of shape (not to the breed form) calls for a Rage roll for frenzy (Dark Ages: Werewolf p. 87)"},
  "callous": {on: ["fight"], text: "coming to another's aid costs a Willpower; no part in pack initiative (Dark Ages: Werewolf p. 87)"},
  "known-echo": {on: ["social", "night"], text: "the fae's Echo is known in a tale or a children's rhyme: any peasant may use it (Dark Ages: Fae p. 98)"},
  "chattel-appetites": {on: ["night"], text: "the fae craves a human pleasure tonight and goes among mortals for it, whoever knows the weakness (Dark Ages: Fae p. 100)"},
  "iron-tongue": {on: ["social", "night"], text: "a pledge ignored costs an unsoakable lethal level a day until set right and forgiven (Dark Ages: Fae p. 100)"},
  "attuned": {on: ["night"], text: "a Dominion's juncture lasts two hours, not one (Dark Ages: Fae p. 100)"},
  "crafted": {on: ["night"], text: "made by mortal hands: no Greater Feature at creation, two more Lesser ones (Dark Ages: Fae p. 100)"},
  "dominion-ineptitude": {on: ["night"], text: "one Dominion (not the Court's favoured) is barred for good, with its Features (Dark Ages: Fae p. 101)"},
  "fosterling": {on: ["social"], text: "the Court's tongue only on an Intelligence + Linguistics roll; no Court and no favoured Dominion yet, and other Courts may court the fosterling (Dark Ages: Fae p. 98)"},
  "beloved-disciple": {on: ["night"], text: "the master never Ravages the thrall unasked and supplies what its will needs; it would answer a dire call, and punish a light one (Devil's Due p. 98)"},
  "brash-diabolist": {on: ["night"], text: "the host's careless research is a trail; until hidden, inquisitors may find it and the flaw becomes Hunted (Devil's Due p. 98)"},
  "out-of-touch": {on: ["social"], text: "knows neither the tongue nor the customs of the age; a guide must speak for the demon (Devil's Due p. 99)"},
  "cruel-master": {on: ["night"], text: "the master reshapes flesh and soul on a whim; at 5 points it spends the thrall without a thought (Devil's Due p. 99)"},
  "known-name": {on: ["night"], text: "a record of the demon's Celestial Name is somewhere: a Flaw, in hands that may learn to bind with it; a Merit, with neutral keepers who might summon it one day (Devil's Due p. 99)"},
  "penitent": {on: ["night"], text: "degeneration checks at -2 difficulty; an act of the angelic purpose or of the virtue against the Vice may earn a Resolve (Devil's Due p. 100)"},
  "strong-host": {on: ["social", "fight"], text: "when the host soul would feel strongly, Resolve at 8 (6 to beat it down, then a degeneration check) or act as the host wishes (Devil's Due p. 100)"},
  "gifted-teacher": {on: ["night"], text: "a fae taught a higher Dominion level pays one experience less (Dark Ages: Fae p. 99)"},
  // B7934: Dark Ages: Inquisitor Companion
  "davids-aim": {on: ["fight"], text: "every die gained by aiming counts twice (Dark Ages: Inquisitor Companion p. 125)"},
  "insomniac": {on: ["night"], text: "Willpower at 7 before sleep, or no sleep and +2 difficulty on Perception tomorrow; Blessings against sleep make it worse (Dark Ages: Inquisitor Companion p. 125)"},
  "supernaturally-ignorant": {on: ["night"], text: "most of what they know of the supernatural is wrong, and they blame the creature, not the lore; no Endowment above Acolyte until Occult or Hearth Wisdom or a teacher cures it (Dark Ages: Inquisitor Companion p. 125)"},
  "malicious-zealot": {on: ["fight", "social"], text: "with a chance to make a non-believer suffer, Willpower at 6 (8 if Callous), or they take it as cruelly as they can (Dark Ages: Inquisitor Companion p. 126)"},
  "bitter-blood": {on: ["fight"], text: "a vampire that tastes their blood needs Willpower at 9 to drink on, unless in hunger frenzy (Dark Ages: Inquisitor Companion p. 126)"},
  "callous-sensitive": {on: ["social"], text: "near a Callous fellow inquisitor, Perception + Empathy at 6 shows who it is; more successes tell how deep and their Impulse (Dark Ages: Inquisitor Companion p. 126)"},
  "saints-conscience": {on: ["night", "social"], text: "once a session, in a true moral tangle, prayer shows the most moral way, and the one that keeps them from Callousness (Dark Ages: Inquisitor Companion p. 127)"},
  "vampiric-recognition": {on: ["social"], text: "Perception + Alertness at 7 tells a vampire from a mortal (harder against the Blush of Health) (Dark Ages: Inquisitor Companion p. 127)"},
  "inviolate": {on: ["fight", "social"], text: "cannot be possessed by demon, ghost, witch or vampire (Dominate's Vessel included; the rest of Dominate works) (Dark Ages: Inquisitor Companion p. 127)"},
  "halo": {on: ["fight"], text: "a servant of the Devil spends a Willpower for each hostile act against them (Dark Ages: Inquisitor Companion p. 127)"},
  "devils-puppet": {on: ["fight", "night"], text: "anything that would possess them does so at -2 difficulty, and picks them first (Dark Ages: Inquisitor Companion p. 127)"},
  "unlucky-inq": {on: ["fight"], text: "once a session the Storyteller raises a critical roll's difficulty by two; a failure is plain bad luck (Dark Ages: Inquisitor Companion p. 127)"},
  "spiritual-cripple": {on: ["night"], text: "one Superior Virtue, chosen at creation, can never be gained (Dark Ages: Inquisitor Companion p. 127)"}
};

/** WoDX Actions' fae window carries these out (B7932). */
export const DA_HANDLED = {
  "free-thinker": "the fae window counts Weaving imbalance from 4 above the Mists, not 3",
  "stable-mind": "the fae window counts Mists imbalance from 4 above the Weaving, not 3",
  "delicate-soul": "the fae window counts imbalance from 2 above, either way",
  "cantrip-affinity": "one more cantrip in the Court's favoured Dominion",
  "unleashing-control": "three Unleashing dice for a changeling or inanimae",
  "echo-intolerant": "one more die on an Echo's roll",
  "cherished": "+1 die to escape a new Echo with mortals who know the tale",
  "feared": "-1 die to escape a new Echo with mortals who know the tale",
  "demonic": "-1 die to escape a new Echo with a priest by"
};

/** WoDX Actions' thrall window carries these out (B7933). */
DA_HANDLED["untainted"] = "the thrall window asks no degeneration check for a sin";
DA_HANDLED["unbound-diabolist"] = "the thrall window refuses a master's gift of Arcana or Taints";

/** WoDX Actions' inquisitor rules carry these out (B7934). */
DA_HANDLED["grace"] = "Callous only past Piety + 2, and never at Piety 8 or more";
DA_HANDLED["order-prodigy"] = "no Curse for learning the order's own Endowments (tick it in the bank window)";
DA_HANDLED["divinely-favored"] = "-2 on every Curse roll";
DA_HANDLED["curse-prone"] = "+2 on every Curse roll";

/** Things that go off on the map (Slips Sideways: a reflection in a stressful moment). */
export const DA_TRIGGERS = {
  "slips-sideways": {words: ["mirror", "looking glass", "still pool", "pond", "puddle"], stop: false, text: "catches a reflection and may slip into the Umbra",
    roll: "Wits + Occult at 7 in a stressful moment, or step sideways (Gnosis at one less)"}
};
