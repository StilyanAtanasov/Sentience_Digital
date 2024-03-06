// User Score
let username = ``;
let score = -1;

// Get the username from URL parameter
const getParameterByName = (name) =>
  new URLSearchParams(window.location.search).get(name) || "";

// Get the username from URL parameter
username = getParameterByName("username");

// Stop the access of the user to the main without being set their name
if (window.location.pathname.endsWith(`/main.html`) && username == "") {
  window.location.replace(`../identity/identity.html`);
}
