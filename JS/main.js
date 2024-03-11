import { validateUsername } from "./identity.js";

// --------- Handle Page
window.addEventListener(`load`, function () {
  // Retrieve a reference the test form
  const test = document.getElementById(`test`);

  // Generate Test Parts
  for (let sectionIndex = 1; sectionIndex <= 2; sectionIndex++) {
    // Initialize a new section
    const testSection = document.createElement(`section`);

    // Initialize the part heading
    const heading = document.createElement(`h2`);
    heading.className = `testPart`;
    heading.innerText = `Part ${sectionIndex}`;

    // Append the heading and a horizontal rule
    testSection.appendChild(heading);
    testSection.appendChild(document.createElement(`hr`));

    // Generate Test Questions Per Part
    for (let index = 1; index <= 10; index++) {
      // Generate a new question an initialize 4 answers for each of them [calling the function generateAnswers with 4]
      const question = document.createElement(`section`);
      question.className = `questionBox`;
      question.innerHTML = `
        <h2 class="questionNumber">Question ${index}:</h2>
        <h4>Which field has different color?</h4>
        <div class="colorBox">
              <div>1</div>
              <div>2</div>
              <div>3</div>
              <div>4</div>
            </div>
        <p class="task">Select the correct answer:</p>
        <div class="answersBox">
        ${generateAnswers(sectionIndex, index, 4)}
        </div>
      `;

      // Append the section
      testSection.appendChild(question);
      test.appendChild(testSection);
    }
  }

  // Generate a submit button
  const handInButton = this.document.createElement(`button`);
  handInButton.className = `submitBTN`;
  handInButton.type = `submit`;
  handInButton.innerText = `Submit`;

  // Appent the button
  test.appendChild(handInButton);
});

function generateAnswers(section, question, answersCount) {
  let result = ``;
  for (let index = 1; index <= answersCount; index++) {
    result += `<div class="answer">
  <input type="radio" id="s${section}_q${question}_option${index}" name="s${section}_q${question}_answer" value="${index}" />
  <label for="s${section}_q${question}_option${index}">${index}</label>
</div>`;
  }

  return result;
}

// --------- Handle User

// User Score
let username = ``;
let score = -1;

// Get the username from URL parameter
const getParameterByName = (name) =>
  new URLSearchParams(window.location.search).get(name) || "";

// Get the username from URL parameter
username = getParameterByName("username");
// Validate the username if it was manualy changed
if (!(await validateUsername(username)))
  window.location.replace(`../identity/identity.html`);

// Stop the access of the user to the main without being set their name
if (window.location.pathname.endsWith(`/main.html`) && username == "") {
  window.location.replace(`../identity/identity.html`);
}
