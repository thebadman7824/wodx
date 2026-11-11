"""Deconflict the approved era timelines (Ben approved all 291 cards of run 2026-11-10t1 on 2026-11-11).
Reads desk-data-2026-11-10t1.json, applies the rulings below, writes timeline-approved-2026-11-11.json.
Each ruling: drop (the card cannot stand beside another), edit (year or text changed so both can stand), or note.
Precedence: 20th-anniversary books (V20, M20, Wr20, C20, W20) over Revised, Revised over 2nd edition."""
import json, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
R = {
 'en-succ-club-0': ('drop', None, None, 'The Succubus Club opening: Succubus Club (Revised) says 1982, V20 Companion p. 68 says the first club opened in the early 1990s. V20 stands.'),
 'en-succ-club-2': ('drop', None, None, 'Same clash as en-succ-club-0: the 23 May 1982 opening gives way to V20 Companion.'),
 'en-v20c-succubus-club-0': ('edit', 1991, None, 'Kept as the club\'s opening; placed at 1991 so it comes before the 1993 Lupine attack on it.'),
 'en-v20c-lodins-boardroom-0': ('edit', 1993, "In 1993 Prince Lodin called a Blood Hunt on the werewolves and died in the Lupine rampage, along with half the city's Kindred.",
     'Lodin\'s death: V20 Companion says the mid-1990s and half the city\'s Kindred; Chicago by Night (2nd) dates the attack to 1993 and its entry says a third. The year 1993 fits both; the toll follows V20.'),
 'en-m2stc-modern-history-4': ('edit', None, 'A spacecraft crashed near Roswell in 1947, hidden by the Void Engineers and New World Order.',
     'Iteration X\'s name: Mage Storyteller\'s Companion (2nd) says the end of the 1950s, Convention Book: Iteration X (Revised) says 1897, and M20 counts Iteration X from about 1900. 1897 stands; the 1950s clause is cut.'),
 'en-m2osg-darkling-past-1': ('edit', 1850, 'As the Order of Reason began turning into the Technocratic Union in the mid-1800s, several were caught in the fighting, and the survivors passed on a warning to stay out of wizards\' affairs.',
     'The Technocracy\'s birth: Book of Shadows (2nd) says the Order of Reason became the Technocratic Union in the mid-1800s; M20 p. 27 says the Order of Reason lasted until 1897. Read as a change begun in the mid-1800s and finished in 1897; the card also moves from 1800 to 1850.'),
 'en-m2fp-founding-timeline-0': ('edit', None, 'The Craftmasons destroyed Mistridge in the winter of 1210, and the Convention of the White Tower met on 25 March 1325.',
    'Start of the Ascension War: The Fragile Path (2nd) counts it from 1330, while Sorcerers Crusade (Revised) and the NPC rivalry rules open it at Mistridge in 1210. 1210 stands; the 1330 clause is cut.'),
 'en-cbn2-lupine-war-0': ('note', None, None, 'Kept: the 1993 attack on the Succubus Club. Lodin\'s death and the toll are on en-v20c-lodins-boardroom-0.'),
 'en-whier-anacreon-revolts-0': ('note', None, None, 'Kept: the 1931 resignation comes before Charon is lost in 1945 (ev-fifth-great-maelstrom); the Necropoli drift away after that. The Encyclopaedia date now says so.'),
 'en-wr20bo-bhuvar-0': ('note', None, None, 'The tsunami of December 2004 falls after the Time of Judgment year. It stands only when the Storyteller skips the Time of Judgment endings, like every classic event after 2004.'),
 'ev-technocracy': ('note', None, None, 'Kept at 1897 (M20 p. 27), the date the other Mage cards are fitted to.'),
 'ev-camarilla': ('note', None, None, 'Kept at 1435 (V20 Lore of the Clans). A Guide to the Anarchs counts the Camarilla from 1486, the first Conclave (ev-first-conclave); V20 reads 1435 as the founding and 1486 as the first Conclave, so both cards stand.'),
}
d = json.load(open('desk-data-2026-11-10t1.json'))
lo = {e['id']: int(e['span'].split()[0]) for e in d}
def era_of(y): return max((k for k in lo if lo[k] <= y), key=lambda k: lo[k])
out, n = [], {'kept': 0, 'edit': 0, 'drop': 0}
moved = []
for era in d:
    items = []
    for i in era['items']:
        r = R.get(i['id'])
        i = dict(i, verdict='ok')
        if r:
            act, year, text, note = r
            i['ruling'] = {'action': act, 'note': note}
            if act == 'drop': n['drop'] += 1; continue
            if act == 'edit':
                n['edit'] += 1
                if year: i['year'] = year
                if text: i['text'] = text
                if i['id'] == 'en-m2stc-modern-history-4': i['also'] = []
            else: n['kept'] += 1
        else: n['kept'] += 1
        if era_of(i['year']) != era['id']: i['era'] = era_of(i['year']); moved.append(i); continue
        items.append(i)
    out.append(dict(era, items=items))
for i in moved: next(e for e in out if e['id'] == i['era'])['items'].append(i)
for e in out: e['items'].sort(key=lambda x: x['year'])
json.dump(out, open('timeline-approved-2026-11-11.json', 'w'), ensure_ascii=False, indent=1)
print(n, sum(len(e['items']) for e in out))
