/**
 * Phase 4: what the years do. Book rules carry their page; "WoDX choice" marks what the books leave open.
 */

export const SECONDS_PER_YEAR = 365.25 * 86400;
export const SECONDS_PER_MONTH = SECONDS_PER_YEAR / 12;

/** Mortal death checks over a time skip. House rule: the books give no lifespan rule. */
export const MORTAL = {
  source: "House rule",
  // Past this age the Storyteller is asked; the change starts unticked
  mayDieAt: 70,
  // At this age the death is proposed ticked
  diesAt: 100,
  // With no birth year on the sheet, a character is taken to be an adult of this age when the skip starts
  assumedAge: 20,
  // Townsfolk (NPCs who keep a WoDX NPC routine or household) with no birth year are spread over this many years
  // from assumedAge, seeded by the actor, so a long skip does not take the whole town in one year (B710)
  townSpread: 30
};

/** A ghoul who goes without vitae reverts to their real age; one far past a lifespan turns to dust (V20DA p. 399). */
export const GHOUL_AGING = {source: "V20 Dark Ages p. 399", dustAt: 100};

/** The blood oath fades by one step for every (12 − Willpower) months without a drink (V20DA p. 341). */
export const BOND_FADE = {source: "V20 Dark Ages printed p. 342", base: 12, minMonths: 1};

/** How long a vampire sleeps in torpor, by Road rating (V20DA p. 351), in years. */
export const TORPOR = {
  source: "V20 Dark Ages p. 350",
  years: {10: 1 / 365, 9: 3 / 365, 8: 7 / 365, 7: 14 / 365, 6: 1 / 12, 5: 1, 4: 10, 3: 50, 2: 100, 1: 500, 0: 1000},
  labels: {10: "one day", 9: "three days", 8: "one week", 7: "two weeks", 6: "one month", 5: "one year", 4: "one decade",
    3: "five decades", 2: "one century", 1: "five centuries", 0: "a millennium or more"}
};

/** Backgrounds the years wear on. House rule: listed for the Storyteller to review after a skip of 10 years or more. */
export const BACKGROUND_REVIEW = {
  years: 10,
  names: ["allies", "contacts", "herd", "influence", "mentor", "resources", "retainers", "status", "domain", "fame"]
};

/**
 * Secondary Abilities upstream gives each era's sheets (worldofdarkness 7.3.2, create-helpers.js). Pass the Years adds
 * the target era's missing ones at 0 dots; nothing a character already has is ever removed.
 */
export const ERA_SECONDARY = {
  mortal: {
    victorian: [["skill", "ride"]],
    darkages: [["talent", "legerdemain"], ["skill", "archery"], ["skill", "commerce"], ["skill", "ride"], ["knowledge", "hearthwisdom"], ["knowledge", "seneschal"], ["knowledge", "theology"]],
    classical: [["skill", "archery"], ["skill", "commerce"], ["skill", "ride"], ["knowledge", "hearthwisdom"], ["knowledge", "philosophy"], ["knowledge", "religion"], ["knowledge", "ritualistics"]],
    livinggods: [["talent", "legerdemain"], ["skill", "archery"], ["skill", "commerce"], ["skill", "ride"], ["knowledge", "ancientmedicine"], ["knowledge", "astrology"], ["knowledge", "customs"], ["knowledge", "hearthwisdom"], ["knowledge", "mythology"], ["knowledge", "seneschal"], ["knowledge", "writing"]]
  },
  werewolf: {
    victorian: [["skill", "ride"], ["knowledge", "culture"]],
    darkages: [["skill", "archery"], ["skill", "ride"], ["knowledge", "hearthwisdom"]]
  }
};
ERA_SECONDARY.vampire = ERA_SECONDARY.mortal;

/** Upstream's sheet line for each actor type. Other types have no era ability sets. */
export const LINE_OF_TYPE = {Mortal: "mortal", Vampire: "vampire", Werewolf: "werewolf", "Changing Breed": "werewolf", Mage: "mage"};
