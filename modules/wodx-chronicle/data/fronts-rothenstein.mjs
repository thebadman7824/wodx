/**
 * Book one's fronts, roles and clue carriers (Rothenstein Rebuilt, spine part two, B4910-B4919), as Ben picked them on
 * the spine desk (2026-11-14). The words are our own short handles; the Storyteller's volumes keep the scenes' own words.
 * Pure data: front-rules.mjs reads it, pod.mjs keeps the state and shows the window.
 *
 * A front is a power in the valley that moves on its own when the company does nothing: `every` days of game time it
 * takes its next step, never before the step's chapter (`from`), and never in a week with a twist unless the company
 * pushed it. Each step has a sight on the map (`sight`: a scene by part of its name, and the marks to draw there), the
 * people and place the Storyteller's card names, street talk (`talk`), and saga clocks it moves (`moves`).
 *
 * Sight looks: kind (a look kind of WoDX Chronicle's looks layer), spots (how many), r (radius, as a share of the
 * scene's short side), mark or text (a sign drawn as words), color, line (spots in a row), wash (the whole scene).
 * Scene "@company" means the scene the company stands in.
 */
const DAY = 86400;

export const FRONTS = [
  {key: "court", label: "The court", who: "Voivode Bogdan Ursu", every: 7,
    aim: "A full and loyal household before the sire's answer comes from the east.",
    steps: [
      {key: "errand", label: "An errand on the first night", from: "c1", people: ["Bogdan Ursu"], place: "Kranzfels Keep",
        sight: {scene: "Kranzfels · The Outer Bailey", looks: [{kind: "fire", spots: 2, r: 0.04, mark: "torch"}, {kind: "calm", spots: 1, r: 0.05, text: "♞", color: "#c9b27a"}]},
        talk: "Riders left the keep before dawn on the voivode's business."},
      {key: "quarrel", label: "A quarrel settled through the company", from: "c2", people: ["Bogdan Ursu", "Richter Hannes Graff"], place: "The Great Hall",
        sight: {scene: "Kranzfels · Inner Ward and Great Hall", looks: [{kind: "fire", spots: 4, r: 0.03, mark: "torch", line: true}]},
        talk: "The voivode holds court tonight, and the council is called to it."},
      {key: "service", label: "The season's service demanded", from: "c6", people: ["Bogdan Ursu", "Sister Marta", "Konrad the Flesh-Smith"], place: "The Great Hall",
        sight: {scene: "Kranzfels · Inner Ward and Great Hall", looks: [{kind: "fire", spots: 6, r: 0.03, mark: "torch", line: true}]},
        talk: "Summons riders went to every house the voivode counts as owing service."},
      {key: "readied", label: "The rite readied", from: "c6", people: ["Bogdan Ursu", "Konrad the Flesh-Smith", "@mortal"], place: "The Ashfield",
        sight: {scene: "The Ashfield", looks: [{kind: "fire", spots: 5, r: 0.03, mark: "torch"}, {kind: "rubble", spots: 1, r: 0.08}]},
        talk: "Torches were seen on the keep road after midnight, going down to the dead field."},
      {key: "rite", label: "The rite performed", from: "c7", people: ["Bogdan Ursu", "Konrad the Flesh-Smith", "@mortal", "@voice"], place: "The Ashfield",
        sight: {scene: "The Ashfield", looks: [{kind: "fire", spots: 8, r: 0.03, mark: "torch"}, {kind: "taint", spots: 1, r: 0.15}]}, moves: {sleeper: 1},
        talk: "Something answered on the Ashfield. The dogs in the Lower Town would not stop."},
      {key: "waits", label: "Bogdan waits in the keep for the truth", from: "c9", people: ["Bogdan Ursu"], place: "Bogdan's chambers",
        sight: {scene: "Kranzfels · Upper Floor and Undercroft", looks: [{kind: "calm", spots: 1, r: 0.05, mark: "lantern"}]},
        talk: "One window of the keep stays lit all night now."}
    ]},
  {key: "cult", label: "Konrad's cult", who: "Konrad the Flesh-Smith", every: 7,
    aim: "Show the valley what is coming.",
    steps: [
      {key: "gift", label: "A gift to the hungriest newcomer", from: "c2", people: ["Konrad the Flesh-Smith"], place: "The Great Hall",
        sight: {scene: "Kranzfels · Inner Ward and Great Hall", looks: [{kind: "calm", spots: 1, r: 0.04, text: "✖", color: "#a01c1c"}]},
        talk: "The voivode's physician was kind to one of the new arrivals, they say."},
      {key: "shadow", label: "A retainer shadows the company", from: "c3", people: ["Konrad's retainer"], place: "@company",
        sight: {scene: "@company", looks: [{kind: "calm", spots: 1, r: 0.03, text: "●", color: "#4a3a3a"}]},
        talk: "A man in the keep's colours asks where the newcomers drink."},
      {key: "bought", label: "The inside man is bought", from: "c4", people: ["@inside", "@contact"], place: "The town hall",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "calm", spots: 1, r: 0.04, text: "✖", color: "#a01c1c"}]},
        talk: "Someone at the council has new boots and will not say where the coin came from."},
      {key: "galleries", label: "New galleries open below the Adit", from: "c4", people: ["Foreman Dalibor", "Jan the lamp-bearer"], place: "The Silver Adit",
        sight: {scene: "The Silver Adit", looks: [{kind: "rubble", spots: 3, r: 0.06}, {kind: "calm", spots: 4, r: 0.03, text: "✖", color: "#a01c1c"}]},
        talk: "The night shift dug where nobody told them to."},
      {key: "dig", label: "Changed miners answer to their names and dig", from: "c4", people: ["The changed miners", "Vesna"], place: "The mining camp",
        sight: {scene: "The Mining Camp and Adit Mouth", looks: [{kind: "calm", spots: 5, r: 0.02, text: "●", color: "#5a4a3a", line: true}]}, moves: {sleeper: 1},
        talk: "Fewer come up from each shift than went down, and the ones who do are quiet."},
      {key: "walk", label: "Changed miners walk the Lower Town at night", from: "c8", people: ["The changed miners"], place: "The Lower Town",
        sight: {scene: "Lower Town · West Gate and the Common", looks: [{kind: "calm", spots: 7, r: 0.02, text: "●", color: "#5a4a3a", line: true}, {kind: "calm", spots: 3, r: 0.03, text: "✖", color: "#a01c1c"}]},
        talk: "Miners walked in a line through the West Gate last night, and the gate did not stop them."},
      {key: "face", label: "The cult's kind face is seen in town", from: "c8", people: ["@contact"], place: "Market Square",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "calm", spots: 4, r: 0.03, text: "✖", color: "#a01c1c"}]},
        talk: "Red marks on doors in the square. Some say they keep the sickness out."},
      {key: "grove", label: "Konrad waits at the Grove's edge at dawn", from: "c9", people: ["Konrad the Flesh-Smith"], place: "The Old Grove",
        sight: {scene: "The Old Grove", looks: [{kind: "fog", spots: 1, r: 0.2}, {kind: "calm", spots: 1, r: 0.04, text: "✖", color: "#a01c1c"}]},
        talk: "A figure stands at the edge of the Old Grove every dawn, hands open."}
    ]},
  {key: "council", label: "The council", who: "Richter Hannes Graff", every: 14,
    aim: "The silver flowing and the second ledger hidden.",
    steps: [
      {key: "complaint", label: "A complaint at court", from: "c2", people: ["Richter Hannes Graff"], place: "The Great Hall",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "calm", spots: 1, r: 0.04, mark: "notice"}]},
        talk: "The Richter went up to the keep with a list of grievances."},
      {key: "letter", label: "A letter demanding an Adit inspection", from: "c6", people: ["Richter Hannes Graff", "@inside"], place: "The town hall",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "calm", spots: 3, r: 0.04, mark: "notice"}]},
        talk: "The council wants the Adit inspected. The voivode is holding the letter."},
      {key: "spears", label: "Mercenaries hired", from: "c7", people: ["Captain Ondrej", "Richter Hannes Graff"], place: "Market Square",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "calm", spots: 12, r: 0.02, text: "↑", color: "#b8b0a0", line: true}]},
        talk: "A dozen spears in the square, paid by the council."},
      {key: "dam", label: "The dam at the lower mill cut", from: "c8", people: ["Richter Hannes Graff"], place: "The lower mill",
        sight: {scene: "The Ford and Wenzel's Mill", looks: [{kind: "flood", spots: 2, r: 0.2}]},
        talk: "The mill race broke in the night and the low fields are under water."},
      {key: "burned", label: "The ledger burned", from: "c8", people: ["Richter Hannes Graff"], place: "Graff's house",
        sight: {scene: "Lower Town · Market Square", looks: [{kind: "smoke", spots: 1, r: 0.1}, {kind: "fire", spots: 1, r: 0.05}]},
        talk: "Smoke from the Richter's house. Papers, the servants say."},
      {key: "escape", label: "Graff's escape", from: "c9", people: ["Richter Hannes Graff"], place: "The toll-post",
        sight: {scene: "Toll-post and Ivo's Ferry", looks: [{kind: "calm", spots: 1, r: 0.05, text: "♞", color: "#c9b27a"}]},
        talk: "The Richter's shutters are closed and the Richter's horse is gone."}
    ]},
  {key: "church", label: "The Church", who: "Father Ludovic and Brother Anselm", every: 14,
    aim: "Name the thing and protect the flock.",
    steps: [
      {key: "writes", label: "Ludovic writes to the bishop", from: "c3", people: ["Father Ludovic"], place: "The presbytery", moves: {church: 1},
        sight: {scene: "Lower Town · Church Close", looks: [{kind: "calm", spots: 1, r: 0.04, mark: "lantern"}]},
        talk: "Father Ludovic sat up writing all night, and a boy took the letter south."},
      {key: "answer", label: "The diocese answers", from: "c5", people: ["Father Ludovic"], place: "Church of St. Aegidius", moves: {church: 1},
        sight: {scene: "Lower Town · Church Close", looks: [{kind: "calm", spots: 1, r: 0.05, text: "♞", color: "#e6dcc0"}]},
        talk: "A rider from the bishop came to the church and did not stay."},
      {key: "counts", label: "Anselm comes to count", from: "c5", people: ["@hunter"], place: "Dolany",
        sight: {scene: "Dolany Village", looks: [{kind: "calm", spots: 1, r: 0.03, text: "✚", color: "#e6dcc0"}]},
        talk: "A friar walks the villages asking who has died and how."},
      {key: "message", label: "Zofie's message reaches Ludovic", from: "c6", people: ["Father Ludovic", "Zofie", "Jindrich"], place: "Church Close",
        sight: {scene: "Lower Town · Church Close", looks: [{kind: "calm", spots: 1, r: 0.04, mark: "notice"}]},
        talk: "The priest has had a message from someone who saw the lady in white."},
      {key: "inquiry", label: "An inquiry with candles and a long table", from: "c8", people: ["Father Ludovic", "@hunter"], place: "Church of St. Aegidius", moves: {church: 2},
        sight: {scene: "Church of St. Aegidius", looks: [{kind: "fire", spots: 8, r: 0.02, mark: "lantern", line: true}]},
        talk: "The church has a long table in it now, and candles, and questions."},
      {key: "mob", label: "The mob at the church door", from: "c8", people: ["Father Ludovic", "Captain Ondrej", "Gizela the Midwife", "@hunter"], place: "The church door",
        sight: {scene: "Lower Town · Church Close", looks: [{kind: "fire", spots: 10, r: 0.025, mark: "torch"}]}, moves: {church: 1},
        talk: "Thirty with torches and poles at the church door. They want a name."}
    ]},
  {key: "marta", label: "Marta's watch", who: "Sister Marta", every: 21,
    aim: "Stop the rites without being seen to.",
    steps: [
      {key: "measures", label: "Marta measures the newcomers", from: "c1", people: ["Sister Marta"], place: "@company",
        sight: {scene: "@company", looks: [{kind: "calm", spots: 1, r: 0.03, text: "▲", color: "#3a3340"}]},
        talk: "The keep's chaplain asked after the newcomers, kindly."},
      {key: "asks", label: "Marta asks one of the company to watch Bogdan", from: "c6", people: ["Sister Marta"], place: "The keep chapel",
        sight: {scene: "@company", looks: [{kind: "calm", spots: 1, r: 0.03, text: "▲", color: "#3a3340"}]},
        talk: "Sister Marta is seen more often now where the newcomers are."},
      {key: "follows", label: "Marta follows the rite unseen", from: "c7", people: ["Sister Marta"], place: "The Ashfield",
        sight: {scene: "The Ashfield", looks: [{kind: "calm", spots: 1, r: 0.03, text: "▲", color: "#3a3340"}]},
        talk: "Someone in a hood was on the keep road behind the torches."},
      {key: "stones", label: "Marta stands at the stones, if asked", from: "c9", people: ["Sister Marta"], place: "The Old Grove",
        sight: {scene: "The Old Grove", looks: [{kind: "calm", spots: 1, r: 0.03, text: "▲", color: "#3a3340"}]},
        talk: "The chaplain was seen praying at the Grove stones."}
    ]},
  {key: "husbandman", label: "The Husbandman under the ridge", who: "The Red Husbandman", every: 14,
    aim: "Grow.",
    steps: [
      {key: "grey", label: "The Ashfield greys a field", from: "c3", people: [], place: "The fields", moves: {ashfield: 1},
        sight: {scene: "The Fields", looks: [{kind: "smoke", spots: 2, r: 0.15, color: "#7d7d78"}]},
        talk: "Another field went grey overnight. Nothing will grow in it."},
      {key: "lantern", label: "A lantern burns at the edge", from: "c3", people: ["Vesna"], place: "The Ashfield",
        sight: {scene: "The Ashfield", looks: [{kind: "fire", spots: 1, r: 0.03, mark: "lantern"}, {kind: "smoke", spots: 1, r: 0.2, color: "#7d7d78"}]},
        talk: "The widow keeps a lantern lit at the edge of the dead field."},
      {key: "singing", label: "Singing in the new galleries", from: "c4", people: ["Jan the lamp-bearer"], place: "The Silver Adit", moves: {sleeper: 1},
        sight: {scene: "The Silver Adit", looks: [{kind: "taint", spots: 1, r: 0.1}]},
        talk: "The miners say there is singing below the new galleries."},
      {key: "crack", label: "The crack in the hall", from: "c6", people: ["Bogdan Ursu"], place: "The Great Hall", moves: {sleeper: 1, ashfield: 1},
        sight: {scene: "Kranzfels · Inner Ward and Great Hall", looks: [{kind: "rubble", spots: 1, r: 0.06}]},
        talk: "There is a crack in the floor of the great hall. The voivode calls it settling."},
      {key: "voice", label: "A voice at the rite", from: "c7", people: ["@voice"], place: "The Ashfield", moves: {sleeper: 1},
        sight: {scene: "The Ashfield", looks: [{kind: "taint", spots: 1, r: 0.25}, {kind: "quake", spots: 0}]},
        talk: "The ground spoke on the Ashfield. Those who heard will not say what it said."}
    ]}
];

/**
 * The judgements: not fronts but one choice each, which sets a later chapter. The Storyteller marks it in the saga
 * window; when the chapter comes, the card says what follows.
 */
export const JUDGEMENTS = [
  {key: "reinhold", label: "Reinhold the knight", ask: "Did the company lie to Reinhold about the cousin?",
    choices: {
      lied: {label: "They lied", chapter: "c7", text: "Reinhold comes back with kin, and many horses stand on the bridge.",
        sight: {scene: "The Ford", looks: [{kind: "calm", spots: 6, r: 0.03, text: "♞", color: "#c9b27a", line: true}]}, talk: "Knights on the bridge, with their kin, asking for the newcomers by name."},
      truth: {label: "They told the truth", chapter: "c8", text: "Reinhold owes the company a debt it can call in from now on."}
    }},
  {key: "yaroslava", label: "Baba Yaroslava's judgement", ask: "After the company's first visit to Dolany, what did Yaroslava decide?",
    choices: {
      trust: {label: "Trusted them", chapter: "c9", text: "The Words of the binding are offered at the choosing, by @words."},
      refuse: {label: "Did not trust them", chapter: "c9", text: "The Words are not offered. The company must take them from @words, or do without."}
    }}
];

/**
 * The roles: a part the story needs, and who plays it as people fall. `line` is the order of succession; `pick`
 * "trust" means the one the company has leaned on most; the last of a line marked `lasts` cannot fall (it is a thing,
 * or someone found when needed). `twist` names a twist whose heart takes the first holder out.
 */
export const ROLES = [
  {key: "contact", label: "The ally who is not", text: "The trusted contact Konrad has paid for months.", pick: "trust",
    line: ["Mikhal the Tinker", "Tomas", "Jitka", "Ivo the Ferryman"]},
  {key: "words", label: "The keeper of the Words", text: "Who holds the Words of the binding.", lasts: true,
    line: ["Baba Yaroslava", "An elder who sat at the Dolany fire", "The burned pages at Radu's fire"]},
  {key: "price", label: "The Price", text: "The debtor of the first binding, who pays when it is made again.",
    line: ["Old Radu", "A character who took the Husbandman's gift", "Bogdan Ursu"]},
  {key: "hunter", label: "The hunter at the door", text: "Who comes to count the dead and name the thing.", lasts: true,
    line: ["Brother Anselm", "Father Ludovic's inquiry", "A hunter sent from the diocese"]},
  {key: "voice", label: "The voice of the Husbandman", text: "Who speaks for it between chapters. At the rite itself, whatever stands nearest speaks: a mortal, the soil, a cut hand.", lasts: true,
    line: ["Konrad the Flesh-Smith", "A changed miner"]},
  {key: "mortal", label: "The mortal for the rite", text: "Who stands bound on the Ashfield. If the company delivered someone, it is them.", lasts: true,
    line: ["Peter", "A resident of the Herd"]},
  {key: "inside", label: "Konrad's inside man at the council", text: "Who carries the council's secrets to the Adit.", twist: {n: 24, variant: "killed"},
    line: ["The margrave's clerk", "A councillor in Graff's debt"]},
  {key: "courier", label: "The courier east", text: "The rider Bogdan sends to the sire. If stopped, the next goes a week later.", courier: true,
    line: ["A rider from Bogdan's retainers"]}
];
/** A week before the next courier rides, after one is stopped. */
export const COURIER_GAP = 7 * DAY;

/**
 * The clues: a fact of the plot and its three carriers (a person, a place, a thing). Each carrier found pins a card on
 * the case board with the hint; the third pins the whole of it.
 */
export const CLUES = [
  {key: "konrad", label: "Konrad leads the cult", hint: "Someone close to the voivode stands behind the changed miners.",
    whole: "Konrad the Flesh-Smith leads the cult in the Adit.",
    carriers: [{kind: "person", label: "Jan the lamp-bearer"}, {kind: "place", label: "The red marks in the new galleries"}, {kind: "thing", label: "The retainer's note, or Konrad's ledger under the keep"}]},
  {key: "words", label: "The binding's Words", hint: "The old binding had words, and someone still keeps them.",
    whole: "Baba Yaroslava's line keeps the Words that made the binding.",
    carriers: [{kind: "person", label: "Baba Yaroslava"}, {kind: "place", label: "The stones of the Old Grove"}, {kind: "thing", label: "The burned pages at Radu's fire"}]},
  {key: "price", label: "Radu is the Price", hint: "The first binding was bought, and the debt was never paid.",
    whole: "Old Radu is the debtor of the first binding.",
    carriers: [{kind: "person", label: "Radu, and the tale told three ways"}, {kind: "place", label: "The ring in the ruins of Altenhof"}, {kind: "thing", label: "The arrow in the Grove"}]},
  {key: "sire", label: "The sire is silent", hint: "The voivode is waiting on an answer from the east.",
    whole: "Bogdan's sire has gone silent, and no answer is coming.",
    carriers: [{kind: "person", label: "The courier, or the hunt's survivor"}, {kind: "place", label: "The ridge road where the rider fell"}, {kind: "thing", label: "The black-wax letter"}]},
  {key: "ledger", label: "Graff's second ledger", hint: "The silver counts at the council do not add up.",
    whole: "Richter Graff keeps a second ledger of the silver.",
    carriers: [{kind: "person", label: "The margrave's clerk"}, {kind: "place", label: "The strongroom in Graff's house"}, {kind: "thing", label: "Ash from the Lower Town fire"}]},
  {key: "miners", label: "The missing miners went down", hint: "The miners who vanished did not leave the valley.",
    whole: "The missing miners went down into the new galleries, and were changed there.",
    carriers: [{kind: "person", label: "Vesna at the lantern"}, {kind: "place", label: "The new galleries the foreman will not report"}, {kind: "thing", label: "Matej's tools, found below"}]}
];

/** Book one's chapters in order (as in twists-rothenstein.mjs). */
export const CHAPTERS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];
/** A twist's week: fronts keep out of it unless pushed. */
export const WEEK = 7 * DAY;
export {DAY};
