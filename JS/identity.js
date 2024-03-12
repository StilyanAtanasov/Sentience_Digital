export function validateUsername(input) {
  let username = input.trim(); // Trim whitespace

  // Check if the username is whitespace
  if (username === ``) {
    alert(`The username cannot be whitespace only!`);
    return;
  }

  // Check if the username contains sensitive or offensive words from a list of predefined word of this kind
  return fetch("../security/Lists of sensitive and offensive words.txt")
    .then((res) => res.text())
    .then((text) => {
      const words = text.split("\n").map((word) => word.trim());
      let usernameLower = username.toLowerCase();
      for (const word of words) {
        if (usernameLower.includes(word.toLowerCase())) {
          alert(
            `Username cannot contain ${word}! Please do not include sensitive or offensive words in your username!`
          );
          return false;
        }
      }

      return true;
    })
    .catch((e) => {
      console.error(e);
      return false;
    });
}

// ----- Set user's name
export async function setUserName(username) {
  //Validate the username
  if (!(await validateUsername(username))) return;
  // Encode the username to ensure special characters are properly handled
  window.location.replace(
    `../main/main.html?username=${encodeURIComponent(username)}`
  );
}

const identityForm = document.getElementById(`identityForm`);
if (identityForm != null) {
  identityForm.addEventListener(`submit`, function () {
    const username = document.getElementById("username").value;
    setUserName(username);
  });
}
