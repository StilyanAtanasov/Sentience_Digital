// Validate the form
function validateForm(input) {
  let username = input.trim(); // Trim whitespace
  if (username === "") {
    // check for empty space
    alert("Please enter valid input.");
    return;
  }

  setUserName(username);
}

// Set user's name
function setUserName(name) {
  // Encode the username to ensure special characters are properly handled
  window.location.replace(
    `../main/main.html?username=${encodeURIComponent(name)}`
  );
}
