/**
 * WoDX NPC (Dark Ages depth desk item 3, part 2, B7649): a Road's followers in a town, as a small Kindred faction.
 * The pure part; factions.mjs gathers them from the scene and writes the faction.
 *
 * Book basis (V20 Dark Ages, each Road's Organization; WoDX's own words):
 *   Beast (p. 116): nothing above the Apostate; at most a pack held together by challenges for the lead.
 *   Heaven (p. 119): congregations by faith (Christian, Jewish, Muslim), the Christian ones split by doctrine; some
 *     keep their faith in secret places.
 *   Humanity (p. 122): rarely, a small following draws round a Prodigal who has held on through much.
 *   Kings (p. 125): a chain of oaths, vassal to lord; the highest Luminary is the Lord, most often the prince.
 *   Lilith (p. 129): cults that form, break and form again; an elder may be called mother or father.
 *   Metamorphosis (p. 133): no order; gatherings in a Black Church.
 *   Sin (p. 134): praeceptors gather students and cults; at Saturnalia the foremost is the Lord of Misrule.
 *   Bones (p. 140): networks of scholars round monasteries and places of learning.
 *   Yasa (p. 141): no order but the Mongol families; Bloodbrothers keep near each other.
 * Appendix B Roads (B7669):
 *   Blood (p. 432): Sentinels keep to themselves; what order there is runs mentor to student.
 *   Paradox (p. 445): hardly any order; when Asura meet they trade stories of their svadharma for a night.
 *   Abyss (pp. 441-442), Samiel (pp. 447-448), Set (p. 449): the book gives no Organization; WoDX readings: the
 *     mystics' brethren, a warrior band of the Salubri, a temple of Set's faithful under its priest.
 * WoDX readings (B7649): the group is a secret Kindred faction holding the scene it was gathered in, run on the
 * Storyteller's orders so it makes no moves by itself; its head is the member highest on the Road (for the Beast, the
 * one who holds the lead for now); a Road with no order gathers only when two or more of its walkers share the place.
 */

/** What a Road's local group is called, its head's title, how it holds together, and where it meets. */
export const FLOCKS = {
    beast: { flock: "Apostates", group: "pack", head: "the one who holds the lead for now", structure: "pack", meets: "the hunt", p: 116 },
    heaven: { flock: "Faithful", group: "congregation", head: "the eldest of the faith", structure: "faith", meets: "worship, in a chapel or a secret place", p: 119 },
    humanity: { flock: "Prodigals", group: "following", head: "the one they look to", structure: "cult", meets: "quiet charity and fasting", p: 122 },
    kings: { flock: "Luminaries", group: "court of oaths", head: "Lord", structure: "chain", meets: "the swearing of oaths", p: 125 },
    lilith: { flock: "Bahari", group: "cult", head: "mother or father", structure: "cult", meets: "planting and harvest", p: 129 },
    metamorphosis: { flock: "Seekers", group: "Black Church", head: "none", structure: "none", meets: "a Black Church, to show what has been made", p: 133 },
    sin: { flock: "Sinners", group: "school", head: "praeceptor", structure: "cult", meets: "lessons, and Saturnalia", p: 134 },
    bones: { flock: "Gravediggers", group: "circle of scholars", head: "the most learned", structure: "network", meets: "a monastery or a place of learning", p: 140 },
    yasa: { flock: "Bloodbrothers", group: "band", head: "the eldest of the family", structure: "family", meets: "the family's camp", p: 141 },
    blood: { flock: "Sentinels", group: "watch", head: "none", structure: "none", meets: "a mentor's teaching", p: 432 },
    paradox: { flock: "Asura", group: "gathering", head: "none", structure: "none", meets: "a night of stories of success and failure", p: 445 },
    abyss: { flock: "Abyss Mystics", group: "brethren", head: "the deepest in the dark", structure: "cult", meets: "study of the darkness", p: 441 },
    samiel: { flock: "Warriors of Samiel", group: "warrior band", head: "the eldest warrior", structure: "network", meets: "the hunt for evil", p: 447 },
    night: { flock: "Redeemers", group: "parish", head: "the Father or Mother above", structure: "hierarchy", meets: "a fierce sermon", p: 29, book: "Dark Ages Storytellers Companion (2002)" },
    set: { flock: "Followers of Set", group: "temple", head: "the high priest", structure: "faith", meets: "the temple's rites", p: 449 }
};

const slug = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "here";

/** The faction id for a Road's group in a place (one per Road and place). */
export const flockId = (road, placeKey) => `road-${road}-${slug(placeKey)}`;

/** How many walkers it takes: two for every Road (a group of one is a hermit). */
export const FLOCK_MIN = 2;

/**
 * The faction for a Road's walkers in a place, or null when there are too few.
 *   road: the Road's key; place: {uuid, name}; walkers: [{id, name, rating}]; roadName: the Road's own name.
 */
export function flockSpec({ road, roadName = "", place, walkers = [] }) {
    const F = FLOCKS[road];
    if ( !F || !place?.uuid ) return null;
    const list = [...new Map(walkers.filter(w => w?.id).map(w => [w.id, w])).values()].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0) || String(a.name).localeCompare(String(b.name)));
    if ( list.length < FLOCK_MIN ) return null;
    const head = F.structure === "none" ? null : list[0];
    const name = `The ${F.flock} of ${place.name}`;
    const notes = `${roadName || road}: a ${F.group}${head ? `, its head ${F.head === "Lord" ? "the Lord" : F.head}: ${head.name}` : ", with no head"}. They meet at ${F.meets} (${F.book ?? "V20 Dark Ages"} p. ${F.p}). Members: ${list.map(w => `${w.name} (${Number(w.rating) || 0})`).join(", ")}.`;
    return { id: flockId(road, place.uuid), name, kind: "kindred", secret: true, run: "orders", leader: head?.id ?? null, members: list.map(w => w.id), places: [place.uuid], notes, assets: { status: Math.min(5, Math.max(1, Math.round((Number(list[0].rating) || 0) / 2))) } };
}
