/**
 * WoDX NPC 0.14.0: more stock talk. Reactions to what a character is, cries of alarm and pain, barks while at work,
 * trade and social-roll answers, the voices of kinds of people, small talk on feasts, weather and the season, talk
 * of the characters' own deeds, farewells, and remembering a past visit. House writing, not from any book. The
 * Storyteller's own lines always come first, and every part can be switched off.
 * Places are Moravian (Rothenstein lies in Moravia): the Morava, the Svratka, Brno, Olomouc, Prague, Vienna.
 */

/** Said aside when a mortal notices something wrong about the character (kind or state). */
export const NOTICE = {
  kindred: ["\"Your hands are like ice. Come closer to the fire.\"", "\"You look pale as a sheet. Have you eaten?\"", "\"Odd. I didn't hear you come in.\"", "\"You don't blink much, do you?\"", "\"There's a chill on you, like a cellar in summer.\""],
  ghoul: ["\"You've a look about you. Like someone who doesn't sleep.\"", "\"Strong grip you have. Stronger than you look.\"", "\"You seem in a hurry to be somewhere. Always.\""],
  lupine: ["\"The dogs won't stop barking since you came.\"", "\"You make me nervous, and I can't say why.\"", "\"You've a wild look. Been sleeping rough?\"", "\"My hackles are up, and I don't even have hackles.\""],
  mage: ["\"Strange. The candle flickered when you spoke.\"", "\"You have the eyes of someone who reads too much.\"", "\"Something about you makes my ears ring.\"", "\"Clocks run oddly around you. Have you noticed?\""],
  fae: ["\"You've a way of smiling that makes me forget what I was saying.\"", "\"Have we met? I could swear I dreamed you.\"", "\"You smell of flowers, and it isn't the season.\"", "\"There's music in your voice. Did anyone ever tell you?\""],
  wraith: ["\"Did someone say something? I thought I heard a voice.\"", "\"Cold draught in here all of a sudden.\"", "\"Funny. I keep thinking of my grandmother.\""],
  hunter: ["\"You've a hard look. Like you're searching for something.\"", "\"You keep watching the door. Expecting someone?\"", "\"You've not slept in days, by the look of you.\""],
  demon: ["\"I feel like I've told you more than I meant to.\"", "\"Your voice. It's like a hymn I half remember.\"", "\"I trust you, and I don't know why. That frightens me a little.\""],
  mummy: ["\"You speak like someone from very far away.\"", "\"There's dust on your sleeve. Old dust, like a tomb.\""],
  wounded: ["\"You're hurt! Sit down before you fall.\"", "\"That's blood on your coat. Yours?\"", "\"You're limping. Who did that to you?\"", "\"God's mercy, look at you. Let me fetch water.\""],
  // NPC 0.32.0: what a stranger reads in the character's look (WoDX Library)
  bloody: ["\"Is that blood? Whose blood is that?\"", "\"Stay where you are. You're covered in it.\"", "\"Wipe your hands before you touch anything here.\""],
  strange: ["\"Where on earth did you get clothes like those?\"", "\"You're not from anywhere near here, are you?\"", "\"I've never seen the like of that. Is it foreign?\""],
  fine: ["\"Forgive me. I didn't expect someone of your standing here.\"", "\"Please, take the good seat.\"", "\"We don't often see cloth like that on this street.\""],
  poor: ["\"We've nothing to give away, if that's what you're after.\"", "\"Round the back. Not through the front.\"", "\"Mind you don't touch anything.\""],
  seen: ["\"That's not yours to wear, is it?\"", "\"You can drop the act. I know who you are not.\"", "\"Nice costume. Who did you take it from?\""],
  frenzy: ["\"You're shaking. What's wrong with you?\"", "\"Easy. Easy now. Whatever it is, it isn't here.\"", "\"Your eyes. Stop looking at me like that.\""]
};

/** Cries when an alarm is raised on a place, by era. */
export const CRY_ALARM = {
  medieval: ["\"To arms! To arms!\"", "\"Ring the bell! Wake the watch!\"", "\"Thieves! Murder! Help!\"", "\"Bar the gate!\"", "\"Fire! Fetch the buckets!\""],
  earlymodern: ["\"Watch! Watch ho!\"", "\"Raise the hue and cry!\"", "\"Thief! Stop, thief!\"", "\"Call the constable!\"", "\"Fire! Fire in the lane!\""],
  nineteenth: ["\"Police! Police!\"", "\"Somebody blow a whistle!\"", "\"Stop that one! Stop them!\"", "\"Send for the constable, quick!\"", "\"Fire! Get the brigade!\""],
  twentieth: ["\"Call the police!\"", "\"Somebody get to a telephone!\"", "\"Hey! Stop right there!\"", "\"Get help, quick!\"", "\"Fire! Everybody out!\""],
  modern: ["\"Somebody call the cops!\"", "\"Call 112! Now!\"", "\"Hey! Hey, stop!\"", "\"Get security!\"", "\"Everybody out, now!\""],
  future: ["\"Trigger the alarm! Lock it down!\"", "\"Ping security, all channels!\"", "\"Intruder! Intruder!\"", "\"Somebody flag it, now!\"", "\"Seal the doors!\""]
};
/** Cries when hurt (any era). */
/** NPC 0.18.0: what a rival says when it squares up but holds back, by era. */
export const CRY_THREAT = {
  medieval: ["\"Not here. Not tonight.\"", "\"Another step and you will regret it.\"", "\"I know what you are.\"", "\"Go back the way you came.\""],
  earlymodern: ["\"Keep your distance, if you value your neck.\"", "\"I know your kind.\"", "\"This is not your street.\"", "\"Another time, then.\""],
  nineteenth: ["\"You are a long way from home.\"", "\"I know what you are.\"", "\"Walk on. While you can.\"", "\"Not here. Too many eyes.\""],
  twentieth: ["\"Wrong part of town.\"", "\"I know what you are.\"", "\"Keep walking.\"", "\"Not here. Not now.\""],
  modern: ["\"Wrong neighbourhood.\"", "\"I know what you are.\"", "\"Keep walking. Seriously.\"", "\"Not here. Too many people.\""],
  future: ["\"You're off your grid.\"", "\"I've got your number.\"", "\"Walk. Now.\"", "\"Not here. Too many cameras.\""]
};

export const CRY_HURT = ["\"Help! Help me!\"", "\"Mercy! Have mercy!\"", "\"You've killed me!\"", "\"No, please! Stop!\"", "\"Ah! My arm!\"", "\"Someone, anyone!\"", "\"Mother of God!\"", "\"I'm bleeding! I'm bleeding!\""];

/** Barks while at their routine. */
export const BARK = {
  work: ["\"Another day, another sore back.\"", "\"Mind out, coming through.\"", "\"Pass me that, would you?\"", "\"This won't do itself.\"", "\"If the master asks, I've been at it since dawn.\"", "\"Nearly done. Nearly.\""],
  pray: ["\"Lord, have mercy.\"", "\"Pray for us sinners.\"", "\"Deliver us from evil.\"", "\"Into Thy hands.\"", "\"Watch over this house tonight.\""],
  drink: ["\"Another! And make it the good stuff.\"", "\"To absent friends!\"", "\"Who's paying? Not me.\"", "\"I'll have you know I'm perfectly sober.\"", "\"Sing, you miserable lot!\"", "\"One more, then home. Honest.\""],
  patrol: ["\"All quiet.\"", "\"Who goes there?\"", "\"Move along, now.\"", "\"Keep to the light.\"", "\"Nothing to see here.\""],
  errand: ["\"Can't stop, can't stop.\"", "\"Late again. Always late.\"", "\"Now where was that shop?\"", "\"Mustn't forget the salt.\""],
  wander: ["\"Lovely evening for it.\"", "\"Hm. Haven't been down this way in years.\"", "\"Where did the time go?\"", "\"Nothing much happening tonight.\""],
  attend: ["\"Yes, at once.\"", "\"As you wish.\"", "\"Right away.\"", "\"Of course. Anything else?\""],
  rest: ["\"Ah. That's better.\"", "\"Just five minutes.\"", "\"My feet are killing me.\""],
  hunt: ["\"Quiet. Something's moving.\"", "\"There. No, gone.\""],
  hide: ["\"Shh. Not a sound.\"", "\"Did you hear that?\""],
  sleep: ["\"Mmph. Go away.\"", "\"Five more minutes.\"", "\"Wha? Who's there?\""]
};
/** Work and the watch in the words of the time. */
export const BARK_ERA = {
  medieval: {work: ["\"Bless this bread, and the hands that kneaded it.\"", "\"The reeve will have my hide if this isn't done.\""], patrol: ["\"Curfew's rung! Home with you!\"", "\"Douse that light, by the lord's order.\""]},
  earlymodern: {work: ["\"Guild rules or no, I need an apprentice.\"", "\"The printer wants this by Thursday.\""], patrol: ["\"Ten o'clock and all's well!\"", "\"Lanterns lit, by order of the council!\""]},
  nineteenth: {work: ["\"The foreman's watching. Look busy.\"", "\"Mind the belts, they'll take your fingers.\""], patrol: ["\"Move along, there's nothing here for you.\"", "\"Lamps out at midnight, by order.\""]},
  twentieth: {work: ["\"Shift's nearly over, thank God.\"", "\"Who took my thermos?\""], patrol: ["\"Papers, please.\"", "\"Curfew starts at ten.\""]},
  modern: {work: ["\"My manager's going to kill me.\"", "\"Is it Friday yet?\""], patrol: ["\"Sir, ma'am, I'll need you to move along.\"", "\"Got a call about a disturbance.\""]},
  future: {work: ["\"Quota's up again. Of course it is.\"", "\"The system says I'm on break. I'm not.\""], patrol: ["\"Scan your ID, please.\"", "\"Stay in the lit zones after curfew.\""]}
};

/** Trade talk, for WoDX trading (by how they regard the character where it matters). */
export const TRADE = {
  open: {cold: ["\"Buying or wasting my time?\"", "\"Coin first, then we talk.\""], neutral: ["\"Looking to buy? Have a look.\"", "\"What can I get you?\"", "\"Everything's priced fair. Mostly.\""], warm: ["\"For you, I'll find something special.\"", "\"Friend! Take your time, have a look.\"", "\"I put this aside for you, as it happens.\""]},
  tooDear: ["\"That's robbery, and you know it.\"", "\"For that price, I'd want it gilded.\"", "\"You think I'm made of money?\""],
  fair: ["\"A fair price. Done.\"", "\"Agreed. Pleasure doing business.\"", "\"Done, and done.\""],
  haggleWin: ["\"Oh, fine. You'll ruin me, but fine.\"", "\"You drive a hard bargain. All right.\"", "\"For you, then. Just this once.\""],
  haggleLose: ["\"That's my price. Take it or leave it.\"", "\"No. Not a penny less.\"", "\"Try that again and the price goes up.\""],
  refuse: ["\"I'll not sell to you. Not at any price.\"", "\"Your money's no good here.\"", "\"Find another shop.\""],
  noMoney: ["\"Come back when you've the coin.\"", "\"Credit? Do I look like a bank?\"", "\"No money, no goods. Simple.\""],
  fence: ["\"I don't ask where it came from. You don't tell me.\"", "\"Hot goods, cold price.\"", "\"Quarter value, and you never saw me.\"", "\"Interesting. Very interesting. Who else knows you have this?\""],
  buy: ["\"I'll give you half what it's worth. That's the going rate.\"", "\"I can take it off your hands. For a price.\"", "\"Hm. Seen better, seen worse.\""]
};

/** How they take a social roll: win (the character succeeded) or lose. */
export const SOCIAL = {
  persuade: {win: ["\"All right. You've talked me round.\"", "\"Fine. You make a fair point.\"", "\"I suppose there's sense in that.\""], lose: ["\"No. I don't think so.\"", "\"Nice try. No.\"", "\"You'll not change my mind.\""]},
  intimidate: {win: ["\"All right! All right. Just don't hurt me.\"", "\"Fine. Whatever you want.\"", "\"Easy, easy. I'll do it.\""], lose: ["\"You don't scare me.\"", "\"Lay a finger on me and see what happens.\"", "\"Is that meant to frighten me?\""]},
  bribe: {win: ["\"Well. That's very generous of you.\"", "\"I didn't see anything. Did you?\"", "\"For this? I can be very forgetful.\""], lose: ["\"Put that away before someone sees.\"", "\"I'm not for sale.\"", "\"Is that all? Insulting.\""]},
  charm: {win: ["\"You're a sweet talker, aren't you?\"", "\"Oh, go on, then.\"", "\"How could I say no to you?\""], lose: ["\"Flattery won't work on me.\"", "\"Save it for someone who'll believe it.\"", "\"Are you quite finished?\""]},
  deceive: {win: ["\"Really? Well, if you say so.\"", "\"Oh! I hadn't heard. Thank you.\"", "\"That makes sense, I suppose.\""], lose: ["\"Do you take me for a fool?\"", "\"That's a lie, and a poor one.\"", "\"Try again. Slower, this time.\""]},
  seduce: {win: ["\"Well. Aren't you something.\"", "\"Stay a while. Stay as long as you like.\"", "\"I hadn't planned on this tonight.\""], lose: ["\"I'm flattered, truly. But no.\"", "\"Not tonight. Not ever, I think.\"", "\"You're wasting your time.\""]}
};

/**
 * Voices: kinds of people. Each has greetings (cold for hate and dislike, neutral, warm for like and love), a
 * brush-off, and gossip of its own. Corporate speaks from 1980; street from 1900.
 */
export const VOICES = {
  clergy: {label: "Clergy", greet: {cold: ["\"May God forgive you, for I find it hard.\"", "\"You stand on holy ground. Behave accordingly.\""], neutral: ["\"Peace be with you, child.\"", "\"God's blessing on you. What troubles you?\""], warm: ["\"Ah, my child, welcome. Sit, and be at peace.\"", "\"The Lord sends me good company today.\""]},
    none: ["\"That is a matter for prayer, not for me.\"", "\"God knows. I do not.\""], gossip: ["\"There are souls in this parish who have not confessed in years.\"", "\"Someone has been leaving offerings at the old shrine. Not Christian ones.\""]},
  noble: {label: "Noble", greet: {cold: ["\"You presume to address me?\"", "\"State your business, then begone.\""], neutral: ["\"Yes? You may speak.\"", "\"I can spare you a moment.\""], warm: ["\"Ah, a welcome face. Come, walk with me.\"", "\"My door is open to you, as ever.\""]},
    none: ["\"Such matters are beneath my notice.\"", "\"Ask my steward. I don't concern myself with that.\""], gossip: ["\"The baron's heir is a fool. Everyone at court says so.\"", "\"There's a match being arranged that will set half the county against the other half.\""]},
  merchant: {label: "Merchant", greet: {cold: ["\"If you're not buying, you're blocking the light.\"", "\"I've nothing for you. Move along.\""], neutral: ["\"Good day! Buying or selling?\"", "\"Welcome. Everything you see is for sale.\""], warm: ["\"My best customer! Come in, come in.\"", "\"I saved something special for you.\""]},
    none: ["\"Not my line of business, I'm afraid.\"", "\"If it doesn't sell, I don't know about it.\""], gossip: ["\"The tolls on the Brno road have doubled. Someone's lining their pockets.\"", "\"A shipment went missing on the Morava. Third this season.\""]},
  soldier: {label: "Soldier or watch", greet: {cold: ["\"Keep your hands where I can see them.\"", "\"You. Stop right there.\""], neutral: ["\"Halt. State your business.\"", "\"Evening. Keep out of trouble.\""], warm: ["\"At ease, friend. Good to see you.\"", "\"You're all right. Pass.\""]},
    none: ["\"Above my rank.\"", "\"I just follow orders.\""], gossip: ["\"The captain's been drinking. More than usual.\"", "\"Two of the night watch never came back from the east gate.\""]},
  criminal: {label: "Criminal", greet: {cold: ["\"You've got a nerve, showing your face here.\"", "\"Wrong door, friend. Very wrong.\""], neutral: ["\"Who sent you?\"", "\"Talk quiet. Walls have ears.\""], warm: ["\"Well, well. My favourite customer.\"", "\"For you, I've always got time. What's the job?\""]},
    none: ["\"Never heard of it. Never heard of you.\"", "\"Don't know, don't want to.\""], gossip: ["\"Somebody's moving in on the docks. Somebody nobody's seen.\"", "\"There's a fence who stopped buying. Says some goods are cursed.\""]},
  scholar: {label: "Scholar", greet: {cold: ["\"I'm busy. Very busy. Go away.\"", "\"You've interrupted my work. Again.\""], neutral: ["\"Hm? Oh. Yes, what is it?\"", "\"A visitor. How unusual. What do you want?\""], warm: ["\"Ah! Just the person. I've found something remarkable.\"", "\"Come in, mind the books. Sit anywhere that isn't paper.\""]},
    none: ["\"The texts are silent on that.\"", "\"I'd have to consult my notes. Come back in a month.\""], gossip: ["\"Someone has been stealing pages from the oldest books in the library.\"", "\"A colleague in Prague stopped answering my letters. Most unlike them.\""]},
  servant: {label: "Servant", greet: {cold: ["\"The master's not receiving. Not you, anyway.\"", "\"I'll thank you to wipe your feet.\""], neutral: ["\"Can I help you? The household is busy.\"", "\"Yes? Who shall I say is calling?\""], warm: ["\"Oh, it's you. Come round the back, there's soup.\"", "\"The master's out. Come in, warm yourself.\""]},
    none: ["\"It's not my place to say.\"", "\"I just keep the house, I don't know such things.\""], gossip: ["\"The master hasn't eaten a meal at the table in a month. But the larder empties.\"", "\"There's a room upstairs no one is allowed to clean.\""]},
  peasant: {label: "Farmer or villager", greet: {cold: ["\"We don't want your kind here.\"", "\"Get off my land.\""], neutral: ["\"Good day. You're a long way from town.\"", "\"Hello there. Mind the dog.\""], warm: ["\"Come in, come in. There's milk, if you'd like.\"", "\"Good to see you! Sit, the chores can wait.\""]},
    none: ["\"I'm just a simple farmer.\"", "\"Couldn't tell you. Never been past the next village.\""], gossip: ["\"The cows won't go near the old oak. Not since spring.\"", "\"Something's been at the chickens. Not a fox. Bigger.\""]},
  corporate: {label: "Corporate (1980 on)", from: 1980, greet: {cold: ["\"Security will escort you out.\"", "\"You're not on my calendar. You never will be.\""], neutral: ["\"Do you have an appointment?\"", "\"I can give you five minutes.\""], warm: ["\"Great to see you. Let's take this to my office.\"", "\"Always a pleasure. Coffee? Real beans.\""]},
    none: ["\"That's above my pay grade.\"", "\"I'd have to run that past legal.\""], gossip: ["\"The board's been meeting at night. Off the books.\"", "\"Three people from accounts quit the same day. Nobody's allowed to talk about it.\""]},
  street: {label: "Street (1900 on)", from: 1900, greet: {cold: ["\"Beat it. You're bad for business.\"", "\"Wrong block, friend.\""], neutral: ["\"What's the word?\"", "\"Yo. You need something?\""], warm: ["\"There's my favourite face. What's good?\"", "\"Hey! You're all right. Come here.\""]},
    none: ["\"Nobody tells me nothing.\"", "\"Ask around. Not me, though.\""], gossip: ["\"There's a car that cruises the block at three in the morning. No lights.\"", "\"Kid from the corner went into the old factory. Came out different.\""]},
  child: {label: "Child", greet: {cold: ["\"Go away! I'm not allowed to talk to you.\"", "\"Mama says you're bad.\""], neutral: ["\"Who are you? Are you from far away?\"", "\"Do you want to see my frog?\""], warm: ["\"It's you! Did you bring anything?\"", "\"Play with me! Please?\""]},
    none: ["\"I don't know. Ask a grown-up.\"", "\"That's boring.\""], gossip: ["\"There's someone who only comes out at night. They gave me a sweet.\"", "\"The big dog by the mill talks. It does!\""]},
  beggar: {label: "Beggar", greet: {cold: ["\"Spit on you, then.\"", "\"You'll get your own one day. See if you don't.\""], neutral: ["\"Spare a coin? For the love of God?\"", "\"Alms, good friend, alms.\""], warm: ["\"Bless you, you've a kind face. Bless you.\"", "\"My friend! I knew you'd come by.\""]},
    none: ["\"A coin might jog my memory.\"", "\"Who listens to the likes of me?\""], gossip: ["\"I see things. Nobody looks at a beggar, but a beggar looks at everybody.\"", "\"There's someone who comes down to the river at night and just stands there. For hours.\""]},
  drunk: {label: "Drunk", greet: {cold: ["\"You! I know you. You're the one who... who... go away.\"", "\"Don't look at me like that.\""], neutral: ["\"Hello! Hello hello. Buy me a drink?\"", "\"Have we met? You look familiar. Or blurry.\""], warm: ["\"My best friend! My very best friend!\"", "\"I love you. I do. Sit down, sit down.\""]},
    none: ["\"Wha? Never heard of it. Is it a drink?\"", "\"I knew, once. Then I had another.\""], gossip: ["\"I saw a man with no shadow. Swear to God. Swear it.\"", "\"The innkeeper waters the wine. And worse.\""]}
};

/** Small talk on the day: feasts and fasts, the season, the hour, the weather. {feast} is the feast's name. */
export const SMALL = {
  feast: ["\"A blessed {feast} to you.\"", "\"{feast}, and not a drop of wine left in the house.\"", "\"Happy {feast}. Will you go to Mass?\""],
  fast: ["\"Fasting again, and me with an empty belly.\"", "\"Fish again. Always fish on a fast day.\"", "\"Keep the fast, they say. Easy for them to say.\""],
  winter: ["\"Cold enough to freeze the Morava solid.\"", "\"Winter's in my bones this year.\"", "\"The days are so short. Barely light at all.\""],
  spring: ["\"The thaw's come at last.\"", "\"Mud everywhere. Spring in Moravia.\"", "\"The orchards are in blossom. Lovely, isn't it?\""],
  summer: ["\"Hot enough to bake bread on the stones.\"", "\"The harvest's coming in. Busy times.\"", "\"Long days. Too long, some say.\""],
  autumn: ["\"The leaves are turning. Winter's not far off.\"", "\"Wine harvest soon. The vineyards look good.\"", "\"Getting dark earlier every night.\""],
  night: ["\"Late to be abroad, isn't it?\"", "\"Not many folk out this late. Honest ones, anyway.\"", "\"Mind yourself out there. The nights aren't safe.\""],
  rain: ["\"Will this rain never stop?\"", "\"You're soaked. Stand by the fire.\""],
  snow: ["\"Snow again. The roads will be shut.\"", "\"Knock the snow off your boots, would you?\""],
  fog: ["\"Can't see your hand in front of your face out there.\"", "\"Fog off the river. Strange things walk in fog.\""],
  wind: ["\"Hear that wind? It'll have the roof off.\"", "\"Blowing a gale. Shut the door, quick.\""],
  thunder: ["\"Hear that? Storm's right on top of us.\"", "\"God's angry tonight.\""],
  cold: ["\"Bitter out. Warm your hands here.\"", "\"Cold as the grave tonight.\""],
  hot: ["\"Stifling, isn't it? Not a breath of air.\"", "\"Too hot to work, too hot to sleep.\""]
};

/** When the NPC has heard a rumour that names the character. */
export const ABOUT_YOU = {
  hate: ["\"I know what they say about you. Every word of it.\"", "\"Murderer. That's what they call you. I believe it.\""],
  dislike: ["\"I've heard about you. None of it good.\"", "\"So you're the one people talk about.\""],
  neutral: ["\"You're the one folk are talking about, aren't you?\"", "\"I've heard your name round here lately.\""],
  like: ["\"I've heard what you did. Good for you.\"", "\"People are talking about you. Mostly kindly.\""],
  love: ["\"Everyone's talking about you! I'm so proud.\"", "\"I hear you've been busy. Tell me it's all true.\""]
};

/** Goodbye, by era and warmth. */
export const FAREWELL = {
  medieval: {cold: ["\"Go, and don't come back.\"", "\"God speed you. Far away from here.\""], neutral: ["\"God keep you.\"", "\"Go with God.\"", "\"Safe roads to you.\""], warm: ["\"God and all the saints keep you.\"", "\"Come back soon, friend. Don't be a stranger.\"", "\"Mind the woods after dark. I'll pray for you.\""]},
  earlymodern: {cold: ["\"Good riddance.\"", "\"Mind the door on your way out.\""], neutral: ["\"Good day to you.\"", "\"Your servant.\"", "\"Fare you well.\""], warm: ["\"Fare you well, my friend. Write to me.\"", "\"You'll always be welcome here.\"", "\"God keep you, and bring you back soon.\""]},
  nineteenth: {cold: ["\"Good day. And goodbye.\"", "\"I'll not see you out.\""], neutral: ["\"Good evening.\"", "\"Mind how you go.\"", "\"Good afternoon, then.\""], warm: ["\"Do call again, and soon.\"", "\"Take care of yourself, my dear.\"", "\"Give my regards to everyone.\""]},
  twentieth: {cold: ["\"Don't let the door hit you.\"", "\"Yeah, bye.\""], neutral: ["\"So long.\"", "\"See you around.\"", "\"Take it easy.\""], warm: ["\"Come back soon, you hear?\"", "\"Take care of yourself, okay?\"", "\"Don't be a stranger.\""]},
  modern: {cold: ["\"Bye. Don't come back.\"", "\"Yeah, whatever.\""], neutral: ["\"See you.\"", "\"Later.\"", "\"Take care.\""], warm: ["\"Text me when you get home, okay?\"", "\"Love you. Be safe.\"", "\"Come back soon, seriously.\""]},
  future: {cold: ["\"Logging off. On you.\"", "\"Don't ping me again.\""], neutral: ["\"Stay connected.\"", "\"Watch the curfew.\"", "\"See you on the feeds.\""], warm: ["\"Stay safe out there. Ping me when you're home.\"", "\"Door's always coded to you.\"", "\"Come back in one piece, okay?\""]}
};

/** Remembering the last visit: soon (within a month) or long (more than a year), by warmth. */
export const REMEMBER = {
  soon: {cold: ["\"Back again? Wonderful.\"", "\"You again. Twice in a month.\""], neutral: ["\"Back so soon?\"", "\"Didn't I see you just the other week?\""], warm: ["\"Back already! I'm glad.\"", "\"Twice in a month. You spoil me.\""]},
  long: {cold: ["\"I hoped I'd seen the last of you.\"", "\"Years, and you've not changed.\""], neutral: ["\"It's been a long time.\"", "\"I'd almost forgotten your face.\""], warm: ["\"It's been an age! Where have you been?\"", "\"Years! I thought you'd died. Come here.\""]}
};

/** Open debts in the WoDX Storyteller Ledger between this NPC and the character. */
export const LEDGER = {
  youOwe: ["\"Don't think I've forgotten what you owe me.\"", "\"About that debt of yours.\"", "\"You still owe me, remember.\""],
  iOwe: ["\"I've not forgotten what I owe you.\"", "\"I'm still in your debt. I know it.\"", "\"Name it, and we're square. I mean it.\""]
};
