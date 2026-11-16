---
bump: minor
effect: a threat made openly and won (WoDX Actions' Threaten openly) is a public deed that lowers the character's standing in the town by one, and a sermon that moves its hearers (the Following window's Preach) raises it by one. Before, only a rescue counted
visible: the deed shows in the character's standing, and a player character's deed starts a tale in WoDX Storyteller's rumour mill
---
Public deeds count beyond a rescue (final audit, B6758). The change is small: standing.mjs listens for a won "threaten" social act (listenDeeds, started in main.mjs), and cults.mjs preach() records a deed when the sermon's roll succeeds without a botch. Quiet acts (persuade, deceive, intimidate quietly) and lost acts are not public deeds. The weights are house figures.
