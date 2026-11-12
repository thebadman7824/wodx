/**
 * WoDX NPC 0.31.0: the house grammar for the talk generator (scripts/talk-grammar.mjs). House writing, not from any
 * book. One template speaks in every era because its words come from the lexicon below: forms of address, greetings,
 * oaths, coin, who keeps order, light, drink, travel and landmarks, each by era band or by exact years.
 * Rothenstein lies in Moravia, so coin and places follow Moravia. Coin years match WoDX Storyteller's money rules.
 * Gender-neutral throughout. These lines pool with the hand-written stock talk; the Storyteller's lines come first.
 */

const E = (era, say) => ({when: {era}, say});
const EW = (era, warmth, say) => ({when: {era, warmth}, say});
const Y = (from, to, say) => ({when: {year: [from, to]}, say});

export const SYMBOLS = {
  hello: [
    E("medieval", ["God keep you", "Peace be with you", "Christ be with you"]),
    E("earlymodern", ["Good day", "God save you", "Your servant"]),
    E("nineteenth", ["Good evening", "How do you do", "Good day to you"]),
    E("twentieth", ["Hello", "Evening", "Hello there"]),
    E("modern", ["Hey", "Hi", "Hey there"]),
    E("future", ["Hey", "Hi there", "Signal's good"])
  ],
  address: [
    EW("medieval", "cold", ["stranger", "you"]), EW("medieval", "neutral", ["traveller", "friend", "good neighbour"]), EW("medieval", "warm", ["old friend", "dear heart"]),
    EW("earlymodern", "cold", ["you there", "stranger"]), EW("earlymodern", "neutral", ["good friend", "neighbour"]), EW("earlymodern", "warm", ["my dear friend", "my good friend"]),
    EW("nineteenth", "cold", ["you", "stranger"]), EW("nineteenth", "neutral", ["my friend", "neighbour"]), EW("nineteenth", "warm", ["my dear", "dear friend"]),
    EW("twentieth", "cold", ["pal", "you"]), EW("twentieth", "neutral", ["friend", "neighbour"]), EW("twentieth", "warm", ["old friend", "you old devil"]),
    EW("modern", "cold", ["buddy", "you"]), EW("modern", "neutral", ["mate", "friend"]), EW("modern", "warm", ["you", "my friend"]),
    EW("future", "cold", ["citizen", "you"]), EW("future", "neutral", ["friend", "neighbour"]), EW("future", "warm", ["my friend", "old friend"])
  ],
  oath: [
    E("medieval", ["God's bones", "by Saint Wenceslas", "Mother of God"]),
    E("earlymodern", ["Jesus and Mary", "by all the saints", "God's mercy"]),
    E("nineteenth", ["good heavens", "heavens above", "Jesus and Mary"]),
    E("twentieth", ["good grief", "hell", "Jesus and Mary"]),
    E("modern", ["Christ", "oh, come on", "unbelievable"]),
    E("future", ["static take it", "glitch it", "unbelievable"])
  ],
  /** small change, as people say it (WoDX Storyteller money rules, Moravian region) */
  coin: [
    Y(null, 1299, ["denars", "silver denars"]),
    Y(1300, 1526, ["groschen", "heller"]),
    Y(1527, 1891, ["kreuzer", "kreuzer"]),
    Y(1892, 1918, ["heller", "kronen"]),
    Y(1919, 2019, ["korun", "crowns"]),
    Y(2020, null, ["eurobucks", "credits"])
  ],
  /** who keeps order, always plural */
  watch: [
    E("medieval", ["the watchmen", "the burgrave's men"]),
    Y(1500, 1848, ["the town watch", "the constables"]),
    Y(1849, 1899, ["the gendarmes", "the police"]),
    E("twentieth", ["the police", "the gendarmes"]),
    E("modern", ["the cops", "the police"]),
    E("future", ["the security drones", "the patrols"])
  ],
  light: [
    E("medieval", ["a torch", "a rushlight", "a tallow candle"]),
    E("earlymodern", ["a lantern", "a candle"]),
    E("nineteenth", ["the gaslight", "a lamp"]),
    E("twentieth", ["the streetlights", "a torch"]),
    E("modern", ["the streetlights", "your phone"]),
    E("future", ["the lit zones", "your lenses"])
  ],
  drink: [
    E("medieval", ["some ale", "a cup of wine", "some mead"]),
    Y(1500, 1699, ["some beer", "a cup of wine"]),
    Y(1700, 1799, ["some coffee", "a cup of wine"]),
    E("nineteenth", ["some coffee", "a glass of beer", "some slivovice"]),
    E("twentieth", ["some coffee", "a beer", "some slivovice"]),
    E("modern", ["a coffee", "a beer", "something stronger"]),
    E("future", ["real coffee", "a synth beer", "something stronger"])
  ],
  landmark: [
    E("medieval", ["the market cross", "the church", "the town gate"]),
    E("earlymodern", ["the town hall", "the plague column", "the church"]),
    Y(1800, 1838, ["the town hall", "the post house"]),
    Y(1839, 1899, ["the railway station", "the town hall"]),
    E("twentieth", ["the station", "the tram stop", "the square"]),
    E("modern", ["the station", "the tram stop", "the shopping centre"]),
    E("future", ["the transit hub", "the tram stop", "the old square"])
  ]
};

/** Templates. Each pools with the stock lines of the same kind (boost brings it level with era and regard). */
export const RULES = {
  greet: [
    {id: "house.greet.cold", when: {warmth: "cold"}, boost: 1, say: [
      "\"#oath.cap#, not you. Say it and go.\"",
      "\"Keep your voice down, #address#. #watch.cap# come by here.\"",
      "\"What do you want, #address#?\""]},
    {id: "house.greet.neutral", when: {warmth: "neutral"}, boost: 1, say: [
      "\"#hello.cap#, #address#. Need something?\"",
      "\"#hello.cap#. You're not from round here, are you?\""]},
    {id: "house.greet.warm", when: {warmth: "warm"}, boost: 1, say: [
      "\"#address.cap#! Sit down, I'll fetch #drink#.\"",
      "\"#hello.cap#, #address#. Good to see you.\""]}
  ],
  directions: [
    {id: "house.directions", when: {regard: ["neutral", "like", "love"]}, say: [
      "\"Go on to #landmark# and ask again there.\"",
      "\"Past #landmark#, then left. Bring #light#, it's dark that way.\""]}
  ],
  work: [
    {id: "house.work", when: {regard: "!hate"}, boost: 1, say: [
      "\"Work? A few #coin# a day, when there's any at all.\"",
      "\"I work for my bread. Most days that's all it buys.\""]}
  ],
  news: [
    {id: "house.news", when: {regard: "!hate"}, boost: 1, say: [
      "\"Everything costs more #coin# than it did last year.\"",
      "\"#watch.cap# have been asking questions round #landmark#.\""]}
  ],
  farewell: [
    {id: "house.farewell", when: {warmth: ["neutral", "warm"]}, boost: 1, say: [
      "\"Mind how you go, #address#. #watch.cap# are about.\"",
      "\"Go carefully. Take #light#.\""]}
  ]
};

export const HOUSE = {rules: RULES, symbols: SYMBOLS};
