/**
 * WoDX Library: what a seed grows into (B3911). seed -> {crop (a good), n (how many), days to harvest}. A crop of
 * null is a plant for its looks or its later years (a vine bears in its third year): it grows, and gives nothing to
 * eat. House figures, kept round.
 */
export const CROPS = {
  "seed corn": {crop: "a corn cob", n: 6, days: 90},
  "garden seeds": {crop: "a carrot", n: 6, days: 60},
  "a vine cutting": {crop: null, n: 0, days: 1095},
  "rose cuttings": {crop: "a pressed flower in a book", n: 1, days: 120},
  "seed potatoes": {crop: "potatoes", n: 8, days: 100},
  "a tulip bulb": {crop: "a pressed flower in a book", n: 1, days: 150},
  "flower seeds": {crop: "chamomile flowers", n: 4, days: 60},
  "a hydroponic seed pod": {crop: "raw soybeans", n: 4, days: 30},
  "seed": {crop: "beans", n: 4, days: 70},
  "a bundle of hop rhizomes": {crop: "hop flowers", n: 6, days: 120},
  "a potato section": {crop: "potatoes", n: 4, days: 100},
  "a bundle of rhubarb stems": {crop: "rhubarb", n: 4, days: 90},
  "mushroom spores": {crop: "a dried mushroom", n: 4, days: 21},
  "morel mushroom spores": {crop: "a dried mushroom", n: 2, days: 30},
  "a seed garlic": {crop: "a garlic clove", n: 8, days: 240},
  "seed popcorn": {crop: "corn kernels", n: 6, days: 100}
};
