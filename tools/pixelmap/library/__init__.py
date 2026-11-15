"""The object library (B6330-B6349). See README.md in this folder.

    import library as lib
    rec = Recorder(...); rec.year = 1200
    lib.put(rec, "table", 6.7, 5.75)
    lib.by_wall(rec, "oven", (4, 3, 16, 3), at=5, toward=(6, 6))
    lib.door(rec, (4, 10, 16, 10), at=7.5, toward=(7, 7), exterior=True)
"""
import os, sys
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if HERE not in sys.path: sys.path.insert(0, HERE)
from library.core import CATALOGUE, Spec, spec, put, by_wall, door, window, render, composite, FT  # noqa: E402
import library.catalogue  # noqa: E402,F401  (fills CATALOGUE)
