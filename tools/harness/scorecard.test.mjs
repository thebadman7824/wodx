/* B7064: the scorecard counts what it says it counts. */
import test from "node:test";
import assert from "node:assert/strict";
import {wikiCoverage, eventsByLineEra, LINES} from "../release/scorecard.mjs";

test("B7064: the wiki coverage rows are read from the final audit's table", () => {
  const t = "| line | works | tells | unreach | missing | n/a | total | % works |\n|---|---|---|---|---|---|---|---|\n| Vampire | 267 | 74 | 0 | 1037 | 18 | 1396 | 19% |\n| Kindred of the East | 5 | 4 | 0 | 7 | 2 | 18 | 27% |";
  assert.deepEqual(wikiCoverage(t), {Vampire: {works: 267, total: 1396}, "Kindred of the East": {works: 5, total: 18}});
});

test("B7064: an event counts for each line it names, and an all-lines event for every line", () => {
  const h = {events: [{era: "dark-ages", lines: ["vampire"]}, {era: "dark-ages", lines: ["all"]}, {era: "modern", lines: ["mortal"]}, {era: "modern", lines: ["mage", "vampire"]}]};
  const e = eventsByLineEra(h, ["vampire", "mage", "demon"]);
  assert.deepEqual(e, {vampire: {"dark-ages": 2, modern: 1}, mage: {"dark-ages": 1, modern: 1}, demon: {"dark-ages": 1}});
  assert.equal(LINES.length, 9);
});
