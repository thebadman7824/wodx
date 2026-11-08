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
      "source": "WoDX plan: safety tools"
    },
    {
      "id": "storytellerVoiceOptIn",
      "group": "safety",
      "name": "The Storyteller can opt a character in to the inner voice",
      "hint": "The inner voice panel gets a Storyteller choice to turn a player's character's voice on or off. The player is told each time and can still opt out.",
      "default": false,
      "source": "Ben's request, 8 November 2026"
    },
    {
      "id": "signedLinesVeils",
      "group": "safety",
      "name": "Players may sign their lines and veils",
      "hint": "Off: every line and veil is recorded without a name.",
      "default": false,
      "source": "WoDX plan: safety tools"
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
      "hint": "Recorded now; the Creation module applies it from Phase 3.",
      "default": true,
      "source": "Ben's decision, final review",
      "laterPhase": 3
    }
  ]
};
