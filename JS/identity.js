// Validate the form
function validateForm(input) {
  let username = input.trim(); // Trim whitespace

  // Check if the username is whitespace
  if (username === ``) {
    alert(`Please enter valid input.`);
    return;
  }

  // Check if the username contains sensitive or offensive words
  let flaggedWordFound = `--none`;
  fetch("../security/Lists of sensitive and offensive words[English].txt")
    .then((res) => res.text())
    .then((text) => {
      const words = text.split("\n").map((word) => word.trim());
      words.forEach((word) => {
        if (String(username).includes(word)) {
          flaggedWordFound = word;
          alert(
            `Username cannot contain ${flaggedWordFound}! Please do not include sensitive or offensive word in your username!`
          );
          return;
        }
      });

      if (flaggedWordFound === `--none`) setUserName(username);
    })
    .catch((e) => console.error(e));
}

// Set user's name
function setUserName(name) {
  // Encode the username to ensure special characters are properly handled
  window.location.replace(
    `../main/main.html?username=${encodeURIComponent(name)}`
  );
}
