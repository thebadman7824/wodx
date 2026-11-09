/** House-rule switches. Each is a world setting `rule.<id>`, recorded in the Chronicle Rules journal. */
export default {
  "version": 1,
  "groups": [
    {
      "id": "automation",
      "name": "Automation"
    },
    {
      "id": "safety",
      "name": "Safety"
    },
    {
      "id": "timeline",
      "name": "Timeline"
    },
    {
      "id": "rules",
      "name": "Rules"
    },
    {
      "id": "years",
      "name": "Passing the years"
    }
  ],
  "switches": [
    {
      "id": "lightTouch",
      "group": "automation",
      "name": "Light-touch mode",
      "hint": "Turns off every WoDX proposal and prompt for tonight's session. The clock still runs.",
      "default": false,
      "source": "WoDX plan: Light-touch mode"
    },
    {
      "id": "eraProposals",
      "group": "automation",
      "name": "Propose an era change at era boundaries",
      "hint": "When the clock crosses into another era profile, a proposal goes to the approval queue. Off: the era changes at once.",
      "default": true,
      "source": "WoDX plan: one approval queue"
    },
    {
      "id": "xcardPauses",
      "group": "safety",
      "name": "The X-card pauses the game",
      "hint": "Pressing the X-card pauses the game for everyone as well as showing the card.",
      "default": true,
      "source": "House rule (safety tools)"
    },
    {
      "id": "storytellerVoiceOptIn",
      "group": "safety",
      "name": "The Storyteller can opt a character in to the inner voice",
      "hint": "The inner voice panel gets a Storyteller choice to turn a player's character's voice on or off. The player is told each time and can still opt out.",
      "default": false,
      "source": "House rule"
    },
    {
      "id": "signedLinesVeils",
      "group": "safety",
      "name": "Players may sign their lines and veils",
      "hint": "Off: every line and veil is recorded without a name.",
      "default": false,
      "source": "House rule (safety tools)"
    },
    {
      "id": "timeOfJudgment",
      "group": "timeline",
      "name": "Time of Judgment (2004)",
      "hint": "Use the Time of Judgment profile in 2004, with one optional ending per line.",
      "default": false,
      "source": "Era table: Time of Judgment"
    },
    {
      "id": "futureBranch",
      "group": "timeline",
      "name": "Future Darkness branch",
      "hint": "From 2010 the chronicle follows the Cyberpunk 2020 branch (World of Future Darkness). Off: the classic timeline continues under Modern rules.",
      "default": false,
      "source": "Era table: Future Darkness"
    },
    {
      "id": "ghoulsDarkAges",
      "group": "rules",
      "name": "Ghouls use V20 Dark Ages rules in every era",
      "hint": "WoDX Creation applies it to every ghoul it makes or advances.",
      "default": true,
      "source": "House rule",
      "laterPhase": 3
    },
    {
      "id": "yearsThickBlood",
      "group": "years",
      "name": "Thick blood",
      "hint": "Pass the Years: a vampire may drop a Generation for each full century awake (never below 8th by time), at a dot of Humanity or Road a step. Off follows the books: Generation falls only through diablerie (V20 p. 294).",
      "default": false,
      "source": "House rule (V20 Dark Ages pdf p. 33 calls it a rumour)"
    },
    {
      "id": "yearsMortalDecline",
      "group": "years",
      "name": "Mortal decline",
      "hint": "Pass the Years: at 60, 70 and 80 a mortal body loses a Physical dot, the player's pick.",
      "default": true,
      "source": "House rule"
    },
    {
      "id": "feastFast",
      "group": "rules",
      "name": "Feast and fast days",
      "hint": "The church year shapes the night: on a night of revel the curfew starts at midnight and hunting in town is 1 easier; on a fast kept strictly (before 1600) hunting in town is 1 harder. The Chronicle Clock always shows the day.",
      "default": true,
      "source": "House rule"
    },
    {
      "id": "yearsMoralityDrift",
      "group": "years",
      "name": "Morality drift",
      "hint": "Pass the Years: for each century awake a vampire rolls Conscience or Conviction at difficulty 7; a failure costs a dot of Humanity or Road. Off follows the books, which test morality only for a sin.",
      "default": false,
      "source": "House rule"
    },
    {
      "id": "yearsExperience",
      "group": "years",
      "name": "Experience for the years",
      "hint": "Pass the Years: 1 experience a year awake and active, at most 10 a skip.",
      "default": true,
      "source": "House rule"
    },
    {
      "id": "yearsConvertAbilities",
      "group": "years",
      "name": "Convert Dark Ages Abilities",
      "hint": "Pass the Years: leaving the Dark Ages, offer to move each Dark Ages Ability's dots to its later counterpart (Archery to Firearms, Ride to Drive...). The old Ability stays at 0.",
      "default": true,
      "source": "House rule"
    }
  ]
};
