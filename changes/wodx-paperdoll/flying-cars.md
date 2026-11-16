---
bump: minor
what: Mount and vehicle sprites: aerodynes, armoured AVs and hover bikes; flying things lift off the map with a shadow below
effect: the new kinds show their own drawn looks (placeholders), and anything flying is drawn by its height
visible: a flier's picture rises with its height while its shadow stays on the ground, shrinking and fading as it climbs; dust rings out from under it when it takes off or lands; aerodyne fans turn
---
Flying cars (B6623, B6627): 12 placeholder looks for the aerodyne (personal, saloon, aerocab; from 2040 an air taxi, a sporting and an executive aerodyne), the armoured AV (assault, police, tilt-rotor gunship) and the hover bike (street, enclosed, scooter), drawn by tools/sprites (mounts.py --only aerodyne assaultav hoverbike). A mount or vehicle in the air is lifted on the map by its height above the ground (WoDX Interactables api.flight), up to a square and a half, with an oval shadow left under it that shrinks and fades as it climbs; a ring of dust blows out when it leaves or reaches the ground.
