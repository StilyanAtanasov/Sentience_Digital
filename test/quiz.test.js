import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateAttemptPoints,
  calculateScore,
  createQuizAttempt,
  MAX_POINTS,
} from "../api/_quiz.js";
import {
  PART_ONE_COUNT,
  PART_TWO_COUNT,
  TOTAL_QUESTION_COUNT,
} from "../shared/quiz-public.js";
import { hasDuplicateUsername, normalizeUsername } from "../shared/username.js";

test("the quiz contains 25 questions", () => {
  assert.equal(PART_ONE_COUNT + PART_TWO_COUNT, 25);
  assert.equal(TOTAL_QUESTION_COUNT, 25);
});

test("quiz attempts contain the expected answer-key sizes", () => {
  const attempt = createQuizAttempt(() => 0.5);
  assert.equal(attempt.imageOrder.length, PART_ONE_COUNT);
  assert.equal(attempt.partOneAnswers.length, PART_ONE_COUNT);
  assert.equal(attempt.partTwoAnswers.length, PART_TWO_COUNT);
  assert.equal(MAX_POINTS, 66);
});

test("image order is a permutation of every part-one image", () => {
  let seed = 0.13;
  const attempt = createQuizAttempt(() => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  });
  assert.deepEqual(
    [...attempt.imageOrder].sort((left, right) => left - right),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
});

test("score calculation prioritizes points over time", () => {
  assert.ok(calculateScore(20, 86) > calculateScore(2, 8));
  assert.equal(calculateScore(20, 86), 20104);
});

test("username normalization detects case and Unicode-equivalent duplicates", () => {
  assert.equal(normalizeUsername(" Preslav "), "preslav");
  assert.equal(
    hasDuplicateUsername({ first: { username: "Preslav" } }, "preslav"),
    true,
  );
  assert.equal(
    hasDuplicateUsername({ first: { username: "Preslav" } }, "Another"),
    false,
  );
});

test("attempt points count image answers and weighted color answers", () => {
  const attempt = {
    partOneAnswers: [1, 2],
    partTwoAnswers: [1, 2],
  };
  assert.equal(calculateAttemptPoints(attempt, [1, 9], [1, 2]), 3);
});
