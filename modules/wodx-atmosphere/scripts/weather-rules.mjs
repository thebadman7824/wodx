/**
 * WoDX Atmosphere: the weather generator and lighting from the clock. Pure: no Foundry calls, so the harness can test it.
 *
 * One day's weather comes from the chronicle's seed, the climate and the day (its Julian Day Number), so the same seed
 * gives the same weather on the same day every time, and a day can be looked at again weeks later. Seasons follow the
 * sun (the astronomical, proleptic Gregorian month), not the Julian calendar's drifting month names.
 *
 *   Wet days     a two-state chain over the last fortnight, so rain comes in spells, with each month's share of wet days
 *   Temperature  the month's normal, the era's shift (the medieval warm spell, the Little Ice Age, the Maunder low,
 *                1816, today's warming and the warmer Future Darkness) and a slow wander of a few degrees
 *   The rest     snow or sleet when it is cold enough at night, storms and hail by season, fog on still nights, wind,
 *                snow lying on the ground after cold days
 *
 * Climate figures are rounded long-run averages for a typical city in each region, written for play, not research.
 * 0.14.0: climates for the whole world, north and south of the equator; each world region names its own.
 */
import {stream, hash128} from "../../wodx-chronicle/scripts/gen-core.mjs";
import {jdnToGregorian, gregorianToJDN} from "../../wodx-chronicle/scripts/calendar-math.mjs";
import {regionOf} from "../../wodx-chronicle/scripts/world-rules.mjs";

/* ------------------------------------------------------------------ */
/*  Climates                                                           */
/* ------------------------------------------------------------------ */

/**
 * t: mean daily temperature by month (°C), range: day to night swing, wet: share of days with rain or snow,
 * storm: share of wet days that are storms, fog: chance of fog on a dry still day.
 */
export const CLIMATES = {
  "central-europe": {
    label: "Central Europe (Bohemia, the German lands, Austria)",
    t: [-1, 0, 4, 9, 14, 17, 19, 18, 14, 9, 4, 0], range: 8,
    wet: [0.4, 0.37, 0.38, 0.37, 0.42, 0.43, 0.42, 0.4, 0.35, 0.35, 0.4, 0.42],
    storm: [0.04, 0.04, 0.05, 0.06, 0.12, 0.2, 0.25, 0.2, 0.08, 0.05, 0.05, 0.05],
    fog: [0.25, 0.2, 0.12, 0.06, 0.05, 0.05, 0.05, 0.07, 0.12, 0.25, 0.35, 0.3]
  },
  "maritime-europe": {
    label: "Atlantic Europe (Britain, Ireland, northern France, the Low Countries)",
    t: [5, 5, 7, 9, 13, 16, 18, 18, 15, 12, 8, 6], range: 7,
    wet: [0.52, 0.45, 0.45, 0.42, 0.42, 0.4, 0.38, 0.42, 0.44, 0.5, 0.52, 0.52],
    storm: [0.15, 0.14, 0.1, 0.06, 0.06, 0.08, 0.1, 0.1, 0.08, 0.12, 0.15, 0.16],
    fog: [0.2, 0.18, 0.12, 0.08, 0.06, 0.05, 0.05, 0.07, 0.12, 0.22, 0.25, 0.22]
  },
  "mediterranean": {
    label: "The Mediterranean (Italy, Iberia, Greece, the Levant)",
    t: [8, 9, 11, 14, 18, 22, 25, 25, 22, 17, 12, 9], range: 10,
    wet: [0.3, 0.28, 0.27, 0.25, 0.18, 0.1, 0.06, 0.08, 0.17, 0.27, 0.32, 0.32],
    storm: [0.1, 0.1, 0.08, 0.08, 0.12, 0.15, 0.2, 0.25, 0.25, 0.2, 0.15, 0.1],
    fog: [0.08, 0.07, 0.05, 0.04, 0.03, 0.02, 0.02, 0.03, 0.05, 0.08, 0.1, 0.1]
  },
  "northern-europe": {
    label: "The North (Scandinavia, the Baltic, Novgorod)",
    t: [-4, -4, 0, 5, 11, 15, 18, 16, 11, 6, 1, -2], range: 7,
    wet: [0.42, 0.37, 0.34, 0.3, 0.3, 0.33, 0.35, 0.38, 0.38, 0.42, 0.45, 0.45],
    storm: [0.08, 0.07, 0.05, 0.04, 0.06, 0.1, 0.14, 0.12, 0.08, 0.08, 0.08, 0.08],
    fog: [0.15, 0.12, 0.1, 0.08, 0.06, 0.05, 0.05, 0.08, 0.12, 0.18, 0.2, 0.18]
  },
  "american-east": {
    label: "Eastern North America (New England, New York, the Ohio valley)",
    t: [-1, 0, 4, 10, 16, 21, 24, 23, 19, 13, 7, 2], range: 9,
    wet: [0.37, 0.34, 0.37, 0.37, 0.38, 0.35, 0.33, 0.32, 0.3, 0.3, 0.34, 0.37],
    storm: [0.06, 0.06, 0.08, 0.1, 0.15, 0.22, 0.25, 0.22, 0.14, 0.08, 0.06, 0.06],
    fog: [0.08, 0.08, 0.08, 0.08, 0.08, 0.07, 0.07, 0.08, 0.1, 0.12, 0.1, 0.08]
  },
  "great-plains": {
    label: "The Great Plains (Kansas, the Dakotas, the cattle trails)",
    t: [-1, 1, 7, 13, 18, 24, 27, 26, 21, 14, 7, 1], range: 13,
    wet: [0.15, 0.18, 0.25, 0.3, 0.35, 0.33, 0.28, 0.27, 0.25, 0.2, 0.17, 0.15],
    storm: [0.05, 0.08, 0.15, 0.28, 0.38, 0.4, 0.35, 0.3, 0.22, 0.12, 0.06, 0.05],
    fog: [0.05, 0.05, 0.04, 0.03, 0.03, 0.02, 0.02, 0.03, 0.04, 0.05, 0.05, 0.05]
  },
  "desert": {
    label: "The desert Southwest (Arizona, New Mexico, the Sonoran borderlands)",
    t: [9, 11, 14, 18, 23, 29, 31, 30, 27, 20, 13, 9], range: 16,
    wet: [0.12, 0.12, 0.1, 0.05, 0.04, 0.05, 0.3, 0.3, 0.15, 0.08, 0.08, 0.12],
    storm: [0.05, 0.05, 0.05, 0.05, 0.1, 0.3, 0.5, 0.5, 0.35, 0.1, 0.05, 0.05],
    fog: [0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.02, 0.02]
  },
  "steppe": {
    label: "The Russian plain and the steppe (Moscow, Kiev, Kazan)",
    t: [-8, -7, -2, 6, 13, 17, 19, 17, 11, 5, -1, -6], range: 8,
    wet: [0.45, 0.4, 0.35, 0.33, 0.35, 0.4, 0.4, 0.38, 0.38, 0.4, 0.45, 0.47],
    storm: [0.03, 0.03, 0.03, 0.05, 0.12, 0.2, 0.22, 0.18, 0.08, 0.04, 0.03, 0.03],
    fog: [0.1, 0.1, 0.08, 0.06, 0.05, 0.05, 0.05, 0.07, 0.1, 0.14, 0.14, 0.12]
  },
  "inner-asia": {
    label: "Inner Asia and the Persian plateau (Samarkand, Isfahan, Kashgar)",
    t: [0, 3, 9, 16, 21, 26, 28, 26, 21, 14, 8, 3], range: 13,
    wet: [0.3, 0.3, 0.35, 0.3, 0.2, 0.08, 0.03, 0.02, 0.04, 0.12, 0.2, 0.27],
    storm: [0.03, 0.03, 0.06, 0.1, 0.12, 0.1, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03],
    fog: [0.1, 0.08, 0.04, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.03, 0.06, 0.1]
  },
  "hot-desert": {
    label: "The hot desert (Cairo, Baghdad, Mecca)",
    t: [14, 15, 18, 22, 26, 29, 30, 30, 28, 24, 19, 15], range: 13,
    wet: [0.05, 0.04, 0.03, 0.02, 0.01, 0.005, 0.005, 0.005, 0.005, 0.01, 0.03, 0.05],
    storm: [0.1, 0.1, 0.1, 0.12, 0.12, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
    fog: [0.08, 0.06, 0.04, 0.02, 0.01, 0.01, 0.01, 0.02, 0.03, 0.05, 0.07, 0.08]
  },
  "monsoon": {
    label: "The monsoon plains (Delhi, Lahore, the Ganges)",
    t: [14, 17, 23, 29, 33, 34, 31, 30, 29, 26, 20, 15], range: 11,
    wet: [0.07, 0.07, 0.06, 0.04, 0.08, 0.2, 0.5, 0.5, 0.25, 0.05, 0.02, 0.04],
    storm: [0.1, 0.1, 0.15, 0.25, 0.35, 0.4, 0.35, 0.3, 0.25, 0.15, 0.05, 0.05],
    fog: [0.3, 0.15, 0.03, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.1, 0.25]
  },
  "tropical-seasonal": {
    label: "The seasonal tropics (Ayutthaya, Angkor, Hanoi's summers)",
    t: [26, 28, 29, 30, 30, 29, 29, 28, 28, 28, 27, 26], range: 9,
    wet: [0.03, 0.07, 0.1, 0.2, 0.5, 0.55, 0.6, 0.65, 0.7, 0.55, 0.2, 0.05],
    storm: [0.2, 0.2, 0.25, 0.35, 0.35, 0.3, 0.3, 0.3, 0.3, 0.3, 0.2, 0.15],
    fog: [0.04, 0.03, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.02, 0.03, 0.04, 0.05]
  },
  "tropical-wet": {
    label: "The wet tropics (Java, Malacca, the Congo, the Amazon)",
    t: [26, 27, 27, 27, 27, 27, 27, 27, 27, 27, 26, 26], range: 8,
    wet: [0.6, 0.55, 0.5, 0.5, 0.45, 0.4, 0.35, 0.35, 0.4, 0.5, 0.6, 0.65],
    storm: [0.4, 0.4, 0.4, 0.4, 0.35, 0.3, 0.3, 0.3, 0.35, 0.4, 0.4, 0.4],
    fog: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
  },
  "east-asia-humid": {
    label: "The warm east of Asia (the Yangtze, Kyoto, Edo)",
    t: [5, 6, 10, 15, 20, 23, 27, 28, 24, 18, 13, 7], range: 8,
    wet: [0.25, 0.3, 0.38, 0.38, 0.38, 0.45, 0.38, 0.33, 0.38, 0.3, 0.25, 0.2],
    storm: [0.03, 0.03, 0.06, 0.1, 0.15, 0.2, 0.3, 0.35, 0.35, 0.15, 0.05, 0.03],
    fog: [0.12, 0.12, 0.1, 0.08, 0.06, 0.06, 0.04, 0.03, 0.05, 0.08, 0.1, 0.12]
  },
  "north-east-asia": {
    label: "The cold east of Asia (Beijing, Seoul, Manchuria)",
    t: [-3, 0, 6, 14, 20, 25, 27, 26, 20, 13, 5, -1], range: 11,
    wet: [0.07, 0.1, 0.13, 0.17, 0.22, 0.35, 0.45, 0.4, 0.25, 0.17, 0.12, 0.07],
    storm: [0.02, 0.02, 0.05, 0.1, 0.2, 0.3, 0.35, 0.3, 0.15, 0.05, 0.02, 0.02],
    fog: [0.1, 0.1, 0.06, 0.04, 0.03, 0.03, 0.05, 0.06, 0.08, 0.1, 0.12, 0.12]
  },
  "savanna": {
    label: "The Sahel and the savanna (Timbuktu, Kano, Niani)",
    t: [22, 25, 29, 32, 33, 31, 28, 27, 28, 29, 26, 22], range: 13,
    wet: [0.005, 0.005, 0.01, 0.03, 0.1, 0.25, 0.4, 0.5, 0.3, 0.06, 0.005, 0.005],
    storm: [0.2, 0.2, 0.3, 0.4, 0.45, 0.45, 0.4, 0.35, 0.35, 0.3, 0.2, 0.2],
    fog: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
  },
  "east-african-coast": {
    label: "The East African coast (Mombasa, Zanzibar, Kilwa)",
    t: [28, 28, 28, 27, 26, 25, 24, 24, 25, 26, 27, 28], range: 7,
    wet: [0.15, 0.1, 0.25, 0.5, 0.5, 0.3, 0.3, 0.3, 0.3, 0.35, 0.4, 0.3],
    storm: [0.15, 0.15, 0.2, 0.2, 0.15, 0.1, 0.1, 0.1, 0.1, 0.15, 0.2, 0.2],
    fog: [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02]
  },
  "southern-africa": {
    label: "Southern Africa (the Highveld, Natal, the Cape's hinterland)",
    t: [21, 21, 20, 17, 14, 11, 11, 13, 17, 19, 20, 21], range: 13,
    wet: [0.45, 0.38, 0.35, 0.2, 0.08, 0.04, 0.03, 0.05, 0.1, 0.25, 0.4, 0.45],
    storm: [0.4, 0.4, 0.35, 0.25, 0.1, 0.05, 0.05, 0.05, 0.15, 0.3, 0.4, 0.4],
    fog: [0.03, 0.03, 0.04, 0.05, 0.06, 0.06, 0.06, 0.05, 0.04, 0.03, 0.03, 0.03]
  },
  "highland-tropics": {
    label: "The tropical highlands (Mexico City, Addis Ababa, Guatemala)",
    t: [13, 15, 17, 18, 19, 18, 17, 17, 17, 16, 14, 13], range: 14,
    wet: [0.05, 0.06, 0.1, 0.25, 0.45, 0.65, 0.75, 0.75, 0.65, 0.35, 0.12, 0.06],
    storm: [0.1, 0.1, 0.15, 0.25, 0.35, 0.4, 0.4, 0.4, 0.35, 0.25, 0.1, 0.1],
    fog: [0.05, 0.05, 0.04, 0.04, 0.04, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]
  },
  "andes": {
    label: "The Andes (Cuzco, Quito, Potosí)",
    t: [12, 12, 12, 12, 11, 10, 10, 11, 12, 13, 13, 13], range: 15,
    wet: [0.6, 0.55, 0.5, 0.3, 0.1, 0.05, 0.05, 0.08, 0.2, 0.3, 0.4, 0.5],
    storm: [0.25, 0.25, 0.2, 0.15, 0.05, 0.05, 0.05, 0.05, 0.1, 0.15, 0.2, 0.25],
    fog: [0.06, 0.06, 0.06, 0.05, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05, 0.05, 0.06]
  },
  "caribbean": {
    label: "The Caribbean (Havana, Kingston, Santo Domingo)",
    t: [25, 25, 26, 27, 27, 28, 28, 28, 28, 27, 26, 25], range: 7,
    wet: [0.3, 0.25, 0.2, 0.25, 0.4, 0.45, 0.45, 0.5, 0.55, 0.55, 0.45, 0.35],
    storm: [0.05, 0.05, 0.05, 0.08, 0.15, 0.2, 0.25, 0.3, 0.35, 0.3, 0.15, 0.08],
    fog: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
  },
  "brazil-coast": {
    label: "The Brazilian coast (Salvador, Rio de Janeiro)",
    t: [27, 27, 26, 25, 23, 22, 21, 22, 22, 23, 25, 26], range: 7,
    wet: [0.4, 0.35, 0.4, 0.35, 0.3, 0.25, 0.22, 0.22, 0.3, 0.38, 0.42, 0.45],
    storm: [0.3, 0.3, 0.25, 0.12, 0.08, 0.05, 0.05, 0.05, 0.1, 0.15, 0.25, 0.3],
    fog: [0.03, 0.03, 0.03, 0.03, 0.04, 0.04, 0.04, 0.04, 0.03, 0.03, 0.03, 0.03]
  },
  "australia-southeast": {
    label: "South-eastern Australia (Sydney, Melbourne)",
    t: [23, 23, 21, 19, 16, 13, 12, 14, 16, 18, 20, 22], range: 8,
    wet: [0.35, 0.38, 0.4, 0.35, 0.35, 0.35, 0.3, 0.28, 0.3, 0.33, 0.35, 0.33],
    storm: [0.25, 0.22, 0.18, 0.1, 0.06, 0.05, 0.05, 0.05, 0.08, 0.15, 0.2, 0.25],
    fog: [0.02, 0.03, 0.05, 0.08, 0.1, 0.1, 0.1, 0.07, 0.04, 0.03, 0.02, 0.02]
  },
  "aotearoa": {
    label: "Aotearoa New Zealand (Wellington, Auckland, Otago)",
    t: [18, 18, 17, 14, 12, 10, 9, 10, 11, 13, 15, 17], range: 7,
    wet: [0.3, 0.3, 0.35, 0.38, 0.45, 0.5, 0.5, 0.48, 0.42, 0.42, 0.38, 0.35],
    storm: [0.08, 0.08, 0.1, 0.12, 0.15, 0.18, 0.18, 0.16, 0.14, 0.12, 0.1, 0.08],
    fog: [0.03, 0.04, 0.05, 0.07, 0.08, 0.08, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03]
  },
  "pacific-islands": {
    label: "The Pacific islands (Hawaiʻi, Tahiti, Samoa)",
    t: [23, 23, 24, 24, 25, 26, 27, 27, 27, 26, 25, 24], range: 6,
    wet: [0.35, 0.3, 0.3, 0.3, 0.25, 0.2, 0.25, 0.25, 0.25, 0.3, 0.35, 0.38],
    storm: [0.08, 0.08, 0.08, 0.06, 0.05, 0.05, 0.05, 0.06, 0.08, 0.08, 0.08, 0.08],
    fog: [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01]
  },
  "boreal": {
    label: "The northern forest (Irkutsk, Montréal, Winnipeg)",
    t: [-15, -12, -5, 4, 11, 17, 20, 18, 11, 3, -5, -12], range: 11,
    wet: [0.35, 0.3, 0.3, 0.3, 0.33, 0.37, 0.4, 0.4, 0.37, 0.35, 0.37, 0.37],
    storm: [0.02, 0.02, 0.02, 0.03, 0.06, 0.1, 0.12, 0.1, 0.05, 0.03, 0.02, 0.02],
    fog: [0.06, 0.06, 0.06, 0.06, 0.05, 0.05, 0.05, 0.07, 0.1, 0.1, 0.08, 0.06]
  },
  "high-plateau": {
    label: "The high plateau (Lhasa, Leh, the Himalayan valleys)",
    t: [-1, 2, 6, 9, 13, 17, 17, 16, 14, 9, 4, 0], range: 15,
    wet: [0.03, 0.04, 0.06, 0.1, 0.2, 0.4, 0.55, 0.55, 0.4, 0.1, 0.03, 0.02],
    storm: [0.01, 0.01, 0.02, 0.04, 0.08, 0.14, 0.18, 0.16, 0.1, 0.03, 0.01, 0.01],
    fog: [0.02, 0.02, 0.02, 0.02, 0.02, 0.03, 0.04, 0.04, 0.03, 0.02, 0.02, 0.02]
  },
  "polar": {
    label: "The Arctic coast (Nuuk, Longyearbyen, the northern ice)",
    t: [-9, -9, -8, -4, 1, 5, 7, 6, 3, -1, -5, -8], range: 6,
    wet: [0.35, 0.35, 0.35, 0.33, 0.33, 0.33, 0.37, 0.4, 0.42, 0.4, 0.4, 0.37],
    storm: [0.1, 0.1, 0.08, 0.06, 0.04, 0.03, 0.03, 0.04, 0.06, 0.08, 0.1, 0.1],
    fog: [0.05, 0.05, 0.06, 0.08, 0.12, 0.18, 0.2, 0.16, 0.1, 0.06, 0.05, 0.05]
  },
  "antarctic": {
    label: "The southern ice (Ross Island, the Peninsula)",
    t: [-3, -9, -18, -21, -23, -23, -26, -27, -25, -19, -10, -3], range: 6,
    wet: [0.25, 0.3, 0.3, 0.28, 0.28, 0.28, 0.25, 0.25, 0.25, 0.25, 0.22, 0.22],
    storm: [0.06, 0.1, 0.14, 0.16, 0.18, 0.18, 0.18, 0.18, 0.16, 0.14, 0.1, 0.06],
    fog: [0.06, 0.06, 0.05, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.05, 0.06, 0.06]
  }
};
export const DEFAULT_CLIMATE = "central-europe";

/** The climate a part of the world starts with, or a world region's own (world-rules.mjs) when its id is given. */
export function climateForRegion(region) {
  const own = regionOf(region)?.climate;
  if ( own && CLIMATES[own] ) return own;
  return region === "americas" ? "american-east" : DEFAULT_CLIMATE;
}

/**
 * How much warmer or colder an era runs than the 20th-century normal (°C), and how much stormier. Rounded figures from
 * the climate history of Europe and North America: the medieval warm spell, the Little Ice Age (deepest in the Maunder
 * low), the year without a summer (1816), and the warming since 1980. Past 2025 the trend goes on, for Future Darkness.
 */
export function eraShift(year, month = 7) {
  const y = Number(year) || 1900;
  let t = 0, storms = 1;
  if ( y < 1300 ) t = 0.3;
  else if ( y < 1850 ) t = (y >= 1645 && y <= 1715) ? -1.0 : -0.5;
  else if ( y < 1980 ) t = 0;
  else if ( y <= 2025 ) t = 0.7;
  else { t = Math.min(3, 0.7 + (y - 2025) * 0.03); storms = 1.3; }
  if ( y === 1816 && month >= 5 && month <= 9 ) t -= 2.5;
  return {t, storms};
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                      */
/* ------------------------------------------------------------------ */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round1 = v => Math.round(v * 10) / 10;

/** The astronomical month (1 to 12) and day of the year for a JDN. */
export function seasonOf(jdn) {
  const g = jdnToGregorian(jdn);
  return {month: g.month, dayOfYear: jdn - gregorianToJDN(g.year, 1, 1) + 1, year: g.year};
}

/** A month's figure eased toward the next one, so the seasons turn smoothly through the month. */
function monthly(list, jdn) {
  const g = jdnToGregorian(jdn);
  const i = g.month - 1;
  const f = (g.day - 1) / 30;
  // Each month's figure sits at mid-month; blend with the neighbour on the near side
  const j = f < 0.5 ? (i + 11) % 12 : (i + 1) % 12;
  const w = f < 0.5 ? (0.5 - f) : (f - 0.5);
  return list[i] * (1 - w) + list[j] * w;
}

/** Smooth value noise over days: knots every day, eased between, in [0, 1). */
function noise(seed, key, x) {
  const k = Math.floor(x), f = x - k;
  const a = stream(seed, `${key}:${k}`)(), b = stream(seed, `${key}:${k + 1}`)();
  const s = (1 - Math.cos(Math.PI * f)) / 2;
  return a * (1 - s) + b * s;
}

/** Whether each of the last days was wet: a two-state chain, run from a fortnight back so spells carry over. */
function wetChain(seed, climate, jdn, wetOf, back = 14) {
  const out = new Map();
  let wet = null;
  for ( let d = jdn - back; d <= jdn; d++ ) {
    const p = clamp(wetOf(d), 0.01, 0.95);
    const stay = Math.min(0.85, p + 0.35);
    const start = p * (1 - stay) / (1 - p);
    const r = stream(seed, `wx:${climate}:wet:${d}`)();
    wet = wet === null ? r < p : (wet ? r < stay : r < start);
    out.set(d, wet);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  One day                                                            */
/* ------------------------------------------------------------------ */

export const PRECIP = ["none", "drizzle", "rain", "sleet", "snow", "hail"];
export const SKIES = ["clear", "cloudy", "overcast", "storm"];
export const FOGS = ["none", "mist", "thick"];
export const WINDS = ["calm", "breeze", "wind", "gale"];
export const INTENSITY = ["light", "moderate", "heavy"];

/** The words for a temperature, by feel. */
export function feel(c) {
  if ( c <= -10 ) return "bitter";
  if ( c <= -2 ) return "freezing";
  if ( c <= 5 ) return "cold";
  if ( c <= 12 ) return "cool";
  if ( c <= 20 ) return "mild";
  if ( c <= 27 ) return "warm";
  return "hot";
}

/** The day's figures before snow on the ground is worked out. */
function rawDay(seed, climate, jdn, chain, opts) {
  const C = CLIMATES[climate] ?? CLIMATES[DEFAULT_CLIMATE];
  const {month, year} = seasonOf(jdn);
  const shift = eraShift(opts.year ?? year, month);
  const r = stream(seed, `wx:${climate}:day:${jdn}`);
  const anomaly = (noise(seed, `wx:${climate}:temp`, jdn / 4) - 0.5) * 10 + (noise(seed, `wx:${climate}:tfast`, jdn / 1.5) - 0.5) * 3;
  const mean = monthly(C.t, jdn) + shift.t + anomaly;
  const tempDay = round1(mean + C.range / 2);
  const tempNight = round1(mean - C.range / 2);
  const wet = !!chain.get(jdn);
  const near = !!chain.get(jdn - 1) || !!chain.get(jdn + 1);
  const stormy = wet && r() < clamp(monthly(C.storm, jdn) * shift.storms, 0, 0.9);
  const rInt = r(), rWind = r(), rFog = r(), rCloud = r(), rHail = r(), rLeaves = r();

  let precip = "none", intensity = null;
  if ( wet ) {
    intensity = stormy ? "heavy" : rInt < 0.45 ? "light" : rInt < 0.85 ? "moderate" : "heavy";
    const cold = Math.min(tempNight, (tempNight + tempDay) / 2);
    if ( cold <= -1 ) precip = "snow";
    else if ( cold <= 1.5 ) precip = "sleet";
    else if ( stormy && mean >= 15 && rHail < 0.1 ) precip = "hail";
    else precip = intensity === "light" ? "drizzle" : "rain";
  }

  let wind = rWind < 0.35 ? "calm" : rWind < 0.75 ? "breeze" : rWind < 0.95 ? "wind" : "gale";
  if ( stormy ) wind = rWind < 0.5 ? "wind" : "gale";

  let fog = "none";
  if ( !wet && (wind === "calm" || wind === "breeze") ) {
    const fc = monthly(C.fog, jdn);
    if ( rFog < fc * 0.4 ) fog = "thick";
    else if ( rFog < fc ) fog = "mist";
  }
  if ( fog !== "none" ) wind = "calm";

  let sky;
  if ( stormy || fog === "thick" ) sky = "storm";
  else if ( wet ) sky = "overcast";
  else if ( fog === "mist" ) sky = "cloudy";
  else sky = rCloud < (near ? 0.7 : 0.45) ? "cloudy" : "clear";

  const thunder = stormy && mean >= 10 && precip !== "snow";
  const leaves = !wet && (month === 10 || month === 11) && wind !== "calm" && rLeaves < 0.5;
  return {jdn, climate, month, sky, precip, intensity, fog, wind, thunder, leaves, tempDay, tempNight, mean: round1(mean)};
}

/**
 * One day's weather. opts: {year} to set the era (defaults to the day's own year), override: a hand-set day to use as
 * it is. Returns {jdn, climate, month, sky, precip, intensity, fog, wind, thunder, leaves, tempDay, tempNight, mean,
 * snowLying, deepSnow, feel, moonHidden, effect, tags, label}.
 */
export function weatherFor(seed, climate, jdn, opts = {}) {
  climate = CLIMATES[climate] ? climate : DEFAULT_CLIMATE;
  const C = CLIMATES[climate];
  const chain = wetChain(seed, climate, jdn + 1, d => monthly(C.wet, d));
  let day;
  if ( opts.override ) day = {...rawDay(seed, climate, jdn, chain, opts), ...opts.override, jdn, climate, set: true};
  else day = rawDay(seed, climate, jdn, chain, opts);
  // Snow lies if it fell in the last ten days and no day since has been warm enough to melt it
  let lying = 0;
  for ( let d = jdn - 10; d <= jdn; d++ ) {
    const x = d === jdn ? day : rawDay(seed, climate, d, chain.has(d) ? chain : wetChain(seed, climate, d + 1, q => monthly(C.wet, q)), opts);
    if ( x.precip === "snow" ) lying += x.intensity === "heavy" ? 3 : x.intensity === "moderate" ? 2 : 1;
    else if ( x.tempDay >= 4 ) lying = Math.max(0, lying - (x.tempDay >= 8 ? 4 : 2));
    if ( x.precip === "rain" && x.tempNight > 2 ) lying = Math.max(0, lying - 2);
  }
  if ( day.set && typeof opts.override?.snowLying === "boolean" ) lying = opts.override.snowLying ? Math.max(lying, 1) : 0;
  return finish({...day, snowLying: lying > 0, deepSnow: lying >= 4});
}

/** Words, tags, the scene effect and the moon for a day already worked out. */
export function finish(d) {
  const out = {...d};
  out.feel = feel(Math.min(d.tempNight, d.tempDay));
  out.moonHidden = d.sky === "overcast" || d.sky === "storm";
  out.effect = sceneEffect(out);
  out.tags = tagsOf(out);
  out.label = describe(out);
  return out;
}

/** Tags other modules read (WoDX Senses): rain, snow, sleet, hail, fog, mist, wind, gale, thunder, snow-lying, cold, hot. */
export function tagsOf(d) {
  const t = new Set();
  if ( ["drizzle", "rain"].includes(d.precip) ) t.add("rain");
  if ( d.precip === "rain" && d.intensity === "heavy" ) t.add("downpour");
  if ( d.precip === "snow" ) t.add("snow");
  if ( d.precip === "sleet" ) { t.add("sleet"); t.add("rain"); }
  if ( d.precip === "hail" ) { t.add("hail"); t.add("rain"); }
  if ( d.fog === "thick" ) t.add("fog");
  if ( d.fog === "mist" ) t.add("mist");
  if ( d.wind === "wind" || d.wind === "gale" ) t.add("wind");
  if ( d.wind === "gale" ) t.add("gale");
  if ( d.thunder ) t.add("thunder");
  if ( d.snowLying ) t.add("snow-lying");
  if ( Math.min(d.tempNight, d.tempDay) <= 2 ) t.add("cold");
  if ( d.tempDay >= 28 ) t.add("hot");
  if ( d.leaves ) t.add("leaves");
  return [...t];
}

/** Foundry's weather effect for an outdoor scene (CONFIG.weatherEffects keys), or "" for none. */
export function sceneEffect(d) {
  if ( d.precip === "snow" ) return (d.intensity === "heavy" || d.wind === "gale") ? "blizzard" : "snow";
  if ( ["rain", "sleet", "hail"].includes(d.precip) ) return (d.intensity === "heavy" || d.sky === "storm") ? "rainStorm" : "rain";
  if ( d.precip === "drizzle" ) return "rain";
  if ( d.fog !== "none" && d.fog ) return "fog";
  if ( d.leaves ) return "leaves";
  return "";
}

const PRECIP_WORDS = {drizzle: "Drizzle", rain: "Rain", sleet: "Sleet, rain and snow together", snow: "Snow", hail: "Hail with the rain"};
const WIND_WORDS = {calm: "no wind", breeze: "a light breeze", wind: "a strong wind", gale: "a gale"};

/** One plain sentence or two for the Storyteller and the players. */
export function describe(d) {
  const parts = [];
  if ( d.precip !== "none" ) {
    const w = PRECIP_WORDS[d.precip] ?? "Rain";
    parts.push(d.intensity && d.precip !== "drizzle" ? `${w}, ${d.intensity}` : w);
  } else if ( d.fog === "thick" ) parts.push("Thick fog");
  else if ( d.fog === "mist" ) parts.push("Mist");
  else parts.push(d.sky === "clear" ? "Clear skies" : d.sky === "cloudy" ? "Cloud, with breaks" : d.sky === "overcast" ? "Heavy cloud" : "Storm clouds");
  if ( d.thunder ) parts.push("thunder and lightning");
  parts.push(WIND_WORDS[d.wind] ?? "no wind");
  let s = parts.join(", ") + ".";
  if ( d.snowLying ) s += d.deepSnow ? " Deep snow on the ground." : " Snow on the ground.";
  s += ` ${cap(feel(d.tempNight))} tonight, about ${Math.round(d.tempNight)}°C (${Math.round(d.tempNight * 9 / 5 + 32)}°F); ${feel(d.tempDay)} by day.`;
  if ( d.moonHidden ) s += " The moon is hidden.";
  return s;
}
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : "";

/** Days ahead (today first), for the Storyteller's forecast. overrides: {jdn: hand-set day}. */
export function forecast(seed, climate, jdn, days = 7, {year, overrides = {}} = {}) {
  return Array.from({length: days}, (_, i) => weatherFor(seed, climate, jdn + i, {year, override: overrides[jdn + i]}));
}

/* ------------------------------------------------------------------ */
/*  Weather that matters (house rules)                                 */
/* ------------------------------------------------------------------ */

/**
 * Small difficulty steps the weather adds outdoors. House rules: the books leave weather to the Storyteller. Each is
 * {id, label, n (+ harder, - easier), applies}. Shown on the weather card; WoDX Senses uses the perception ones.
 */
export function modifiers(d, {indoor = false} = {}) {
  if ( indoor || !d ) return [];
  const out = [];
  const t = new Set(d.tags ?? tagsOf(d));
  if ( t.has("fog") ) out.push({id: "sight", label: "Thick fog: seeing anything past a few yards", n: 2, applies: "Perception by sight, ranged attacks past short range"});
  else if ( t.has("mist") ) out.push({id: "sight", label: "Mist: seeing far", n: 1, applies: "Perception by sight past 20 yards"});
  if ( !t.has("fog") && (t.has("snow") && d.intensity === "heavy" || t.has("downpour") || d.sky === "storm") ) out.push({id: "sight", label: "Heavy rain or snow: seeing far", n: 1, applies: "Perception by sight, ranged attacks"});
  if ( t.has("gale") || t.has("thunder") || t.has("downpour") ) out.push({id: "hearing", label: "Storm noise", n: 1, applies: "Perception by hearing"});
  if ( t.has("rain") ) out.push({id: "scent", label: d.intensity === "heavy" ? "Heavy rain washes scent away" : "Rain masks scent", n: d.intensity === "heavy" ? 2 : 1, applies: "Tracking or perceiving by smell"});
  if ( t.has("snow-lying") ) out.push({id: "tracks", label: "Snow keeps tracks", n: -1, applies: "Tracking by sight on the ground"});
  if ( t.has("snow-lying") || t.has("sleet") || (t.has("cold") && t.has("rain")) ) out.push({id: "footing", label: "Ice or snow underfoot", n: 1, applies: "Running, riding and driving"});
  if ( t.has("fog") ) out.push({id: "shroud", label: "Fog thins the Shroud", n: -1, applies: "The local Shroud rating, for wraiths crossing or reaching through"});
  return out;
}

/* ------------------------------------------------------------------ */
/*  Lighting from the clock                                            */
/* ------------------------------------------------------------------ */

const rad = Math.PI / 180;

/** The sun's altitude (degrees) for a JDN, local solar hours and latitude. */
export function sunAltitude(jdn, hours, latitude) {
  const n = seasonOf(jdn).dayOfYear;
  const decl = -23.44 * Math.cos(rad * (360 / 365) * (n + 10));
  const phi = latitude * rad, d = decl * rad, H = (hours - 12) * 15 * rad;
  return Math.asin(clamp(Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H), -1, 1)) / rad;
}

/**
 * The scene darkness (0 to 1) for the sun, the moon and the sky. night: the scene's own night darkness. Full day at
 * 6° of altitude, full night by 12° below (nautical dusk); clouds darken the day, a clear full moon lightens the night.
 * Rounded to 0.05, so the scene only changes in small steps.
 */
export function darknessFor({altitude, moon = 0, sky = "clear", night = 0.9, day = 0} = {}) {
  const cloud = {clear: 0, cloudy: 0.1, overcast: 0.25, storm: 0.4}[sky] ?? 0;
  const moonLift = sky === "clear" ? 0.25 : sky === "cloudy" ? 0.1 : 0;
  const dayD = clamp(day + cloud, 0, 1);
  const nightD = clamp(night - moonLift * clamp(moon, 0, 1), 0, 1);
  let v;
  if ( altitude >= 6 ) v = dayD;
  else if ( altitude <= -12 ) v = nightD;
  else {
    const f = (altitude + 12) / 18;
    v = nightD + (dayD - nightD) * f;
  }
  return Math.round(clamp(v, 0, 1) * 20) / 20;
}

/** A short code for a day, to tell whether the weather has changed. */
export function weatherKey(d) {
  return d ? hash128(JSON.stringify([d.sky, d.precip, d.intensity, d.fog, d.wind, d.snowLying, d.effect])).slice(0, 1)[0].toString(36) : "";
}
