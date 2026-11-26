/**
 * WoDX Library: what household things and travel tack do on the road (B3905 to B3907).
 *
 * These are read where they are carried (in Possessions), not used from the Use window:
 *   WARM:  bedding and blankets. Out in cold weather, WoDX Storyteller's hardship roll is one easier (house rule).
 *   SHADE: an umbrella or a hand fan. Out in scorching heat, the same roll is one easier (house rule).
 *   TACK:  a saddle and a bridle. WoDX Interactables' chase on horseback or a mule is +1 difficulty without them
 *          (riding bareback or with a rope halter); spurs or a riding crop make a flat-out ride one easier (house rule).
 * Other household things (a stool, a broom, a chamber pot, a lawnmower) have no sensible rule of their own and stay
 * plain things on the sheet.
 */
export const WARM = ["a woollen blanket", "a quilt", "a patchwork quilt", "a bedroll", "a rollmat", "a sleeping mat of woven reed", "a feather bed", "a straw mattress"];
export const SHADE = ["an umbrella", "a telescoping umbrella", "an oiled paper umbrella", "a folding paper fan", "a fan of woven pandanus"];
export const TACK = {
  "a saddle": {saddle: true},
  "a bridle and bit": {bridle: true},
  "a set of horse tack": {saddle: true, bridle: true},
  "a pair of spurs": {urge: true},
  "a riding crop": {urge: true}
};
