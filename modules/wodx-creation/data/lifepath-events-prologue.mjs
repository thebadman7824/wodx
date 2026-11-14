/**
 * Display-only desk t7 (B3180): dated marks before 1197 for elders, drawn from the prologue timeline Ben approved
 * (docs/research/era-timelines/r3/living-gods.txt and classical.txt). Same shape as the marks of
 * lifepath-local-events.mjs: [label, gives, spans [[from, to]], tone "+", "-" or "0", person "role|note" or null].
 * They are added to each region's marks, so an elder's own life and the ages after the change both draw them.
 * All text is WoDX's own.
 */
export const EVENTS_PROLOGUE = {
"moravia": [
  ["Paid tribute to the Avar riders every harvest","ab Survival|flaw Enemy",[[568,796]],"-",null],
  ["Rode with Samo against the Avars","ab Ride|ab Melee|bg Allies",[[623,658]],"+","a Frankish trader|who became your king"],
  ["Built the walls of a Moravian stronghold","ab Crafts|bg Status",[[833,906]],"+",null],
  ["Heard the brothers from Thessaloniki preach in your own tongue","ab Academics|merit Language",[[863,885]],"+","a disciple of Methodius|who taught you letters"],
  ["Fled when the Magyars broke the Moravian realm","flaw Nightmares|ab Survival",[[899,907]],"-",null],
  ["Served at the Premyslid court in Prague","ab Etiquette|ab Politics|bg Contacts",[[880,1196]],"0","a castellan|who owes you a favour"],
  ["Carried slaves and furs down the Amber Road","ab Finance|flaw Dark Secret",[[700,1100]],"0",null]],
"italy": [
  ["Marched with a legion against Carthage","ab Melee|ab Leadership",[[-264,-146]],"+","a centurion|who saved your life"],
  ["Lost land to the senators' estates","note In debt|flaw Enemy",[[-200,-50]],"-",null],
  ["Picked a side in the civil wars and lived","ab Politics|ab Subterfuge",[[-88,-30]],"0",null],
  ["Kept accounts for a great house in Rome","ab Finance|bg Contacts",[[-27,400]],"+","a freed slave|who knows the books as well as you"],
  ["Watched Rome sacked from the walls","flaw Nightmares|ab Awareness",[[410,410],[455,455]],"-",null],
  ["Lived under the Lombard dukes","ab Survival|merit Language",[[568,774]],"0",null]],
"aegean": [
  ["Ran at the games at Olympia","ab Athletics|bg Status",[[-776,393]],"+",null],
  ["Rowed in a trireme at Salamis","ab Athletics|ab Melee",[[-480,-480]],"+","an oarsman|from the next bench"],
  ["Sat through the plague in besieged Athens","flaw Nightmares|ab Medicine",[[-430,-426]],"-",null],
  ["Argued in the agora with the philosophers","ab Academics|ab Expression",[[-470,-322]],"+","a philosopher|who still writes to you"],
  ["Lived in the Greek city as Rome took it","ab Politics|merit Language",[[-200,-146]],"0",null],
  ["Prayed in Constantinople under the great dome","ab Occult|ab Etiquette",[[537,1196]],"0",null]],
"egypt": [
  ["Hauled stone for a king's tomb","ab Athletics|ab Crafts",[[-2600,-1500]],"0",null],
  ["Served a temple of the old gods","ab Occult|bg Status",[[-3000,391]],"+","a priest|who taught you the rites"],
  ["Starved in a year the river failed","flaw Nightmares|ab Survival",[[-2200,-2100],[1064,1072]],"-",null],
  ["Copied scrolls in the Library of Alexandria","ab Academics|merit Language",[[-283,272]],"+","a scholar|who smuggled one book out"],
  ["Saw the Arab army reach the Nile","ab Politics|merit Language",[[639,642]],"0",null]],
"levant": [
  ["Traded purple cloth from a Phoenician port","ab Finance|bg Contacts",[[-1200,-332]],"+",null],
  ["Was carried off when Assyria emptied the land","flaw Nightmares|merit Language",[[-722,-701]],"-",null],
  ["Went into exile when Jerusalem fell","flaw Enemy|ab Survival",[[-587,-538],[70,73]],"-",null],
  ["Walked the road to Jerusalem with the pilgrims","ab Occult|bg Allies",[[-950,1196]],"0","a fellow pilgrim|who went on to the city"]],
"persia": [
  ["Served the Great King's road","ab Ride|bg Contacts",[[-550,-330]],"+",null],
  ["Fled when Alexander burned Persepolis","flaw Nightmares|ab Survival",[[-330,-330]],"-",null],
  ["Kept a fire temple of the old faith","ab Occult|bg Status",[[-500,651]],"0",null],
  ["Learned the new faith after the conquest","ab Academics|merit Language",[[633,900]],"0",null]],
"china": [
  ["Fought in the wars of the warring states","ab Melee|flaw Enemy",[[-475,-221]],"-",null],
  ["Built the long wall under the first emperor","ab Crafts|flaw Nightmares",[[-221,-206]],"-",null],
  ["Passed the examinations for an office","ab Academics|bg Status",[[605,1196]],"+","an examiner|who marked you high"],
  ["Traded silk west along the caravan roads","ab Finance|merit Language",[[-130,1196]],"+",null]],
"india": [
  ["Heard a wandering teacher speak of release","ab Occult|merit Iron Will",[[-563,-400]],"+",null],
  ["Served in the Mauryan army","ab Melee|ab Leadership",[[-322,-185]],"0",null],
  ["Studied at Nalanda","ab Academics|ab Medicine",[[427,1196]],"+","a teacher|from the great monastery"]],
"british-isles": [
  ["Watched the legions land","ab Survival|flaw Enemy",[[43,61]],"-",null],
  ["Burned a Roman town with the queen of the Iceni","ab Melee|flaw Vengeful",[[60,61]],"-",null],
  ["Kept a villa when the legions had gone","bg Resources|flaw Enemy",[[410,500]],"0",null],
  ["Hid from the longships","flaw Nightmares|ab Stealth",[[793,1066]],"-",null]],
"france": [
  ["Fought Caesar's legions in Gaul","ab Melee|flaw Enemy",[[-58,-50]],"-",null],
  ["Served at the court of the Frankish kings","ab Etiquette|bg Contacts",[[481,987]],"+",null],
  ["Took a tonsure in a Carolingian abbey","ab Academics|ab Occult",[[768,900]],"0","an abbot|who keeps your secret"]],
"german-lands": [
  ["Stood in the forest when the legions were lost","ab Survival|ab Melee",[[9,9]],"+",null],
  ["Crossed the frozen Rhine with the tribes","ab Survival|flaw Enemy",[[406,407]],"0",null],
  ["Was baptised at the sword's point","flaw Dark Secret|ab Subterfuge",[[772,804]],"-",null]],
"scandinavia": [
  ["Rowed west on a raiding ship","ab Melee|bg Resources",[[793,1066]],"+","a shipmate|who kept your share"],
  ["Traded down the rivers to Miklagard","ab Finance|merit Language",[[800,1100]],"+",null]],
"carpathians-balkans": [
  ["Fought with the Dacian king against Rome","ab Melee|flaw Enemy",[[101,106]],"-",null],
  ["Lived through the Hun years","flaw Nightmares|ab Survival",[[370,453]],"-",null]],
"maghreb": [
  ["Grew up in Carthage at the height of its fleets","ab Finance|bg Contacts",[[-600,-146]],"+",null],
  ["Saw Carthage burn","flaw Nightmares|flaw Vengeful",[[-146,-146]],"-",null]],
"japan": [
  ["Served at the Nara court","ab Etiquette|ab Academics",[[710,794]],"+",null],
  ["Came of age in the Heian capital","ab Etiquette|ab Expression",[[794,1185]],"0",null]],
"mexico": [
  ["Lived in the great city of the pyramids","ab Crafts|ab Occult",[[100,550]],"0",null]],
"andes": [
  ["Worked the terraces for the highland lords","ab Survival|ab Crafts",[[600,1000]],"0",null]]
};
