const fs=require('fs');eval(fs.readFileSync('story-desk-2026-11-10a.js','utf8').replace('const SCEN','global.SCEN'));
const drop=new Set(['d1','o2']);
const over={ // id|year -> new text (null = remove, merged elsewhere)
 'w2|2013':null,'wr1|2013':null,'d3|2013':null,
 'wr1|1996':"The Collapse fills the Shadowlands with new dead. Stygia's Legions take them in as they always have; no great Maelstrom comes with the Collapse.",
 'd2|1997':"The Meltdown's dead raise a Maelstrom, and the storm cracks the Abyss. A few hundred Fallen escape into the dying across Iran, Iraq and Libya (CP2020 p. 177).",
 'wr2|1997':"The Mideast Meltdown kills millions in a day. The Maelstrom that follows is smaller than the one the classic timeline knows; Stygia survives, broken in places.",
 'd3|2005':"The cybermodem is invented. A second, slower wave of Fallen slips through the crack the 1997 storm left, this time into the Net (CP2020 p. 178).",
 'c1|2010':"A trickle of sidhe begins leaving for Arcadia through old trods. Commoners call it desertion.",
 'c3|2015':"The gate to Arcadia opens. Most Seelie nobles go through; most of the Unseelie Court and the commoners stay.",
 'o1|2010':"A rival corp finds that braindance users who flatline come back reporting the dead. Projection becomes cheap.",
 'o3|2000':"A private firm buys the FBI's ghost files and recruits people who have nearly died: the first projector group.",
 'k2|2016':"The Quincunx declares the Fifth Age over and the Sixth begun.",
 'k1|2020':"San Francisco is a three-way war: Camarilla, Anarchs and Kuei-jin, now under the Sixth Age's omens."
};
const extra={
 1994:[["Framing","The corps become contested ground. The Technocracy shapes the technology and sits in research; vampires and Hermetics buy shares and executives; a few mummies take long positions. Each owner thinks it is in charge (WoFD p. 16, pdf 3)."]],
 2004:[["Framing","Every corporate war from here on is a mortal war that each hidden power joins for its own ends. No faction sees the whole war."]],
 2013:[["Werewolf · Wraith · Demon","Microtech's first true AI wakes. It is one of the Fallen in a Weaver-spun vessel, with a netrunner's wraith bound inside as its slave. Theurges see the web, Spooks see the ghost, the Fallen see one of their own. Netwatch is founded the same year (CP2020 p. 179)."]]
};
const Y={};
for(const s of SCEN){ if(drop.has(s.id)) continue;
 for(const [yr,t] of s.beats){ const k=s.id+'|'+yr; let txt=t; if(k in over){ if(over[k]===null) continue; txt=over[k]; }
  (Y[yr]=Y[yr]||[]).push([s.line+' · '+s.title,txt]); } }
for(const y in extra) (Y[y]=Y[y]||[]).unshift(...extra[y]);
Y['2023']=(Y['2023']||[]).concat([["Run-up","Footage, files and optics gathered from here on stay private until 2025. Garou strikes on corp farms stay deniable."]]);
Y['Late 2024']=[
 ["Vampire · The Sabbat's long crusade","First crack: the braindance of a Sabbat Vaulderie, recorded by Cyberpsycho squad body cams, sells on the street. Most buyers think it is a fake."],
 ["Wraith · Ghosts in the mainframe","Second crack: a wraith speaks through a Netwatch system and three AIs match its voice to a dead netrunner. The Shroud holds; belief does not."]];
Y['2025: spring']=[
 ["Vampire · Mage","The first stone. The New World Order steers a Netwatch audit of a vampire-held corp to stage a controlled reveal. The wetdrives, blood-bond payroll and heatless executives get out before the edit is done (v1, m1)."],
 ["Mage · Werewolf · Demon","Within days: the Virtual Adepts dump every file they hold into the open Net, and the AI publishes its sorted list of everything not human (m3, w2, d3)."]];
Y['2025: early summer']=[
 ["Vampire · The Children of Carthage","The Children of Carthage unmask on purpose on Network 54, donors beside them (v3)."],
 ["Hunter · Leopold's crusade","A Society of Leopold strike on an Elysium in Rome goes out live. The Vatican admits the Society's purpose (h2)."]];
Y['2025: summer']=[["All lines","Everything recorded since 2023 comes out at once: the Crinos raid on the Biotechnica farm (w1), Garou war on corp labs (w3), the Hermetic and Tremere duel (m2), the possession braindance (wr3), ghosts in the glassed lands (wr2), the projector run (o1), the Fallen in Tehran (d2), the Kuei-jin street war in San Francisco (k1), the P'o frenzy in Hong Kong (k2), the Tokyo arcology nest (k3), the Cairo resurrection (mu2), the five-member board (mu3), Johanneson's unredacted files (h1). Nocker optics show the fae to those who wear them (c2)."]];
Y['2025: autumn']=[["All lines","Governments, the Vatican and the corps respond. The imbued, hundreds by now, act on the Arcanum's publication (h3). The projector firm is bought by the rival that found the braindance method (o3). Mummies step forward as advisers (mu1). The changelings, believed in but unproven, become go-betweens (c3) as Banality floods the Dreaming (c1)."]];
Y['2025: winter']=[["Vampire","The elders give up the young to the hunters to keep their own names hidden. It works for a month, then the footage of the purge leaks too (v1, v3)."]];
const order=k=>{const n=parseInt(k);return k.startsWith('Late')?2024.5:k.startsWith('2025:')?2025+['spring','early summer','summer','autumn','winter'].indexOf(k.split(': ')[1])/10:n;};
const years=Object.keys(Y).sort((a,b)=>order(a)-order(b)).map(k=>({id:'y'+k.replace(/[^0-9a-z]/gi,'').toLowerCase(),year:k,events:Y[k]}));
fs.writeFileSync('timeline-2026-11-10c.js','const YEARS='+JSON.stringify(years,null,0)+';\n');
console.log(years.length, years.map(y=>y.year+':'+y.events.length).join(' '));
