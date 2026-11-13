/**
 * WoDX Paperdoll: rarer skins (13 November 2026, B3051). Ben asked for more skin tones and fantastical ones. Anyone may
 * have one of these rare skins; a demon's visage may take one of the apocalyptic colours below. A fae mien's colour is
 * rolled in face64-rules.mjs (FAE_SKINS) and shows to fae sight only.
 */
import {table} from "./face64-kit.mjs";

const PALE = [250, 238, 232];

/* ---------------- Anyone ---------------- */
table("all", "s", [
  ["albino", "Skin", "Albinism: pale skin, white hair, pink-tinted eyes", [["skin", [250, 236, 230], 0.75], ["hair", [244, 240, 232], 0.85], ["eyec", [210, 140, 150]]]],
  ["vitiligo-cheek", "Skin", "Pale vitiligo patches on the cheek and brow", [["t", "cheekL", 3, 2, PALE, 0.6], ["t", "foreR", 2, 2, PALE, 0.6]]],
  ["vitiligo-eyes", "Skin", "Pale vitiligo round the eyes and mouth", [["t", "underR", 3, 2, PALE, 0.6], ["t", [32, 46], 3, 1, PALE, 0.55]]],
  ["vitiligo-neck", "Skin", "Pale vitiligo on the jaw and neck", [["t", "jawL", 3, 2, PALE, 0.6], ["t", "neckR", 3, 2, PALE, 0.6]]],
  ["blue-grey", "Skin", "Blue-grey skin, from silver taken as medicine", [["skin", [140, 156, 176], 0.4]]],
  ["jaundice", "Skin", "A yellow, jaundiced cast", [["skin", [220, 200, 110], 0.3]]],
  ["ruddy", "Skin", "A ruddy, weather-red face", [["skin", [210, 110, 90], 0.25]]],
  ["ashen", "Skin", "An ashen, sickly grey", [["skin", [170, 170, 166], 0.4]]],
  ["sunburnt", "Skin", "Sunburnt across the nose and cheeks", [["t", "nose", 3, 2, [220, 100, 80], 0.4], ["t", "cheekL", 2, 1, [220, 100, 80], 0.35], ["t", "cheekR", 2, 1, [220, 100, 80], 0.35]]],
  ["port-cheek", "Skin", "A wide wine-coloured birthmark across the cheek", [["t", "cheekR", 4, 4, [150, 50, 80], 0.45]]],
]);

/* ---------------- A demon's visage (shown only in the apocalyptic form) ---------------- */
table("demon", "dv", [
  ["obsidian", "Visage Skin", "Visage skin of black glass", [["skin", [40, 36, 48], 0.75]], {state: "visage"}],
  ["gold", "Visage Skin", "Visage skin of burnished gold", [["skin", [220, 180, 80], 0.65]], {state: "visage"}],
  ["pearl", "Visage Skin", "Visage skin of shining pearl", [["skin", [240, 236, 244], 0.7]], {state: "visage"}],
  ["blood", "Visage Skin", "Visage skin red as blood", [["skin", [170, 30, 40], 0.6]], {state: "visage"}],
  ["ash", "Visage Skin", "Visage skin of grey ash", [["skin", [120, 116, 112], 0.6]], {state: "visage"}],
  ["sky", "Visage Skin", "Visage skin the blue of the sky", [["skin", [110, 160, 230], 0.6]], {state: "visage"}],
  ["verdigris", "Visage Skin", "Visage skin of green bronze", [["skin", [90, 160, 130], 0.6]], {state: "visage"}],
  ["violet", "Visage Skin", "Visage skin of deep violet", [["skin", [110, 60, 150], 0.6]], {state: "visage"}],
  ["silver", "Visage Skin", "Visage skin of bright silver", [["skin", [210, 214, 226], 0.65]], {state: "visage"}],
  ["bronze", "Visage Skin", "Visage skin of dark bronze", [["skin", [150, 100, 50], 0.65]], {state: "visage"}],
  ["ember", "Visage Skin", "Visage skin like a banked ember", [["skin", [210, 90, 30], 0.6]], {state: "visage"}],
  ["bone", "Visage Skin", "Visage skin white as bone", [["skin", [232, 224, 200], 0.65]], {state: "visage"}],
  ["storm", "Visage Skin", "Visage skin of storm-cloud grey", [["skin", [90, 100, 120], 0.6]], {state: "visage"}],
  ["sea", "Visage Skin", "Visage skin of sea green", [["skin", [60, 140, 140], 0.6]], {state: "visage"}],
  ["night", "Visage Skin", "Visage skin of starless blue-black", [["skin", [24, 30, 60], 0.7]], {state: "visage"}],
]);
