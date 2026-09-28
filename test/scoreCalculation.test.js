import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateScore,
  calculateAttemptPoints,
  MAX_POINTS,
  MAX_SCORE,
} from "../api/_quiz.js";

test("score calculation computes expected formula result", () => {
  // points * 1000 + Math.round(10000 / (time + 10))
  // 10 * 1000 + Math.round(10000 / (30 + 10)) = 10000 + 250 = 10250
  assert.equal(calculateScore(10, 30), 10250);
});

test("score calculation returns 0 when points is 0", () => {
  assert.equal(calculateScore(0, 5), 0);
  assert.equal(calculateScore(0, 100), 0);
});

test("score calculation ranks higher points over faster time", () => {
  const highPointsSlowTime = calculateScore(20, 100); // 20000 + 91 = 20091
  const lowPointsFastTime = calculateScore(5, 5);     // 5000 + 667 = 5667
  assert.ok(highPointsSlowTime > lowPointsFastTime);
});

test("max score bounds check", () => {
  const maxScoreResult = calculateScore(MAX_POINTS, 1);
  assert.equal(maxScoreResult, MAX_SCORE);
  assert.ok(calculateScore(MAX_POINTS - 1, 1) < maxScoreResult);
});

test("calculateAttemptPoints aggregates part one image and part two weighted points", () => {
  const attempt = {
    partOneAnswers: [74, 16],
    partTwoAnswers: [1, 2],
  };
  const userPartOne = [74, 99]; // 1 correct image answer = 1 pt
  const userPartTwo = [1, 2];   // 2 correct color answers (weight 1 + weight 1) = 2 pts
  assert.equal(calculateAttemptPoints(attempt, userPartOne, userPartTwo), 3);
});

test("calculateAttemptPoints handles single correct answer with imageOrder mapping", () => {
  // Suppose image 3 (answer 4) is placed at Question 1 (index 0)
  const attempt = {
    imageOrder: [3, 1, 2, 4, 5, 6, 7, 8, 9, 10],
    partTwoAnswers: [2, 3, 1, 4, 2, 3, 1, 4, 2, 3, 1, 4, 2, 3, 1],
  };
  // User answers Question 1 with "4" (correct for image 3), leaves others blank/empty
  const userPartOne = ["4", "", "", "", "", "", "", "", "", ""];
  const userPartTwo = [];
  const pts = calculateAttemptPoints(attempt, userPartOne, userPartTwo);
  assert.equal(pts, 1);
});
