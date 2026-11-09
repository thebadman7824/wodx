/**
 * WoDX Paperdoll: the parts drawn on top of Lorelei's face, so that no two characters look alike. Skin tones and
 * hair colours, the build of the face, age, cheeks, marks, scars and facial hair. Pure functions: no Foundry here.
 *
 * Every part is drawn in Lorelei's own drawing space (980 square, after its own shift), where the eyes, nose and
 * mouth sit at the same place on every face. The parts go inside the same transform as the head, so they follow
 * the build of the face, and under a mask made from the head's visible skin, so they never cross hair, the eyes'
 * outlines or the edge of the face.
 */

/* ---- Colours ---- */
/** Skin tones, light to deep, cool to warm. The first 32 are human; the last ones are for the dead and the strange. */
export const SKIN_LIST = [
  ["f6e1d3", "Porcelain"], ["f3d9c9", "Pale rose"], ["f0d6bf", "Fair"], ["f2d3b1", "Light"], ["ecc9a8", "Light warm"], ["e8c4b0", "Light rose"],
  ["e6c39c", "Light golden"], ["e3bf98", "Ivory beige"], ["e0b590", "Warm"], ["dcb38e", "Sand"], ["d8aa84", "Honey"], ["d4a57c", "Light olive"],
  ["cda07a", "Beige"], ["c99a6e", "Olive"], ["c28f66", "Golden tan"], ["bd8a68", "Rose tan"], ["b5825a", "Warm tan"], ["ad7b55", "Caramel"],
  ["a8754f", "Tan"], ["a06c48", "Bronze"], ["98674a", "Cinnamon"], ["8d5a3b", "Brown"], ["855638", "Chestnut brown"], ["7c5034", "Umber"],
  ["744a30", "Warm brown"], ["6b4129", "Deep brown"], ["623c27", "Mahogany"], ["5a3724", "Espresso"], ["4f3021", "Dark"], ["4a2c1d", "Deep"],
  ["3f261a", "Ebony"], ["362117", "Deepest"], ["d7d2c8", "Deathly pale"], ["c9c6c0", "Ashen"], ["b9c0bf", "Grave grey"], ["c8d0c4", "Sickly green"],
  ["d9cfe0", "Pallid violet"], ["e8e4dc", "Bloodless"]
];
/** Lookup by colour. (Some colours read as numbers, so the order lives in SKIN_ORDER, not in this object.) */
export const SKIN = Object.fromEntries(SKIN_LIST);
export const SKIN_ORDER = SKIN_LIST.map(([h]) => h);
export const SKIN_HUMAN = SKIN_ORDER.slice(0, 32);
/** Hair colours, natural ones first, then the greys of age. */
export const HAIR = {
  "0e0c0b": "Blue black", "1f1a17": "Black", "2a211b": "Soft black", "3b2a20": "Dark brown", "4a3226": "Brown black", "5a3a28": "Brown",
  "6b4630": "Mid brown", "7a5236": "Light brown", "8a5a34": "Chestnut", "9a6a42": "Hazel brown", "6e2f1c": "Dark auburn", "8e3b1f": "Copper red",
  "b5762f": "Auburn", "c0602a": "Ginger", "d08a4a": "Strawberry", "a8865a": "Dark blond", "c9a15b": "Fair", "d6b878": "Golden",
  "e2cf9a": "Flaxen", "efe0b8": "Platinum", "6d6a66": "Iron grey", "7f7a74": "Salt and pepper", "9c9a96": "Grey", "c4c2be": "Silver", "efece6": "White"
};
export const HAIR_GREY = ["6d6a66", "7f7a74", "9c9a96", "c4c2be", "efece6"];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rgb = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = c => c.map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
/** Mix two colours: t 0 gives a, 1 gives b. */
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
export const lum = h => { const [r, g, b] = rgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/* ---- The build of the face: wider or narrower, longer or shorter ---- */
export const WIDTHS = {narrow: 0.9, slim: 0.95, "": 1, broad: 1.05, wide: 1.1};
export const LENGTHS = {short: 0.95, "": 1, long: 1.05};
export const BUILD = {};
for ( const [w, sx] of Object.entries(WIDTHS) ) for ( const [l, sy] of Object.entries(LENGTHS) ) {
  const id = [w, l].filter(Boolean).join("-");
  const label = [w ? w[0].toUpperCase() + w.slice(1) : (l ? "" : "Average"), l ? (w ? `and ${l}` : l[0].toUpperCase() + l.slice(1)) : ""].filter(Boolean).join(" ");
  BUILD[id] = {sx, sy, label: label || "Average"};
}
/** Where the face is scaled from: the middle of the neck, where it meets the shoulders, so the neck stays put. */
export const PIVOT = [490, 815];
export const buildOf = id => BUILD[id] ?? BUILD[""];
export function buildTransform(id) {
  const {sx, sy} = buildOf(id);
  if ( sx === 1 && sy === 1 ) return "";
  return `translate(${PIVOT[0]} ${PIVOT[1]}) scale(${sx} ${sy}) translate(${-PIVOT[0]} ${-PIVOT[1]})`;
}
/** A point in Lorelei's space, moved by the build. */
export const place = (id, [x, y]) => { const {sx, sy} = buildOf(id); return [PIVOT[0] + (x - PIVOT[0]) * sx, PIVOT[1] + (y - PIVOT[1]) * sy]; };

/* ---- Lines in Lorelei's manner ---- */
const ln = (d, {c = "000000", o = 0.5, sw = 6} = {}) => `<path d="${d}" fill="none" stroke="#${c}" stroke-opacity="${o}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const blob = (d, c, o = 1) => `<path d="${d}" fill="#${c}" fill-opacity="${o}"/>`;
const soft = (id, cx, cy, rx, ry, c, o, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#${id})"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ""} data-c="${c}" data-o="${o}"/>`;
/** A small fixed scatter of points in an ellipse (the same every time). */
function scatter(n, cx, cy, rx, ry, seed) {
  let h = seed >>> 0;
  const r = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  const out = [];
  while ( out.length < n ) { const a = r() * 2 - 1, b = r() * 2 - 1; if ( a * a + b * b <= 1 ) out.push([cx + a * rx, cy + b * ry, r()]); }
  return out;
}

/* ---- Age ---- */
export const AGES = {child: "Child", youth: "Youth", "": "Grown", seasoned: "Seasoned", middle: "Middle-aged", old: "Old", aged: "Very old"};
function ageLines(age) {
  const step = {child: -2, youth: -1, "": 0, seasoned: 1, middle: 2, old: 3, aged: 4}[age] ?? 0;
  // the young: a soft bloom on the cheeks, stronger in a child
  if ( step < 0 ) { const o = step === -2 ? 0.32 : 0.22; return soft("wpd-glow", 436, 556, 70, 46, "e8808a", o) + soft("wpd-glow", 682, 544, 36, 34, "e8808a", o); }
  if ( step === 0 ) return "";
  const o = [0, 0.28, 0.4, 0.5, 0.58][step], sw = [0, 5, 6, 6, 7][step], s = {o, sw};
  const out = [];
  // the lines from the nose to the mouth
  out.push(ln("M548 556 C516 570 482 594 466 630", s), ln("M640 560 C664 578 678 598 682 628", {...s, o: o * 0.9}));
  if ( step >= 2 ) {
    // crow's feet and the lines under the eyes
    out.push(ln("M392 452 L368 442", s), ln("M390 468 L364 470", s), ln("M393 484 L372 498", s));
    out.push(ln("M425 506 C452 518 492 518 520 506", {...s, o: o * 0.8}), ln("M632 498 C652 506 680 506 700 496", {...s, o: o * 0.7}));
    out.push(ln("M462 302 C510 290 586 290 648 302", {...s, o: o * 0.8}));
  }
  if ( step >= 3 ) {
    out.push(ln("M476 328 C520 318 580 318 632 328", {...s, o: o * 0.7}), ln("M572 380 L568 406", s), ln("M592 378 L594 404", {...s, o: o * 0.8}));
    out.push(ln("M462 644 C458 668 462 690 472 708", s), ln("M664 636 C670 662 670 684 662 702", {...s, o: o * 0.85}));
    out.push(ln("M716 444 L730 436", s), ln("M716 462 L732 462", s));
  }
  if ( step >= 4 ) {
    out.push(ln("M430 524 C456 538 494 538 524 524", {...s, o: o * 0.6}), ln("M396 436 L376 422", s));
    out.push(ln("M488 352 C530 344 570 344 610 352", {...s, o: o * 0.6}));
    out.push(ln("M410 798 C470 812 540 812 610 798", {...s, o: o * 0.7}), ln("M430 826 C480 836 530 836 590 826", {...s, o: o * 0.6}));
    for ( const [x, y, k] of scatter(7, 372, 420, 34, 46, 7) ) out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(5 + 5 * k).toFixed(1)}" fill="#8a5a3a" fill-opacity=".32"/>`);
  }
  return out.join("");
}

/* ---- Cheeks and complexion ---- */
export const CHEEKS = {"": "Plain", rosy: "Rosy", ruddy: "Ruddy", freckled: "Freckled", speckled: "Heavily freckled", gaunt: "Gaunt", weathered: "Weathered", flushed: "Flushed"};
function cheeks(kind, skin) {
  const out = [];
  const dark = lum(skin) < 0.45;
  if ( kind === "rosy" || kind === "flushed" ) {
    const c = dark ? "8a2a2a" : "e0707a", o = kind === "flushed" ? 0.5 : 0.34;
    out.push(soft("wpd-glow", 432, 556, 64, 40, c, o), soft("wpd-glow", 682, 542, 34, 32, c, o));
    if ( kind === "flushed" ) out.push(soft("wpd-glow", 610, 545, 30, 24, c, o * 0.8));
  }
  if ( kind === "ruddy" ) {
    const c = dark ? "7a2520" : "c4483c";
    out.push(soft("wpd-glow", 430, 552, 80, 52, c, 0.36), soft("wpd-glow", 684, 540, 40, 40, c, 0.36), soft("wpd-glow", 606, 545, 34, 26, c, 0.42));
  }
  if ( kind === "freckled" || kind === "speckled" ) {
    const n = kind === "speckled" ? 1 : 0.45, c = dark ? mix(skin, "0a0402", 0.6) : mix(skin, "3a2414", 0.55);
    const pts = [...scatter(Math.round(34 * n), 452, 528, 82, 38, 11), ...scatter(Math.round(12 * n), 592, 504, 34, 22, 23), ...scatter(Math.round(16 * n), 672, 520, 40, 30, 31)];
    for ( const [x, y, k] of pts ) out.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3 + 4 * k).toFixed(1)}" fill="#${c}" fill-opacity="${(0.45 + 0.35 * k).toFixed(2)}"/>`);
  }
  if ( kind === "gaunt" ) {
    const c = mix(skin, "2a1420", 0.55);
    out.push(soft("wpd-glow", 410, 600, 20, 62, c, 0.28, -24), soft("wpd-glow", 702, 596, 12, 48, c, 0.24, 12));
    out.push(ln("M384 548 C398 590 422 620 448 640", {o: 0.32, sw: 5}), ln("M708 556 C706 586 700 610 692 626", {o: 0.26, sw: 4}));
    out.push(soft("wpd-glow", 470, 468, 72, 46, c, 0.16), soft("wpd-glow", 668, 460, 46, 40, c, 0.14));
  }
  if ( kind === "weathered" ) {
    const c = mix(skin, "5a2a10", 0.6);
    out.push(soft("wpd-glow", 560, 520, 230, 200, c, 0.2), soft("wpd-glow", 606, 545, 30, 24, c, 0.14));
    out.push(ln("M560 268 C590 262 620 264 650 272", {o: 0.25, sw: 4}), ln("M384 520 L362 516", {o: 0.3, sw: 4}), ln("M386 540 L366 544", {o: 0.3, sw: 4}));
  }
  return out.join("");
}

/* ---- Marks: moles, birthmarks, pockmarks ---- */
export const MARKS = {"": "None", moleCheek: "Mole on the cheek", moleLip: "Mole above the lip", moleChin: "Mole on the chin", moleFar: "Mole on the far cheek",
  moleTemple: "Mole by the eye", beauty: "Beauty spot", moles: "A scatter of moles", stainCheek: "Wine stain on the cheek",
  stainBrow: "Wine stain on the brow", patch: "Pale patch", pocked: "Pockmarks", wart: "Wart on the nose"};
function marks(kind, skin) {
  const mole = (x, y, r = 8) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#${mix(skin, "2a1608", 0.7)}"/>`;
  switch ( kind ) {
    case "moleCheek": return mole(404, 574, 9);
    case "moleLip": return mole(500, 584, 7);
    case "moleChin": return mole(592, 714, 8);
    case "moleFar": return mole(690, 560, 7);
    case "moleTemple": return mole(380, 488, 7);
    case "beauty": return mole(652, 586, 6);
    case "moles": return [mole(398, 560, 6), mole(452, 648, 5), mole(676, 528, 5), mole(520, 690, 6), mole(372, 452, 4)].join("");
    case "stainCheek": return `<g filter="url(#wpd-soft)">` + blob("M360 520 C380 488 436 482 470 506 C500 528 492 566 470 590 C452 612 470 636 440 650 C410 664 380 640 368 610 C354 580 344 548 360 520 Z", "a23a52", 0.32)
      + blob("M392 540 C410 526 436 530 446 548 C452 566 432 580 414 576 C396 570 384 556 392 540 Z", "a23a52", 0.18) + "</g>";
    case "stainBrow": return `<g filter="url(#wpd-soft)">` + blob("M470 270 C510 254 570 258 606 278 C632 294 622 330 590 336 C560 342 548 366 516 372 C484 378 456 352 452 322 C448 298 452 280 470 270 Z", "a23a52", 0.3) + "</g>";
    case "patch": return `<g filter="url(#wpd-soft)">` + blob("M372 600 C384 572 420 566 446 584 C470 600 476 636 456 660 C434 684 396 682 380 660 C366 642 362 620 372 600 Z", mix(skin, "ffffff", 0.45), 0.7)
      + blob("M640 300 C660 288 690 292 700 312 C708 332 690 350 668 348 C646 344 630 320 640 300 Z", mix(skin, "ffffff", 0.45), 0.6) + "</g>";
    case "pocked": return [...scatter(18, 440, 560, 70, 46, 41), ...scatter(8, 680, 548, 34, 34, 43)]
      .map(([x, y, k]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(3.5 + 3 * k).toFixed(1)}" fill="#${mix(skin, "3a1a10", 0.35)}" fill-opacity="${(0.3 + 0.25 * k).toFixed(2)}"/>`
        + `<path d="M${(x - 3).toFixed(0)} ${(y + 3).toFixed(0)} Q${x.toFixed(0)} ${(y + 6).toFixed(0)} ${(x + 3).toFixed(0)} ${(y + 3).toFixed(0)}" stroke="#${mix(skin, "ffffff", 0.5)}" stroke-width="1.6" fill="none" stroke-opacity=".6"/>`).join("");
    case "wart": return `<circle cx="578" cy="552" r="10" fill="#${mix(skin, "5a3a20", 0.35)}"/><circle cx="575" cy="548" r="3.5" fill="#${mix(skin, "ffffff", 0.45)}"/>`;
    default: return "";
  }
}

/* ---- Scars ---- */
export const SCARS = {"": "None", cheek: "Across the cheek", brow: "Through the brow", lip: "Through the lip", forehead: "Across the forehead",
  chin: "On the chin", jaw: "Along the jaw", farCheek: "On the far cheek", claws: "Claw marks", nose: "Across the nose", burn: "A burn", cross: "Crossed cuts", stitched: "Stitched"};
const SCAR_PATHS = {
  cheek: ["M372 506 C400 540 440 584 470 612"], brow: ["M452 330 C460 360 470 392 476 420"], lip: ["M546 572 C550 596 556 620 560 642"],
  forehead: ["M468 268 C510 284 570 306 622 330"], chin: ["M534 712 C556 720 580 728 602 734"], jaw: ["M352 636 C376 664 404 692 432 714"],
  farCheek: ["M650 506 C664 528 684 552 700 576"], claws: ["M384 488 C404 530 430 572 452 604", "M410 482 C430 524 456 566 478 598", "M436 476 C456 518 482 560 504 592"],
  nose: ["M572 468 C584 476 598 484 612 492"], cross: ["M388 520 C410 552 438 586 462 612", "M380 600 C404 584 436 556 466 524"], stitched: ["M360 560 C390 586 430 612 476 640"]
};
function scars(kind, skin) {
  if ( !kind ) return "";
  const edge = mix(skin, "5a2020", 0.45), pale = mix(skin, "f6d6d0", 0.55);
  if ( kind === "burn" ) {
    return `<g filter="url(#wpd-soft)">` + blob("M352 560 C364 520 412 504 452 518 C494 532 506 576 494 616 C484 650 492 690 456 706 C420 722 380 700 362 668 C344 636 342 598 352 560 Z", mix(skin, "c8706a", 0.4), 0.75)
      + blob("M380 570 C394 546 428 542 448 560 C466 578 460 612 440 624 C418 636 388 626 380 604 C374 590 374 580 380 570 Z", pale, 0.7)
      + blob("M404 650 C414 638 436 640 442 656 C446 670 432 682 418 678 C404 674 398 662 404 650 Z", pale, 0.6) + "</g>"
      + ln("M352 560 C364 520 412 504 452 518 C494 532 506 576 494 616 C484 650 492 690 456 706 C420 722 380 700 362 668 C344 636 342 598 352 560 Z", {c: edge, o: 0.45, sw: 5})
      + ln("M392 600 C410 610 428 606 440 594", {c: edge, o: 0.5, sw: 4}) + ln("M372 640 C388 650 410 652 428 646", {c: edge, o: 0.45, sw: 4}) + ln("M460 560 C470 580 472 600 466 620", {c: edge, o: 0.4, sw: 4});
  }
  const out = [];
  for ( const d of SCAR_PATHS[kind] ?? [] ) out.push(ln(d, {c: edge, o: 0.35, sw: 20}), ln(d, {c: pale, o: 1, sw: 13}), ln(d, {o: 0.5, sw: 4}));
  if ( kind === "stitched" ) for ( const t of [0.15, 0.32, 0.5, 0.68, 0.85] ) {
    const x = 360 + 116 * t, y = 560 + 80 * t + 6 * Math.sin(Math.PI * t);
    out.push(ln(`M${(x - 10).toFixed(0)} ${(y + 16).toFixed(0)} L${(x + 10).toFixed(0)} ${(y - 16).toFixed(0)}`, {o: 0.75, sw: 5}));
  }
  return out.join("");
}

/* ---- Facial hair (Lorelei's two full beards stay; these are drawn here) ---- */
export const WHISKERS = {stubble: "Stubble", shadow: "Heavy stubble", pencil: "Thin moustache", chevron: "Moustache", walrus: "Walrus moustache",
  handlebar: "Handlebar moustache", horseshoe: "Horseshoe moustache", goatee: "Goatee", soul: "Tuft under the lip", chinstrap: "Chin strap",
  shortBeard: "Short beard", forked: "Forked beard", chops: "Side whiskers"};
const MOUSTACHE = {
  pencil: "M470 592 C510 580 560 576 600 578 C626 579 646 584 660 592 C640 588 610 586 580 588 C540 588 500 590 470 592 Z",
  chevron: "M452 604 C466 578 514 564 562 568 C606 564 648 572 668 598 C650 594 616 590 584 594 C560 584 540 586 528 594 C500 590 474 596 452 604 Z",
  walrus: "M440 626 C446 584 500 560 560 562 C616 558 664 574 680 616 C676 630 664 640 656 646 C650 626 630 614 606 612 C584 604 566 600 560 604 C548 600 528 604 512 612 C486 614 462 628 452 650 C444 646 438 636 440 626 Z",
  handlebar: "M456 600 C470 576 516 564 562 568 C606 564 646 572 664 594 C684 594 700 584 708 566 C716 590 700 610 676 612 C650 610 620 594 584 596 C560 588 540 590 528 596 C494 594 470 610 444 614 C420 614 406 596 412 572 C420 590 436 600 456 600 Z",
  horseshoe: "M452 604 C466 578 514 564 562 568 C606 564 648 572 668 598 C676 640 680 680 676 714 L654 716 C654 680 652 640 644 612 C620 600 590 596 562 598 C530 596 498 602 478 612 C468 640 466 680 468 718 L446 716 C442 680 444 640 452 604 Z"
};
/** The region a beard covers, before the mask keeps it to skin: sideburns, cheeks below the cheekbone, chin and under the jaw. */
const BEARD_LOW = "M320 468 L352 468 C354 528 380 588 436 624 C466 642 500 652 540 654 L600 654 C640 650 670 632 688 604 C704 574 710 526 712 468 L742 468 L742 640 C732 700 702 760 642 800 C600 822 520 824 468 808 C408 788 358 742 330 682 C318 632 314 552 320 468 Z";
const UPPER_LIP = "M456 606 C470 584 514 572 562 574 C606 572 648 580 668 604 C640 598 600 596 562 598 C524 596 488 600 456 606 Z";
const CHIN = "M516 660 C540 648 600 648 624 662 C630 702 608 748 570 756 C532 748 510 702 516 660 Z";
function whiskers(kind, hair, skin) {
  if ( !WHISKERS[kind] ) return "";
  const h = hair, out = [];
  if ( kind === "stubble" || kind === "shadow" ) {
    const o = kind === "shadow" ? 0.3 : 0.15, t = kind === "shadow" ? 0.85 : 0.5;
    for ( const d of [BEARD_LOW, UPPER_LIP] ) out.push(blob(d, h, o), `<path d="${d}" fill="url(#wpd-stubble)" fill-opacity="${t}"/>`);
    return out.join("");
  }
  if ( MOUSTACHE[kind] ) return blob(MOUSTACHE[kind], h) + ln(MOUSTACHE[kind], {o: 0.85, sw: 5});
  if ( kind === "goatee" ) return blob(CHIN, h) + ln(CHIN, {o: 0.6, sw: 5}) + blob(MOUSTACHE.chevron, h) + ln(MOUSTACHE.chevron, {o: 0.85, sw: 5});
  if ( kind === "soul" ) { const d = "M548 650 C556 642 576 642 584 650 C584 668 572 684 566 690 C560 684 548 668 548 650 Z"; return blob(d, h) + ln(d, {o: 0.7, sw: 4}); }
  if ( kind === "chinstrap" ) return `<path d="M334 520 C344 640 420 736 520 768 C560 780 600 778 640 762 C690 732 716 680 724 600" fill="none" stroke="#${h}" stroke-width="40" stroke-linecap="round"/>`;
  if ( kind === "shortBeard" || kind === "forked" ) {
    out.push(blob(BEARD_LOW, h), `<path d="${BEARD_LOW}" fill="url(#wpd-stubble)" fill-opacity=".6"/>`, blob(MOUSTACHE.chevron, h), ln(MOUSTACHE.chevron, {o: 0.85, sw: 5}));
    out.push(ln("M420 690 C434 720 456 746 484 764", {o: 0.3, sw: 4}), ln("M660 690 C650 722 632 746 606 764", {o: 0.3, sw: 4}), ln("M380 600 C390 630 404 656 420 676", {o: 0.25, sw: 4}));
    if ( kind === "forked" ) out.push(ln("M568 720 L570 806", {o: 0.6, sw: 6}));
    return out.join("");
  }
  if ( kind === "chops" ) {
    const L = "M316 468 L352 468 C356 530 380 590 420 630 C404 652 376 662 350 656 C330 600 318 540 316 468 Z", R = "M712 468 L742 468 L740 640 C726 652 708 654 696 648 C706 600 710 540 712 468 Z";
    return blob(L, h) + blob(R, h) + `<path d="${L}" fill="url(#wpd-stubble)" fill-opacity=".5"/>`;
  }
  return "";
}

/** The defs these parts use: one soft gradient (its colour set per use) and a stubble texture. */
function defs(hair) {
  const dot = mix(hair, "000000", 0.25);
  return `<filter id="wpd-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter><pattern id="wpd-stubble" patternUnits="userSpaceOnUse" width="14" height="14"><circle cx="3" cy="4" r="1.8" fill="#${dot}"/><circle cx="10" cy="9" r="1.6" fill="#${dot}"/><circle cx="6" cy="12" r="1.3" fill="#${dot}"/></pattern>`;
}
/** Gradients cannot take their colour from the element that uses them, so each soft patch gets its own. */
function softDefs(svg) {
  let n = 0, d = "";
  const out = svg.replace(/fill="url\(#wpd-glow\)"([^>]*?) data-c="([0-9a-f]{6})" data-o="([0-9.]+)"/g, (m, rest, c, o) => {
    const id = `wpd-glow${n++}`;
    d += `<radialGradient id="${id}"><stop offset="0" stop-color="#${c}" stop-opacity="${o}"/><stop offset=".7" stop-color="#${c}" stop-opacity="${(o * 0.45).toFixed(2)}"/><stop offset="1" stop-color="#${c}" stop-opacity="0"/></radialGradient>`;
    return `fill="url(#${id})"${rest}`;
  });
  return {svg: out, defs: d};
}

/**
 * Everything drawn on the skin for this face, in Lorelei's space, unmasked: age, cheeks, marks, scars and facial
 * hair, in that order (the beard over the scar). Returns {skin, defs}: wrap skin in the build and the skin mask.
 */
/** Modelling: a soft shadow towards the edges of the face and under the jaw, and light on the cheekbone and brow,
 * so the face reads as a head rather than a flat cartoon. */
function modelling(skin) {
  const dk = mix(skin, "2a1008", 0.6);
  return {defs: `<radialGradient id="wpd-model" cx="575" cy="455" r="360" gradientUnits="userSpaceOnUse"><stop offset=".52" stop-color="#${dk}" stop-opacity="0"/><stop offset=".8" stop-color="#${dk}" stop-opacity=".22"/><stop offset="1" stop-color="#${dk}" stop-opacity=".42"/></radialGradient>`
    + `<radialGradient id="wpd-lit"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
  svg: `<rect x="150" y="150" width="800" height="800" fill="url(#wpd-model)"/><ellipse cx="470" cy="515" rx="70" ry="42" fill="url(#wpd-lit)"/><ellipse cx="560" cy="380" rx="120" ry="36" fill="url(#wpd-lit)"/><ellipse cx="672" cy="505" rx="34" ry="30" fill="url(#wpd-lit)"/>`};
}
export function skinLayers(face, colors) {
  const md = modelling(colors.skin);
  const raw = md.svg + ageLines(face.age) + cheeks(face.cheeks, colors.skin) + marks(face.marks, colors.skin) + scars(face.scar, colors.skin) + whiskers(face.beard, colors.hair, colors.skin)
    + affliction(face.affliction, colors.skin, null).skin;
  const s = softDefs(raw);
  return {skin: s.svg, defs: defs(colors.hair) + md.defs + s.defs + EYE_DEFS};
}

/* ---- Eyes: the colour of the iris, and the strange ones ---- */
/** iris colour, pupil shape (round, slit, none), and a glow round the eye for the ones that shine. Natural ones first. */
export const EYES = {
  "3a2414": {label: "Dark brown"}, "5a3a22": {label: "Brown"}, "7a5232": {label: "Light brown"}, "a8742a": {label: "Amber"},
  "7a6a3a": {label: "Hazel"}, "4f7a4a": {label: "Green"}, "6e8070": {label: "Grey green"}, "7a8a9a": {label: "Grey"},
  "3b6aa8": {label: "Blue"}, "7aa2c8": {label: "Pale blue"}, "2a4a8a": {label: "Deep blue"},
  "b01818": {label: "Blood red", strange: true}, "e02020": {label: "Burning red", glow: "ff3020", strange: true},
  "d9a520": {label: "Cat's gold", pupil: "slit", strange: true}, "c8c020": {label: "Serpent yellow", pupil: "slit", glow: "e8e040", strange: true},
  "c87a10": {label: "Wolf amber", pupil: "slit", strange: true}, "7a3aa8": {label: "Violet", strange: true},
  "c8ccd0": {label: "Silver", strange: true}, "e8e6e0": {label: "Milky and blind", pupil: "none", strange: true},
  "0e0a08": {label: "Black", pupil: "none", strange: true}, "f4f6ff": {label: "White fire", pupil: "none", glow: "c8d8ff", strange: true},
  "40d060": {label: "Witch green", glow: "60ff80", strange: true}, "20a8c8": {label: "Drowned blue", glow: "60e0ff", strange: true}
};
export const EYES_NATURAL = Object.keys(EYES).filter(k => !EYES[k].strange);
/** The irises for the pupils found on the head (see fit-rules findEyes). Drawn in Lorelei's space. */
export function irises(found, key, {skip = []} = {}) {
  const e = EYES[key] ?? EYES["5a3a22"];
  if ( !found?.pupils?.length ) return "";
  return found.pupils.filter(p => !skip.includes(p.side)).map(({x, y, r}, i) => {
    const R = r * 0.82, f = v => v.toFixed(1);
    let s = "";
    if ( e.glow ) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.9)}" fill="#${e.glow}" fill-opacity=".45" filter="url(#wpd-glowblur)"/>`;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="#${key in EYES ? key : "5a3a22"}"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(R)}" fill="url(#wpd-irisshade)"/>`;
    if ( (e.pupil ?? "round") === "round" ) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 0.38)}" fill="#120a06"/>`;
    else if ( e.pupil === "slit" ) s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(r * 0.13)}" ry="${f(r * 0.66)}" fill="#120a06"/>`;
    if ( key !== "0e0a08" ) s += `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.32)}" r="${f(r * 0.17)}" fill="#fff" fill-opacity=".9"/>`;
    return s;
  }).join("");
}
export const EYE_DEFS = `<radialGradient id="wpd-irisshade"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient><filter id="wpd-glowblur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>`;

/* ---- Afflictions: faces marked by sickness, violence or something worse ---- */
export const AFFLICTIONS = {"": "None", pox: "Pox, the pustules", poxScars: "Pox scars", leprous: "Leprous nodules", boils: "Boils", sores: "Weeping sores",
  burned: "Burned down one side", mangled: "Mangled", lostEye: "An eye lost and sewn shut", eyepatch: "An eyepatch", warts: "Warts and growths",
  scaled: "Scales", thirdEye: "A third eye", veins: "Dark veins", mottled: "Mottled skin"};
/** What an affliction draws: skin (masked to the skin, found eyes not needed), head (masked to the skin, needs the
 * eyes found) and over (over everything on the head: the lost eye, the patch). */
export function affliction(kind, skin, found) {
  const out = {skin: "", over: "", head: ""};
  if ( !kind ) return out;
  const f = v => v.toFixed(0), dk = mix(skin, "2a1008", 0.5), lt = mix(skin, "ffffff", 0.45);
  const bump = (x, y, r, c, hl = true) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(1)}" fill="#${c}"/><circle cx="${f(x)}" cy="${f(y)}" r="${r.toFixed(1)}" fill="none" stroke="#${dk}" stroke-opacity=".5" stroke-width="2"/>` + (hl ? `<circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${(r * 0.3).toFixed(1)}" fill="#fff" fill-opacity=".55"/>` : "");
  const all = [...scatter(30, 450, 560, 110, 90, 61), ...scatter(14, 670, 540, 50, 70, 62), ...scatter(12, 560, 300, 110, 40, 63), ...scatter(10, 570, 700, 80, 40, 64)];
  const near = found?.eyes?.find(e => e.side === 0) ?? {x0: 405, y0: 420, x1: 540, y1: 500};
  switch ( kind ) {
    case "pox": out.skin = all.map(([x, y, k]) => bump(x, y, 5 + 5 * k, mix(skin, "e8d8a0", 0.35))).join("") + all.filter((_, i) => i % 2).map(([x, y]) => `<circle cx="${f(x + 9)}" cy="${f(y + 7)}" r="9" fill="#c04040" fill-opacity=".25"/>`).join(""); break;
    case "poxScars": out.skin = [...all, ...scatter(24, 440, 520, 90, 70, 65)].map(([x, y, k]) => `<circle cx="${f(x)}" cy="${f(y)}" r="${(4 + 5 * k).toFixed(1)}" fill="#${dk}" fill-opacity=".35"/><path d="M${f(x - 4)} ${f(y + 4)} Q${f(x)} ${f(y + 8)} ${f(x + 4)} ${f(y + 4)}" stroke="#${lt}" stroke-width="2" fill="none"/>`).join(""); break;
    case "leprous": out.skin = [[470, 300, 26], [560, 290, 30], [640, 310, 22], [420, 560, 30], [470, 610, 18], [690, 560, 22], [600, 545, 16], [530, 720, 24]]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="#${mix(skin, "a87060", 0.35)}"/><ellipse cx="${x - r * 0.25}" cy="${y - r * 0.3}" rx="${r * 0.45}" ry="${r * 0.3}" fill="#fff" fill-opacity=".3"/><ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="none" stroke="#${dk}" stroke-opacity=".45" stroke-width="3"/>`).join("")
      + `<g filter="url(#wpd-soft)">${blob("M380 400 C420 380 470 400 470 440 C470 470 430 480 400 470 C370 460 360 420 380 400 Z", lt, 0.5)}${blob("M640 620 C670 600 700 620 700 650 C700 680 660 690 640 670 Z", lt, 0.45)}</g>`; break;
    case "boils": out.skin = [[430, 590, 20], [612, 690, 16], [470, 320, 14], [690, 540, 13]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="#c04030" fill-opacity=".25" filter="url(#wpd-soft)"/>` + bump(x, y, r, mix(skin, "d04a30", 0.45)) + `<circle cx="${x}" cy="${y}" r="${r * 0.35}" fill="#e8d070"/>`).join(""); break;
    case "sores": out.skin = [[420, 600, 22, 14], [600, 700, 18, 11], [690, 520, 12, 16], [500, 300, 20, 10]]
      .map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx * 1.5}" ry="${ry * 1.6}" fill="#8a2a20" fill-opacity=".3" filter="url(#wpd-soft)"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#7a1a14"/><ellipse cx="${x - 3}" cy="${y - 2}" rx="${rx * 0.6}" ry="${ry * 0.5}" fill="#c8a040" fill-opacity=".7"/><path d="M${x} ${y + ry} q3 14 0 26" stroke="#c8b060" stroke-opacity=".6" stroke-width="4" fill="none" stroke-linecap="round"/>`).join(""); break;
    case "burned": out.skin = `<g filter="url(#wpd-soft)">${blob("M300 380 C360 340 470 350 520 400 C560 450 540 520 520 580 C500 650 520 720 470 770 C420 800 340 760 310 700 C280 620 270 460 300 380 Z", mix(skin, "b85a50", 0.45), 0.9)}`
      + `${blob("M340 430 C380 410 430 420 450 460 C470 500 440 540 400 540 C360 540 330 500 340 430 Z", mix(skin, "f0c8c0", 0.6), 0.8)}${blob("M360 600 C390 580 440 590 450 630 C460 670 420 700 390 690 C360 680 340 640 360 600 Z", mix(skin, "f0c8c0", 0.6), 0.75)}</g>`
      + ["M330 470 C360 490 400 492 440 480", "M340 560 C370 580 410 590 450 580", "M350 660 C380 676 420 680 460 670", "M470 420 C490 460 500 500 496 540"].map(d => ln(d, {c: dk, o: 0.45, sw: 4})).join(""); break;
    case "mangled": {
      const sc = d => ln(d, {c: dk, o: 0.4, sw: 18}) + ln(d, {c: mix(skin, "f0c8c0", 0.55), o: 1, sw: 11}) + ln(d, {o: 0.5, sw: 4});
      out.skin = `<g filter="url(#wpd-soft)">${blob("M360 520 C400 500 470 520 480 580 C490 640 440 680 400 670 C360 660 340 580 360 520 Z", mix(skin, "a84a50", 0.3), 0.6)}</g>`
        + sc("M350 470 L380 510 L366 540 L402 580 L392 610 L430 650") + sc("M456 618 C440 640 420 660 396 690") + sc("M520 300 L560 340 L548 360 L600 400") + sc("M640 520 L670 560 L660 590")
        + [0.2, 0.4, 0.6, 0.8].map(t => { const x = 456 - 60 * t, y = 618 + 72 * t; return ln(`M${f(x - 12)} ${f(y - 10)} L${f(x + 12)} ${f(y + 10)}`, {o: 0.75, sw: 4}); }).join("");
      break;
    }
    case "lostEye": {
      const cx = (near.x0 + near.x1) / 2, cy = (near.y0 + near.y1) / 2, rx = (near.x1 - near.x0) / 2 + 12, ry = (near.y1 - near.y0) / 2 + 12;
      out.over = `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#${skin}"/><ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="#${mix(skin, "6a2a2a", 0.3)}" fill-opacity=".5" filter="url(#wpd-soft)"/>`
        + ln(`M${f(cx - rx * 0.85)} ${f(cy + 4)} C${f(cx - rx * 0.3)} ${f(cy + 14)} ${f(cx + rx * 0.3)} ${f(cy + 14)} ${f(cx + rx * 0.85)} ${f(cy + 2)}`, {o: 0.8, sw: 6})
        + [-0.55, -0.2, 0.15, 0.5].map(t => ln(`M${f(cx + rx * t)} ${f(cy - 4)} L${f(cx + rx * t + 6)} ${f(cy + 24)}`, {o: 0.7, sw: 4})).join("")
        + ln(`M${f(cx - rx * 0.4)} ${f(cy - ry - 30)} L${f(cx + rx * 0.2)} ${f(cy + ry + 30)}`, {c: mix(skin, "f0c8c0", 0.55), o: 1, sw: 9});
      break;
    }
    case "eyepatch": {
      const cx = (near.x0 + near.x1) / 2, cy = (near.y0 + near.y1) / 2, rx = (near.x1 - near.x0) / 2 + 18, ry = (near.y1 - near.y0) / 2 + 20;
      // The strap runs under the skin mask, so it goes from sight under the hair and past the edge of the face
      const strap = d => `<path d="${d}" stroke="#2a1a10" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#4a3022" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      out.head = strap(`M${f(cx - rx * 0.9)} ${f(cy - 4)} L${f(cx - rx - 200)} ${f(cy + 50)}`) + strap(`M${f(cx + rx * 0.5)} ${f(cy - ry * 0.85)} L${f(cx + rx + 160)} ${f(cy - 420)}`);
      out.over = `<path d="M${f(cx - rx)} ${f(cy - ry * 0.6)} C${f(cx - rx * 0.4)} ${f(cy - ry * 1.1)} ${f(cx + rx * 0.6)} ${f(cy - ry * 1.1)} ${f(cx + rx)} ${f(cy - ry * 0.5)} C${f(cx + rx * 1.05)} ${f(cy + ry * 0.6)} ${f(cx + rx * 0.2)} ${f(cy + ry * 1.2)} ${f(cx - rx * 0.4)} ${f(cy + ry * 0.9)} C${f(cx - rx * 0.9)} ${f(cy + ry * 0.6)} ${f(cx - rx * 1.05)} ${f(cy)} ${f(cx - rx)} ${f(cy - ry * 0.6)} Z" fill="#2e2018" stroke="#120a06" stroke-width="6"/>`
        + `<path d="M${f(cx - rx * 0.6)} ${f(cy - ry * 0.4)} C${f(cx - rx * 0.2)} ${f(cy - ry * 0.7)} ${f(cx + rx * 0.3)} ${f(cy - ry * 0.7)} ${f(cx + rx * 0.6)} ${f(cy - ry * 0.4)}" stroke="#6a5040" stroke-width="4" fill="none"/>`;
      break;
    }
    case "warts": out.skin = [[600, 520, 11], [612, 534, 6], [440, 640, 14], [700, 500, 10], [560, 730, 12], [380, 470, 9], [520, 300, 13]].map(([x, y, r]) => bump(x, y, r, mix(skin, "6a5030", 0.4))).join("")
      + `<path d="M440 640 l-6 -18 M444 636 l4 -20" stroke="#2a1a10" stroke-width="2"/>`; break;
    case "scaled": {
      let s = "";
      for ( let row = 0; row < 7; row++ ) for ( let col = 0; col < 6; col++ ) {
        const x = 340 + col * 26 + (row % 2) * 13, y = 420 + row * 22;
        if ( (x - 400) ** 2 / 90 ** 2 + (y - 490) ** 2 / 90 ** 2 > 1 ) continue;
        s += `<path d="M${x - 13} ${y} Q${x} ${y + 22} ${x + 13} ${y}" fill="#${mix(skin, "4a7050", 0.5)}" stroke="#${mix(skin, "1a2a18", 0.7)}" stroke-opacity=".75" stroke-width="2.5"/>`;
      }
      for ( let row = 0; row < 4; row++ ) for ( let col = 0; col < 4; col++ ) { const x = 640 + col * 22 + (row % 2) * 11, y = 600 + row * 20; s += `<path d="M${x - 11} ${y} Q${x} ${y + 19} ${x + 11} ${y}" fill="#${mix(skin, "4a7050", 0.5)}" stroke="#${mix(skin, "1a2a18", 0.7)}" stroke-opacity=".75" stroke-width="2.5"/>`; }
      out.skin = s; break;
    }
    case "thirdEye": out.skin = `<path d="M560 268 C540 300 540 340 560 372 C580 340 580 300 560 268 Z" fill="#fff" stroke="#2a1a10" stroke-width="7"/><ellipse cx="560" cy="322" rx="11" ry="24" fill="#b01818"/><ellipse cx="560" cy="322" rx="4" ry="16" fill="#120a06"/>`; break;
    case "veins": out.skin = ["M330 420 C360 450 352 490 380 520 C392 540 410 548 420 580", "M352 490 C330 500 322 520 330 548", "M600 260 C590 290 610 310 600 340", "M600 300 C620 310 640 300 650 320",
      "M700 470 C690 500 700 530 690 560", "M520 690 C540 720 530 750 550 780", "M540 720 C520 735 500 740 486 760"].map(d => ln(d, {c: "3a1a4a", o: 0.55, sw: 5}) + ln(d, {c: "5a2a6a", o: 0.35, sw: 11})).join(""); break;
    case "mottled": out.skin = `<g filter="url(#wpd-soft)">${scatter(16, 520, 520, 220, 260, 77).map(([x, y, k]) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(20 + 30 * k)}" ry="${f(16 + 22 * k)}" fill="#${k > 0.5 ? mix(skin, "6a4a70", 0.35) : mix(skin, "ffffff", 0.35)}" fill-opacity=".55"/>`).join("")}</g>`; break;
  }
  return out;
}

/* ---- Lips, and features that show against the skin ---- */
/** Lip colours. "" is the character's own, from the skin. */
export const LIPS = {"": "Their own", "b0505a": "Rose", "8e2a3a": "Berry", "a8202a": "Deep red", "6e2a4a": "Plum", "c8604a": "Coral",
  "7a4232": "Brown", "4a2222": "Dark", "c8a8a8": "Pale and bloodless", "2a1a2a": "Blackened"};
const relLum = h => { const c = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
/** The contrast of two colours, 1 (the same) to 21 (black on white). */
export const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
/** How much each feature must stand out from the skin. */
export const NEED = {lips: 2.0, brows: 2.2, nose: 1.8};
/**
 * A colour for a feature that shows against this skin: the wanted colour moved the least it must go, darker or (for
 * lips and the nose, on darker skin) lighter, until it stands out enough. Returns {c, ratio, light}.
 */
export function showing(want, skin, kind) {
  const need = NEED[kind] ?? 1.6, dark = {lips: "3a0a12", nose: "2a1008"}[kind] ?? "0a0604";
  const walk = to => { for ( let t = 0; t <= 1.0001; t += 0.04 ) { const c = mix(want, to, t); if ( contrast(c, skin) >= need ) return {c, t}; } return null; };
  const d = walk(dark), l = kind === "brows" ? null : walk(kind === "lips" ? "f0b0b0" : mix(skin, "ffffff", 0.75));
  const best = d && l ? (l.t < d.t ? {...l, light: true} : {...d, light: false}) : d ? {...d, light: false} : l ? {...l, light: true} : {c: mix(want, dark, 1), light: false};
  return {c: best.c, ratio: contrast(best.c, skin), light: best.light};
}
