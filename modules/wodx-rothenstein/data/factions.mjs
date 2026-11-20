/**
 * Rothenstein's own factions (moved out of WoDX NPC, Chronicle Packs Desk f1): the powers of the valley as the chronicle's
 * notes give them ("The Domain of Rothenstein", "Overview & Cast", "The Herd", "The Weavers' Guild Hall", "Hunter &
 * Inquisition Threats"). The dots are WoDX's estimates from those notes (B102), for the Storyteller to adjust. Members and
 * places are matched by name; anything not found is left out. Keys unchanged.
 */
export const TITLE = "Rothenstein's factions";
/** The NPC whose presence shows the chronicle's cast is in the world. */
export const MARKER = "Bogdan Ursu";
export const ASK = "Set up the valley's ten powers from the chronicle's notes, with their leaders, members and places found by name? The dots are WoDX's estimates; change them as you like.";
export const FACTIONS = [
  {key: "court", name: "The Voivode's court", kind: "kindred", ruler: true, leader: "Bogdan Ursu", members: ["Bogdan Ursu"], places: [/kranzfels|keep floors|inner ward|great hall/i],
    assets: {herd: 4, status: 5, domain: 4, security: 1, retainers: 3, contacts: 1, resources: 3, influence: {crown: 2, military: 2}}, goals: [{move: "defend"}, {move: "recruit"}],
    notes: "Bogdan holds the keep and gives judgment; the Herd is thirty-one named mortals, the Voivode's to ration (Herd 4: thirty vessels)."},
  {key: "cult", name: "Konrad's cult", kind: "kindred", leader: "Konrad", members: ["Konrad", "Kasimir"], places: [/silver adit|konrad/i],
    assets: {herd: 1, retainers: 2, status: 1, contacts: 1, influence: {underworld: 1, guild: 1}}, goals: [{move: "recruit"}, {move: "scheme", target: "church"}],
    notes: "The flesh-smith's believers and the changed miners, under the Adit. Secret even from the court."},
  {key: "marta", name: "Sister Marta's network", kind: "kindred", leader: "Marta", members: ["Marta"], places: [/marta/i],
    assets: {status: 2, contacts: 3, resources: 1, influence: {church: 2, folk: 1}}, goals: [{move: "lielow"}, {move: "expand", sphere: "church"}],
    notes: "A Lasombra in a nun's habit with the church's confidence; help from outside the valley."},
  {key: "radu", name: "Old Radu", kind: "kindred", leader: "Old Radu", members: ["Old Radu"], places: [/radu|crossroads/i],
    assets: {status: 2, contacts: 3, influence: {folk: 2}}, goals: [{move: "lielow"}],
    notes: "A drifter who has watched the valley since before the town had a name."},
  {key: "council", name: "The German council (the Hospites)", kind: "mortal", leader: "Graff", members: ["Graff", "Jan Dvorak", "Ludwig of Regensburg"], places: [/market square|market floors|graff/i],
    assets: {resources: 4, status: 2, retainers: 1, contacts: 2, influence: {guild: 3, crown: 1}}, goals: [{move: "expand", sphere: "guild"}],
    notes: "The council wants profit; the Adit is theirs on paper and fought over in practice."},
  {key: "church", name: "The parish of St. Aegidius", kind: "church", leader: "Ludovic", members: ["Ludovic", "Paval", "Gizela"], places: [/aegidius|church close|presbytery/i],
    assets: {status: 2, contacts: 2, resources: 1, influence: {church: 3, folk: 2}}, goals: [{move: "hunt"}],
    notes: "The church wants heresy stamped out."},
  {key: "folk", name: "The Moravian villages", kind: "folk", leader: "Yaroslava", members: ["Yaroslava", "Bohumil Krejci", "Jitka"], places: [/dolany|moravian village/i],
    assets: {contacts: 2, resources: 1, influence: {folk: 3}}, goals: [{move: "defend"}],
    notes: "The elders of the old families want to be left alone."},
  {key: "weavers", name: "The Weavers' Guild", kind: "guild", leader: "Lenka Prochazka", members: ["Lenka Prochazka", "Jakub Hlavac"], places: [/craftsmen|weaver/i],
    assets: {resources: 2, contacts: 2, influence: {guild: 2}}, goals: [{move: "expand", sphere: "guild"}],
    notes: "The strongest craft guild; favours are kept on a tally and called in."},
  {key: "ondrej", name: "Ondrej's company", kind: "mercenaries", leader: "Ondrej", members: ["Ondrej"], places: [/outer bailey|barracks/i],
    assets: {retainers: 3, resources: 1, influence: {military: 2}}, goals: [{move: "recruit"}],
    notes: "A dozen spears for hire."},
  {key: "hunters", name: "The Church's hunters", kind: "hunters", leader: "Anselm", members: ["Anselm"], places: [/anselm|mountain trail|hermitage/i],
    assets: {contacts: 2, resources: 1, influence: {church: 1}}, goals: [],
    notes: "Brother Anselm keeps a count; the friar, the exorcist and the knight-inquisitor come when the net opens (Act Three)."}
];
/** How each faction stands toward another: [from, to, standing]. */
export const STANDING = [["court", "church", -2], ["church", "court", -1], ["court", "council", -1], ["council", "court", -1], ["council", "folk", -1], ["folk", "council", -1],
  ["court", "cult", 1], ["cult", "court", 1], ["cult", "church", -2], ["marta", "court", -1], ["radu", "court", -1], ["folk", "court", -1], ["weavers", "council", 1],
  ["council", "weavers", 1], ["ondrej", "court", 1], ["court", "ondrej", 1], ["hunters", "court", -1], ["church", "hunters", 1], ["hunters", "church", 1]];
