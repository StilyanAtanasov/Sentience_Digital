// Values in this module are deliberately safe to send to the browser. Answer
// keys and scoring weights live in api/_quiz.js so they are not published as
// static assets.
export const PART_ONE_COUNT = 10;
export const PART_TWO_COUNT = 15;
export const TOTAL_QUESTION_COUNT = PART_ONE_COUNT + PART_TWO_COUNT;

export const PART_TWO_DIFFICULTIES = [
  "[Easy]", "[Easy]", "[Easy]", "[Easy]", "[Medium]", "[Medium]",
  "[Medium]", "[Medium]", "[Medium]", "[Hard]", "[Hard]", "[Hard]",
  "[Hard]", "[Hard]", "[Extreme]",
];
