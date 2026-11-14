/**
 * The Rothenstein saga (B3660-B3669): What Sleeps Beneath Rothenstein told over years and ages instead of ten
 * nights. Data only; saga-rules.mjs checks it and turns each book into a story chain the clock deals out.
 *
 * A book is a run of dated steps. A chapter is a night of play (the old session pages are its notes, unchanged). An
 * interlude is the time between: the seasons turn, the valley changes, the long clocks move and the seasonal
 * encounters fit. A world step is something the wider world does to the valley. The step's `at` is [year, month,
 * day]; the gap between two steps on the clock is the gap between their dates.
 *
 * `by` gives a step other words after an earlier book's ending (key = ending). `clocks` moves the saga's long clocks.
 * `town` names what the step does to the valley's town (WoDX Storyteller's towns over time; B3670).
 * `signal` is a note in the omens shape {kind, region, weight, words} for systems that read the world's signals.
 * `ending` lists the endings the Storyteller picks from when the step comes. Real people stay offstage.
 */

/** The long clocks the saga keeps from book to book. */
export const SAGA_CLOCKS = [
  {key: "sleeper", label: "The Red Husbandman stirs", size: 10, text: "How awake the thing under the ridge is. Full, and it walks the valley in a body of its choosing."},
  {key: "ashfield", label: "The Ashfield spreads", size: 8, text: "The dead ground. Each segment is a field, a farm or a street lost to it."},
  {key: "church", label: "The Church's eye on the valley", size: 8, text: "How close the Church, and later the state, is to learning what rules Rothenstein."},
  {key: "charter", label: "The Charter holds", size: 6, text: "Whether the valley's Kindred keep one law among themselves. Empty, and it is every one for themself."}
];

/** The endings of the first book, which later books answer. */
export const SAGA_ENDINGS = {
  seal: {label: "Sealed", text: "The old binding was made again. The Husbandman sleeps under the stone, and the binding must be kept."},
  sever: {label: "Severed", text: "The valley's tie to the Husbandman was cut. The ground heals slowly, and the thing went somewhere else."},
  take: {label: "Taken", text: "Someone took what the Husbandman offered. The door is held open from this side now, by one of the company."}
};

const s = (key, kind, at, title, text, more = {}) => ({key, kind, at, title, text, ...more});

export const SAGA = {
  key: "rothenstein",
  title: "What Sleeps Beneath Rothenstein",
  where: "Rothenstein",
  region: "moravia",
  origin: {year: 906, era: "migration-age", text: "In the last years of Great Moravia, when the Magyars broke the realm, the valley's first people bound something under the red ridge with a rite of stones, blood and a promise to keep feeding it a little. The Old Grove is what is left of the rite. Nobody living remembers the promise, but the ground does."},
  books: [
    {key: "prologue", n: 0, title: "The Binding", from: 880, to: 906, era: "migration-age", journal: null, lines: ["all"], prologue: true,
      text: "A prologue for those who start before the town: the valley in the days of Great Moravia.",
      steps: [
        s("grove", "chapter", [880, 9, 1], "The ring of stones", "A Moravian lord's people raise the stones on the ridge where the cattle sicken. A wise woman says the hill is hungry and must be fed or bound."),
        s("raid", "world", [902, 6, 1], "Riders on the plain", "Magyar horsemen burn the lowland villages. The valley's people hide in the caves under the ridge and hear something breathing in the rock.", {clocks: {sleeper: 1}}),
        s("bind", "chapter", [906, 10, 31], "The promise", "With the realm falling, the elders bind the thing under the ridge and promise it one life a generation. The rite holds, and the story waits three hundred years.", {clocks: {sleeper: -1}})
      ]},
    {key: "red-stone", n: 1, title: "What Sleeps Beneath Rothenstein", from: 1197, to: 1202, era: "dark-ages", journal: "What Sleeps Beneath Rothenstein", lines: ["all"],
      text: "The first book, told over five years instead of ten nights. Each chapter is a night of play; between them the seasons turn and the valley goes on without the company.",
      doors: {
        vampire: "Bogdan's invitation and the Charter bring the Kindred in, as before.",
        werewolf: "The Ashfield is a wound in the land the Garou can smell from the passes; a caern's spirits go quiet.",
        mage: "The Old Grove is a node gone sour, and the Adit's ore rings wrong under a Hermetic's hand.",
        changeling: "The valley's dreams have a red taste, and a freehold's hob says the Husbandman eats stories too.",
        wraith: "The miners who died in the deep galleries cannot cross; their Shadowlands are a field of ash.",
        hunter: "Brother Anselm's watch and the bishop's letters are the hunters' way in; the inquisitors of the age come later.",
        mortal: "A settler family, a miner's widow or the reeve's clerk sees one thing too many."
      },
      steps: [
        s("c1", "chapter", [1197, 10, 1], "Chapter I: The guest-feast", "The strangers come down the one road, swear the Charter and are offered the welcome-feeding. Play the session notes for the first night.", {journal: "Session 1"}),
        s("i1", "interlude", [1197, 11, 20], "First snow", "The High Pass closes for the winter. The newcomers learn the valley's feeding grounds and who owns them. Fit encounters: The Winter Pack, A Stranger at the Toll-Post.", {encounters: ["Encounter 10", "Encounter 13"]}),
        s("c2", "chapter", [1197, 12, 25], "Chapter II: The midwinter court", "The first full court at Kranzfels at Christmastide. Marta, Konrad and Radu are met, and one of the company is set between two factions.", {journal: "Session 2"}),
        s("i2", "interlude", [1198, 3, 25], "The thaw", "Spring opens the road. The Ashfield has taken another strip of plough land over the winter, and a miner went into the Adit and did not come out.", {clocks: {ashfield: 1}, encounters: ["Encounter 04", "Encounter 14"], signal: {kind: "saga", weight: 1, words: "the dead field grows in the Moravian valley"}}),
        s("c3", "chapter", [1198, 4, 20], "Chapter III: The missing miner", "The dead field and the missing miner. Something is still moving that should have stopped. The first part ends: nobody can pretend the valley is right.", {journal: "Session 3"}),
        s("i3", "interlude", [1198, 8, 15], "Harvest", "A thin harvest. The council presses the Adit harder to pay for a stone wall, and Bogdan sends a sealed letter east with a trusted courier.", {clocks: {sleeper: 1}, encounters: ["Encounter 02", "Encounter 15"]}),
        s("c4", "chapter", [1198, 10, 10], "Chapter IV: The first descent", "Into the galleries no miner dug. Changed miners answer to their names, and Konrad is at home among them.", {journal: "Session 4"}),
        s("i4", "interlude", [1199, 1, 15], "The hungry winter", "A long winter in a sealed valley. Konrad's changed miners grow in number; cattle in Dolany are born wrong. Time for downtime, feeding and the Herd.", {clocks: {sleeper: 1}, encounters: ["Encounter 17", "Encounter 22"]}),
        s("c5", "chapter", [1199, 5, 1], "Chapter V: The older name", "Real lore, paid for. Old Radu, Baba Yaroslava and the village elders tell what the Grove was for, and the Grove's older name.", {journal: "Session 5"}),
        s("i5", "interlude", [1199, 11, 1], "A year turns", "The council's wall goes up around the Lower Town. Father Ludovic writes to the bishop for the first time. The weavers win a guild charter, and Graff wants a seat for the silver.", {clocks: {church: 1}, encounters: ["Encounter 06", "Encounter 24"], signal: {kind: "saga", weight: 1, words: "a priest's letters about a Moravian town reach the bishop"}}),
        s("c6", "chapter", [1200, 3, 1], "Chapter VI: The price of loyalty", "Lent of the year 1200. Bogdan demands more, Marta asks for a spy, and a trusted contact proves to be Konrad's.", {journal: "Session 6", clocks: {charter: -1}}),
        s("i6", "interlude", [1200, 7, 20], "The dry summer", "Drought. The Ashfield crosses the brook, and wells near it taste of iron. Pilgrims pass through on the road to the shrine, one with a relic nobody suspects.", {clocks: {ashfield: 1}, encounters: ["Encounter 19", "Encounter 16"]}),
        s("c7", "chapter", [1200, 9, 29], "Chapter VII: The Voice", "Michaelmas. Grafted flesh, a vision and a voice offering something true for something small. The second part ends.", {journal: "Session 7", clocks: {sleeper: 1}}),
        s("i7", "interlude", [1201, 4, 1], "The bishop's decree", "The bishop orders an inquiry into Rothenstein. Anselm watches from the North Wood. The friar on the heresy circuit, the exorcist and the witch-finder come in over the spring and summer, one at a time.", {clocks: {church: 2}, encounters: ["Encounter 20", "Encounter 21"], signal: {kind: "saga", weight: 2, words: "the Church opens an inquiry into a Moravian valley"}}),
        s("c8", "chapter", [1201, 8, 15], "Chapter VIII: The net", "The secret can no longer be kept safely. Anselm or Ludovic acts, Konrad's cult shows itself, and the company must manage their own exposure and the blight together.", {journal: "Session 8"}),
        s("i8", "interlude", [1201, 12, 1], "The long gathering", "The pass shuts again. Over the winter the pieces of the old binding rite are found one by one through Yaroslava, and Bogdan overreaches.", {clocks: {charter: -1}, encounters: ["Encounter 08", "Encounter 09"]}),
        s("c9", "chapter", [1202, 4, 13], "Chapter IX: Seal, sever or take", "The Easter vigil of 1202. The final choice. Bogdan is confronted, weaker than ever, and the temptation to devour Bogdan is real.", {journal: "Session 9"}),
        s("c10", "chapter", [1202, 6, 23], "Chapter X: Saint John's Eve", "Midsummer night. The ending the company chose plays out and the Husbandman partly shows itself. Pick the ending in the saga window.", {journal: "Session 10", ending: ["seal", "sever", "take"], signal: {kind: "saga", weight: 3, words: "something under a Moravian ridge shows itself on Saint John's Eve"}}),
        s("e1", "interlude", [1202, 11, 1], "The years after", "The valley counts its dead and its debts. The answer to Bogdan's bid comes, or does not. A year later a silent envoy from Constantinople rides in.", {
          by: {seal: "The binding holds. The Ashfield stops growing, though nothing grows on it yet. Someone must keep the rite each year.", sever: "The ground starts to heal at the edges. Shepherds say the thing under the ridge went east with the spring floods.", take: "The valley is quiet in the wrong way. One of the company sleeps badly and wakes with dirt under their nails."},
          clocks: {church: -1}})
      ]},
    {key: "patriarch", n: 2, title: "The Patriarch's Last Dream", from: 1203, to: 1204, era: "dark-ages", journal: "The Patriarch's Last Dream (GM only)", lines: ["vampire"],
      text: "One winter in Constantinople, while the valley goes on without the company. Home news comes by letter between chapters.",
      steps: [
        s("c1", "chapter", [1203, 11, 20], "Chapter I: The envoy", "Theodora the Silent reaches Rothenstein with Michael's summons.", {journal: "Session 1"}),
        s("c2", "chapter", [1203, 12, 10], "Chapter II: The road south", "Six weeks of winter roads through Hungary and the Balkans.", {journal: "Session 2"}),
        s("c3", "chapter", [1204, 1, 8], "Chapter III: The city across the water", "Arrival in a city of rival courts, with a crusader army camped outside.", {journal: "Session 3"}),
        s("h1", "interlude", [1204, 1, 10], "A letter from home", "A courier brings news of the valley: who holds Kranzfels while the company is away, and how the year's rite went.", {by: {seal: "The rite was kept, but the keeper wants paying.", sever: "Radu writes that the Ashfield greens at its edges.", take: "The letter is in a hand the reader knows, and says nothing is wrong three times."}}),
        s("c4", "chapter", [1204, 1, 12], "Chapter IV: The Patriarch", "Michael's court in the Hagia Sophia.", {journal: "Session 4"}),
        s("c5", "chapter", [1204, 1, 16], "Chapter V: The Latin Quarter", "Bishop Alfonzo's Kindred and the Venetian fleet.", {journal: "Session 5"}),
        s("c6", "chapter", [1204, 1, 20], "Chapter VI: The Covenant of the Three", "The Brujah, Nosferatu and Gangrel who swore to defend the Dream.", {journal: "Session 6"}),
        s("c7", "chapter", [1204, 1, 24], "Chapter VII: The humble man", "The conspiracy inside the household comes into view.", {journal: "Session 7"}),
        s("c8", "world", [1204, 1, 28], "Chapter VIII: The winter coup", "A coup in the mortal palace, and one in the Patriarch's household.", {journal: "Session 8"}),
        s("c9", "chapter", [1204, 4, 12], "Chapter IX: The night of fire", "The crusaders breach the walls. At the stair, the devourer comes.", {journal: "Session 9", signal: {kind: "saga", weight: 3, words: "Constantinople burns, and a dreamer dies or does not"}}),
        s("c10", "chapter", [1204, 5, 1], "Chapter X: After the fire", "What came after, and the long road home with whatever was saved.", {journal: "Session 10"}),
        s("home", "interlude", [1204, 8, 1], "Home again", "The company reach the valley after half a year away. Bogdan's courier rode east again while they were gone.", {clocks: {sleeper: 1}})
      ]},
    {key: "lantern", n: 3, title: "The Lantern and the Flame", from: 1209, to: 1216, era: "dark-ages", journal: "The Lantern and the Flame (GM only)", lines: ["vampire", "hunter", "mortal"],
      text: "Seven years of the Kindred of Bohemia and Moravia trying to stand together, and the Church learning to look.",
      steps: [
        s("c1", "chapter", [1209, 10, 1], "Chapter I: The lantern on the ferry", "Brother Dominik meets the company at the Rothenstein ferry, back from what the crusade found in Languedoc.", {journal: "Session 1", clocks: {church: 1}}),
        s("c2", "chapter", [1210, 4, 1], "Chapter II: Counting allies", "The Kindred of the two lands are counted, and most of them do not want to be.", {journal: "Session 2"}),
        s("c3", "chapter", [1210, 10, 1], "Chapter III: The court at Prague", "Prince Vojtech's court, and the first meeting that might become a council.", {journal: "Session 3", clocks: {charter: 1}}),
        s("i1", "interlude", [1211, 3, 1], "The informers' year", "Letters cross the land. Each court suspects the others of talking to friars.", {clocks: {church: 1}}),
        s("c4", "chapter", [1211, 6, 1], "Chapter IV: The informant", "Someone close is passing names to the Lantern Brothers.", {journal: "Session 4"}),
        s("c5", "chapter", [1212, 2, 1], "Chapter V: The chapter-house", "Inside the Lantern Brothers' own house.", {journal: "Session 5"}),
        s("c6", "chapter", [1212, 8, 1], "Chapter VI: The heretics' pyre", "A burning, and who is on it.", {journal: "Session 6", clocks: {church: 1}}),
        s("c7", "chapter", [1213, 5, 1], "Chapter VII: The compromise", "A truce between the Kindred and the brothers, and what it costs.", {journal: "Session 7"}),
        s("c8", "chapter", [1214, 1, 1], "Chapter VIII: The great silence", "The brothers stop writing. Nobody knows why.", {journal: "Session 8"}),
        s("c9", "chapter", [1215, 11, 11], "Chapter IX: The trial", "While the bishops meet at the Lateran in Rome, a trial in Bohemia decides who is a heretic.", {journal: "Session 9"}),
        s("c10", "chapter", [1216, 2, 1], "Chapter X: The long dark", "The Lantern Brothers end, and something harder takes their place.", {journal: "Session 10"})
      ]},
    {key: "enoch", n: 4, title: "The Road to Enoch", from: 1217, to: 1221, era: "dark-ages", journal: "The Road to Enoch (GM only)", lines: ["vampire"],
      text: "Three years on the road east, from the valley to the marshes of Mesopotamia, while the Fifth Crusade sails for Egypt.",
      steps: [
        s("c1", "chapter", [1217, 4, 1], "Chapter I: What the ledger said", "Konrad's ledger, a name and a route.", {journal: "Session 1"}),
        s("c2", "chapter", [1217, 6, 1], "Chapter II: The black-wax letter", "Following Bogdan's courier east.", {journal: "Session 2"}),
        s("c3", "chapter", [1217, 8, 1], "Chapter III: Esztergom", "The Hungarian court and its Gangrel.", {journal: "Session 3"}),
        s("c4", "chapter", [1217, 11, 1], "Chapter IV: The Iron Gates", "Down the Danube gorge.", {journal: "Session 4"}),
        s("h1", "interlude", [1218, 2, 1], "Winter at Studius", "A winter among the books. A letter from the valley says the rite is due and nobody wants to keep it.", {clocks: {sleeper: 1}}),
        s("c5", "chapter", [1218, 3, 1], "Chapter V: The Studius library", "The Obertus scholars and their books.", {journal: "Session 5"}),
        s("c6", "chapter", [1218, 5, 1], "Chapter VI: The Scribes of Nod", "A disputation, and a book that should not be opened.", {journal: "Session 6"}),
        s("c7", "chapter", [1218, 10, 1], "Chapter VII: The Syrian road", "Into the caliph's lands.", {journal: "Session 7"}),
        s("c8", "chapter", [1219, 3, 1], "Chapter VIII: Baghdad", "The city of books, and a guide into the marshes.", {journal: "Session 8"}),
        s("c9", "chapter", [1219, 9, 1], "Chapter IX: The marshes", "Off the edge of the maps.", {journal: "Session 9"}),
        s("c10", "chapter", [1220, 1, 1], "Chapter X: Enoch", "Mircea the Silent, and what Enoch is.", {journal: "Session 10"}),
        s("home", "interlude", [1221, 6, 1], "The road home", "A year's road back. The valley has had four years without the company.", {clocks: {ashfield: 1}})
      ]},
    {key: "hounds", n: 5, title: "The Hounds of God", from: 1231, to: 1236, era: "dark-ages", lines: ["all"],
      text: "The papacy takes the hunt for heresy into its own hands, and the friars who once carried the lantern come back with warrants.",
      steps: [
        s("bull", "world", [1231, 3, 1], "The Pope's inquisitors", "Inquisitors answerable only to Rome are sent out from the friars' houses. The Inquisition comes to town story chain can start from here.", {clocks: {church: 2}, signal: {kind: "saga", weight: 2, words: "the Pope's inquisitors are sent north"}}),
        s("old-friend", "chapter", [1233, 5, 1], "An old face", "One of the inquisitors was a novice of the Lantern Brothers and remembers the company's faces from 1209."),
        s("ledger", "chapter", [1235, 9, 1], "The valley's ledger", "The inquisitor asks for the parish books of St. Aegidius, where Father Ludovic wrote down more than was wise.", {clocks: {church: 1}}),
        s("quiet", "chapter", [1236, 4, 1], "A quiet answer", "The inquisitor is bought, buried, turned or obeyed. The Church remembers the valley either way.")
      ]},
    {key: "riders", n: 6, title: "Riders from the East", from: 1240, to: 1242, era: "dark-ages", lines: ["all"],
      text: "The Mongol host comes through Moravia. The sleeper wakes to the smell of so much death.",
      steps: [
        s("news", "world", [1240, 12, 1], "News from Kyiv", "Refugees say a great city in the east has fallen to riders who do not stop.", {signal: {kind: "saga", weight: 2, words: "riders from the steppe are coming west"}}),
        s("host", "world", [1241, 4, 9], "The host in Moravia", "After the battle in Silesia, the riders turn south through Moravia. Villages burn on the plain.", {town: "war", clocks: {sleeper: 1}}),
        s("refuge", "chapter", [1241, 5, 1], "The caves under the ridge", "The valley's people hide in the caves, as their ancestors did in 902, and the thing in the rock wakes to them.", {by: {seal: "The binding must be kept with a full valley of frightened people sleeping on top of it.", sever: "The caves are empty of it, but something has been living there since it left.", take: "Whoever holds the door could close the caves to the riders, for a price."}}),
        s("gone", "chapter", [1242, 3, 1], "The riders turn back", "News comes that the Great Khan is dead, and the host goes home. The valley counts who did not come out of the caves.")
      ]},
    {key: "silver", n: 7, title: "Silver Under the Hill", from: 1290, to: 1305, era: "dark-ages", lines: ["all"],
      text: "A silver rush in Bohemia and the king's new mining law bring miners, money and greed back to the Adit.",
      steps: [
        s("rush", "world", [1290, 5, 1], "The rush", "Word of rich silver in Bohemia brings German miners east again. The council reopens the old Adit.", {town: "boom", clocks: {ashfield: 1}}),
        s("law", "world", [1300, 6, 1], "The king's mining law", "A new royal mining code makes the silver the crown's. A royal mint-master comes to count the Adit.", {clocks: {church: 1}}),
        s("deep", "chapter", [1301, 9, 1], "The new galleries", "The miners break into galleries from 1198. Some of the names scratched on the walls belong to people still living."),
        s("strike", "chapter", [1303, 4, 1], "The strike", "The miners down tools. The mint-master wants it settled by force, and the Kindred want it settled quietly."),
        s("settle", "chapter", [1305, 6, 1], "What the silver bought", "The Adit is sealed again, or worked to the bottom. Either way someone grew rich, and someone stayed down there.")
      ]},
    {key: "plague", n: 8, title: "The Plague That Passed", from: 1348, to: 1381, era: "long-night", lines: ["all"],
      text: "The Black Death spares most of Bohemia and Moravia in 1348. In Rothenstein that mercy had a price, and the bill comes due when the plague returns.",
      steps: [
        s("ships", "world", [1348, 6, 1], "The south is dying", "Every road brings worse news from Italy and the German lands. The valley waits for it.", {signal: {kind: "saga", weight: 2, words: "the great death is in the south and coming north"}}),
        s("pass", "chapter", [1349, 5, 1], "The plague goes round", "The sickness takes the towns on the plain and passes the valley by. A child in Dolany says the hill asked for one thing instead.", {clocks: {sleeper: 1},
          by: {seal: "The keeper of the binding is the one asked. The price is a life, as the old promise said.", sever: "The thing is not here to bargain. The mercy came from somewhere else, and that is worse.", take: "The one who holds the door made the bargain without asking anyone."}}),
        s("blame", "chapter", [1350, 3, 1], "Who paid", "Flagellants come through and ask why Rothenstein was spared. Their answer is a scapegoat.", {clocks: {church: 1}}),
        s("return", "world", [1380, 8, 1], "The plague comes back", "A new wave of the pestilence reaches Moravia. This time the hill does not turn it aside.", {town: "plague", clocks: {sleeper: 1}}),
        s("after", "chapter", [1381, 5, 1], "Fewer and bolder", "Half the Lower Town is gone. Wages rise, fields lie empty, and the Ashfield takes what nobody ploughs.", {clocks: {ashfield: 1}})
      ]},
    {key: "chalice", n: 9, title: "The Chalice and the Sword", from: 1415, to: 1436, era: "long-night", lines: ["all"],
      text: "The Hussite wars. Moravia stays mostly loyal to the Church and the king while Bohemia rises, and the valley sits on the border between them.",
      steps: [
        s("fire", "world", [1415, 7, 6], "A preacher burned", "Jan Hus is burned at Constance. The Czech villages of the valley grieve, and the German town is afraid.", {signal: {kind: "saga", weight: 2, words: "a Bohemian preacher is burned and the land rises"}}),
        s("split", "chapter", [1420, 6, 1], "Two churches", "Dolany takes the chalice; the Lower Town keeps the Pope. St. Aegidius is shut, and the Kindred who hid in the Church lose their cover.", {clocks: {charter: -1}}),
        s("raid", "chapter", [1423, 9, 1], "The wagon-fort", "A Hussite field army comes up the valley road. Kranzfels is besieged by people who do not fear priests.", {town: "siege", clocks: {sleeper: 1}}),
        s("grove", "chapter", [1428, 4, 30], "Night at the Grove", "The radicals burn shrines and idols. Someone marches on the Old Grove to break the stones.", {
          by: {seal: "Breaking the stones would break the binding. The company must stop people who think they are doing God's work.", sever: "The stones mean nothing now, but the radicals find what lives in the caves.", take: "The holder of the door could let the radicals break the stones, and finish the binding for good."}}),
        s("peace", "world", [1436, 7, 5], "The Compacts", "The council's peace is read at Jihlava. The wars end, the valley's two churches live side by side, and old debts are settled in the dark.")
      ]},
    {key: "burning-valley", n: 10, title: "The Burning Valley", from: 1618, to: 1650, era: "age-of-reason", lines: ["all"],
      text: "The Thirty Years War. Rebellion, defeat at the White Mountain, conversions by force and, late in the war, the Swedes in Moravia.",
      steps: [
        s("window", "world", [1618, 5, 23], "Out of the window", "The Bohemian estates throw the emperor's men from a Prague window. Moravia joins the revolt in 1619.", {signal: {kind: "saga", weight: 2, words: "Bohemia is in revolt and war is coming"}}),
        s("white", "world", [1620, 11, 8], "The White Mountain", "The rebels are broken near Prague. Protestant lords lose their lands, and the valley gets a new Catholic master from Vienna.", {clocks: {church: 1}}),
        s("convert", "chapter", [1624, 3, 1], "Convert or leave", "The new lord's Jesuits come with a list. Families of the valley go into exile or kneel. The Herd is broken up.", {town: "exile", clocks: {charter: -1}}),
        s("swedes", "chapter", [1645, 5, 1], "The Swedes at the pass", "A Swedish army besieges Brno and forages through the hills. Soldiers dig into the ridge for treasure.", {town: "siege", clocks: {sleeper: 1}}),
        s("hunger", "chapter", [1647, 2, 1], "The hungry years", "Plague, famine and wolves after the armies. The Ashfield spreads into fields nobody is alive to plough.", {town: "famine", clocks: {ashfield: 1}}),
        s("peace", "world", [1648, 10, 24], "Peace", "The peace is signed in Westphalia. Half the villages of the valley are empty.")
      ]},
    {key: "commissioner", n: 11, title: "The Witch-Commissioner", from: 1678, to: 1696, era: "age-of-reason", lines: ["all"],
      text: "Witch trials in northern Moravia, run by a commissioner who answers to nobody. Invented here: the commissioner, the accused and the court.",
      steps: [
        s("arrive", "chapter", [1679, 3, 1], "The commissioner comes", "A lawyer with a warrant for witches arrives from the north, where the fires have already been lit.", {clocks: {church: 1}}),
        s("names", "chapter", [1680, 6, 1], "Names under question", "A herbwife of Dolany names others under torture. Some of the names are true.", {signal: {kind: "saga", weight: 2, words: "witch-trials spread through Moravian valleys"}}),
        s("plague", "world", [1680, 9, 1], "The plague of 1680", "Plague comes through the crown lands. The commissioner blames the witches.", {town: "plague"}),
        s("grove", "chapter", [1684, 4, 30], "Walpurgis night", "The commissioner wants the Old Grove's stones as evidence.", {by: {seal: "Moving the stones would break the binding.", sever: "The stones are only stones, but the commissioner believes otherwise.", take: "The holder of the door has been feeding the commissioner names."}}),
        s("end", "chapter", [1696, 1, 1], "The fires go out", "A complaint reaches Vienna and the trials stop. The valley remembers who named whom for three hundred years.")
      ]},
    {key: "patents", n: 12, title: "The Emperor's Patents", from: 1781, to: 1790, era: "age-of-reason", lines: ["all"],
      text: "Joseph II's reforms: the end of serfdom, toleration, closed monasteries and a new kind of mine.",
      steps: [
        s("tolerance", "world", [1781, 10, 13], "The edict of tolerance", "Lutherans and the Reformed may worship again. Families who hid their faith for a hundred and sixty years come out of hiding."),
        s("patent", "world", [1781, 11, 1], "Free to leave", "The emperor's patent lets the valley's peasants leave the land and marry without the lord's leave. Many go to the cities.", {clocks: {charter: -1}}),
        s("mine", "chapter", [1783, 5, 1], "Engineers in the Adit", "A mining company from Vienna surveys the old Adit with new pumps and a geologist who measures everything.", {clocks: {sleeper: 1}}),
        s("cloister", "chapter", [1786, 4, 1], "The convent is closed", "The emperor shuts the convent where Marta's line has hidden for centuries. Its archive is sold by the cartload.", {clocks: {church: -1}}),
        s("reason", "chapter", [1789, 9, 1], "The geologist's report", "The survey reaches the deep galleries. The report goes to Vienna, and someone there takes an interest."),
        s("death", "world", [1790, 2, 20], "The emperor dies", "Most of the reforms are taken back. Serfdom's end stays.")
      ]},
    {key: "nations", n: 13, title: "The Spring of Nations", from: 1848, to: 1867, era: "victorian", lines: ["all"],
      text: "Revolution, the end of labour dues, Czech and German neighbours becoming two nations, and the war of 1866 with cholera behind it.",
      steps: [
        s("rising", "world", [1848, 3, 13], "The revolution", "Vienna rises. Labour dues on the land end that summer. The valley's Czech and German halves argue in two languages about what they are.", {signal: {kind: "saga", weight: 2, words: "revolution spreads through the Austrian lands"}}),
        s("rail", "chapter", [1852, 5, 1], "The railway survey", "Engineers want a line through the valley and a cutting through the red ridge.", {clocks: {sleeper: 1}, by: {seal: "A cutting through the ridge would cut through the binding.", sever: "The cutting opens caves that something has been living in since 1202.", take: "The holder of the door has shares in the railway."}}),
        s("schools", "chapter", [1860, 9, 1], "Two schools", "The town splits into a Czech school and a German one. Old families take sides, and so do the Kindred who feed on them.", {clocks: {charter: -1}}),
        s("war", "world", [1866, 7, 3], "The Prussians", "After the battle at Hradec Králové, Prussian troops march through Moravia with cholera in their wagons.", {town: "war", clocks: {ashfield: 1}}),
        s("cholera", "chapter", [1866, 8, 1], "The cholera summer", "The Lower Town buries a tenth of its people in a month. The Shroud is thin over the new cemetery.", {town: "plague"})
      ]},
    {key: "iron-harvest", n: 14, title: "The Iron Harvest", from: 1914, to: 1921, era: "great-war", lines: ["all"],
      text: "The Great War takes the valley's men to Galicia and the Isonzo, and brings back the influenza and a new state.",
      steps: [
        s("call", "world", [1914, 7, 31], "Mobilisation", "Posters go up in two languages. The valley's young men go east.", {town: "war", signal: {kind: "saga", weight: 2, words: "the Great War takes a Moravian valley's young men"}}),
        s("letters", "chapter", [1916, 3, 1], "Letters from the front", "A soldier in a trench in Galicia writes home about a dream of the red ridge, and says something there knew their name.", {clocks: {sleeper: 1}}),
        s("hunger", "chapter", [1917, 1, 15], "The hungry winter", "Hunger in the towns. The Ashfield is ploughed for the first time in centuries, by desperate people.", {town: "famine", clocks: {ashfield: 1}}),
        s("republic", "world", [1918, 10, 28], "The republic", "Czechoslovakia is declared. The German town wakes up in a Czech state.", {clocks: {charter: -1}}),
        s("flu", "chapter", [1918, 11, 1], "The influenza", "The flu kills more of the valley than the war did. Wraiths crowd the Shadowlands of the new cemetery.", {town: "plague"}),
        s("land", "chapter", [1921, 5, 1], "The land reform", "The new state breaks up the great estates. Kranzfels and its forests go to auction.")
      ]},
    {key: "ash-years", n: 15, title: "The Ash Years", from: 1938, to: 1948, era: "mid-century", lines: ["all"],
      text: "Occupation, war, the expulsion of the valley's Germans and the Communist coup. The two halves of the old town are torn apart for good.",
      steps: [
        s("munich", "world", [1938, 10, 1], "The border moves", "The borderlands are given to Germany. Rothenstein is just inside the line, or just outside it, and everyone is counted.", {signal: {kind: "saga", weight: 3, words: "the border moves and a Moravian valley is counted"}}),
        s("occupation", "chapter", [1940, 2, 1], "The Protectorate", "German officials take over the town hall. An SS archaeologist asks about the Old Grove.", {clocks: {church: 1, sleeper: 1}}),
        s("resistance", "chapter", [1942, 6, 1], "After Heydrich", "Reprisals after the assassination in Prague. A village is chosen for punishment, and the valley fears it will be one of theirs."),
        s("front", "world", [1945, 4, 1], "The front", "The Red Army comes through the White Carpathians. Kranzfels is shelled.", {town: "siege", clocks: {charter: -1}}),
        s("expulsion", "chapter", [1946, 3, 1], "The trains west", "The valley's Germans, seven hundred and fifty years in Rothenstein, are put on trains with one suitcase each. Their Kindred and their Herd go with them, or stay and hide.", {town: "expulsion", clocks: {ashfield: 1}}),
        s("coup", "world", [1948, 2, 25], "February", "The Communist Party takes power. The church lands, the mines and the people's secrets belong to the state now.", {clocks: {church: 1}})
      ]},
    {key: "grey-shaft", n: 16, title: "The Grey Shaft", from: 1951, to: 1989, era: "mid-century", lines: ["all"],
      text: "Uranium mining under the ridge, the secret police, the Prague Spring and its end, and the slow fall of the regime.",
      steps: [
        s("survey", "chapter", [1951, 6, 1], "The prospectors", "State geologists with Soviet advisers find uranium under the red ridge. The Adit becomes a numbered shaft behind wire.", {town: "boom", clocks: {sleeper: 2}, by: {seal: "The binding lies in the path of the new shaft.", sever: "The shaft opens the caves the thing lived in; the geologists find its bed.", take: "The holder of the door goes to work for the ministry."}}),
        s("camp", "chapter", [1953, 1, 1], "The labour camp", "Political prisoners dig the shaft. The dead are many, and the guards find their ghosts do not rest.", {clocks: {ashfield: 1}}),
        s("spring", "world", [1968, 8, 21], "The tanks", "The Warsaw Pact ends the Prague Spring. The valley's informers go back to work.", {signal: {kind: "saga", weight: 2, words: "the tanks come into Czechoslovakia"}}),
        s("file", "chapter", [1977, 1, 1], "The file", "The secret police open a file on a family of the valley whose members do not age.", {clocks: {church: 2}}),
        s("velvet", "world", [1989, 11, 17], "November", "The regime falls in a few weeks. The files are opened, and some of them are burned first.", {clocks: {church: -2, charter: 1}})
      ]},
    {key: "red-star", n: 17, title: "The Flood and the Red Star", from: 1997, to: 1999, era: "modern", lines: ["all"],
      text: "The great Moravian flood of 1997 washes open the old galleries, and two years later a red star hangs in the sky.",
      steps: [
        s("flood", "world", [1997, 7, 7], "The flood", "A week of rain and the river takes the Lower Town. The water goes down into the old shafts and comes up somewhere else.", {town: "flood", clocks: {sleeper: 1, ashfield: 1}, signal: {kind: "saga", weight: 3, words: "flood waters open old shafts under a Moravian ridge"}}),
        s("mud", "chapter", [1997, 8, 1], "What the mud left", "Volunteers clearing the Lower Town find bones that are older than the town, and some that are not."),
        s("tourists", "chapter", [1998, 6, 1], "The heritage trail", "A European grant turns the old mine into a museum. Visitors go down every day."),
        s("dreams", "chapter", [1999, 7, 1], "Red dreams", "In the summer of 1999 everyone touched by the valley dreams of a red star and a waking giant. The Husbandman dreams too, and it is not afraid.", {clocks: {sleeper: 1}, signal: {kind: "saga", weight: 3, words: "a sleeper under the red ridge dreams the red star's dream"}})
      ]},
    {key: "judgment", n: 18, title: "Judgment Under the Ridge", from: 2004, to: 2030, era: "time-of-judgment", lines: ["all"],
      text: "The last book of the main timeline. The long clocks come due, and the valley learns whether eight hundred years of keeping were worth it.",
      steps: [
        s("signs", "world", [2004, 1, 1], "The signs", "The Time of Judgment begins in the world beyond the valley. Whatever the Storyteller has chosen for it, the ridge answers.", {clocks: {sleeper: 1}}),
        s("count", "chapter", [2005, 6, 1], "The reckoning of the clocks", "Read the saga's long clocks. A full Husbandman walks; an empty Charter means the Kindred fight each other first; a full Church's eye means the state already knows.", {by: {seal: "The keepers of the binding, if any line of them is left, are the valley's last defence.", sever: "The thing comes home from wherever it went, older and fed.", take: "The one who holds the door decides who comes through."}}),
        s("ridge", "chapter", [2010, 10, 31], "The last night on the ridge", "The company, or their heirs, go up to the Old Grove for the last time.", {ending: ["seal", "sever", "take"]}),
        s("after", "chapter", [2030, 6, 23], "Saint John's Eve, 2030", "Eight hundred and thirty-three years after the guest-feast. Whatever is left of Rothenstein lights its midsummer fires.")
      ]},
    {key: "arcology", n: 19, title: "The Valley Under Glass", from: 2031, to: 2300, era: "future-darkness", lines: ["all"], branch: "future",
      text: "Only on the World of Future Darkness branch, which is off unless the Storyteller turns it on. The valley's heirs in an arcology that was built over the red ridge.",
      steps: [
        s("built", "world", [2060, 1, 1], "The arcology", "A sealed city is raised over the valley, and the ridge is its foundation."),
        s("deep", "chapter", [2075, 1, 1], "The lowest levels", "Maintenance crews on the lowest levels report a warm wall that breathes.", {clocks: {sleeper: 1}}),
        s("heir", "chapter", [2090, 1, 1], "The last heir", "Someone in the arcology carries the blood of the valley's keepers, and the wall knows it.")
      ]}
  ]
};
