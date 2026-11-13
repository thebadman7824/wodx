# WoDX: the Storyteller's guide

How the build works from the Storyteller's chair, and how to keep a session moving. This guide was written for the "What Sleeps Beneath Rothenstein Live Version" world as it stood on system 7.3.2-wodx.3 (Actions 3.11.2, Chronicle 0.4.2, Combat 3.7.4, Creation 0.6.1, NPC 0.3.0, Otherworlds 0.2.0, Sheets 0.5.0). Since 11 November 2026 Live runs build ab958f2: system 7.3.2-wodx.7, and the server carries fourteen WoDX modules (Actions 3.21.3, Atmosphere 0.11.0, Chronicle 0.16.0, Combat 3.8.7, Creation 0.10.1, Interactables 0.23.0, Library 0.5.4, NPC 0.14.0, Otherworlds 0.9.0, Paperdoll 0.6.4, Senses 0.5.1, Sheets 0.7.0, Storyteller 0.22.0, Targeting 0.1.1). What each later version adds is in the running Storyteller's guide (https://claude.ai/artifact/UbJuJuWv4HHaB6i9VcP6QT) and in docs/MODULES.md; the sections below still hold for what they describe.

## Quick start: tonight's session

**Before the players arrive**

1. Open the world as the Gamemaster. Every WoDX module this world uses should be on (the Settings sidebar names the build). vtda20-actions and vtda20-combat must be off in this world, or WoDX Actions and WoDX Combat switch themselves off and say so.
2. Open the **Chronicle Clock** (moon button in the token controls). Check the date, the hour and the era. If the era is wrong, fix the date with **Set date**, or lock the era.
3. Open the **Approval queue** (inbox button). Clear anything left from testing, so tonight's proposals are easy to spot.
4. Decide how much the game should do on its own. Each of these is a world setting (Game Settings, Configure Settings):
   - *NPCs in combat* (WoDX NPC): **Suggest** by default. Each NPC turn you get a whispered plan with Accept, "Do this instead", Undo and Behaviour.
   - *Turns advance on their own* (WoDX Combat): **Off** by default. "NPC turns" lets NPC turns end by themselves; "Everyone" also ends player turns after their action.
   - *NPC routines and reactions* (WoDX NPC): **Suggest** by default.
   - *Faction turns and rumours* (WoDX NPC): **Suggest** by default.
   - *Dawn and dusk* and *Sunlight damage* (WoDX Actions): cards with buttons by default.
   - *Inner voices* (WoDX Actions): off by default.
5. In **House rules** (on the Clock) check the Safety group: the X-card pauses the game (on), signed lines and veils (off).
6. Run **Session Zero** and **Lines and veils** from the Clock if this is the first session with these players.

**During play**

- Players open their character's menu from the token HUD (**WoDX Actions**) and attack from the sword (**WoDX Attack**). You see the same menus plus a **Storyteller tools** group.
- Move time with the Clock's buttons: +10 min, +1 hour, dusk, dawn, +1 day, +1 week. Healing, blood, timed effects, routines and faction turns all follow the clock.
- Press **End the scene** on the Clock when a scene ends. Every effect that lasts a scene ends then.
- Keep an eye on the inbox. A notice ("For your approval: ...") pops up whenever something new waits there.
- Every automatic change posts a card. If the card has an **Undo** button, that is the way back.

**At the end of the night**

- In the **WoDX factions** window (rook button), press **End the session** if you want every faction to take its turn now. In Suggest mode the results go to the queue for you to read later.
- Award experience from **Creation and experience** (droplet button), **Award experience**.

**If something goes wrong:** every WoDX automation has an Off choice in Configure Settings, and switching it off takes effect at once. Undo on the card reverses what that card did. Foundry's own backups and the known-good copy of the world are the last resort.

## The toolbar

All WoDX buttons sit in the **token controls** on the left. Players see only the ones you allow in **Player toolbar buttons**.

| Button | Name | Who |
|---|---|---|
| Moon | Chronicle Clock | everyone (players can view) |
| X | X-card (anonymous) | everyone |
| Inbox | Approval queue | Storyteller |
| Person and cog | Player toolbar buttons | Storyteller |
| Crosshairs | Find my character | everyone |
| Door | Step sideways (selected Garou) | everyone |
| Eye | Peek across the Gauntlet | everyone |
| Ghost | Otherworld ratings by scene | Storyteller |
| Skull | Cross the Shroud | Storyteller |
| Two squares | Penumbra and Shadowlands levels | Storyteller |
| Sparkling hand | Read the Soul | everyone |
| Palette | Set the aura of the selected character | Storyteller |
| Knight | WoDX NPCs (how NPCs act in combat) | Storyteller |
| Map and pin | WoDX places (where routines send NPCs) | Storyteller |
| Rook | WoDX factions (faction turns, hunting grounds, rumours) | Storyteller |
| Droplet | Creation and experience (players: Spend experience) | everyone |

On a token's HUD: **WoDX Actions** (the menu), **WoDX Attack** (click for the attack dialog, shift-click for a quick attack, right-click to set the actor type), and on NPCs a **knight** (click for the NPC's behaviour, right-click to plan its turn now). Once WoDX Interactables is on, every token its player owns also gets a **door** (Interact: doors, windows and walls within reach).

## WoDX Chronicle: the clock, eras and the queue

Chronicle is the base the other modules stand on. It only runs in worlds marked as WoDX worlds.

**The clock.** World time starts on 1 January 1197. Dates follow the Julian calendar, then the Gregorian from the reform in the chronicle's homeland (Bohemia by default: 6 January 1584 is followed by 17 January). The Clock shows sunset, sunrise, the hours of dark, the moon's phase and its auspice moon. Sunrise and sunset come from the latitude setting (50.1, Prague, by default).

The Clock's buttons:

- **+10 min, +1 hour, +1 day, +1 week**, **Dusk** and **Dawn** move time.
- **Set date** jumps to a date. Setting the date also rewrites the Chronicle Rules journal's stamp.
- **End the scene** ends every effect that lasts a scene (Quickening, scene-long powers).
- **Pass the years** opens the time skip (see Creation).
- **X-card**, **Lines and veils**, **Session Zero**, **Chronicle Rules**, **Approval queue** and **House rules**.
- Players see **Ask the Storyteller**, which sends a request to your queue.

**How game time passes.** There is one clock for the whole world, and every scene and realm reads it. It never runs by itself: it moves when you press a button, or when something you approve moves it. About thirty parts of WoDX follow it (effects, healing, sunlight, routines, faction turns, long tasks, letters, money, dated events, era changes).

- **Long rolls.** Tick Move the clock on an extended roll, a rite, a meditation, a prayer, downtime or mending. Your roll moves the time at once; a player's roll sends it to your queue as "Time for a long action".
- **Long tasks** (days or weeks of work) never move the clock. They roll by themselves as it passes.
- **A character's own time.** Travel and solo play move only that character's time. So does anything done apart from the main group (the scene with more than half of tonight's characters): a long roll, an interaction, a fight or a journey. With the party split two and two, both halves keep their own time. The Clock's **Time** row shows who is ahead or behind; **Convene** brings them together, moving the clock up to whoever is furthest ahead. Dawn pulls everyone who is behind up to the clock. Turn this off with the world setting "Work done apart goes on the character's own time".
- **Trips across the country.** Open **Travel places** and give a place its nearest town on the country map (Near: type the first letters and pick the town), with a distance and direction if it lies outside the town (12 NE). A trip between two such places finds its own way by the roads, railways and rides of the year, and the log lists it leg by leg. Players choose a pace and where they sleep; a long trip stops for the night, and those the sun burns wait out each day in a town. Paid rides (coach, boat, train, bus, flight) leave only from their stops, and the fare and inn nights come out of the purse. Minutes you type on a place or route still win. A place with no town set works as before.
- **Wild land with no edge.** In the token tools open **Realm maps**. Under Wild land pick the open Umbra or the Tempest and press **Draw wild land** (leave Seed empty for a new wild, or give a seed to get the same one back). To go further, open that piece, select the travellers, pick a side and press **Walk on**: the piece beside it is drawn and the tokens are set down where they walk in. **Bring them back** returns them to where they first came from however far they went.
- **Under a town.** The map tools can make what lies under a generated town: `ddwarren.py --kind warren --under <town>.wodx.json` for a warren whose stairs come up inside the buildings above, and `--kind sewer` for the sewers (make the town with `ddtown.py --plan` first). Adopt the map like any other; **Reflect** then reads it as an underground place.
- **Fights.** When you end a fight, the time moves by its turns times 3 seconds (world setting "Seconds a turn takes"; 0 turns it off). The after-action card says how long it lasted.
- **Otherworld journeys.** The journey card says how much time passes outside (a Moon Bridge takes a thousandth, a trod can run fast or slow or lose days). Press **Let the journey's time pass** on your copy when they arrive. The Labyrinth, the Far Dreaming with Arcadia, and the Deep Umbra are your call: the books say time runs differently there but give no rate, so the card keeps the plain clock and reminds you. A fight's turn is 3 seconds, the books' figure; raise it in the settings for a slow, tense scene.
- **Homeland.** The chronicle can be set anywhere in the world. Pick the Homeland in WoDX Chronicle's settings (44 regions, from Moravia to the Pacific islands): the latitude, the people's names and the weather follow it. Money keeps its own setting in WoDX Storyteller, because purses are not converted. The holy days follow the homeland too (the Muslim year in Cairo, the lunar year in China); **Whose holy days the chronicle keeps** in the settings overrides it.
- **Where this scene stands.** For a scene far from home, pick its region from the Clock, or set its latitude and its hours from home by hand. Sun, sky and the hour shown for that scene follow it, people made on that scene are named as that region names them, and its weather is that region's; the clock itself keeps home time. The scene has its own weather for the night, apart from home's. Its holy days are its region's, or pick another under **Holy days kept here** for a quarter or a mission; the Clock also tells you which named days other faiths keep today. A price asked there is worked in the local money, with the money changer's cut on top (WoDX Storyteller, **Money changers abroad**); purses stay in the home money.
- **The clock that runs with the table.** Off by default. Set "Clock runs with the table" to a number of game minutes and it moves that much every so many real minutes, the same on every scene. It waits while the game is paused, during a fight, while the world is held and when no player is connected.
- NPCs keep no time of their own. They follow their routines on the world clock; on scenes nobody is viewing they are placed when the scene opens.

**Eras.** The date picks an era profile: Dark Ages (1197 to 1346), Plague and Long Night (1347 to 1449), Renaissance (1450 to 1600), Victorian (1837 to 1901), Wild West (1860 to 1899, the Americas only), Great War (1914 to 1918), Modern (1990 to 2003), and two optional branches: Time of Judgment (2004) and Future Darkness (2010 onward). The profile sets which ability list each line gets when a character is made, which Gauntlet chart Otherworlds uses, which menus WoDX Actions shows (Dark Ages mages and fae have their own), which sheet WoDX Sheets draws, and the look of WoDX windows. When the clock crosses into another era, a proposal goes to the queue. You can lock an era from the Clock so it never changes by itself.

**The approval queue.** Anything WoDX wants to change that you should see first waits here: era changes, a player's experience spend, a player's request, generated people, faction results, rumours rising, the year and a day in the Umbra, one-off data fixes. Each entry has **Approve** and **Reject**; a rejection can carry a note back to the player who asked. Decided entries move to a history list below. Both lists have a search box. The same proposal is never queued twice.

**House rules.** Each is a switch, and the Chronicle Rules journal lists what is on.

| Group | Switch | Default |
|---|---|---|
| Automation | Light-touch mode | off |
| Automation | Propose an era change at era boundaries | on |
| Safety | The X-card pauses the game | on |
| Safety | The Storyteller can opt a character in to the inner voice | off |
| Safety | Players may sign their lines and veils | off |
| Timeline | Time of Judgment (2004) | off |
| Timeline | Future Darkness branch (2010 onward) | off |
| Rules | Ghouls use V20 Dark Ages rules in every era | on |
| Passing the years | Thick blood | off |
| Passing the years | Mortal decline | on |
| Passing the years | Morality drift | off |
| Passing the years | Experience for the years | on |
| Passing the years | Convert Dark Ages Abilities | on |

**Conditions and timed effects.** Blinded, Crippled limb, Dazed, Held, Completely immobilized, Staked, Knocked down, Incapacitated, Torpor, Frenzy, Rötschreck, Obfuscated and Sneaking show as token statuses. Combat reads them for dice and difficulty. A timed effect ends by round, scene, night (at dawn) or clock time, and takes back exactly what it added.

**Safety.** The X-card (button, the Clock, or Ctrl+Shift+X) shows everyone the card, never says who pressed it, and pauses the game while that switch is on. NPCs never act while the game is paused, and every inner voice stops for the scene. Lines and veils are the table's content limits: a line is something that never appears in the game, and a veil is something that may happen but off screen, with the scene cut away. Players add them from the Clock, and they go into the Session Zero journal without names.

**Players' buttons.** **Player toolbar buttons** has a tick for each WoDX button and each player. **Find my character** takes a player to their token on any scene; if the player cannot view that scene, your client pulls them there.

**The look.** WoDX windows and cards wear the era's kit (manuscript for the Dark Ages, typewriter for the Great War, neon for the Modern nights) and the line's accent. Each person can change their own look, text size and motion under Configure Settings (client settings).

**Which build is running.** The Settings sidebar shows you the WoDX build the server runs, for example "WoDX build 3cd5b87, 9 Nov 2026" (players do not see it). "Mixed" means the system and modules on the server come from different commits, and you get a warning at start; hover over the line to see which package has which. "Not stamped" means the files were copied from a working folder rather than released.

**Generated people.** Names and people come from tables keyed to the era and to "Where the chronicle's people come from" (Bohemia by default). The tables are installed as Roll Tables; edit them and WoDX keeps your edits.

## WoDX Otherworlds: the Umbra and the Shadowlands

**Ratings.** Each scene carries a kind of place (town, village, wilderness, caern and so on) and, if you want, a Gauntlet override, a modifier, Shroud, Banality, a reflective surface and an Umbral storm. A region with the "WoDX: Otherworld ratings" behaviour overrides its scene. Set them in **Otherworld ratings by scene** (ghost button). That window can suggest tags from scene names, fill from the Rothenstein preset, let battlemaps follow their parent scene, and write a report journal. Rothenstein's scenes are already tagged.

**Gauntlet charts by era.** Dark Ages: Werewolf before 1601, the Wyld West rules in the Wild West, W20 from the Victorian age on. The charts are on the "Gauntlet charts" page of Chronicle Rules.

**Step sideways and peek.** Select the Garou and press the door (cross) or the eye (peek). Gnosis is rolled by the era's rules: reflective surface, the Dark Ages penalty for repeated tries, the W20 hour of waiting, shift time, the pack's opener of the way, Caught and Lost, and the storm's double 1s. The result goes to chat with the dice. A Garou in the Umbra moves to the scene's Penumbra level and keeps their height above the floor. Statuses: In the Umbra, Caught in the Gauntlet, Lost in the Pattern Web. The Otherworlds window clears them for selected tokens.

**Twin levels.** Each of the 22 world maps has a Penumbra level (elevation 1000) and a Shadowlands level (2000) with its own night art. Roofs, props, lights and roads are copied onto each level, so a road out of one map's Penumbra leads to the next map's Penumbra. These are built already. The two-squares button opens the window to build, rebuild or remove them and to make Umbral paths.

**Cross the Shroud** (skull, Storyteller). Moves the selected tokens to the Shadowlands level and back, and whispers the place's Shroud and how they crossed. It makes no roll: each power rolls for itself. A Garou cannot step sideways from the Shadowlands.

**Disconnection.** Each lunar cycle spent in one world adds +1 to crossing into the other. After a year and a day in the Umbra, a proposal reaches the queue.

**Read the Soul** (sparkling hand). Select the reader and target the one read. Auspex 2; Perception + Empathy at 8. Only you see the roll; the player sees what the soul shows for the successes, and a botch shows a false reading. The aura is drawn round the token for the reader alone for 20 seconds. Set a character's colours with the palette button; vampire, ghoul, werebeast, witch, ghost, fae and frenzy are read from the sheet.

**One Umbra.** Where the lines disagree about the spirit world, Wraith comes first, then Werewolf, then Mage.

## WoDX Creation: changes of state, experience and the years

Open it from the droplet button. It lists the player characters and their allies; tick "Show every NPC" to see the rest.

- **The Embrace.** Pick a mortal or ghoul and a sire. The new vampire sheet takes the sire's clan, one Generation further from Caine, the blood pool for that Generation, one blood point on rising, the Road of Humanity at the mortal's rating, and the clan Disciplines at 0. The mortal sheet is kept in "WoDX · Before the Embrace", and the tokens show the vampire.
- **Give vitae.** A mortal who drinks becomes a ghoul (Potence 1, a 10-point pool). Each drink on a new night moves the blood oath on, and the third binds. A full oath allows no new bond.
- **The First Change** wizard for werewolves.
- **Lineage.** Sire, domitor, bonds and the life before the Embrace live on each actor; the "WoDX Lineage" journal draws the trees.
- **Groups.** A coterie, pack or cabal is a Group actor. Its sheet pools Backgrounds and holds an Anchor.
- **Allies.** Make any NPC the ally of a player character. The patron's owners may then spend experience on it, from its own pool or the patron's.
- **Experience.** You **Award experience**. Players ask to **Spend** from the droplet button; the spend waits in the queue and the cost is checked again when you approve it. Costs follow each line's book. The "WoDX Experience Log" journal lists awards and spends by in-game date. Nothing awards experience automatically.
- **People.** Roll a batch of people for the era and homeland, re-roll any row, then **Make them now** or **Send to the approval queue**. Their sheets go in "WoDX people", with Nature, Demeanor, trade, Attributes and Abilities filled in.
- **Pass the years.** Pick a number of years and press "Show what happens". Each character's changes are listed: ageing and death checks, an heir, ghoul feeding or lapse, bonds fading, torpor, healing, the new era's abilities, Backgrounds to review, and the advancer for each line (decline, thick blood, drift, experience, Dark Ages Abilities and Roads moved to their later forms). Tick what to accept, then **Pass the years**. Where a change has more than one answer, the window asks. **Write the plan to a journal** puts it in the "WoDX Time Skips" journal without changing anything. Ticked characters are copied to "WoDX · Before the years" first; the dead go to "WoDX · The Dead". Nothing is deleted.

## WoDX Actions: the menus

Each token's **WoDX Actions** button opens its line's menu. The line comes from the actor type (right-click the WoDX Attack sword, or the "WoDX: Actor Type" macro): Kindred, ghoul, mortal and Kinfolk, hunter, Garou and Fera, mage, changeling, wraith, spirit, creature, demon, mummy, Kindred of the East, Orpheus and Exalted.

**How a menu works.** Buttons are grouped by what the player wants: **Act**, **Resist**, **Recover**, and for you **Storyteller tools**, with a strip of scene buttons at the foot. There is a search box (start typing), the last four buttons used, a hint for each button, arrow keys and Enter.

**Cards.** Every action posts one card: the line's mark and the verdict in the header, the roll in the body, "what changed" with the resource pips, and the book pages in the footer. Flavor text under the result can be shown to all, whispered to you, or turned off.

**What each line has**, in short:

- **Kindred** (V20 Dark Ages in the Dark Ages, V20 later): every Discipline power with its roll, difficulty and cost, from the sheet's dots; feeding, hunting with witnesses, spending blood, the Blood Oath, diablerie; frenzy and Rötschreck with the Road's own Virtues; nine Roads and their Paths with their sins; torpor; the Prestation ledger; downtime and domain; Masquerade records. Storyteller tools: New Night, boons, Masquerade, Sky and sun, End of story.
- **Ghouls**: V20 Dark Ages ghoul rules in every era.
- **Garou and Fera**: form changes, Rage and frenzy, Gnosis, Gifts, rites, fetishes and talens, Renown and Rank, Battle Scars, the Delirium, Kinfolk. Moon Rage at nightfall comes as a whispered card.
- **Mages**: Dark Ages fellowships, Foundations and Pillars with Backlash, Branding, Twilight and the Fount in the Dark Ages; Mage 20th casting with Paradox from the Victorian age on.
- **Changelings**: Dark Ages: Fae (Origins, Courts, Mists and Weaving, Dominions by the hour and season) or Changeling 20th (Arts and Realms, Nightmare, Banality, Bedlam).
- **Wraiths**: Arcanoi, Passions, Fetters, the Shadow and Shadowguide, Catharsis, Harrowings, the Caul, the Maelstrom (Great War rules in their era).
- **Hunters**: inquisitors in the Dark Ages, The Hunters Hunted II until 1998 (Numina, hedge magic), Hunter: The Reckoning from 1999 (creeds, edges, Conviction); True Faith.
- **Demons, Mummies, Kindred of the East, Orpheus**: each line's own powers, resource and fall (Torment, Sekhem and Balance, Chi and the P'o, Vitality and Spite).

**What runs by itself** (each has its own setting, all on by default):

- Healing with the clock: mortals and ghouls heal by the book; shapechangers regenerate.
- Dawn and dusk cards: stay awake, sunlight, New Night, heal on rising.
- Torpor from a track full of lethal, with a card when the vampire may rise.
- Prompts for wounds, fire, the hunger line, a vessel drained, frenzy and the Delirium.
- Willpower recovery: a point a night (default), all at a story's end, or off.

**Sunlight.** Sun comes from a "WoDX: Sunlight" region, a region named sunlit (shade, shelter or indoors protects), or a scene marked outdoors in Sky and sun. The sun's height comes from the clock; walls cast shadows on outdoor scenes. The Sky setting caps it (clear, cloudy, heavy cloud, storm). You get warnings 30 and 10 minutes before sunrise, saying whether each Cainite is in their haven. Damage is a card with a button by default.

**The inner voice.** Players can voice each other's Beast, Shadow, Rage or Impulse in a private channel. It needs the world switch, each player's own opt-in for their character, and stops for the scene on the X-card. Proposals come to you through the queue. To assign a voice: select the character's token, open its WoDX Actions menu and press **The inner voice** in the scene strip (Kindred, ghouls, Garou, wraiths, hunters), or press **Voices I play** on any menu and pick the character. In the panel, **Assign who voices it** picks a player or you. The assignment is per character. The character's own player then opts in from the same panel; with the house rule "The Storyteller can opt a character in" on, you can opt them in yourself, and the player is told.

## WoDX Combat: attacks and the turn conductor

**Attacking.** The sword on the token HUD opens the attack dialog. Weapon and Defense start on **Automatic**: Combat tries every weapon and defense on the sheet against this target and uses the best, then says on the card what it picked and why. Each choice can still be set by hand. The dialog also fills in conditions, the defense count, multiple actions, flank or rear (from the target token's rotation), opponents engaged and Fortitude blood (by the character's soak policy, aggravated only by default). A suggestions box gives the expected result; it never spends anything.

**Quick attack.** Shift-click the sword, or the "WoDX: Quick Attack" macro, to attack the target with every automatic choice and no dialog. With several tokens selected, each attacks in turn.

**Damage.** Soak covers silver, cold iron, Fortitude and armour, with silver and gold by era, breed and form. Wraiths take harm on the Corpus track. One attack that does more than the target's Stamina after soak (Stamina + 2 for the supernatural) leaves them Dazed for a round. "Soak & Apply Damage" and "Heal or adjust" are macros for damage by hand.

**When lines meet in a fight.** The attacker's book sets the damage type and the target's book sets the soak. A demon soaks lethal only in its apocalyptic form, a mummy soaks bashing and lethal but not aggravated, a Dark Ages fae soaks lethal in the mien and soaks cold iron, and a mortal takes fire as lethal. Only fangs bite for aggravated damage; anyone else's bite is bashing. Celerity adds dice to Dexterity rolls but nothing to Initiative. Fae blood is a drug to Kindred: each point drunk brings a scene of hallucinations and waking dreams and takes 1 to 3 dice from every pool. Every such ruling is in docs/RULES-CLASHES.md.

**Initiative** is rolled for everyone at the start of a fight and every turn by default (setting "Roll initiative automatically": every turn, start only, or off).

**Movement.** In a fight each move shows the pace over the token: walk 7, jog 12 + Dexterity, run 20 + 3 × Dexterity, in yards, with Celerity and wounds counted. The setting "Movement in a fight" can stop moves past running speed (never yours). The card notes when a character moved more than half their running speed, after which they cannot attack.

**Moves out of turn.** Set "Moves out of turn" to "Only the character whose turn it is" and a player can move a token in a running fight only on that character's turn. A character holding the action presses Act next first. Tokens outside the fight move freely, and you can always move any token yourself, so a dodge, a shove or a fall is yours to move. It starts Off.

**The turn conductor.** Off by default. With **NPC turns**, an NPC's turn ends once WoDX NPC has acted or you accept its plan, then waits 3 seconds so you can read the cards. With **Everyone**, a player's turn also ends 6 seconds after their action is spent, unless they hold. A time limit per player turn is off (0) by default; when it runs out, the action is held. A banner above the hotbar shows the turn, the countdown and who is holding. Players get **End turn**, **Hold**, **+1 extra action** and **Act next**; you also get **Step back** and **Pause**. Extra actions from Celerity or Rage come in a second pass at the end of the round. A held action is lost at the round's end, so a hold on the last turn of a round is lost at once.

**Ambush.** A character who is sneaking, Obfuscated or hidden by you and attacks someone not yet fighting rolls Dexterity + Stealth against the target's Perception + Alertness first. A win means a free attack the target cannot defend against (in V20, the extra successes join the attack dice; in the Dark Ages, no extra dice). A tie strikes first, but the target may defend. A loss means the target sees it coming: no blow, and the fight starts on initiative.

**Fights that start by themselves.** The setting "Start fights by themselves" (Suggest by default) watches for the moments a fight breaks out: an NPC who regards a character as Hostile or Hunted sees them; guards at a place on alarm see someone they do not know or distrust; a Reaction region's response is Fight; an NPC's attitude falls to Hostile with the character in sight (a social roll gone badly, a theft caught); someone frenzies outside a fight; an attack is made outside a fight; or a door or region outcome says `fight`. A sneaking or Obfuscated character gets the same noticing roll as in a Reaction region, and a sleeping NPC sees nothing. Bystanders never start one: they flee or call for help. With **Suggest** you get a card naming who and why, with **Start the fight**. With **Auto** the fight starts at once and the card has **Undo**. Either way the NPC's household within call comes too, a fight already running on the scene is joined instead of a new one, and Initiative rolls as its own setting says. Light-touch mode keeps it at Suggest, and **Off** leaves every fight to you. "A hostile NPC sees this far" (30 yards by default, a third of it at night) sets the range. In a door or region's Then list, `fight` alone brings in the NPCs near who distrust the character, and `fight the Kessler farm` or `fight Hans, Old Kessler` names them.

## WoDX Targeting: who a power or attack is aimed at

**What it does.** When a power or attack window opens and no one is targeted, a box at the top names the likeliest target and why: the foe who hit last, then whoever is in reach, then the nearest for a hostile power; the most wounded for healing; the nearest ally for a helpful power; the user for a power on oneself. Below it are the next three and **No target**. The box follows the power picked in the window. It is in the Discipline, Gift, Arcanos, Evocation, Edge, Horror, Hekau, Blessing, Effect, spell and cantrip windows, and in the attack dialog.

**Settings.** "Targeting" (world): **Off**, **Suggest** (the default) or **Automatic**. Suggest fills the window with its choice and makes it the target only when the window is used. Automatic sets the target as the window opens, for the Storyteller only; players always get Suggest. Each player can turn it off for their own computer with "Targeting for me".

**What it never does.** It never changes a target someone set by hand; it names it "set by hand" and leaves it. It never picks a token hidden by the Storyteller, an invisible or Obfuscated one, or one the user cannot see. Area powers list everyone in range, allies unticked, and set nothing until "Target these" is pressed. A neutral token counts as a foe only after harm passed between them; a player who aims at one gets a warning, and you get a whisper. Casting windows with no power list (Mage 20th, Dark Ages mages and fae, Changeling cantrips) ask what the casting is aimed at.

**Ranges.** Touch, melee reach, voice (30 yards), line of sight, any distance, by each power's tag. Powers from the sheet only are guessed from their names.

## WoDX Sheets and the Sheet look

Each line's sheet follows its printed sheet, and the sheet follows the era: a Dark Ages chronicle gets the Dark Ages: Fae, Dark Ages: Mage, Dark Ages: Inquisitor, Dark Ages: Werewolf and V20 Dark Ages Kindred and ghoul sheets; later eras get V20, W20, M20, C20, Wraith 20th, Hunter: The Reckoning, Demon, Mummy, Kindred of the East and Orpheus. Only the Core page changes. Every other tab is the system's own, so rolls, dots, health and gear work as before. The header fields are the Bio tab's own controls, so a change on one shows on the other. Locked sheets show text, as the system does.

To give one character another sheet of its type (a later-era sheet in the Dark Ages, say), use Foundry's sheet configuration; the system's own sheets stay selectable there.

**Sheet look** (world setting, WoDX Sheets): "WoDX line skins" gives each line its own title face, paper and section rules in light and dark mode. "The system's own look" brings back the system's fonts and banners. It switches at once, with no reload.

## WoDX NPC: combat, routines, factions and rumours

### NPCs in combat

Each NPC has a template (ten of them: Kindred neonate, Kindred elder, ghoul, Garou, mortal guard, mortal bystander, hunter, spirit, ghost, beast or creature) and a profile you can tune in its **Behaviour** window (the knight on its HUD, or the **WoDX NPCs** panel). On its turn WoDX works out its options with a reason for each: close and strike, run at a foe too far to reach, flee when hurt, full defence, frenzy, Rage, or call allies. It reads who has hurt it, what its foes carry that it fears (a torch for a Kindred), hidden foes, and a ghoul's domitor.

The mode comes from the NPC, else its scene, else the world setting:

- **Suggest** (default): a card whispered to you with the options. **Accept** does the first; "Do this instead" picks another; **Behaviour** opens the profile.
- **Auto**: the NPC acts and posts a card with **Undo**. Undo puts back position, movement, health or Corpus, Willpower, blood, the unconscious and dead marks, and anyone it called into the fight.
- **Off**: nothing.

It never moves a player's character. It finds paths round walls on square and hex grids, for tokens of any size. On gridless scenes movement is left to you. Right-click the knight on an NPC's HUD to plan its turn now.

### Routines

An NPC with a routine moves with the clock: hour blocks by day, night, weekday and feast day, sending them to roles such as home, workplace, church, tavern, haven, watch post, market, the streets, court, the wilds or their domitor. Easter and the great feasts are known by the era's reckoning; add the chronicle's own in the "feast days" setting. A curfew begins at 21:00 by default and ends at dawn.

To set it up, open **WoDX places** (map button). Tag scenes and regions with what they are; **Guess from scene names** fills untagged rows, and **Match own** sets each named owner's home, haven, post or church. Then give an NPC a routine with **Routine…** in its Behaviour window, or from the WoDX NPCs panel; each template has a preset to start from.

When the clock moves, NPCs on the scene in view walk; those elsewhere jump. In Suggest mode you get a card with Accept; in Auto they move, with Undo, and Undo never removes a token you placed by hand. Routines pause during a fight or a reaction, and the card reports anyone dead or missing.

**WoDX: Reaction** regions fire when a watcher notices someone entering, leaving or staying. Noticing follows the era's book, with Sneaking and Obfuscate counted ("Obfuscate 2 against Auspex 0: unseen"). WoDX never writes what the NPC says: the card leaves the words to you.

### Factions

The **WoDX factions** window (rook) lists the factions, with a search box. Each has a kind, a leader, members, places held, goals, Backgrounds as assets (Herd, Influence by sphere, Resources, Status, Domain, Retainers, Contacts) and a standing from -3 to +3 with each other faction. **Rothenstein's factions** sets up the chronicle's ten from its own people and places; **Add**, **Edit** and **Delete** do the rest.

**Faction turns.** Each faction may act once every 7 days of world time (setting "Days between faction turns"): when the week passes on the clock, at each week of a time skip (twelve at most), or when you press **End the session** or **Run a turn**. Each picks expand, defend, scheme, recruit, hunt or lie low from its goals, and rolls its leader's Attribute plus the move's Background; a move against a rival is contested.

- **Suggest** (default): every result waits in the queue.
- **Auto**: small results (a Background dot, a rumour moving a step) apply at once, with Undo on the turn's card. Big ones (a place changing hands, a member, a new faction, a breach rising) still wait for you.
- **Off**: nothing runs by itself; **Run a turn** still asks.

**Hunting grounds.** **Hunting…** rolls a hunt at a place. Each place has an area with the book's difficulty. Domain and Fame lower it, Herd adds dice, and hunting in someone else's domain adds its security. A trespass that is seen sours the holder's standing, through the queue.

**Masquerade rumours.** A breach recorded in WoDX Actions, or one you enter with **Report a breach…**, spreads day by day through places and Contacts. It rises to the Prince and then to the era's hunters (the Inquisition before 1600, mortal hunters to 1998, the imbued after), and each rise is a proposal in the queue. Deal with every witness first and press **Contain**; a quiet week makes it fade, until the hunters hear of it. Each breach also has **Stop**, **Resume** and **Forget**.

**Who is alarmed, and where.** Witnesses depend on what the act shows and who sees it. Mortals and hunters who don't know are breach witnesses. Creatures of another kind, and animals, are startled: a Cainite seeing a Crinos or a demon's apocalyptic form gets you a "Seen by another kind" card, with no mortal rumour. Their own kind, ghouls of the Kindred, Kinfolk of the Garou and anyone marked as knowing stay calm, and wraiths, demons, mummies and spirits are never startled. For vulgar magick only Sleepers count, and the Cast window says who can see. The place matters too: in **WoDX places** each scene or region has a Masquerade setting. Left blank, a haven, caern or chantry is Closed and an Elysium is Guarded. There the witnesses are still recorded so you can deal with them, but no rumour goes out to the town. Feeding or violence in Elysium is flagged as breaking the Prince's peace. After a Discipline is used in sight, you get a card asking whether it showed (setting **Ask who saw a Discipline**).

**Followers who take orders.** An NPC with no player serves a character when you mark it (the Serves box in Give an order), when it is that character's ghoul, when it came from their background through Make them real, or when Creation made it their ally. The player clicks the bullhorn, picks the follower and an order: Follow me, Wait here, Guard this place, Keep watch, Go to the one I point at, Attack the one I point at, Hold back, Go and do this (an errand), Help me with a long task, Deal with that witness, or Cut them off.

- A hard order waits in the queue with WoDX's suggested refusal roll. WoDX counts an order as hard on its own when it sends the follower across a fight, toward someone hostile or something plainly not human, or tells it to start a fight.
- Keep watch warns the master's player when a stranger comes into sight. Guard steps into the way of a stranger within 10 yards and challenges them.
- In a fight the follower still acts on its own turn, but minds its order: it goes for the one pointed at, holds back, or stands its ground, and it strikes at whoever hurts its master.
- An errand (buy, carry, find, ask around, bring someone to feed on, watch a rival) hides the follower and runs as a long task on its own dice. When it ends, a card says how it went; buying pays from the master's purse.
- Help me with a long task adds the follower's dots in that task's Ability to its master's dice.
- Deal with that witness rolls Manipulation + Subterfuge to talk a breach witness round in the Masquerade records.
- When the master gives chase, a follower on Follow joins in. Cut them off joins the chase after the one pointed at.
- Loyalty moves one step at a time on the attitude track: up when a ghoul drinks from its domitor, down for a month without vitae, for being fed on, and for hard orders. Drift alone stops at Distrusted, and then you are told it may refuse, leave or turn.
### People: relationships, lineage, secrets and why an NPC feels as they do

**Relationships.** Each sheet's Relationships tab (the old Ties tab) lists every tie WoDX keeps, grouped: sire and childer, blood bonds, domitor and ghouls, family, heirs and Kinfolk, mentors and students, Allies and Retainers, friends, lovers and rivals, and open debts and boons from the Ledger. Ties come from the lineage, the Sire box, Backgrounds made real, the Ledger and the hand-made list, and each shows at both ends. Drag a character, scene or journal entry in to add one by hand, pick its role and write a note. The eye button hides a hand-made tie from players; a tie a secret hides stays hidden until it is found out.

**Family and lineage.** **Family and lineage** on the tab (or **Family tree** in the People window) draws one person's lines: sires back to the oldest known, childer, ghouls, family and heirs, mentors and students, patrons and retainers. Click a name to open the sheet, or the small tree button beside it to draw from there. Players see only what their characters know: a hidden sire shows as Unknown, a hidden childe is left out.

**Secrets and hooks.** **Secrets** on the tab (Storyteller only) holds what a character hides, its kind, how grave it is, and the tie it hides. **Save and dig** lets someone dig: Investigation, Auspex Telepathy, Spies or Contacts, or Aura Perception for marks on the soul; or tell them which one. A clue or door can hand one over with `secret <words>` in its Then list. Whoever finds a secret holds a hook: a major boon in the Ledger, owed by the holder. With faction politics on, an NPC holding a hook accuses the holder at court, with proof; at the gathering the secret is laid bare and the hook is spent. Which secrets a court cares about follows the line and the age (heresy in the Church's centuries, infernalism always, a Sabbat tie for the Camarilla from 1493, a Technocracy defection from 1897).

**Why an NPC feels as they do.** Under each talk card you get a fold, seen only by you, with the reasons behind the NPC's attitude: the first meeting, each change since, then boons kept or broken, debts, a fight, ties, secrets, the same clan or tribe. An NPC's Relationships tab lists the same for every character they have met.

**Talk lines that need a trait.** A talk line's "Only when" can ask for any rated trait: `[the abbot] Etiquette 3 => ...`, `[the vault] Dominate 2 => ...`, or a clan, Tradition or kith. When the character qualifies, that line is tried before the plain ones and the card shows what unlocked it, such as [Etiquette 3].

## WoDX Interactables: doors, locks, windows, containers, traps, clues, lights, hiding places, hazards, holy places, watch points, vehicles and climbs

*New module, installed and on in the testing world (rothenstein-wodx) only; enable WoDX Interactables in a world's modules to use it there. Everything here through targets (0.14.0) is deployed there.*

**For players.** Select your token, then press the **door** on its HUD (or the I key). The Interact window lists every door, window and breakable wall within reach, nearest first, and the options for each. Before anything is rolled, each option says the pool, the difficulty, the successes needed, how long a roll takes and how much noise it makes. Clicking a locked door with your token selected opens the same window for that door.

What can be tried: open or close, open quietly (Dexterity + Stealth), lift a bar from its own side, use a key the character carries, pick the lock, beat a keypad or alarm (modern eras), force it, break a pane, heave a stuck window open, listen at it (Perception + Alertness), knock, or **Use a power**, which opens the WoDX actions menu.

**Setting up a door.** Plain doors need nothing: a locked door has a good lock and the build follows the material. For a special one, open the wall's config window and fill in the **WoDX** part: kind, material, build, lock (cheap, good, excellent, masterwork), keypad or alarm, the key's name, a bar and which side it is on, stuck, a secret door's "found", or mark a plain wall as breakable (wattle, timber or brick, stone).

**What happens.** The result applies at once and the card gets an **Undo** for you: the door opens, the lock jams, the pane breaks, the bar lifts. Picking and forcing add up successes on the door, so someone can stop and come back or a friend can take over. A botched pick jams the lock; a botched force is one lethal level. Knocking a wall through is the one thing that waits: it goes to the approval queue, and approving it opens that whole wall segment (split the wall first for a smaller hole).

**Noise and time.** Each attempt is silent, quiet or loud. NPCs within earshot roll to hear it (loud carries 30 yards, 10 through a wall; quiet 5 yards and not through walls), and your copy of the card names who heard and what each would likely do. Nobody moves by themselves: you decide. Attempts that take a minute or more move the clock outside combat.

**Containers.** A chest, box, cabinet, desk, strongbox or safe is a tile. Open the tile's config window and fill in the **WoDX** part: tick Container, pick the kind, and set a lock, its state, a keypad, a key, and what is inside (one item a line: copy the item's UUID from the button in its sheet's title bar, or type its name as it appears in the Items directory). Players find it in the same Interact window as the doors, and can open it, pick or force the lock, and **take what is inside**: each item is copied onto their sheet at once, and the card's Undo takes the copies back. A hidden tile stays out of the players' list until you show it. Leave the list empty to say what is inside yourself.

**Traps.** A snare, pit, tripwire or spring blade is a tile too: tick Trap in the tile's **WoDX** part, pick the kind and grade (crude, good, excellent, masterwork), and hide the tile. Leave the damage blank for the kind's own (a pit 2 bashing dice, a spring blade 5 lethal; choose lethal for a spiked pit). When a player's character walks over it, it goes off: the character rolls Dexterity + Dodge or Athletics to get clear, the damage goes through WoDX Combat's soak, and the card has an **Undo** that puts the trap and the damage back. A snare holds its victim until a Strength roll (difficulty 7) breaks free or someone cuts it. Tick "NPCs set it off" if they should. Players find traps with **Search the area** at the top of the Interact window (Perception + Alertness or Investigation, a minute): a crude trap needs 1 success, a masterwork one 4, and you are whispered what they missed. A found trap shows to players; walking around it is safe, stopping on it is not. They can disarm it (Wits + Larceny, a botch sets it off), set it off from a safe distance, or set it again later.

**Clues.** A letter, ledger, bloodstain, writing on a wall, a trail of prints or something out of place is a tile as well: tick Clue in the tile's **WoDX** part, pick the kind, give it the name players will see, and write what it shows in up to four parts: what anyone sees, then what 1, 2, and 3 or more successes add. Anyone can look at it for the first part. Reading closely (documents and writing, Intelligence + Investigation) or examining closely (the rest, Perception + Investigation) reveals more, and needs at least a dot of Investigation. What they learn comes to that player and to you in a whisper, never on the public card, and a later, worse roll loses nothing. Write only the first part and looking needs no roll. Hide the tile to make the clue something to search for, and set how many successes Search the area needs to notice it. WoDX writes none of the text: it is yours.

**Light sources.** A torch, candles, a lantern, a lamp or a light switch is a tile tied to the scene's own lights. Tick Light source in the tile's **WoDX** part and pick the kind. It works the lights on the tile or within a square of it, unless you list light ids (copy them from each light's config window). Players light it or put it out with no roll, and can break a lantern, lamp or bulb, which is loud and leaves it dark until you untick Broken. The copies WoDX Otherworlds makes of those lights on the twin levels follow them. Undo puts every light back.

**Hiding places.** A wardrobe, a space under a bed, a curtain, deep shadows, a crawlspace or a priest hole is a tile: tick Hiding place in its **WoDX** part and pick the kind (it sets how many fit and how hard they are to find). A character there chooses **Hide here** and rolls Dexterity + Stealth: they are out of sight at once (the Invisible status, so their own player and you still see the token), and each two successes make them one success harder to find. Others find them with **Search it** on that place (one success easier) or Search the area, and you are whispered who stays hidden. Coming out, or walking away, ends it. NPCs can hide too: use Interact on their token.

**Fire and hazards.** Fire, a brazier or lamp, broken glass or caltrops, and a live wire are tiles: tick Hazard in the **WoDX** part, pick the kind and size the tile to the area. A burning fire hurts whoever walks into it, and in combat whoever starts a turn in it: its size sets the levels (1 to 3) and its heat the soak difficulty (3 for a candle to 10 for molten metal). It is lethal to mortals and ghouls and aggravated to everyone else; a vampire soaks it only with Fortitude, and the card reminds you of the Red Fear. A brazier does nothing until someone chooses **Knock it over**, and then burns where it falls. **Put it out** needs no roll for a small fire and Dexterity + Athletics at 7 for a bonfire; an inferno can't be put out by hand. Name lights in the light source part and they burn while the fire does. Glass costs dice of lethal damage, less one for each success on a careful step, until someone sweeps a path. A live wire does 2 to 8 levels a turn by its current and holds whoever walks onto it: **Pull free of the current** is Strength at 5 for a vampire and 9 for anyone else, and cutting the power frees everyone. A vampire soaks the current as usual, but a botched soak makes it aggravated. Tick "Only player characters" to spare NPCs. The damage goes through WoDX Combat, and every card has Undo.

**Altars, relics and fetishes.** An altar or chapel, a wayside shrine or a holy well is holy ground: tick Altar, relic or fetish in the tile's **WoDX** part, pick the kind and give it a rating from 1 to 5. **Pray here** opens the WoDX prayer window (pick Holy Ground and the rating the window names). **Desecrate it** takes a minute and is loud; the ground stays unholy until you untick Desecrated. A demon who steps onto holy ground, or starts a turn there in combat, is seared: nothing at Torment 3 or less, else lethal levels equal to the rating and a Willpower roll to stay. A holy relic or a fetish rests on its tile until someone chooses **Take it**: name the world item on the tile, and the character gets a copy. A fetish is then attuned and used from the WoDX actions menu. A caern stone, a fetter or a node is marked the same way with its rating; **Use it** opens the WoDX actions menu (a fetter opens the Fetter window), where that line's own rolls are. Every card has Undo.

**Watch points.** A window on the street, a mirror, a telephone, a radio or a bell is a tile: tick Watch point in its **WoDX** part, pick the kind, and tie it to another tile by that tile's id (or its UUID, for one on another scene). For a window or mirror, draw the tied tile over the area it shows. **Look out** is Perception + Alertness: a success names who is there, none gives only how many, and it all goes in a whisper to the player and you. Hidden and invisible characters stay out, and a mirror shows no Lasombra (you are told who is missing). **Make a call** reaches the tied phone or radio, and you play the other end; **Call for help** and **Raise the alarm** tell you to decide who comes. Phones wait until about 1890 and radios until about 1930.

**Mounts and vehicles.** A horse, a mule, a cart, a carriage, a rowing boat, a car, a motorcycle or a motorboat is a tile: tick Mount or vehicle in its **WoDX** part and pick the kind; Seats is blank for the usual number. A character beside it takes the reins (**Mount it**, **Drive it**), with no roll on a dot of Ride or Drive, or the Attribute alone at +1 without; others **Get on as a passenger**. From then on, moving the token at the reins moves the tile and the passengers with it; a passenger who walks away is off. At the reins, **Keep control** is Dexterity + Ride or Drive at 6 for an obstacle or a skid, and **Go flat out** the same at +3. A botch throws the rider or crashes the vehicle, and you roll the fall or the damage. Cars wait until about 1900, motorcycles and motorboats until about 1910. **Everyone off** in the tile config empties it.

**Climbing and jumping.** A ladder, a rope, a tree, a rough wall or a cliff is a tile: tick Climb or gap in its **WoDX** part, pick the kind, give the height in feet, and put the id of a tile at the top in Leads to. **Climb it** is Dexterity + Athletics at 6, rolled until the climber has enough successes (5 yards a success up a rope or tree, 3 up a rough wall, 2 up a cliff; a ladder needs no roll). Reaching the top moves the token onto the tile it leads to. A botch falls from as high as the climber got. A gap to jump has its width in yards and its drop in feet: **Jump it** is Strength + Athletics at 3, a yard a success. A jump that falls short leaves the character hanging, to **Catch the ledge** (Dexterity + Athletics at 6) or **Let go**. A fall is one bashing die a 10 feet, soaked on the WoDX Combat card, and you move the token to where it lands.

**Targets.** A target with rings, a row of bottles or cans, a practice dummy, or something to break is a tile: tick Target in its **WoDX** part and pick the kind (and, for something to break, what it is made of; for bottles, how many). It shows in the Interact list out of reach, as far as anything on the character's sheet carries, while the token can see it. **Shoot it with** each bow or gun on the sheet uses that weapon's own pool and difficulty, +1 beyond its range and +2 beyond twice its range, as WoDX Combat does; **Throw something at it** is Dexterity + Athletics at 6 out to 10 yards. Aiming is yours to allow, a die a turn up to Perception, as Bonus dice. A target with rings scores 1, 2 or 3 points by successes on a scoreboard kept on the tile (**Read the scoreboard**; tick Clear the scoreboard to start again). In the early eras it is named an archery butt. Bottles fall one a hit. A practice dummy can be struck within reach. Something fragile shatters on any hit; anything sturdier is broken within reach with **Break it**, by Strength like forcing a door. A gun that botches jams; a wild shot or throw is yours to place. Scores give no experience on their own.

Settings (WoDX Interactables): the door-click shortcut, reach in grid squares, whether long attempts move the clock, whether NPCs hear noise, and whether traps go off. You can Shift-click a locked door yourself to use Interact for the selected token.

### The world map

**The world map** in the Storyteller's hand shows the whole Earth by night, one square for about every 100 km. It makes nothing and changes nothing; it is for answering "where is that, and how long would it take to get there?"

- **From** and **To** take a world region from the list, or a spot typed as north and east in degrees (49.2, 16.6 is Brno; south and west are negative). **Year** starts at the chronicle's year. Choose **Show**.
- Under the map: where each spot lies (its ground, region and river), the distance, and how long the journey takes in that year by land and sea, leg by leg, and by air once there is air. The times are rough. Ships use the Suez Canal only from 1869 (not from 1967 to 1974, when it was shut) and the Panama Canal only from 1914; before that a journey crosses the neck of land on foot or by rail, or sails round, and the lines say when a canal is used. A trip inside Moravia still uses Travel places, which knows the roads.
- **Known world** starts at what the chronicle's homeland knows in the year. Lands nobody at home has heard of are drawn dark, and no journey can end in them or cross them: from Europe there is no way to the Caribbean before 1492, to India before 1498, to China before 1513, to Mexico before 1517, or round the Cape before 1488. Lands open by themselves in their year as the chronicle's clock moves. Other homelands have their own unknown world: Mexico knows nothing of Europe before 1492. Choose "The whole world, known or not" to see and plan across everything.
- **Discoveries** lists the lands still unknown in the year. Tick one the chronicle has found for itself, by a voyage, a map or a spirit's word, and it is known from then on. If a found land still has no way to it, tick the coasts and islands that lie before it.
- **Look closer at From** shows that one square at about 5 km to a small square. It is made from the world map and is the same every time.
- With WoDX Otherworlds on, **Show** also offers the Penumbra, the Shadowlands and the Near Dreaming (the same map as it looks from the other side) and the chart of the worlds, which gives every realm of Realm maps a spot. Where a realm sits on the chart is WoDX's own arrangement, not a rule.

### Realm world maps

**Realm world maps** (among the token tools, and under **Realms past the near worlds** in the world map window) shows the whole of one realm past the near worlds: Pangaea, Malfeas, the Tempest, Stygia, the Far Dreaming and 29 more. It makes nothing in the world; it is for answering "what lies where in this realm, and how long is the way?"

- Pick a **Realm**, then **From** and **To** among its places, and choose **Show**. Under the map: the time the way takes and the ground it mostly crosses, what holds for the realm in the year, and when its map changes.
- The places are the realm's own, from the books. Where they lie, the ground between them and every travel time are WoDX's own, because the books give no maps and no distances. Treat a time as a starting point and change it when the story wants.
- **Shown** starts at what the chronicle has found: travellers know the place where they arrive, the rest is dark, and no journey can end at a place not yet found. **Found places** ticks the places the chronicle has found. **The whole realm** shows everything, for the Storyteller's eyes.
- Some realms do not hold still. The Tempest, the Far Shores and the Labyrinth are made anew by each Great Maelstrom; the Far Dreaming each season (pick the **Season**); Flux, a Battleground, a Dream Zone, the Deep Dreaming, a Paradox Realm and the Deep Umbra on every visit (choose **A new visit**). A Horizon Realm, a Shade Realm, a Shard Realm and a Dark Kingdom each have a map of their own by the name typed under **Which one**. A map made anew starts with nothing found.
- Many places carry a line from the books on what they are, with the page. It shows under the map for the two ends of a journey, and in **Found places**. **What the books say of how it lies and how it changes** opens the books' own notes on the realm; the map does not yet follow them place by place.
- Pale dots are a realm's landmarks, blue dots its ways in and out, red dots dangers that sit in one spot. Where the realm has a named way in, that is the place travellers know on arrival.
- **Look closer at From** shows the square of that place and its neighbours.
- To play a scene inside a realm, draw it with **Realm maps** as before; the world map of a realm does not make scenes.

### Settlements: a whole town from the generator

The town generator can make a whole place for any year from 1197 to 2099 in one command (tools/mapgen/ddsettle.py: a name, a seed, a size and a year). Beside the Dungeondraft maps it writes a settlement record, a file ending in .settlement.json: every household with its trade, its standing and its people, the offices of the age, and the ties between households.

1. Open **Settlements** in the Storyteller's hand and choose **Bring in a record**. Pick the .settlement.json file.
2. Read the review. Untick any household to leave its building empty. Under **Hidden folk** the review proposes who is more than they seem, by game line; untick any, or choose **Draw the hidden folk again**. Untick a kind of tie to leave it out.
3. Choose **Enter it into the world**. The settlement becomes a journal in the folder "WoDX settlements" that no player can read. No sheets are made yet.
4. Export each map from Dungeondraft, import it, and adopt it (right-click the scene, **Adopt a generated map**).
5. Right-click the scene and choose **Seed the residents**. Struck households are unticked, and the hidden folk are marked in the list. A block of flats lists every flat; seed a few now and the rest later if wished.

After seeding, a hidden one's sheet carries a note only the Storyteller sees, and making them a ghoul, Kinfolk or mage in full is done by hand. Those who go out to work have their workplace in their routine when it stands on the same map. Ties between household heads appear as relationships on their sheets once both are seeded.

To change the review later, open Settlements, pick the settlement and choose **Review**. Residents already seeded stay as they are. **Remove** deletes only the journal; residents are removed on their scenes.

## Responsive maps: the map shows what happened, and the world answers

*Interactables 0.12.0, NPC 0.4.0 and Storyteller 0.3.0 onward, on in the testing world (rothenstein-wodx) only. Deployed there 2026-11-09 (gate-maps 9/9).*

**What players see.** When something on the map changes, everyone sees it and it stays: a door opens, a chest shows as forced or emptied, a fire burns out. Give a tile a picture for each state in the **WoDX: pictures and sounds** part of its config window, or tell it to follow a door by the wall's id. With no picture for a state, a small marker with the state's word sits on the tile (world setting "State markers"); clues and hiding places never show one. Each change also floats a word over the spot, a short flash for a loud one, and the tile's own sound, for everyone who can see or hear it. A player with a slow machine can set "Map effects" to Light or Off in their own settings; the lasting change still shows. Undo puts the picture back too.

**Who hears it.** The NPCs who heard a noise each get a reaction card, the same as a WoDX: Reaction region: Suggest or Auto by their profile, with Undo. Someone asleep wakes instead and reacts to the next thing. The card never writes what an NPC says. Turn it off with "NPCs answer what they hear".

**Alarms.** A keypad, a bell or you can put a place on alarm (**Raise the alarm** on the reaction card, or a tripped alarm). It holds an hour of world time, then the place is wary until the next dusk, then calm, and you get a note at each step. Watchers notice more easily meanwhile (difficulty 4 on alarm, 5 wary). Draw a region with the **WoDX: Alert zone** behaviour and list light or sound ids in it: they come on while the alarm holds. Undo on the alarm card takes it back.

**Repairs and grudges.** A forced lock or a broken pane in a place someone owns or lives in is put right at the next dawn, on one card with Undo. A fire, a theft, a desecration or a wall broken through stays until you change it. A break-in, theft, fire or desecration at a faction's place is a wrong against it, so it looks to its defences at its next turn. A desecration by something supernatural gives you a **Start a rumour** button; nothing spreads unless you press it.

**Trigger regions and carried alarms.** Draw a region with the **WoDX: Trigger** behaviour and give it a few words ("the cellar stairs"). When a player's character walks in, it tells you, raises the alarm, or only passes it on to the log and beats; tick Only once for a one-time surprise (untick Already set off to reset it). In an Alert zone, **Carries the alarm to** names other places: a bell, horn or shout reaches them at once, a telephone from about 1890 and a radio from about 1930 too, and a runner arrives after the trip's minutes. Undo on the alarm takes it back everywhere, and turns back a runner still on the road.

**The log and beats.** What a player's character does on the map goes into the tracker's log, the serious ones marked for your attention. A beat can fire on **A change on the map**: pick a scene (or none for anywhere), and type a kind or state such as forced, theft or broken (blank for any change).

## Player immersion: what each player feels, sees and sends

- **Carried light** (WoDX Interactables). The flame button on a token's HUD: light a candle, a torch, an oil lantern or (from 1899) an electric torch. It lights the token and burns down on the clock: a torch about an hour, a candle four, a lantern's oil eight. Out of doors, wind puts out a candle and a downpour or a storm puts out a torch. The player is told when it burns low and when it goes out, and the token's own light comes back.
- **The character's state on screen** (WoDX Senses). Each player sees a quiet edge round the screen and a few words at the top for their own character: wounds, the hunger line, Rage at its full rating, the Shadow pressing, Paradox, Banality, no Willpower left. Each player can turn it off in their own settings.
- **Time as the era tells it** (WoDX Chronicle, house rule, on). A player's clock reads the church's hours before 1350, a striking clock's quarter hours until 1840, a 12-hour clock after that and a 24-hour readout in Future Darkness. Your clock keeps the exact minute.
- **Letters** (WoDX Storyteller). Players press **Send a letter** and pick the way (messenger, post, telegram, telephone, e-mail, the Net, as the year allows) and how far. You get a card for each with **Hold it back** and **Let it go**. It arrives on the clock; one for someone you play is whispered to you to answer. Between lands it takes the world map's journey time for the year from where the sender stands to where the other stands (a scene's own land, else the homeland), and only ways that land has by then are offered: no post in Ottoman Greece before 1840, no cable to America before 1866, no call over the sea before 1927. You can send as anyone you play (Send as someone I play), and **Letters on the way** in your hand lists everything still travelling with **Lost on the way**, **Put it back some days** and **Read on the way**. **Write the answer** on an arrived letter sends the reply back the same long way.
- **The opening card** (WoDX Atmosphere). When a player's view moves to another scene, the place, the date and, out of doors, the weather show for a few seconds. Battle maps get none; turn it off for a scene in the Atmosphere window.
- **Faces you have met** (WoDX NPC, world setting, off). Players see a short description under an NPC's token until their character is introduced. Press the handshake on the NPC's token HUD to tick who knows the name and write what strangers see. Chat and the combat tracker still show the name, so speak as the description there.
- **Paperdoll tokens** (WoDX Paperdoll). Each player presses **Paperdoll** on the character sheet and builds a look: face shape and build, eyes, brows, nose, mouth, hair, facial hair, age, complexion (rosy, ruddy, freckled, gaunt, weathered), marks (moles, birthmarks, pockmarks), a scar, skin, hair and eye colour from a wide range (the strange eyes include red, cat's gold with slit pupils, milky, black and glowing ones), an affliction (pox, pox scars, leprous nodules, boils, sores, a burned side, a mangled face, a lost eye, an eyepatch, warts, scales, a third eye, dark veins, mottled skin), and the era's clothes. The picture is finished like an illuminated page; under **The picture** a player picks the background (gold leaf, lapis, vermilion, verdigris, purple, night, smoke with embers, parchment, rose with silver stars, a red and blue diaper, a gold vine, lilies, a bone and black chequer, punched gold) and the inner ring. Left alone, both fit the character, and spawned NPCs get the same: red and a red ring for Kindred, rose with a carmine ring for ghouls and retainers, lapis for mages, lilies for sorcerers and psychics, the diaper for the faithful, green for werewolves, the vine for other changing breeds and for changelings, purple for fae creatures, night for spirits, the chequer for wraiths, punched gold for mummies, embers for demons, gold for other mortals. Mouths are drawn to fit each face in the same inked style as the eyes, and each character has a lip shape of its own (twelve to choose from, each nudged by the face's seed), with a bowed upper lip, a fuller lower one, shading, teeth in a broad smile or a snarl, and corners that follow the mood. Skin includes sixteen fantastic tones (fae blue, verdant, lavender, gilded, quicksilver, slate, midnight and more); random faces give them only to changelings (about three in five, never kinain) and to spirits, fae and other uncanny creatures. Lips are full and come in nine colours (rose, berry, deep red, plum, coral, brown, dark, pale and bloodless, blackened) or the skin's own; lips, brows and nose are always coloured to show against the skin, so no face looks featureless. Faces are drawn to be serious rather than cartoonish, with soft shading, and each is built in checked stages (head, features, skin, eye cover, clothes, ring); if a stage does not check out, the window says which. Random faces only roll natural eyes, and about one in twenty gets a hard-life mark (pox scars, warts, a lost eye, a patch, a burn). **A new face** rolls one at random; random faces are never children and never use the pallid tones kept for the dead and the strange (a gown, a mantle with a brooch, a veil and wimple, a fillet). **Save the look** and the token shows head, shoulders and chest in the era's ring; the picture is made on your computer, so it appears once you are logged in. The face follows the health track (a bruise at Bruised, a split lip, a black eye, cuts, a bandage, and the colour draining to grey at Mauled and worse) and looks upset as the wounds mount, closes the eyes when Incapacitated, and snarls in frenzy. Turn that off for the world with "Faces show the health track", or a player can untick it for one character. Carried things are never drawn. Only the Dark Ages clothes exist so far; other eras wear them until their own are drawn.

## Between nights, ties and hunting grounds

These three run on your machine only, when the clock moves. Each has a world setting under WoDX Storyteller to turn it off.

- **Between nights.** When you skip a night or more, one entry goes into the approval queue. It shows what the nights cost each player character: a blood a night for vampires on rising, and Willpower back one a night when WoDX Actions is set to nightly recovery. Approve it and a card with Undo appears. Healing over the skip is already done by WoDX Actions. Pass the Years has its own plan and is left alone.
- **Ties that need tending.** Each character's ties come from the sheet: a ghoul's domitor, Fetters, Passions, and backgrounds that are people or places (Herd, Domain, Retainers, Allies, Contacts, Kinfolk, Mentor). Once a game day, the ties that have gone untended come to you on one card, with what the books say happens and a Tended button. Nothing changes on the sheet by itself. Open the Upkeep button (hand and heart) to change how often a tie needs tending, mark it tended, turn it off, or add a tie of your own, such as a sister in Lübeck.
- **Hunting grounds and heat.** In the Upkeep button's Hunting grounds window, give each place one of the Hunt's grounds, from slums to a heavily patrolled area. The Hunt then opens on it. Every hunt there adds heat, a botch or a feeding seen adds more, and a quiet week cools it. A place that is Uneasy is +1 to hunt in; Watched and Hunted are +2. When a place becomes Hunted, the era's answer goes into the approval queue: the Church and the Inquisition in the Dark Ages, constables in the 1800s, police and the press in the 1900s, cameras and the imbued after 1999. Approving it starts a rumour.

- **The Gauntlet over time.** With WoDX Otherworlds on, the Upkeep button also opens The Gauntlet over time. The era's chart already sets each kind of place. On top of that a place drifts one step at a time, up to three either way: taint, a desecration, new building or an untended caern thicken it; a rite at the caern, the Wyld coming back or a cleansing thin it. An uncanny desecration or fire on the map proposes a step by itself. Banality moves on its own track in the same window, for places that have a Banality rating. You can add a caern as a tie, so you hear when its rites have lapsed.
- **Plague years.** In a year of plague, cholera or influenza, the Hunt says so: the sick are easy to find, and their blood can carry the sickness on to the next vessel. No numbers change.
- **Money.** The books give no sums for Resources, only the way each rating lives. The Upkeep button's Money window lists each player character's Resources and how they live now. Tick Away when a character leaves home: 2 dots last six months on what they carry, 3 dots live plainly anywhere. Tick Neglected when a fortune of 4 or 5 dots goes untended: it keeps comfort for a year, then less. Once a month of game time a card tells you the coin of the day (German lands by default; England and France in the settings) and whose living drops soon. To raise money fast, call for Wits + Finance, a roll a night, difficulty 7.
- **Consensus by era.** A Mage 20th caster's Cast window follows the chronicle's year. Before 1450 there is no coincidental or vulgar split, and Dark Ages mages use their own Cast. From 1450 to 1699 magick is casual or vain: name the caster's style, and the window suggests casual when it fits what people believe in that place and vain when it is a stranger's magick. Each cast rolls a Fortune Die: a 1 is a Bane, a 10 a Boon, and either spends the whole Scourge. In that age the Scourge does not fade by the week; use Purify the Scourge, a day alone in meditation for each point. From 1700 Mage 20th applies. Use Consensus here (Storyteller) in the mage's menu to set the styles a place accepts. Reality Zones are off unless you set them to "the place decides".

## Property, making things and building

The toolbar's **Property and building** button (players see it too) lists what characters own, how each place is held in the chronicle's year, and what it is worth, costs and brings in each month. Upkeep and income are paid on the month's pay day with the allowance. Owning a place never adds Background dots; award them or let the player buy them.

- **Tag a holding.** "Tag a place on this scene" picks the whole scene or one of its Regions, then sets the owner (a character, an NPC or a faction), how it is held, since when, the kind of building and what it supplies the market with.
- **Stolen goods.** Taking from someone else's chest or shelf marks the things stolen. The window lists them; mark one Fenced or Theirs now. A thing back on its owner's sheet is theirs again by itself.
- **Make something.** Pick a good known in the year; WoDX sets up a long task (Dexterity + Crafts) with the workshop and materials it needs, and takes or buys the materials. Extra successes make better work.
- **Put up a building.** Pick a kind of building the year allows, the builder and the workers. Each stage is paid for as it starts; the work waits when the money runs out. When it is done the place appears on the scene as a tagged Region, and as its own map when the building kit has one. You can start a build for an NPC faction; factions with Resources 3 or more also propose builds through the approval queue.
- **Workshops.** A working place that supplies a goods category keeps its market from running short of it.

### Markets week by week

Upkeep's **Markets** window holds each settlement's prices and supply. Once a week of game time every market that is not cut off makes, uses and trades goods (setting "Markets move each week"). Three more things ride on that week. All of them are house rules, and none does anything until a market exists.

- **Factions act on markets** (setting "Factions act on markets": Auto, Suggest or Off). A faction that holds a place in a market and has 2 dots of Influence over the law may tax it: light, heavy or crushing, which adds 0.1, 0.2 or 0.3 to prices and cuts what traders earn. One with 3 dots over trade and Resources 3 may corner one kind of goods, which adds 0.3 to its price. One with 2 dots in the underworld may smuggle past a rival's tax or monopoly, which halves what they add. One with 2 dots of Retainers or armed Influence may raid a market held by a faction it stands badly with. Each faction that runs itself has one chance in six a week to make one move. A move waits in the approval queue when a player character stands in that market or belongs to that faction; otherwise it applies and a card with Undo tells you. Factions the players run make no moves by themselves.
- **By hand.** Edit a market to see what is laid on it. Tick "End it" to lift a tax, or pick a faction, a move, the goods and the rate to add one. Your word stands whatever the faction's dots, and lasts until you end it. "Raid now" rolls the raid at once.
- **Raids.** The raiders roll their Retainers or armed Influence at difficulty 6 against the guard. A caravan on the road to or from the market is taken first. With none out, the raid strips a kind of goods from the stalls, robs one till and closes a road for a week per success, four at most. Nothing trades along a closed road.
- **Traders can go broke** (setting of that name). A shop's week is its takings against its keep. Takings follow the supply of what the shop sells, less taxes. When the till cannot cover the keep the shop falls a week behind; four weeks behind and it shuts and draws no new stock. It opens again after eight weeks once trade is good, with a backer if a faction strong in trade is there. Where a player character stands, a shop about to shut waits for your approval. Tick or untick "Shut" on the trader's row to decide it yourself.
- **Caravans** (setting "Caravans carry the trade between markets"). Goods that linked markets trade leave as a caravan of the year: a pack train, a wagon train, a goods train from 1840, lorries from 1920, an automated convoy in the World of Future Darkness. The market that sends gives up its goods at once; the market in want gets them when the caravan comes in. The **Caravans** button in the Markets window lists each one, where it is and when it arrives, with "Bring it in" and "Lost on the road" for when the players have a hand in it. A lost caravan delivers nothing and its cargo grows dearer where it was bound. When a character travels between two markets while a caravan is on that road, your log says so.
- **A caravan on the map.** In a tile's WoDX: living map settings, tick "A caravan in town". The tile then shows only while a caravan stands in that scene's market, for two days after it arrives.

## Chases

Open the Storyteller's hand and pick A chase. Choose the quarry, tick the pursuers (selected tokens are ticked for you), pick the ground and give the lead in yards, or leave it empty to measure from the nearest pursuer. A token at the reins of a mount or vehicle tile starts on it.

Each turn, set the ground the chase has reached, each racer's way (only what exists in the chronicle's year is offered) and who goes flat out, then Roll the turn. Everyone rolls: Dexterity + Athletics on foot, Dexterity + Ride mounted, Dexterity + Drive in a motor vehicle, Stamina + Athletics at the oars. The quarry's head start counts as successes, and the faster side gains up to three free successes a turn. A pursuer whose total passes the quarry's catches up; a lead of 10 and the quarry is away. Once a turn you may tick Call for sight: each pursuer rolls Perception + Alertness, +1 difficulty for every success the quarry leads by (the window shows each difficulty); one who scores nothing has lost the quarry. A driver never rolls more dice than the vehicle's Maneuver.

The players see who is gaining in words. Your copy, whispered, has the dice and totals, Undo this turn, a button for crash or fall damage, and Start a fight once someone is caught. End the chase from the window at any time.

## Riding, driving and swimming under a load

Outside a chase, whoever holds the reins of a horse, cart, car or boat moves at the mount's pace in a fight: a horse covers 50 yards a turn on a road and 30 in town streets, and a car goes by its year. With no dot in Ride or Drive the limit is half; Keep control on the mount's own menu is still the roll for anything risky. Passengers are carried and keep their own move for getting off. The ground is the one the scene's last chase used, else town streets.

In the saddle no Ability counts for more dots than the rider has in Ride (V20 Dark Ages p. 399); the attack line says when it bites. In the saddle a blow down at someone on foot is 1 easier and a blow up at the rider 1 harder; shots from a saddle or a vehicle are 1 harder, and nobody sneaks on either. A rider on a horse or mule adds a damage die to a hand-to-hand blow for each 10 yards ridden that turn, five at most. A rider who is knocked down is prone: take them off with Get off.

Weight matters in deep water. Worn armor counts by its Dexterity penalty, and the weight button on the token HUD sets what else the character carries, from nothing that matters to all they can lift. Each step takes a quarter off the swimming speed and adds 1 to the difficulty of blows, dodges and footing in the water; at four steps the character goes under until they let something go. Strength and Potence of 4 or more take a step off. All of this is a house rule.

Look, Listen and Smell answer from where the character is: from the air the eye reaches further, from the ground or the water less far, and under the water there is nothing to smell. Someone lying prone or under the water is found only on a closer look.

## Battles and sieges

Open the Storyteller's hand and pick Battles and sieges, then A new battle or A new siege. If the chronicle has a war, battle or siege among its dated events near the clock's year, you can start from it. Give each side its men, quality, the supernatural in its ranks, where it stands and a commander: a sheet (WoDX reads Perception, Charisma, Intelligence + Leadership and Wits + Medicine from it) or a name with four pools. Tick the characters who fight and where they stand.

Fight a phase rolls both commanders (Perception + Leadership at 6, the heavier side with extra dice). Put the successes of the characters' deeds in each side's Deeds box first: they count for the side and take that many foes out of the fight. A side that loses badly rolls to hold (wavering); a side whose resolve runs out breaks. The battle turns on a character throws the battle's counterattack at them through WoDX Combat's soak; tick drew attention when they opened a hole in the line. A siege goes a week at a time: the works fill the breach clock (it shows in Progress clocks), the stores run down, disease is rolled for both camps. Storm the walls when you are ready. Undo takes back any step. When it is over, Let the time pass moves the clock once by the time it took, and factions named on the sides get a proposal in the approval queue. The Legends book records it on its next build.

For the book's army, open The book's army, by units on both sides and give each side its units (peasants, spearmen, archers, cavalry, Cainite cavalry, a Garou pack and the rest). The men then come from the units, and each turn you pick what each army does: Close and fight, Shoot or Withdraw. The commanders' roll moves both armies' pools, the actions take units off, and an army with no units left is beaten.

The rolls and the book's army come from Spoils of War and the Dark Ages Companion; without units, how big a force weighs, resolve, the breach and every age after 1500 are house rules (docs/DECISIONS.md B2200 to B2210).

## The case board and what they could know (2026-11-12)

- **Case board** (token tools, or the Storyteller's hand): a shared board for the coterie. Press "Start a board" and name the case; the first board is the open case. Drop people, scenes, journal pages, Encyclopaedia entries or items on it, or add a note. Drag a card by its title; press the link button on one card and then on another to join them with a few words. The eye button hides a card from the players until they earn it (Alt while dropping hides it at once). A clue a character looks at or examines through Interact goes on the open case by itself, with what they learned; switch that off in the module settings ("Found clues go on the case board"). Players see hidden cards only as missing; do not keep true secrets in a card's words.
- The board takes its era's look: parchment and thread before 1450, a commonplace board to 1800, pinboard and string to 1945, cork to 2022, a lit display in the World of Future Darkness.
- **What they could know** (Storyteller's hand): pick a player character and see the Encyclopaedia entries that fit their line and the year, with a suggestion and the reason (Intelligence + Occult, Academics or Politics; a house rule). Tick what they know and press "Put the ticked in the codex"; their players read it there. Entries that have not happened yet are never offered.

**Deeds for each character.** Before a phase, press Offer deeds for the next phase. Each character in the battle gets a deed for where they stand (in the line, with the commander, scouting, on the walls, at the breach) and the age of war: lock the shields in 1240, a push of pike in 1620, clear the next bay of a trench in 1916, bring the drone down in the World of Future Darkness, and deeds of their own in the Umbra and the Underworld. Each player gets a card with theirs. Change the post, Swap for another deed, Skip it, or Roll it from the sheet; rolled deeds add their successes when the phase is fought, together with anything typed in the Deeds box. Vampires, Garou, mages and the rest sometimes get a deed of their own kind; a deed marked "seen by the living" puts the Masquerade at risk.

**What the field leaves behind.** When a battle ends, its window lists the field's harvest: spoils, prisoners and the wounded, feeding among the dying, new wraiths and a thinner Shroud, Banes and Wyrm taint, Entropy in the Resonance, nightmares, the Yin, and the name the place keeps. Send any line to the Ledger (a consequence that comes due; a seen deed also lets the Veil slip), to the Legends book, or to a place (pick its scene: WoDX Otherworlds' drift thins the Shroud or thickens the Gauntlet there). Each has an Undo. Under Old fields, the Battles list shows how earlier battles are felt in the clock's year, from fresh graves to a chapel, a monument, battlefield tours, a museum or a memorial seen through the lens (B2350 to B2359).

### Wars between factions

With WoDX NPC's setting "Factions go to war by themselves" on (it is on by default), a faction that is Hostile or worse toward a rival may take up arms at a faction turn for a place the rival holds. You get a card when it starts and when it ends; the battle is fought off the screen (a siege a week each turn), and what it changes, the place included, waits in the approval queue. Tell the players as news when word would reach them. If a player character is at the place, the war waits in Battles and sieges for you to fight it with them. A war between Kindred, Garou, mages, fae or the dead (or hunters against them) is a supernatural war: their own kind fight, the leaders' powers count each phase, and people may see something. A hidden faction against a mortal one fights through its mortal followers (docs/DECISIONS.md B2211 to B2216).

## Approvals and Undo: the two safety nets

WoDX has two ways of asking before it acts.

**The queue** holds anything big or lasting: era changes, experience spends, generated people, faction results that matter, rumours rising, data fixes. Nothing in it happens until you approve it. Rejecting is always safe.

**Undo on a card** covers small things that apply at once: NPC actions in Auto, routine moves in Auto, small faction results in Auto, and every door, lock and window result from Interactables. Undo puts back exactly what the card changed. Use it soon after: if something else has changed the same token or sheet since, check the result by eye.

A good habit for a first live session: leave everything on Suggest, and switch one thing to Auto once you trust it.

## Running a session smoothly

**Scene changes.** Open the new scene, then move the clock if time has passed. Routines place NPCs when a scene opens. Press **End the scene** so scene-long effects end.

**Starting a fight.** Add the tokens to the combat tracker and start the combat. Initiative rolls itself. If the conductor is on NPC turns, NPC turns end themselves; on Suggest you still accept each plan. Players attack from the sword and act from the menu.

**Nights and days.** Use **Dusk** and **Dawn** on the Clock. At dusk the dawn-and-dusk card offers New Night (blood, Willpower) and healing on rising. Before dawn you get two warnings with each Cainite's haven checked.

**Feeding.** From the Kindred menu: Hunt or Feed. Living tokens in range and sight are listed as witnesses, and a button records them. A seen feeding can be recorded as a breach and becomes a rumour.

**What feeding does to the vessel.** A living vessel loses a lethal health level for every blood point drunk (two for a Giovanni), and has the lower of its blood and its full blood less its wounds, so a wounded mortal has less to give. Its blood comes back a point a day and the wounds heal by the chart. A vessel that passes out is marked Unconscious, one left dying gets a note, and one drained dry is marked dead; the card's **Undo the harm** button puts it all back. Drink or drugs in the blood go when the blood does. Cainite vessels lose blood, not health.

**Clans and bloodlines.** Feed and Hunt know each clan's feeding law and show it in the window, with the Dark Ages version before 1450 and V20's after. A Ventrue's palate is written once in the Feed or Hunt window, with tags such as merchant or woman; a passer-by carries tags of its own, and you can type tags for any vessel. When they match, "fits the palate" is ticked for you; when nothing is tagged, tick it yourself. A narrow palate makes hunting harder. A Nagaraja eats flesh points in the Feed window, and New Night counts the nights without. Salubri pay for an unwilling vessel (Seduction counts as willing), the Salubri antitribu need a fight first (a blow in WoDX Combat is remembered for an hour), and the Lamia bite passes on the Seed of Lilith.

**Feeding habits.** In Hunt, **Usual hunt** saves how the vampire likes to feed (Rake, Sandman, Farmer, Banker and the rest) and fills in the ground, the prey and the pool. It warns when the habit fights the clan's law, and Banker only appears once blood banks exist.

**Experience.** Award at the end of the night. Players spend from the droplet button and you approve in the queue.

**Long skips.** Use **Pass the years** and read the plan first; write it to the journal if you want to think it over. Faction turns run for each week of the skip, twelve at most.

**Slow computers.** A player whose map stutters can, on their own computer: set Performance Mode to Low and Maximum Framerate to 30, turn off Light Source Animation and Token Vision Animation (Configure Settings, Core), and set **Scene video effects** to Hide (WoDX Chronicle). Hide pauses the looping fog, embers and snow tiles for that player only; the scene doesn't change.

**Teleporting a token.** Select one or more tokens (characters or NPCs), press **Teleport** on the token toolbar, then click the map where they should go. Right click or Escape cancels. Alt+Shift+P does the same at once, sending the selected tokens to wherever the cursor is (change the key in Configure Controls). The tokens jump through walls, snap to the grid, keep their places around one another, and never land outside the scene. Only the Storyteller has the button and the key.

**Jumping the clock.** After a jump of a year or more, or a new era, a card tells you which of the player characters' possessions are out of their time now: not made yet, or a rare antique. Press **Keep it** for the ones they still carry on purpose (an heirloom, a relic); the sheet stops warning about those. The world setting "Anachronism check" turns it on or off. The same card reads the maps when WoDX Interactables is on: under **On the maps**, by scene, it names the vehicles, telephones, radios, sprinklers, electric lights, live wires, keypads and the goods inside containers that the jump put out of their time. **Keep it** leaves the thing as it stands and lets it work in any year (a time-lost motor car can be driven in 1850), and pressing it again takes that back; **Show me** opens the scene at the thing. To see everything out of its time without moving the clock, for a map brought in from another age, press **Out of their time** in the Storyteller's hand.

**Magic that applies itself.** In a Mage 20th Cast window, tick what the Effect does (Harm, Mend, Ward, Light and the rest). The Spheres fill in, and each keyword past the first needs one more success. Set extra targets and duration steps before rolling; a short roll drops them from the end. Target the tokens first, or the caster is the target. On a success the card says what each keyword does. Health, Quintessence, timed effects, light and height change at once, and you get an Undo button on the card. Mind effects on NPCs, Move, Shape, Step Sideways, witnessed vulgar magic and effects on another player's character wait in the approval queue. Free Effects and anything mighty stay your call. A Move or an area puts a button on the card for you: press it, then click the map where the token goes or where the circle sits. An area (two more successes, 15 feet around the spot) works once on everyone in it and on anyone who walks in later, and ends with its duration or the scene. To keep a casting, type a name under Save as a rote named. It becomes a Rote item on the sheet, and its cast button (or the system's own Rote button) opens the Cast window filled in. Dark Ages mages keep the system's rote dialog for now. When a target is a mage, the card waits: the target's player (or you, for an NPC mage) presses Countermagick with the mage's token selected, or you press Apply now. Countermagick successes come off the card and it is worked out again; reflected, what is left over hits the caster. A Dark Ages mage casting one of the book rotes gets the same card: damage, timed effects and conditions from the rote apply with Undo, mind and fear wait in the queue, and creatures, journeys and long rituals stay yours. In the Live world this stays off until the world setting Magic that applies itself is set to On. Thaumaturgy, Necromancy and Koldunic path powers (Use a Discipline) and Numina work the same way: what their successes do goes on the card, and a power that summons, raises the dead, moves blood or needs a contested roll is listed as your call. Pyrokinesis puts one turn of fire on the card; after that it burns as ordinary fire. In the Sorcerers Crusade (1450 to 1699) the card follows that book's chart instead: successes are doubled for two to four and tripled for five, Forces adds a success, Mind takes one away, and countermagick cannot reflect.

**When lines meet.** Open **The crossover referee** from the Storyteller's hand (or give it a key in Configure Controls). Select the token that acts and target the one it acts on, pick what is used (Dominate, Auspex against Obfuscate, countermagick, drinking blood, the Delirium and the rest) and press **Ask the referee**. It shows the ruling with its pages, works out what the two sheets allow (Generation, True Faith, Day or Night, Arete and Mind), and offers the books' rolls; they go to you alone. A case marked draft still waits for its page to be read. With no tokens, pick the two lines by hand.

**Light touch.** If the table wants fewer interruptions, set NPCs in combat, routines and factions to Off for the night, and set Dawn and dusk to Off or "New Night automatically".

## Known quirks

- **Light-touch mode is narrower than its name.** It stops era-change proposals only. NPC plans, routines, factions, dawn and dusk cards and sunlight prompts keep coming; to quiet them, set their own settings to Off.
- **Places are not tagged in Rothenstein yet.** Routines need places to send NPCs to, so they do little until you tag scenes in **WoDX places**. Factions and rumours already treat every scene that is not a battlemap as a place, with its kind guessed from its name.
- **Factions may be empty.** If the factions window shows none, press **Rothenstein's factions** once.
- **Gridless scenes.** NPCs do not move themselves there; you move them.
- **First open of a new character** can show the system's "Set sheet type" window. Pick the sheet for the line.
- **Minimize** by double-clicking a window's title; Window Controls also adds minimize and pin buttons.
- **Module versions in the Setup screen** can show older numbers until Foundry restarts. A reload (F5) is not enough for that.
- **Walls.** Foundry 14 stops a plain token move at a wall. WoDX's own jumps ignore walls, but a token you drag will stop.
- **A hold on the last turn of a round is lost at once.** That is the rule, not a fault.
- **The "Sheet look" and line skins** cover every line but Exalted, which keeps the system's look.
- **A missing font error (Vrev.TTF)** in the console comes from the system and is harmless.
- **Some in-game wording** may differ slightly from this guide. The live world runs the build from just before the last wording cleanup; the next deploy brings the cleaned text.
- **Test tools.** The Time-skip test and Era test move the clock and make test characters. They refuse to run outside test worlds; do not use them in the live world.

## Where things are recorded

| Journal | What it holds |
|---|---|
| Chronicle Rules | House rules in force, conditions, Gauntlet charts |
| Session Zero | Lines and veils |
| WoDX Lineage | Sires, domitors and bonds |
| WoDX Experience Log | Awards and spends by in-game date |
| WoDX Time Skips | Plans written from Pass the years |
| WoDX History | A page per character: sins, frenzies, oaths, kills, boons |
| WoDX Prestation | Boons outstanding and the full ledger |
| WoDX Masquerade | Breaches |

Folders: "WoDX · Before the Embrace", "WoDX · Before the years", "WoDX · The Dead", "WoDX people".

## The Legends book, progress clocks and the spirits (2026-11-12)

**Legends of the Chronicle.** A journal everyone can read, one page per century, of what has really happened: dated events, the dead, Embraces and ghoulings, seats won and lost, havens that changed hands, boons kept and broken. It brings itself up to date when you end a session, around each time skip, and when you press Bring it up to date in the Legends window (the book button). Untick a line there to keep it from the players; Embraces, oaths and debts start hidden.

**Progress clocks.** The clock button opens them for everyone; the dashboard has them too. Long tasks, heat, ties and Ledger objectives show as clocks by themselves. Make your own for a faction's plan or a hunter closing in, and let it fill each faction turn, each session or each week if you like. Nobody but you sees a clock until you press the eye and choose who does.

**Pacing.** The night's draw window now opens with a line for you alone: three quiet nights in a row, or a hard night just past. It never changes what the draw picks.

**The spirits.** The feather button opens a character's standing with the spirit courts. Record chiminage, Banes, Bans and slights there; Summon a spirit, Perform a rite and Chiminage in WoDX Actions take the court and use its standing.

## Followers, and descriptions that spread (2026-11-12)

- **Followers window.** The people icon in the token tools, or Followers on a sheet's Relationships tab. Every NPC that serves the character, with where it is, its order, loyalty and why it last moved, the blood bond and any trouble. Followers on the scene you are viewing have buttons for the everyday orders; Give an order opens the full window with them picked. Players see their own characters' followers, once they may see the follower's sheet.
- **Descriptions abroad.** When a breach, a theft, a break-in, a fire, a desecration or a fight has witnesses, you get a card with what they saw of the culprit. Word is heard there at once, goes on with the place's Alert zones, and reaches the rest of town by the means of the year (hue and cry, a printed notice, the wire, the news, cameras, face matching). When the culprit walks where word has reached, NPCs who see them may know them: you get a card with the match, the roll and Raise the alarm. Change clothes or hold a disguise to break the match; from 2000 the face shows through new clothes. The question-mark figure in the token tools lists every description going round, to drop one or let the whole town hear it now. Turn it off with the world setting Descriptions that spread.

## The Lone Chronicle: playing alone (2026-11-12, first step, testbed only)

For one person who wants to play and not run the game. WoDX does its work on the Storyteller's browser, so a hidden browser takes that seat and you log in as a player. Foundry then keeps the Storyteller's whispers, sheets and rolls from you by itself.

- **Start the seat.** With the world running: `node tools/solo/seat.mjs --user "Gamemaster Test"`. It signs in, says so, and stays until you press Ctrl+C or close the world. Then log in as your player.
- **The switch.** World setting **The Lone Chronicle** (WoDX Solo). On: NPCs, routines, factions, fights, turns, dawn and dusk and the night's draw act by themselves, and every kind of approval but a player's request is given on sight. Off: every value it changed goes back; one you changed by hand since is left alone.
- **What still waits.** After a few seconds the seat presses the button that goes ahead on a card or window meant for the Storyteller, never a way back, and writes it down. What it cannot judge it leaves and writes down too. `game.wodx.solo.log.stalls()` on the seat lists it all.
- **Your panel (WoDX Solo 0.2.0).** It opens when you log in as the player; the moon button in the Token controls brings it back. **Let time pass** waits ten minutes, an hour, until dusk or dawn, or sleeps the day; the clock moves ten minutes at a time and stops if a fight starts, the game is paused, word comes for you or someone new turns up (sleeping stops only for a fight or a pause). **Travel** opens Out on your own. **Pause** and **Go on** stop and start the game. **I am stuck** brings a lead (a sign of what is coming), puts your token back at the scene's way in, or ends a fight or window that hangs. **Lift the curtain** asks first, then shows what the seat decided tonight and marks the night as seen.
- **Fights end by themselves** once one side has nobody standing for a full turn; the switch sets this.
- **Not yet.** The oracle, the Leads page, the trouble dial, night encounters on the map, the director and the solo world's own data folder come in later steps. Until then this is for tests on the testbed.
- It does nothing in the Live world, and should never be on at a shared table.
