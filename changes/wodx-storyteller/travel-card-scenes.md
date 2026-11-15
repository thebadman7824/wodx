---
bump: patch
what: The Travel window lists a Lone Chronicle card scene among the places, and a card scene never turns the world's place list into the marked-only list
effect: travelPlaces keeps a WoDX Solo card scene (flag wodx-solo.card) in the list, and does not count it as a scene the Storyteller marked, so a world with no marked scenes still lists every scene
visible: a town visited as a card scene shows in the Out on your own window's Go to list, with its trip time, beside the world's other places
---
WoDX Storyteller travelPlaces (B6043). Before, the first scene with a travel flag made only flagged scenes count as places; a card scene carries a travel flag so its trip runs over the country map, and would have hidden every unmarked scene from the Travel window.
