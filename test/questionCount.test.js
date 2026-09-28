import assert from "node:assert/strict";
import test from "node:test";
import {
  PART_ONE_COUNT,
  PART_TWO_COUNT,
  TOTAL_QUESTION_COUNT,
  PART_TWO_DIFFICULTIES,
} from "../shared/quiz-public.js";
import { PART_ONE_IMAGE_ANSWERS, PART_TWO_POINTS } from "../api/_quiz.js";

test("quiz has exactly 25 questions total", () => {
  assert.equal(PART_ONE_COUNT, 10);
  assert.equal(PART_TWO_COUNT, 15);
  assert.equal(TOTAL_QUESTION_COUNT, 25);
  assert.equal(PART_ONE_COUNT + PART_TWO_COUNT, 25);
});

test("part one has 10 image answer keys", () => {
  assert.equal(PART_ONE_IMAGE_ANSWERS.length, 10);
});

test("part two has 15 difficulty descriptors and 15 point weights", () => {
  assert.equal(PART_TWO_DIFFICULTIES.length, 15);
  assert.equal(PART_TWO_POINTS.length, 15);
});
