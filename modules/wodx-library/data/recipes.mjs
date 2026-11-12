/**
 * WoDX Library 0.10.0: recipes for the things that are eaten, drunk or taken (Ben asked 2026-11-12, after the way
 * Cataclysm: Dark Days Ahead builds its recipes; mechanics only, WoDX's own methods and words). Rules that use these
 * tables are in scripts/recipe-rules.mjs; Storyteller runs the work as long tasks.
 *
 *   GROUPS   ingredients by kind ("any grain"), matched by name against the goods and the things a character carries.
 *            The goods' own years decide what is about in the chronicle's year.
 *   KITS     heat and tools by what they do (a fire, a kitchen, a still, a laboratory), found carried or on the scene.
 *   FAMILIES defaults for each kind of work: the roll, the kit, the time, the batch.
 *   METHODS  one entry covers every good its name pattern matches ("bake leavened bread" covers every loaf).
 *   WORDS    for a catch-all method, the ingredients a dish's name asks for ("fish soup" needs any fish).
 *   RAW, FACTORY  goods that are gathered, grown or bought, not made by hand.
 *
 * The rolls follow V20: Crafts for cooking and brewing, Medicine (or Herbalism, Hearth Wisdom) for remedies, Science
 * for the laboratory. Goals, times, dots, waits and batches are house rules (B947).
 */

const END = 2099;

/* ---------------------------------------------------------------- ingredients */

/** Each group: label and a name pattern (tested on a good's name and on a carried thing's name, cleaned). */
export const GROUPS = {
  grain: {label: "any grain", re: /^(grain|barley|oats|rice|wheat|threshed wheat|winter wheat|buckwheat|corn kernels|seed corn|malt)$/i},
  malt: {label: "malt or grain", re: /^(malt|barley|grain|threshed wheat|wheat|winter wheat|rice|corn kernels)$/i},
  flour: {label: "any flour or meal", re: /^(flour|bread flour|maize meal|cornmeal|oatmeal)$/i},
  leaven: {label: "yeast or barm (ale)", re: /^(yeast|koji|ale|small beer|beer)$/i},
  hops: {label: "hops", re: /^hop flowers$/i},
  fruit: {label: "any fruit", re: /^(an? )?(apple|crabapple|peach|dried fig|orange|banana|mango|pomegranate|papaya|guava|grapefruit|pineapple|kiwi|coconut|watermelon|cantaloupe melon|honeydew melon|fruit|bunch of grapes|wintergreen berries|spicebush berries|lulo|mayapple)$/i},
  apples: {label: "apples or pears", re: /^(an? )?(apple|crabapple|pear)$/i},
  grapes: {label: "grapes", re: /^(a )?bunch of grapes$/i},
  citrus: {label: "an orange or lemon", re: /^(an? )?(orange|grapefruit|lemon|lime)$/i},
  honey: {label: "honey", re: /^(honey|honeycomb|royal jelly)$/i},
  sugar: {label: "sugar, molasses or honey", re: /^(sugar|a sugarloaf in blue paper|molasses|honey|a sugar beet|pekmez)$/i},
  milk: {label: "milk", re: /^(milk|condensed milk|buttermilk)$/i},
  cream: {label: "cream or butter", re: /^(heavy cream|whipped cream|a pat of butter in a cloth|ghee)$/i},
  rennet: {label: "rennet or vinegar", re: /^(rennet|vinegar)$/i},
  cheese: {label: "any cheese", re: /^(a round of hard cheese|pecorino|mascarpone|cheese spread)$/i},
  egg: {label: "an egg", re: /^(an )?egg$/i},
  meat: {label: "any meat", re: /^(a cut of raw meat|a plucked fowl|salted pork|a smoked ham|bacon|corned beef|a slice of beef in a branded tray|luncheon meat|a bratwurst)$/i},
  fowl: {label: "a fowl", re: /^(a plucked fowl)$/i},
  fish: {label: "any fish", re: /^(fish|a fish fillet|a salt herring|a dried fish wrapped in cloth|a slab of stockfish|sardines|tuna fish|salmon|clams|lobster|shucked oysters)$/i},
  rawmeat: {label: "fresh meat or fish", re: /^(a cut of raw meat|a plucked fowl|fish|a fish fillet)$/i},
  blood: {label: "blood", re: /^(blood)$/i},
  fat: {label: "lard, suet or butter", re: /^(lard|suet|a pat of butter in a cloth|ghee|cooking oil|olive oil)$/i},
  vegetable: {label: "any vegetables", re: /^(an? )?(onion|turnip|potatoes|carrot|vegetables|cabbage|kale|cauliflower|broccoli|celery|salad cucumber|gherkin cucumber|pumpkin|zucchini|eggplant|leek|garlic clove|beans|dried peas|corn cob|corn on the cob|tomato in a plastic dome|sugar beet|brussels sprout|raw artichoke|raw asparagus|salsify root|burdock root|dandelion leaves|wild garlic|fiddleheads|lotus root|dahlia root|cattail rhizome|jerusalem artichoke)$/i},
  cabbage: {label: "cabbage or greens", re: /^(an? )?(cabbage|kale|vegetables|brussels sprout|salad cucumber|gherkin cucumber)$/i},
  potato: {label: "potatoes", re: /^(potatoes)$/i},
  rice: {label: "rice", re: /^(rice)$/i},
  salt: {label: "salt", re: /^(salt|a salt lick)$/i},
  spice: {label: "spices or herbs", re: /^(an? )?(pepper|whole nutmeg|saffron threads|stick of cinnamon|thyme|mustard|horseradish root|garlic clove|italian seasoning|dried herbs|bee balm)$/i},
  vinegar: {label: "vinegar", re: /^(vinegar)$/i},
  chocolate: {label: "cocoa or chocolate", re: /^(a cake of drinking chocolate|a bar of chocolate)$/i},
  coffee: {label: "coffee beans", re: /^(coffee beans)$/i},
  chicory: {label: "chicory or roasted grain", re: /^(an? )?(chicory root|barley|grain|dandelion leaves)$/i},
  leaves: {label: "tea, herbs or flowers", re: /^(tea|dried herbs|chamomile flowers|dandelion leaves|bee balm|thyme)$/i},
  nuts: {label: "any nuts", re: /^(hickory nuts|pecans|pistachios|almonds|peanuts|hazelnuts|chestnuts|walnuts|butternuts)$/i},
  bread: {label: "bread", re: /^(an? )?(loaf of dark bread|flatbread|brioche|cornbread|buttered toast)$/i},
  wine: {label: "wine", re: /^(wine|claret|riesling|chardonnay|pinot noir|rice wine)$/i},
  wash: {label: "wash (a fermented mash)", re: /^(wash)$/i},
  spirit: {label: "a strong spirit", re: /^(brandy|vodka|gin|rum|whiskey|corn liquor|moonshine|tequila|ethanol|synthetic vodka)$/i},
  juniper: {label: "juniper berries", re: /^(juniper berries)$/i},
  herbs: {label: "dried herbs", re: /^(dried herbs|chamomile flowers|bee balm|thyme|dandelion leaves|a burdock root|a sassafras root|wintergreen berries)$/i},
  poppy: {label: "poppy heads or opium", re: /^(dried poppy heads|a lump of opium)$/i},
  opium: {label: "opium", re: /^(a lump of opium)$/i},
  morphine: {label: "morphine", re: /^(morphine)$/i},
  coca: {label: "coca leaves", re: /^(coca leaves)$/i},
  cocapaste: {label: "coca paste", re: /^(coca paste)$/i},
  cocaine: {label: "cocaine", re: /^(cocaine)$/i},
  cannabis: {label: "a cannabis plant", re: /^(a cannabis plant)$/i},
  marijuana: {label: "dried cannabis", re: /^(marijuana|hashish)$/i},
  tobacco: {label: "tobacco leaves", re: /^(a bundle of tobacco leaves)$/i},
  mercury: {label: "mercury", re: /^(mercury)$/i},
  solvent: {label: "a solvent", re: /^(acetone|benzene|toluene|methylated spirits|denatured alcohol|ethanol|lamp oil|kerosene|methanol)$/i},
  acid: {label: "a strong acid", re: /^(sulphuric acid|aqua fortis)$/i},
  anhydride: {label: "acetic anhydride", re: /^(acetic anhydride)$/i},
  chemicals: {label: "laboratory chemicals", re: /^(sulphuric acid|aqua fortis|acetone|liquid ammonia|ammonia solution|phenol|benzene|toluene|glycerol|formaldehyde|dimethyl sulfoxide|sodium|potassium|calcium chloride|acetic anhydride|liquid hydrogen peroxide|zinc oxide|lye|saltpetre|sulfur|potassium alum)$/i},
  cartridge: {label: "a food printer cartridge", re: /^(a cartridge for a food printer)$/i},
  anyfood: {label: "anything to cook", re: /^(an? )?(egg|onion|turnip|potatoes|vegetables|grain|rice|flour|a cut of raw meat|a plucked fowl|fish|a fish fillet|beans|dried peas|oats|barley|cabbage|carrot)$/i}
};

/* ---------------------------------------------------------------- heat and tools */

const FIRE = /flint and steel|\bmatch|lighter|matchbook|matchbox|fire piston|portable stove|hobo stove|hexamine stove|hotplate/i;
const POT = /cooking pot|copper pot|casserole pot|stock pot|aluminum pot|canning pot|dutch oven|clay pot oven|pressure cooker|kettle|hotplate|portable stove|hobo stove/i;
const OVEN = /dutch oven|clay pot oven/i;
const BIG_POT = /cooking pot|copper pot|stock pot|canning pot|clay canning pot/i;

/**
 * Each kit: label, the year it can first exist (from), what a character can carry instead (all of the patterns,
 * each met by one carried thing), what a place with it also counts as (covers), and its forms by year (labels only).
 * The Storyteller marks which kits a scene has (scene flag wodx-storyteller.kits).
 */
export const KITS = {
  none: {label: "Nothing special", carry: [], covers: []},
  fire: {label: "A fire", carry: [FIRE], covers: []},
  kitchen: {label: "A kitchen, or a pot over a fire", carry: [POT, FIRE], covers: ["fire"],
    forms: [[-10000, "a hearth and a pot"], [1830, "an iron range"], [1880, "a gas stove"], [1920, "an electric stove"], [1970, "a stove and a microwave"], [2040, "a kitchen with a food printer"]]},
  oven: {label: "An oven", carry: [OVEN, FIRE], covers: ["kitchen", "fire"],
    forms: [[-10000, "a bread oven or a baker's"], [1830, "a range with an oven"], [1920, "an electric oven"]]},
  brewhouse: {label: "A brewhouse, or a big pot and a fire", carry: [BIG_POT, FIRE], covers: ["kitchen", "fire"],
    forms: [[-10000, "a vat, a kettle and casks"], [1850, "a brewery with copper kettles"], [1980, "a home brewing kit"]]},
  still: {label: "A still", carry: [/copper tubing/i, BIG_POT, FIRE], covers: ["fire"],
    forms: [[-10000, "a pot still"], [1830, "a column still"]]},
  herbal: {label: "A herbalist's table: mortar, knives, drying racks", carry: [/mortar and pestle/i], covers: []},
  laboratory: {label: "A chemist's laboratory", from: 1660, carry: [], covers: ["herbal", "still", "kitchen", "fire"]},
  pharma: {label: "A pharmaceutical laboratory", from: 1900, carry: [], covers: ["laboratory", "herbal", "still", "kitchen", "fire"]},
  printer: {label: "A food printer", from: 2040, carry: [], covers: ["kitchen", "fire"]}
};

/** Long-task workshops (Storyteller tasks-rules WORKSHOPS) each kit is filed under. */
export const KIT_WORKSHOP = {none: "", fire: "", kitchen: "kitchen", oven: "kitchen", brewhouse: "brewhouse", still: "still", herbal: "apothecary",
  laboratory: "laboratory", pharma: "pharma", printer: "printer"};

/* ---------------------------------------------------------------- kinds of work */

const HERB = ["medicine", "herbalism", "hearthwisdom"];
/** Defaults for each family of methods. ab: the Abilities that serve, best first; the character uses its best. */
export const FAMILIES = {
  cook: {label: "Cooking", attr: "dexterity", ab: ["crafts"], kit: "kitchen", dots: 1, diff: 6, goal: 2, interval: "hour", batch: 8, everyday: true, taste: true},
  bake: {label: "Baking", attr: "dexterity", ab: ["crafts"], kit: "oven", dots: 1, diff: 6, goal: 3, interval: "hour", batch: 12, everyday: true, taste: true},
  preserve: {label: "Salting, smoking and pickling", attr: "intelligence", ab: ["crafts", "survival"], kit: "kitchen", dots: 1, diff: 6, goal: 3, interval: "hour", batch: 10, taste: true},
  dairy: {label: "Dairy work", attr: "dexterity", ab: ["crafts"], kit: "kitchen", dots: 1, diff: 6, goal: 3, interval: "hour", batch: 6, taste: true},
  brew: {label: "Brewing", attr: "intelligence", ab: ["crafts"], kit: "brewhouse", dots: 1, diff: 6, goal: 3, interval: "day", batch: 20, taste: true},
  still: {label: "Distilling", attr: "intelligence", ab: ["crafts", "science"], kit: "still", dots: 2, diff: 6, goal: 4, interval: "day", batch: 10, taste: true},
  mix: {label: "Mixing drinks", attr: "dexterity", ab: ["crafts"], kit: "none", dots: 1, diff: 5, goal: 1, interval: "hour", batch: 6, everyday: true, taste: true},
  herbal: {label: "Herb lore", attr: "intelligence", ab: HERB, kit: "herbal", dots: 2, diff: 6, goal: 3, interval: "day", batch: 6, strength: true},
  lab: {label: "Chemistry", attr: "intelligence", ab: ["science", "medicine"], kit: "laboratory", dots: 4, diff: 7, goal: 6, interval: "day", batch: 10, strength: true},
  pharma: {label: "Pharmacy", attr: "intelligence", ab: ["science", "medicine"], kit: "pharma", dots: 4, diff: 7, goal: 8, interval: "day", batch: 20, strength: true},
  tobacco: {label: "Curing tobacco", attr: "dexterity", ab: ["crafts"], kit: "none", dots: 1, diff: 6, goal: 2, interval: "day", batch: 20},
  printer: {label: "Food printing", attr: "intelligence", ab: ["technology", "computer", "crafts"], kit: "printer", dots: 1, diff: 5, goal: 1, interval: "hour", batch: 10, everyday: true}
};

/** Books that teach methods while they are carried and read: the families each covers. */
export const BOOKS = [
  {re: /cookery book/i, families: ["cook", "bake", "preserve", "dairy", "mix"]},
  {re: /guild's handwritten book/i, families: ["brew", "still", "bake", "preserve"]},
  {re: /herbal with drawings/i, families: ["herbal"]},
  {re: /home medical guide/i, families: ["herbal", "pharma"]},
  {re: /field manual|survival/i, families: ["preserve"]}
];

/* ---------------------------------------------------------------- methods */

/**
 * M(key, family, label, makes, extra): makes is a pattern on good names; extra can set from, to, needs [[group, n]],
 * words (true: add what the dish's name asks for), wait (days to stand once the work is done), waitWord, dots, diff,
 * goal, interval, batch, leaves [[good name, n]], kinds, everyday, strength, catch (a catch-all, after the rest).
 */
const M = (key, family, label, makes, extra = {}) => ({key, family, label, makes, from: -10000, to: END, needs: [], ...extra});

export const METHODS = [
  // Bread and baking
  M("chocolate", "cook", "Make chocolate", /^(a cake of drinking chocolate|a bar of chocolate)$/i, {needs: [["chocolate", 1], ["sugar", 1]], dots: 2, from: 1650}),
  M("mill", "preserve", "Grind grain into flour or meal", /^(flour|bread flour|maize meal|cornmeal|oatmeal)$/i, {needs: [["grain", 2]], kit: "none", everyday: true, goal: 2}),
  M("bread", "bake", "Bake leavened bread", /\b(loaf|brioche)\b/i, {needs: [["flour", 2], ["leaven", 1]]}),
  M("flatbread", "cook", "Make flatbread", /\b(flatbread|frybread|cornbread|johnnycake|tortilla|hallula|hardtack biscuit|toast)\b/i, {needs: [["flour", 1]], words: true}),
  M("pastry", "bake", "Bake pies, cakes and pastries", /\b(pie|samosa|cake|cookie|brownie|waffle|pancake|donut|pretzel|dumplings?|pelmeni|manti|ravioli|pide|lahmacun|pizza|strudel|tart|plättar|marzipan figure)\b/i,
    {needs: [["flour", 1]], words: true, dots: 2}),
  M("pasta", "cook", "Make noodles and pasta", /\b(spaghetti|macaroni|lasagne|noodles)\b/i, {needs: [["flour", 1], ["egg", 1]], words: true}),

  // Dairy
  M("butter", "dairy", "Churn butter", /^(a pat of butter in a cloth|ghee|heavy cream|whipped cream)$/i, {needs: [["milk", 2]], leaves: [["buttermilk", 1]]}),
  M("cheese", "dairy", "Make cheese", /^(a round of hard cheese|pecorino|mascarpone)$/i, {needs: [["milk", 3], ["rennet", 1], ["salt", 1]], dots: 2, wait: 30, waitWord: "ripening"}),
  M("soured", "dairy", "Sour milk: yogurt, buttermilk, ayran", /^(yogurt|buttermilk|ayran|cottage cheese with fruit)$/i, {needs: [["milk", 2]], wait: 1, waitWord: "souring", kinds: ["food", "drink"]}),

  // Meat and fish kept
  M("cure", "preserve", "Salt and cure meat or fish", /^(salted pork|a smoked ham|bacon|corned beef|a salt herring|meat confit|lutefisk)$/i, {needs: [["rawmeat", 2], ["salt", 1]], wait: 14, waitWord: "curing", dots: 2}),
  M("dry", "preserve", "Dry or smoke meat and fish", /^(meat jerky|chicken jerky|a slab of stockfish|a dried fish wrapped in cloth|dried earthworms|dehydrated vegetable)$/i,
    {needs: [["rawmeat", 2]], kit: "fire", wait: 3, waitWord: "drying", words: true}),
  M("sausage", "preserve", "Make sausages and puddings", /\b(blood sausage|blutwurst|bratwurst|bologna|haggis|black pudding|leverpostej|töttchen)\b/i, {needs: [["rawmeat", 2], ["salt", 1]], words: true, dots: 2}),

  // Pickles, preserves, sauces
  M("ferment-veg", "preserve", "Sour cabbage and pickles", /^(sauerkraut|kimchi|pickled \w+)$/i, {needs: [["cabbage", 2], ["salt", 1]], wait: 21, waitWord: "souring", words: true}),
  M("jam", "preserve", "Boil jam and stewed fruit", /\b(jam|stewed (?!tripe)\w+|kompot|fruit compote|pekmez|molasses)\b/i, {needs: [["fruit", 2], ["sugar", 1]], kinds: ["food", "drink"]}),
  M("brandied", "preserve", "Put fruit up in brandy", /^brandied fruit$/i, {needs: [["fruit", 2], ["spirit", 1]], kit: "none", wait: 30, waitWord: "steeping", from: 1600}),
  M("vinegar", "preserve", "Sour wine or ale into vinegar", /^vinegar$/i, {needs: [["wine", 1]], kit: "none", wait: 30, waitWord: "souring"}),
  M("sauce", "cook", "Make sauces and relishes", /\b(ketchup|sauce|mayonnaise|mustard|salsa|pesto|gravy|horseradish$|relish|chutney|aspic|icing)\b/i, {words: true, needs: [["spice", 1]]}),

  // Sweets
  M("sweets", "cook", "Boil sweets and chocolates", /\b(sweets|candy|caramel|licorice|marshmallows|toffee|fudge|peppermint|wafers|sprinkles|chewing gum|s'mores|chocolate-covered|gingerbread|ambrosia|nut butter|peanut butter)\b/i,
    {needs: [["sugar", 1]], words: true, dots: 2, from: 1450}),
  M("cold", "cook", "Make ices, puddings and custards", /\b(ice cream|gelato|sorbet|snow cone|frozen \w+|milkshake|pudding|custard|tiramisù)\b/i, {needs: [["milk", 1], ["sugar", 1]], words: true, from: 1700}),

  // Soups, stews, porridge
  M("soup", "cook", "Cook soup, stew or porridge", /\b(soup|stew|broth|curry|chili|skink|stirfry|paella|coq au vin|succotash|three sisters|tripe|porridge|oatmeal|grits|hominy|dolmas|sarma)\b/i,
    {words: true, batch: 12}),

  // Drinks: brewed
  M("ale", "brew", "Brew ale", /^(ale|small beer|kvass)$/i, {needs: [["malt", 2], ["leaven", 1]], wait: 7, waitWord: "fermenting", kinds: ["drink"]}),
  M("beer", "brew", "Brew hopped beer", /^(beer|stout|imperial stout|european pilsner|lager|porter)$/i, {needs: [["malt", 2], ["hops", 1], ["leaven", 1]], wait: 14, waitWord: "fermenting", kinds: ["drink"], dots: 2, from: 1300}),
  M("cider", "brew", "Press and ferment cider", /^(cider|perry)$/i, {needs: [["apples", 3]], wait: 14, waitWord: "fermenting", kinds: ["drink"]}),
  M("wine", "brew", "Press and ferment wine", /^(wine|claret|riesling|chardonnay|pinot noir)$/i, {needs: [["grapes", 4]], wait: 90, waitWord: "fermenting", kinds: ["drink"], dots: 2}),
  M("ricewine", "brew", "Brew rice wine", /^(rice wine|sake|nigori sake)$/i, {needs: [["rice", 2], ["leaven", 1]], wait: 30, waitWord: "fermenting", kinds: ["drink"], dots: 2}),
  M("mead", "brew", "Make mead", /^mead$/i, {needs: [["honey", 2], ["leaven", 1]], wait: 60, waitWord: "fermenting", kinds: ["drink"]}),
  M("champagne", "brew", "Make sparkling wine", /^champagne$/i, {needs: [["wine", 2], ["sugar", 1], ["leaven", 1]], wait: 365, waitWord: "standing in the bottle", kinds: ["drink"], dots: 4, from: 1700}),
  M("fortified", "brew", "Fortify wine", /^(port|sherry|marsala|vermouth|coca tonic wine)$/i, {needs: [["wine", 2], ["spirit", 1]], words: true, wait: 60, waitWord: "standing", kinds: ["drink", "drugs"], dots: 2, from: 1500}),

  // Drinks: distilled
  M("wash", "brew", "Ferment a wash for the still", /^wash$/i, {needs: [["malt", 2], ["leaven", 1]], wait: 5, waitWord: "fermenting", kinds: ["materials"], from: 1100}),
  M("brandy", "still", "Distil brandy", /^brandy$/i, {needs: [["wine", 3]], wait: 180, waitWord: "ageing in the cask", kinds: ["drink"], from: 1400}),
  M("whiskey", "still", "Distil whiskey", /^whiskey$/i, {needs: [["wash", 2]], wait: 365, waitWord: "ageing in the cask", kinds: ["drink"], from: 1494}),
  M("spirits", "still", "Distil clear spirits", /^(vodka|corn liquor|moonshine|rum|tequila|ethanol|aquavit|schnapps|slivovice|rakia)$/i, {needs: [["wash", 2]], kinds: ["drink", "fuel"], from: 1100}),
  M("gin", "still", "Distil gin", /^gin$/i, {needs: [["wash", 2], ["juniper", 1]], kinds: ["drink"], from: 1600}),
  M("absinthe", "still", "Distil absinthe and liqueurs", /^(absinthe|triple sec)$/i, {needs: [["spirit", 2], ["herbs", 1]], words: true, kinds: ["drink"], dots: 3, from: 1790}),

  // Drinks: mixed, infused, pressed
  M("cocktail", "mix", "Mix a drink", /^(irish coffee|vodka and orange|grog|gin and tonic|piña colada|tequila sunrise|kalimotxo|bee's knees|whiskey sour|spiked eggnog|martini|karsk|mulled wine|punch)$/i,
    {needs: [["spirit", 1]], words: true, kinds: ["drink"]}),
  M("hotdrink", "cook", "Brew coffee, tea or a tisane", /^(black coffee|sweetened coffee|coffee substitute|chicory brew|dandelion tea|eggnog|horchata|hot chocolate)$/i, {words: true, kinds: ["drink"], kit: "kitchen"}),
  M("juice", "mix", "Press juice or make lemonade", /^(fruit juice|orange juice|pineapple juice|cranberry juice|tomato juice|lemonade|orangeade|grapeade)$/i, {needs: [["fruit", 2]], words: true, kinds: ["drink"]}),

  // Drugs
  M("opium", "herbal", "Gather and dry opium", /^a lump of opium$/i, {needs: [["poppy", 3]], wait: 7, waitWord: "drying", kinds: ["drugs"]}),
  M("laudanum", "herbal", "Steep laudanum", /^(laudanum|soothing syrup)$/i, {needs: [["opium", 1], ["spirit", 1]], words: true, wait: 14, waitWord: "steeping", kinds: ["drugs"], dots: 3, from: 1660, kit: "none"}),
  M("theriac", "herbal", "Compound theriac", /^theriac$/i, {needs: [["opium", 1], ["honey", 1], ["herbs", 3]], wait: 30, waitWord: "maturing", kinds: ["medicine"], dots: 4, goal: 6}),
  M("belladonna", "herbal", "Distil belladonna drops", /^belladonna drops$/i, {needs: [["herbs", 2]], kinds: ["drugs"], dots: 3}),
  M("hashish", "herbal", "Press hashish", /^hashish$/i, {needs: [["cannabis", 1]], kinds: ["drugs"], dots: 1}),
  M("marijuana", "herbal", "Dry cannabis", /^marijuana$/i, {needs: [["cannabis", 1]], kit: "none", wait: 7, waitWord: "drying", kinds: ["drugs"], dots: 1}),
  M("joint", "mix", "Roll a joint", /^a hand-rolled joint$/i, {needs: [["marijuana", 1]], kinds: ["drugs"]}),
  M("cocapaste", "lab", "Work coca leaves into paste", /^coca paste$/i, {needs: [["coca", 4], ["solvent", 1]], kit: "kitchen", dots: 3, goal: 3, kinds: ["drugs"], from: 1860}),
  M("cocaine", "lab", "Refine cocaine", /^cocaine$/i, {needs: [["cocapaste", 1], ["acid", 1]], kinds: ["drugs"], from: 1860}),
  M("crack", "lab", "Cook crack cocaine", /^a rock of crack cocaine$/i, {needs: [["cocaine", 1], ["chemicals", 1]], kit: "kitchen", dots: 2, goal: 2, interval: "hour", kinds: ["drugs"], from: 1984}),
  M("cocacream", "lab", "Make cocaine cream", /^cocaine cream$/i, {needs: [["cocaine", 1], ["fat", 1]], kit: "kitchen", dots: 3, goal: 2, kinds: ["drugs"], from: 1860}),
  M("morphine", "lab", "Refine morphine", /^(morphine|codeine)$/i, {needs: [["opium", 2], ["chemicals", 1]], kinds: ["drugs", "medicine"], from: 1827}),
  M("heroin", "lab", "Make heroin", /^heroin$/i, {needs: [["morphine", 1], ["anhydride", 1]], kinds: ["drugs"], dots: 4, from: 1898}),
  M("syntheticdrug", "lab", "Synthesise a drug", /^(an amphetamine tablet|white powder|meth crystals|methamphetamine|a tab of LSD blotter paper|ecstasy pills|ketamine|chloral hydrate|ether for sniffing|cannabis distillate)$/i,
    {needs: [["chemicals", 2]], kinds: ["drugs"], dots: 4, goal: 8, from: 1840}),
  M("futuredrug", "pharma", "Synthesise a designer drug", /^(designer neurostim|an inhaler of synthetic dream gas|a fentanyl patch|oxycodone)$/i, {needs: [["chemicals", 2]], kinds: ["drugs"], dots: 5, goal: 10, from: 1990}),
  M("pipetobacco", "tobacco", "Cut and cure tobacco", /^(pipe tobacco|snuff|a plug of chewing tobacco|a cigar)$/i, {needs: [["tobacco", 1]], wait: 30, waitWord: "curing", kinds: ["drugs"]}),
  M("cigarette", "tobacco", "Roll cigarettes", /^a cigarette$/i, {needs: [["tobacco", 1]], kinds: ["drugs"], interval: "hour", everyday: true, batch: 20, from: 1830}),

  // Medicine
  M("salve", "herbal", "Make a salve or poultice", /^(goose-grease salve|grey ointment)$/i, {needs: [["fat", 1], ["herbs", 1]], words: true, kit: "kitchen", dots: 1, goal: 2, interval: "hour", kinds: ["medicine"]}),
  M("remedy", "herbal", "Make an old remedy", /^(quinine powder|patent medicine|smelling salts)$/i, {needs: [["herbs", 2]], words: true, kinds: ["medicine"], from: 1640}),
  M("chemremedy", "lab", "Prepare a chemical remedy", /^(chloroform|carbolic acid|iodine|anesthetic|hydrogen peroxide|antiseptic|saline solution|an alcohol wipe)$/i, {needs: [["chemicals", 2]], kinds: ["medicine"], dots: 3, from: 1830}),
  M("pills", "pharma", "Make medicines and pills", null, {catch: true, not: /pipe|syringe|hookah|patch|lighter|syrette/i, subs: ["remedy", "sedative", "opiate", "stimulant", "unknown"], kinds: ["medicine", "drugs"], needs: [["chemicals", 2]], from: 1880}),

  // Rations and the far future
  M("printed", "printer", "Print food", /\b(ration bar in foil|protein block|flavoured paste|nutrient)\b/i, {needs: [["cartridge", 1]], kinds: ["food"], from: 2040}),

  // Catch-all for any other dish: what its name asks for
  M("dish", "cook", "Cook a dish", null, {catch: true, kinds: ["food"], words: true})
];

/**
 * What a dish's name asks for, for methods with words: true. The first match of each group counts once.
 * A dish whose name asks for nothing needs "anything to cook" (two of it).
 */
export const WORDS = [
  [/\b(fish|herring|salmon|tuna|sardine|sashimi|makizushi|cod|lobster|clam|oyster|shrimp|skink|lutefisk|stockfish)\b/i, "fish"],
  [/\b(chicken|fowl|duck|goose|wings|coq)\b/i, "fowl"],
  [/\b(meat|beef|pork|ham|bacon|sausage|bratwurst|blutwurst|bologna|meatball|burger|cheeseburger|kebab|pide|lahmacun|iskender|manti|pelmeni|chili|sloppy|taco|liver|tripe|sweetbread|marrow|tenderloin|haggis|confit|bolognese|lasagne|leverpostej|töttchen|jerky|currywurst|corned)\b/i, "meat"],
  [/\b(blood|blutwurst|blodplättar)\b/i, "blood"],
  [/\b(cheese|parmesan|pecorino|nachos|quesadilla|tiramisù|mascarpone)\b/i, "cheese"],
  [/\b(egg|eggs|omelet|custard|eggnog|french toast|eggplant parmigiana)\b/i, "egg"],
  [/\b(milk|cream|butter|buttermilk|milkshake|pudding|custard|horchata)\b/i, "milk"],
  [/\b(apple|fruit|berr\w*|cherry|peach|plum|jam|pineapple|orange|lemon|cranberry|grape|kompot|piña|tequila sunrise|banana)\b/i, "fruit"],
  [/\b(rice|onigiri|hosomaki|paella|sushi|makizushi|temaki|horchata)\b/i, "rice"],
  [/\b(potato|fries|poutine|crisps)\b/i, "potato"],
  [/\b(vegetable|salad|cabbage|sauerkraut|soup|stew|broth|succotash|three sisters|stirfry|dolmas|sarma|pickled|salsa|tomato|garlic|greens|dandelions|burdocks|bamboo|fiddleheads|salsify|carrot|kimchi|curry)\b/i, "vegetable"],
  [/\b(nut|nuts|pecan|almond|peanut|hazelnut|walnut|chestnut|pistachio|ambrosia)\b/i, "nuts"],
  [/\b(chocolate|cocoa|brownie)\b/i, "chocolate"],
  [/\b(sweet|candy|sugar|sweetened|caramel|icing|maple|marshmallow|gingerbread|honey|toffee|licorice|cake|cookie|syrup|grog|punch)\b/i, "sugar"],
  [/\b(coffee)\b/i, "coffee"],
  [/\b(chicory|substitute)\b/i, "chicory"],
  [/\b(tea|tisane|chamomile)\b/i, "leaves"],
  [/\b(oatmeal|porridge|grits|hominy|granola|cereal|dumplings?|bread|toast|pie|pizza|pancake|waffle|tortilla|cornbread|johnnycake|flatbread|batter)\b/i, "flour"],
  [/\b(laudanum|soothing syrup)\b/i, "opium"],
  [/\b(coca)\b/i, "coca"],
  [/\b(vermouth|absinthe|patent medicine|grey ointment|smelling salts|quinine)\b/i, "herbs"],
  [/\b(grey ointment)\b/i, "mercury"],
  [/\b(vinegar|pickled)\b/i, "vinegar"],
  [/\b(salt|salted|cured|pickled|sauerkraut)\b/i, "salt"],
  [/\b(triple sec|orangeade|lemonade|whiskey sour|grog)\b/i, "citrus"]
];

/**
 * Not made by hand: gathered, grown, caught or bought. A good whose name matches is "raw" (in food, drink, drugs
 * or medicine); a good matching FACTORY is made in a works and bought, until a food printer or pharmacy can make it.
 */
export const RAW = /^(an? )?(egg|onion|apple|turnip|dried fig|olives|orange|pineapple|honey|salt|pepper|whole nutmeg|saffron threads|stick of cinnamon|milk|potatoes|grain|barley|dried peas|oats|rice|wheat|threshed wheat|winter wheat|buckwheat|corn kernels|corn cob|.*\bnuts|pecans|pistachios|almonds|peanuts|hazelnuts|chestnuts|walnuts|butternuts|seaweed|sunflower|chamomile flowers|lotus flower|bottle gourd|cattail \w+|cooking banana|carrot|vegetables|garlic clove|dahlia root|fiddleheads|jerusalem artichoke|kombu|crabapple|banana|mayapple|wintergreen berries|guava|lulo|grapefruit|coconut|peach|watermelon|cantaloupe melon|mango|pomegranate|papaya|kiwi|honeydew melon|fruit|royal jelly|nectar|earthworm|snail|thyme|bee balm|wild garlic|broccoli|celery|salad cucumber|gherkin cucumber|salsify root|chicory root|hop flowers|horseradish root|pumpkin|horseradish greens|dandelion leaves|burdock root|rhubarb|sugar beet|zucchini|japanese knotweed stems|eggplant|sea lettuce|sugar kelp|bladderwrack|raw \w+|brussels sprout|cauliflower|kale|spicebush berries|cut of raw meat|plucked fowl|bunch of grapes|juniper berries|fish|shucked oysters|lobster|clams|pair of frog legs|corn on the cob|tea|coffee beans|mineral water|dried poppy heads|coca leaves|bundle of khat leaves|betel nut wrapped in leaf with lime|dried mushroom|henbane seeds|peyote button|cannabis plant|bundle of tobacco leaves|dried herbs|live leech|blood|tomato in a plastic dome|lotus root|yeast|koji|a sugarloaf in blue paper|caviar|sugar|malt|rennet|lard|suet|cooking oil|olive oil|horseradish root|horseradish greens|tofu|raw soybeans)$/i;

export const FACTORY = /\b(crisps|breakfast cereal|corn flakes|luncheon meat|condensed milk|sardines|beans$|corned beef|instant noodles|field ration pack|chewing gum|necco|candy bracelet|star-shaped|branded tray|toaster pastry|hamburger in greasy paper|pizza box|dry dog food|wet cat food|dry cat food|graham cracker|cola|soda|energy drink|electrolyte drink|beer cans|hard seltzer|synthetic vodka|spezi|tuna fish|salmon|clams|an electronic cigarette|insulin pen|asthma inhaler|auto-?injector|flu shot|antivenom|trauma patch|nanite wound gel|a dermal patch|microwave dinner|self-heating|ration bar in foil|protein block|flavoured paste|morphine syrette)\b/i;

/** Years the factory goods can be made by hand again: a food printer from 2040 makes any food. */
export const FACTORY_PRINTER = 2040;
