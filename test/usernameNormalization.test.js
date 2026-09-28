import assert from "node:assert/strict";
import test from "node:test";
import {
  getUsernameValidationError,
  normalizeUsername,
  sanitizeUsername,
} from "../shared/username.js";

test("username normalization trims whitespace", () => {
  assert.equal(normalizeUsername("  testUser  "), "testuser");
});

test("username normalization handles uppercase and mixed case", () => {
  assert.equal(normalizeUsername("JohnDoe_123"), "johndoe_123");
});

test("username normalization handles Unicode NFKC normalization", () => {
  // Fullwidth characters normalize to standard ASCII equivalents.
  assert.equal(
    normalizeUsername(" \uFF30\uFF52\uFF45\uFF53\uFF4C\uFF41\uFF56 "),
    "preslav",
  );
});

test("username validation accepts non-whitespace names and rejects blank input", () => {
  assert.equal(sanitizeUsername("  Ada Lovelace  "), "Ada Lovelace");
  assert.equal(getUsernameValidationError("Ada Lovelace"), null);
  assert.equal(getUsernameValidationError(" \u00A0 "), "Please enter a username.");
});
