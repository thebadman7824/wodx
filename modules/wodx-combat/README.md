# VtDA20 Combat Automation

A Foundry VTT module for the **World of Darkness 20th Edition** system (`worldofdarkness`). It automates combat under the *Vampire: The Dark Ages 20th Anniversary Edition* rules.

**Version 2.2.1** gives bites and claws their own flavor lines (they used to borrow the ones written for fists) and tidies the wording of chat messages. **Version 2.2.0** fits the flavor text to who was hit and how: a mortal, a Kindred, an animal or a spirit, struck with a blade, a fist, claws or a bow. **Version 2.1.0** adds flavor text: one short line of description under the result of each attack card (see Flavor text below). **Version 2.0.1** (2.0.0 could not open its menus on actors with the standard WoD20 sheet data; fixed. Dialogs are also capped to the screen height and scroll). **Version 2.0** adds actor-type profiles (below) and moves the dialogs to Foundry's current dialog framework. It targets Foundry v14 with WoD20 system 7.3.2 and falls back to the older dialogs on v12 and v13. It reads both the older actor types (Vampire, Mortal, Werewolf...) and the new PC actor type. Every macro, setting and `game.vtda20combat` function from v1.x still works.

## Actor types (new in 2.0)

The attack dialog, the soak rules and the health-track results follow the actor's profile.

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

Other changes in 2.0:
- **Attack dialog:** an *Actor types* box, and extra options that appear only for the chosen type: blood for Kindred, **Rage extra actions** for Garou (limited to half permanent Rage, with the Rage/Gnosis rule noted), and Glamour, Pathos, Essence, Quintessence, Conviction, Faith or Sekhem for the others (marked [house]).
- **Banes:** *Silver* (Garou) and *Cold iron* (changelings) remove natural soak; a weapon named or described with silver or cold iron applies it automatically.
- **Maneuvers:** Disarm, Sweep, Tackle, Hold, Stake, Impale and Suppressive Fire from VtDA20 p. 346-349. Disarm and Hold do no damage. The setting *Offer World of Darkness: Combat maneuvers* adds Heavy Strike, Quick Strike, Heavy Kick, Quick Kick and Grapple from the 1996 supplement.
- **Ghoul soak** now follows *Ghouls & Revenants*: Stamina + Fortitude against bashing and lethal damage, armor only against aggravated.
- **Soak & Apply** has Bane and Chimerical checkboxes. Chimerical damage is not applied to anyone but a changeling.
- **Conditions** when the track fills are specific to the type: Cainite torpor and Final Death, Garou regeneration and Rage notes, wraith Corpus loss, changeling unconsciousness.



## Install

1. Unzip into `Data/modules/` so that you get `Data/modules/vtda20-combat/module.json`.
2. In your world, enable the module under **Manage Modules**.
3. On first load the GM gets three macros in the Macro directory. Drag them to the hotbar:
   - **VtDA20: Attack**
   - **VtDA20: Soak & Apply Damage**
   - **VtDA20: Initiative**

The token HUD (right-click a token) also gains a sword button that opens the attack dialog.

## Running an attack

1. Select your token and **target** the enemy (press T while hovering over it).
2. Run **VtDA20: Attack**.
3. Choose the following in the dialog:
   - **Weapon:** every Melee or Ranged Weapon item on the sheet, plus built-in Punch, Kick, Bite, Claw and Clinch.
   - **Maneuver:** Normal, Great Blow or Riposte, plus four house maneuvers (Lunge, Overhead Cleave, Hurried Strike, Hook and Pull) marked [house] in the list. They are data in `scripts/rules.js` (`MANEUVERS`), so you can edit or delete them.
   - **Targeting:** none, medium, small or precise (VtDA20 p. 346).
   - **Range band**, **flank or rear**, and the **multiple-action number**.
   - **Number of opponents**, **extra dice or difficulty**, and **extra damage dice**.
   - **Specialty**, **Willpower**, **aim around armor**, and **blind**.
   - **Celerity** (extra dice, or 1 blood to ignore the multiple-action difficulty) and **Potence** (extra dice, or 1 blood for automatic successes on damage).
   - **Defender:** none, dodge, block or parry, the full-defense number, and Celerity.
   - **Soak profile**, **Fortitude blood auto-soak**, **fire or sunlight**, and **extra soak dice**.
4. The module then works through the combat steps and posts one chat card with every die shown:

| Step | What happens | Rules |
|---|---|---|
| Attack | Attribute + Ability (+ accuracy and modifiers), with wound penalty and the multiple-action and +2 armor-bypass rules. 1s cancel successes. A botch is flagged. | p. 322–323 |
| Defense | The defender rolls automatically, and their successes subtract from the attack. | p. 344 |
| Damage | Pool is weapon damage (Strength + bonus, + Potence) + net successes + maneuver and targeting damage. Difficulty 6; damage never botches. | p. 345 |
| Soak | Pool depends on the soak profile below. Armor piercing removes armor dice, and armor is reported destroyed when damage reaches twice its rating. | p. 345 |
| Health | Damage is written to `system.health.damage`, and the wound level and penalty are recalculated the same way the system does it. | p. 345, 351 |

Defense rules:
- **Dodge** uses Dexterity + Athletics, at +2 difficulty against missiles unless the defender has Celerity.
- **Block** uses Dexterity + Brawl. It works only against bashing damage unless the defender has Fortitude or armor.
- **Parry** uses Dexterity + Melee and works only in close combat.
- **Riposte** attacks put the defender at +2 difficulty.
- **Parrying an unarmed attack:** excess successes become a counter-attack that the attacker can only soak.

Soak profiles: see the Actor types table above. Fortitude only soaks fire or sunlight for Cainites.

Health track:
- Bashing beyond the track becomes lethal, and lethal beyond the track becomes aggravated.
- When the track fills, the card reports one of these, and the token gets the matching status effect:
  - Cainites: Crippled (track full of bashing), torpor (full of lethal) or Final Death (full of aggravated).
  - Mortals: unconscious (bashing) or dead (lethal).

If a player doesn't own the target, the damage goes to the GM over a socket. Every applied hit has an **Undo** button. With *Apply damage automatically* switched off, the card shows an **Apply** button instead.

## Damage from other sources

**VtDA20: Soak & Apply Damage** works on the targeted (or selected) tokens. You can:
- enter damage levels directly or roll a damage pool;
- choose bashing, lethal or aggravated, or fire/sunlight;
- turn off armor;
- spend blood for an automatic Fortitude soak.

Use it for falls, fire, sunlight, traps, or a damage roll made elsewhere.

## Initiative

**VtDA20: Initiative** rolls 1d10 + Dexterity + Wits (+ Celerity) + wound penalty and writes the result to the combat tracker. Ties go to the higher rating, using the decimals. As GM with nothing selected, it rolls for every combatant.

## Scripting API (`game.vtda20combat`)

```js
game.vtda20combat.attack({ attacker: token, target: token, weaponId });
game.vtda20combat.soakDialog({ tokens });
game.vtda20combat.applyDamage(actor, "lethal", 2);   // no soak
game.vtda20combat.healDamage(actor, "bashing", 1);
game.vtda20combat.rollInitiative({ all: true });
game.vtda20combat.getProfile(actor);                 // soak model: "vampire" | "ghoul" | "mortal" | "lupine" | "fae" | "wraith" | "spirit"
game.vtda20combat.getKind(actor);                    // profile: "kindred" | "ghoul" | "mortal" | "hunter" | "lupine" | "mage" | "fae" | "wraith" | "spirit" | "beast" | "demon" | "mummy" | "exalted"
game.vtda20combat.setKind(actor, "lupine");          // or "auto"
game.vtda20combat.pickKind(actor);                   // picker dialog
game.vtda20combat.rules                               // pure rules functions
```

## How the module reads the character sheet

- **Disciplines:** Power items named *Celerity*, *Fortitude* and *Potence*, with type Discipline. The dot value comes from the item.
- **Archery:** bows use a secondary-ability item named "Archery", or the item set as the weapon's custom ability.
- **Armor:** equipped Armor items. The sheet's Dexterity total already includes the armor's Dexterity penalty.

### Overriding the profile

Use the toggles described under Actor types. A few extra flags:

```js
actor.setFlag("vtda20-combat", "fortitude", 3);   // overrides the Fortitude Discipline rating
actor.setFlag("world", "vtda20", { profile: "ghoul", elder: true });  // elder ghoul: bashing halved after soak
```

## Flavor text (new in 2.1, fitted to the target in 2.2)

Each attack card ends with one short italic line describing what happened, picked at random from a pool that fits the outcome. The pools cover miss, bashing hit, lethal hit, aggravated hit, heavy hit (four or more levels), all damage soaked, a maneuver that does no damage, and a botch. Character names are filled in automatically.

Since 2.2 the line also fits the attack and the target. A sword cut on a mortal, claws on a Kindred, a sling stone on a wolf and a blow through a wraith each draw from different lines, so a mortal never "screams like no living thing" and a Kindred never "loses their breath". The target's group comes from its actor profile (above): Kindred; living (mortals, ghouls, hunters, Garou and the rest); beast; or spirit (wraiths, spirits, demons).

The setting **Flavor text** chooses who sees it: *Shown to everyone* (in the card), *Whispered to the GM* (a separate whisper), or *Off*. The lines live in `scripts/flavor.js`. Add your own, or empty a pool to silence it. A line can start with tags in square brackets to limit where it is used, for example `[ranged living]` or `[natural kindred]`. The tags are listed at the top of the file. Untagged lines fit every attack.

## Settings

- Apply damage automatically
- Deduct Willpower and blood
- Celerity adds dice
- Potence adds dice
- Set token status effects
- Create macros
- Show dice
- Offer World of Darkness: Combat maneuvers (off by default)
- Show actor-type options
- Flavor text (everyone, GM only, or off)

## Rules sources and house rules

From the books: the attack/defense/soak sequence and the maneuvers (VtDA20 pp. 322-349), ghoul and revenant soak (*Ghouls & Revenants* p. 262), Garou soak, silver, Rage and regeneration (W20 pp. 144-148), mage soak (Mage 20 p. 334), cold iron (Changeling 20th), and the basic maneuvers of *World of Darkness: Combat* (1996). Marked **[house]**: spending Glamour, Pathos, Essence, Quintessence, Conviction, Faith or Sekhem for attack dice; wraith and spirit soak; the Lunge, Overhead Cleave, Hurried Strike and Hook and Pull maneuvers.

Not tested in a live Foundry world; it was run against a mock of the Foundry API. Report anything that misbehaves.
