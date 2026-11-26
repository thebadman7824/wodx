/**
 * WoDX Actions: the inquisitors' Blessings one by one (Dark Ages: Inquisitor, Chapter Five), as short summaries in our
 * own words with the printed page. Each: id, name, kind (an ENDOWMENT_KINDS entry), use (Faith, Wisdom or Zeal, or a
 * path or ritus level), stage (acolyte, advocate, judge, or "" for none), roll ("attribute+trait", "" for no roll; the
 * trait is faith, wisdom, zeal, conscience, selfcontrol, courage, path or an Ability), difficulty (a number, "t" for the
 * target's Willpower or an opposed roll, "piety" for the user's Piety, "var" where the Storyteller sets it), Conviction
 * cost, the effect, and an effects-card spec (mage-da-effects.js helpers, plus PL for a pool and CV for Conviction).
 * The Superior Virtues themselves roll in the Virtue roll window. Pure: no Foundry calls.
 */
import { H, T, C, N, HL, outcomesOf } from "../../wodx-rules/actions/mage-da-effects.js";
import { DAY, WEEK } from "../../wodx-rules/core/terms.mjs";

export const REF = "Dark Ages: Inquisitor";
/** B7934: the Companion's Blessings carry their own book. */
export const REF_C = "Dark Ages: Inquisitor Companion";
/** "Book p. N" for a Blessing, from its own book. */
export const refOf = b => `${b?.ref ?? REF} p. ${b?.p}`;
/** A pool moved: points per success (or fixed), on whom; drain takes it away. */
export const PL = (pool, per, who = "one", o = {}) => ({ kw: "charge", kind: "pool", pool, per, who, fixed: !!o.fixed, drain: !!o.drain });
/** Conviction regained by the user: one per success, up to the cap ("piety" or a trait name). */
export const CV = (cap = "piety") => ({ kw: "charge", kind: "conv", cap, who: "self" });

const B = (id, name, kind, use, stage, roll, diff, cost, p, fx, spec, o = {}) => ({ id, name, kind, use, stage, roll, diff, cost, p, fx, spec, ...o });
const sc = "scene";

const CORE = [
    // Orisons (p. 174-176)
    B("moral-compass", "Moral Compass", "Orison", "Conscience", "", "perception+conscience", 6, 0, 174, "Reads the sin and Piety of those close by; five successes pick out pagans and heretics.", N("know")),
    B("noahs-favor", "Noah's Favor", "Orison", "Conscience", "", "perception+animal ken", 6, 1, 174, "Speaks heart to heart with an animal, or soothes it.", T("speak", "Noah's Favor", sc, "one")),
    B("true-innocent", "The True Innocent", "Orison", "Conscience", "", "", 6, 1, 174, "A ward of innocence: a foe must win Willpower against the user's Piety to do harm (not while Callous); Conscience rolls -1 difficulty.", T("ward", "The True Innocent", sc, "self"), { resist: "Willpower vs the user's Piety" }),
    B("blessing-of-years", "Blessing of Years", "Orison", "Self-Control", "", "", 6, 1, 175, "Knowledge rolls -1 difficulty (5 at best); the point spent gives one more Knowledge dot for the scene.", T("boost", "Blessing of Years", sc, "self")),
    B("eye-of-vigilance", "Eye of Vigilance", "Orison", "Self-Control", "", "", 6, 1, 175, "Three hours of sleep serve for a night; a point a night goes without sleep at no cost.", T("boost", "Eye of Vigilance", "night", "self")),
    B("penitent-man", "The Penitent Man", "Orison", "Self-Control", "", "selfcontrol+wisdom", "var", 1, 175, "A glimpse of how Heaven judged a recent deed; Self-Control rolls -1 difficulty.", N("know")),
    B("hierophant", "The Hierophant", "Orison", "Courage", "", "courage", 6, 1, 175, "Courage rolls -1 difficulty for the user and one ally in sight per success.", T("boost", "The Hierophant", sc, "each")),
    B("sanguine-hymn", "Sanguine Hymn", "Orison", "Courage", "", "courage", 6, 1, 175, "Blessed blood: a drinker takes an aggravated level per point and gains nothing; it scalds bodily fiends.", T("imbue", "Sanguine Hymn", sc, "self")),
    B("tale-spinner", "Tale-spinner", "Orison", "Courage", "", "charisma+courage", "t", 1, 176, "Performance -2 difficulty; one listener is held by the tale until Willpower or a blow breaks it.", C("hold", "immobilized", "Held by the tale", sc)),
    // Benedictions, Oculi Dei (p. 177-179)
    B("shepherd-w", "Heavenly Shepherd (Wisdom)", "Benediction", "Wisdom", "acolyte", "wits+wisdom", 6, 0, 177, "While praying, hidden from supernatural seekers who fail Wits + Alertness at the user's Piety.", T("veil", "Heavenly Shepherd", sc, "self")),
    B("shepherd-f", "Heavenly Shepherd (Faith)", "Benediction", "Faith", "acolyte", "charisma+faith", 6, 1, 177, "Mortals within Conscience + Faith yards overlook the supernatural for the scene.", T("veil", "Heavenly Shepherd's veil", sc, "self")),
    B("shepherd-z", "Heavenly Shepherd (Zeal)", "Benediction", "Zeal", "acolyte", "manipulation+zeal", "t", 1, 177, "One mortal forgets a supernatural event seen since dawn.", T("sway", "A memory lifted", { days: 7 }, "one")),
    B("sight-w", "Second Sight (Wisdom)", "Benediction", "Wisdom", "acolyte", "perception+wisdom", 6, 0, 177, "Hints of what is inhuman or disguised, a turn per success (a point makes it the scene).", N("sense")),
    B("sight-f", "Second Sight (Faith)", "Benediction", "Faith", "acolyte", "perception+faith", 6, 0, 177, "Sees in darkness or while blind (a point against unnatural dark).", T("sight", "Second Sight", sc, "self")),
    B("sight-z", "Second Sight (Zeal)", "Benediction", "Zeal", "acolyte", "perception+zeal", "t", 0, 177, "Sees through Obfuscate and illusions (against Wits + Stealth).", N("sense")),
    B("liturgy-w", "Divine Liturgy (Wisdom)", "Benediction", "Wisdom", "advocate", "selfcontrol+wisdom", 6, 1, 178, "Once a day: a Willpower point back.", PL("willpower", 1, "self", { fixed: true })),
    B("liturgy-f", "Divine Liturgy (Faith)", "Benediction", "Faith", "advocate", "conscience+faith", 6, 0, 178, "Once a day: a Conviction point per success, up to Piety.", CV("piety")),
    B("liturgy-z", "Divine Liturgy (Zeal)", "Benediction", "Zeal", "advocate", "charisma+zeal", "t", 0, 178, "One command a Christian or heretic must try to obey; refusing costs Willpower equal to the successes, then they are free of it for the story.", T("sway", "Divine Liturgy", sc, "one")),
    B("exult-w", "I Exult in Thee (Wisdom)", "Benediction", "Wisdom", "advocate", "charisma+wisdom", "t", 1, 178, "The target shows its true Nature; lying needs Willpower against Piety.", N("know")),
    B("exult-f", "I Exult in Thee (Faith)", "Benediction", "Faith", "advocate", "charisma+faith", 6, 0, 179, "No attacks within Faith yards unless Courage beats the successes.", T("ward", "I Exult in Thee", sc, "self")),
    B("exult-z", "I Exult in Thee (Zeal)", "Benediction", "Zeal", "advocate", "charisma+zeal", "t", 0, 179, "Mortals kneel in joy; abominations flee, and staying costs Willpower and a roll against Piety.", T("fear", "I Exult in Thee", sc, "all")),
    B("wine-w", "Water to Wine (Wisdom)", "Benediction", "Wisdom", "judge", "dexterity+wisdom", "var", 2, 179, "Turns one ordinary thing into another for good (6 to 10 by how far; mass by Wisdom).", T("shape", "Water to Wine", sc, "one")),
    B("wine-f", "Water to Wine (Faith)", "Benediction", "Faith", "judge", "conscience+faith", 6, 0, 179, "Heals a level of any kind per success.", HL(1, { aggravated: true })),
    B("wine-z", "Water to Wine (Zeal)", "Benediction", "Zeal", "judge", "strength+zeal", 6, 0, 179, "A touch: an aggravated level per success; the bodiless are untouched; on a human, Piety is at risk.", H("harm", 1, "aggravated", { soak: false })),
    // Investitures, Knights of Acre (p. 180-182)
    B("cat-z", "Catechumen (Zeal)", "Investiture", "Zeal", "acolyte", "courage+zeal", 6, 1, 180, "Cannot be moved or routed and knows no fear.", T("ward", "Catechumen: steadfast", sc, "self")),
    B("cat-f", "Catechumen (Faith)", "Investiture", "Faith", "acolyte", "", 6, 1, 180, "Soaks lethal damage and adds Faith to soak (not with an unconfessed sin).", T("boost", "Catechumen: soak", sc, "self", { boost: "soak" })),
    B("cat-w", "Catechumen (Wisdom)", "Investiture", "Wisdom", "acolyte", "", 6, 1, 180, "Once a story, a Willpower point and a Conviction point negate a botch on a roll with a Virtue: tick it in the Virtue roll or Blessing window.", N("free"), { wp: 1, applied: "hunter.js catechumen (B7065)" }),
    B("trans-z", "Transfiguration (Zeal)", "Investiture", "Zeal", "acolyte", "stamina+zeal", 7, 1, 180, "A die of Strength or Stamina per success for the scene.", T("boost", "Transfiguration", sc, "self", { boost: "physical" })),
    B("trans-f", "Transfiguration (Faith)", "Investiture", "Faith", "acolyte", "strength+faith", "var", 0, 180, "Burns poison or vampire blood out of the body.", T("boost", "Transfiguration: cleansed", sc, "self")),
    B("trans-w", "Transfiguration (Wisdom)", "Investiture", "Wisdom", "acolyte", "stamina+wisdom", 7, 0, 180, "Wound penalties one less per success for the scene.", T("boost", "Transfiguration: pain set aside", sc, "self")),
    B("flight-z", "Flight of Angels (Zeal)", "Investiture", "Zeal", "advocate", "dexterity+zeal", 6, 1, 180, "Next turn, a physical action more per two successes (up to Zeal).", T("hasten", "Flight of Angels", { turns: 1 }, "self")),
    B("flight-f", "Flight of Angels (Faith)", "Investiture", "Faith", "advocate", "", 7, 1, 180, "Steps in to take a blow meant for an ally within two feet per Faith (a roll if slower).", T("ward", "Flight of Angels: shield", { turns: 1 }, "one")),
    B("flight-w", "Flight of Angels (Wisdom)", "Investiture", "Wisdom", "advocate", "wits+wisdom", 6, 0, 181, "Wits up one per success for ten minutes; above 5, extra dice to dodge or initiative.", T("boost", "Flight of Angels: quick wits", sc, "self", { boost: "initiative" })),
    B("res-z", "Resurrection (Zeal)", "Investiture", "Zeal", "advocate", "perception+zeal", "t", 0, 181, "After wounding a foe: Conviction per net success (up to Zeal); the foe loses a Willpower point.", PL("willpower", 1, "one", { fixed: true, drain: true }), { alsoConv: "zeal" }),
    B("res-f", "Resurrection (Faith)", "Investiture", "Faith", "advocate", "conscience+faith", 6, 1, 182, "Each Conviction point spent heals the living one lethal or two bashing levels.", HL(1)),
    B("res-w", "Resurrection (Wisdom)", "Investiture", "Wisdom", "advocate", "perception+wisdom", 7, 1, 182, "A touch: a fact about the target per success.", N("know")),
    B("auto-z", "Auto da Fe (Zeal)", "Investiture", "Zeal", "judge", "perception+zeal", 6, 1, 182, "The next attack adds Zeal to its damage dice, all aggravated.", T("boost", "Auto da Fe: holy fire", { turns: 1 }, "self", { boost: "physical" })),
    B("auto-f", "Auto da Fe (Faith)", "Investiture", "Faith", "judge", "charisma+faith", "var", 3, 182, "A miracle of help, as the Storyteller decides (difficulty 10 less the points, 4 at best); the user can do nothing else this scene.", N("free"), { story: "DA:Inquisitor p. 182: the miracle is whatever the Storyteller decides; the book gives no effect to apply" }),
    B("auto-w", "Auto da Fe (Wisdom)", "Investiture", "Wisdom", "judge", "perception+wisdom", 7, 1, 182, "Knows the field and every foe on it; successes add to initiative for the battle.", T("boost", "Auto da Fe: the field known", sc, "self", { boost: "initiative" })),
    // Legacies, House Murnau (p. 183-185)
    B("fw-f", "Forbidden Wisdom (Faith)", "Legacy", "Faith", "acolyte", "", 6, 0, 183, "Always on: smells the supernatural, ghouls too.", N("sense")),
    B("fw-w", "Forbidden Wisdom (Wisdom)", "Legacy", "Wisdom", "acolyte", "perception+wisdom", 7, 1, 183, "Knows whether one statement is a deliberate lie.", N("know")),
    B("fw-z", "Forbidden Wisdom (Zeal)", "Legacy", "Zeal", "acolyte", "", 6, 0, 183, "Always on: Zeal dice more to intimidate the supernatural, Zeal dice less to deal kindly with them.", T("boost", "Forbidden Wisdom", sc, "self", { boost: "social" })),
    B("no-f", "Noblesse Oblige (Faith)", "Legacy", "Faith", "acolyte", "charisma+faith", 7, 0, 183, "A touch gives the target a Conviction point per success.", PL("conviction", 1, "one")),
    B("no-w", "Noblesse Oblige (Wisdom)", "Legacy", "Wisdom", "acolyte", "perception+wisdom", 7, 1, 183, "Senses whether each person met can be trusted.", N("know")),
    B("no-z", "Noblesse Oblige (Zeal)", "Legacy", "Zeal", "acolyte", "manipulation+zeal", 6, 1, 183, "Social rolls with mortals -2 difficulty.", T("boost", "Noblesse Oblige", sc, "self", { boost: "social" })),
    B("ws-f", "Wreathed in Shadows (Faith)", "Legacy", "Faith", "advocate", "manipulation+faith", "t", 1, 183, "Frees the target of the Impulse for the scene; if still Callous at its end, both lose a Willpower point.", T("sway", "Wreathed in Shadows", sc, "one")),
    B("ws-w", "Wreathed in Shadows (Wisdom)", "Legacy", "Wisdom", "advocate", "perception+wisdom", 6, 1, 184, "Reads the target's deepest drives; on an inquisitor, how near they are to Callous.", N("know")),
    B("ws-z", "Wreathed in Shadows (Zeal)", "Legacy", "Zeal", "advocate", "", 6, 0, 184, "Praying with a Flock gives its rating in Conviction on top of the roll, even past Piety; the Flock is spent for the day: tick it in the Prayer window.", N("free"), { applied: "hunter.js prayer (B7065)" }),
    B("me-f", "Mirror of Evil (Faith)", "Legacy", "Faith", "judge", "conscience+faith", "t", 1, 183, "Blocks mind and sense powers (Presence, Dominate, Dementation, some Obtenebration) within Willpower yards while the successes hold.", T("ward", "Mirror of Evil", { turns: 1 }, "self")),
    B("me-w", "Mirror of Evil (Wisdom)", "Legacy", "Wisdom", "judge", "perception+wisdom", 7, 0, 184, "Learns one weakness, strength or habit of a chosen creature.", N("know")),
    B("me-z", "Mirror of Evil (Zeal)", "Legacy", "Zeal", "judge", "wits+zeal", "piety", 1, 184, "A point per Attribute raises it to the foe's rating (up to Willpower) for the scene; heat and smoke show it.", T("boost", "Mirror of Evil", sc, "self", { boost: "physical" })),
    B("ar-f", "Arcana (Faith)", "Legacy", "Faith", "judge", "intelligence+faith", "t", 2, 184, "Turns a supernatural power aimed at the user back on its user in full.", T("ward", "Arcana: the mirror", { turns: 1 }, "self")),
    B("ar-w", "Arcana (Wisdom)", "Legacy", "Wisdom", "judge", "wits+wisdom", 7, 1, 185, "Hidden from supernatural eyes (Perception + Alertness at 7 to beat it), or visions of Hell at -1 die per success; five successes break them.", T("veil", "Arcana: unseen", sc, "self")),
    B("ar-z", "Arcana (Zeal)", "Legacy", "Zeal", "judge", "strength+zeal", 8, 1, 185, "Draws a point of blood, Quintessence, Gnosis or Rage per success out of the target (Willpower if none).", PL("blood", 1, "one", { drain: true })),
    // Psalms (p. 185-188)
    B("gospel-f", "Gospel (Faith)", "Psalm", "Faith", "", "manipulation+faith", 6, 0, 185, "Social rolls -1 difficulty until a lie is told.", T("boost", "Gospel", sc, "self", { boost: "social" })),
    B("gospel-w", "Gospel (Wisdom)", "Psalm", "Wisdom", "", "wits+wisdom", 6, 0, 185, "Two dice more on Etiquette, Empathy and Subterfuge.", T("boost", "Gospel: the gentle word", sc, "self", { boost: "social" })),
    B("gospel-z", "Gospel (Zeal)", "Psalm", "Zeal", "", "charisma+zeal", 6, 0, 185, "Two dice more on Intimidation, Interrogation and Leadership.", T("boost", "Gospel: the stern word", sc, "self", { boost: "social" })),
    B("lux-f", "Fiat Lux (Faith)", "Psalm", "Faith", "", "perception+faith", 6, 1, 186, "For a turn, a light shows every supernatural thing near to all who look.", N("sense")),
    B("lux-w", "Fiat Lux (Wisdom)", "Psalm", "Wisdom", "", "", 6, 1, 186, "Light to read by, Wisdom yards around.", T("light", "Fiat Lux", sc, "self")),
    B("lux-z", "Fiat Lux (Zeal)", "Psalm", "Zeal", "", "courage+zeal", 7, 1, 186, "A lethal level per success to each vampire or sun-shy thing within Zeal yards.", H("harm", 1, "lethal", { who: "all", ask: true })),
    B("chorale-f", "Chorale (Faith)", "Psalm", "Faith", "", "performance+faith", 7, 1, 186, "At the hymn's end, each singer who makes Conscience + Faith at 8 regains a Willpower point.", PL("willpower", 1, "all", { fixed: true })),
    B("chorale-w", "Chorale (Wisdom)", "Psalm", "Wisdom", "", "intelligence+wisdom", 7, 1, 186, "With two devout helpers: a vision of a place's or thing's story.", N("know")),
    B("chorale-z", "Chorale (Zeal)", "Psalm", "Zeal", "", "courage+zeal", 6, 0, 186, "While the singing lasts, creatures need Stamina successes above the singer's to cross; those inside take a lethal level a turn.", T("ward", "Chorale: the circle", sc, "self")),
    B("hos-f", "Hosanna (Faith)", "Psalm", "Faith", "", "perception+faith", 6, 0, 187, "Lends the user's Willpower to another, even past their rating, for the scene.", PL("willpower", 1, "one")),
    B("hos-w", "Hosanna (Wisdom)", "Psalm", "Wisdom", "", "manipulation+wisdom", "var", 1, 187, "A message of one breath, carried to anyone with a Superior Virtue.", N("speak")),
    B("hos-z", "Hosanna (Zeal)", "Psalm", "Zeal", "", "charisma+zeal", "var", 1, 187, "Shatters a thing a level per success (glass 6 up to stone 10); the undead are hard wood and take it as lethal.", H("harm", 1, "lethal", { ask: true })),
    B("ora-f", "Oratorio (Faith)", "Psalm", "Faith", "", "charisma+faith", 6, 2, 187, "Within five yards a success, anyone without a Superior Virtue stands frozen unless Willpower beats Piety.", C("hold", "immobilized", "Frozen by the Oratorio", { turns: 1 }, "all")),
    B("ora-w", "Oratorio (Wisdom)", "Psalm", "Wisdom", "", "manipulation+wisdom", 7, 1, 187, "Sinful hearers (the supernatural, Callous inquisitors) roll at +1 difficulty per success.", T("fortune", "Oratorio: the weight of sin", sc, "all")),
    B("ora-z", "Oratorio (Zeal)", "Psalm", "Zeal", "", "charisma+zeal", "t", 1, 188, "Hearers who lose must sing along, taking an aggravated level a turn until they break away.", C("hold", "immobilized", "Caught in the Oratorio", sc, "all")),
    // Holy Art: Sophia Patris, Perception + path (p. 188-189)
    B("sp1", "Open the Mind's Eye", "Holy Art", "Sophia Patris 1", "", "perception+path", "t", 0, 188, "Hears the target's thoughts now; a failure shuts that mind for a day.", N("know")),
    B("sp2", "Unwavering Vision", "Holy Art", "Sophia Patris 2", "", "perception+path", "t", 0, 188, "A vision per success of the target's latest dealings with mortals.", N("know")),
    B("sp3", "Unearth", "Holy Art", "Sophia Patris 3", "", "perception+path", 7, 0, 189, "Five minutes of a place's past per success.", N("know")),
    B("sp4", "Lifting the Veil of Lies", "Holy Art", "Sophia Patris 4", "", "perception+path", 7, 1, 189, "Lies are known for the scene; a touch shows the person's last brush with the supernatural.", N("know")),
    B("sp5", "Revelation", "Holy Art", "Sophia Patris 5", "", "perception+path", 8, 2, 189, "Every supernatural thing within 10 to 500 feet shows its true horror to all who see.", T("fear", "Revelation", { turns: 1 }, "all")),
    // Holy Art: Sedulitas Filius, Strength + path (p. 190-191)
    B("sf1", "Sunder", "Holy Art", "Sedulitas Filius 1", "", "strength+path", 6, 1, 190, "The next blow adds two dice, all lethal, and strikes the immaterial.", T("boost", "Sunder", { turns: 1 }, "self", { boost: "physical" })),
    B("sf2", "Censure", "Holy Art", "Sedulitas Filius 2", "", "charisma+path", "t", 0, 190, "The target must drop its cover and charge; a Willpower point holds it off a turn.", T("sway", "Censure", sc, "one")),
    B("sf3", "God's Armor", "Holy Art", "Sedulitas Filius 3", "", "", 6, 0, 190, "Always on: battle wounds heal far faster (bashing a level each five minutes).", HL(1, { who: "self" })),
    B("sf4", "Rod and Staff", "Holy Art", "Sedulitas Filius 4", "", "strength+path", 6, 2, 190, "Ten minutes per success: no foe gets past to those behind, and plain missiles glance off.", T("ward", "Rod and Staff", { seconds: 600 }, "self")),
    B("sf5", "Wrath of God", "Holy Art", "Sedulitas Filius 5", "", "strength+path", 8, 1, 191, "Strength plus successes in lethal dice at Zeal yards; it cannot be dodged.", H("harm", 1, "lethal", { ask: true })),
    // Holy Art: Boni Spiritus, Wits + path (p. 192-193)
    B("bs1", "Tears of the Martyr", "Holy Art", "Boni Spiritus 1", "", "wits+path", "var", 0, 192, "While the gaze holds, a turn per success, the target cannot leave its spot (it can still fight).", C("hold", "immobilized", "Rooted by Tears of the Martyr", { turns: 1 })),
    B("bs2", "Touch of Peace", "Holy Art", "Boni Spiritus 2", "", "wits+path", "var", 0, 192, "Wound penalties one less per success, and calm; it can end a frenzy.", T("boost", "Touch of Peace", sc, "one")),
    B("bs3", "Aura of Sanctity", "Holy Art", "Boni Spiritus 3", "", "wits+path", 6, 1, 192, "Supernatural attacks on the user +1 difficulty per success; demons, ghosts and vampires inside burn a lethal level a turn.", T("ward", "Aura of Sanctity", { turns: 1 }, "self")),
    B("bs4", "Restoration", "Holy Art", "Boni Spiritus 4", "", "wits+path", "var", 0, 192, "Once a day per person: every lethal wound becomes bashing.", HL(1)),
    B("bs5", "Judgment of Heaven", "Holy Art", "Boni Spiritus 5", "", "wits+path", 8, 2, 193, "Seals the place: no leaving or arriving by supernatural ways, and powers drawn from beyond fail.", T("ward", "Judgment of Heaven", sc, "self")),
    // Ritae, Intelligence + Holy Art, difficulty 4 + level (p. 193-196, 198-200)
    B("r-vigil", "Blessed Vigilance", "Holy Art", "Ritus 1", "", "intelligence+path", 5, 0, 193, "A day per success without sleep; Wits rolls -1 difficulty and initiative +1.", T("boost", "Blessed Vigilance", { days: 1 }, "one", { boost: "initiative" })),
    B("r-hallow", "Hallow Ground", "Holy Art", "Ritus 1", "", "intelligence+path", 7, 0, 193, "An hour pacing the bounds makes Holy Ground (Ambient Faith 1) until dawn, longer with more successes.", T("place", "Holy Ground", "night", "self")),
    B("r-exorcism", "Holy Rite of Exorcism", "Holy Art", "Ritus 1", "", "intelligence+path", 10, 0, 194, "Hours of rite against the spirit's Willpower; enough net successes cast it out.", T("banish", "Exorcism", sc, "one")),
    B("r-plague", "Plague Ward", "Holy Art", "Ritus 2", "", "intelligence+path", 6, 0, 194, "Up to Faith + Holy Art people catch no common illness for days.", T("ward", "Plague Ward", { days: 1 }, "each")),
    B("r-sunstone", "Sunstone", "Holy Art", "Ritus 2", "", "intelligence+path", 7, 1, 194, "A stone that sheds sunlight when lit: one to three aggravated dice to vampires in it.", H("harm", 1, "aggravated", { who: "all", ask: true })),
    B("r-march", "Forced March", "Holy Art", "Ritus 3", "", "intelligence+path", 7, 0, 195, "For Zeal + Holy Art days, the company travels three times as far.", T("boost", "Forced March", { days: 1 }, "all")),
    B("r-fortunes", "Fortunes of War", "Holy Art", "Ritus 4", "", "intelligence+path", 7, 1, 195, "Each warrior blessed rolls one chosen Virtue at -1 difficulty for days.", T("fortune", "Fortunes of War", { days: 1 }, "each")),
    B("r-forge", "Forge of God", "Holy Art", "Ritus 5", "", "intelligence+path", 7, 10, 195, "A holy weapon with a gift per two successes (aggravated to the damned, never breaks, glows near danger and more).", T("make", "Forge of God", sc, "self")),
    B("r-attar", "Attar of the Damask Rose", "Holy Art", "Ritus 1", "", "", 6, 1, 198, "An anointing: wounds close faster (Hurt or less at once) and weariness lifts.", HL(1)),
    B("r-chrism", "Chrism of the Blessed Myroblite", "Holy Art", "Ritus 4", "", "", 6, 0, 200, "An anointing that closes wounds; a vial thrown at a demon, vampire or evil spirit burns for ten aggravated dice, fading after.", H("harm", 10, "aggravated", { fixed: true, ask: true }))
];

/**
 * B7934: the Orisons, Endowments, Corpus Lux and ritae of the Dark Ages: Inquisitor Companion (printed pp. 98-117), in
 * the same shape. Corpus Lux rolls Charisma + path unless the entry says otherwise; the ritae roll Intelligence + Holy
 * Art at the page's difficulty.
 */
const CO = { ref: REF_C };
const hours = k => Array.from({ length: k }, (_, i) => [`${i + 1} hour${i ? "s" : ""}`, 3600 * (i + 1)]);
const FOREVER = [["for good", 3155760000]];
export const COMPANION = [
    // Orisons (pp. 98-101)
    B("c-kindness", "Gift of Kindness", "Orison", "Conscience", "", "intelligence+conscience", 6, 1, 98, "Always: Charisma rolls that threaten no one are -1 difficulty. A point and the roll: how to carry oneself among strangers, even the right phrase in their tongue.", N("know"), CO),
    B("c-compassion", "Touch of Compassion", "Orison", "Conscience", "", "perception+medicine", 6, 0, 98, "A touch and a turn: the wounds, sickness or poison and how bad; a point more gives the best cure the age knows (or that none exists).", N("know"), CO),
    B("c-aesthetic", "Aesthetic Eye", "Orison", "Conscience", "", "perception+alertness", 7, 1, 99, "Tells whether a thing was made or changed by an unnatural hand (not what kind).", N("sense"), CO),
    B("c-loaves", "Loaves and Fishes", "Orison", "Self-Control", "", "", 6, 1, 99, "A meal for one, prayed over, feeds five for each Conviction point (three a day at most).", N("free"), { ...CO, story: "Companion p. 99: who is fed is the hardship window's call; WoDX keeps no plate" }),
    B("c-jacob", "Dream of Jacob", "Orison", "Self-Control", "", "stamina+selfcontrol", 6, 1, 100, "A trance like death, a day for each point spent (one a success at most): no food, a Willpower point back each day, no waking early. A botch: a Conviction point and a lethal level.", PL("willpower", 1, "self"), CO),
    B("c-carried", "Carried by Faith", "Orison", "Self-Control", "", "dexterity+selfcontrol", 6, 1, 100, "Always: Stamina rolls to travel on foot -1 difficulty. A point and the roll: no footprints for the scene.", T("veil", "Carried by Faith", sc, "self"), CO),
    B("c-fear", "Fear of God", "Orison", "Courage", "", "charisma+courage", "t", 1, 100, "Always: Intimidation -1 difficulty. A point and the roll: the target cowers a turn per success, defending only (a monster resists with Willpower at the user's Piety, a mortal spends Willpower).", T("fear", "Fear of God", { turns: 1 }, "one"), CO),
    B("c-vigor", "Blessed Vigor", "Orison", "Courage", "", "", 6, 1, 100, "Each Conviction point sets aside a level of wound penalties for the scene; at its end Courage at 5 plus the wound levels, or a bashing level. Not while Incapacitated.", T("boost", "Blessed Vigor", sc, "self", { painless: true }), CO),
    B("c-moses", "Grace of Moses", "Orison", "Courage", "", "perception+courage", 6, 1, 100, "Always: Survival -1 difficulty. A point and the roll: a way to live through a hostile land (water, shelter, a stranger's help, fire).", N("know"), CO),
    // Benedictions, Oculi Dei (pp. 101-104)
    B("c-endure-w", "Endurance Everlasting (Wisdom)", "Benediction", "Wisdom", "acolyte", "stamina+wisdom", 6, 1, 101, "Two days a success without sleep or food, and a point a success for the Mental Attributes (to 6, 7 or 8 by stage); not again until it ends.", T("boost", "Endurance Everlasting", { days: 2 }, "self", { on: "mental" }), CO),
    B("c-endure-f", "Endurance Everlasting (Faith)", "Benediction", "Faith", "acolyte", "stamina+faith", 6, 1, 101, "Two Willpower a success for the scene, only to fend off mind powers (Dominate, Vessel and the like).", PL("willpower", 2, "self"), CO),
    B("c-endure-z", "Endurance Everlasting (Zeal)", "Benediction", "Zeal", "acolyte", "stamina+zeal", 5, 0, 102, "Eight hours a success of full exertion without rest (travel or work, not battle); then a day a success barely able to hobble.", N("free"), { ...CO, story: "Companion p. 101: hours of travel or work outside a fight; WoDX keeps no fatigue clock, the Storyteller marks the hobbling days" }),
    B("c-light-w", "Divine Light (Wisdom)", "Benediction", "Wisdom", "acolyte", "perception+wisdom", 6, 0, 102, "Knows who watches or follows: a turn at one success, a scene at three, the follower's aim at four, scrying at five.", N("sense"), CO),
    B("c-light-f", "Divine Light (Faith)", "Benediction", "Faith", "acolyte", "perception+faith", 6, 1, 102, "Sees magic or Disciplines at work, and who works them, five feet a success.", N("sense"), CO),
    B("c-light-z", "Divine Light (Zeal)", "Benediction", "Zeal", "acolyte", "perception+zeal", 6, 1, 102, "A sense of danger for the scene, from foreboding at one success to who plots it and how to turn it at five.", N("know"), CO),
    B("c-libera-w", "Libera Me (Wisdom)", "Benediction", "Wisdom", "advocate", "wits+wisdom", 6, 0, 103, "Throws off mind control (two successes for Presence, mages and the fae); three and a point cast out a possessing demon.", T("ward", "Libera Me: the mind its own", sc, "self", { against: "mind" }), CO),
    B("c-libera-f", "Libera Me (Faith)", "Benediction", "Faith", "advocate", "dexterity+faith", 6, 0, 103, "Chains, ropes, locks and snares fall away, a success for each binding.", N("free"), { ...CO, story: "Companion p. 103: bindings and locks fall away; the Storyteller lifts the Held or Bound marks by hand" }),
    B("c-libera-z", "Libera Me (Zeal)", "Benediction", "Zeal", "advocate", "charisma+zeal", 7, 0, 103, "Whoever holds the user, by hand or by magic, is slammed to the ground, stunned a turn for each success past the first.", { kw: "trip", kind: "kw", who: "all" }, CO),
    B("c-vow-w", "Vow of Silence (Wisdom)", "Benediction", "Wisdom", "judge", "wits+wisdom", 5, 1, 104, "Each success takes three from any supernatural sense seeking the user (Heightened Senses, telepathy, finding spells).", T("veil", "Vow of Silence", sc, "self"), CO),
    B("c-vow-f", "Vow of Silence (Faith)", "Benediction", "Faith", "judge", "wits+faith", 7, 1, 104, "No aura, dream, ghost, corpse or touched thing gives the user away, for a scene up to a year by successes.", T("veil", "Vow of Silence: the trail covered", { ladder: [["one scene", { kind: "scene" }], ["one day", DAY], ["one week", WEEK], ["one month", 30 * DAY], ["one year", 365 * DAY]] }, "self"), CO),
    B("c-vow-z", "Vow of Silence (Zeal)", "Benediction", "Zeal", "judge", "", 6, 1, 104, "Under torture or mind control the sought knowledge is simply gone, until the user is free again.", T("ward", "Vow of Silence", sc, "self", { against: "mind" }), CO),
    // Investitures, Knights of Acre (pp. 104-107)
    B("c-lamb-z", "Lamb of God (Zeal)", "Investiture", "Zeal", "acolyte", "stamina+zeal", 5, 0, 104, "Takes the blow without striking or dodging; its damage before soak falls on the attacker: bashing at one or two successes, lethal at three or four, aggravated at five. Only in true battle.", N("free"), { ...CO, story: "Companion p. 104: the blow's damage before soak goes back to the attacker; the Storyteller applies it with WoDX Combat's damage window" }),
    B("c-lamb-f", "Lamb of God (Faith)", "Investiture", "Faith", "acolyte", "stamina+faith", 6, 0, 105, "Each success takes one from an attack seen coming; a point makes it reflexive.", T("ward", "Lamb of God", { turns: 1 }, "self"), CO),
    B("c-lamb-w", "Lamb of God (Wisdom)", "Investiture", "Wisdom", "acolyte", "strength+wisdom", 6, 1, 105, "The damage taken heals a fellow inquisitor as much: bashing at one success, lethal at two, any kind at three.", N("free"), { ...CO, story: "Companion p. 104: the levels taken heal another inquisitor; the Storyteller heals them on that sheet" }),
    B("c-shield-z", "Shield of God (Zeal)", "Investiture", "Zeal", "acolyte", "stamina+zeal", 7, 1, 105, "Three turns in fire, even magical fire, unburnt; a point more for each three turns after.", T("ward", "Shield of God: unburnt", { turns: 3 }, "self", { dice: 10, against: "fire" }), CO),
    B("c-shield-f", "Shield of God (Faith)", "Investiture", "Faith", "acolyte", "stamina+faith", 6, 1, 106, "Ten minutes more under water for each success, holding the breath.", N("free"), { ...CO, story: "Companion p. 105: breath held longer under water; WoDX keeps no breath count" }),
    B("c-shield-w", "Shield of God (Wisdom)", "Investiture", "Wisdom", "acolyte", "stamina+wisdom", 6, 1, 106, "Each success takes twenty feet off a fall.", N("free"), { ...CO, story: "Companion p. 105: a fall shortened; WoDX rolls no falls" }),
    B("c-rock-z", "Enduring Rock of Faith (Zeal)", "Investiture", "Zeal", "advocate", "stamina+zeal", 6, 1, 106, "Prayed before the first blow: each success lowers an attack a grade this scene (aggravated to lethal, lethal to bashing, bashing to nothing).", T("ward", "Enduring Rock of Faith", sc, "self"), CO),
    B("c-rock-f", "Enduring Rock of Faith (Faith)", "Investiture", "Faith", "advocate", "stamina+faith", 6, 1, 106, "A soak roll may be rolled again once for each success this scene, keeping the better.", N("free"), { ...CO, story: "Companion p. 106: a soak rerolled and the better kept; the soak dice are rolled again by hand" }),
    B("c-rock-w", "Enduring Rock of Faith (Wisdom)", "Investiture", "Wisdom", "advocate", "", 6, 1, 106, "Resisting thralldom is difficulty 4 for the scene.", N("free"), { ...CO, story: "Companion p. 106: resisting thralldom at 4; the resisting roll is the Storyteller's" }),
    B("c-milius-z", "Milius Dei (Zeal)", "Investiture", "Zeal", "judge", "", 6, 1, 106, "This turn a full dodge against every attack seen, even while attacking.", N("free"), { ...CO, story: "Companion p. 106: a full dodge against every attack this turn while still attacking; the defense rolls are made as usual" }),
    B("c-milius-f", "Milius Dei (Faith)", "Investiture", "Faith", "judge", "", 6, 1, 107, "Up to Faith attacks this scene heal the levels they would have taken; once a scene.", N("free"), { ...CO, story: "Companion p. 106: the attacks' levels heal instead of harm; the Storyteller heals them after each blow" }),
    B("c-milius-w", "Milius Dei (Wisdom)", "Investiture", "Wisdom", "judge", "", 6, 0, 107, "For the scene no supernatural weapon (claw, fang, enchanted blade) harms the Knight; spells and plain weapons still do.", T("ward", "Milius Dei: proof against unholy arms", sc, "self", { dice: 10, against: "supernatural" }), CO),
    // Legacies, House Murnau (pp. 107-110)
    B("c-insight-f", "Divine Insight (Faith)", "Legacy", "Faith", "acolyte", "perception+faith", 6, 1, 107, "The direction of a creature once seen, from a compass point to the place and its landmarks by successes.", N("know"), CO),
    B("c-insight-w", "Divine Insight (Wisdom)", "Legacy", "Wisdom", "acolyte", "perception+wisdom", "t", 0, 107, "A creature's desires, from what drives it to its aims; at four Wisdom joins Social rolls against it, at five one question answered. Once a day a creature.", N("know"), CO),
    B("c-insight-z", "Divine Insight (Zeal)", "Legacy", "Zeal", "acolyte", "intelligence+zeal", 6, 0, 108, "Leads toward the nearest source of a creature's power or comfort.", N("know"), CO),
    B("c-flock-f", "Surveying the Devil's Flock (Faith)", "Legacy", "Faith", "acolyte", "manipulation+faith", 6, 1, 108, "A laying on of hands: the target cannot hear, see or read a supernatural master, a day a success.", T("ward", "Deaf to the master", { days: 1 }, "one"), CO),
    B("c-flock-w", "Surveying the Devil's Flock (Wisdom)", "Legacy", "Wisdom", "acolyte", "perception+wisdom", 6, 0, 108, "Whether a mortal ever served a supernatural master; more successes tell when, how gravely, what master, how long and how they feel now.", N("know"), CO),
    B("c-flock-z", "Surveying the Devil's Flock (Zeal)", "Legacy", "Zeal", "acolyte", "charisma+zeal", 6, 1, 108, "A thrall sees the master truly: all control is broken for a day, in fury; after, remorse.", T("sway", "Woken from thralldom", { days: 1 }, "one"), CO),
    B("c-fangs-f", "Pulling the Serpent's Fangs (Faith)", "Legacy", "Faith", "advocate", "manipulation+faith", 6, 1, 109, "Every supernatural thing in sight is struck dumb, three turns a success; incantations and spoken commands fail.", T("sway", "Struck dumb", { turns: 3 }, "all"), CO),
    B("c-fangs-w", "Pulling the Serpent's Fangs (Wisdom)", "Legacy", "Wisdom", "advocate", "charisma+wisdom", 6, 0, 109, "A creature must spend a Willpower a success each time it moves against the user this scene; spent out, it seeks to make peace.", T("sway", "Loath to harm", sc, "one"), CO),
    B("c-fangs-z", "Pulling the Serpent's Fangs (Zeal)", "Legacy", "Zeal", "advocate", "manipulation+zeal", 6, 1, 109, "Only the beast is left, three turns a success: vampires and werewolves frenzy, mages sleep, the fae do strange things.", T("sway", "The beast let loose", { turns: 3 }, "one"), CO),
    B("c-fearno-f", "Fear No Evil (Faith)", "Legacy", "Faith", "judge", "charisma+faith", 7, 2, 109, "A circle five feet a success: supernatural things (ghouls too) keep out, or take three aggravated levels a turn; one caught inside must keep still.", T("ward", "Fear No Evil: the circle", sc, "self"), CO),
    B("c-fearno-w", "Fear No Evil (Wisdom)", "Legacy", "Wisdom", "judge", "charisma+wisdom", 6, 1, 109, "One creature in sight that loses Willpower at 8 treats the user as a beloved friend for the scene, and is furious after.", T("sway", "Fear No Evil: a beloved friend", sc, "one"), CO),
    B("c-fearno-z", "Fear No Evil (Zeal)", "Legacy", "Zeal", "judge", "manipulation+zeal", 6, 3, 110, "Every supernatural thing within fifty feet that rolls fewer successes on Willpower at 8 falls on the nearest other with its deadliest attack.", T("sway", "Fear No Evil: at each other's throats", sc, "all"), CO),
    // Psalms, Sisters of St. John (pp. 110-113)
    B("c-jub-f", "Jubilation (Faith)", "Psalm", "Faith", "acolyte", "", 6, 1, 110, "Each friend who sings heals a level: bashing with up to nine voices, lethal up to 29, any kind with thirty or more.", HL(1, { who: "all" }), CO),
    B("c-jub-w", "Jubilation (Wisdom)", "Psalm", "Wisdom", "acolyte", "", 6, 1, 111, "The singers sleep well and wake with one, two or three Willpower more, by voices.", PL("willpower", 1, "all", { fixed: true }), CO),
    B("c-jub-z", "Jubilation (Zeal)", "Psalm", "Zeal", "acolyte", "", 6, 1, 111, "Fiends in hearing are pained and deafened: -1 die and eight hours with up to nine voices, -2 and a day up to 29, -3 and two days past that.", T("boost", "Jubilation: the din", sc, "all", { dice: 1, sap: true, on: "all" }), CO),
    B("c-remem-f", "Remembrance Song (Faith)", "Psalm", "Faith", "acolyte", "charisma+faith", 6, 1, 111, "One listener a success: Courage -1 difficulty, emotion powers on them +1, a Conviction point for the scene (never Callous); not for the Callous.", T("fortune", "Remembrance Song", sc, "each", { shift: 1, tags: ["courage"] }), CO),
    B("c-remem-w", "Remembrance Song (Wisdom)", "Psalm", "Wisdom", "acolyte", "charisma+wisdom", 7, 1, 111, "Three turns of song: true memories in full detail, back a week to twenty years by successes; false ones are seen through.", N("know"), CO),
    B("c-remem-z", "Remembrance Song (Zeal)", "Psalm", "Zeal", "acolyte", "intelligence+zeal", 6, 1, 112, "A message of 100 words, and 20 more a success, carried word for word to its one hearer, then forgotten.", N("speak"), CO),
    B("c-sera-f", "Song of the Seraphim (Faith)", "Psalm", "Faith", "advocate", "wits+faith", 6, 1, 112, "None within ten feet can lie, even by leaving things out, three turns a success.", T("sway", "Song of the Seraphim: no lie spoken", { turns: 3 }, "all"), CO),
    B("c-sera-w", "Song of the Seraphim (Wisdom)", "Psalm", "Wisdom", "advocate", "perception+wisdom", 6, 1, 112, "Every illusion within ten feet a success falls away for good (Chimerstry, Obfuscate, glamour).", N("sense"), CO),
    B("c-sera-z", "Song of the Seraphim (Zeal)", "Psalm", "Zeal", "advocate", "charisma+zeal", 6, 2, 112, "A fiend or Callous inquisitor loses a Willpower a success; at none it gives up the fight, or the lie.", PL("willpower", 1, "one", { drain: true }), CO),
    B("c-vox-f", "Vox Dei (Faith)", "Psalm", "Faith", "judge", "charisma+faith", 6, 2, 112, "All in hearing with Willpower under the user's Willpower plus successes run to confess every dealing with the Devil's creatures (ghouls and the blood-bound too).", T("sway", "Vox Dei: confession", sc, "all"), CO),
    B("c-vox-w", "Vox Dei (Wisdom)", "Psalm", "Wisdom", "judge", "perception+wisdom", 6, 2, 112, "Touching a creature, sings its true thoughts, a concept a turn for two turns a success (8 if it knows no human tongue).", N("know"), CO),
    B("c-vox-z", "Vox Dei (Zeal)", "Psalm", "Zeal", "judge", "charisma+zeal", 7, 2, 113, "Dies Irae: every lair in hearing is destroyed, slowly at one success, at once at five; at two or more it is Holy Ground for a week. An unsoakable bashing level to the singer per success.", T("place", "Holy Ground after Dies Irae", { ladder: [["one week", WEEK]] }, "self"), CO),
    // Holy Art: Corpus Lux, Charisma + path (pp. 114-115)
    B("cl1", "Rebuking the Sight of the Tainted", "Holy Art", "Corpus Lux 1", "", "perception+path", 6, 0, 114, "In a mirror or still water, anything not wholly human casts no reflection; a failure, not again on them for a day.", N("sense"), CO),
    B("cl2", "Protection of the Holy Cross", "Holy Art", "Corpus Lux 2", "", "charisma+path", "t", 0, 114, "A cross held up drives the target back steps equal to successes plus Faith while the user holds; a point holds it where it is on a failure; Willpower ignores it a turn.", T("fear", "Held back by the Cross", sc, "one"), CO),
    B("cl3", "Empower the Instrument of Faith", "Holy Art", "Corpus Lux 3", "", "charisma+path", 6, 0, 114, "A blessed thing (a Bible, a rosary, a wafer) strikes for an aggravated level, a turn a success; a point adds a level.", T("imbue", "Instrument of Faith", { turns: 1 }, "self"), CO),
    B("cl4", "Blessed Litany", "Holy Art", "Corpus Lux 4", "", "charisma+path", 7, 1, 115, "Within five feet a Piety dot, fiends flee for successes plus Faith turns; one cornered takes lethal dice equal to the successes each turn. Once a scene.", T("fear", "Blessed Litany", { turns: 1 }, "all"), CO),
    B("cl5", "Radiant Presence of the Lord", "Holy Art", "Corpus Lux 5", "", "charisma+path", 8, 2, 115, "Golden light, a turn a success: darkness and illusions fail, hidden forms show, and vampires burn as in sunlight of the user's Piety. A botch risks a Curse.", H("harm", 1, "aggravated", { who: "all", ask: true }), CO),
    // Ritae (pp. 115-118)
    B("rc-clarity", "Prayer for Clarity", "Holy Art", "Ritus 1", "", "intelligence+path", 5, 0, 116, "Twenty minutes of prayer: the successes add to remembering the last day.", N("know"), CO),
    B("rc-rest", "Blessing of Eternal Rest", "Holy Art", "Ritus 1", "", "intelligence+path", 6, 1, 116, "A body dead under three days, sprinkled and prayed over: powers on the corpse or its soul are harder by the successes (10 at most).", T("ward", "Blessing of Eternal Rest", { ladder: FOREVER }, "one"), CO),
    B("rc-homestead", "Sanctification of the Homestead", "Holy Art", "Ritus 2", "", "intelligence+path", 7, 0, 116, "An hour with holy water and frankincense: no demon or inhuman thing enters uninvited, a day a success. A botch: not again on that house for three days.", T("place", "A sanctified homestead", { days: 1 }, "self"), CO),
    B("rc-way", "Finding the Way Through the Word", "Holy Art", "Ritus 2", "", "intelligence+path", 8, 0, 116, "On Holy Ground, an hour with the Bible (a die an hour more): a yes or no on God's will for each success. Once a story.", N("know"), CO),
    B("rc-veiled", "Veiled Presence of the Holy", "Holy Art", "Ritus 3", "", "intelligence+path", 7, 0, 117, "Anointed and silent: seeing the user as more than a plain mortal is harder by the successes, an hour a success (a point an hour more).", T("veil", "Veiled Presence of the Holy", { ladder: hours(5) }, "self"), CO),
    B("rc-abel", "Tears of the Weeping Heart of Abel", "Holy Art", "Ritus 3", "", "intelligence+path", 7, 1, 117, "Blessed water made fierce, a point a vial: each vial strikes a supernatural thing for an aggravated level.", T("make", "Tears of Abel", { ladder: FOREVER }, "self"), CO),
    B("rc-vestments", "Donning the Vestments of Sacred Resilience", "Holy Art", "Ritus 4", "", "intelligence+path", 7, 0, 117, "A soaked vestment, two hours' prayer on Holy Ground: two levels of a supernatural thing's damage soaked a success, an hour a success.", T("ward", "Vestments of Sacred Resilience", { ladder: hours(5) }, "self"), CO),
    B("rc-sacrifice", "Investment of the Lasting Sacrifice", "Holy Art", "Ritus 5", "", "intelligence+path", 8, 6, 117, "Three days' fast and two points a day on Holy Ground: a crucifix fiends cannot come within five feet of, or strike its bearer, without Willpower (a one-dot Holy Relic).", T("make", "A crucifix of the Lasting Sacrifice", { ladder: FOREVER }, "self"), CO)
];

export const BLESSINGS = [...CORE, ...COMPANION];
const BY_ID = new Map(BLESSINGS.map(b => [b.id, b]));
export const blessingById = id => BY_ID.get(id) ?? null;
export const blessingByName = name => { const k = String(name ?? "").trim().toLowerCase(); return k ? BLESSINGS.find(b => b.name.toLowerCase() === k || b.name.toLowerCase().replace(/ \(.*\)$/, "") === k) ?? null : null; };

/** Faith, Wisdom or Zeal for the roll's Superior Virtue, "virtue" for a basic Virtue, an Ability, or "path". */
export function rollParts(b) {
    const [a, t = ""] = String(b?.roll ?? "").split("+");
    const sv = ["faith", "wisdom", "zeal"].includes(t) ? t : t === "path" ? "path" : t ? "virtue" : "";
    return { attr: a || "", trait: t, sv };
}

/** What the Blessing does with its successes: [{key, who, out}] for EF.planOf. conv: Conviction gained (handled by the caller). */
export function blessingResults(id, successes, { source = "" } = {}) {
    const b = typeof id === "object" ? id : blessingById(id);
    if (!b?.spec) return [];
    const s = b.roll ? Number(successes) || 0 : Math.max(1, Number(successes) || 0);
    if (s < 1) return [];
    const base = { key: b.spec.kw, label: b.name, source: source || refOf(b) };
    if (b.spec.kind === "pool") {
        const pts = b.spec.fixed ? b.spec.per : b.spec.per * s;
        return [{ key: "charge", who: b.spec.who, out: { ...base, kind: "pool", pool: b.spec.pool, points: b.spec.drain ? -pts : pts, text: `${pts} ${b.spec.pool} ${b.spec.drain ? "drawn out" : "given"}: ${b.fx}` } }];
    }
    if (b.spec.kind === "conv") return [{ key: "charge", who: "self", conv: s, out: { ...base, kind: "note", text: `${s} Conviction: ${b.fx}` } }];
    return outcomesOf(b.spec, base, s, b.fx);
}

/** Conviction the user regains from a Blessing's successes, capped. */
export function convictionGain(b, successes, caps = {}) {
    const s = Math.max(0, Number(successes) || 0);
    const cap = b?.spec?.kind === "conv" ? b.spec.cap : b?.alsoConv;
    if (!cap || s < 1) return 0;
    return Math.min(s, Number(caps[cap]) || s);
}
