import { PART_ONE_COUNT, PART_TWO_COUNT } from "../shared/quiz-public.js";

// This file is server-only. Do not move these values to a static, browser
// imported module: doing so would reveal the answer key.
export const PART_ONE_IMAGE_ANSWERS = [74, 16, 4, 6, 6, 9, 1, 2, 5, 2];

export const PART_TWO_POINTS = [
  1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 7, 8, 10,
];

const COLOUR_SETS = {
  special: [
    "#FFC300", "#DAF7A6", "#9f002e", "#17A2B8", "#FF7650", "#4069e6",
    "#FFC300", "#F8B293", "#B88B7A", "#8DCF9B", "#797676", "#fbebf1",
    "#7c8962", "#E57365", "#FF5741",
  ],
  common: [
    "#66CCFF", "#66FF99", "#c70039", "#7FDBFF", "#FF6666", "#3366FF",
    "#ffc91a", "#F4B183", "#B89B7A", "#8BCF9B", "#787676", "#fbeef1",
    "#7d8962", "#E57373", "#FF5740",
  ],
};

export const MAX_POINTS = PART_TWO_POINTS.reduce(
  (total, points) => total + points,
  PART_ONE_COUNT,
);

export function calculateScore(points, elapsedSeconds) {
  if (!Number.isInteger(points) || points <= 0) return 0;

  const time = Number.isFinite(elapsedSeconds)
    ? Math.max(1, Math.floor(elapsedSeconds))
    : 1;
  return points * 1000 + Math.round(10000 / (time + 10));
}

// A one-point difference is always worth more than the largest possible time
// bonus (909), so correct answers always take precedence over speed.
export const MAX_SCORE = calculateScore(MAX_POINTS, 1);

export function calculateAttemptPoints(attempt, partOneAnswers, partTwoAnswers) {
  const correctPartOne = Array.isArray(attempt?.partOneAnswers)
    ? attempt.partOneAnswers
    : Array.isArray(attempt?.imageOrder)
      ? attempt.imageOrder.map(
          (imageNumber) => PART_ONE_IMAGE_ANSWERS[imageNumber - 1],
        )
      : [];
  const correctPartTwo = Array.isArray(attempt?.partTwoAnswers)
    ? attempt.partTwoAnswers
    : [];

  const imagePoints = correctPartOne.reduce((points, answer, index) => {
    const value = partOneAnswers[index];
    return points + (Number(value) === answer ? 1 : 0);
  }, 0);

  const colourPoints = correctPartTwo.reduce((points, answer, index) => {
    const value = partTwoAnswers[index];
    return points + (value === answer ? PART_TWO_POINTS[index] : 0);
  }, 0);

  return imagePoints + colourPoints;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createQuizAttempt(random = Math.random) {
  const imageOrder = shuffle(
    Array.from({ length: PART_ONE_COUNT }, (_, index) => index + 1),
    random,
  );
  const partTwoAnswers = Array.from(
    { length: PART_TWO_COUNT },
    () => Math.floor(random() * 4) + 1,
  );

  return {
    imageOrder,
    partOneAnswers: imageOrder.map(
      (imageNumber) => PART_ONE_IMAGE_ANSWERS[imageNumber - 1],
    ),
    partTwoAnswers,
  };
}

export function createColourOptions(partTwoAnswers) {
  return partTwoAnswers.map((specialIndex, questionIndex) =>
    Array.from({ length: 4 }, (_, optionIndex) =>
      optionIndex + 1 === specialIndex
        ? COLOUR_SETS.special[questionIndex]
        : COLOUR_SETS.common[questionIndex],
    ),
  );
}
