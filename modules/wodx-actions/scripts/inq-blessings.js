/**
 * WoDX Actions: the inquisitors' Blessings one by one (Dark Ages: Inquisitor, Chapter Five), as short summaries in our
 * own words with the printed page. Each: id, name, kind (an ENDOWMENT_KINDS entry), use (Faith, Wisdom or Zeal, or a
 * path or ritus level), stage (acolyte, advocate, judge, or "" for none), roll ("attribute+trait", "" for no roll; the
 * trait is faith, wisdom, zeal, conscience, selfcontrol, courage, path or an Ability), difficulty (a number, "t" for the
 * target's Willpower or an opposed roll, "piety" for the user's Piety, "var" where the Storyteller sets it), Conviction
 * cost, the effect, and an effects-card spec (mage-da-effects.js helpers, plus PL for a pool and CV for Conviction).
 * The Superior Virtues themselves roll in the Virtue roll window. Pure: no Foundry calls.
 */
import { H, T, C, N, HL, outcomesOf } from "./mage-da-effects.js";

export const REF = "Dark Ages: Inquisitor";
/** A pool moved: points per success (or fixed), on whom; drain takes it away. */
export const PL = (pool, per, who = "one", o = {}) => ({ kw: "charge", kind: "pool", pool, per, who, fixed: !!o.fixed, drain: !!o.drain });
/** Conviction regained by the user: one per success, up to the cap ("piety" or a trait name). */
export const CV = (cap = "piety") => ({ kw: "charge", kind: "conv", cap, who: "self" });

const B = (id, name, kind, use, stage, roll, diff, cost, p, fx, spec, o = {}) => ({ id, name, kind, use, stage, roll, diff, cost, p, fx, spec, ...o });
const sc = "scene";

export const BLESSINGS = [
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
    B("cat-w", "Catechumen (Wisdom)", "Investiture", "Wisdom", "acolyte", "", 6, 1, 180, "Once a story, with a Willpower point too: a botched Virtue roll is undone.", N("free"), { wp: 1 }),
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
    B("auto-f", "Auto da Fe (Faith)", "Investiture", "Faith", "judge", "charisma+faith", "var", 3, 182, "A miracle of help, as the Storyteller decides (difficulty 10 less the points, 4 at best); the user can do nothing else this scene.", N("free")),
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
    B("ws-z", "Wreathed in Shadows (Zeal)", "Legacy", "Zeal", "advocate", "", 6, 0, 184, "Praying with a Flock gives its rating in Conviction on top of the roll; the Flock is spent for the day.", N("free")),
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
    const base = { key: b.spec.kw, label: b.name, source: source || `${REF} p. ${b.p}` };
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
