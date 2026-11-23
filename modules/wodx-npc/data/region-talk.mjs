/**
 * WoDX NPC: talk that belongs to one land (Chronicle Packs Desk d3, Ben's pick 18 Nov 2026). House writing, not from
 * any book. The shared stock talk (stock-talk.mjs, stock-talk-more.mjs, grammar/house.mjs) names no real place, saint
 * or drink of one land; the lines that do are here, under the WoDX Chronicle region (world-rules.mjs WORLD_REGIONS)
 * where people would say them. talk.mjs adds a region's lines to the shared pools when the talk happens in that
 * region: the scene's own region, else the chronicle's homeland. They join the pools, they do not replace them.
 *
 * A region's entry has the same shape as the stock tables it adds to:
 *   NEWS    {era: [lines]}               news, by era band
 *   GOSSIP  {era: [lines]}               gossip, by era band
 *   VOICES  {voice: {gossip: [lines]}}   a kind of person's gossip (stock-talk-more.mjs VOICES keys)
 *   SMALL   {key: [lines]}               small talk on the day (stock-talk-more.mjs SMALL keys)
 *   symbols {name: [{when, say}]}        words for the house grammar's symbols, with the shared words kept in
 * More regions can be added the same way; a region with no entry speaks the shared lines alone.
 * Gender-neutral throughout.
 */

export const REGION_TALK = {
  moravia: {
    NEWS: {
      medieval: ["\"A merchant brought word of sickness in Olomouc and the towns downriver.\"", "\"Floods took the low fields again. The Morava's never been this high.\""],
      nineteenth: ["\"The Diet in Vienna is debating reform again. Nothing will change.\"", "\"There's an exhibition coming to Prague. All the marvels of the age.\"", "\"Cholera's been reported in Brno.\""]
    },
    VOICES: {
      merchant: {gossip: ["\"The tolls on the Brno road have doubled. Someone's lining their pockets.\"", "\"A shipment went missing on the Morava. Third this season.\""]},
      scholar: {gossip: ["\"A colleague in Prague stopped answering my letters. Most unlike them.\""]}
    },
    SMALL: {
      winter: ["\"Cold enough to freeze the Morava solid.\""],
      spring: ["\"Mud everywhere. Spring in Moravia.\""]
    },
    symbols: {
      oath: [{when: {era: "medieval"}, say: ["God's bones", "by Saint Wenceslas", "Mother of God"]}],
      drink: [
        {when: {era: "nineteenth"}, say: ["some coffee", "a glass of beer", "some slivovice"]},
        {when: {era: "twentieth"}, say: ["some coffee", "a beer", "some slivovice"]}
      ]
    }
  }
};
