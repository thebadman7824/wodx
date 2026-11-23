/**
 * Rothenstein's own factions (moved out of WoDX NPC, Chronicle Packs Desk f1): the powers of the valley as the chronicle's
 * notes give them ("The Domain of Rothenstein", "Overview & Cast", "The Herd", "The Weavers' Guild Hall", "Hunter &
 * Inquisition Threats"). The dots are WoDX's estimates from those notes (B102), for the Storyteller to adjust. Members and
 * places are matched by name; anything not found is left out. Keys unchanged.
 */
export const TITLE = "Rothenstein's factions";
/** The NPC whose presence shows the chronicle's cast is in the world. */
export const MARKER = "Bogdan Ursu";
export const ASK = "Set up the valley's twelve powers from the chronicle's notes, with their leaders, members and places found by name? The dots are WoDX's estimates; change them as you like.";
export const FACTIONS = [
  {key: "court", name: "The Voivode's court", kind: "kindred", ruler: true, leader: "Bogdan Ursu", members: ["Bogdan Ursu", "Kasimir", "Ottilie the Copyist", "Sieglinde", "Zdenka"], places: [/kranzfels|keep floors|inner ward|great hall/i],
    assets: {herd: 4, status: 5, domain: 4, security: 1, retainers: 3, contacts: 1, resources: 3, influence: {crown: 2, military: 2}}, goals: [{move: "defend"}, {move: "recruit"}],
    notes: "Bogdan holds the keep and gives judgment; the Herd is thirty-one named mortals, the Voivode's to ration (Herd 4: thirty vessels). Sworn under the Charter: Kasimir in the Adit's old workings, Ottilie at Bogdan's elbow, Sieglinde as the company's rival for favour, Zdenka at the well on the green. The steward is a ghoul of a family that has served on Bogdan's blood for generations. Bogdan is the Black Hand's unknowing watchman over the thing under the hill, and is clean of it (B7803)."},
  {key: "cult", name: "Konrad's cult", kind: "kindred", leader: "Konrad", members: ["Konrad"], places: [/silver adit|konrad/i],
    assets: {herd: 1, retainers: 2, status: 1, contacts: 1, influence: {underworld: 1, guild: 1}}, goals: [{move: "recruit"}, {move: "scheme", target: "church"}],
    notes: "The Guests: the flesh-smith's believers and the changed miners, under the Adit, since 1196. Secret even from the court. Konrad and the changed miners carry the thing's parasite without knowing it. The cult grows each winter: about seven in 1200, fifteen by the second winter, thirty by the choosing if nobody stops it. Its window at the council is the auditor's clerk (B7803)."},
  {key: "marta", name: "Sister Marta's network", kind: "kindred", leader: "Marta", members: ["Marta"], places: [/marta/i],
    assets: {status: 2, contacts: 3, resources: 1, influence: {church: 2, folk: 1}}, goals: [{move: "lielow"}, {move: "expand", sphere: "church"}],
    notes: "A Lasombra in a nun's habit with the church's confidence. The Lasombra elders took Marta in after Marta drank the sire, and the price is reporting on Bogdan to them; they are far away and slow (B7803)."},
  {key: "radu", name: "Old Radu", kind: "kindred", leader: "Old Radu", members: ["Old Radu"], places: [/radu|crossroads/i],
    assets: {status: 2, contacts: 3, influence: {folk: 2}}, goals: [{move: "lielow"}],
    notes: "Passes as a Gangrel drifter; in truth a Tzimisce koldun, Embraced by force during the binding of 906. Carried the Ground and gave the Price, and the half-made seal holds only while Radu stays in the valley. Trades true lore for favours, never all of it (B7803)."},
  {key: "council", name: "The German council (the Hospites)", kind: "mortal", leader: "Graff", members: ["Graff", "Jan Dvorak", "Ludwig of Regensburg"], places: [/market square|market floors|graff/i],
    assets: {resources: 4, status: 2, retainers: 1, contacts: 2, influence: {guild: 3, crown: 1}}, goals: [{move: "expand", sphere: "guild"}],
    notes: "Six seats: the Richter, three guild masters and two Hospites elders. The council wants profit; the Adit is theirs on paper and fought over in practice. Graff keeps a second ledger, and an escape east is already arranged (B7803)."},
  {key: "church", name: "The parish of St. Aegidius", kind: "church", leader: "Ludovic", members: ["Ludovic", "Paval", "Gizela"], places: [/aegidius|church close|presbytery/i],
    assets: {status: 2, contacts: 2, resources: 1, influence: {church: 3, folk: 2}}, goals: [{move: "hunt"}],
    notes: "The church wants heresy stamped out."},
  {key: "folk", name: "The Moravian villages", kind: "folk", leader: "Yaroslava", members: ["Yaroslava", "Bohumil Krejci", "Jitka"], places: [/dolany|moravian village/i],
    assets: {contacts: 2, resources: 1, influence: {folk: 3}}, goals: [{move: "defend"}],
    notes: "The elders of the old families want to be left alone."},
  {key: "weavers", name: "The Weavers' Guild", kind: "guild", leader: "The guild warden", members: ["The guild warden", "Lenka Prochazka", "Jakub Hlavac"], places: [/craftsmen|weaver/i],
    assets: {resources: 2, contacts: 2, influence: {guild: 2}}, goals: [{move: "expand", sphere: "guild"}],
    notes: "The strongest craft guild; favours are kept on a tally and called in."},
  {key: "ondrej", name: "Ondrej's company", kind: "mercenaries", leader: "Ondrej", members: ["Ondrej"], places: [/outer bailey|barracks/i],
    assets: {retainers: 3, resources: 1, influence: {military: 2}}, goals: [{move: "recruit"}],
    notes: "A dozen spears for hire."},
  {key: "hunters", name: "The Church's hunters", kind: "hunters", leader: "Anselm", members: ["Anselm"], places: [/anselm|mountain trail|hermitage/i],
    assets: {contacts: 2, resources: 1, influence: {church: 1}}, goals: [],
    notes: "Brother Anselm keeps a count. In Lent 1202 the bishop of Olomouc sends a Cistercian preacher on the pope's mission against heresy, with Thibault de Montfaucon, a knight sworn to the bishop who fought in the Holy Land (B7803)."},
  {key: "margrave", name: "The margrave's officers", kind: "mortal", leader: "Ctibor", members: ["Ctibor"], places: [/inn/i],
    assets: {status: 3, resources: 2, retainers: 2, influence: {crown: 3}}, goals: [{move: "scheme", target: "council"}],
    notes: "The margrave's tax-reeve and six men in blue, counting the silver from the autumn of 1200: mine, smelter, mint and market have disagreed for two years. Silver not struck at the margrave's mint is a crime against the margrave; kill the reeve and a larger audit comes (B7803)."},
  {key: "grove", name: "The Grove's kin", kind: "garou", leader: null, members: [], places: [/old grove/i],
    assets: {status: 2, contacts: 1, influence: {folk: 1}}, goals: [{move: "defend"}],
    notes: "Silver Fangs of the Bohemian forests and their Kinfolk. They knew the thing under the hill as a creature of the Wyrm and helped bind it in 906. The Old Grove is their active caern, strained by three hundred years of holding the binding (B7803)."}
];
/** How each faction stands toward another: [from, to, standing]. */
export const STANDING = [["court", "church", -2], ["church", "court", -1], ["court", "council", -1], ["council", "court", -1], ["council", "folk", -1], ["folk", "council", -1],
  ["court", "cult", 1], ["cult", "court", 1], ["cult", "church", -2], ["marta", "court", -1], ["radu", "court", -1], ["folk", "court", -1], ["weavers", "council", 1],
  ["council", "weavers", 1], ["ondrej", "court", 1], ["court", "ondrej", 1], ["hunters", "court", -1], ["church", "hunters", 1], ["hunters", "church", 1],
  ["margrave", "council", -1], ["council", "margrave", -1], ["grove", "folk", 1], ["folk", "grove", 1], ["grove", "cult", -2], ["grove", "court", -1]];
