---
bump: patch
effect: loose.setDown takes a landing point and a line of text, so a weapon knocked out of a hand lands where it was sent; a body resting on furniture (restsOn) moves with the furniture, and the mark is cleared when the furniture is deleted
visible: a "Knocked away" card and a pile of loose gear where a disarmed weapon lands; a body laid on a table or bed follows it when the tile is moved
---
Final audit second pass (B6788, B6789): setDown(tokDoc, ids, {at, how}) puts the pile at a point on the map and words the card for a weapon knocked away (a loud noise for map events). The restsOn flag set by laying a body on furniture is now read: moving the tile moves the body to its middle, and deleting the tile clears the flag.
