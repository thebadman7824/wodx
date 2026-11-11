/**
 * WoDX NPC 0.11.0: stock talk. What anyone the Storyteller plays can say before the Storyteller has written a line
 * for them: greetings by how they regard the character, brush-offs, gossip, everyday news, work and directions, for
 * each span of years. The Storyteller's own lines always come first; these only fill the silence. House writing,
 * not from any book. The Storyteller can switch stock talk off for the world or for one NPC.
 *
 * Eras: medieval 1197-1499, earlymodern 1500-1799, nineteenth 1800-1899, twentieth 1900-1979, modern 1980-2025,
 * future 2026 on (or the Future Darkness branch). Regard: hate (-3), dislike (-2, -1), neutral (0, 1), like (2),
 * love (3), from the NPC's own attitude toward the character, else their faction's standing.
 * {rumour} in a lead-in is replaced by the rumour's own words (the Storyteller's, from the rumour network).
 */

export const ERAS = {medieval: [1197, 1499], earlymodern: [1500, 1799], nineteenth: [1800, 1899], twentieth: [1900, 1979], modern: [1980, 2025], future: [2026, 9999]};
export const REGARDS = ["hate", "dislike", "neutral", "like", "love"];

export const GREET = {
  medieval: {
    hate: ["\"You. Get from my door before I call the watch.\"", "\"God's wounds, not you again. Say your piece and be gone.\"", "\"I have nothing for you but a curse. Take it and go.\"", "\"Stand back. I'll not have your shadow on my threshold.\"", "\"The saints must hate me, to send you here twice.\""],
    dislike: ["\"Hm. What do you want?\"", "\"Be quick. I have work, and no love for idle talk.\"", "\"You again. Well? Out with it.\"", "\"I'll hear you, though I'd rather not.\"", "\"Mind your manners here, stranger.\""],
    neutral: ["\"God keep you. What brings you by?\"", "\"Good day to you, traveller.\"", "\"Peace be with you. You're not from the parish, are you?\"", "\"Well met. Is there something you need?\"", "\"Christ be with you. Speak up, I'm half deaf from the bells.\""],
    like: ["\"Ah, there you are! Come in out of the wind.\"", "\"Good to see a friendly face. Sit, if you've the time.\"", "\"God's blessing on you, friend. What news?\"", "\"Welcome back. There's bread, if you've a mind to it.\"", "\"You've the look of someone with a question. Ask away.\""],
    love: ["\"Friend! Thank God you're well. Come, sit by the fire.\"", "\"There's no one I'd sooner see. What can I do for you?\"", "\"My door's always open to you, you know that.\"", "\"Saints be praised, you've come back. Tell me everything.\"", "\"For you, anything I have. Just name it.\""]
  },
  earlymodern: {
    hate: ["\"Not one step closer. I know what you are.\"", "\"You have a nerve, showing your face here.\"", "\"Begone, or I'll have the constable on you.\"", "\"I'd sooner talk to the hangman.\"", "\"Whatever you're selling, I'll not buy it. Go.\""],
    dislike: ["\"What is it now?\"", "\"Speak your business and be done.\"", "\"I've little time for you today.\"", "\"Mind where you put your feet. This is a respectable house.\"", "\"Oh. It's you.\""],
    neutral: ["\"Good day. Can I help you?\"", "\"Your servant. What is it you need?\"", "\"God save you. New in town?\"", "\"Well, good morrow. What brings you?\"", "\"Yes? Speak up, there's a cart going by.\""],
    like: ["\"Ah, good! I was hoping you'd call.\"", "\"Welcome, welcome. Will you take a cup?\"", "\"A pleasure as always. What can I do for you?\"", "\"There you are. I'd begun to wonder where you'd got to.\"", "\"Come in, and shut the door behind you. It's bitter out.\""],
    love: ["\"My dear friend! You honour my house.\"", "\"Nothing would please me more than to help you. Ask.\"", "\"Here, take the good chair. I insist.\"", "\"I've been praying for your safe return.\"", "\"You'll stay to supper, and I'll hear no argument.\""]
  },
  nineteenth: {
    hate: ["\"I've nothing to say to you. Good day.\"", "\"You'll leave now, or I'll send for a policeman.\"", "\"The cheek of it, coming here.\"", "\"I know your sort. Clear off.\"", "\"Don't trouble me. I won't be troubled by you.\""],
    dislike: ["\"Yes? What is it?\"", "\"I'm rather busy, as you can see.\"", "\"Make it brief, if you would.\"", "\"Hm. You again.\"", "\"Wipe your boots before you come any nearer.\""],
    neutral: ["\"Good afternoon. How may I help?\"", "\"Evening. Lost, are we?\"", "\"How do you do. Was there something?\"", "\"Morning. Fine weather, for once.\"", "\"Can I help you at all?\""],
    like: ["\"Hello again! A pleasure, truly.\"", "\"Come in, come in. The kettle's on.\"", "\"Ah, the very person. What can I do for you?\"", "\"Splendid to see you. How have you been keeping?\"", "\"Do sit. You look as though you've walked a mile.\""],
    love: ["\"My dear! What a joy. Come here.\"", "\"Anything you need, you've only to ask.\"", "\"I was just thinking of you. Sit, sit.\"", "\"You've made my week by calling. Tea?\"", "\"For you, the door is never locked.\""]
  },
  twentieth: {
    hate: ["\"Get lost. I mean it.\"", "\"You've got some nerve. Beat it.\"", "\"I'm calling the police if you don't leave.\"", "\"Nothing to say to you. Nothing.\"", "\"Turn around and walk away. Now.\""],
    dislike: ["\"What do you want?\"", "\"Make it quick, I'm busy.\"", "\"Oh. You.\"", "\"Whatever it is, I'm not interested.\"", "\"Haven't you got somewhere else to be?\""],
    neutral: ["\"Hello. Can I help you?\"", "\"Yeah? What can I do for you?\"", "\"Afternoon. Looking for something?\"", "\"Hi there. You need directions or something?\"", "\"Evening. Bit late to be out, isn't it?\""],
    like: ["\"Hey, good to see you! Come on in.\"", "\"Well, look who it is. Coffee?\"", "\"There you are. I was hoping you'd stop by.\"", "\"Always a pleasure. What's up?\"", "\"Pull up a chair, take a load off.\""],
    love: ["\"Hey! Get over here, it's been too long.\"", "\"For you? Anything. What do you need?\"", "\"You're a sight for sore eyes, you know that?\"", "\"I was worried about you. Sit down, tell me everything.\"", "\"My place is your place. Always.\""]
  },
  modern: {
    hate: ["\"Nope. Not doing this. Leave.\"", "\"Back off or I'm calling the cops.\"", "\"Seriously? You've got a nerve showing up.\"", "\"I don't talk to you. Ever.\"", "\"Walk away. I'm not asking twice.\""],
    dislike: ["\"What.\"", "\"Can this wait? I'm busy.\"", "\"Oh great. You.\"", "\"Whatever you want, the answer's probably no.\"", "\"Make it fast.\""],
    neutral: ["\"Hey. Can I help you?\"", "\"Yeah? What's up?\"", "\"Hi. You need something?\"", "\"Evening. You lost?\"", "\"Sorry, do I know you?\""],
    like: ["\"Hey, you! Good to see you.\"", "\"Oh nice, come in. Want a drink?\"", "\"There you are. I was just thinking about you.\"", "\"Always good to see a friendly face. What's going on?\"", "\"Grab a seat. How've you been?\""],
    love: ["\"Oh my god, hi! Come here.\"", "\"Anything you need. Seriously, anything.\"", "\"You're okay! I was getting worried.\"", "\"You know you never have to knock, right?\"", "\"Best thing that's happened all week, you showing up.\""]
  },
  future: {
    hate: ["\"Flagged you the moment you walked in. Leave.\"", "\"My feed says you're trouble. My gut agrees. Go.\"", "\"Step off before I ping security.\"", "\"I'm not talking to you. Not on any channel.\"", "\"You've got about ten seconds before I call it in.\""],
    dislike: ["\"What do you want? Make it quick.\"", "\"I'm on the clock. Talk fast.\"", "\"You again. Great.\"", "\"Whatever it is, I've got no bandwidth for it.\"", "\"Keep your hands where my camera can see them.\""],
    neutral: ["\"Hey. Need something?\"", "\"Yeah? I've got a minute.\"", "\"Hi. You're not on my list, but go ahead.\"", "\"Evening. Curfew's soon, just so you know.\"", "\"Can I help you? Real person, not a bot.\""],
    like: ["\"Hey! Good to see you in the flesh.\"", "\"Come in, I've got real coffee. The good stuff.\"", "\"There you are. Thought you'd gone dark.\"", "\"Always got time for you. What's the word?\"", "\"Sit down, I'll kill the feeds.\""],
    love: ["\"You made it! Get in here.\"", "\"Whatever you need, it's yours. No ledger.\"", "\"I was about to start calling the hospitals.\"", "\"You're one of the few people I actually trust.\"", "\"Door's coded to you. Always has been.\""]
  }
};

/** When nothing fits: a brush-off by regard, any era. */
export const NONE = {
  hate: ["\"I'd not tell you if I knew.\"", "\"Ask someone who cares.\"", "\"Why would I tell you anything?\"", "\"Go and ask the devil.\""],
  dislike: ["\"Don't know. Don't much care.\"", "\"Couldn't say.\"", "\"No idea, and I've work to do.\"", "\"Ask someone else.\""],
  neutral: ["\"Can't help you there, sorry.\"", "\"I wouldn't know about that.\"", "\"Not something I know much about.\"", "\"You'd do better asking someone else.\""],
  like: ["\"I wish I knew. I'll keep an ear out for you.\"", "\"No idea, I'm afraid. Ask around, though.\"", "\"Haven't heard a thing. Sorry, friend.\"", "\"That's beyond me. If I hear anything, I'll tell you.\""],
  love: ["\"I'd tell you in a heartbeat if I knew. I'll ask for you.\"", "\"I don't know, but give me a day. I'll find out.\"", "\"Not a word, but I'll keep my eyes open for you.\"", "\"I'm sorry. If I hear anything at all, you'll be the first.\""]
};

/** Before passing on a rumour the NPC has heard. */
export const RUMOUR_LEAD = {
  hate: [],
  dislike: ["\"Fine. Here is what they say: {rumour} Now leave me be.\"", "\"If it'll get rid of you: {rumour}\""],
  neutral: ["\"Well, here is what I heard. {rumour} Make of it what you will.\"", "\"People are saying this: {rumour}\"", "\"There's talk going round. {rumour}\"", "\"Only gossip, mind. {rumour}\""],
  like: ["\"Have you heard? {rumour}\"", "\"Between us: {rumour}\"", "\"You'll want to know this. {rumour}\"", "\"Now, I shouldn't say, but here it is. {rumour}\""],
  love: ["\"I'll tell you, and only you: {rumour}\"", "\"Listen close, I've been saving this for you. {rumour}\"", "\"You didn't hear it from me. {rumour}\"", "\"Here's something worth knowing. {rumour}\""]
};
/** Asked for gossip by someone they do not care to share it with. */
export const RUMOUR_REFUSE = {
  hate: ["\"Gossip? With you? Not likely.\"", "\"What's said in this town stays out of your ears.\"", "\"I'll give you nothing to carry.\""],
  dislike: ["\"I don't trade in gossip. Not with you, anyway.\"", "\"Nothing worth repeating.\""]
};

/** Everyday gossip when the network has nothing new: small things anyone might say. */
export const GOSSIP = {
  medieval: ["\"The miller's been weighing short again. Everyone knows it.\"", "\"They say the priest drinks more of the communion wine than the faithful do.\"", "\"Someone saw lights in the old chapel ruins, past midnight.\"", "\"The reeve's eldest is to wed, though no one's sure to whom.\"", "\"A pedlar swore the bridge toll's going up again come Michaelmas.\"", "\"Two of Hans's sheep were found torn open in the far pasture. Wolves, the herder says.\"", "\"The lord's steward has been riding out alone at night. Nobody knows where.\"", "\"There's someone in the forest who'll cure warts for a penny and a secret.\"", "\"A friar came through preaching that the end is near. The friar looked hungry.\"", "\"The well by the church tastes of iron since the last storm.\"", "\"Old Grete swears to seeing a dead spouse standing at the crossroads.\"", "\"The weavers' quarter had a fire, and no one rang the bell for it.\""],
  earlymodern: ["\"The new pastor won't stop preaching against dancing.\"", "\"They hanged someone at the crossroads last week. Some say the wrong one.\"", "\"Prices at market are criminal. Bread's doubled since spring.\"", "\"There's a printer in town putting out pamphlets the council wants burned.\"", "\"A soldier came back from the wars with gold and no story to explain it.\"", "\"The widow on the hill keeps a black cat and talks to it. People notice.\"", "\"Someone's been robbing graves in the churchyard. Fresh ones.\"", "\"The guild masters are at each other's throats over the new tariffs.\"", "\"A coach was found on the forest road with no driver and the horses half mad.\"", "\"They say the magistrate's son owes more at dice than the town's worth.\"", "\"There's a fever down by the tanneries. Keep away from there.\"", "\"A comet was seen two nights ago. The old folk say it means war.\""],
  nineteenth: ["\"The factory's taking on hands again, but the pay's a disgrace.\"", "\"Have you seen the new gas lamps on the high street? Lovely, if they don't blow up.\"", "\"A gentleman from the city has been buying up land along the river. Nobody knows why.\"", "\"The constable's been seen at the gaming house more than once.\"", "\"There's a spiritualist holding seances above the bookshop. All the rage.\"", "\"A child went missing from the workhouse. They say it's not the first.\"", "\"The railway's coming through, and half the old lanes will go.\"", "\"Someone's been leaving flowers on the unmarked graves behind the chapel.\"", "\"The doctor's spouse hasn't been seen in a month. The doctor says it's rest, nothing more.\"", "\"There's cholera in the lower town. Boil your water.\"", "\"A sailor at the inn swore to seeing someone walk off the end of the pier and keep walking.\"", "\"The mill owner's sacked twenty hands and no one dares say why.\""],
  twentieth: ["\"The plant's laying people off again. Third time this year.\"", "\"Did you hear about the car they pulled out of the river? Nobody in it.\"", "\"There's a new club downtown. Opens at midnight, closes at dawn.\"", "\"The mayor's got a new car and a new friend. Not the one at home.\"", "\"Somebody's been breaking into the old church. Not taking anything, just breaking in.\"", "\"Rationing's got everyone on edge. Fights at the grocer's every week.\"", "\"They found a body in the canal. Paper says it was an accident.\"", "\"The cinema's showing pictures from abroad now. Shocking, some of it.\"", "\"There's someone at the docks who can get you anything, for a price.\"", "\"Old Kessler won't leave the house after dark. Not for anything.\"", "\"The radio said the strike's going to spread. We'll see.\"", "\"Kids keep daring each other to spend a night in the empty asylum.\""],
  modern: ["\"Cops have been all over the warehouse district this week.\"", "\"Someone's tagging weird symbols on the overpass. Not gang stuff, something else.\"", "\"There's a new club that only lets you in if you know the name of the night.\"", "\"Rent's going up again. The whole block's getting bought out.\"", "\"Did you see the news? Another kid gone missing near the park.\"", "\"My cousin works nights at the hospital. Says the blood bank keeps coming up short.\"", "\"There's this preacher on the corner who swears to seeing what people really are.\"", "\"Somebody said the old mill's got squatters. Nobody's seen them in daylight.\"", "\"The councilman's been in the paper again. Same old scandal, new photos.\"", "\"Power keeps cutting out on the east side. They say it's the grid.\"", "\"Somebody's selling a drug that makes you see things. Real things, they say.\"", "\"A dog went crazy in the park last week. Wouldn't stop howling at the trees.\""],
  future: ["\"Another arcology went into lockdown. No one's saying why.\"", "\"The feeds keep scrubbing posts about the blackout zones.\"", "\"There's a black clinic down in the undercity doing mods without licences.\"", "\"Corp security pulled three people off the street last night. Just gone.\"", "\"Someone hacked the billboards to show the same face over and over. Nobody knows whose.\"", "\"Water rations are getting cut again in the lower levels.\"", "\"They say some of the old-money families never show up on any camera.\"", "\"The air filters on deck nine have been down for a week. People are coughing.\"", "\"A courier swore something moved in the dead zone beyond the wall.\"", "\"There's a market for real food now. Grown in dirt. Costs a fortune.\"", "\"The AI on the transit line keeps announcing a stop that doesn't exist.\"", "\"People are going missing from the night shifts. The corps call it attrition.\""]
};

/** News: the everyday talk of a time and place. */
export const NEWS = {
  medieval: ["\"The harvest's thin this year. We'll be eating acorns by Lent.\"", "\"The duke's raising troops again. Every family has to send one.\"", "\"Pilgrims coming through say the roads south are full of brigands.\"", "\"The bishop's coming for the feast day. Everyone's scrubbing the church.\"", "\"There's talk of a new market charter, if the lord can pay for it.\"", "\"A merchant brought word of sickness in the cities downriver.\"", "\"The tithe collectors are early this year. Hide what you can.\"", "\"They're building a new tower on the town wall. About time.\"", "\"Floods took the low fields again. The river's never been this high.\"", "\"Word is the old abbot's dying. There'll be a fight over who's next.\""],
  earlymodern: ["\"The war's turning, or so the broadsheets say. Who knows.\"", "\"There's a new tax on salt, and another on candles.\"", "\"The council's banned dice in the taverns. Again.\"", "\"Soldiers are quartered in the lower town. Lock your doors.\"", "\"A ship came in with spices and pox, in about equal measure.\"", "\"They're printing the Bible in plain speech now. The priests are furious.\"", "\"The plague pits outside the walls are being dug again.\"", "\"There's a new governor appointed. No one's met the new one yet.\"", "\"The price of grain's gone through the roof since the frost.\"", "\"A preacher's been arrested for heresy. The flock is restless.\""],
  nineteenth: ["\"The newspaper says the strike at the mills is spreading.\"", "\"They're putting in gas mains along the old road.\"", "\"Parliament's debating the reform bill again. Nothing will change.\"", "\"The price of coal's up. It'll be a cold winter for the poor.\"", "\"There's an exhibition coming to the city. All the marvels of the age.\"", "\"A bank failed in the capital. People are pulling out their savings.\"", "\"They've opened a new asylum on the hill. Very modern, they say.\"", "\"The railway timetable's changed. Nobody can make sense of it.\"", "\"The army's recruiting in the square. Youngsters are signing up for the colonies.\"", "\"Cholera's been reported in the next town over.\""],
  twentieth: ["\"Paper says there's going to be another war. There's always another war.\"", "\"Factory's switching to three shifts. Good for some, I suppose.\"", "\"They're putting a television in the pub. Can you believe it?\"", "\"Prices are up again. My wages aren't.\"", "\"The election's next month. Same faces on every poster.\"", "\"They're tearing down the old quarter to build flats.\"", "\"The radio says the strikers have shut the docks.\"", "\"New motorway's going right through the farms out west.\"", "\"There was an air raid drill yesterday. Gave the old folk a fright.\"", "\"The rationing's supposed to end soon. Supposed to.\""],
  modern: ["\"Did you see the news? Stock market's in freefall again.\"", "\"They're closing the hospital on the north side. Budget cuts.\"", "\"Another protest downtown. Riot cops and everything.\"", "\"Gas prices went up again this week.\"", "\"The new mall's opening. Traffic's going to be hell.\"", "\"Election ads everywhere. I'm sick of it.\"", "\"There was a big fire at the docks. Paper says arson.\"", "\"They're putting cameras on every corner now. For our safety, they say.\"", "\"The factory closed. Three hundred jobs, gone.\"", "\"Some storm's coming in this weekend. Stock up.\""],
  future: ["\"The corp merger went through. Half the city just changed owners.\"", "\"Another heat dome this week. Stay inside if you can.\"", "\"The water riots in the south are all over the feeds.\"", "\"New ID laws kick in next month. Get your implant registered.\"", "\"The sea wall cracked again. They're evacuating the low levels.\"", "\"There's a new pandemic warning. Third this year.\"", "\"The orbitals stopped answering for six hours yesterday. No explanation.\"", "\"Food prints are up forty percent. Real food's a luxury now.\"", "\"The election was called by the algorithm before anyone voted.\"", "\"Power rationing starts tonight on the outer rings.\""]
};

/** Work: what someone might say about earning a living there. */
export const WORK = {
  medieval: ["\"The lord's always short of hands at harvest. Ask the reeve.\"", "\"The mason's yard needs strong backs, if you don't mind dust.\"", "\"No work here unless you can swing a scythe.\"", "\"The monks pay in bread for copying, if you've your letters.\"", "\"There's always room in the levy, if you want to die for the duke.\"", "\"The tanner's looking for someone. You'll smell it before you see it.\""],
  earlymodern: ["\"The printer needs a youngster to ink the type. Or anyone, really.\"", "\"The army's paying bounties for new recruits.\"", "\"The guilds won't have outsiders, but the docks will.\"", "\"A merchant's hiring guards for the road east. Dangerous work.\"", "\"Try the brickworks. They'll take anyone with hands.\"", "\"The council pays for night watchmen. It's cold, dull work.\""],
  nineteenth: ["\"The mills are always hiring, if you don't mind fourteen-hour days.\"", "\"The railway's laying track. Hard graft, steady pay.\"", "\"Big houses need servants, if you can stand being bossed about.\"", "\"Ask at the docks before dawn. They pick hands off the line.\"", "\"The newspaper wants runners. Pays a pittance.\"", "\"The mine's taking on again. I'd not go down there myself.\""],
  twentieth: ["\"The plant's hiring, but it's piecework. Hard to make a living.\"", "\"Try the employment office. Queue round the block, mind.\"", "\"There's work at the garage, if you know engines.\"", "\"The docks always need someone who won't ask questions.\"", "\"Shops are looking for staff for the holidays.\"", "\"Construction's booming. They'll take anyone who can lift.\""],
  modern: ["\"Everyone's hiring and nobody's paying. Try the warehouses.\"", "\"Delivery apps always want drivers. It's a grind, though.\"", "\"The hospital's desperate for night staff.\"", "\"Bartending pays okay if you can handle drunks.\"", "\"There's a temp agency on Fifth. They'll find you something.\"", "\"Security work. Long nights, nobody bothers you.\""],
  future: ["\"Gig boards are full, but the corps take a cut of everything.\"", "\"Courier work if you've got legs and no fear of the undercity.\"", "\"The arcologies want maintenance crews. Hazard pay, if you live.\"", "\"Data scrubbing. Mind-numbing, but it's indoors.\"", "\"The recyclers are hiring. Bring your own mask.\"", "\"Real human work is rare now. Most of it's babysitting machines.\""]
};

/** Directions, by how willing they are to help (stock talk cannot read the map, so it points to people who can). */
export const DIRECTIONS = {
  hate: ["\"Find your own way. Or don't.\"", "\"Straight to the devil, if you're asking me.\""],
  dislike: ["\"It's that way. Probably.\"", "\"Ask someone who's paid to know.\""],
  neutral: ["\"Ask at the inn, they know every road.\"", "\"Follow the main road and ask again when you get there.\"", "\"I'm no guide, but someone at the market will be.\""],
  like: ["\"I'll point you right. Come, I'll show you the turning.\"", "\"Easy. I'll draw it for you in the dirt.\"", "\"Go carefully on that road after dark. But it's that way.\""],
  love: ["\"I'll walk you there myself.\"", "\"Wait, I'll fetch my coat and take you.\"", "\"Don't go alone. Let me come with you.\""]
};
