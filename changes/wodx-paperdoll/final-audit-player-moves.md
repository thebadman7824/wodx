---
bump: patch
effect: a change of form or a feeding done from a player's computer now plays the sprite move, where before only the Storyteller's own actions did
visible: the player's sprite token shifts form or plays its feeding move on the map for everyone
---
Final audit fix (B6783): the form-change and feeding moves were played only on the Storyteller's computer, but their hooks fire only on the computer that acted, so a player's action showed nothing. Each token is now played on the computer that acted when that user owns it.
