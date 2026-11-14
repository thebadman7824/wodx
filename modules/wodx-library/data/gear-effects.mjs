/**
 * WoDX Library 0.43.0 (B3795 to B3797): what the cyberware, bioware and exoskeletons do once they are in a body.
 *
 * World of Future Darkness gives most of its own pieces WoD figures; the Cyberpunk 2020 pieces come with only a
 * surgery code and a Humanity cost. The Future Darkness article's conversion notes (Cyberpunk's body boosts count half,
 * reflex boosters act as Celerity, Humanity cost comes off a Humanity Index of ten times the dots) set the scale, and
 * the rest is a house reading in the same spirit: one die or one point of difficulty for a sense or a link, the book's
 * own figure where there is one.
 *
 * bonus: [type, setting, value] rows for the system's own bonus list, on while the piece is installed (equipped):
 *   attr  Attribute rating (attribute_buff)            fixed  Attribute set to a rating (attribute_fixed_value)
 *   dice  dice on rolls of that Attribute              ab     dice on rolls of that Ability (ability_buff)
 *   abd   difficulty on rolls of that Ability          atk    attack dice with "Melee Weapon" or "Ranged Weapon"
 *   atkd  attack difficulty with that weapon type      soak   soak dice ("all", "bashing", "lethal", "aggravated")
 *   init  initiative
 * senses: what WoDX Senses reads: dark (no darkness step for sight, with its name), mods [n, senses] (n steps easier).
 * body: what WoDX Combat reads: ease (wound penalty eased by that much), potence (dice added to unarmed damage).
 * limb: a cyber limb's own soak dice, for blows aimed at that limb.
 * weapon: the piece is a weapon: {type: "Melee Weapon" | "Ranged Weapon", dmg, kind, diff, ability, range, rate, clip, attribute}.
 * story: what the Storyteller rules, shown on the piece and in the install card, where no roll can carry it.
 * humanityLess: dice of Humanity cost the piece takes back (RealSkinn hides the chrome).
 *
 * Every piece also costs Humanity when it goes in (scripts/gear-rules.mjs: humanityCost, dotsLost).
 */

const ab = (k, n = 1) => ["ab", k, n];
const sense = (n, ...senses) => ({mods: [[n, senses]]});

/** By name: the pieces of World of Future Darkness and Cyberpunk 2020 (both books' cyber items only). */
export const GEAR_FX = {
  // World of Future Darkness, pdf 9 to 11 (its own WoD figures)
  "Smartgun Link": {bonus: [["atkd", "Ranged Weapon", -2]], story: "Only with a smartgun wired to it."},
  "Targeting Scope": {bonus: [["atkd", "Ranged Weapon", -1]], story: "Only with a smartgun and a Smartgun Link."},
  Kerenzikov: {bonus: [["attr", "dexterity", 1], ["init", "", 2]]},
  Speedware: {bonus: [["init", "", 3]], story: "Switched on, +2 Dexterity for five turns; then it needs a rest."},
  Boostmaster: {bonus: [["attr", "dexterity", 1], ["init", "", 1]]},
  "Adrenal Booster": {bonus: [["init", "", 1]], story: "Switched on, +1 Dexterity for a few turns, three times a day. Dead flesh gives it nothing to work on if it went in before the Embrace."},
  "Sport Heart": {bonus: [["attr", "strength", 1], ["attr", "stamina", 1], ["soak", "all", -1]], story: "Works only in a living body."},
  "Overdrive Heart": {bonus: [["attr", "strength", 2], ["attr", "stamina", 2], ["soak", "all", -2]], story: "Works only in a living body."},
  "Gang Jazzler": {weapon: {type: "Melee Weapon", dmg: 1, kind: "aggravated", ability: "brawl", attribute: ""}, story: "The target resists with Stamina + Fortitude at difficulty 8; Kindred take the damage aggravated, others are stunned."},
  "Grafted Muscle": {bonus: [["attr", "strength", 1]], story: "The second level adds +1 Stamina as well."},
  "Muscle & Bone Lace": {bonus: [["attr", "strength", 1], ["attr", "stamina", 1]]},
  "European Biotech Body": {bonus: [["attr", "strength", 1], ["attr", "stamina", 1]]},
  Reflex: {bonus: [["attr", "dexterity", 1]]},
  MA: {bonus: [ab("athletics", 2)], story: "Only for leaping and running."},
  "Slice N' Dice": {weapon: {type: "Melee Weapon", dmg: 8, kind: "lethal", ability: "brawl", attribute: ""}, story: "Armor gives only one soak die against the wire."},
  Cybersnake: {weapon: {type: "Melee Weapon", dmg: 4, kind: "lethal", ability: "brawl", attribute: ""}},
  "Cutting Torch": {weapon: {type: "Melee Weapon", dmg: 2, kind: "aggravated", ability: "brawl", attribute: ""}, story: "The target resists at difficulty 9; two aggravated levels each turn it stays on."},
  "MM Launcher": {weapon: {type: "Ranged Weapon", dmg: 8, kind: "lethal", ability: "firearms", range: 50, rate: 1, clip: 1}},
  "2 Shot Laser": {weapon: {type: "Ranged Weapon", dmg: 6, kind: "lethal", ability: "firearms", range: 100, rate: 1, clip: 2}},
  Cyberarm: {body: {potence: 1}, limb: {soak: 4}, story: "Bought at a set Strength; crushing grips count double."},
  Cyberleg: {limb: {soak: 4}},
  "Hydraulic Rams": {body: {potence: 3}, limb: {soak: 6}},
  "Thickened Myomar": {body: {potence: 2}, limb: {soak: 5}},
  "Reinforced Joints": {limb: {soak: 1}},
  Armor: {limb: {soak: 4}},
  "Orbital Crystal Arm": {limb: {soak: 12}},
  "Linear Frame Sigma": {bonus: [["fixed", "strength", 6]]},
  "Linear Frame Beta": {bonus: [["fixed", "strength", 7]]},
  "Linear Frame Omega": {bonus: [["fixed", "strength", 8]]},

  // Cyberpunk 2020, pdf 79 to 82 (house figures on the scale above)
  Biomonitor: {bonus: [ab("medicine")], story: "Reads the body's own signs: pulse, blood sugar, poisons."},
  "Tactile Boost": {senses: sense(1, "touch")},
  "Olfactory Boost": {senses: sense(1, "smell")},
  "Pain Editor": {body: {ease: 5}, story: "No wound penalties while it runs; the body still breaks."},
  "Cybermodem Link": {bonus: [ab("computer")]},
  "Vehicle Link": {bonus: [ab("drive")], story: "Only with a vehicle wired for it."},
  "Machine/Tech Link": {bonus: [ab("technology")], story: "Only with a machine wired for it."},
  "DataTerm Link": {bonus: [ab("computer")], story: "Only at a public data terminal."},
  "Interface plugs": {bonus: [ab("computer")]},
  "Reflex Chips": {bonus: [ab("brawl")], story: "A chip holds one combat skill; change the Ability on its bonus list to the one it carries."},
  "Memory Chips": {bonus: [ab("linguistics")], story: "A chip holds one body of knowledge; change the Ability on its bonus list to the one it carries."},
  "Nasal Filters": {bonus: [["dice", "stamina", 2]], story: "Against gas and smoke only."},
  Gills: {story: "Breathes water as air."},
  "Independent Air Supply": {story: "Half an hour of air in smoke, gas or water."},
  "Motion Detector": {senses: sense(1, "sight", "sound")},
  "Radar Sensor": {senses: {dark: "Radar sensor", mods: [[1, ["sight"]]]}},
  "Sonar Implant": {senses: {dark: "Sonar implant", mods: [[1, ["sound"]]]}},
  "Radiation Detector": {bonus: [ab("science")]},
  "Chemical Analyser": {bonus: [ab("medicine")], story: "Names a poison or drug from a taste or a sniff."},
  "Voice Synthesizer": {bonus: [ab("performance")], story: "Can mimic a voice it has heard."},
  AudioVox: {bonus: [ab("performance", 2)]},
  "Muscle and Bone Lace": {bonus: [["attr", "strength", 1]]},
  "Enhanced Antibodies": {bonus: [["dice", "stamina", 1]], story: "Against sickness; wounds heal a little faster."},
  "Toxin Binders": {bonus: [["dice", "stamina", 2]], story: "Against poison and drugs only."},
  Nanosurgeons: {story: "Wounds heal in half the time."},
  "Image Enhancement": {senses: sense(1, "sight")},
  Teleoptics: {senses: sense(1, "sight"), story: "Sees far: only beyond a stone's throw."},
  "Micro-optics": {bonus: [ab("investigation")]},
  "Anti Dazzle": {story: "Flashes and glare do not blind."},
  "Low Lite": {senses: {dark: "Low-light optics"}},
  "Thermograph sensor": {senses: {dark: "Thermograph"}},
  Infrared: {senses: {dark: "Infrared optics"}},
  Ultraviolet: {senses: sense(1, "sight")},
  Dartgun: {weapon: {type: "Ranged Weapon", dmg: 1, kind: "lethal", ability: "firearms", range: 10, rate: 1, clip: 1}, story: "The dart carries whatever drug or poison it is loaded with."},
  "Amplified Hearing": {senses: sense(1, "sound")},
  "Enhanced Hearing Range": {senses: sense(1, "sound")},
  "Sound Editing": {senses: sense(1, "sound"), story: "Only in a noisy place."},
  "Voice Stress Analyser": {bonus: [ab("empathy")], story: "Only to tell whether someone lies."},
  "Bug Detector": {bonus: [ab("security")]},
  "Radar Detector": {bonus: [ab("security")]},
  "Level Damper": {story: "Loud noise and sound attacks do not stun."},
  "Wide Band Radio Scanner": {bonus: [ab("investigation")], story: "Only listening in on the air."},
  "Ripper Hand": {weapon: {type: "Melee Weapon", dmg: 2, kind: "lethal", ability: "brawl", attribute: "strength"}},
  "Tool Hand": {bonus: [ab("technology")]},
  "Grapple Hand": {bonus: [ab("athletics")], story: "Only climbing."},
  "Tool Foot": {bonus: [ab("technology")]},
  "Web Foot": {bonus: [ab("athletics")], story: "Only swimming."},
  "Grip Foot": {bonus: [ab("athletics")], story: "Only climbing."},
  "Hidden Holster": {story: "A strip search finds the pistol inside at +3 difficulty."},
  "SubDermal Pocket": {story: "A strip search finds what it holds at +3 difficulty."},
  Techscanner: {bonus: [ab("technology")], story: "Only to find what is wrong with a machine."},
  "Grenade Launcher": {weapon: {type: "Ranged Weapon", dmg: 10, kind: "lethal", ability: "firearms", range: 100, rate: 1, clip: 1}},
  "Micro-Missile Launcher": {weapon: {type: "Ranged Weapon", dmg: 7, kind: "lethal", ability: "firearms", range: 200, rate: 1, clip: 4}},
  "Popup Gun": {weapon: {type: "Ranged Weapon", dmg: 4, kind: "lethal", ability: "firearms", range: 20, rate: 3, clip: 15}},
  "Flame Thrower": {weapon: {type: "Ranged Weapon", dmg: 6, kind: "aggravated", ability: "firearms", range: 10, rate: 1, clip: 2}, story: "Fire: Kindred soak it only with Fortitude."},
  "2 shot Capacitor Laser": {weapon: {type: "Ranged Weapon", dmg: 6, kind: "lethal", ability: "firearms", range: 100, rate: 1, clip: 2}},
  "Weapon Mount & Link": {bonus: [["atkd", "Ranged Weapon", -1]], story: "Only with the mounted weapon."},
  Cowl: {limb: {soak: 3, part: "head"}},
  Faceplate: {limb: {soak: 3, part: "head"}},
  "Torso Plate": {bonus: [["soak", "lethal", 3], ["soak", "bashing", 3]], story: "Covers the trunk only: a blow aimed at a limb or the head goes past it."},
  "Front Optic Mount": {senses: sense(1, "sight")},
  "Sense ext.": {senses: sense(1, "sound")},
  "Artificial Shoulder Mount": {story: "A second pair of arms: one more action a turn with them, at the usual split."},
  RealSkinn: {humanityLess: "1D6/2", story: "Covers chrome with skin: people do not see the machine."}
};

/** The Storyteller's line for each piece with no line of its own: what Humanity buys here, and nothing more. */
export const PLAIN_STORY = "No roll changes; its price is the Humanity it costs.";
