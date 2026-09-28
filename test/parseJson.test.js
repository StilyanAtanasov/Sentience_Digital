import assert from "node:assert/strict";
import test from "node:test";
import { parseJsonValue, readJsonBody } from "../shared/parse-json.js";

test("parseJsonValue accepts objects already deserialized by Redis", () => {
  const attempt = { uid: "user-1", partTwoAnswers: [1, 2, 3] };
  assert.deepEqual(parseJsonValue(attempt), attempt);
});

test("parseJsonValue parses JSON strings stored in Redis", () => {
  const attempt = { uid: "user-1", imageOrder: [1, 2, 3] };
  assert.deepEqual(parseJsonValue(JSON.stringify(attempt)), attempt);
});

test("parseJsonValue returns null for missing or invalid payloads", () => {
  assert.equal(parseJsonValue(null), null);
  assert.equal(parseJsonValue(""), null);
  assert.equal(parseJsonValue("not-json"), null);
});

test("readJsonBody accepts both parsed objects and raw JSON strings", () => {
  const payload = {
    name: "Ada",
    attemptId: "abc",
    partOneAnswers: [1],
    time: 12,
  };
  assert.deepEqual(readJsonBody(payload), payload);
  assert.deepEqual(readJsonBody(JSON.stringify(payload)), payload);
  assert.deepEqual(readJsonBody(undefined), {});
});
