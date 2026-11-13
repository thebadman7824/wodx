/**
 * WoDX Paperdoll: the features anyone may have, of any line (13 November 2026). With the first 18 in face64-features.mjs
 * they make 100. Objects of one era only (sunglasses, a baseball cap) are never rolled by seed, only ticked.
 */
import {def, mix, paint, tint, over, hw, pale, line, blob, glyph, spot, iris, eachKind, motes, CX, EYE_Y, MOUTH_Y, EYES, H} from "./face64-kit.mjs";

const INK = [34, 44, 92], INK2 = [24, 24, 30], GOLD = [226, 186, 72], GOLD2 = [170, 128, 40], SILVER = [214, 214, 222], SILVER2 = [150, 150, 164];
const g = (id, group, label, stages, opts) => def(`a-${id}`, "all", group, label, stages, opts);
const tattoo = (id, label, name, at, col = INK, slot) => g(id, "Tattoos", label, {skin(c) { const [x, y] = spot(c, at); glyph(c.F, name, x, y, col); }}, {slot: slot ?? at});
const cut = (c, pts) => { const p = pale(c); for ( let i = 0; i + 1 < pts.length; i++ ) line(...pts[i], ...pts[i + 1], (x, y) => { if ( !(y === EYE_Y && c.eyes === "open" && EYES.some(([ex]) => Math.abs(x - ex) <= 2)) ) paint(c.F, x, y, p); }); };
const stud = (F, x, y, col = GOLD) => over(F, x, y, col);
const lobes = c => [spot(c, "lobeL"), spot(c, "lobeR")];

/* ---------------- Scars ---------------- */
g("scar-brow", "Scars", "A scar splitting one eyebrow", {top(c) { cut(c, [[24, 25], [26, 31]]); }}, {slot: "eyeL"});
g("scar-lip", "Scars", "A scar through the lip", {top(c) { cut(c, [[CX + 2, MOUTH_Y - 3], [CX + 3, MOUTH_Y + 3]]); }}, {slot: "lips"});
g("scar-chin", "Scars", "A pale nick on the chin", {top(c) { const [x, y] = spot(c, "chin"); cut(c, [[x - 2, y], [x + 1, y + 1]]); }}, {slot: "chin"});
g("scar-forehead", "Scars", "A long scar across the brow", {top(c) { cut(c, [[CX - 9, 20], [CX + 8, 25]]); }}, {slot: "brow"});
g("scar-nose", "Scars", "A cut across the bridge of the nose", {top(c) { cut(c, [[CX - 3, 34], [CX + 3, 36]]); }}, {slot: "nose"});
g("scar-jaw", "Scars", "A ragged scar along the jaw", {top(c) { const [x, y] = spot(c, "jawL"); cut(c, [[x, y - 3], [x + 2, y + 1], [x + 5, y + 3]]); }}, {slot: "jawL"});
g("claw-marks", "Scars", "Three claw scars down the cheek", {top(c) { for ( let k = 0; k < 3; k++ ) cut(c, [[CX + 7 + k * 2, 34], [CX + 5 + k * 2, 44]]); }}, {slot: "cheekR"});
g("burn", "Scars", "An old burn on the cheek", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|burn`)); blob(CX - 9, 41, 4, 4, (x, y) => tint(c.F, x, y, r.next() < 0.5 ? [200, 120, 120] : [236, 196, 186], 0.55)); }}, {slot: "cheekL"});
g("brand", "Scars", "A brand burned into the cheek", {top(c) { const [x, y] = spot(c, "cheekR"); glyph(c.F, "rune3", x, y, mix(c.R.s2, [150, 60, 60], 0.4)); }}, {slot: "cheekR"});
g("stitched", "Scars", "A stitched cut on the cheek", {top(c) { const [x, y] = spot(c, "cheekL"); line(x - 3, y - 2, x + 3, y + 1, (px, py) => paint(c.F, px, py, c.R.s2)); for ( let k = -2; k <= 2; k += 2 ) { paint(c.F, x + k, y - 2 + Math.round((k + 3) / 2), INK2); paint(c.F, x + k, y + Math.round((k + 3) / 2), INK2); } }}, {slot: "cheekL"});
g("broken-nose", "Scars", "A nose broken and badly set", {face(c) { for ( let y = 34; y < 39; y++ ) paint(c.F, CX + 1 + (y > 36 ? 1 : 0), y, c.R.s1); paint(c.F, CX + 2, 37, c.R.hi); }}, {slot: "nose"});
g("whip", "Scars", "A lash scar across the face", {top(c) { cut(c, [[CX - 12, 30], [CX - 4, 38], [CX + 6, 47]]); }}, {slot: "cheekL"});
g("ear-notch", "Scars", "A notch cut from one ear", {ears(c) { const [x, y] = spot(c, "lobeL"); for ( let k = 0; k < 2; k++ ) c.F.put(x + k, y - 4, c.S.bg); }}, {slot: "ears"});

/* ---------------- Marks of the body ---------------- */
g("port-wine", "Marks", "A wine-coloured birthmark", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|pw`)); blob(CX + 8, 30, 5, 6, (x, y, dx, dy) => { if ( r.next() < 0.85 - Math.abs(dx) * 0.08 ) tint(c.F, x, y, [150, 40, 70], 0.5); }); }}, {slot: "cheekR"});
g("beauty-mark", "Marks", "A beauty mark above the lip", {skin(c) { paint(c.F, CX - 5, MOUTH_Y - 3, [50, 28, 26]); paint(c.F, CX - 4, MOUTH_Y - 3, [90, 56, 48]); }}, {slot: "lips"});
g("eye-mole", "Marks", "A mole by the eye", {skin(c) { paint(c.F, 42, 34, [60, 34, 30]); paint(c.F, 42, 35, [96, 60, 52]); }}, {slot: "eyeR"});
g("nose-freckles", "Marks", "Freckles across the nose", {skin(c) { for ( const [x, y] of [[CX - 3, 36], [CX - 1, 37], [CX + 2, 36], [CX + 4, 37], [CX - 5, 37], [CX + 1, 35]] ) tint(c.F, x, y, [150, 80, 40], 0.5); }}, {slot: "nose"});
g("moles", "Marks", "Many small moles", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|moles`)); for ( let i = 0; i < 7; i++ ) paint(c.F, CX + Math.round((r.next() - 0.5) * 24), 22 + Math.round(r.next() * 32), [70, 40, 34]); }}, {slot: "skin"});
g("vitiligo", "Marks", "Pale patches of skin", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|vit`)); for ( const [cx, cy] of [[CX - 8, 26], [CX + 6, 44], [CX - 3, 50]] ) blob(cx, cy, 3, 2, (x, y) => { if ( r.next() < 0.8 ) tint(c.F, x, y, [244, 226, 214], 0.6); }); }}, {slot: "skin"});
g("rosy", "Marks", "Cheeks that flush easily", {skin(c) { for ( const sd of [-1, 1] ) blob(CX + sd * 9, 40, 3, 2, (x, y) => tint(c.F, x, y, [220, 90, 90], 0.25)); }}, {slot: "cheeks"});
g("weathered", "Marks", "Skin worn by sun and wind", {tone(S) { S.skin = mix(S.skin, [150, 96, 66], 0.18); }, skin(c) { for ( let x = CX - 8; x <= CX + 8; x += 4 ) paint(c.F, x, 21, c.R.s1); }}, {slot: "brow"});
g("dark-circles", "Marks", "Dark rings under the eyes", {skin(c) { for ( const [ex] of EYES ) for ( let dx = -2; dx <= 2; dx++ ) tint(c.F, ex + dx, EYE_Y + 2, [70, 40, 70], 0.4); }}, {slot: "under"});
g("furrowed", "Marks", "A deeply furrowed brow", {skin(c) { for ( const y of [20, 22] ) for ( let x = CX - 7; x <= CX + 7; x++ ) if ( x % 5 ) paint(c.F, x, y, c.R.s1); }}, {slot: "brow"});
g("crows-feet", "Marks", "Lines at the corners of the eyes", {skin(c) { for ( const [ex, sd] of EYES ) for ( const dy of [-1, 1, 2] ) paint(c.F, ex + sd * 5, EYE_Y + dy, c.R.s1); }}, {slot: "under"});
g("laugh-lines", "Marks", "Deep lines from nose to mouth", {skin(c) { for ( const sd of [-1, 1] ) line(CX + sd * 4, 40, CX + sd * 6, MOUTH_Y + 1, (x, y) => paint(c.F, x, y, c.R.s1)); }}, {slot: "cheeks"});
g("wart", "Marks", "A wart on the nose", {top(c) { paint(c.F, CX + 3, 39, c.R.s1); paint(c.F, CX + 3, 38, c.R.hi); paint(c.F, CX + 4, 39, c.R.s2); }}, {slot: "nose"});
g("pocked-chin", "Marks", "A cleft chin", {skin(c) { const [x, y] = spot(c, "chin"); paint(c.F, x, y - 1, c.R.s2); paint(c.F, x, y, c.R.s2); }}, {slot: "chin"});
g("dimples", "Marks", "Dimples", {skin(c) { for ( const sd of [-1, 1] ) paint(c.F, CX + sd * 7, MOUTH_Y, c.R.s1); }}, {slot: "cheeks"});

/* ---------------- Tattoos ---------------- */
tattoo("tat-dots", "Three dots tattooed under the eye", "dots3", "underR", INK, "eyeR");
tattoo("tat-star", "A star tattooed on the brow", "star", "foreL", INK, "brow");
tattoo("tat-spiral", "A spiral tattooed on the cheek", "spiral", "cheekL", INK, "cheekL");
tattoo("tat-cross", "A small cross tattooed on the cheek", "cross", "cheekR", INK, "cheekR");
tattoo("tat-crescent", "A crescent tattooed at the temple", "crescent", "templeL", INK, "temples");
tattoo("tat-rune", "A rune tattooed between the brows", "rune1", "brow", INK, "brow");
tattoo("tat-chin", "Lines tattooed on the chin", "lines3", "chin", INK, "chin");
tattoo("tat-neck-snake", "A serpent tattooed on the neck", "snake", "neckR", INK, "neck");
tattoo("tat-neck-web", "A web tattooed on the neck", "web", "neckL", INK2, "neck");
tattoo("tat-heart", "A tiny heart by the eye", "heart", "underL", [150, 40, 60], "eyeL");
tattoo("tat-bird", "A swallow at the temple", "bird", "templeR", INK, "temples");
g("tat-vines", "Tattoos", "Vines tattooed down the temple", {skin(c) { const [x] = spot(c, "templeR"); for ( let y = 22; y < 40; y++ ) { paint(c.F, x + (y % 4 < 2 ? 0 : -1), y, [40, 90, 60]); if ( y % 5 === 0 ) paint(c.F, x - 2, y, [60, 120, 70]); } }}, {slot: "temples"});
g("tat-barcode", "Tattoos", "A barcode on the neck", {skin(c) { const [x, y] = spot(c, "neckL"); for ( let k = 0; k < 6; k++ ) if ( k !== 2 ) for ( let dy = 0; dy < 3; dy++ ) paint(c.F, x - 3 + k, y + dy, INK2); }}, {slot: "neck", tick: true});
g("tat-swirl", "Tattoos", "Bold swirls over cheek and temple", {skin(c) { for ( let t = 0; t < 22; t++ ) { const a = t * 0.5, rr = 1 + t * 0.3; paint(c.F, Math.round(CX + 10 + Math.cos(a) * rr), Math.round(36 + Math.sin(a) * rr), INK); } }}, {slot: "cheekR"});

/* ---------------- Jewellery ---------------- */
g("hoops", "Jewellery", "Big hoop earrings", {top(c) { for ( const [x, y] of lobes(c) ) { const sd = x < CX ? -1 : 1; for ( const [dx, dy] of [[0, 1], [sd, 2], [sd, 3], [0, 4], [-sd, 3], [-sd, 2]] ) c.F.put(x + dx, y + dy, dy === 4 ? GOLD2 : GOLD); } }}, {slot: "ears"});
g("studs", "Jewellery", "Small stud earrings", {top(c) { for ( const [x, y] of lobes(c) ) stud(c.F, x, y, SILVER); }}, {slot: "ears"});
g("ear-rows", "Jewellery", "Rows of rings up the ears", {top(c) { for ( const [x, y] of lobes(c) ) for ( let k = 0; k < 4; k++ ) c.F.put(x, y - k * 2, SILVER); }}, {slot: "ears"});
g("ear-drop", "Jewellery", "Long drop earrings", {top(c) { for ( const [x, y] of lobes(c) ) { for ( let k = 0; k < 4; k++ ) c.F.put(x, y + 1 + k, k < 3 ? GOLD : [200, 40, 60]); } }}, {slot: "ears"});
g("septum", "Jewellery", "A ring through the septum", {top(c) { for ( const x of [CX - 1, CX, CX + 1] ) c.F.put(x, 41, SILVER); }}, {slot: "nose"});
g("nose-stud", "Jewellery", "A stud in the nose", {top(c) { c.F.put(CX - 2, 39, GOLD); c.F.put(CX - 2, 38, GOLD2); }}, {slot: "nose"});
g("brow-ring", "Jewellery", "A ring through the eyebrow", {top(c) { c.F.put(41, 28, SILVER); c.F.put(41, 29, SILVER2); }}, {slot: "eyeR"});
g("lip-ring", "Jewellery", "A ring in the lower lip", {top(c) { c.F.put(CX + 2, MOUTH_Y + 2, SILVER); c.F.put(CX + 3, MOUTH_Y + 2, SILVER2); }}, {slot: "lips"});
g("labret", "Jewellery", "A stud under the lip", {top(c) { c.F.put(CX, MOUTH_Y + 3, SILVER); c.F.put(CX + 1, MOUTH_Y + 3, SILVER2); }}, {slot: "chin"});
g("gold-tooth", "Jewellery", "A gold tooth", {top(c) { if ( H.OPEN_MOUTHS.has(c.mouthKind) ) c.F.put(CX + 1, MOUTH_Y, GOLD); else { c.F.put(CX + 2, MOUTH_Y, GOLD2); c.F.put(CX + 2, MOUTH_Y + 1, GOLD); } }}, {slot: "teeth"});
g("torc", "Jewellery", "A twisted metal torc at the throat", {top(c) { const y = c.S.chin + 4; for ( let x = CX - 7; x <= CX + 7; x++ ) over(c.F, x, y + Math.round(((x - CX) / 7) ** 2 * 2), (x % 2) ? GOLD : GOLD2); }}, {slot: "neck"});
g("pearls", "Jewellery", "A string of pearls", {top(c) { const y = c.S.chin + 6; for ( let x = CX - 8; x <= CX + 8; x += 2 ) over(c.F, x, y + Math.round(((x - CX) / 8) ** 2 * 3), [240, 236, 226]); }}, {slot: "neck"});
g("pendant-cross", "Jewellery", "A cross on a cord", {top(c) { const y = c.S.chin + 3; line(CX - 6, y, CX, y + 4, (x, yy) => over(c.F, x, yy, INK2)); line(CX + 6, y, CX, y + 4, (x, yy) => over(c.F, x, yy, INK2)); glyph(c.F, "latin", CX, y + 6, SILVER, false); }}, {slot: "neck"});
g("chain", "Jewellery", "A heavy chain round the neck", {top(c) { const y = c.S.chin + 5; for ( let x = CX - 9; x <= CX + 9; x++ ) over(c.F, x, y + Math.round(((x - CX) / 9) ** 2 * 3), (x % 2) ? SILVER : SILVER2); }}, {slot: "neck"});
g("choker", "Jewellery", "A dark choker", {top(c) { const y = c.S.chin + 2; for ( let x = CX - 6; x <= CX + 6; x++ ) if ( c.F.kindAt(x, y) === "neck" || c.F.kindAt(x, y) === "skin" ) c.F.put(x, y, INK2); }}, {slot: "neck"});
g("beads", "Jewellery", "A necklace of bright beads", {top(c) { const y = c.S.chin + 5, cols = [[200, 60, 50], [240, 200, 60], [60, 120, 200], [240, 240, 230]]; for ( let x = CX - 9, i = 0; x <= CX + 9; x += 2, i++ ) over(c.F, x, y + Math.round(((x - CX) / 9) ** 2 * 3), cols[i % 4]); }}, {slot: "neck"});
g("cheek-studs", "Jewellery", "Studs in both cheeks", {top(c) { for ( const sd of [-1, 1] ) c.F.put(CX + sd * 7, MOUTH_Y - 1, SILVER); }}, {slot: "cheeks"});

/* ---------------- Things over the eyes and face ---------------- */
g("monocle", "Gear", "A monocle", {top(c) { const ex = 38; for ( const [dx, dy] of [[-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0]] ) c.F.put(ex + dx, EYE_Y + dy, GOLD); line(ex + 1, EYE_Y + 3, ex + 4, c.S.chin + 4, (x, y) => over(c.F, x, y, GOLD2)); }}, {slot: "eyes"});
g("sunglasses", "Gear", "Dark glasses", {top(c) { for ( const [ex] of EYES ) blob(ex, EYE_Y, 3, 1, (x, y) => c.F.put(x, y, [20, 20, 26])); for ( let x = CX - 2; x <= CX + 2; x++ ) c.F.put(x, EYE_Y - 1, [20, 20, 26]); for ( const [ex] of EYES ) c.F.put(ex - 2, EYE_Y - 1, [90, 90, 110]); }}, {slot: "eyes", tick: true});
g("mirrorshades", "Gear", "Mirrored glasses", {top(c) { for ( let x = 21; x <= 43; x++ ) for ( let y = EYE_Y - 1; y <= EYE_Y + 1; y++ ) c.F.put(x, y, mix([120, 160, 200], [230, 240, 250], (x + y) % 5 / 5)); }}, {slot: "eyes", tick: true});
g("goggles", "Gear", "Goggles pushed up on the brow", {top(c) { for ( const [ex] of EYES ) blob(ex, 20, 3, 2, (x, y, dx, dy) => c.F.put(x, y, Math.abs(dx) === 3 || Math.abs(dy) === 2 ? [90, 70, 50] : [120, 170, 160])); for ( let x = CX - 16; x <= CX + 16; x++ ) if ( Math.abs(x - 26) > 3 && Math.abs(x - 38) > 3 ) over(c.F, x, 20, [70, 52, 40]); }}, {slot: "head"});
g("blindfold", "Gear", "A cloth bound over the eyes", {top(c) { for ( let x = CX - 17; x <= CX + 17; x++ ) for ( let y = EYE_Y - 2; y <= EYE_Y + 1; y++ ) over(c.F, x, y, y === EYE_Y - 2 ? [210, 206, 196] : [180, 176, 166]); }}, {slot: "eyes"});
g("eyepatch-l", "Gear", "A patch over the left eye", {top(c) { blob(26, EYE_Y, 3, 2, (x, y) => c.F.put(x, y, [24, 20, 22])); line(22, 28, 44, 24, (x, y) => { if ( Math.abs(x - 26) > 3 ) over(c.F, x, y, [30, 26, 28]); }); }}, {slot: "eyes"});
g("pince-nez", "Gear", "Pince-nez on the nose", {top(c) { for ( const [ex] of EYES ) for ( const [dx, dy] of [[-2, 0], [-1, -1], [0, -1], [1, -1], [2, 0], [1, 1], [0, 1], [-1, 1]] ) c.F.put(ex + dx + (ex < CX ? 1 : -1), EYE_Y + 1 + dy, SILVER); c.F.put(CX, EYE_Y, SILVER); }}, {slot: "eyes"});
g("domino", "Gear", "A black half mask", {top(c) { for ( let y = EYE_Y - 3; y <= EYE_Y + 2; y++ ) for ( let x = CX - 12; x <= CX + 12; x++ ) { if ( Math.abs(x - CX) < 2 && y > EYE_Y ) continue; const eye = Math.abs(y - EYE_Y) <= 0 && EYES.some(([ex]) => Math.abs(x - ex) <= 2); if ( c.F.kindAt(x, y) === "skin" ) c.F.put(x, y, eye ? [10, 8, 10] : (x < CX ? [40, 34, 44] : [26, 22, 30])); } }}, {slot: "eyes"});
g("mouth-cloth", "Gear", "A cloth over nose and mouth", {top(c) { for ( let y = 37; y <= c.S.chin + 2; y++ ) { const w = hw(c, Math.min(y, 52)); for ( let x = CX - w; x <= CX + w; x++ ) if ( c.F.has(x, y) && c.F.kindAt(x, y) !== "hair" ) c.F.put(x, y, x < CX ? [120, 40, 40] : [96, 30, 34]); } }}, {slot: "mouth"});

/* ---------------- Headwear ---------------- */
const crown = (c, top, bot, w, fill, edge, kind = "hat") => { for ( let y = top; y <= bot; y++ ) for ( let x = CX - w; x <= CX + w; x++ ) c.F.put(x, y, y === top || Math.abs(x - CX) === w ? edge : x < CX - 3 ? fill : mix(fill, [0, 0, 0], 0.2), kind); };
g("tricorne", "Headwear", "A three-cornered hat", {top(c) { const col = [40, 36, 40]; crown(c, 9, 16, 11, col, [20, 18, 22]); for ( let x = CX - 19; x <= CX + 19; x++ ) { const y = 18 - Math.round(Math.abs(x - CX) / 6); c.F.put(x, y, col); c.F.put(x, y - 1, [20, 18, 22]); } }}, {slot: "head"});
g("top-hat", "Headwear", "A tall hat", {top(c) { crown(c, 2, 16, 10, [30, 28, 34], [14, 12, 16]); for ( let x = CX - 10; x <= CX + 10; x++ ) c.F.put(x, 14, [120, 30, 40]); for ( let x = CX - 16; x <= CX + 16; x++ ) { c.F.put(x, 17, [24, 22, 26]); c.F.put(x, 18, [14, 12, 16]); } }}, {slot: "head"});
g("flat-cap", "Headwear", "A flat cap", {top(c) { const col = [100, 92, 76]; for ( let y = 10; y <= 18; y++ ) { const w = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((18 - y) / 9) ** 2))); for ( let x = CX - w; x <= CX + w + 2; x++ ) c.F.put(x, y, (x + y) % 3 ? col : mix(col, [0, 0, 0], 0.2), "hat"); } for ( let x = CX - 10; x <= CX + 16; x++ ) c.F.put(x, 19, mix(col, [0, 0, 0], 0.45)); }}, {slot: "head"});
g("kettle-helm", "Headwear", "A broad-brimmed iron helmet", {top(c) { crown(c, 7, 17, 12, [140, 140, 150], [70, 70, 80]); for ( let x = CX - 18; x <= CX + 18; x++ ) { c.F.put(x, 18, [120, 120, 130]); c.F.put(x, 19, [70, 70, 80]); } }}, {slot: "head"});
g("mail-coif", "Headwear", "A hood of mail", {top(c) { const chin = c.S.chin; for ( let y = 6; y < 64; y++ ) { const out = y < 30 ? 18 * Math.sqrt(Math.max(0, 1 - ((30 - y) / 25) ** 2)) : 18 + (y - 30) * 0.1; const inn = y < 17 || y > chin ? -1 : Math.min(12, hw(c, y)); for ( let x = Math.round(CX - out); x <= Math.round(CX + out); x++ ) if ( Math.abs(x - CX) > inn ) c.F.put(x, y, (x + y) % 2 ? [150, 150, 160] : [96, 96, 108], "mail"); } }}, {slot: "head", covers: true});
g("turban", "Headwear", "A wound turban", {top(c) { const col = mix([230, 220, 200], c.C.b, 0.2); for ( let y = 4; y <= 20; y++ ) { const w = Math.round(16 * Math.sqrt(Math.max(0, 1 - ((16 - y) / 13) ** 2))); for ( let x = CX - w; x <= CX + w; x++ ) c.F.put(x, y, (x + y * 2) % 7 < 2 ? mix(col, [0, 0, 0], 0.2) : col, "hat"); } c.F.outline(["hat"], mix(col, [0, 0, 0], 0.55)); }}, {slot: "head"});
g("crown", "Headwear", "A crown", {top(c) { for ( let x = CX - 12; x <= CX + 12; x++ ) { for ( let y = 15; y <= 18; y++ ) c.F.put(x, y, y === 18 ? GOLD2 : GOLD); if ( (x - CX) % 4 === 0 ) { c.F.put(x, 14, GOLD); c.F.put(x, 13, GOLD); } } c.F.put(CX, 16, [200, 40, 50]); c.F.put(CX - 6, 16, [60, 120, 220]); c.F.put(CX + 6, 16, [60, 180, 90]); }}, {slot: "head"});
g("wreath", "Headwear", "A wreath of leaves", {top(c) { for ( let x = CX - 14; x <= CX + 14; x++ ) { const y = 17 + Math.round(Math.abs(x - CX) / 7); over(c.F, x, y, (x % 2) ? [60, 120, 60] : [90, 150, 70]); if ( x % 3 === 0 ) over(c.F, x, y - 1, [70, 130, 60]); } }}, {slot: "head"});
g("bandana", "Headwear", "A knotted kerchief on the head", {top(c) { const col = [150, 40, 40]; for ( let y = 9; y <= 19; y++ ) { const w = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((19 - y) / 10) ** 2))); for ( let x = CX - w; x <= CX + w; x++ ) c.F.put(x, y, (x + y) % 5 ? col : [230, 220, 210], "hat"); } c.F.put(CX + 16, 19, col); c.F.put(CX + 17, 20, col); }}, {slot: "head"});
g("watch-cap", "Headwear", "A knitted cap", {top(c) { const col = [50, 60, 80]; for ( let y = 6; y <= 19; y++ ) { const w = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((19 - y) / 13) ** 2))); for ( let x = CX - w; x <= CX + w; x++ ) c.F.put(x, y, y > 16 ? mix(col, [255, 255, 255], 0.1) : (x % 2 ? col : mix(col, [0, 0, 0], 0.15)), "hat"); } }}, {slot: "head", tick: true});
g("fedora", "Headwear", "A brimmed felt hat", {top(c) { crown(c, 7, 16, 10, [70, 62, 56], [40, 34, 30]); for ( let x = CX - 10; x <= CX + 10; x++ ) { c.F.put(x, 14, [30, 26, 24]); if ( Math.abs(x - CX) < 3 ) c.F.put(x, 7, [40, 34, 30]); } for ( let x = CX - 17; x <= CX + 17; x++ ) { c.F.put(x, 17, [60, 52, 46]); c.F.put(x, 18, [34, 30, 28]); } }}, {slot: "head", tick: true});
g("feather-cap", "Headwear", "A soft cap with a feather", {top(c) { const col = [90, 40, 60]; for ( let y = 9; y <= 18; y++ ) { const w = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((18 - y) / 10) ** 2))); for ( let x = CX - w - 2; x <= CX + w; x++ ) c.F.put(x, y, col, "hat"); } line(CX + 8, 12, CX + 18, 2, (x, y, i) => c.F.put(x, y, i % 2 ? [230, 230, 220] : [200, 200, 190])); }}, {slot: "head"});
g("ball-cap", "Headwear", "A peaked cap", {top(c) { const col = [40, 70, 130]; for ( let y = 9; y <= 18; y++ ) { const w = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((18 - y) / 10) ** 2))); for ( let x = CX - w; x <= CX + w; x++ ) c.F.put(x, y, col, "hat"); } for ( let x = CX - 12; x <= CX + 12; x++ ) { c.F.put(x, 19, mix(col, [0, 0, 0], 0.3)); c.F.put(x, 20, mix(col, [0, 0, 0], 0.55)); } }}, {slot: "head", tick: true});

/* ---------------- Hair and beard ---------------- */
g("hair-streak", "Hair", "A white streak in the hair", {top(c) { eachKind(c.F, "hair", (x, y, p) => (x >= CX - 6 && x <= CX - 4) ? mix(p, [236, 236, 240], 0.75) : null); }}, {slot: "hair"});
g("hair-dyed", "Hair", "Hair dyed a bright colour", {tone(S) { S.hair = [[170, 40, 60], [60, 90, 190], [120, 50, 160], [60, 150, 90]][parseInt(H.seedOf(S.seed + "dye")) % 4]; }}, {slot: "hairColour"});
g("hair-ribbon", "Hair", "A ribbon in the hair", {top(c) { const col = [190, 40, 60]; for ( const [dx, dy] of [[0, 0], [-1, -1], [-2, -1], [-1, 1], [-2, 1], [1, -1], [2, -1], [1, 1], [2, 1]] ) over(c.F, CX + 10 + dx, 14 + dy, dx === 0 ? mix(col, [0, 0, 0], 0.3) : col); }}, {slot: "hair"});
g("hair-flower", "Hair", "A flower worn in the hair", {top(c) { const [x, y] = [CX - 11, 16]; for ( const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] ) over(c.F, x + dx, y + dy, [240, 210, 220]); over(c.F, x, y, [240, 200, 60]); }}, {slot: "hair"});
g("hair-beads", "Hair", "Beads strung in the hair", {top(c) { const cols = [[220, 180, 60], [200, 60, 50], [240, 240, 230]]; let i = 0; eachKind(c.F, "hair", (x, y) => ((x * 3 + y * 7) % 23 === 0 ? cols[i++ % 3] : null)); }}, {slot: "hair"});
g("braids", "Hair", "Braids hanging by the face", {top(c) { for ( const sd of [-1, 1] ) { const x = CX + sd * (hw(c, 34) + 1); for ( let y = 26; y < 56; y++ ) c.F.put(x, y, y % 2 ? c.H.b : c.H.hi, "hair"); c.F.put(x, 56, [190, 60, 50]); } }}, {slot: "hair"});
g("shaved-sides", "Hair", "Hair shaved at the sides", {face(c) {}, top(c) { eachKind(c.F, "hair", (x, y) => (Math.abs(x - CX) > 8 && y > 14 && y < 34 ? mix(c.R.b, c.H.s1, 0.35) : null)); }}, {slot: "hair"});
g("widows-peak", "Hair", "A sharp widow's peak", {top(c) { for ( let y = 18; y < 23; y++ ) for ( let x = CX - (22 - y); x <= CX + (22 - y); x++ ) if ( c.F.kindAt(x, y) === "skin" ) c.F.put(x, y, c.H.b, "hair"); }}, {slot: "hairline"});
g("bald-crown", "Hair", "A bald crown", {top(c) { blob(CX, 11, 6, 3, (x, y) => { if ( c.F.kindAt(x, y) === "hair" ) c.F.put(x, y, y < 11 ? c.R.hi : c.R.b, "skin"); }); }}, {slot: "hairline"});
g("moustache", "Beard", "A long moustache", {top(c) { for ( let x = CX - 6; x <= CX + 6; x++ ) if ( Math.abs(x - CX) > 0 ) over(c.F, x, MOUTH_Y - 2 + (Math.abs(x - CX) > 4 ? 1 : 0), x < CX ? c.H.b : c.H.s1); for ( const sd of [-1, 1] ) over(c.F, CX + sd * 6, MOUTH_Y, c.H.s1); }}, {slot: "beard"});
g("sideburns", "Beard", "Heavy side-whiskers", {top(c) { for ( const sd of [-1, 1] ) for ( let y = 32; y < 46; y++ ) { const x = CX + sd * hw(c, y); for ( let k = 0; k < 3; k++ ) if ( c.F.kindAt(x - sd * k, y) === "skin" ) c.F.put(x - sd * k, y, (y + k) % 2 ? c.H.b : c.H.s1); } }}, {slot: "beard"});
g("braided-beard", "Beard", "A braided beard", {top(c) { const y0 = c.S.chin - 1; for ( let y = y0; y < y0 + 8; y++ ) for ( const dx of [-1, 0, 1] ) c.F.put(CX + dx, y, (y + dx) % 2 ? c.H.b : c.H.hi, "hair"); over(c.F, CX, y0 + 8, GOLD); }}, {slot: "beard"});
g("soul-patch", "Beard", "A tuft under the lip", {top(c) { for ( const [x, y] of [[CX, MOUTH_Y + 2], [CX, MOUTH_Y + 3], [CX - 1, MOUTH_Y + 2]] ) paint(c.F, x, y, c.H.b); }}, {slot: "beard"});

/* ---------------- Health and hard living ---------------- */
g("gaunt", "Health", "Hollow, gaunt cheeks", {skin(c) { for ( const sd of [-1, 1] ) for ( let y = 39; y < 47; y++ ) paint(c.F, CX + sd * (hw(c, y) - 3), y, c.R.s2); }}, {slot: "cheeks"});
g("drinkers-nose", "Health", "A red, veined nose", {face(c) { for ( let y = 36; y < 41; y++ ) for ( let x = CX - 2; x <= CX + 2; x++ ) tint(c.F, x, y, [200, 60, 70], 0.35); }}, {slot: "nose"});
g("black-eye", "Health", "A black eye", {skin(c) { blob(38, EYE_Y, 4, 3, (x, y) => { if ( Math.abs(y - EYE_Y) > 0 || Math.abs(x - 38) > 2 ) tint(c.F, x, y, [70, 40, 90], 0.5); }); }}, {slot: "eyeR"});
g("bruise", "Health", "A bruise on the jaw", {skin(c) { blob(CX - 8, 48, 3, 2, (x, y) => tint(c.F, x, y, [100, 70, 120], 0.45)); }}, {slot: "jawL"});
g("split-lip", "Health", "A split lip", {top(c) { c.F.put(CX - 2, MOUTH_Y + 1, [170, 30, 40]); c.F.put(CX - 2, MOUTH_Y + 2, [120, 20, 30]); }}, {slot: "lips"});
g("bloodshot", "Health", "Bloodshot eyes", {top(c) { if ( c.eyes !== "open" ) return; for ( const [ex] of EYES ) { c.F.put(ex - 2, EYE_Y, [226, 150, 150]); c.F.put(ex + 2, EYE_Y, [226, 150, 150]); } }}, {slot: "eyeWhites"});
g("missing-tooth", "Health", "A missing tooth", {top(c) { if ( H.OPEN_MOUTHS.has(c.mouthKind) ) c.F.put(CX - 1, MOUTH_Y, [40, 10, 16]); else { c.F.put(CX - 1, MOUTH_Y, [40, 10, 16]); c.F.put(CX - 1, MOUTH_Y + 1, c.R.s2); } }}, {slot: "teeth"});
g("blind-eye", "Health", "One clouded, blind eye", {top(c) { if ( c.eyes !== "open" ) return; for ( let dx = -1; dx <= 1; dx++ ) c.F.put(26 + dx, EYE_Y, [196, 204, 210]); }}, {slot: "eyeL"});
g("odd-eyes", "Health", "Eyes of two colours", {top(c) { if ( c.eyes !== "open" ) return; c.F.put(37, EYE_Y, [90, 160, 220]); c.F.put(39, EYE_Y, [60, 120, 190]); }}, {slot: "eyes2"});
g("sallow", "Health", "Sallow, sickly skin", {tone(S) { S.skin = mix(S.skin, [190, 186, 120], 0.25); }}, {slot: "skinTone"});
g("sweat", "Health", "A sheen of sweat", {top(c) { for ( const [x, y] of [[CX - 7, 22], [CX + 5, 21], [CX + 10, 30], [CX - 11, 34]] ) paint(c.F, x, y, mix(c.R.hi, [255, 255, 255], 0.6)); }}, {slot: "skin"});

/* ---------------- Paint and powder ---------------- */
g("kohl", "Paint", "Eyes lined with kohl", {top(c) { for ( const [ex, sd] of EYES ) { for ( let dx = -3; dx <= 3; dx++ ) c.F.put(ex + dx, EYE_Y - 1, [16, 14, 20]); c.F.put(ex + sd * 4, EYE_Y - 2, [16, 14, 20]); } }}, {slot: "eyeline"});
g("lip-red", "Paint", "Red painted lips", {top(c) { for ( let x = CX - 3; x <= CX + 3; x++ ) for ( const y of [MOUTH_Y, MOUTH_Y + 1] ) if ( c.F.kindAt(x, y) === "skin" || !H.OPEN_MOUTHS.has(c.mouthKind) ) tint(c.F, x, y, [190, 20, 40], 0.6); }}, {slot: "lips"});
g("rouge", "Paint", "Rouged cheeks", {skin(c) { for ( const sd of [-1, 1] ) blob(CX + sd * 9, 39, 2, 1, (x, y) => tint(c.F, x, y, [230, 80, 110], 0.45)); }}, {slot: "cheeks"});
g("eye-shadow", "Paint", "Coloured paint about the eyes", {skin(c) { for ( const [ex] of EYES ) for ( let dx = -3; dx <= 3; dx++ ) { tint(c.F, ex + dx, EYE_Y - 2, [80, 110, 200], 0.55); tint(c.F, ex + dx, EYE_Y - 3, [80, 110, 200], 0.3); } }}, {slot: "eyeline"});
g("powder", "Paint", "A face whitened with powder", {tone(S) { S.skin = mix(S.skin, [244, 238, 232], 0.55); }}, {slot: "skinTone"});
g("soot", "Paint", "Smudges of soot", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|soot`)); for ( let i = 0; i < 9; i++ ) tint(c.F, CX + Math.round((r.next() - 0.5) * 22), 22 + Math.round(r.next() * 28), [30, 28, 30], 0.5); }}, {slot: "skin"});
g("blood-smear", "Paint", "A smear of someone's blood", {top(c) { line(CX + 4, 41, CX + 11, 37, (x, y) => tint(c.F, x, y, [140, 16, 24], 0.7)); line(CX + 5, 43, CX + 10, 40, (x, y) => tint(c.F, x, y, [120, 10, 20], 0.5)); }}, {slot: "cheekR"});
g("ash-cross", "Paint", "A smudge of ash on the brow", {skin(c) { glyph(c.F, "cross", CX, 23, [70, 66, 66]); }}, {slot: "brow"});
g("bindi", "Paint", "A dot of colour between the brows", {skin(c) { paint(c.F, CX, 26, [190, 30, 50]); paint(c.F, CX, 25, [150, 20, 40]); }}, {slot: "brow"});
g("gilded", "Paint", "Gold dust on the cheekbones", {top(c) { for ( const sd of [-1, 1] ) for ( const [dx, dy] of [[0, 0], [2, 1], [1, -1], [3, 0]] ) paint(c.F, CX + sd * (8 + dx), 37 + dy, GOLD); }}, {slot: "cheeks"});
g("mud", "Paint", "Dried mud on the face", {skin(c) { const r = H.rng(H.seedOf(`${c.S.seed}|mud`)); blob(CX - 7, 46, 4, 3, (x, y) => { if ( r.next() < 0.6 ) tint(c.F, x, y, [110, 86, 56], 0.6); }); }}, {slot: "jawL"});
g("glitter", "Paint", "Glitter about the eyes", {top(c) { for ( const [x, y] of [[22, 30], [24, 35], [41, 29], [43, 34], [29, 36], [35, 36]] ) paint(c.F, x, y, [240, 230, 255]); }}, {slot: "eyeline", tick: true});

/* ---------------- Bearing ---------------- */
g("pipe", "Gear", "A pipe between the teeth", {top(c) { line(CX + 4, MOUTH_Y, CX + 9, MOUTH_Y + 3, (x, y) => c.F.put(x, y, [90, 60, 40])); blob(CX + 10, MOUTH_Y + 1, 1, 2, (x, y) => c.F.put(x, y, [110, 74, 46])); c.F.put(CX + 10, MOUTH_Y - 1, [60, 40, 30]); }}, {slot: "mouth"});
g("cigarette", "Gear", "A cigarette at the lip", {top(c) { line(CX + 5, MOUTH_Y + 1, CX + 8, MOUTH_Y + 2, (x, y) => c.F.put(x, y, [236, 232, 224])); c.F.put(CX + 9, MOUTH_Y + 2, [230, 90, 40]); motes(c, [150, 150, 160], 3, {yMin: 30, yMax: 44, near: 10}); }}, {slot: "mouth", tick: true});
g("high-collar", "Gear", "A tall stiff collar", {top(c) { const y0 = c.S.chin - 1; for ( const sd of [-1, 1] ) for ( let y = y0; y < y0 + 8; y++ ) for ( let k = 0; k < 4; k++ ) c.F.put(CX + sd * (7 + k + Math.floor((y - y0) / 3)), y, k === 3 ? c.C.ol : c.C.hi); }}, {slot: "collar"});
g("ruff", "Gear", "A pleated ruff", {top(c) { const y = c.S.chin + 2; for ( let x = CX - 14; x <= CX + 14; x++ ) for ( let dy = -1; dy <= 2; dy++ ) c.F.put(x, y + dy, (x + dy) % 2 ? [236, 232, 222] : [196, 190, 180]); }}, {slot: "collar"});
g("scarf", "Gear", "A scarf wound at the throat", {top(c) { const col = [[150, 40, 40], [40, 90, 70], [180, 150, 60]][parseInt(H.seedOf(c.S.seed + "sc")) % 3]; for ( let y = c.S.chin; y < c.S.chin + 6; y++ ) for ( let x = CX - 11; x <= CX + 11; x++ ) c.F.put(x, y, (x + y) % 4 ? col : mix(col, [0, 0, 0], 0.3)); }}, {slot: "collar"});
