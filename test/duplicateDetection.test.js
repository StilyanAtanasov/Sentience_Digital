import assert from "node:assert/strict";
import test from "node:test";
import { hasDuplicateUsername } from "../shared/username.js";

test("duplicate detection identifies exact match", () => {
  const records = {
    u1: { username: "Alice" },
    u2: { username: "Bob" },
  };
  assert.equal(hasDuplicateUsername(records, "Alice"), true);
});

test("duplicate detection identifies case-insensitive duplicate", () => {
  const records = {
    u1: { username: "Alice" },
  };
  assert.equal(hasDuplicateUsername(records, "ALICE"), true);
  assert.equal(hasDuplicateUsername(records, " alice "), true);
});

test("duplicate detection allows unique username", () => {
  const records = {
    u1: { username: "Alice" },
  };
  assert.equal(hasDuplicateUsername(records, "Charlie"), false);
});
