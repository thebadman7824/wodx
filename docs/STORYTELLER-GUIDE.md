# WoDX: the Storyteller's guide

How the current build works from the Storyteller's chair, and how to keep a session moving. It describes the build in the "What Sleeps Beneath Rothenstein Live Version" world (system 7.3.2-wodx.3; Actions 3.11.2, Chronicle 0.4.2, Combat 3.7.4, Creation 0.6.1, NPC 0.3.0, Otherworlds 0.2.0, Sheets 0.5.0).

## Quick start: tonight's session

**Before the players arrive**

1. Open the world as the Gamemaster. All seven WoDX modules should be on. vtda20-actions and vtda20-combat must be off in this world, or WoDX Actions and WoDX Combat switch themselves off and say so.
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

**Initiative** is rolled for everyone at the start of a fight and every turn by default (setting "Roll initiative automatically": every turn, start only, or off).

**Movement.** In a fight each move shows the pace over the token: walk 7, jog 12 + Dexterity, run 20 + 3 × Dexterity, in yards, with Celerity and wounds counted. The setting "Movement in a fight" can stop moves past running speed (never yours). The card notes when a character moved more than half their running speed, after which they cannot attack.

**The turn conductor.** Off by default. With **NPC turns**, an NPC's turn ends once WoDX NPC has acted or you accept its plan, then waits 3 seconds so you can read the cards. With **Everyone**, a player's turn also ends 6 seconds after their action is spent, unless they hold. A time limit per player turn is off (0) by default; when it runs out, the action is held. A banner above the hotbar shows the turn, the countdown and who is holding. Players get **End turn**, **Hold**, **+1 extra action** and **Act next**; you also get **Step back** and **Pause**. Extra actions from Celerity or Rage come in a second pass at the end of the round. A held action is lost at the round's end, so a hold on the last turn of a round is lost at once.

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

## WoDX Interactables: doors, locks, windows, containers, traps, clues, lights, hiding places, hazards, holy places, watch points and vehicles

*New module, installed and on in the testing world (rothenstein-wodx) only; enable WoDX Interactables in a world's modules to use it there. Mounts and vehicles (0.11.0) are not deployed yet.*

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

**Fire and hazards.** Fire, a brazier or lamp, broken glass or caltrops, and a live wire are tiles: tick Hazard in the **WoDX** part, pick the kind and size the tile to the area. A burning fire hurts whoever walks into it, and in combat whoever starts a turn in it: its size sets the levels (1 to 3) and its heat the soak difficulty (3 for a candle to 10 for molten metal). It is lethal to mortals and ghouls and aggravated to everyone else; a vampire soaks it only with Fortitude, and the card reminds you of the Red Fear. A brazier does nothing until someone chooses **Knock it over**, and then burns where it falls. **Put it out** needs no roll for a small fire and Dexterity + Athletics at 7 for a bonfire; an inferno can't be put out by hand. Name lights in the light source part and they burn while the fire does. Glass costs dice of lethal damage, less one for each success on a careful step, until someone sweeps a path. A live wire does 2 to 8 levels a turn by its current, until someone cuts the power. Tick "Only player characters" to spare NPCs. The damage goes through WoDX Combat, and every card has Undo.

**Altars, relics and fetishes.** An altar or chapel, a wayside shrine or a holy well is holy ground: tick Altar, relic or fetish in the tile's **WoDX** part, pick the kind and give it a rating from 1 to 5. **Pray here** opens the WoDX prayer window (pick Holy Ground and the rating the window names). **Desecrate it** takes a minute and is loud; the ground stays unholy until you untick Desecrated. A demon who steps onto holy ground, or starts a turn there in combat, is seared: nothing at Torment 3 or less, else lethal levels equal to the rating and a Willpower roll to stay. A holy relic or a fetish rests on its tile until someone chooses **Take it**: name the world item on the tile, and the character gets a copy. A fetish is then attuned and used from the WoDX actions menu. A caern stone, a fetter or a node is marked the same way with its rating; **Use it** opens the WoDX actions menu (a fetter opens the Fetter window), where that line's own rolls are. Every card has Undo.

**Watch points.** A window on the street, a mirror, a telephone, a radio or a bell is a tile: tick Watch point in its **WoDX** part, pick the kind, and tie it to another tile by that tile's id (or its UUID, for one on another scene). For a window or mirror, draw the tied tile over the area it shows. **Look out** is Perception + Alertness: a success names who is there, none gives only how many, and it all goes in a whisper to the player and you. Hidden and invisible characters stay out, and a mirror shows no Lasombra (you are told who is missing). **Make a call** reaches the tied phone or radio, and you play the other end; **Call for help** and **Raise the alarm** tell you to decide who comes. Phones wait until about 1890 and radios until about 1930.

**Mounts and vehicles.** A horse, a mule, a cart, a carriage, a rowing boat, a car, a motorcycle or a motorboat is a tile: tick Mount or vehicle in its **WoDX** part and pick the kind; Seats is blank for the usual number. A character beside it takes the reins (**Mount it**, **Drive it**), with no roll on a dot of Ride or Drive, or the Attribute alone at +1 without; others **Get on as a passenger**. From then on, moving the token at the reins moves the tile and the passengers with it; a passenger who walks away is off. At the reins, **Keep control** is Dexterity + Ride or Drive at 6 for an obstacle or a skid, and **Go flat out** the same at +3. A botch throws the rider or crashes the vehicle, and you roll the fall or the damage. Cars wait until about 1900, motorcycles and motorboats until about 1910. **Everyone off** in the tile config empties it.

Settings (WoDX Interactables): the door-click shortcut, reach in grid squares, whether long attempts move the clock, whether NPCs hear noise, and whether traps go off. You can Shift-click a locked door yourself to use Interact for the selected token.

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

**Experience.** Award at the end of the night. Players spend from the droplet button and you approve in the queue.

**Long skips.** Use **Pass the years** and read the plan first; write it to the journal if you want to think it over. Faction turns run for each week of the skip, twelve at most.

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
