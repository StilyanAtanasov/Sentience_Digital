import { endQuizAttempt, startQuizAttempt, submitQuizAttempt } from "./core.js";
import { PART_TWO_DIFFICULTIES } from "./quiz-config.js";
import { getUsernameValidationError, sanitizeUsername } from "../shared/username.js";

const loaderBox = document.getElementById("loaderBox");
const test = document.getElementById("test");
const timerElement = document.getElementById("timer");
const username = sanitizeUsername(
  new URLSearchParams(window.location.search).get("username"),
);

if (getUsernameValidationError(username)) {
  window.location.replace("../identity/identity");
} else {
  initialiseQuiz(username);
}

async function initialiseQuiz(playerName) {
  let attempt;
  try {
    attempt = await startQuizAttempt();
  } catch (error) {
    console.error("Failed to start quiz", error);
    alert("The quiz could not be started. Please try again.");
    window.location.replace("../identity/identity");
    return;
  }

  const startedAt = Date.now();
  const timerId = window.setInterval(() => {
    timerElement.textContent = formatTime(getSecondsElapsed(startedAt));
  }, 1000);
  timerElement.textContent = formatTime(0);

  const { submitButton, endButton } = renderQuiz(test, attempt);
  loaderBox?.classList.add("hidden");

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    endButton.disabled = isBusy;
  }

  test.addEventListener("submit", async (event) => {
    event.preventDefault();
    setBusy(true);
    submitButton.classList.add("is-loading");
    submitButton.textContent = "Submitting...";

    const partOneAnswers = [...test.querySelectorAll(".userPrompt")].map(
      (input) => input.value.trim(),
    );
    const partTwoAnswers = [...test.querySelectorAll(".answersBox")].map(
      (box) => {
        const selected = box.querySelector('input[type="radio"]:checked');
        return selected ? Number(selected.value) : null;
      },
    );

    try {
      const result = await submitQuizAttempt(
        playerName,
        attempt.attemptId,
        partOneAnswers,
        partTwoAnswers,
      );
      window.clearInterval(timerId);
      alert(`Your score: ${result.score}`);
      window.location.replace("../leaderboard/leaderboard");
    } catch (error) {
      console.error("Failed to submit score", error);
      setBusy(false);
      submitButton.classList.remove("is-loading");
      submitButton.textContent = "Submit results";
      alert(error.message || "Your score could not be submitted. Please try again.");
    }
  });

  endButton.addEventListener("click", async () => {
    const shouldEnd = window.confirm(
      "End this test without sending your results? Your answers will be discarded.",
    );
    if (!shouldEnd) return;

    setBusy(true);
    endButton.textContent = "Ending...";
    window.clearInterval(timerId);

    try {
      await endQuizAttempt(attempt.attemptId);
    } catch (error) {
      // Leaving still guarantees that no result is displayed or submitted. The
      // server-side attempt will expire automatically if it could not be deleted.
      console.warn("Failed to remove quiz attempt", error);
    }

    window.location.replace("../identity/identity");
  });
}

function formatTime(seconds) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(
    Math.floor((seconds % 3600) / 60),
  )}:${pad(seconds % 60)}`;
}

function getSecondsElapsed(startedAt) {
  return Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
}

function renderQuiz(form, attempt) {
  const fragment = document.createDocumentFragment();
  fragment.append(
    createPartOne(attempt.imageOrder),
    createPartTwo(attempt.colourOptions),
  );

  const actions = document.createElement("div");
  actions.className = "quiz-actions";

  const submitButton = document.createElement("button");
  submitButton.id = "handInButton";
  submitButton.className = "submitBTN";
  submitButton.type = "submit";
  submitButton.textContent = "Submit results";

  const endButton = document.createElement("button");
  endButton.className = "end-test-button";
  endButton.type = "button";
  endButton.textContent = "End without sending results";

  actions.append(submitButton, endButton);
  fragment.append(actions);
  form.replaceChildren(fragment);

  return { submitButton, endButton };
}

function createPartOne(imageOrder) {
  const section = createPartSection("Part I");
  imageOrder.forEach((imageNumber, index) => {
    const question = createQuestion(index + 1, "What is written in the image?");
    const imageBox = document.createElement("div");
    imageBox.className = "imgBox";

    const image = document.createElement("img");
    image.src = `../main/test-images/${Number(imageNumber)}.png`;
    image.alt = `Test question image ${index + 1}`;
    imageBox.append(image);

    const task = document.createElement("p");
    task.className = "task";
    task.textContent = "Type your answer below:";

    const input = document.createElement("input");
    input.className = "userPrompt";
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 3;
    input.setAttribute("aria-label", `Answer to question ${index + 1}`);

    question.append(imageBox, task, input);
    section.append(question);
  });
  return section;
}

function createPartTwo(colourOptions) {
  const section = createPartSection("Part II");
  colourOptions.forEach((questionColours, index) => {
    const questionNumber = index + 1;
    const question = createQuestion(
      questionNumber,
      "Which field has a different colour?",
      PART_TWO_DIFFICULTIES[index],
    );

    const colourBox = document.createElement("div");
    colourBox.className = "colourBox";
    for (let option = 1; option <= 4; option += 1) {
      const cell = document.createElement("div");
      cell.className = "colourCell";
      cell.style.backgroundColor = questionColours[option - 1];
      cell.textContent = option;
      colourBox.append(cell);
    }

    const task = document.createElement("p");
    task.className = "task";
    task.textContent = "Select the correct answer:";
    question.append(colourBox, task, createAnswerOptions(questionNumber));
    section.append(question);
  });
  return section;
}

function createPartSection(title) {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.className = "testPart";
  heading.textContent = title;
  section.append(heading, document.createElement("hr"));
  return section;
}

function createQuestion(number, prompt, difficulty = "") {
  const question = document.createElement("section");
  question.className = "questionBox";

  const heading = document.createElement("h2");
  heading.className = "questionNumber";
  heading.textContent = `Question ${number}${difficulty ? ` ${difficulty}` : ""}:`;

  const description = document.createElement("h3");
  description.textContent = prompt;
  question.append(heading, description);
  return question;
}

function createAnswerOptions(questionNumber) {
  const answers = document.createElement("div");
  answers.className = "answersBox";

  for (let option = 1; option <= 4; option += 1) {
    const answer = document.createElement("div");
    answer.className = "answer";

    const input = document.createElement("input");
    input.type = "radio";
    input.id = `part-two-question-${questionNumber}-option-${option}`;
    input.name = `part-two-question-${questionNumber}`;
    input.value = option;

    const label = document.createElement("label");
    label.htmlFor = input.id;
    label.textContent = option;
    answer.append(input, label);
    answers.append(answer);
  }
  return answers;
}
