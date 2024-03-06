// User Score
let username = ``;

// Set user's name
function setUserName(name) {
  // Encode the username to ensure special characters are properly handled
  window.location.replace(
    `../main/main.html?username=${encodeURIComponent(name)}`
  );
}
