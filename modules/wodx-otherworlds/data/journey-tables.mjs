/**
 * Otherworld journeys: landmarks and hazards for the Tempest, the Labyrinth and the Umbral roads, and the Maelstrom's
 * events. Drafted once for the Storyteller to read and edit; they install as Roll Tables in "WoDX tables".
 * Each line is a prompt for the Storyteller, not a rule.
 */
const T = (id, name, lines) => ({id, name, results: lines.map(l => (Array.isArray(l) ? {text: l[0], weight: l[1]} : {text: l, weight: 1}))});

export const JOURNEY_TABLES = [
  T("journey.tempest.landmark", "Tempest: landmarks", [
    "A Byway's marker stone, carved with Hierarchy sigils half worn away.",
    "The wreck of a Ferryman's barge, its lantern still burning.",
    "A Nihil yawns beside the road, and the wind pours into it.",
    "An island of calm where a lost Necropolis's bell tower stands in the storm.",
    "A bridge of soulforged chain across a chasm of grey nothing.",
    "A wayhouse of the Guilds, shuttered, a sign creaking above the door.",
    "A column of the drowned dead walking the other way, heads bowed.",
    "The storm thins and shows the Shadowlands of a city far from here.",
    "A Hierarchy waystation flying the Deathlord's colours.",
    "Ruins of a Renegade camp, chains broken on the ground."
  ]),
  T("journey.tempest.hazard", "Tempest: hazards", [
    "A squall of Oblivion: everyone resists or loses a level of Corpus to the wind.",
    "Spectres follow the travellers' trail, hanging back, waiting for a straggler.",
    "The Byway frays; a wrong step and someone is torn away into the storm.",
    "Barghests on the hunt, baying for soul-stuff.",
    "A Shadow speaks up in each traveller at once, all urging the same turn off the road.",
    "Slavers of the Hierarchy or of the Dark Kingdoms take an interest.",
    "A Doppelganger walks among the travellers, wearing a friend's face.",
    "The way ahead is a Labyrinth mouth, and the storm pushes everyone toward it."
  ]),
  T("journey.labyrinth.landmark", "Labyrinth: landmarks", [
    "A stair spiralling down forever, each step carved with a name.",
    "A Malfean's throne, empty, still warm.",
    "A cathedral of bone where Spectres sing the praises of Oblivion.",
    "A pit where the Shadows of the dead are gathered and tended like a crop.",
    "A gate of black iron, guarded by something that remembers being a soldier.",
    "A pool that reflects the traveller's own Shadow, smiling."
  ]),
  T("journey.labyrinth.hazard", "Labyrinth: hazards", [
    "A Nephwrack and its circle, who want the travellers for their choir.",
    "The walls close in, and the way back is gone.",
    "A Shadow-eater in the dark, drawn by Angst.",
    "Spectral hounds pick up the scent.",
    "The air itself whispers to each Shadow: Angst rises for everyone.",
    "A chasm of pure Oblivion where the road should be."
  ]),
  T("journey.umbra.landmark", "Umbral roads: landmarks", [
    "A Moon Path's silver light runs ahead, steady and bright.",
    "A Glade spirit's grove where travellers may rest unharmed.",
    "The edge of the Aetherial Realm, stars close enough to touch.",
    "A Pangaean forest, huge and green, older than any city.",
    "The border of a Weaver city, its streets crystal webs.",
    "An Arcadia Gateway shimmering at the edge of the road.",
    "A Lune herd grazing on moonlight beside the path.",
    "A caern's moon bridge arching overhead toward somewhere far.",
    "The Battleground, distant cannon echoing over endless trenches.",
    "A Totem's messenger waits on a rock, watching."
  ]),
  T("journey.umbra.hazard", "Umbral roads: hazards", [
    "Banes lie in wait where the path crosses a Wyrm-tainted Realm.",
    "A Weaver spider spins over the path: the way is webbed shut.",
    "An Umbral storm: Gnosis rolls are harder until it passes.",
    "The Moon Path fades and the travellers are adrift in the Near Umbra.",
    "A territorial spirit demands a chiminage to pass.",
    "A Hellhole's stink and the Banes that guard it.",
    "A Paradox spirit is hunting a mage, and does not care who stands near.",
    "The road crosses into the Atrocity Realm for a heartbeat: everyone rolls Willpower or freezes."
  ]),
  T("journey.maelstrom", "Maelstrom events", [
    "The storm rises to a scream: everyone in the open takes the Maelstrom's damage until they find shelter.",
    "A wall of Spectres rides the storm's front, sweeping up everything before it.",
    "The Byway collapses behind the travellers; there is no way back for now.",
    "A Necropolis's lights wink out one by one across the Shadowlands.",
    "Souls by the hundred are torn from the Shadowlands and flung past, screaming."
  ])
];
