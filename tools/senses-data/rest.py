# Hour, sky, moon and calendar lines; live sources; the other worlds; the senses of powers.
# Same line format as places.py.
import json, sys
from _lib import parse

def S(**kw): return {k: parse(v) for k, v in kw.items()}

conditions = {
 "part": {
  "night": S(
   sight="""
io=out | Above the roofs, stars, and the dark shape of the hills.
io=in | Beyond the window, nothing but the dark.
""", sound="""
io=out e=m | Somewhere a watchman calls the hour.
io=out | A dog barks a long way off.
| The quiet of the small hours.
io=out e=dif | A train, or a truck, far off and going away.
""", smell="""
io=out | Night air, cold and damp.
""", touch="""
| The cold of the night has got in.
io=out | Dew on everything.
"""),
  "dawn": S(
   sight="""
| Grey light, coming slowly.
io=out | The sky pales in the east.
""", sound="""
io=out | The first birds.
io=out e=me | A bell for the first office.
""", smell="""
io=out | Wet grass and cold chimneys.
""", touch="""
| The coldest hour, just before the sun.
"""),
  "day": S(
   sight="""
io=out | Daylight, flat and plain.
io=in | Daylight through the shutters, in thin bars.
""", sound="""
io=out | The ordinary noise of people at work.
io=out e=me | Church bells for the hour.
""", smell="""
io=out e=me | Cooking fires and baking bread.
""", touch="""
io=out | The sun has some warmth in it.
"""),
  "dusk": S(
   sight="""
io=out | The last red light on the roofs.
io=out | Lamps coming on, one by one.
""", sound="""
io=out | Doors shutting, bolts going home.
io=out e=me | Bells for vespers.
""", smell="""
io=out | Supper smoke from every chimney.
""", touch="""
| The air cools quickly as the light goes.
"""),
 },
 "sky": {
  "clear": S(sight="""
io=out p=day | The sky is clear and hard.
io=out p=night | A clear night; every star is out.
""", touch="""
io=out p=night | A clear sky, and a frost coming.
"""),
  "cloudy": S(sight="""
io=out | Cloud, low and moving.
""", touch="""
io=out | A fitful wind under the cloud.
"""),
  "overcast": S(sight="""
io=out | Rain, steady and grey, blurring everything past a few yards.
io=in | Rain runs down the window.
""", sound="""
| Rain on the roof, steady.
io=in | Rain on the shutters.
io=out | Water rushing in the gutters.
""", smell="""
| Wet earth and rain.
""", touch="""
io=out | Rain, cold, getting in at the collar.
io=in | The damp of the rain has come indoors.
"""),
  "storm": S(sight="""
io=out | Fog, or rain so heavy it might as well be.
io=out | Lightning, and for an instant everything shows.
""", sound="""
| Wind howling, things banging loose.
| Thunder, close.
""", smell="""
| Ozone and wet stone.
""", touch="""
io=out | The wind shoves and pulls; rain stings the face.
io=in | The walls shake in the gusts.
"""),
 },
 "moon": {
  "full": S(sight="""
| A full moon throws hard shadows.
"""),
  "gibbous": S(sight="""
| A swollen moon, bright enough to see by.
"""),
  "half": S(sight="""
| A half moon, and grey light enough to make out shapes.
"""),
  "crescent": S(sight="""
| A thin moon that gives almost no light.
"""),
  "new": S(sight="""
| No moon tonight; the dark is complete.
"""),
 },
 "feast": S(sight="""
p=day | Garlands on the doors for {{feast}}.
""", sound="""
p=day dusk | Bells, for {{feast}}.
""", smell="""
| Cooking for the feast of {{feast}}.
"""),
 "curfew": S(sight="""
io=out | The streets are empty: curfew.
""", sound="""
io=out | Nobody about; only the watch, far off.
"""),
}

sources = {
 "light.torch": S(sight="""| A torch burns, smoky and orange.""", smell="""| Pitch smoke from the torch.""", sound="""1 | The torch spits and crackles."""),
 "light.candle": S(sight="""| Candles, their flames bending in the draught.""", smell="""1 | Hot wax."""),
 "light.lantern": S(sight="""| A lantern throws a ring of light.""", smell="""1 | Lamp oil."""),
 "light.lamp": S(sight="""| A lamp burns, turned low.""", smell="""1 | Lamp oil, or gas."""),
 "light.switch": S(sight="""| Electric light, hard and even.""", sound="""2 | The faint buzz of the bulb."""),
 "fire": S(sight="""| Fire, burning hot and bright.""", sound="""| The roar and crack of the fire.""", smell="""| Thick smoke.""", touch="""| The heat of the fire beats against the skin."""),
 "brazier": S(sight="""| A brazier full of coals.""", smell="""| Charcoal smoke.""", touch="""1 | Warmth from the brazier."""),
 "sharp": S(sight="""1 | Something glitters on the floor: broken glass, or worse."""),
 "shock": S(sound="""1 | A thin electric hum, and a smell of hot wire.""", smell="""2 | Scorched insulation."""),
 "door.open": S(sound="""| Sound comes through the open doorway.""", touch="""| A draught from the open door."""),
 "door.broken": S(sight="""| A door hangs off its hinges, the frame splintered."""),
 "hidden": S(sound="""2 | Someone breathing, slow and careful, very close.""", smell="""3 | A trace of sweat and fear where nobody should be."""),
 "trap": S(sight="""| Something about the ground here looks wrong."""),
 "clue": S(sight="""1 | {{name}} catches the eye; it would bear a closer look."""),
 "people": S(sight="""| In sight: {{people}}."""),
 "noise.quiet": S(sound="""1 | A small sound not long ago, {{dir}}: a scrape, a click."""),
 "noise.loud": S(sound="""| A crash a moment ago, {{dir}}."""),
 "activity.sleep": S(sound="""1 | Someone snoring {{dir}}."""),
 "activity.rest": S(sound="""1 | Low voices {{dir}}."""),
 "activity.work": S(sound="""| Someone at work {{dir}}: tools, footsteps."""),
 "activity.pray": S(sound="""1 | Murmured prayer {{dir}}."""),
 "activity.drink": S(sound="""| Talk and the knock of cups {{dir}}.""", smell="""1 | Ale and wine."""),
 "activity.patrol": S(sound="""1 | Measured footsteps {{dir}}: someone on watch."""),
 "activity.hunt": S(sound="""3 | Someone moving very quietly {{dir}}."""),
 "activity.hide": S(sound="""3 | A held breath, let out, {{dir}}."""),
 "activity.errand": S(sound="""| Footsteps {{dir}}, going somewhere."""),
 "activity.attend": S(sound="""1 | Someone waiting {{dir}}, shifting from foot to foot."""),
 "activity.wander": S(sound="""| Footsteps {{dir}}."""),
}

otherworlds = {
 "penumbra": {
  "any": S(sight="""
| The world seen through deep water: the same shapes, softer, and lit from nowhere.
| Things here look as they are felt, not as they are built.
1 | Small spirits drift at the edges of sight and are gone when looked at.
""", sound="""
| The physical world is muffled, a sound in another room.
1 | Something chitters, close, and stops.
""", smell="""
| The air tastes of the place's mood.
""", touch="""
| The Gauntlet's pressure at the back of the head.
"""),
  "resonance": {
   "wyld": S(sight="""| Everything grows and shifts: plants that weren't there a moment ago, colours that won't settle."""),
   "weaver": S(sight="""| Straight lines everywhere, and fine webs strung over every edge and corner.""", sound="""1 | A faint clicking, like a great many small legs."""),
   "wyrm": S(sight="""| Black slime in the corners, and shadows that lean toward the living.""", smell="""| Rot and oil and something burnt."""),
   "quiet": S(sight="""| A still place; even the spirits here are sleeping."""),
  },
  "kinds": {
   "church": S(sight="""| The church glows faintly from within, or stands hollow and cold, as its faith is."""),
   "haven": S(sight="""| The walls are thick with fear, layered like soot."""),
   "caern": S(sight="""| The caern blazes; the spirits here are many and awake.""", sound="""| Voices in no language, all around."""),
   "tavern": S(sight="""| Old quarrels hang in the air like smoke."""),
   "market": S(sight="""| Want and greed, worn into the stones by a thousand bargains."""),
   "wilds": S(sight="""| The trees stand tall and aware; some of them watch."""),
   "street": S(sight="""| The street's reflection is narrow and furtive, all doorways."""),
   "home": S(sight="""| Small comforts and old griefs, faint as breath on glass."""),
  }
 },
 "shadowlands": {
  "any": S(sight="""
| Everything is grey, cracked and worn, as it will look when it has fallen down.
| The living go by as warm, bright shapes.
1 | Chains of rust on a door; letters on a wall that faded long ago.
""", sound="""
| The Skinlands come through thin and far away.
1 | Someone weeping, somewhere close and not of this side.
""", smell="""
| Dust and ash and the end of things.
""", touch="""
| The Shroud is a pressure, close against the face.
1 | A pull, faint, toward something that matters.
"""),
  "kinds": {
   "church": S(sight="""| Graves under the floor show as dark wells; some are not empty."""),
   "haven": S(sight="""| The place is deep in decay, as if it died long before its owner."""),
   "home": S(sight="""| Old deaths here have left their marks like water stains."""),
   "tavern": S(sight="""| The tavern is half fallen in, its tables rotted, its fire cold ash."""),
   "wilds": S(sight="""| The trees are grey bones; the fields lie under ash."""),
   "castle": S(sight="""| Blood on the stones that no one living can see, from wars long over."""),
  }
 }
}

# The senses that powers bring. Each channel has lines per kind of presence; `sense` says which sense it answers.
# {{count}}: how many; {{dir}}: which way.
channels = {
 "uncanny": {"sense": "touch", "any": parse("""
| The hairs rise on the neck: something not natural is close, {{dir}}.
""")},
 "taint": {"sense": "smell", "kindred": parse("""
1 | Wyrm-taint, the stale cold of the walking dead, {{dir}}.
"""), "wyrm": parse("""
1 | Wyrm-taint, thick and sickening, {{dir}}.
"""), "place": parse("""
1 | The place itself is fouled; the Wyrm has been at work here.
""")},
 "trueform": {"sense": "smell", "lupine": parse("""
1 | Wolf-blood, {{dir}}: one of the Garou, or their kin.
"""), "mortal": parse("""
1 | Only human, {{dir}}.
"""), "kindred": parse("""
2 | A dead thing wearing a living scent, {{dir}}.
"""), "fae": parse("""
2 | Flowers, cold iron and something older, {{dir}}.
"""), "mage": parse("""
2 | A human scent with lightning in it, {{dir}}.
"""), "any": parse("""
2 | Something not human and not animal, {{dir}}.
""")},
 "unnatural": {"sense": "sight", "any": parse("""
1 | Not everyone here is what they look like: {{count}} {{dir}}.
""")},
 "sphere-life": {"sense": "touch", "living": parse("""
1 | Life, all around: {{count}} warm, beating hearts within reach of the senses.
"""), "kindred": parse("""
1 | And one heart, {{dir}}, that does not beat at all.
""")},
 "sphere-spirit": {"sense": "sight", "spirit": parse("""
1 | Spirits gather {{dir}}; the Gauntlet is thin there.
"""), "place": parse("""
1 | The Gauntlet here feels {thin as gauze|thick as a wall}.
""")},
 "sphere-entropy": {"sense": "sight", "any": parse("""
1 | Decay in everything: the wood half rotten, the iron eaten through in places.
"""), "kindred": parse("""
1 | Something {{dir}} carries death in it, held back but certain.
""")},
 "sphere-prime": {"sense": "touch", "mage": parse("""
1 | Quintessence stirs {{dir}}: someone here works magic.
"""), "place": parse("""
1 | The place is rich with raw Quintessence.
""")},
 "chimerical": {"sense": "sight", "fae": parse("""
1 | Glamour {{dir}}: a kithain, and their true seeming plain to see.
"""), "place": parse("""
1 | Chimerical things here: {a door that isn't there by day|flowers growing out of the stone|a small creature watching}.
""")},
 "lifesight": {"sense": "sight", "living": parse("""
| The living burn bright: {{count}} of them {{dir}}.
"""), "hurt": parse("""
1 | One of them is hurt; the decay shows like a bruise on the light.
""")},
}

out = {"version": 1, "conditions": conditions, "sources": sources, "otherworlds": otherworlds, "channels": channels}
json.dump(out, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
def count(x):
    if isinstance(x, list): return len(x)
    if isinstance(x, dict): return sum(count(v) for v in x.values())
    return 0
print(count(out), "lines")
