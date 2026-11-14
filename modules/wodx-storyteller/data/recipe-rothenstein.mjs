/**
 * WoDX Storyteller 0.61.0: the recipe for What Sleeps Beneath Rothenstein, rebuilt (Rothenstein Rebuild Desk,
 * approved by Ben 2026-11-13; B2780-B2785). The builder (builder.mjs) reads it and makes the chronicle step by step in
 * the world it names. Data only: recipe-rules.mjs checks it and plans the steps.
 *
 * Phase 1 uses: world, title, homeland, opening, lines, carry, anchors and doors. The later parts (town, reach, ages, spine)
 * are written down now so the shape is fixed; their steps come with phases 2 to 7.
 */
export const ROTHENSTEIN = {
  id: "rothenstein",
  version: 1,
  title: "What Sleeps Beneath Rothenstein",
  // The world the builder works in. It refuses rothenstein-live always, and any other world unless forced.
  world: "rothenstein-x",
  homeland: "moravia",
  // The autumn of 1200, as the Storyteller volumes open (B4760).
  opening: {year: 1200, month: 9, day: 1, hour: 21},
  climate: "auto",
  // Every line has a door into the valley from the first night (desk w4), Vampire in front.
  lines: ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mortal"],
  // What comes across from the old testbed world (desk x2). The file is written by tools/gate/carryexport.mjs in
  // rothenstein-wodx and copied into the new world's folder by the PC job.
  carry: {from: "rothenstein-wodx", file: "worlds/rothenstein-x/carry/rothenstein-carry.json"},
  // Anchors claim their place first; generated content fills around them, and the authored lines always win (desk r3).
  // Places are matched on scene names (kind = a WoDX NPC place kind), people on a part of the actor's name (the shortest match wins).
  anchors: {
    places: [
      {key: "kranzfels", match: "^(Kranzfels|Locus · Kranzfels|Rothenstein: Kranzfels)", kind: "castle"},
      {key: "lower-town", match: "^(Lower Town|Locus · Lower Town|Rothenstein: Lower Town)", kind: "street"},
      {key: "market", match: "Market (Street|Square)", kind: "market"},
      {key: "st-aegidius", match: "(St\\. Aegidius|Church Close|Churchyard|Presbytery)", kind: "church"},
      {key: "silver-adit", match: "(Silver Adit|Adit Mouth|Mining Camp)", kind: "workplace"},
      {key: "old-grove", match: "Old Grove", kind: "wilds"},
      {key: "ashfield", match: "Ashfield", kind: "wilds"},
      {key: "dolany", match: "(Dolany|A Moravian Village)", kind: "yard"},
      {key: "ferry", match: "(Ivo's Ferry|Toll-post)", kind: "yard"},
      {key: "inn", match: "(The Tavern|Inn Upstairs|Etienne's Room at the Inn)", kind: "tavern"},
      {key: "mill", match: "(Water Mill|Wenzel's Mill|Lower Mill)", kind: "workplace"},
      {key: "altenhof", match: "Ruins of Altenhof", kind: "wilds"}
    ],
    people: [
      {key: "bogdan", name: "Bogdan Ursu", home: "kranzfels", faction: "court"},
      {key: "konrad", name: "Konrad", home: "silver-adit", faction: "cult"},
      {key: "kasimir", name: "Kasimir", home: "silver-adit", faction: "cult"},
      {key: "marta", name: "Marta", home: "kranzfels", faction: "marta"},
      {key: "radu", name: "Old Radu", home: null, faction: "radu"},
      {key: "graff", name: "Graff", home: "market", faction: "council"},
      {key: "ludovic", name: "Ludovic", home: "st-aegidius", faction: "church"},
      {key: "paval", name: "Paval", home: "st-aegidius", faction: "church"},
      {key: "gizela", name: "Gizela", home: "lower-town", faction: "church"},
      {key: "yaroslava", name: "Yaroslava", home: "dolany", faction: "folk"},
      {key: "lenka", name: "Lenka Prochazka", home: "lower-town", faction: "weavers"},
      {key: "ondrej", name: "Ondrej", home: "kranzfels", faction: "ondrej"},
      {key: "anselm", name: "Anselm", home: null, faction: "hunters"},
      {key: "voss", name: "Voss", home: "lower-town", faction: null},
      {key: "sieglinde", name: "Sieglinde", home: "kranzfels", faction: null},
      {key: "zdenka", name: "Zdenka", home: "lower-town", faction: null},
      {key: "ivo", name: "Ivo", home: "ferry", faction: null},
      {key: "etienne", name: "Etienne", home: "inn", faction: null}
    ]
  },
  // The Ways step (B4810-B4813): the old world's exits between the walkable maps become Ways, and each place inside gets a
  // door from the street it stands on. By scene name; the door's end sits on the street map's south edge until the
  // Storyteller moves it. A private place of a schemer is locked (the lock rules decide); Bogdan's rooms ask first.
  doors: [
    {inside: "Trespass · Baba Yaroslava's House", street: "Dolany Village"},
    {inside: "Trespass · Bogdan's Private Chambers", street: "Kranzfels · Upper Floor and Undercroft", kind: "stair", shut: "asks"},
    {inside: "Trespass · Brother Anselm's Hermitage", street: "The High Woods"},
    {inside: "Trespass · Captain Ondrej's Barracks", street: "Kranzfels · The Outer Bailey"},
    {inside: "Trespass · Etienne's Room at the Inn", street: "Workplace · The Inn Upstairs and Cellar", kind: "stair"},
    {inside: "Trespass · Father Ludovic's Presbytery", street: "Lower Town · Church Close"},
    {inside: "Trespass · Gizela's Midwife House", street: "Lower Town · Craftsmen's Lane"},
    {inside: "Trespass · Ivo's Ferry Cabin", street: "Toll-post and Ivo's Ferry"},
    {inside: "Trespass · Kasimir's Lair in the Adit", street: "The Silver Adit", shut: "locked"},
    {inside: "Trespass · Konrad's Undercroft Workshop", street: "Kranzfels · Upper Floor and Undercroft", shut: "locked"},
    {inside: "Trespass · Master Voss's Laboratory and Cellar", street: "Lower Town · Craftsmen's Lane", shut: "locked"},
    {inside: "Trespass · Richter Graff's House and Strongroom", street: "Lower Town · Market Square", shut: "locked"},
    {inside: "Trespass · Sieglinde's Rooms", street: "Kranzfels · Inner Ward and Great Hall"},
    {inside: "Trespass · Sister Marta's Cell and the Keep Chapel", street: "Kranzfels · Inner Ward and Great Hall"},
    {inside: "Trespass · The Scriptorium and Brother Paval's Cell", street: "Lower Town · Church Close"},
    {inside: "Trespass · Zdenka's Wellhouse", street: "Lower Town · Riverside Quay"},
    {inside: "Workplace · The Bakery", street: "Lower Town · Market Square"},
    {inside: "Workplace · The Barber-Surgeon's Shop", street: "Lower Town · Market Square"},
    {inside: "Workplace · The Brewhouse", street: "Lower Town · Riverside Quay"},
    {inside: "Workplace · The Butcher's Shop", street: "Lower Town · Craftsmen's Lane"},
    {inside: "Workplace · The Cooper's Workshop", street: "Lower Town · Craftsmen's Lane"},
    {inside: "Workplace · The General Store", street: "Lower Town · Market Square"},
    {inside: "Workplace · The Inn Upstairs and Cellar", street: "Locus · The Tavern", kind: "stair"},
    {inside: "Locus · The Tavern", street: "Lower Town · Market Square"},
    {inside: "Workplace · The Mining Camp", street: "The Mining Camp and Adit Mouth"},
    {inside: "Workplace · The Tannery", street: "Lower Town · Riverside Quay"},
    {inside: "Workplace · The Warehouse and Customs House", street: "Lower Town · Riverside Quay"},
    {inside: "Workplace · The Watch-house and Cells", street: "Lower Town · West Gate and the Common"},
    {inside: "Workplace · The Water Mill", street: "The Ford and Wenzel's Mill"},
    {inside: "Workplace · The Weaver's Workshop", street: "Lower Town · Craftsmen's Lane"},
    {inside: "Workplace · The Woodcutters' and Charcoal Camp", street: "The Forest Road"},
    {inside: "Locus · Church of St. Aegidius", street: "Lower Town · Church Close"},
    {inside: "Locus · The Churchyard", street: "Lower Town · Church Close"},
    {inside: "Locus · Smithy and Stables", street: "Lower Town · West Gate and the Common"},
    {inside: "Locus · The Forest Cottage", street: "The High Woods"},
    {inside: "Locus · The Herdsman's Shelter", street: "The Mountain Trail"}
  ],
  // Phase 2: the town from one fixed seed (desk w1); anchors take their plots first.
  town: {name: "Rothenstein", seed: 1200, size: "town", region: "moravia", sewers: false},
  // Phase 5: the settlement ages the town is rebuilt at, with households carried forward by heirs (desk w1).
  ages: [1200, 1420, 1620, 1781, 1851, 1919, 1948, 1990, 2030],
  // Phase 5: the sleeper's origin is dated in the Classical age, in Great Moravia (desk s2); the details go on a desk.
  spine: {origin: {era: "classical", place: "great-moravia"}, opening: "Sessio I to X and the encounters (desk s3)", saga: "rothenstein"},
  // Phase 5 and 6: one away hub per era on another continent, tied in by letters, trade and events (desk w2). Each
  // waits for settlement tables of its own region before it is built (desk w3).
  reach: [
    {from: 1197, to: 1299, place: "Constantinople", region: "anatolia", why: "the Fourth Crusade and the silver road east"},
    {from: 1300, to: 1499, place: "Cairo", region: "egypt", why: "the spice and silver trade through the Mamluk lands"},
    {from: 1500, to: 1699, place: "Potosí and New Spain", region: "andes", why: "the silver that undercut the Moravian mines"},
    {from: 1700, to: 1849, place: "Bengal", region: "india", why: "the trading companies and their agents"},
    {from: 1850, to: 1945, place: "New York's Czech quarter", region: "north-america-east", why: "the emigrants who left the valley"},
    {from: 1946, to: 1999, place: "Hong Kong", region: "china", why: "the Cold War's open door and the Kuei-jin"},
    {from: 2000, to: 2300, place: "an arcology of the World of Future Darkness", region: null, why: "where the valley's heirs end up"}
  ],
  // Desk x1: what one scene may hold at once on a slower machine (phase 3 and 7).
  caps: {residentsShown: 40, passersBy: 24, animatedSprites: 30}
};
