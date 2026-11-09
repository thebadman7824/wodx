# Base lines for each kind of place. Written once, to be read over and edited by the Storyteller.
# Format of a line:  [need] [e=bands] [p=parts of day] [io=in|out] | text
# Bands: m before 1450, e 1450-1849, i 1850-1949, d 1950-2009, f 2010 on. No band: every era.
import json, sys
from _lib import parse

K = {}

K["home"] = dict(
sight="""
| A low room, its corners lost past the reach of the light.
| Everything here has been used for years and mended more than once.
e=me | A bed under a heap of blankets, a stool, a chest with an iron hasp.
e=me | Rushes on the floor, trodden flat along the path from door to hearth.
e=me p=night | The hearth is banked; a red line of embers shows under the ash.
e=i | Wallpaper lifting at the seams, a clock on the mantel, a cold grate.
e=df | A couch, a television's dark screen, shoes kicked off by the door.
e=f | A wall screen showing nothing but the time, and a cleaning drone parked in its cradle.
1 | A cup left half full, as if someone got up in a hurry.
1 | A path worn in the floor, from the bed to the window.
2 | The bedding has been slept in tonight; the dent is still there.
2 | Scratches around the latch, fresh and bright against the old wood.
3 | Something was hidden in the wall here once: the plaster is a shade newer in one place.
""",
sound="""
| The small noises of a house settling.
| A draught finds a gap somewhere and whistles through it.
e=me | The fire ticks and shifts in the hearth.
e=me | Mice in the thatch.
e=i | A clock, loud in the quiet.
e=df | The hum of a refrigerator, and a tap that drips.
e=f | The building's air system, a low breath that never stops.
1 | Someone in the next room turns over in bed.
1 | Water drips into a bucket set under a leak.
2 | A board creaks overhead, then nothing.
3 | Breathing, slow and even, where nobody should be.
""",
smell="""
| Old smoke, worked into everything.
| Damp wool and boiled food.
e=me | Tallow, and the animal fat it was made from.
e=me | The cowshed on the other side of the wall.
e=i | Coal dust and carbolic soap.
e=df | Cooking oil, laundry soap and stale cigarettes.
e=f | Filtered air, too clean, with a trace of plastic.
1 | Bread baked this morning.
1 | A chamber pot that wants emptying.
2 | Herbs hung to dry above the bed: lavender, rue, something bitter.
3 | Under the smoke, a trace of old blood that was scrubbed and scrubbed.
""",
touch="""
| The floor is gritty underfoot.
| The air is close and warm near the hearth, cold by the walls.
e=me | The walls are wattle and daub, rough and dry to the touch.
e=df | The radiator is warm and ticks as it cools.
1 | The table's edge is sticky with something spilled.
2 | The latch is still warm from a hand.
""")

K["workplace"] = dict(
sight="""
| Tools hang on pegs, each in its own outline of dust.
| A workbench scarred by years of use.
e=me | Shavings, offcuts and a half-finished piece clamped to the bench.
e=me | A forge, its coals grey, the anvil scaled with black.
e=e | Bolts of cloth stacked to the ceiling, and a counting board by the door.
e=i | Belts and pulleys run along the ceiling to the machines.
e=d | Fluorescent tubes, a time clock, a calendar from a supplier.
e=f | Fabrication units behind safety glass, status lights blinking amber.
1 | One tool is missing from its place on the wall.
1 | Work stopped in the middle: a measure drawn but not cut.
2 | A ledger left open on the bench, the last entry blotted.
3 | Marks on the floor where something heavy was dragged to the back.
""",
sound="""
| The building creaks as it cools.
e=me | Water drips into the quenching trough.
e=me p=day | Hammering, steady, from somewhere close.
e=i | A machine idles somewhere, ticking.
e=d | A radio playing low, tuned between two stations.
e=f | The hum of servers and the click of a relay.
1 | A cat moves among the stock.
2 | Someone counting under their breath in the back room.
""",
smell="""
| Sawdust, sweat and lamp oil.
e=me | Coal smoke and hot iron.
e=me | Tanning: lime, dung and rot.
e=e | Dye vats, sour and sharp.
e=i | Machine oil and steam.
e=d | Solvent, coffee, burnt dust from a heater.
e=f | Ozone and the sweet smell of hot polymer.
1 | Glue, freshly cooked.
2 | Fresh blood under the sawdust, somebody's cut hand.
""",
touch="""
| Grit and shavings underfoot.
e=me | The forge still gives off a little heat.
e=i | The floor shakes faintly with a machine somewhere.
1 | The bench is still warm where someone was leaning.
""")

K["church"] = dict(
sight="""
| Columns go up into a dark the light can't reach.
| An altar under a white cloth, a cross above it.
| Saints in paint and stone, their faces worn smooth by hands.
e=me | Rushlights by the altar; the nave beyond is black.
e=me p=night | A single lamp burns before the sacrament.
e=e | Box pews with their little doors, and a high pulpit.
e=i | Gaslight in the side chapels, and plaques to the dead of the parish.
e=df | Electric candles in a rack, a coin box beside them.
1 | Wax has dripped and hardened on the floor before one of the saints.
1 | A prayer book left open on a bench.
2 | A side door, not quite shut.
2 | Dust lies thick everywhere except one path, to the crypt stair.
3 | One of the floor slabs has been lifted and set back, the mortar broken.
""",
sound="""
| Every footstep comes back off the stone.
| The building is so quiet the ears ring.
e=me p=night dawn | Monks at the night office, far off, a low chant.
p=day | A murmured prayer from one of the side chapels.
1 | A pigeon shifts in the roof beams.
2 | Someone breathing in the confessional.
3 | A scrape of stone, under the floor.
""",
smell="""
| Cold stone and old incense.
| Beeswax and dust.
e=me | Damp, and the smell of the graves under the floor.
e=df | Floor polish and lilies a few days old.
1 | Smoke from a candle just snuffed.
2 | Wet earth, carried in on someone's boots.
3 | Under the incense, something dead and not long buried.
""",
touch="""
| The cold comes up from the stone floor.
| The air moves very slowly, in long draughts.
1 | The holy water stoup is dry.
2 | The altar rail is worn smooth, and warm in one place.
""")

K["tavern"] = dict(
sight="""
| Low beams, smoke, and tables crowded too close.
| A fire in a wide hearth, and the regulars sitting nearest it.
e=me | Trestles and benches, ale in leather jacks and wooden cups.
e=me | The keeper's wife and daughter carry jugs between the tables.
e=e | Pewter tankards on hooks, a slate of what each drinker owes.
e=i | A long bar, a brass rail, gas mantles yellow with smoke.
e=d | A jukebox, a dartboard, a television over the bar showing the game.
e=f | Holographic menus over each table, and a bartender who never blinks.
p=night | Only a few tables still taken; the rest have their stools upturned.
1 | Someone in the corner keeps their back to the wall and their eyes on the door.
1 | A game of dice at the back, with more money on the table than it should have.
2 | The keeper glances at the cellar door every so often.
3 | One drinker hasn't touched the cup in front of them all night.
""",
sound="""
| Voices over each other, and somebody laughing too loud.
| Cups set down hard, a bench scraping back.
e=me | A fiddle, badly tuned, and a few voices with it.
e=i | A piano, a song half the room knows.
e=d | Music from the jukebox, and the clack of pool balls.
e=f | A synth beat from the walls, and a dozen private calls at once.
p=night | The talk has dropped low; people lean in to speak.
1 | Dice rattle at the back table and someone curses the throw.
2 | Two people at the bar argue in whispers about money.
2 | Upstairs, a floorboard creaks twice and stops.
3 | A name, said very quietly, at the table by the door.
""",
smell="""
| Spilled ale, smoke and wet clothes drying by the fire.
| Too many people in a small room.
e=me | Tallow, onions, a pot of something that has stewed since noon.
e=me | The rushes on the floor need changing.
e=e | Tobacco, gin and sawdust.
e=i | Beer, pipe smoke and paraffin.
e=d | Cigarettes, fryer oil, bleach in the toilets.
e=f | Synthetic tobacco, flavored vapour, and the sharp edge of a stimulant someone is smoking.
1 | Someone has been sick out the back.
2 | One of the drinkers smells of horse and the road; they have come a long way today.
3 | Under the smoke, blood: a little, fresh.
""",
touch="""
| The heat of the fire on one side, the draught from the door on the other.
| The floor is sticky.
1 | The table is still wet from a spilled cup.
""")

K["haven"] = dict(
sight="""
| A room that nobody lives in, by the look of it.
| The windows have been covered, every one.
e=me | A crypt, or a cellar made into one: a long box on trestles.
e=i | Heavy curtains nailed at the edges, and dust on every surface.
e=d | Blackout blinds, a steel door, a mattress on the floor.
1 | Nothing to eat or drink anywhere, and no sign there ever was.
2 | The lock on the inside of the door is better than the one outside.
3 | The dust has been disturbed only on one path, from the door to the resting place.
""",
sound="""
| Silence, close and heavy.
| The door, when it moves, makes no sound at all: oiled hinges.
1 | Rats, and then the rats go still.
2 | Water dripping behind the walls.
""",
smell="""
| Cold, dry air, like a cellar in winter.
| Dust, old wood, and nothing living.
1 | Earth, as if the floor were bare ground under the boards.
2 | Old blood, dried brown, faint but certain.
3 | A trace of something sweet, like grave flowers left too long.
""",
touch="""
| The room is colder than it should be.
| The air hasn't moved in a long time.
2 | The resting place is cold, colder than the room.
""")

K["gate"] = dict(
sight="""
| A heavy gate, and a smaller door cut into it for night traffic.
| Arrow slits, and a brazier where the watch warm their hands.
e=me | Pikes in a rack, and a bench for the men off duty.
e=e | A watch-house lantern, and a table where papers are checked.
e=i | A sentry box, a barrier pole painted in stripes.
e=d | A checkpoint booth, floodlights, a barrier arm.
e=f | Scanning arches, a drone overhead, guards in visored helmets.
p=night | The gate is shut and barred; only the wicket opens.
1 | One of the watch is asleep on their feet.
1 | A notice nailed up by the door, with a description of someone wanted.
2 | The bar on the gate is not seated all the way.
""",
sound="""
| A guard's boots on the walk above.
| The watch talking about pay and the cold.
p=night | A watchman calls the hour.
e=d | A radio crackles in the booth.
1 | Dice in the guardroom.
2 | Someone outside the gate, waiting, shuffling their feet.
""",
smell="""
| Wood smoke from the brazier, wet leather, unwashed bodies.
e=me | Horse dung from the gate road.
e=d | Diesel exhaust and coffee.
1 | Ale on a guard's breath.
""",
touch="""
| Wind funnels through the gate arch.
| The stone of the gate is cold and wet.
""")

K["market"] = dict(
sight="""
| An open square, its paving uneven, a well or fountain at its heart.
p=day | Stalls, awnings, and people pushing between them.
p=night dusk | The stalls are bare frames now; scraps blow across the stones.
e=me | A market cross, a pillory, the church tower over the roofs.
e=e | A weigh house with the town's scales, and a pump with a chained cup.
e=i | Gas lamps around the edge, carts with their shafts down.
e=d | Parked cars, a bus shelter, shop signs lit up.
e=f | Advertising screens on every surface, some flickering with dead pixels.
1 | A cutpurse working the edges of the crowd.
1 | A notice of a hanging, a few days old.
2 | Someone watching the square from a window above the baker's.
""",
sound="""
| The square throws noise back from every side.
p=day | Traders crying their goods, a cart wheel squealing.
p=night | A dog barks, and another answers it from across the town.
e=me p=day | Geese, a pig squealing, a bell for the market's opening.
e=d | Traffic, a busker, a car alarm somewhere.
1 | Water running in the fountain, or the well chain swinging.
2 | Footsteps, behind and to one side, keeping pace.
""",
smell="""
| Trampled vegetables, horse dung, wet stone.
p=day | Bread, fish, spices and a hundred people.
e=me | The tannery downwind, and the butchers' shambles.
e=i | Coal smoke, horses and roasting chestnuts.
e=d | Exhaust fumes, hot fat from a food stall.
1 | Rotting fruit in the gutter.
2 | Smoke from a fire someone shouldn't have lit.
""",
touch="""
| The wind has room to move here.
| The cobbles are slick.
""")

K["street"] = dict(
sight="""
| A narrow way between houses that lean toward each other overhead.
| Doors shut, shutters closed, a gutter down the middle.
e=me | The upper floors jut out, nearly touching across the lane.
e=e | A lamp in a niche, a street sign painted on the wall.
e=i | Gas lamps at long intervals, pools of light and the dark between.
e=d | Streetlights, parked cars, a phone box.
e=f | Neon in a dozen scripts, and a security camera on every corner.
p=night | One window still lit, high up.
1 | A gap between two houses, wide enough for one person.
1 | Something has been dragged through the gutter here.
2 | Someone standing in a doorway, keeping still.
3 | Fresh chalk marks on a doorpost, a sign meant for someone.
""",
sound="""
| The echo of footsteps.
| Water running in the gutter.
p=night | A shutter bangs somewhere in the wind.
e=me p=night | The watch, far off, calling the hour.
e=i | A carriage passes in the next street.
e=d | A car goes by slowly, its radio up.
e=f | The whine of an aircar passing low.
1 | Voices behind a shutter, a quarrel.
2 | Footsteps behind, stopping when you stop.
""",
smell="""
| The gutter, and what has been thrown in it.
| Wet stone and chimney smoke.
e=me | Night soil, pigs, and somebody's bread oven.
e=i | Coal smoke, horses, the river.
e=d | Exhaust, wet tarmac, a takeaway.
e=f | Hot wiring, rain on concrete, cheap noodle broth.
1 | Cat piss in the doorways.
2 | Lamp oil from a lamp just put out.
""",
touch="""
| The way underfoot is uneven and slick.
| A cold wind down the length of the street.
""")

K["castle"] = dict(
sight="""
| Thick walls, deep windows, tapestries against the cold.
| A great hall with a high table at one end.
e=me | A hearth in the middle of the hall, its smoke going up to a hole in the roof.
e=me | Banners, shields on the walls, the lord's arms over the high seat.
e=e | Portraits in gilt frames, a long gallery, a staircase of oak.
e=i | Gas brackets on old stone, hunting trophies, a billiard table.
e=d | Velvet ropes and a sign for the gift shop; this part is a museum now.
p=night | The hall is dark; servants sleep on the benches along the walls.
1 | A guard at the stair who looks at everyone who passes.
2 | One tapestry hangs a little out from the wall.
3 | Scuffs on the floor lead to a panel that isn't flush.
""",
sound="""
| Voices carry up the stair from the hall.
| Dogs in the hall, scratching and settling.
p=night | A sentry on the wall walk, pacing.
e=me | A servant sweeping the rushes.
1 | A door shuts somewhere above.
2 | Someone talking low in the window seat.
""",
smell="""
| Wood smoke, dogs and roasting meat.
| Cold stone and beeswax.
e=me | Rushes strewn with herbs to sweeten them.
e=i | Coal fires and furniture polish.
1 | Wine, spilled and soaked into the boards.
2 | The garderobe, at the end of the passage.
""",
touch="""
| The cold of the stone walls comes right through.
| A draught from every arrow slit.
""")

K["wilds"] = dict(
sight="""
| Trees, close and dark, and the path between them.
| Open fields, a hedge line, the black edge of a wood.
p=night | Nothing past a few yards but shapes.
p=day | Birds in the hedges, a hawk over the field.
e=me | A shrine at the crossroads, its offerings rotted.
e=d | A fence with a rusted sign, power lines on the hill.
1 | Tracks in the mud, a few hours old.
1 | Broken branches at shoulder height.
2 | A trail heading off the path, used by something.
3 | Bones scattered under a tree, too clean, too many.
""",
sound="""
| The wind in the trees.
| A stream, somewhere below.
p=night | An owl, then quiet.
p=dawn | Birdsong starting, one bird and then dozens.
1 | Something heavy moves in the undergrowth.
2 | The woods go silent all at once.
3 | A howl, far off, answered nearer.
""",
smell="""
| Leaf mould, wet earth, pine.
| Grass and cattle.
1 | Wood smoke from a fire somewhere ahead.
2 | Carrion, faint, on the wind.
3 | Wet fur, and the musk of a large animal.
""",
touch="""
| Wet grass soaks through to the ankles.
| The wind comes across the open ground.
1 | The ground is soft here; it gives underfoot.
""")

K["caern"] = dict(
sight="""
| Standing stones, or a ring of old trees, at the centre of the place.
| The grass grows differently here.
1 | Small offerings in a hollow: feathers, teeth, a bit of bone.
2 | Claw marks scored into the bark, higher than anyone could reach.
3 | The moonlight falls more brightly here than it should.
""",
sound="""
| The air is quiet, as if waiting.
1 | Water underground, running.
2 | Wolves, somewhere close, and not hiding it.
""",
smell="""
| Earth, stone and growing things, very strong.
1 | Wolf, all around.
2 | Old ash from a great fire.
""",
touch="""
| The hairs on the arms stand up.
| The ground hums, very faintly, or seems to.
""")

K["other"] = dict(
sight="""
| Nothing here stands out at first look.
1 | Something has been moved recently; the dust shows it.
2 | A detail that doesn't fit: a door where none should be, a mark on a wall.
""",
sound="""
| The usual noises of the place, and nothing more.
1 | A sound from somewhere nearby, too faint to place.
""",
smell="""
| Dust, damp and people.
1 | A trace of smoke.
""",
touch="""
| The air is still.
1 | A draught from somewhere.
""")

out = {"version": 1, "kinds": {}}
for k, d in K.items():
    out["kinds"][k] = {s: parse(v) for s, v in d.items()}
json.dump(out, open(sys.argv[1], "w"), indent=1, ensure_ascii=False)
print(sum(len(v) for d in out["kinds"].values() for v in d.values()), "place lines")
