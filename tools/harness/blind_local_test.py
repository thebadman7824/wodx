"""Checks the verdict rules of tools/vision/blind.py (B6521): python3 tools/harness/blind_local_test.py"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "vision"))
import blind as b

assert b.verdict("Tripod Cauldron", 4, ["cauldron on a tripod"]) == "pass"
assert b.verdict("Beehive", 4, ["beehive or skep"]) == "pass"
assert b.verdict("cooking pots and pans", 3, ["cooking pot"]) == "unsure"
assert b.verdict("frying pan", 5, ["kettle"]) == "fail"
assert b.verdict("Barrel", 5, ["cask"]) == "fail"
assert b.verdict("Barrel", 5, [{"name": "cask"}.get("name"), "barrel"]) == "pass"
assert b.verdict("Bed", 2, ["bed"]) == "fail"
assert b.verdict("anything", 5, []) is None
assert b.truth_for("pot-1200", {"pot": "cooking pot"}) == ["cooking pot"]
assert b.truth_for("pot", {"pot": {"name": "pot", "aliases": ["pan"]}}) == ["pot", "pan"]
print("blind_local_test: ok")
