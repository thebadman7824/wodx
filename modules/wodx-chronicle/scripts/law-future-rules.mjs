/**
 * The law of the Future Darkness (B3620-B3621): rows laid on the law records from 2023, only on the Future Darkness
 * branch (the house rule futureBranch). No history stands behind any of it: it is WoDX's guess at where each family
 * of law goes, in the spirit of the Age of Future Darkness (corporate cities, cyberware, the Net, a corporate war),
 * and every record it touches is marked as speculation on the Law here card. Off the branch, the law of 2022 holds
 * for later years. Dated real events stop at 2022; nothing here names a real person or a real company.
 *
 * Each row: from (and to), families ("*" for all) or regions, note, and set/add/drop as in law-rules.mjs.
 */

/** Families whose cities fall to the corporations first (a guess). */
const CORP = ["latin", "common", "americas", "japanese", "pacific"];
/** Families where the state scores every citizen (a guess). */
const SCORED = ["chinese", "orthodox", "islamic", "steppe"];

export const FUTURE_ROWS = [
  {from: 2026, families: ["*"], note: "Cameras read every face, and every payment leaves a trace",
    add: {order: ["algorithm"], warn: ["Cameras and payments put a name to almost anyone within a day"]}},
  {from: 2030, families: SCORED, note: "The state scores every citizen",
    add: {crimes: ["low-score"], warn: ["A low citizen's score bars travel, good jobs and good schools"]}, set: {catch: 0.6, bribe: 4}},
  {from: 2035, families: CORP, note: "Corporations take over the policing of whole districts",
    add: {order: ["corporate"], courts: ["Corporate arbitration in place of the courts, for anyone who signed the contract"], crimes: ["unregistered"],
      warn: ["Inside a corporate zone, its security answers to the company first and the law second"]}, set: {catch: 0.5, bribe: 3}},
  {from: 2040, families: ["*"], note: "Cyberware is licensed like weapons",
    add: {crimes: ["unlicensed-cyberware"], warn: ["Combat cyberware needs a licence; carrying it without one is a felony"]}},
  {from: 2050, to: 2056, families: CORP, note: "The Fourth Corporate War: company armies fight in the streets",
    add: {order: ["army"], warn: ["Martial law in the worst cities, and curfews enforced by company soldiers"]}},
  {from: 2060, families: ["*"], note: "Erasure: the worst offenders lose name, accounts and rights",
    add: {punish: ["erasure"], warn: ["An erased person has no identity the machines will accept"]}},
  {from: 2075, families: ["*"], note: "Machines judge most petty crimes from the data",
    add: {courts: ["Automated courts for petty crime, appealable to a human judge for a fee"]}}
];
export const FUTURE_FROM = 2023;

/** The future rows that apply to a region of a family, oldest first. */
export const futureRowsFor = (family, region) => FUTURE_ROWS.filter(r => (r.regions ? r.regions.includes(region) : r.families.some(f => f === "*" || f === family)))
  .sort((a, b) => a.from - b.from);

/** What the Future Darkness's law means for each line (B3621), for the Storyteller. */
export const LINE_FUTURE = {
  vampire: "Every camera is a threat to the Masquerade; the Kindred who own the algorithm own the night.",
  ghoul: "A ghoul with corporate papers can walk where the domitor cannot.",
  werewolf: "The corporate districts are the Wyrm's own cities.",
  mage: "The Technocracy and the corporate courts speak the same language.",
  changeling: "Banality in a scored, filmed, licensed world is crushing.",
  wraith: "The dead have no score, no licence and no face the cameras know.",
  hunter: "A hunter with an erased identity hunts unseen, and unprotected.",
  mummy: "Each new life needs a new identity the machines accept.",
  demon: "A host's data trail is the demon's to keep clean.",
  revenant: "Revenant families own shares in the companies that police the districts.",
  mortal: ""
};
