/**
 * WoDX Paperdoll: extra features for the talking faces, by line and kind (drafts for Ben's face-feature desk, 13 November
 * 2026). Each feature is drawn in one or more stages of a face: tone (colours before drawing), back (behind the head),
 * skin (on the skin, under the eyes and hair), face (after the features, under the hair), ears (over the hair, joined to
 * the head's outline; skipped under a hood or veil) and top (over everything,
 * before wounds). A face lists its features in S.features.
 */
import {FEATURES, H} from "./face64-rules.mjs";
import "./face64-general.mjs";

const {mix, same, glow, stamp, horn, inTri, headHw, CX, EYE_Y, MOUTH_Y} = H;
const EYES = [[26, -1], [38, 1]];
const isSkin = (F, x, y) => F.kindAt(x, y) === "skin";
const paint = (F, x, y, c) => { if ( isSkin(F, x, y) ) F.put(x, y, c); };
const tint = (F, x, y, c, a) => { if ( isSkin(F, x, y) ) F.put(x, y, mix(F.get(x, y), c, a)); };
const area = (F, cx, cy, rx, ry, fn) => { for ( let dx = -rx; dx <= rx; dx++ ) for ( let dy = -ry; dy <= ry; dy++ ) if ( (dx / (rx + 0.5)) ** 2 + (dy / (ry + 0.5)) ** 2 <= 1 ) fn(cx + dx, cy + dy, dx, dy); };
const pupilSlit = (F, c, iris) => { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) { F.put(ex - 1, EYE_Y, iris); F.put(ex, EYE_Y, [10, 8, 10]); F.put(ex + 1, EYE_Y, mix(iris, [0, 0, 0], 0.3)); F.put(ex, EYE_Y - 1, mix(iris, [0, 0, 0], 0.5)); } };
const eyeColour = (F, c, col, {whites = null} = {}) => {
  if ( c.eyes !== "open" ) return;
  for ( const [ex] of EYES ) {
    if ( whites ) for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, EYE_Y, whites);
    F.put(ex - 1, EYE_Y, mix(col, [255, 255, 255], 0.3)); F.put(ex, EYE_Y, mix(col, [0, 0, 0], 0.55)); F.put(ex + 1, EYE_Y, col);
  }
};
const earPoint = (c, len = 3, tuft = null) => {   // a pointed ear from the side of the head at eye height, rising outward
  const {F, R, shape} = c, hw = y => Math.round(headHw(y, shape));
  for ( const sd of [-1, 1] ) {
    const a = [CX + sd * (hw(29) - 1), 29], b = [CX + sd * (hw(39) - 1), 39], low = [CX + sd * (hw(37) + 2), 37];
    const tip = [CX + sd * (hw(31) + 2 + Math.round(len * 0.8)), 30 - len];
    const ear = (x, y) => inTri([a, tip, low], x, y) || inTri([a, low, b], x, y);
    for ( let y = 8; y < 42; y++ ) for ( let x = 0; x < 64; x++ ) {
      if ( !ear(x, y) || isSkin(F, x, y) ) continue;
      const inner = Math.abs(x - CX) > hw(y) + 1 && y > tip[1] + 2 && y < low[1] - 1 && ear(x + sd, y) && ear(x - sd, y);
      F.put(x, y, inner ? R.s2 : sd < 0 ? R.b : R.s1, "ear");
    }
    if ( tuft ) { F.put(tip[0], tip[1] - 1, tuft, "hair"); F.put(tip[0] - sd, tip[1] - 1, tuft, "hair"); }
  }
};
const seat = (c, rx, ry, w) => {   // a swelling of skin where a horn breaks through the brow, parting the hair
  const {F, R} = c;
  for ( let dy = -1; dy <= 2; dy++ ) { const half = Math.round(w / 2) + 1 + dy; for ( let x = rx - half; x <= rx + half; x++ ) {
    if ( F.kindAt(x, ry + dy) !== "hair" ) continue;
    F.put(x, ry + dy, dy < 1 ? R.hi : x < rx ? R.b : R.s1, "skin");
  } }
  for ( let dy = -2; dy <= 3; dy++ ) for ( let x = rx - w - 4; x <= rx + w + 4; x++ ) {
    if ( !isSkin(F, x, ry + dy) || ry + dy > 22 ) continue;
    if ( [[1, 0], [-1, 0], [0, -1]].some(([dx, dd]) => F.kindAt(x + dx, ry + dy + dd) === "hair") ) F.put(x, ry + dy, R.ol);
  }
};
const hornPair = (c, M, dx, ry, L, w, lean) => { for ( const sd of [-1, 1] ) { seat(c, CX + sd * dx, ry, w); horn(c.F, M, CX + sd * dx, ry, sd, L, w, lean); } };
const scales = (F, R, x0, y0, w, h) => { for ( let x = x0; x < x0 + w; x++ ) for ( let y = y0; y < y0 + h; y++ ) if ( (x + y * 2) % 3 === 0 ) tint(F, x, y, mix(R.s1, [40, 90, 60], 0.3), 0.6); };
const veins = (F, cx, cy, col, n = 5, dir = 1) => { for ( let i = 0; i < n; i++ ) paint(F, cx + dir * Math.round(Math.sin(i * 1.3)), cy + i, col); };
const crack = (F, x, y, n, col, sd = 1) => { for ( let i = 0; i < n; i++ ) paint(F, x + sd * Math.floor(i / 2) * (i % 4 === 3 ? -1 : 1), y + i, col); };
const BLACK = [14, 10, 14];

const def = (id, line, group, label, stages) => { FEATURES[id] = {id, line, group, label, ...stages}; };

/* ---------------- Kindred ---------------- */
def("v-bloodtears", "kindred", "all", "Tears of blood", {state: "tears", top(c) { const {F} = c; for ( const [ex] of EYES ) for ( let i = 0; i < 6; i++ ) paint(F, ex - 1 + (i > 3 ? 1 : 0), EYE_Y + 2 + i, i < 5 ? [140, 16, 22] : [96, 10, 16]); }});
def("v-beast-eyes", "kindred", "all", "The Beast in the eyes", {state: "frenzy", top(c) { if ( c.eyes === "shut" ) return; for ( const [ex] of EYES ) { glow(c.F, ex, EYE_Y, [230, 30, 30], 3, 0.32); c.F.put(ex - 1, EYE_Y, [255, 70, 50]); c.F.put(ex + 1, EYE_Y, [200, 20, 20]); } }});
def("v-age-veins", "kindred", "all", "Blue veins of great age", {skin(c) { for ( const sd of [-1, 1] ) { veins(c.F, CX + sd * 11, 20, mix(c.R.s2, [40, 50, 130], 0.6), 8, sd); veins(c.F, CX + sd * 6, 38, mix(c.R.s2, [40, 50, 130], 0.5), 5, -sd); } }});
def("v-gangrel-eyes", "kindred", "Gangrel", "Beast's eyes (slit pupils)", {top(c) { pupilSlit(c.F, c, [214, 160, 40]); }});
def("v-gangrel-ears", "kindred", "Gangrel", "Pointed, tufted ears", {ears(c) { earPoint(c, 4, c.H.b); }});
def("v-gangrel-fur", "kindred", "Gangrel", "Fur on the cheeks", {face(c) { for ( const sd of [-1, 1] ) for ( let y = 34; y < 46; y++ ) { const hw = Math.round(headHw(y, c.shape)); for ( let k = 1; k < 4; k++ ) if ( (y + k) % 2 === 0 ) paint(c.F, CX + sd * (hw - k), y, k === 1 ? c.H.s1 : c.H.b); } }});
def("v-gangrel-snout", "kindred", "Gangrel", "A beast's nose", {face(c) { const {F} = c; for ( let x = CX - 2; x <= CX + 2; x++ ) { F.put(x, 39, [40, 28, 30]); F.put(x, 40, [26, 18, 20]); } F.put(CX, 41, c.R.s2); F.put(CX - 1, 39, [90, 70, 70]); }});
def("v-tzimisce-spurs", "kindred", "Tzimisce", "Bone spurs on brow and cheekbones", {top(c) { const bone = [232, 222, 196], ol = [70, 56, 50]; for ( const sd of [-1, 1] ) { for ( const [x, y] of [[CX + sd * 11, 30], [CX + sd * 12, 36], [CX + sd * 8, 23]] ) stamp(c.F, [[x, y, bone], [x + sd, y - 1, mix(bone, [255, 255, 255], 0.4)]], ol); } }});
def("v-tzimisce-carved", "kindred", "Tzimisce", "Flesh carved in patterns", {skin(c) { for ( const sd of [-1, 1] ) for ( let i = 0; i < 8; i++ ) { paint(c.F, CX + sd * (3 + i), 20 + Math.round(Math.abs(Math.sin(i / 1.5)) * 3), c.R.s2); paint(c.F, CX + sd * (9 + Math.floor(i / 3)), 36 + i, c.R.s2); } }});
def("v-salubri-eye", "kindred", "Salubri", "The third eye", {top(c) { const {F, R} = c, y = 20; for ( let dy = -3; dy <= 3; dy++ ) { const w = 2 - Math.abs(dy) * 0.6; for ( let dx = -Math.round(w); dx <= Math.round(w); dx++ ) F.put(CX + dx, y + dy, Math.abs(dy) === 3 || Math.abs(dx) === Math.round(w) ? R.ol : [236, 230, 220]); } F.put(CX, y - 1, [170, 140, 60]); F.put(CX, y, [10, 8, 12]); F.put(CX, y + 1, [170, 140, 60]); }});
def("v-assamite-dark", "kindred", "Assamite", "Skin darkened with age", {tone(S) { S.skin = mix(S.skin, [40, 30, 34], 0.72); }});
def("v-cappadocian", "kindred", "Cappadocian", "Ashen, corpse-like face", {tone(S) { const g = Math.round((S.skin[0] + S.skin[1] + S.skin[2]) / 3); S.skin = mix([g, g, g], [168, 170, 160], 0.6); S.cool = true; S.sunk = true; }, skin(c) { for ( const sd of [-1, 1] ) for ( let y = 37; y < 46; y++ ) paint(c.F, CX + sd * (9 - Math.floor((y - 37) / 4)), y, c.R.s2); }});
def("v-samedi", "kindred", "Samedi", "Rotting flesh, bared teeth in the cheek", {tone(S) { S.skin = mix(S.skin, [120, 128, 96], 0.55); S.cool = true; }, top(c) { const {F, r} = c, sd = r.pick([-1, 1]); area(F, CX + sd * 8, 42, 2, 1, (x, y) => paint(F, x, y, [40, 14, 18])); for ( const dx of [-1, 0, 1] ) F.put(CX + sd * 8 + dx, 42, [220, 210, 180]); area(F, CX - sd * 6, 22, 3, 2, (x, y) => tint(F, x, y, [70, 90, 50], 0.45)); area(F, CX + sd * 5, 50, 2, 1, (x, y) => tint(F, x, y, [60, 70, 40], 0.5)); }});
def("v-harbinger", "kindred", "Harbingers of Skulls", "A skull's face", {tone(S) { S.skin = mix(S.skin, [214, 206, 186], 0.7); S.sunk = true; }, top(c) { const {F} = c; for ( const [ex] of EYES ) area(F, ex, EYE_Y, 3, 2, (x, y, dx, dy) => { if ( !(dy === 0 && Math.abs(dx) <= 1) || c.eyes !== "open" ) paint(F, x, y, BLACK); }); for ( const x of [CX - 1, CX + 1] ) { F.put(x, 39, BLACK); F.put(x, 40, BLACK); } }});
def("v-gargoyle", "kindred", "Gargoyle", "Stone skin, cracked, with horns", {tone(S) { S.skin = [128, 126, 120]; S.cool = true; }, top(c) { const {F, R} = c; crack(F, CX - 9, 20, 7, R.ol); crack(F, CX + 7, 38, 6, R.ol, -1); const M = {hi: [150, 146, 140], b: [110, 106, 100], s1: [80, 78, 74], s2: [60, 58, 56], ol: [30, 30, 30]}; hornPair(c, M, 9, 18, 7, 3, 2.4); }});
def("v-setite-eyes", "kindred", "Followers of Set", "Serpent eyes and scales at the temples", {top(c) { pupilSlit(c.F, c, [190, 200, 60]); for ( const sd of [-1, 1] ) scales(c.F, c.R, sd < 0 ? CX - 14 : CX + 9, 24, 6, 14); }});
def("v-shadow", "kindred", "Lasombra", "Shadow clinging about the head", {back(c) { const {F, r, S} = c; for ( let i = 0; i < 9; i++ ) { const a0 = Math.PI * (0.9 + i * 0.15) + (r.next() - 0.5) * 0.2, bend = (r.next() - 0.5) * 0.06; for ( let d = 15; d < 29; d += 0.5 ) { const a = a0 + bend * (d - 15), x = Math.round(CX + Math.cos(a) * d), y = Math.round(31 + Math.sin(a) * d); if ( F.has(x, y) ) continue; F.put(x, y, mix([6, 4, 10], S.bg, Math.min(0.85, (d - 15) / 15))); F.put(x + 1, y, mix([6, 4, 10], S.bg, Math.min(0.9, (d - 13) / 15))); } } }});
def("v-nos-growths", "nosferatu", "Nosferatu", "Growths and warts", {top(c) { const {F, R, r} = c; for ( let i = 0; i < 5; i++ ) { const x = CX + Math.round((r.next() - 0.5) * 22), y = 18 + Math.round(r.next() * 28); if ( !isSkin(F, x, y) || Math.abs(y - EYE_Y) < 2 ) continue; area(F, x, y, 1, 1, (a, b) => paint(F, a, b, R.s1)); F.put(x - 1, y - 1, R.hi); F.put(x + 1, y + 1, R.s2); } }});
def("v-nos-milky", "nosferatu", "Nosferatu", "One milky eye", {top(c) { if ( c.eyes !== "open" ) return; const ex = c.r.pick([26, 38]); for ( const dx of [-1, 0, 1] ) c.F.put(ex + dx, EYE_Y, [214, 214, 206]); }});
def("v-nos-mottle", "nosferatu", "Nosferatu", "Mottled, blotched skin", {skin(c) { const {F, R, r} = c; for ( let i = 0; i < 9; i++ ) area(F, CX + Math.round((r.next() - 0.5) * 24), 16 + Math.round(r.next() * 34), 2, 1, (x, y) => tint(F, x, y, [96, 70, 110], 0.3)); void R; }});
def("v-nos-suture", "nosferatu", "Nosferatu", "A stitched seam across the scalp", {top(c) { const {F, R} = c; for ( let i = 0; i < 18; i++ ) { const x = CX - 9 + i, y = 15 + Math.round(Math.sin(i / 3) * 1.5); paint(F, x, y, R.ol); if ( i % 3 === 0 ) { paint(F, x, y - 1, R.s2); paint(F, x, y + 1, R.s2); } } }});
def("v-nos-snout", "nosferatu", "Nosferatu", "An upturned snout", {face(c) { const {F, R} = c; area(F, CX, 39, 3, 2, (x, y) => paint(F, x, y, R.s1)); F.put(CX - 1, 39, BLACK); F.put(CX + 1, 39, BLACK); F.put(CX - 1, 37, R.hi); }});
def("v-nos-rat-teeth", "nosferatu", "Nosferatu", "Rat's front teeth", {top(c) { if ( H.OPEN_MOUTHS.has(c.mouthKind) ) return; const {F, R} = c; for ( const x of [CX - 1, CX] ) { F.put(x, MOUTH_Y, [232, 220, 170]); F.put(x, MOUTH_Y + 1, [214, 196, 140]); } F.put(CX - 2, MOUTH_Y + 1, R.ol); F.put(CX + 1, MOUTH_Y + 1, R.ol); }});
def("v-nos-split", "nosferatu", "Nosferatu", "A mouth split up the cheek", {top(c) { const {F} = c, sd = c.r.pick([-1, 1]); for ( let i = 0; i < 7; i++ ) F.put(CX + sd * (4 + i), MOUTH_Y - Math.floor(i / 2), [30, 8, 14]); for ( let i = 1; i < 6; i += 2 ) F.put(CX + sd * (4 + i), MOUTH_Y - Math.floor(i / 2) + 1, [216, 204, 160]); }});

/* ---------------- Garou ---------------- */
def("w-rage-eyes", "werewolf", "all", "Rage in the eyes", {state: "frenzy", top(c) { if ( c.eyes === "shut" ) return; for ( const [ex] of EYES ) { glow(c.F, ex, EYE_Y, [255, 190, 40], 3, 0.34); c.F.put(ex, EYE_Y, [40, 20, 0]); } }});
def("w-glabro", "werewolf", "all", "Glabro: heavy brow, hair and teeth", {state: "glabro", face(c) { const {F, H: Hc, R} = c; for ( const [ex] of EYES ) for ( let dx = -4; dx <= 4; dx++ ) paint(F, ex + dx, 29, R.s2); for ( const sd of [-1, 1] ) for ( let y = 33; y < 50; y++ ) { const hw = Math.round(headHw(y, c.shape)); for ( let k = 1; k < 4; k++ ) if ( (y + k) % 2 ) paint(F, CX + sd * (hw - k), y, Hc.s1); } }, top(c) { if ( H.OPEN_MOUTHS.has(c.mouthKind) ) return; for ( const x of [CX - 3, CX + 3] ) { c.F.put(x, MOUTH_Y + 1, [240, 232, 210]); c.F.put(x, MOUTH_Y + 2, [210, 200, 180]); } }});
def("w-metis-cleft", "werewolf", "Metis", "Cleft lip", {top(c) { const {F, R} = c; for ( let y = MOUTH_Y - 4; y <= MOUTH_Y + 1; y++ ) F.put(CX + 1, y, y < MOUTH_Y ? R.s2 : [44, 14, 22]); F.put(CX + 2, MOUTH_Y - 1, R.ol); }});
def("w-metis-oneeye", "werewolf", "Metis", "One eye sealed shut", {top(c) { const {F, R} = c, ex = c.r.pick([26, 38]); area(F, ex, EYE_Y, 3, 1, (x, y) => F.put(x, y, R.s1)); for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, EYE_Y, R.s2); }});
def("w-metis-horns", "werewolf", "Metis", "Small horns", {top(c) { const M = {hi: [200, 186, 160], b: [150, 132, 110], s1: [110, 92, 76], s2: [80, 64, 56], ol: [40, 28, 26]}; hornPair(c, M, 7, 17, 6, 3, 1.8); }});
def("w-metis-fur", "werewolf", "Metis", "Patches of fur on the face", {skin(c) { const {F, H: Hc, r} = c; for ( let i = 0; i < 3; i++ ) area(F, CX + Math.round((r.next() - 0.5) * 18), 22 + Math.round(r.next() * 24), 2, 2, (x, y) => { if ( (x + y) % 2 === 0 && Math.abs(y - EYE_Y) > 1 ) paint(F, x, y, Hc.b); }); }});
def("w-metis-teeth", "werewolf", "Metis", "Crooked teeth over the lip", {top(c) { if ( H.OPEN_MOUTHS.has(c.mouthKind) ) return; for ( const [x, n] of [[CX - 2, 2], [CX + 1, 1], [CX + 3, 2]] ) for ( let k = 1; k <= n; k++ ) c.F.put(x, MOUTH_Y + k, [230, 220, 190]); }});
def("w-tattoo", "werewolf", "Tribes", "Tribal tattoo on the face", {skin(c) { const {F, r} = c, col = r.pick([[40, 60, 110], [30, 30, 40], [110, 40, 30]]), sd = r.pick([-1, 1]); for ( let i = 0; i < 12; i++ ) { const a = i / 2; paint(F, CX + sd * (8 + Math.round(Math.cos(a) * (1 + i / 4))), 34 + Math.round(Math.sin(a) * (1 + i / 4)), col); } for ( let y = 37; y < 46; y += 2 ) paint(F, CX + sd * 7, y, col); }});
def("w-warpaint", "werewolf", "Tribes", "War paint", {skin(c) { const col = c.r.pick([[50, 80, 160], [160, 40, 30], [220, 220, 210]]); for ( const sd of [-1, 1] ) for ( let k = 0; k < 3; k++ ) for ( let i = 0; i < 6; i++ ) paint(c.F, CX + sd * (6 + i), 36 + k * 2, col); }});
def("w-glyph-scar", "werewolf", "Rank", "A pictogram scarred into the cheek", {top(c) { const {F, R} = c, sd = c.r.pick([-1, 1]), pale = mix(R.hi, [240, 200, 190], 0.5); for ( const [dx, dy] of [[0, 0], [0, 1], [0, 2], [0, 3], [-1, 1], [1, 1], [-1, 3], [1, 3]] ) paint(F, CX + sd * 10 + dx, 36 + dy, pale); }});
def("w-wyrm-taint", "werewolf", "Fomori", "Wyrm-taint: black veins and sickly eyes", {skin(c) { for ( const [x, y, d] of [[CX - 10, 34, -1], [CX + 9, 34, 1], [CX - 4, 18, 1]] ) veins(c.F, x, y, [30, 34, 24], 8, d); }, top(c) { eyeColour(c.F, c, [150, 170, 40], {whites: [210, 200, 120]}); }});

/* ---------------- Mages ---------------- */
def("m-paradox-blind", "mage", "Paradox", "Eyes gone milky white", {state: "paradox", top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) for ( const dx of [-1, 0, 1] ) c.F.put(ex + dx, EYE_Y, [226, 230, 232]); }});
def("m-paradox-burn", "mage", "Paradox", "A sigil burned into the skin", {top(c) { const {F} = c, col = [120, 30, 30], hot = [220, 120, 60], sd = c.r.pick([-1, 1]), x0 = CX + sd * 9; for ( const [dx, dy] of [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4], [-1, 3], [-2, 2], [-1, 1]] ) paint(F, x0 + dx, 37 + dy, col); paint(F, x0, 39, hot); }});
def("m-paradox-cracks", "mage", "Paradox", "Glowing cracks in the skin", {top(c) { const g = c.S.glowc ?? [160, 200, 255]; crack(c.F, CX - 8, 36, 8, g); crack(c.F, CX + 6, 18, 6, g, -1); }});
def("m-verbena-tattoo", "mage", "Verbena", "Woad and vine tattoos", {skin(c) { const col = [40, 90, 120]; for ( const sd of [-1, 1] ) for ( let i = 0; i < 9; i++ ) { paint(c.F, CX + sd * (12 - Math.floor(i / 3)), 33 + i, col); if ( i % 3 === 1 ) paint(c.F, CX + sd * (11 - Math.floor(i / 3)), 33 + i, mix(col, [80, 160, 90], 0.6)); } }});
def("m-dream-paint", "mage", "Dreamspeakers", "Face paint", {skin(c) { const a = [210, 200, 186], b = [170, 70, 40]; for ( let x = CX - 12; x <= CX + 12; x++ ) { paint(c.F, x, 37, a); if ( Math.abs(x - CX) > 3 ) paint(c.F, x, 38, b); } }});
def("m-akashic", "mage", "Akashic Brotherhood", "Shaven head with a topknot", {tone(S) { S.style = "bald"; }, top(c) { const {F, H: Hc} = c; area(F, CX, 10, 2, 1, (x, y) => F.put(x, y, Hc.b, "hair")); F.put(CX, 12, Hc.s2); F.put(CX, 11, Hc.s1); F.put(CX - 1, 9, Hc.hi); }});
def("m-ash-mark", "mage", "Euthanatos", "A thumb of ash on the brow", {skin(c) { area(c.F, CX, 21, 1, 1, (x, y) => tint(c.F, x, y, [60, 60, 64], 0.65)); }});
def("m-cyber-eye", "mage", "Iteration X", "A machine eye", {top(c) { const {F} = c, ex = 38; area(F, ex, EYE_Y, 3, 2, (x, y) => F.put(x, y, [120, 126, 136])); for ( let dx = -3; dx <= 3; dx++ ) { F.put(ex + dx, EYE_Y - 3, [50, 54, 60]); F.put(ex + dx, EYE_Y + 3, [50, 54, 60]); } F.put(ex, EYE_Y, [255, 40, 30]); F.put(ex - 1, EYE_Y, [180, 30, 20]); F.put(ex + 2, EYE_Y - 1, [180, 186, 196]); }});
def("m-goth", "mage", "Hollow Ones", "Dark eye paint and black lips", {top(c) { const {F} = c; for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) { paint(F, ex + dx, EYE_Y - 2, [30, 20, 30]); paint(F, ex + dx, EYE_Y + 1, [40, 26, 40]); } if ( !H.OPEN_MOUTHS.has(c.mouthKind) ) for ( let x = CX - 3; x <= CX + 3; x++ ) { F.put(x, MOUTH_Y + 1, [30, 20, 30]); F.put(x, MOUTH_Y - 1, [40, 26, 40]); } }});
def("m-nephandi", "mage", "Nephandi", "Black, starless eyes", {top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) for ( let dx = -2; dx <= 2; dx++ ) c.F.put(ex + dx, EYE_Y, dx === -1 ? [70, 40, 90] : BLACK); }});
def("m-marauder", "mage", "Marauders", "Eyes swirling with colour", {top(c) { if ( c.eyes !== "open" ) return; const cols = [[255, 80, 160], [80, 220, 255], [255, 230, 60]]; for ( const [ex] of EYES ) [-1, 0, 1].forEach((dx, i) => c.F.put(ex + dx, EYE_Y, cols[(i + ex) % 3])); for ( const [ex] of EYES ) glow(c.F, ex, EYE_Y, cols[1], 3, 0.25); }});
def("m-resonance", "mage", "Resonance", "A tint of Resonance about the head", {back(c) { const g = c.S.glowc ?? [160, 200, 255]; for ( let a = 0; a < 64; a++ ) { const t = (a / 64) * Math.PI * 2, x = Math.round(CX + Math.cos(t) * 21), y = Math.round(29 + Math.sin(t) * 22); if ( !c.F.has(x, y) ) c.F.put(x, y, mix(c.S.bg, g, 0.45)); } }});

/* ---------------- Wraiths: the Deathmark by how they died ---------------- */
const DM = [118, 30, 40];
def("r-dm-bullet", "wraith", "Deathmark", "A bullet hole in the brow", {top(c) { const {F, R} = c, x = CX + 3, y = 21; area(F, x, y, 1, 1, (a, b) => paint(F, a, b, R.s2)); F.put(x, y, BLACK); F.put(x + 1, y + 1, [60, 20, 24]); }});
def("r-dm-throat", "wraith", "Deathmark", "A cut throat", {top(c) { const y = c.S.chin + 2; for ( let dx = -6; dx <= 6; dx++ ) { const k = c.F.kindAt(CX + dx, y); if ( k === "neck" || k === "skin" ) c.F.put(CX + dx, y, Math.abs(dx) % 3 ? DM : [70, 14, 22]); } }});
def("r-dm-drowned", "wraith", "Deathmark", "Drowned: blue lips, wet hair", {tone(S) { S.skin = mix(S.skin, [150, 176, 190], 0.3); }, top(c) { const {F} = c; if ( !H.OPEN_MOUTHS.has(c.mouthKind) ) for ( let x = CX - 3; x <= CX + 3; x++ ) F.put(x, MOUTH_Y + 1, [80, 100, 140]); for ( const [x, y] of [[CX - 13, 30], [CX + 12, 34], [CX - 11, 44], [CX + 14, 41]] ) { F.put(x, y, [150, 190, 220]); F.put(x, y + 1, [90, 130, 170]); } }});
def("r-dm-burned", "wraith", "Deathmark", "Burned: charred patches", {skin(c) { const {F, r} = c, sd = r.pick([-1, 1]); area(F, CX + sd * 7, 40, 5, 4, (x, y, dx, dy) => paint(F, x, y, (dx + dy) % 2 ? [44, 30, 30] : [80, 40, 34])); area(F, CX - sd * 6, 20, 3, 2, (x, y) => tint(F, x, y, [60, 34, 30], 0.6)); }});
def("r-dm-stab", "wraith", "Deathmark", "A stab wound in the cheek", {top(c) { const sd = c.r.pick([-1, 1]); for ( let i = 0; i < 3; i++ ) paint(c.F, CX + sd * 9, 38 + i, i === 1 ? [70, 14, 22] : DM); }});
def("r-dm-plague", "wraith", "Deathmark", "Plague sores", {top(c) { const {F, r} = c; for ( let i = 0; i < 6; i++ ) { const x = CX + Math.round((r.next() - 0.5) * 22), y = 20 + Math.round(r.next() * 30); if ( Math.abs(y - EYE_Y) < 2 ) continue; paint(F, x, y, [120, 50, 40]); paint(F, x + 1, y, [90, 80, 40]); } }});
def("r-dm-shattered", "wraith", "Deathmark", "A shattered skull", {top(c) { crack(c.F, CX - 6, 13, 9, BLACK); crack(c.F, CX - 5, 14, 7, c.R.s2); }});
def("r-mask", "wraith", "Stygian", "A Stygian mask", {top(c) { const {F} = c, m = [196, 196, 204], ol = [60, 60, 70]; for ( let y = 26; y < 41; y++ ) { const hw = Math.round(headHw(y, c.shape)) - 1; for ( let x = CX - hw; x <= CX + hw; x++ ) { if ( F.kindAt(x, y) !== "skin" ) continue; const eye = Math.abs(y - EYE_Y) <= 1 && EYES.some(([ex]) => Math.abs(x - ex) <= 2); F.put(x, y, eye ? BLACK : x < CX ? m : mix(m, ol, 0.25)); } } for ( let x = CX - 12; x <= CX + 12; x++ ) { if ( F.kindAt(x, 26) === "skin" ) F.put(x, 26, ol); if ( F.kindAt(x, 40) === "skin" ) F.put(x, 40, ol); } }});
def("r-shadow", "wraith", "Shadow", "The Shadow showing: black veins and eyes", {state: "catharsis", skin(c) { for ( const [x, y, d] of [[CX - 11, 34, -1], [CX + 10, 34, 1], [CX - 3, 16, 1], [CX + 5, 46, -1]] ) veins(c.F, x, y, [20, 14, 26], 7, d); }, top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) for ( let dx = -2; dx <= 2; dx++ ) c.F.put(ex + dx, EYE_Y, dx ? BLACK : [160, 20, 30]); }});
def("r-spectre", "wraith", "Spectres", "A Spectre's hollow face", {tone(S) { S.skin = mix(S.skin, [70, 70, 80], 0.5); }, top(c) { const {F} = c; for ( const [ex] of EYES ) area(F, ex, EYE_Y, 2, 1, (x, y) => F.put(x, y, BLACK)); for ( const [ex] of EYES ) F.put(ex, EYE_Y, [200, 30, 40]); for ( let x = CX - 5; x <= CX + 5; x++ ) { F.put(x, MOUTH_Y, BLACK); if ( x % 2 ) F.put(x, MOUTH_Y - 1, [200, 196, 180]); } crack(F, CX + 4, 14, 8, BLACK, -1); }});
def("r-moliate", "wraith", "Masquers", "A face moliated smooth and fair", {tone(S) { S.sunk = false; S.white = [240, 240, 244]; }, top(c) { for ( let i = 0; i < 64 * 64; i++ ) if ( c.F.kind[i] === "skin" ) c.F.px[i] = mix(c.F.px[i], [230, 236, 250], 0.12); }});

/* ---------------- Changelings: the kiths' fae mien (seen only by those who see the mien) ---------------- */
const mien = fn => c => { if ( c.sees.fae ) fn(c); };
def("c-sidhe", "changeling", "Sidhe", "Long pointed ears, silver eyes, bright hair", {tone(S) { S.hair = [S.hair[0] + 80, S.hair[1] + 60, S.hair[2] + 110].map(v => Math.min(240, v)); }, ears: mien(c => earPoint(c, 7)), top: mien(c => eyeColour(c.F, c, [200, 206, 230]))});
def("c-troll", "changeling", "Troll", "Slate-blue skin and ridged horns", {tone(S) { S.skin = [110, 128, 150]; S.cool = true; }, top: mien(c => { const M = {hi: [220, 214, 196], b: [170, 160, 140], s1: [120, 110, 96], s2: [86, 76, 70], ol: [40, 34, 34]}; hornPair(c, M, 8, 19, 9, 4, 3.6); })});
def("c-redcap", "changeling", "Redcap", "Grey skin, bloodshot eyes, a wide mouth of razor teeth", {tone(S) { S.skin = [150, 150, 146]; }, top: mien(c => { const {F} = c; for ( let x = CX - 7; x <= CX + 7; x++ ) { F.put(x, MOUTH_Y, [150, 20, 30]); F.put(x, MOUTH_Y + 1, x % 2 ? [236, 232, 220] : [150, 20, 30]); } if ( c.eyes === "open" ) for ( const [ex] of EYES ) { F.put(ex - 2, EYE_Y, [230, 140, 140]); F.put(ex + 2, EYE_Y, [230, 140, 140]); } })});
def("c-nocker", "changeling", "Nocker", "A pale mask of a face, red nose and cheeks", {top: mien(c => { const {F} = c; for ( let i = 0; i < 64 * 64; i++ ) if ( F.kind[i] === "skin" ) { const y = Math.floor(i / 64); if ( y > 18 && y < 50 ) F.px[i] = mix(F.px[i], [236, 230, 226], 0.55); } area(F, CX, 39, 1, 1, (x, y) => F.put(x, y, [200, 50, 50])); for ( const sd of [-1, 1] ) area(F, CX + sd * 8, 40, 1, 1, (x, y) => tint(F, x, y, [220, 70, 70], 0.6)); for ( const [ex] of EYES ) { paint(F, ex, EYE_Y - 3, [40, 40, 120]); paint(F, ex, EYE_Y + 2, [40, 40, 120]); } })});
def("c-pooka", "changeling", "Pooka", "Animal ears and whiskers", {top: mien(c => { const {F, H: Hc} = c; for ( const sd of [-1, 1] ) { const cells = []; for ( let t = 0; t < 7; t++ ) { const w = Math.max(1, 3 - Math.floor(t / 3)); for ( let i = 0; i < w; i++ ) cells.push([CX + sd * (8 + i + Math.floor(t / 3)), 14 - t, i === 0 ? Hc.hi : Hc.b]); } stamp(F, cells, Hc.ol, "hair"); for ( let i = 0; i < 4; i++ ) { F.put(CX + sd * (5 + i), 41 - (i > 1 ? 1 : 0), [230, 226, 220]); F.put(CX + sd * (5 + i), 43, [230, 226, 220]); } } })});
def("c-selkie", "changeling", "Selkie", "Big dark eyes, wet hair", {top: mien(c => { const {F} = c; if ( c.eyes === "open" ) for ( const [ex] of EYES ) for ( let dx = -2; dx <= 2; dx++ ) F.put(ex + dx, EYE_Y, dx === -1 ? [60, 70, 90] : [16, 18, 30]); for ( const [x, y] of [[CX - 12, 40], [CX + 13, 36], [CX - 14, 48], [CX + 12, 50]] ) { F.put(x, y, [150, 200, 220]); F.put(x, y + 1, [90, 140, 170]); } })});
def("c-sluagh", "changeling", "Sluagh", "Pale, black-lipped, tired small eyes", {tone(S) { S.skin = mix(S.skin, [220, 220, 226], 0.6); S.cool = true; }, top: mien(c => { const {F} = c; for ( let x = CX - 4; x <= CX + 4; x++ ) F.put(x, MOUTH_Y, [20, 16, 24]); for ( let x = CX - 3; x <= CX + 3; x++ ) F.put(x, MOUTH_Y + 1, [40, 30, 44]); for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) paint(F, ex + dx, EYE_Y + 2, c.R.s2); })});
def("c-boggan", "changeling", "Boggan", "A big nose and bushy brows", {top: mien(c => { const {F, R, H: Hc} = c; area(F, CX, 38, 2, 2, (x, y) => F.put(x, y, R.b)); F.put(CX - 1, 37, R.hi); F.put(CX + 2, 39, R.s1); for ( const [ex, sd] of EYES ) for ( let i = 0; i < 7; i++ ) { F.put(ex + sd * (i - 3), 26 + (i % 2), Hc.b); F.put(ex + sd * (i - 3), 27, Hc.s1); } })});
def("c-clurichaun", "changeling", "Clurichaun", "Faintly pointed ears, russet hair", {tone(S) { S.hair = [150, 70, 36]; }, ears: mien(c => earPoint(c, 4))});
def("c-eshu", "changeling", "Eshu", "Bright eyes and hair in braids", {top: mien(c => { const {F, H: Hc} = c; for ( const sd of [-1, 1] ) for ( let y = 34; y < 54; y++ ) F.put(CX + sd * 16, y, y % 2 ? Hc.b : Hc.hi, "hair"); eyeColour(F, c, [240, 190, 60]); })});

/* ---------------- Hunters ---------------- */
def("h-second-sight", "hunter", "all", "Second Sight in the eyes", {top(c) { if ( c.eyes !== "open" || !c.sees.sigil ) return; for ( const [ex] of EYES ) glow(c.F, ex, EYE_Y, [255, 240, 190], 3, 0.3); }});
def("h-tonsure", "hunter", "Inquisitors", "A tonsure", {tone(S) { S.style = "short"; }, top(c) { const {F, R} = c; area(F, CX, 12, 5, 2, (x, y) => { if ( F.kindAt(x, y) === "hair" ) F.put(x, y, y < 12 ? R.hi : R.b, "skin"); }); }});
def("h-brand", "hunter", "Orders", "A cross branded on the brow", {top(c) { const col = [130, 40, 36]; for ( let dy = -2; dy <= 2; dy++ ) paint(c.F, CX, 21 + dy, col); for ( const dx of [-1, 1] ) paint(c.F, CX + dx, 20, col); }});
def("h-old-scars", "hunter", "all", "Old scars of the hunt", {top(c) { const pale = mix(c.R.hi, [240, 220, 210], 0.5); for ( let i = 0; i < 6; i++ ) paint(c.F, CX - 9 + i, 22 + i, pale); for ( let i = 0; i < 4; i++ ) paint(c.F, CX + 6 + i, 46 - i, pale); }});

/* ---------------- Mummies ---------------- */
def("u-gold-eyes", "mummy", "all", "Eyes of sun-gold", {top(c) { eyeColour(c.F, c, [236, 190, 70]); }});
def("u-apophis-mask", "mummy", "Children of Apophis", "A carved mask over a ruined face", {top(c) { const {F} = c, gold = [214, 170, 60], dk = [120, 86, 30]; for ( let y = 22; y < 50; y++ ) { const hw = Math.round(headHw(y, c.shape)) - 2; for ( let x = CX - hw; x <= CX + hw; x++ ) { if ( F.kindAt(x, y) !== "skin" ) continue; const eye = Math.abs(y - EYE_Y) <= 0 && EYES.some(([ex]) => Math.abs(x - ex) <= 2); F.put(x, y, eye ? BLACK : (x + y) % 7 === 0 ? dk : x < CX ? gold : mix(gold, dk, 0.35)); } } for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, MOUTH_Y, dk); }});
def("u-linen", "mummy", "Rising", "Grave linen still wound about the head and throat", {top(c) { const {F} = c; for ( let y = 12; y < 64; y += 3 ) { const hw = y > c.S.chin ? 7 : Math.round(headHw(Math.min(Math.max(y, 12), 53), c.shape)); for ( let x = CX - hw; x <= CX + hw; x++ ) { if ( Math.abs(y - EYE_Y) <= 1 || Math.abs(y - MOUTH_Y) <= 1 ) continue; const k = F.kindAt(x, y); if ( y > c.S.chin && k !== "neck" ) continue; if ( (x * 2 + y) % 9 < 6 && F.has(x, y) ) F.put(x, y, (x + y) % 4 ? [214, 204, 176] : [180, 168, 140]); } } }});
def("u-glyphs", "mummy", "Hekau", "Glyphs of a spell on the brow", {top(c) { const col = [40, 130, 150]; for ( const [dx, dy] of [[-4, 0], [-4, 1], [-3, 2], [-1, 0], [-1, 1], [-1, 2], [0, 0], [1, 1], [3, 0], [3, 1], [3, 2], [4, 0]] ) paint(c.F, CX + dx, 19 + dy, col); }});

/* ---------------- Demons: the visage seen in the apocalyptic form ---------------- */
def("d-radiance", "demon", "Radiance", "A halo of jewel colours", {state: "visage", back(c) { const cols = [[255, 220, 120], [120, 200, 255], [240, 140, 255]]; for ( let r = 19; r <= 21; r++ ) for ( let a = 0; a < 90; a++ ) { const t = (a / 90) * Math.PI * 2, x = Math.round(CX + Math.cos(t) * r), y = Math.round(22 + Math.sin(t) * r * 0.5); if ( !c.F.has(x, y) ) c.F.put(x, y, cols[(a + r) % 3]); } }});
def("d-firmament", "demon", "Firmament", "Pale skin, great grey eyes; more eyes in Torment", {state: "visage", tone(S) { S.skin = mix(S.skin, [226, 228, 236], 0.6); S.cool = true; S.iris = [170, 176, 190]; }, top(c) { const {F} = c; for ( const [x, y] of [[CX - 9, 21], [CX + 9, 21], [CX - 10, 40], [CX + 10, 40]] ) { for ( const dx of [-1, 0, 1] ) F.put(x + dx, y, [236, 236, 240]); F.put(x, y, [60, 66, 80]); F.put(x - 2, y, c.R.ol); F.put(x + 2, y, c.R.ol); } }});
def("d-forge", "demon", "Forge", "Black iron skin veined with fire, brass eyes", {state: "visage", tone(S) { S.skin = [58, 54, 58]; S.cool = true; S.iris = [200, 160, 60]; S.white = [190, 150, 70]; }, skin(c) { for ( const [x, y, d] of [[CX - 9, 18, 1], [CX + 7, 36, -1], [CX - 6, 40, 1], [CX + 3, 14, -1]] ) { veins(c.F, x, y, [255, 120, 30], 7, d); veins(c.F, x + d, y, [180, 50, 20], 7, d); } }});
def("d-patterns", "demon", "Patterns", "Indigo skin traced with silver lines", {state: "visage", tone(S) { S.skin = [66, 70, 150]; S.cool = true; S.iris = [60, 120, 230]; S.style = "bald"; S.beard = ""; }, skin(c) { const s = [190, 210, 240]; for ( let y = 14; y < 54; y += 4 ) for ( let x = CX - 14; x <= CX + 14; x++ ) if ( (x + y) % 5 === 0 || Math.abs(Math.sin((x + y) / 3)) > 0.93 ) paint(c.F, x, y + ((x % 3) - 1), s); }});
def("d-awakenings", "demon", "Awakenings", "A warm glow of health", {state: "visage", tone(S) { S.skin = mix(S.skin, [255, 210, 170], 0.25); }, back(c) { for ( let a = 0; a < 60; a++ ) { const t = (a / 60) * Math.PI * 2; for ( const r of [20, 22] ) { const x = Math.round(CX + Math.cos(t) * r), y = Math.round(30 + Math.sin(t) * r); if ( !c.F.has(x, y) ) c.F.put(x, y, mix(c.S.bg, [255, 220, 150], r === 20 ? 0.4 : 0.2)); } } }});
def("d-horns", "demon", "Visage", "Horns of the visage", {state: "visage", top(c) { const M = {hi: [90, 60, 60], b: [60, 34, 36], s1: [40, 22, 26], s2: [30, 14, 18], ol: [12, 6, 8]}; hornPair(c, M, 7, 18, 11, 4, 4); }});
def("d-torment-eyes", "demon", "Torment", "Black eyes with points of fire", {state: "visage", top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) for ( let dx = -2; dx <= 2; dx++ ) c.F.put(ex + dx, EYE_Y, dx ? BLACK : [255, 90, 30]); }});

/* ---------------- Kuei-jin ---------------- */
def("k-yin", "kuei-jin", "Yin", "Yin-cold: grey-green pallor, shadowed eyes", {tone(S) { S.skin = mix(S.skin, [160, 176, 164], 0.5); S.sunk = true; }, skin(c) { for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) paint(c.F, ex + dx, EYE_Y + 2, mix(c.R.s2, [30, 50, 40], 0.4)); }});
def("k-yang", "kuei-jin", "Yang", "Yang-warm: flushed and breathing", {tone(S) { S.skin = mix(S.skin, [230, 150, 120], 0.25); }, skin(c) { for ( const sd of [-1, 1] ) area(c.F, CX + sd * 8, 39, 2, 1, (x, y) => tint(c.F, x, y, [220, 80, 80], 0.35)); }});
def("k-bone-flower", "kuei-jin", "Bone Flowers", "White skin drawn tight over bone", {tone(S) { S.skin = [226, 224, 216]; S.sunk = true; }, skin(c) { for ( const sd of [-1, 1] ) for ( let y = 37; y < 46; y++ ) paint(c.F, CX + sd * (10 - Math.floor((y - 37) / 3)), y, c.R.s1); }});
def("k-demon-shintai", "kuei-jin", "Demon Shintai", "The demon's face: red skin, horns, tusks", {state: "shintai", tone(S) { S.skin = [176, 54, 46]; S.iris = [255, 220, 60]; }, top(c) { const M = {hi: [240, 230, 200], b: [200, 186, 150], s1: [150, 130, 100], s2: [110, 90, 70], ol: [40, 20, 20]}; hornPair(c, M, 6, 17, 8, 3, 2); for ( const x of [CX - 3, CX + 3] ) { c.F.put(x, MOUTH_Y - 1, [240, 232, 210]); c.F.put(x, MOUTH_Y - 2, [220, 210, 186]); } }});
def("k-jade", "kuei-jin", "Jade", "Skin with a sheen of jade", {skin(c) { for ( let i = 0; i < 64 * 64; i++ ) if ( c.F.kind[i] === "skin" && (i % 7 === 0 || i % 11 === 0) ) c.F.px[i] = mix(c.F.px[i], [90, 200, 140], 0.35); }});

/* ---------------- Changing breeds ---------------- */
def("f-bastet", "fera", "Bastet", "Cat's eyes and a hint of fang", {top(c) { pupilSlit(c.F, c, [190, 200, 70]); if ( !H.OPEN_MOUTHS.has(c.mouthKind) ) for ( const x of [CX - 2, CX + 2] ) c.F.put(x, MOUTH_Y + 1, [240, 234, 220]); }});
def("f-corax", "fera", "Corax", "Glossy black hair, bright black eyes", {tone(S) { S.hair = [30, 30, 44]; S.iris = [20, 20, 30]; }, top(c) { eyeColour(c.F, c, [30, 30, 50]); for ( let x = CX - 8; x <= CX + 8; x += 3 ) if ( c.F.kindAt(x, 12) === "hair" ) c.F.put(x, 12, [120, 130, 200]); }});
def("f-nagah", "fera", "Nagah", "Serpent's eyes and faint scales", {top(c) { pupilSlit(c.F, c, [140, 190, 60]); scales(c.F, c.R, CX - 13, 36, 6, 8); scales(c.F, c.R, CX + 8, 36, 6, 8); }});
def("f-ratkin", "fera", "Ratkin", "Long front teeth, twitching whiskers", {top(c) { const {F} = c; if ( !H.OPEN_MOUTHS.has(c.mouthKind) ) for ( const x of [CX - 1, CX] ) { F.put(x, MOUTH_Y + 1, [236, 220, 170]); F.put(x, MOUTH_Y + 2, [214, 196, 140]); } for ( const sd of [-1, 1] ) for ( let i = 0; i < 4; i++ ) F.put(CX + sd * (4 + i), 41, [60, 50, 50]); }});

/* ---------------- Anyone: marks of a life, by choice or by seed ---------------- */
def("a-scar-eye", "all", "Scars", "A scar across the eye", {top(c) { const pale = mix(c.R.hi, [240, 214, 206], 0.55); for ( let i = 0; i < 11; i++ ) { const x = 36 + Math.floor(i / 3), y = 26 + i; if ( !(y === EYE_Y && c.eyes === "open" && x >= 36 && x <= 40) ) paint(c.F, x, y, pale); } }});
def("a-scar-cheek", "all", "Scars", "A sword cut on the cheek", {top(c) { const pale = mix(c.R.hi, [240, 214, 206], 0.55); for ( let i = 0; i < 7; i++ ) paint(c.F, CX - 11 + i, 36 + Math.floor(i / 2), pale); }});
def("a-pox", "all", "Scars", "Pox marks", {skin(c) { const {F, r, R} = c; for ( let i = 0; i < 14; i++ ) paint(F, CX + Math.round((r.next() - 0.5) * 22), 34 + Math.round(r.next() * 14), R.s1); }});
def("a-freckles", "all", "Marks", "Freckles", {skin(c) { const {F, r, R} = c; for ( let i = 0; i < 16; i++ ) { const x = CX + Math.round((r.next() - 0.5) * 20), y = 34 + Math.round(r.next() * 6); if ( Math.abs(x - CX) > 1 ) tint(F, x, y, mix(R.s1, [150, 80, 40], 0.5), 0.6); } }});
def("a-mole", "all", "Marks", "A mole", {skin(c) { const x = CX + c.r.pick([-6, 7]), y = c.r.pick([42, 47, 24]); paint(c.F, x, y, [60, 34, 30]); paint(c.F, x + 1, y, [90, 54, 46]); }});
def("a-tattoo-tear", "all", "Marks", "A tattooed tear", {top(c) { for ( const [x, y] of [[38, 35], [38, 36], [37, 37], [38, 37], [39, 37], [38, 38]] ) paint(c.F, x, y, [30, 40, 90]); }});
def("a-earrings", "all", "Jewellery", "Earrings", {top(c) { const hw = Math.round(headHw(36, c.shape)); for ( const sd of [-1, 1] ) { c.F.put(CX + sd * (hw + 1), 38, [230, 190, 70]); c.F.put(CX + sd * (hw + 1), 39, [180, 140, 40]); } }});
def("a-nose-ring", "all", "Jewellery", "A ring in the nose", {top(c) { c.F.put(CX + 2, 40, [210, 210, 214]); c.F.put(CX + 3, 41, [150, 150, 160]); }});
def("a-eyepatch", "all", "Gear", "An eyepatch", {top(c) { const {F} = c; area(F, 38, EYE_Y, 3, 2, (x, y) => F.put(x, y, [24, 20, 22])); for ( let i = 0; i < 16; i++ ) { const x = 24 + i, y = 25 + Math.round(i * 0.35); if ( F.kindAt(x, y) !== "hair" && Math.abs(x - 38) > 3 ) F.put(x, y, [30, 26, 28]); } }});
def("a-spectacles", "all", "Gear", "Spectacles", {top(c) { const {F} = c, m = [180, 160, 110]; for ( const [ex] of EYES ) { for ( let dx = -3; dx <= 3; dx++ ) { F.put(ex + dx, EYE_Y - 2, m); F.put(ex + dx, EYE_Y + 2, m); } for ( const dy of [-1, 0, 1] ) { F.put(ex - 4, EYE_Y + dy, m); F.put(ex + 4, EYE_Y + dy, m); } } for ( let x = CX - 2; x <= CX + 2; x++ ) F.put(x, EYE_Y - 1, m); }});
def("a-hood", "all", "Headwear", "A hood", {tone(S) { S.covered = true; }, top(c) { const {F, C} = c, chin = c.S.chin; for ( let y = 4; y < 64; y++ ) { const out = y < 30 ? 19 * Math.sqrt(Math.max(0, 1 - ((30 - y) / 27) ** 2)) : 19 + (y - 30) * 0.15; const inn = y < 14 || y > chin ? -1 : y < 30 ? 13 * Math.sqrt(Math.max(0, 1 - ((30 - y) / 17) ** 2)) : Math.min(13, headHw(y, c.shape) + 1); for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) if ( Math.abs(x - CX) > inn ) F.put(x, y, Math.abs(x - CX) > out - 2 ? C.ol : x < CX ? C.b : C.s1, "hood"); } }});
def("a-veil", "all", "Headwear", "Veil and wimple", {tone(S) { S.covered = true; }, top(c) { const {F} = c, w = [232, 228, 218], s = [196, 190, 178]; for ( let y = 6; y < 64; y++ ) { const out = y < 28 ? 18 * Math.sqrt(Math.max(0, 1 - ((28 - y) / 23) ** 2)) : 18 + (y - 28) * 0.3; for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) { const d = Math.abs(x - CX), face = y > 14 && y < 52 && d < headHw(Math.min(y, 53), c.shape) - 1.5; if ( !face ) F.put(x, y, x > CX + 6 ? s : w, "veil"); } } F.outline(["veil"], [120, 114, 104]); }});
def("a-hat", "all", "Headwear", "A broad hat", {top(c) { const {F, C} = c; for ( let x = CX - 21; x <= CX + 21; x++ ) { F.put(x, 17, C.s1); F.put(x, 18, C.s2); } for ( let y = 6; y < 17; y++ ) for ( let x = CX - 12; x <= CX + 12; x++ ) F.put(x, y, x < CX - 3 ? C.b : C.s1); for ( let x = CX - 12; x <= CX + 12; x++ ) F.put(x, 15, [120, 40, 30]); for ( let x = CX - 21; x <= CX + 21; x++ ) F.put(x, 19, mix(C.s2, [0, 0, 0], 0.5)); }});
def("a-circlet", "all", "Headwear", "A circlet of rank", {top(c) { const {F} = c; for ( let x = CX - 13; x <= CX + 13; x++ ) F.put(x, 17 + Math.round(Math.abs(x - CX) / 8), (x % 3) ? [220, 180, 70] : [160, 120, 40]); F.put(CX, 16, [200, 40, 50]); }});
def("a-headscarf", "all", "Headwear", "A headscarf", {top(c) { const {F, C} = c, col = mix(C.b, [160, 60, 50], 0.4); for ( let y = 6; y < 24; y++ ) { const out = 17 * Math.sqrt(Math.max(0, 1 - ((24 - y) / 18) ** 2)); for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) F.put(x, y, (x + y) % 6 ? col : mix(col, [255, 255, 255], 0.3), "scarf"); } F.outline(["scarf"], mix(col, [0, 0, 0], 0.6)); }});
def("a-grey", "all", "Age", "Grey hair and lines of age", {tone(S) { S.hair = mix(S.hair, [190, 190, 196], 0.7); }, skin(c) { for ( const [ex, sd] of EYES ) for ( let i = 0; i < 2; i++ ) paint(c.F, ex + sd * 4, EYE_Y + i, c.R.s1); for ( const sd of [-1, 1] ) for ( let i = 0; i < 4; i++ ) paint(c.F, CX + sd * (4 + Math.floor(i / 2)), 41 + i, c.R.s1); }});
def("a-ghoul", "all", "Ghouls", "A ghoul's ruddy vigour", {tone(S) { S.skin = mix(S.skin, [220, 120, 110], 0.15); }, top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) { c.F.put(ex - 2, EYE_Y, [230, 170, 170]); c.F.put(ex + 2, EYE_Y, [230, 170, 170]); } }});
def("a-warpaint", "all", "Paint", "Face paint of a people", {skin(c) { const col = c.r.pick([[200, 60, 40], [240, 240, 230], [40, 40, 50]]); for ( let x = CX - 12; x <= CX + 12; x++ ) paint(c.F, x, 34 + (x % 2), col); }});

/* ---------------- Which features a face has ---------------- */
/** Groups any face of the line may roll by seed; every other group (a clan, kith, tribe, house) needs the sheet to name it. */
const GENERAL = new Set(["all", "Nosferatu", "Tribes", "Rank", "Paradox", "Resonance", "Shadow", "Stygian", "Hekau", "Rising", "Orders", "Visage", "Torment", "Yin", "Yang", "Bone Flowers", "Jade", "Scars", "Marks", "Jewellery", "Gear", "Headwear", "Age", "Paint", "Tattoos", "Hair", "Beard", "Health"]);
/** Never rolled by seed, only ticked: spectacles belong to some eras and not others. */
const TICK_ONLY = new Set(["a-spectacles"]);
const ONE_OF = new Set(["Deathmark", "Headwear", "Metis"]);
/** Lines whose named group is the whole look (a kith's mien, a breed's): always shown when the sheet names it. */
const WHOLE = new Set(["changeling", "fera"]);
const norm = s => String(s ?? "").toLowerCase();
/** Does the sheet's text (clan, kith, tribe, tradition and so on) name this group? */
export function groupMatches(group, text) {
  const g = norm(group), t = norm(text);
  if ( !g || !t ) return false;
  const words = g.replace(/^(the|followers of|children of|harbingers of)\s+/, "").split(/\s+/);
  return t.includes(g) || words.every(w => w.length > 2 && t.includes(w.replace(/s$/, "")));
}
/** Features a line may show at all: its own, the Kindred's for Nosferatu, anyone's, and the shifters' when the sheet names them. */
export function featuresFor(line, text = "") {
  return Object.values(FEATURES).filter(f => f.line === line || f.line === "all" || (line === "nosferatu" && f.line === "kindred")
    || (f.line === "fera" && groupMatches(f.group, text)));
}
/** The kith and breed looks drawn here are each the whole look: shown whenever the sheet names the group. */
for ( const f of Object.values(FEATURES) ) if ( WHOLE.has(f.line) && !("core" in f) ) f.core = true;
/** Pick up to n features from list in seeded order, one per slot. */
function take(r, list, n, used, out) {
  const order = list.map(f => [r.next(), f]).sort((a, b) => a[0] - b[0]).map(p => p[1]);
  let got = 0;
  for ( const f of order ) {
    if ( got >= n ) break;
    if ( f.slot && used.has(f.slot) ) continue;
    if ( f.slot ) used.add(f.slot);
    out.push(f.id); got++;
  }
}
/**
 * The features a face shows when the Storyteller has ticked none: rolled from the seed, so that two faces seldom look
 * alike (Ben, 13 November 2026). A kith's or breed's whole look always shows when the sheet names it; then two to four
 * of the named group's own features (a clan, tribe, kith, house), one to three of the line's own, and one to three
 * everyday marks; never two in one slot (two things on one cheek); a wraith always bears one deathmark and a metis one
 * deformity; one headwear at most, now and then. Form and state features of a named or general group are listed and
 * show only while their form is on. Objects of one era (spectacles, sunglasses) and a ghoul's flush are only ticked,
 * the flush also rolled when the sheet says ghoul.
 */
export function rollFeatures(seed, line, text = "") {
  const r = H.rng(H.seedOf(`${seed}|features`)), out = [], used = new Set();
  const pool = featuresFor(line, text).filter(f => !TICK_ONLY.has(f.id) && !f.tick && !ONE_OF.has(f.group));
  const named = f => groupMatches(f.group, text);
  if ( /ghoul/i.test(text) && FEATURES["a-ghoul"] ) out.push("a-ghoul");
  const plain = pool.filter(f => f.id !== "a-ghoul");
  for ( const f of plain ) if ( f.core && named(f) ) { out.push(f.id); if ( f.slot ) used.add(f.slot); }
  for ( const f of plain ) if ( f.state && !f.core && (named(f) || (GENERAL.has(f.group) && f.line !== "all")) ) out.push(f.id);
  const loose = plain.filter(f => !f.core && !f.state);
  take(r, loose.filter(f => f.line !== "all" && named(f)), 2 + Math.floor(r.next() * 3), used, out);
  take(r, loose.filter(f => f.line !== "all" && !named(f) && GENERAL.has(f.group)), 1 + Math.floor(r.next() * 3), used, out);
  take(r, loose.filter(f => f.line === "all"), 1 + Math.floor(r.next() * 3), used, out);
  for ( const g of ONE_OF ) {
    const opts = featuresFor(line, text).filter(f => f.group === g && !f.tick);
    if ( !opts.length ) continue;
    if ( g === "Deathmark" && line === "wraith" ) out.push(r.pick(opts).id);
    else if ( g === "Metis" && groupMatches("Metis", text) ) out.push(r.pick(opts).id);
    else if ( g === "Headwear" && r.next() < 0.12 ) { const h = opts.filter(f => !f.slot || !used.has(f.slot)); if ( h.length ) out.push(r.pick(h).id); }
  }
  return [...new Set(out)];
}
export {FEATURES};
