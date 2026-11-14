/**
 * WoDX NPC 0.45.0: who the speaker is and how they feel, for the talk generator (scripts/talk-grammar.mjs).
 * House writing, not from any book. A flavour layer (B1643): a few greetings and brush-offs for each clan, tribe,
 * Tradition, Convention and kith, pooled with the era's own lines, so a Ventrue sounds like one without saying so.
 * Every line keeps the Masquerade and the Veil: mannerisms only, never a word a mortal should not hear.
 * Moods (B1644) colour greetings, brush-offs and farewells; someone afraid or hurt speaks only from fear or pain.
 * Gender-neutral throughout; no era words, so each line fits any century the group is found in.
 */

/** Sides keys (WoDX NPC rivalry sides) that become talk facts: "clan:ventrue" gives {clan: ["ventrue"]}. */
export const SIDE_FACTS = ["clan", "tribe", "aff", "kith", "sect", "house", "legion", "creed", "court", "line"];

const q = s => `"${s}"`;
/** One group: cold, neutral and warm greetings, and a brush-off. */
const G = (key, value, cold, neutral, warm, none) => [
  {id: `group.${key}.${value}.cold`, when: {[key]: value, warmth: "cold"}, say: cold.map(q)},
  {id: `group.${key}.${value}.neutral`, when: {[key]: value, warmth: "neutral"}, say: neutral.map(q)},
  {id: `group.${key}.${value}.warm`, when: {[key]: value, warmth: "warm"}, say: warm.map(q)},
  {id: `group.${key}.${value}.none`, when: {[key]: value}, say: none.map(q), kind: "none"}
];

const GROUPS = [
  // clans and bloodlines
  ...G("clan", "ventrue", ["You will find I keep appointments, and you have none.", "State your business. Briefly."], ["Good evening. How may I be of use?", "You have my attention, for the moment."], ["A pleasure, as ever. Please, sit.", "I had hoped you would call."], ["That is not a matter I discuss.", "Take it up with someone of the proper standing."]),
  ...G("clan", "brujah", ["Back off before I make you.", "You've got some nerve, walking up to me."], ["Yeah? Speak your mind, I'll speak mine.", "Go on. I'm listening, for now."], ["Hey! Good. Somebody worth arguing with.", "Get in here. We've got things to talk over."], ["Don't know, don't care. Ask someone who'll lie to you.", "Not my fight."]),
  ...G("clan", "gangrel", ["Close enough. Stay there.", "Leave me be."], ["Mm. What is it.", "You've come a long way to ask something."], ["You. Good. Sit where I can see the door.", "Been a while. You look well fed."], ["Couldn't say.", "Ask the road. It knows more than I do."]),
  ...G("clan", "malkavian", ["The cards said you'd come. They were rude about it.", "No. Not today. Today is a Tuesday."], ["Oh, it's you. Or it will be.", "Hello. Did you bring the question, or shall I?"], ["There you are! I saved you a seat in the dream.", "Lovely. You arrived exactly on time for once."], ["Ask the moth. It knows.", "That door is painted shut. Try another."]),
  ...G("clan", "nosferatu", ["I know what you came for. You're not getting it.", "Keep your eyes on the floor."], ["Mind the step. And the walls. They listen.", "You found me. That's something."], ["Ah, a friend. Come into the dark, it's warmer.", "I heard you were coming. Three times, from three people."], ["Information costs. That one costs more than you've got.", "Not a word. Walls, remember?"]),
  ...G("clan", "toreador", ["How tiresome. You again.", "Must you stand in the light like that?"], ["Oh, how charming. Come in.", "Do look at the room before you speak. It deserves it."], ["Darling! You look divine. Truly.", "Come, sit with me. Tell me something beautiful."], ["How dull. I couldn't possibly say.", "That is far too ugly a subject."]),
  ...G("clan", "tremere", ["Whatever you want, the answer is no.", "You are interrupting work."], ["Yes? I can spare a moment.", "Speak plainly. I keep notes."], ["Good. I had a question for you as well.", "Come in. Touch nothing, please."], ["That is not for me to share.", "I would have to ask permission. I will not be asking."]),
  ...G("clan", "lasombra", ["You stand in my house as a guest. Remember it.", "Leave. The shadows will see you out."], ["Welcome. Mind where your shadow falls.", "You may speak."], ["My friend. Sit at my right hand.", "There is always a place for you here."], ["Some things stay in the dark.", "Ask me again and I will forget you asked."]),
  ...G("clan", "tzimisce", ["You have not been invited across this threshold.", "Go, while you are still in one piece."], ["Be welcome under my roof, and keep its laws.", "Enter, and be a guest."], ["Come in, come in. My house is yours tonight.", "Sit. You honour the old ways by coming."], ["That is a family matter.", "The old stones remember. I do not."]),
  ...G("clan", "giovanni", ["We are not doing business tonight.", "My family does not know you. Keep it so."], ["Good evening. Is this a matter of business?", "Sit. Everything has a price, so let us talk."], ["Ah! Family, almost. Come in.", "For you, the good wine."], ["The dead keep their secrets. So do I.", "Ask my uncle. Better yet, don't."]),
  ...G("clan", "ravnos", ["Mind your purse. Or don't, it's no business of mine.", "You've a face I'd rather not remember."], ["Well met, traveller. What's the game?", "Ah, a new face. Cards, dice, or talk?"], ["You! Good luck follows you, I swear it.", "Come, sit. I've a story you'll half believe."], ["Who can say? Not me.", "That story costs a better one."]),
  ...G("clan", "assamite", ["You are measured. You are found wanting.", "Step back."], ["Peace upon you. Speak.", "I am listening."], ["Peace, friend. You are welcome at my side.", "Sit. We will share what we know."], ["That is not mine to give.", "Silence keeps the blade sharp."]),
  ...G("clan", "followers of set", ["Go. You bore me.", "You haven't anything I want. Yet."], ["Come closer. Tell me what you desire.", "Welcome. Everyone wants something."], ["Ah, my friend. Let us be indulgent tonight.", "Come in out of the light."], ["Every secret has a price. Name yours first.", "Ask me after you have given something."]),
  ...G("clan", "cappadocian", ["Death waits for you as for everyone. Go and meet it elsewhere.", "Do not disturb my studies."], ["Peace. Sit, if the quiet does not trouble you.", "What brings the living down here?"], ["Ah, welcome. I was reading of mortality. Join me.", "You come at a good hour. The candles are new."], ["The grave is silent on that.", "I study endings, not that."]),
  ...G("clan", "salubri", ["I cannot help you.", "Please go."], ["Be at peace. What is it you seek?", "Sit. You carry something heavy."], ["Friend. Let me ease what troubles you.", "Come, rest a while."], ["I do not know. I am sorry.", "That is not a wound I can close."]),
  // Garou tribes and the Fera keep to their own words with outsiders
  ...G("tribe", "black furies", ["Keep your distance.", "You are not welcome here."], ["Speak, then.", "What do you want of us?"], ["Kin. Come.", "Sit by the fire."], ["That is not for outsiders.", "Ask the wild places."]),
  ...G("tribe", "bone gnawers", ["Nothing here for you, so move on.", "Got no spare anything."], ["Hey. You hungry? Lost?", "What's up?"], ["Hey! Pull up a crate.", "Good to see you. We were just eating."], ["Don't know nothing about that.", "Ask around the cans. Somebody knows."]),
  ...G("tribe", "children of gaia", ["I'd rather you left in peace.", "Please, not today."], ["Welcome. Peace be with you.", "Hello. Sit, have some water."], ["Come in. It's good you're here.", "Friend. How is your heart?"], ["I don't know, I'm sorry.", "Maybe some things should stay unasked."]),
  ...G("tribe", "fianna", ["Away with you.", "Not a song for you, nor a seat."], ["Ah, a stranger! Sit, sit.", "Well met. Will you drink?"], ["There you are! Now the night can start.", "A cup for this one, and the good stuff."], ["That's a sad tale, and not mine.", "Ask me after the third song."]),
  ...G("tribe", "get of fenris", ["You are weak. Go.", "Prove yourself or leave."], ["Speak, and be quick.", "What is it?"], ["Ha! You came. Good.", "Sit. Eat. Then we talk of war."], ["No.", "That is not your concern."]),
  ...G("tribe", "glass walkers", ["Not interested.", "Move along."], ["Hi. You need something?", "Make it quick, I'm working."], ["Hey! Good timing.", "Come in, ignore the wires."], ["Can't help you there.", "Not my line."]),
  ...G("tribe", "red talons", ["Go.", "You stink of the city."], ["Speak.", "Why are you here?"], ["You may stay.", "Sit. Be still."], ["No.", "The land knows. I do not tell."]),
  ...G("tribe", "shadow lords", ["You are beneath this conversation.", "Leave while you can."], ["You may speak. Carefully.", "What do you bring me?"], ["An ally. Good. Sit.", "I have a use for you tonight."], ["Knowledge is not given away.", "Ask me when you have something to trade."]),
  ...G("tribe", "silent striders", ["I'm leaving. You should too.", "Not now."], ["Passing through?", "Hm. Long road behind you."], ["You! The road brings you back.", "Sit. Tell me where you've been."], ["I've heard whispers. Nothing more.", "Ask the dead. They walk further than I do."]),
  ...G("tribe", "silver fangs", ["You presume.", "You may withdraw."], ["You may approach.", "Speak, and mind your manners."], ["You are welcome in my presence.", "Come, stand with me."], ["That is not a fit question.", "We do not speak of it."]),
  ...G("tribe", "stargazers", ["There is nothing to say.", "Please leave me to my thoughts."], ["Sit. Breathe first.", "What do you seek?"], ["Welcome. The night is clear tonight.", "Sit with me and watch the sky."], ["The answer will come when you stop asking.", "Even the stars do not know that."]),
  ...G("tribe", "uktena", ["You know nothing. Go.", "Leave the old places alone."], ["What brings you this way?", "Speak, then."], ["Come. I have something to show you.", "Good. I was hoping you'd come."], ["Some things should stay buried.", "That is an old secret."]),
  ...G("tribe", "wendigo", ["This is not your land.", "Go home."], ["Why are you here?", "Speak."], ["You may sit by the fire.", "Welcome, friend."], ["That is ours to keep.", "No."]),
  // Traditions, Conventions and the Crafts: the way scholars of their sort talk, with no talk of magic
  ...G("aff", "order of hermes", ["I have no time for the uninitiated.", "You interrupt my studies."], ["Good evening. Do be precise.", "Speak, and choose your words with care."], ["Ah, welcome. Sit. Mind the books.", "A pleasure. I have questions for you."], ["That is not for casual discussion.", "One does not speak of that lightly."]),
  ...G("aff", "celestial chorus", ["Go in peace. Go now.", "I will pray for you. From a distance."], ["Peace be with you. What do you need?", "Welcome. You are among friends."], ["Friend! The day is brighter for you.", "Come, sit and sing with us."], ["Only the One knows that.", "Pray on it."]),
  ...G("aff", "akashic brotherhood", ["Leave.", "Your spirit is too loud. Go."], ["Sit. Be still a moment.", "Welcome. Breathe."], ["Welcome, friend. Tea?", "You carry yourself better than last time."], ["Ask yourself first.", "That answer is not mine to give."]),
  ...G("aff", "cult of ecstasy", ["Ugh. Your energy is all wrong.", "Not tonight."], ["Hey. You feel that? The night's alive.", "Hello. Stay a while."], ["You! Come dance. Or don't. Stay!", "There you are. Everything's better now."], ["Who knows? Who cares?", "Let it go. Feel something instead."]),
  ...G("aff", "dreamspeakers", ["The spirits say no. So do I.", "Go away."], ["Sit. Listen to the wind a while.", "Welcome."], ["Friend. The fire's warm tonight.", "Sit. I dreamed you'd come."], ["Ask the spirits. Bring a gift.", "That's for the dreaming to tell."]),
  ...G("aff", "euthanatos", ["Not today.", "You should go."], ["Sit. What weighs on you?", "Every road ends somewhere. Where does yours lead?"], ["Welcome, friend. You look well.", "Sit. Let's talk while there's time."], ["That is a question for the wheel.", "Some endings aren't mine to tell."]),
  ...G("aff", "sons of ether", ["I'm in the middle of something!", "Can't you see I'm working?"], ["Hello! Mind the apparatus.", "Yes? Quickly, the readings are drifting."], ["Ah! Splendid! Come see this!", "My friend! You must hear my latest idea."], ["No idea. Fascinating question though.", "I'd need to run tests."]),
  ...G("aff", "verbena", ["Get out of my garden.", "You've a sour look. Go."], ["Mind the herbs. What do you need?", "Come in, wipe your feet."], ["Sit. I'll put the kettle on.", "You're looking pale. Eat something."], ["The roots know. I don't.", "Ask the old woods."]),
  ...G("aff", "virtual adepts", ["Nope.", "You're not on the list."], ["Hey. What do you need?", "Sure, talk. I'm multitasking."], ["Hey! Good, I need a second opinion.", "Get in here. You have to see this."], ["No idea. I can find out. For a price.", "Not my thing."]),
  ...G("aff", "iteration x", ["Your request is denied.", "You are not scheduled."], ["State your purpose.", "Proceed."], ["Acceptable. Sit.", "Good. You are on time."], ["Insufficient data.", "That is not within my parameters."]),
  ...G("aff", "new world order", ["We have nothing to discuss.", "Your file is open. Leave."], ["Good evening. Do you have an appointment?", "Please, take a seat."], ["Welcome back. We've been expecting you.", "Come in. Coffee?"], ["That is not public information.", "I am not at liberty to say."]),
  ...G("aff", "progenitors", ["You are contaminating the room.", "Not now."], ["Hello. Please don't touch anything.", "Yes? I'm between trials."], ["Good to see you looking healthy.", "Come in. Wash your hands first."], ["I'd need a sample.", "Inconclusive."]),
  ...G("aff", "syndicate", ["You can't afford this conversation.", "No deal."], ["Let's talk numbers.", "What can I do for you?"], ["Always a pleasure doing business.", "Sit. Let me buy you a drink."], ["That information has a price.", "Off the books."]),
  ...G("aff", "void engineers", ["Off limits.", "Step away, please."], ["Hello. Something unusual to report?", "Yes? Keep it brief."], ["Good to see you. Strange times, eh?", "Come in. Mind the equipment."], ["Classified.", "Above my clearance."]),
  // kiths
  ...G("kith", "boggan", ["Wipe your feet or go away.", "We're closed."], ["Come in, come in. Mind the mess.", "Hello! Need something fixed?"], ["You! Sit down, I'll make something.", "Welcome, welcome. Eat first."], ["Don't know, but I'll ask around.", "That's not my business, dear."]),
  ...G("kith", "eshu", ["I've a road to walk, and you're on it.", "Not today, stranger."], ["Ah, a traveller! Sit, share a tale.", "Hello! Where are you bound?"], ["Old friend! The road brings us together again.", "Sit. Have I told you about the time..."], ["That is a story without an ending yet.", "The road will tell you, in time."]),
  ...G("kith", "nocker", ["Broken. Everything's broken. Go away.", "You'll make it worse. Out."], ["What? Fine. Talk.", "Hold this. No, not like that."], ["Oh, it's you. Less useless than most.", "Good. Hold this end."], ["Bah. Who'd know that?", "Wrong question, wrong time."]),
  ...G("kith", "pooka", ["I'm not here. You didn't see me.", "Go away, I'm a lamp."], ["Hello! Or goodbye. Which is it?", "Ooh, a visitor!"], ["You! My favourite! Today, anyway.", "Come, come, I've news, all of it true."], ["I know everything about that! Well, nothing.", "Ask me tomorrow, I'll make something up."]),
  ...G("kith", "redcap", ["Hungry. You'll do.", "Move, or you're dinner."], ["What.", "You got food?"], ["Heh. You again. Sit.", "You're all right, for now."], ["Dunno.", "Ask somebody tastier."]),
  ...G("kith", "satyr", ["Oh, you're no fun.", "Go on, off with you."], ["Hello there. Wine?", "Welcome! The night's young."], ["Ah! Come here, sit by me.", "Now the party can start."], ["Who cares? Drink!", "Ask me when I'm sober."]),
  ...G("kith", "sidhe", ["You forget yourself.", "You may go."], ["You may speak.", "We will hear you."], ["You are welcome at our side.", "Come, walk with us."], ["That is not for you to know.", "We do not speak of it."]),
  ...G("kith", "sluagh", ["Shh. Go.", "No."], ["Quietly. What is it?", "Shh. I'm listening."], ["You. Good. Come close, so I can whisper.", "Sit. In the quiet."], ["Some secrets stay buried.", "Shh."]),
  ...G("kith", "troll", ["Halt. No further.", "You will turn back."], ["Speak your business.", "Well met."], ["You have my word and my arm.", "Friend. You are safe here."], ["That I cannot say, on my honour.", "It is not mine to tell."])
];

/** Rules by kind: greetings and brush-offs from the groups above. */
const byKind = {greet: [], none: []};
for ( const r of GROUPS ) (r.kind === "none" ? byKind.none : byKind.greet).push({id: r.id, when: r.when, say: r.say});

/** Moods: how a mood colours the greeting, the brush-off and the goodbye (B1644). */
export const MOODS = ["afraid", "hurt", "angry", "grieving", "wary", "weary", "cheerful"];
const M = (mood, boost, greet, none, farewell) => [
  ["greet", {id: `mood.${mood}.greet`, when: {mood}, boost, say: greet.map(q)}],
  ["none", {id: `mood.${mood}.none`, when: {mood}, boost: boost - 1, say: none.map(q)}],
  ["farewell", {id: `mood.${mood}.farewell`, when: {mood}, boost, say: farewell.map(q)}]
];
const MOOD_RULES = [
  // afraid and hurt: nothing else gets out (boost 2 makes them the best fit)
  ...M("afraid", 2, ["Who's there? Don't come closer.", "Please. I don't want any trouble.", "Keep your voice down. Did you hear that?"], ["I don't know! I don't know anything.", "Please, just leave me alone."], ["Go. Go quickly, and don't look back.", "Lock your door tonight."]),
  ...M("hurt", 2, ["Ah. Sorry. Give me a moment.", "Help me sit down, would you?"], ["Not now. It hurts to talk.", "Ask me when I can stand."], ["Go on. I'll manage.", "Send someone, if you can."]),
  // the rest pool with the era's lines
  ...M("angry", 1, ["What now?", "Don't push me tonight.", "If you've come to make it worse, go."], ["I've no patience for that.", "Not now. Not after today."], ["Just go.", "And stay gone."]),
  ...M("grieving", 1, ["Oh. It's you. Forgive me, it's been a hard day.", "Come in. Don't mind me."], ["I can't think about that now.", "Not today. Please."], ["Thank you for coming.", "Go carefully. Life is short."]),
  ...M("wary", 1, ["Who sent you?", "Slowly. Hands where I can see them.", "I'll hear you. From there."], ["Why do you want to know?", "Who's asking?"], ["Watch yourself out there.", "Mind who follows you."]),
  ...M("weary", 1, ["Mm. What is it?", "Long day. Make it short."], ["Ask me tomorrow.", "Too tired for that."], ["Off you go. I'm for bed.", "Good night."]),
  ...M("cheerful", 1, ["Hello! What a day it's been!", "Come in! Good news all round."], ["No idea! But isn't it a fine day?", "Couldn't say, sorry!"], ["Take care! Come back soon!", "Lovely to see you!"])
];
for ( const [kind, rule] of MOOD_RULES ) (byKind[kind] ??= []).push(rule);

/** Asking about a person, place or faction the character has heard of, when the Storyteller wrote no answer. */
byKind.ask = [
  {id: "ask.hate", when: {regard: "hate"}, say: ["\"Ask someone else. Anyone else.\"", "\"Why would I tell you anything about {topic}?\""]},
  {id: "ask.dislike", when: {regard: "dislike"}, say: ["\"{topic}? Never heard of it.\"", "\"What's {topic} to you?\""]},
  {id: "ask.neutral", when: {regard: "neutral"}, say: ["\"{topic}? I know the name. Not much more.\"", "\"You'd do better asking someone who knows {topic}.\"", "\"{topic}? People talk. I don't listen much.\""]},
  {id: "ask.warm", when: {warmth: "warm"}, say: ["\"{topic}? I wish I knew more, truly.\"", "\"I'll ask around about {topic} for you.\"", "\"{topic}? Hm. Someone at #landmark# might know.\""]},
  {id: "ask.wary", when: {mood: "wary"}, boost: 1, say: ["\"Why are you asking about {topic}?\"", "\"Who told you about {topic}?\""]},
  {id: "ask.afraid", when: {mood: "afraid"}, boost: 2, say: ["\"Don't say that name here!\"", "\"I don't know anything about {topic}. Nothing.\""]}
];

export const GROUPS_GRAMMAR = {rules: byKind, symbols: {}};
