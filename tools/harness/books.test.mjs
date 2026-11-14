/* Book text tools (B3085): pages, word search and the 8-word overlap check, on a made-up book. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as B from "../books/books.mjs";
import * as E from "../../modules/wodx-library/scripts/ency-rules.mjs";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-books-"));
fs.mkdirSync(path.join(dir, "batch9", "made"), {recursive: true});
fs.writeFileSync(path.join(dir, "batch9", "made", "p0001.txt"), "Title page");
fs.writeFileSync(path.join(dir, "batch9", "made", "p0002.txt"), "The lantern-keeper's tower stands on a hill above the\nold river, where the ferry crossed in winter.");
fs.writeFileSync(path.join(dir, "loose.txt"), "first page\fsecond page about owls and the moon over quiet fields at night");
const books = B.findBooks(dir);

test("books are found in both layouts", () => {
  assert.deepEqual(books.map(b => b.id), ["loose", "made"]);
  assert.deepEqual(B.pagesOf(books[1]).map(p => p.n), [1, 2]);
  assert.equal(B.pagesOf(books[0])[1].text.startsWith("second"), true);
});

test("words are squashed as the Encyclopaedia check does it", () => {
  const t = "The Lantern-Keeper's tower: stands, on a hill; above the old river!";
  assert.deepEqual(new Set(B.runsWithLines(t).map(r => r.run)), E.shingles(t));
});

test("find gives the page across line breaks and punctuation", () => {
  const hits = B.find("above the OLD river", books);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].book, "made");
  assert.equal(hits[0].page, 2);
});

test("overlap reports file, line, words and page", () => {
  const files = [{file: "a.json", text: '{\n "x": "own words here",\n "y": "a tower stands on a hill above the old river where it bends"\n}'},
    {file: "b.mjs", text: "// nothing from any book in this line at all, really none"}];
  const hits = B.overlap(files, books);
  assert.ok(hits.length >= 1);
  assert.deepEqual({file: hits[0].file, line: hits[0].line, book: hits[0].book, page: hits[0].page}, {file: "a.json", line: 3, book: "made", page: 2});
  assert.equal(hits[0].run.split(" ").length, 8);
  assert.deepEqual(B.overlap([{file: "c.md", text: "owls and the moon over quiet fields"}], books), [], "seven words is not a hit");
});

test("one file per book: page markers, toc files skipped, page folder not read twice (B3950)", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "wodx-books1-"));
  fs.mkdirSync(path.join(d, "b1", "two"), {recursive: true});
  fs.writeFileSync(path.join(d, "b1", "one.txt"), "﻿\r\n=== p0001\r\nCover\r\n=== p0002\r\nthe heron waits by the mill pond at dawn\r\n");
  fs.writeFileSync(path.join(d, "b1", "one.toc.txt"), "Contents | 1");
  fs.writeFileSync(path.join(d, "b1", "two", "p0001.txt"), "first");
  fs.writeFileSync(path.join(d, "b1", "two", "p0003.txt"), "third page text");
  let bs = B.findBooks(d);
  assert.deepEqual(bs.map(b => b.id), ["one", "two"]);
  assert.deepEqual(B.pagesOf(bs[0]).map(p => p.n), [1, 2]);
  assert.equal(B.pagesOf(bs[0])[1].text.trim(), "the heron waits by the mill pond at dawn");
  const done = B.pack(d);
  assert.deepEqual(done.map(x => [path.basename(x.book), x.pages]), [["two.txt", 2]]);
  bs = B.findBooks(d);
  assert.deepEqual(bs.map(b => [b.id, !!b.file]), [["one", true], ["two", true]], "the joined file replaces the page folder");
  assert.deepEqual(B.pagesOf(bs[1]).map(p => [p.n, p.text.trim()]), [[1, "first"], [3, "third page text"]], "page numbers survive the join");
  assert.equal(B.pack(d)[0].skipped, true, "an existing joined file is kept");
});
