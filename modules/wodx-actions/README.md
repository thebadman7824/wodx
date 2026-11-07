# VtDA20 Non-Combat Actions

A Foundry VTT module for the **World of Darkness 20th Edition** system (`worldofdarkness`). It automates the non-combat rules of *Vampire: The Dark Ages 20th Anniversary Edition*.

**Version 2.2.1** tidies the wording of chat messages. **Version 2.2.0** fits the flavor text to the character acting, so mortals and ghouls no longer get lines written for the dead. **Version 2.1.0** adds flavor text: one short line of description under the result of each action card (see Flavor text below). **Version 2.0.1** (2.0.0 could not open its menus on actors with the standard WoD20 sheet data; fixed. Dialogs are also capped to the screen height and scroll). **Version 2.0** gives every kind of character its own menu. It targets Foundry v14 with WoD20 system 7.3.2 and falls back to the older dialogs on v12 and v13; it reads both the older actor types and the new PC actor type. Every macro and every `game.vtda20actions` function from v1.x still works. It pairs with **vtda20-combat**: when both modules are active, damage goes through the combat module's health-track code, and both share the actor-type profile.

## Actor types (new in 2.0)

The **Actions Menu** (macro, token HUD book button) opens the menu for the actor's profile. The Kindred menu is the full v1.x menu. The others are built from the sourcebooks.

| Profile | Detected from | Soak in the combat module | Menu in the actions module |
|---|---|---|---|
| **Kindred** | Vampire actor | Stamina + Fortitude + armor vs bashing and lethal, Fortitude + armor vs aggravated; bashing halved after soak | Full VtDA20 menu: hunt, feed, blood, Beast, Road, torpor, diablerie |
| **Ghoul / Revenant** | Variant "ghoul" or "revenant", any Fortitude, Potence or Celerity, or the profile flag | Stamina + Fortitude vs bashing and lethal; armor only vs aggravated; *elder* flag halves bashing | Rolls, vitae, Blood Oath, danger |
| **Mortal** | Mortal actor | Stamina + armor vs bashing; armor only vs lethal; aggravated counts as lethal | Rolls, danger, Willpower |
| **Hunter** | Hunter actor | As mortal | Rolls, Faith, Conviction |
| **Werewolf / Changing Breed** | Werewolf or Changing Breed actor | Stamina vs everything; silver strips natural soak | Rage, Gnosis, change form, regenerate, Primal-Urge rolls |
| **Mage** | Mage actor | As mortal (Mage 20 p. 334) | Cast an effect (Arete), Quintessence, Paradox |
| **Changeling / Fae** | Changeling actor | As mortal; cold iron is aggravated with no natural soak; chimerical damage option | Weave a cantrip, Glamour, Banality |
| **Wraith / Ghost** | Wraith actor | Stamina vs bashing and lethal, armor only vs aggravated [house] | Arcanos, Pathos, Corpus, Angst |
| **Spirit / Imp / Spectre** | Profile flag | Stamina vs everything [house] | Rolls, Essence |
| **Creature / Beast** | Creature actor | As mortal | Rolls, track by scent, sneak, danger |
| **Demon, Mummy, Exalted** | Demon, Mummy or Exalted actor | Stamina vs everything (generic) | Rolls, their own traits (Faith/Torment, Sekhem/Balance, Essence) |

Sourcebooks for Hunter, Demon, Mummy and Exalted were not in the library, so those menus are generic: they roll, spend the traits on the sheet, and stop there.

### Switching the type (the toggle)

Detection runs in this order: the override flag, then the actor type (for the new PC actor type, its splat setting), then the variant and Disciplines, then mortal. Three ways to override it:

- **VtDA20: Actor Type** macro (created for the GM) opens a picker for the selected token's actor: *Automatic* or any profile.
- **Right-click the sword (combat) or book (actions) button** on the token HUD; in the Actions menu, the **Type** button sits at the top.
- In the attack dialog, the **Actor types** box lets you choose the attacker's and defender's type for this one attack; tick *Save these choices on the actors* to keep them.

The choice is stored in `flags.world.vtda20.profile`, which both modules share. The old v1 flags (`vtda20-combat` / `vtda20-actions` `profile`) are still honored. Script: `game.vtda20.profiles.setProfile(actor, "lupine")` or `setProfile(actor, "auto")`.

What the type-specific buttons do:

- **Change form (Garou):** Stamina + Primal-Urge against the form's difficulty, or 1 Rage for an instant change. Posts the form's attribute modifiers from the W20 sheet and remembers the form; it does not edit the attributes.
- **Regenerate (Garou):** heals one bashing level automatically, or one lethal level with a Stamina roll at difficulty 8 under stress (W20 p. 148).
- **Rage and Gnosis:** the uses listed in W20 (extra action, instant change, ignore stun, remain active with a Rage roll at difficulty 8, frenzy test; fetishes, Gifts, stepping sideways), each spending the points and rolling where the rule rolls.
- **Cast an effect (Mage):** Arete roll; difficulty is the highest Sphere + 3 (coincidental), + 4 (vulgar, no witnesses) or + 5 (vulgar, witnesses). Quintessence spent, a modifier and the Paradox the Storyteller awards are entered in the dialog and applied to the sheet.
- **Weave a cantrip (Changeling):** Art + lowest primary Realm, base difficulty 8 with the modifiers from the Changeling 20th table (Banality, Scene/Time Realms, freehold, bunk...), chimerical (free) or Wyrd (1 Glamour), plus 1 Glamour per Realm "cheated".
- **Pathos, Corpus, Angst (Wraith), Essence, Faith, Conviction, Torment, Sekhem, Balance:** a "use" dialog per trait that spends or gains the points on the sheet and posts the rules note.
- **Rules reminders** for ghouls, mortals, mages, changelings, wraiths and creatures.

The cantrip and Arete cards give the rolled successes; what the effect does is up to the Storyteller. Dice pools use the traits already on the sheet.

If the module has no PC-type Advantage item or legacy trait for a resource (a Wraith without Corpus, say), it tells you and does not change anything.



## Install

1. Unzip into `Data/modules/` so that you get `Data/modules/vtda20-actions/module.json`.
2. Enable the module in your world.
3. On first load the GM gets these macros:
   - **Actions Menu**
   - **Roll Action**
   - **Hunt**
   - **Spend Blood**
   - **Frenzy**
   - **Rötschreck**
   - **New Night**

Right-clicking a token adds a book button to its HUD, which opens the menu for that character.

## What it does

| Action | Rules handled | Book page |
|---|---|---|
| **Action / Dramatic system** | Attribute + Ability, or Willpower, Road or a Virtue. See the first table below. | 322–339 |
| **Hunt** | See "Hunting and feeding" below. | 334, 341 |
| **Feed** | Drink from the targeted token. That vessel loses blood, and drinking from a Cainite advances the **Blood Oath**. | 341–342 |
| **Spend blood** | See "Spending blood" below. | 332, 340 |
| **Frenzy** | See "Frenzy and Rötschreck" below. | 357 |
| **Rötschreck** | See "Frenzy and Rötschreck" below. | 358 |
| **Sin / degeneration** | See "Sins against the Road" below. | 113 |
| **Blood Oath** | Tracks the bond stage for each regnant. Resisting is a Willpower roll at difficulty 8 + drinks ± modifiers, and then Willpower is spent. Bonds can fade (after 12 – Willpower months) or be broken. | 342 |
| **Awaken by day** | Perception (+ Auspex) at difficulty 8, then a Road roll at difficulty 8. Each success is one turn awake, and 5 successes means the whole scene. While she's awake, dice pools are capped at her Road rating. | 336 |
| **Sun / fire / fall** | See "Sunlight, fire and falls" below. | 355–360 |
| **Torpor** | Length depends on the Road rating. Voluntary torpor can end at half that time. To rise, she spends 1 blood and makes a Road roll at difficulty 8, and wakes Crippled. | 351 |
| **Diablerie** | See "Diablerie" below. | 354–355 |
| **Seduction** | Three rolls (approach, repartee, conversation) against the target's Wits, Intelligence and Perception + 3. Successes beyond the first carry over as dice to the next roll. | 339 |
| **End scene** | Removes Quickening, the "ignore wounds" state and the daytime cap. | — |
| **New Night** (GM) | Rising costs 1 blood (weekly under Golconda). She regains 1 Willpower, aggravated wounds that were rested heal, and any frenzy ends. The card also notes the rising time for her Road. | 340 |

**Action / Dramatic system** handles:
- **Roll types:** simple, extended, resisted and teamwork. Extended rolls get a "Roll the next interval" button, and a botch wipes the progress.
- **Untrained rolls:** an untrained Talent rolls the Attribute alone, an untrained Skill is at +1 difficulty, and an untrained Knowledge can't be attempted.
- **Modifiers:**
  - specialty (10s count as two successes);
  - spending Willpower for a success, or to ignore wound penalties;
  - multiple actions and retries, which are refused if the difficulty would reach 10;
  - the Road aura modifier on social rolls;
  - the daytime cap;
  - an automatic success when the pool is at least the difficulty.
- **About 30 preset dramatic systems:**
  - **Physical:** Climbing, Riding, Intrusion, Jumping, Lifting, Doors, Pursuit, Shadowing, Sneaking, Swimming, Throwing.
  - **Mental:** Investigation, Repair, Research, Tracking.
  - **Social:** Fast-Talk, Interrogation, Intimidation, Oration, Performance.

**Hunting and feeding:**
- **Hunting ground:** difficulty 4–8. Fame and Domain each lower it by one per dot (minimum 3), and Herd adds dice. You get one roll per hour.
- **Hunger check:** if blood is below 7 – Self-Control or Instinct, she rolls Self-Control (or Instinct), capped by her blood pool. If she loses control, she gorges.
- **Drinking:** up to 3 blood points per turn. The vessel table runs from human to rat.
- **Vessel risk:** past the second point, the vessel rolls Stamina – 1 per extra point to stay conscious.
- **Cold blood:** loses half its value every 10 minutes.

**Spending blood:**
- **Healing:** 1 blood heals one lethal or bashing level. Healing while doing something else needs a Stamina + Survival roll at difficulty 8. An aggravated level costs 5 blood plus a day's rest.
- **Quickening:** +1 Strength, Dexterity or Stamina per blood until the end of the scene. The card warns when this goes past the Generation maximum.
- **Other uses:** imitating life (1 blood per Road dot below 8), Discipline costs, and giving blood to another character.
- **Per-turn limit:** the card shows how many turns the spending takes at her blood-per-turn rate.

**Frenzy and Rötschreck:**
- **Pools:** Frenzy uses Self-Control, Rötschreck uses Courage. Both are capped by the Road rating, and Self-Control or Instinct is also capped by the blood pool.
- **Provocations:** the book's provocation tables, plus the atrocity rule (difficulty 9 – Conscience).
- **Resisting:** successes accumulate toward five, and each success holds the Beast off for a turn. A "Keep resisting" button rolls again.
- **Instinct:** a vampire on Instinct always frenzies, and the roll decides whether she "rides the wave".
- **Effects:** frenzy sets the sheet's frenzy condition. While she's in frenzy she ignores wound penalties and is immune to Rötschreck.

**Sins against the Road:**
- **When to roll:** only for sins at or below her Road rating. Difficulty is 6 + (Road – sin level), and the Conscience/Conviction roll is capped by the Road rating.
- **On a failure:** she loses a Road dot, or a Virtue dot if you pick that instead.
- **Extras:** an automatic-loss option, and notes on Moments of Truth and the new aura modifier.

**Sunlight, fire and falls:**
- **Damage:** sunlight and fire do a fixed number of levels per turn based on exposure or fire size.
- **Soak:** only Fortitude soaks it, at a difficulty set by the light's intensity or the fire's heat.
- **Rötschreck:** after a burn, the card offers a Rötschreck check button.
- **Falls:** 1 die per 10 feet. From 100 feet on it's 10 dice of lethal damage, and armor counts half.

**Diablerie:**
- **Draining:** first she drains the victim's blood.
- **The soul:** extended Strength rolls at difficulty 9. Each success is one aggravated level on the victim that can't be soaked.
- **Rapture:** Self-Control at difficulty 10 – Road.
- **Results:** Generation drops if the victim's blood was stronger, and the card notes the aura taint and offers a button to record the sin.

If a player doesn't own a character that needs changing (for example, the vessel's or the victim's sheet), the change goes to the GM to apply.

## Data the module reads

- **Road:** `advantages.path`.
- **Virtues:** the Virtue labels (Conscience or Conviction, Self-Control or Instinct) decide which Virtue is used.
- **Blood:** `advantages.bloodpool`, plus Generation.
- **Disciplines:** Power items (Auspex, Fortitude).
- **Backgrounds:** Feature items (Fame, Domain, Herd).
- **Abilities:** Dark Ages secondary abilities (Ride, Theology, Hearth Wisdom…) are found by name.

The module stores its own state in actor flags under `vtda20-actions` (the actor-type profile and Garou form are in `flags.world.vtda20`):
- `oaths` — Blood Oath bonds;
- `quickening`;
- `torpor`;
- `daytime`;
- `aggHealing`;
- `frenzyType`;
- `golconda` — set it to `true` for a vampire in Golconda.

## Where the rules were incomplete

These are judgment calls. Each one is easy to change in `scripts/rules.js`.

- **Untrained rolls:** the book's text on untrained rolls is cut off in the source PDF, so the module uses the standard V20 rule. It can be turned off in Settings.
- **Hunger check:** rolled at difficulty 6, the same as "taste of blood when hungry".
- **Vessel's Stamina roll:** difficulty 6.
- **Rising from torpor:** uses the daytime awakening roll (Road, difficulty 8).
- **Healing order:** blood heals lethal damage before bashing.
- **Aggravated healing:** rested aggravated levels heal at the next New Night.
- **Mortals in fire:** mortals can't soak fire, and it does lethal damage to them.

## API

`game.vtda20actions` offers:
- `menu({actor})` (follows the actor type; the setting *Menu follows the actor type* can turn that off)
- `getKind`, `setKind`, `pickKind`
- `uses({actor, resource})`, `cantrip`, `cast`, `shift`, `regen`
- `action({preset})`
- `hunt`
- `feed`
- `spendBlood`
- `frenzy({provocation})`
- `rotschreck({provocation})`
- `endFrenzy`
- `sin`
- `daytime`
- `torpor`
- `hazard({kind})`
- `bloodOath`
- `diablerie`
- `seduction`
- `newNight({actors})`
- `endScene({actors})`
- `applyDamage`
- `rules`
- `presets`

## Rules sources

Kindred rules: VtDA20 as in v1.0. Garou: W20 (Rage pp. 144, 266; forms; regeneration p. 148). Mage: Mage 20 (difficulty by Sphere for coincidental and vulgar magick). Changeling: Changeling 20th (cantrip dice pool, base difficulty 8 and its modifier table). Ghoul rules: *Ghouls & Revenants*. Sourcebooks for Hunter, Demon, Mummy and Exalted were not available, so those menus are generic. Not tested in a live Foundry world; it was run against a mock of the Foundry API.

## Flavor text (new in 2.1, fitted to the actor in 2.2)

Each action card ends with one short italic line describing what happened, picked at random from a pool that fits the outcome. The pools cover general actions, social rolls, hunting and feeding, frenzy, Rötschreck and fear, conscience and the Road, torpor, spending blood, diablerie, and harm from fire, sun and falls, each split into success, failure and botch. Character names are filled in automatically.

Since 2.2 the line also fits the character acting: Kindred, living (mortals, ghouls, hunters, Garou and the rest), beast or spirit, read from the actor profile. A ghoul spending vitae or a mortal burned by a torch gets a line about living flesh, not dead veins.

The setting **Flavor text** chooses who sees it: *Shown to everyone* (in the card), *Whispered to the GM* (a separate whisper), or *Off*. The lines live in `scripts/flavor.js`. Add your own, or empty a pool to silence it. A line can start with a tag in square brackets, such as `[kindred]` or `[living]`, to limit who gets it. Untagged lines fit everyone.
