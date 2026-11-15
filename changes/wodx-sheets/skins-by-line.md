---
bump: minor
effect: each page loads only the fonts and a 2 KB core sheet; a line's skin (6 to 19 KB) loads the first time one of its sheets opens, so slower machines parse about 168 KB less CSS at start and the sheets look exactly as before
visible: none, the sheets are meant to look the same as before; this is a speed change and a picture-for-picture check proves nothing moved
---
Line skins by line: the 170 KB skins stylesheet is split into a small core sheet (fonts and the loading rule) and one file per line under styles/skins, which scripts/skins.mjs puts in place the first time a sheet of that line draws, on either sheet engine, in the same cascade order the single file had. While the file loads the sheet's page waits blank rather than flashing the system's look. The Sheet look setting still switches the skins off, and then no line file loads at all. The API gains skins.loaded(), skins.linesOf() and skins.load() for gates (B6060-B6062).
