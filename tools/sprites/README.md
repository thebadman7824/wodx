# Sprite rig

The token sprites are drawn by these Python scripts (numpy and Pillow), outside the game. Own art: capsule limbs, five-tone ramps, a dark outline, one light from the top left. No outside art.

- crinos.py: the canvas class (Cv) and the Crinos.
- rig.py: people and humanoid forms. wear.py: the same figure with layered clothes, armor and things in the hand.
- wolf.py, beast.py: four-legged animals on one rig.
- items.py: matches every clothing, armor and weapon item of the Library tables to pieces of wear.py.

A sheet is 8 walk frames across by 4 facings down (back, left, front, right), each frame 96 by 112 pixels. The sheets in modules/wodx-paperdoll/sprites were exported from here (docs/DECISIONS.md B2560).
- batch.py: draws a sprite for every character on a roster the game writes (python3 batch.py <roster.json> <out folder>); proto_fx.py: the power effect sheets; proto_attacks.py: the six test figures' attack sheets.
- catalogue.py: the figure menu's list of pieces and their layers (python3 catalogue.py ../../modules/wodx-paperdoll/sprites/figure). wear.json: the worn goods of the Library with their years.
- monster.py: looks for creatures of legend and for the fae by kith (which rig draws each, its size, marks and wash); beast.py and critter.py hold the kinds, wear.py the marks on a figure (ears, horns, tail, wings).
- child.py: children (B3480), the same figure drawn shorter with a larger head; batch.py passes a roster entry's growth band to wear.py. test_child.py checks it.
- bestiary.py: combines the creatures of the book check (hand-*.tsv in /mnt/project-files/pixel-sprites/bestiary) into shared looks by body plan; writes bestiary-looks.json, which monster.book_look() reads, and roster.md (B2617).
