// Builds the 2026-2098 timeline from the kept round 3 scenarios (run e) and the clash verdicts (run g, all OK).
const fs=require('fs');
eval(fs.readFileSync('future-desk-2026-11-10e.js','utf8').replace('const SCEN','globalThis.SCEN'));
const DROP=new Set(['c3','m2','mu3']);
const REGION={v1:'Free States, Night City, Japan',v2:'Catholic Europe',v3:'US dead zones, Central America',w1:'Pacific Northwest and Amazon preserves',w2:'Night City, Tokyo, Neo-Kowloon, Hamburg',w3:'Midwest dead zones, Mideast glass, Siberia',m1:'Free States and Night City',h1:'Free States',h2:'Catholic Europe',h3:'Night City'};
// [id, year] -> new text (joins y01-y19)
const O={
'v1|2034':'Biotechnica\'s blood division sells bottled donor blood under licence (y14). In the registry states, feeding from the vein without a contract becomes a crime with a stake as the sentence.',
'v1|2048':'Registered Kindred work night shifts in security, the Net and the orbital docks of the Free States and Japan. A generation is Embraced by contract, owned by a corp before it wakes.',
'v2|2026':'The first purge laws pass in Italy, Spain and Poland. Thermographic gates on every transit hub; anyone without body heat is shot.',
'v2|2045':'Kindred driven out of Catholic Europe hold the outer rim of the Mideast glass, where no drone flies. Sabbat packs raid the cities for blood like a border war (y03).',
'v2|2066':'A ceasefire of sorts: the corps buy peace from the elders the crusade could not reach, in exchange for what the old blood knows. The young call it a betrayal worse than the purge (y12).',
'v3|2028':'Embrace cults on Network 54 sell immortality in the old US dead zones and Central America, where no sect holds power. The Children of Carthage\'s donor model spreads there, and so do sires who cannot control what they make.',
'v3|2080':'The eldest Methuselahs strike the regions where thin-bloods are thickest. The feeds carry it worldwide, and every Kindred alive sees the signs (y17).',
'w1|2027':'The Children of Gaia and Glass Walkers sign the first preserve contracts with Biotechnica in the Pacific Northwest and the Amazon. The caerns inside become corporate parks.',
'w1|2055':'A Pentex front buys Biotechnica\'s preserve division outright (y14).',
'w2|2030':'Glass Walkers report the Gauntlet in Night City, Tokyo, Neo-Kowloon and Hamburg is now 9 or higher. Stepping sideways is nearly impossible indoors.',
'w2|2044':'The Net\'s Penumbra, its Weaver side, grows into the largest Weaver realm ever seen, and Net Spiders hunt Garou who enter it (y04).',
'w3|2029':'The Wendigo, Red Talons and Silent Striders lead the exodus. Septs form in the Midwest dead zones, the Siberian taiga and the middle ring of the Mideast glass (y03).',
'w3|2087':'The Wyrm\'s hordes start coming out of the deep glass at the Meltdown\'s heart, where the Earthbound also sleep (y03).',
'm1|2028':'Polls in the Free States and Night City show a third of people believe in magic. There, and only there, small vulgar effects stop drawing Paradox in crowds who saw the 2025 leaks (y08).',
'm1|2041':'The Technocracy brands magic as hidden tech, sold under licence. Iteration X and the Syndicate sell spellware as coincidental gadgets; the buyers are Sleepers and take no Paradox, which stays with the makers (y07).',
'm3|2027':'After the 2025 dump, Virtual Adepts rebuild the Digital Web in the Net\'s Horizon, one of its three sides. Datamancy works better there than anywhere (y04).',
'm3|2043':'The AI\'s Weaver vessel trades with the Adepts for the Horizon\'s code. Each side thinks it has a private deal (y05).',
'wr1|2057':'Shroud ratings in the megacities fall by a point, never below 4. The Tempest drives the dead toward the thinning city walls, and Spectres come through with the grief (y09).',
'wr1|2081':'The Hierarchy\'s legions break everywhere but the Rhineland. The dead govern themselves in a hundred Necropoli (y10).',
'wr2|2045':'Necropoli rise in the Net\'s dead data, its Shroud side, where deleted files rot (y04).',
'wr2|2086':'The bound wraith inside the AI offers the dead a home there, and some accept (y05).',
'wr3|2044':'The Dark Kingdom of Iron\'s heirs fortify the Shadowlands of the Rhineland and Rothenstein, the failing Hierarchy\'s last fortress (y10).',
'c1|2030':'Nocker optics are banned after the fae begin to fade under them. Too late: their Banality has done its work. Magic sold as a licensed product feeds Banality, not Glamour (y06).',
'c2|2083':'The corps notice the dream market and bottle it. Banality comes with every contract, and the last place the Dreaming was growing starts to shrink (y06).',
'h1|2036':'Corps hire imbued teams for site security, in the Americas and the Asian arcologies alike. Militech security trains alongside them, and the Society of Leopold sends advisers (y19).',
'h2|2028':'The Society of Leopold recruits openly in every parish and becomes the purge\'s army (y12). Its paramilitaries carry blessed rounds and thermographic optics.',
'h3|2044':'Merciful imbued broker the Night City Accord, the local form of the Hunter Act: registered Kindred sign it as a condition of their contracts, Garou keep out of the arcologies, hunters keep the peace (y02).',
'd1|2038':'A Fallen of the Second House is elected to lead a Free State outside the Hunter Act states. Its first acts are to outlaw exorcism and repeal the Act inside its borders, making it a haven and a standing flashpoint (y13).',
'd2|2041':'Followers ask the Sorter for help and get it. Every answered prayer feeds the Fallen inside the AI with Faith through linked systems (y05).',
'd3|2068':'The Earthbound strike. The Reconcilers\' clinics, which refused to join the rebirth chase, burn on one night across four cities (y18).',
'mu2|2026':'Biotechnica\'s rebirth program, answering to whoever pays, starts a crash effort to copy the Cairo rebirth from the 2025 footage (y14).',
'k1|2042':'The Courts rebuild openly inside the arcologies, with corp sponsors and mortal staff, moving in for the last of the nests\' chi though the Weaver\'s grip is starving them (y15).',
'k2|2030':'The Tokyo arcology nest is down to 1 chi after twelve years tapped, too little to sustain a Court, and is abandoned (y16).',
'k3|2044':'Mortal students learn to feel chi, and Visionary imbued study beside them. A few say they see the dead (y19).',
'o1|2083':'The Free States that suffered Spectre ride-backs ban projection. The trade goes underground (y11).',
'o2|2045':'One Free State recognises ghosts as legal persons and keeps projection legal, becoming the capital of death tourism (y11).',
'o2|2089':'The firm collapses when the last state that tolerated it turns on it after a Spectral attack on its own projectors (y11).',
};
// Ben's date moves, run h (2026-11-10 16:54Z)
let MOVE={'d3|2068':'2079','d1|2079':'2068'};
const EXTRA=[
['2027','Hunter · Night City','The registry, the Hunter Act and its deputies share one city: deputies police unregistered Kindred (y02).'],
['2039','Hunter · Lyon','The burning of a changeling freehold in Lyon splits the imbued; the Merciful walk out of the crusade (y12).'],
['2047','Demon · Mummy','The Alexandria school and the Reconcilers become uneasy allies, both working to undo the harm of the 2025 flood (y18).'],
];

// Last check (run i) verdicts, 2026-11-10 17:03Z: z01-z05, z07, z08 OK; z06 fixed by Ben to 2059.
Object.assign(O,{
'mu2|2039':'The first copies walk out of the labs: bodies that come back breathing with no mind, no memory and no Ba. Biotechnica sells them quietly as organ stock and soldiers (z01).',
'mu2|2057':'The corps start hunting true mummies for their Ba. Mummies hide their rebirths where no scanner reaches, deep in the glass and in tombs below the arcologies (z01).',
'mu2|2083':'The first copy that keeps its mind: a corp brings its executives back with Ba stolen from captured mummies. They return as themselves, without Ma\'at (z01).',
'h1|2027':'The Free States pass a Hunter Act. Registered imbued get powers of arrest over any unregistered being without a heartbeat, and a bounty schedule by creature. Registered Kindred answer to their corps; Fallen, changelings and mummies have heartbeats and fall outside the Act (z02).',
'k1|2042':'Japan\'s registry covers the Kuei-jin too, so registered Courts can sign contracts. They rebuild openly inside the arcologies with corp sponsors and mortal staff, moving in for the last of the nests\' chi though the Weaver\'s grip is starving them (y15, z03). Unregistered Kuei-jin stay in the night markets of Hong Kong and Taipei.',
'h3|2044':'Merciful imbued broker the Night City Accord, the local form of the Hunter Act: registered Kindred sign it as a condition of their contracts, Garou packs keep out of the arcologies (Garou under corp contract excepted), hunters keep the peace (y02, z04).',
'h3|2063':'The Accord spreads to a dozen cities in the Free States, Japan and the Pacific Rim, never into the crusade\'s Europe. Visionaries study why the Messengers chose them, and some find answers in old Arcanum files on Kelvin (z04).',
'w2|2085':'Glass Walkers working arcology security under corp contract find wild spirits trapped in the arcology walls, still alive, still calling. The find feeds the distrust that breaks the Accord a year later (z04).',
'o3|2070':'The dead start coming back into bodies by themselves: driven out by the Tempest and through the projectors\' holes, those whose bodies still lie in suspension or a morgue drawer go back to their own, and the rest take whoever is nearest. They are possessions, not rebirths; only mummies return whole (z05).',
'm3|2084':'The Nephandi find the Net soon after the first Awakenings there. Code that should not compile begins to run, and some of the newly Awakened are drawn to it. The Adepts blame the AI\'s Weaver side; the AI blames the Adepts (z06).',
'c1|2098':'By 2098 the Dreaming is almost gone from the waking world, kept by a few oathcircles in the wastes, and those fae who remain feel the Endless Winter closing (z07).',
'c2|2098':'By 2098 what is left of the Dreaming lives mostly in the Net, in the last large freeholds among the dream market\'s ruins, and no one knows if they will survive (z07).',
'w1|2098':'By 2098 the Garou are split between those inside the system and those who burned their contracts, and in the preserves the Wyrm\'s servants hold more caerns than Gaia\'s (z08).',
'm1|2098':'By 2098 the Free States and Night City are one push away from belief in magic or belief in machines, and both the Traditions and the Union mean to use them to push the rest of the world (z08).',
});
MOVE['m3|2084']='2059';
const TAGO={'h1|2036':'Hunter · Free States, Pacific Rim'};
const ev=[];
for(const s of SCEN){ if(DROP.has(s.id)) continue;
 const tag=s.line+(REGION[s.id]?' · '+REGION[s.id]:'');
 for(const [y,t] of s.beats){ const k=s.id+'|'+y; ev.push([MOVE[k]||y,TAGO[k]||tag,(O[k]||t)+' ('+s.id+')']); delete O[k]; }
 {const k=s.id+'|2098';ev.push(['2098',tag,(O[k]||s.fall)+' ('+s.id+')']);delete O[k];}
}
if(Object.keys(O).length) throw new Error('unused overrides '+Object.keys(O));
for(const e of EXTRA) ev.push(e);
const by={}; for(const e of ev){(by[e[0]]=by[e[0]]||[]).push([e[1],e[2]]);}
const YEARS=Object.keys(by).sort().map(y=>({id:'y'+y,year:y==='2098'?'2098: the eve of judgement':y,events:by[y]}));
fs.writeFileSync('years.js','const YEARS='+JSON.stringify(YEARS,null,0).replace(/\},\{/g,'},\n{')+';\n');
console.log(YEARS.length,'years',ev.length,'events');
