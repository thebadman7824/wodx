/**
 * WoDX NPC 0.53.0 (B2700 to B2703): what two NPCs say to each other when a character is close enough to overhear,
 * for the talk generator (scripts/talk-grammar.mjs; the pairing is scripts/overheard-rules.mjs). House writing, not
 * from any book. Gender-neutral throughout.
 *
 * Kinds: overheard:<topic> opens the exchange, overheard:reply:<topic> answers it (overheard:reply when nothing fits
 * the topic). Topics: rumour, times, price, watch, faction, secret, feast, weather, work.
 * Facts the lines use, besides the talk generator's own (era, year, mood, clan and the like):
 *   region, sphere   where the scene stands and the way of life it keeps that year (WoDX Chronicle world-rules)
 *   media            how news travels there that year: word, print, papers, radio, television, internet, net
 *   {rumour} {times} {good} {faction} {feast} {money}   the subject, filled in by overheard-rules.mjs
 *   supply           short, none or plenty, for a price
 *   weather          thunder, snow, rain, fog, wind, cold or hot
 *
 * The words that change with the place and the year are symbols below, by way of life and era band: an oath, who
 * keeps order, the market, how goods come in. One template then speaks in Kraków in 1250, in Cairo in 1800 and in
 * Kyoto in 1990. Old lexicon words from the house grammar (#address#, #drink#) still work here.
 */

const q = s => `"${s}"`;
const E = (era, say) => ({when: {era}, say});
const SE = (sphere, era, say) => ({when: {sphere, era}, say});
const OLD = ["medieval", "earlymodern"], LATER = ["nineteenth", "twentieth"];
const FAITHS_OF_ONE_GOD = ["latin", "orthodox"];
const ISLAM = ["islamic", "sahel", "swahili"];
const OWN_WAYS = ["bantu", "mesoamerican", "andean", "polynesian", "northern"];

export const SYMBOLS = {
  /** a short oath, by way of life and age; the later ages swear alike everywhere */
  ohOath: [
    SE(FAITHS_OF_ONE_GOD, "medieval", ["God's wounds", "Mother of God", "saints preserve us"]),
    SE(FAITHS_OF_ONE_GOD, "earlymodern", ["God's mercy", "by all the saints", "Lord have mercy"]),
    SE(FAITHS_OF_ONE_GOD, LATER, ["good Lord", "heavens", "God help us"]),
    SE(ISLAM, OLD, ["God protect us", "God is merciful", "God is great"]),
    SE(ISLAM, LATER, ["God protect us", "God forgive me", "what can you do"]),
    SE("indic", OLD, ["Ram, Ram", "may the gods spare us", "by my mother's head"]),
    SE("indic", LATER, ["Ram, Ram", "God help us", "by my mother's head"]),
    SE(["sinic", "japanese"], OLD, ["Heaven help us", "may the ancestors forgive us", "aiya"]),
    SE(["sinic", "japanese"], LATER, ["Heaven help us", "aiya", "what a world"]),
    SE(["theravada", "tibetan", "malay"], OLD, ["the Buddha keep us", "may the spirits spare us", "by my father's grave"]),
    SE(["theravada", "tibetan", "malay"], LATER, ["the Buddha keep us", "what can you do", "by my father's grave"]),
    SE(OWN_WAYS, OLD, ["the ancestors keep us", "may the spirits not hear", "by the old ones"]),
    SE(OWN_WAYS, LATER, ["the ancestors keep us", "God help us", "what a world"]),
    E("modern", ["God", "unbelievable", "seriously"]),
    E("future", ["glitch it", "unbelievable", "static take it"])
  ],
  /** who keeps order in the street, always plural so the lines agree */
  ohWatch: [
    SE(FAITHS_OF_ONE_GOD, "medieval", ["the watchmen", "the reeve's men", "the castellan's men"]),
    SE(FAITHS_OF_ONE_GOD, "earlymodern", ["the watch", "the constables", "the soldiers in the guardhouse"]),
    SE(ISLAM, OLD, ["the market inspector's men", "the governor's guards", "the night watch"]),
    SE("indic", OLD, ["the kotwal's men", "the raja's guards"]),
    SE("sinic", OLD, ["the yamen runners", "the magistrate's men", "the night watch"]),
    SE("japanese", OLD, ["the magistrate's men", "the ward watch", "the samurai of the guard"]),
    SE(["theravada", "tibetan", "malay"], OLD, ["the king's guards", "the headman's men", "the harbour master's men"]),
    SE(OWN_WAYS, OLD, ["the chief's warriors", "the elders' young men"]),
    SE(ISLAM, "nineteenth", ["the police", "the governor's guards"]),
    SE("indic", "nineteenth", ["the police", "the kotwal's men"]),
    SE("sinic", "nineteenth", ["the yamen runners", "the magistrate's men"]),
    SE("japanese", "nineteenth", ["the police", "the magistrate's men"]),
    SE(["theravada", "tibetan", "malay"], "nineteenth", ["the king's guards", "the police"]),
    SE(OWN_WAYS, "nineteenth", ["the soldiers", "the police"]),
    E("nineteenth", ["the police", "the gendarmes", "the soldiers"]),
    E("twentieth", ["the police", "the soldiers at the checkpoint", "the secret police"]),
    E("modern", ["the cops", "the police", "the private security"]),
    E("future", ["the security drones", "the corporate patrols", "the cops"])
  ],
  /** the market where prices are made */
  ohMarket: [
    SE(FAITHS_OF_ONE_GOD, OLD, ["the market", "the market square", "the fair"]),
    SE(ISLAM, OLD, ["the souk", "the bazaar", "the covered market"]),
    SE(["indic", "tibetan"], OLD, ["the bazaar", "the market"]),
    SE(["sinic", "japanese"], OLD, ["the market street", "the night market", "the market"]),
    SE(["theravada", "malay"], OLD, ["the floating market", "the harbour market", "the market"]),
    SE("mesoamerican", OLD, ["the great market", "the market"]),
    SE(OWN_WAYS, OLD, ["the market", "the trading place"]),
    E("nineteenth", ["the market", "the market hall", "the shops"]),
    E("twentieth", ["the market", "the shops", "the co-op"]),
    E("modern", ["the supermarket", "the shops", "the market"]),
    E("future", ["the mall levels", "the ration point", "the street stalls"])
  ],
  /** how goods come into town */
  ohCarts: [
    E("medieval", ["the carts", "the pack trains", "the boats"]),
    E("earlymodern", ["the wagons", "the carts", "the ships"]),
    E("nineteenth", ["the wagons", "the trains", "the ships"]),
    E("twentieth", ["the trains", "the lorries", "the ships"]),
    E("modern", ["the trucks", "the deliveries"]),
    E("future", ["the drones", "the convoys", "the trucks"])
  ],
  /** how word came: the way news travels there that year */
  ohHeard: [
    {when: {media: "word"}, say: ["at the well", "from a carter", "from someone who was there"]},
    {when: {media: "print"}, say: ["from a printed sheet", "at the inn", "from a carter"]},
    {when: {media: "papers"}, say: ["in the paper", "at the café", "in the evening edition"]},
    {when: {media: "radio"}, say: ["on the wireless", "in the paper", "on the radio"]},
    {when: {media: "television"}, say: ["on the television", "on the radio", "in the paper"]},
    {when: {media: "internet"}, say: ["online", "on the news", "in a group chat"]},
    {when: {media: "net"}, say: ["on the net", "in a feed", "from a newsfeed"]}
  ]
};

const R = (id, when, say, boost = 0) => ({id, when, say: say.map(q), ...(boost ? {boost} : {})});

export const RULES = {
  /* a rumour from the Storyteller's rumour mill that one of them has heard (B2701) */
  "overheard:rumour": [
    R("overheard.rumour", {}, ["Did you hear? {rumour}", "I heard it #ohHeard#: {rumour}", "Keep this to yourself. {rumour}"]),
    R("overheard.rumour.afraid", {mood: "afraid"}, ["I can't stop thinking about it. {rumour}", "Don't laugh. {rumour}"])
  ],
  "overheard:reply:rumour": [
    R("overheard.reply.rumour", {}, ["Who told you that?", "I heard the same at #ohMarket#.", "#ohOath.cap#. I don't want to know.", "People will say anything."])
  ],
  /* talk of the times: the war, the plague, the railway, the arcologies (overheard-times.mjs) */
  "overheard:times": [
    R("overheard.times", {}, ["Any more word about {times}?", "All anyone talks about is {times}.", "You can't go to #ohMarket# without hearing about {times}.",
      "I heard about {times} #ohHeard#. Everyone has something to say about it."])
  ],
  "overheard:reply:times": [
    R("overheard.reply.times", {}, ["Don't. I've heard enough about it for one day.", "It'll come to nothing. Or it'll come here.", "#ohOath.cap#. Let's hope it passes us by."]),
    R("overheard.reply.times.papers", {media: ["papers", "radio", "television"]}, ["I read about it #ohHeard#. They don't tell you half of it.", "They talk of nothing else #ohHeard#."]),
    R("overheard.reply.times.net", {media: ["internet", "net"]}, ["It's everywhere online. Half of it's made up.", "I stopped reading about it. It's all the same."])
  ],
  /* what something costs at the market of the scene (WoDX Storyteller markets) */
  "overheard:price": [
    R("overheard.price.short", {supply: ["short", "none"]}, ["Have you seen the price of {good} at #ohMarket#? There's hardly any to be had.",
      "No {good} again today. They say #ohCarts# didn't come.", "They want twice the {money} for {good} they did last month."]),
    R("overheard.price.plenty", {supply: "plenty"}, ["There's {good} everywhere at #ohMarket#. You can have it for a few {money}.",
      "Everyone's selling {good} this week. Somebody's going to go broke."])
  ],
  "overheard:reply:price": [
    R("overheard.reply.price.short", {supply: ["short", "none"]}, ["Somebody's holding it back to push the price up.", "Then we go without. Again.", "#ohOath.cap#. And they wonder why people steal."]),
    R("overheard.reply.price.plenty", {supply: "plenty"}, ["Good. Buy now, before it's gone.", "Too much of anything means somebody's in trouble."])
  ],
  /* who keeps order, and how badly */
  "overheard:watch": [
    R("overheard.watch", {}, ["#ohWatch.cap# stopped me again last night. For nothing.", "Have you noticed #ohWatch# never come down this street when you need them?",
      "#ohWatch.cap# want paying, same as everyone else."]),
    R("overheard.watch.afraid", {mood: ["afraid", "wary"]}, ["#ohWatch.cap# were asking about this street. Asking names.", "Don't look now. #ohWatch# are watching the corner."])
  ],
  "overheard:reply:watch": [
    R("overheard.reply.watch", {}, ["Keep your head down and they leave you alone.", "Hush. They've ears everywhere.", "#ohOath.cap#. They're worse than the thieves."])
  ],
  /* a faction everyone may know of (never a secret one, B2702) */
  "overheard:faction": [
    R("overheard.faction", {}, ["Seen any of {faction} about? They were asking questions.", "Word is {faction} wants this whole street.",
      "I'd stay clear of anyone from {faction} for a while."])
  ],
  "overheard:reply:faction": [
    R("overheard.reply.faction", {}, ["Not my business, and not yours either.", "Let them. They never last.", "Keep your voice down. You don't know who's listening."])
  ],
  /* two of the same secret faction, lowering their voices (B2702): a clue for a character in earshot */
  "overheard:secret": [
    R("overheard.secret", {}, ["Lower your voice. Is the word from {faction} still the same?", "Not a word to anyone outside {faction}. Not yet.",
      "{faction} won't wait much longer. Someone has to tell them."])
  ],
  "overheard:reply:secret": [
    R("overheard.reply.secret", {}, ["Not here. Later.", "Quiet. There are people about.", "I know. Leave it with me."])
  ],
  /* a feast or holy day coming (WoDX Chronicle's calendar of the great faiths) */
  "overheard:feast": [
    R("overheard.feast", {}, ["Are you going for {feast}?", "Everything will be shut for {feast}.", "My family's coming for {feast}. All of them."])
  ],
  "overheard:reply:feast": [
    R("overheard.reply.feast", {}, ["If my back lets me.", "I'll be at #ohMarket# early, before the crowds.", "Somebody has to keep working."])
  ],
  /* the day's weather (WoDX Atmosphere) */
  "overheard:weather": [
    R("overheard.weather.rain", {weather: ["rain", "thunder"]}, ["This rain won't stop.", "The street's a river again."]),
    R("overheard.weather.snow", {weather: ["snow", "cold"]}, ["My hands haven't been warm in a week.", "Another night like this and the old ones won't see spring."]),
    R("overheard.weather.hot", {weather: "hot"}, ["You can't breathe in this heat.", "The water tastes of the pipes in this heat.", "Nobody sleeps in heat like this."]),
    R("overheard.weather.fog", {weather: ["fog", "wind"]}, ["You can't see your own hand out there.", "This wind gets into everything."])
  ],
  "overheard:reply:weather": [
    R("overheard.reply.weather", {}, ["It's always like this, this time of year.", "It'll turn. It always does.", "#ohOath.cap#. Don't remind me."])
  ],
  /* work and pay */
  "overheard:work": [
    R("overheard.work", {}, ["Any work going where you are?", "They cut my pay again. A few {money} less a week.", "I worked all day for a handful of {money}."])
  ],
  "overheard:reply:work": [
    R("overheard.reply.work", {}, ["Nothing. They're letting people go.", "Try #ohMarket#. Someone always needs a back.", "Same as ever. Work, sleep, work."])
  ],
  /* an answer when nothing fits the topic */
  "overheard:reply": [
    R("overheard.reply", {}, ["Hm.", "That's how it is.", "#ohOath.cap#. What can you do.", "If you say so."])
  ]
};

export const OVERHEARD = {rules: RULES, symbols: SYMBOLS};
export const TOPICS = ["rumour", "times", "price", "watch", "faction", "secret", "feast", "weather", "work"];
