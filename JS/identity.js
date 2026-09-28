import {
  getUsernameValidationError,
  sanitizeUsername,
} from "../shared/username.js";

function showStatus(statusElement, message) {
  if (statusElement) statusElement.textContent = message;
  else alert(message);
}

export async function validateUsername(input, statusElement = null) {
  const formatError = getUsernameValidationError(input);
  const username = sanitizeUsername(input);

  if (formatError) {
    showStatus(statusElement, formatError);
    return false;
  }

  try {
    const res = await fetch(
      `/api/check-username?name=${encodeURIComponent(username)}`,
    );

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const msg =
        errorData.error || "Failed to validate username. Please try again.";
      showStatus(statusElement, msg);
      return false;
    }

    const { available, appropriate } = await res.json();

    if (!appropriate) {
      const msg =
        "Username contains inappropriate or sensitive words. Please choose another!";
      showStatus(statusElement, msg);
      return false;
    }

    if (!available) {
      const msg = "That username is already taken. Please choose another.";
      showStatus(statusElement, msg);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Username validation error:", error);
    const msg = "Unable to connect to validation server. Please try again.";
    showStatus(statusElement, msg);
    return false;
  }
}

// ----- Set user's name
export async function setUserName(username, statusElement = null) {
  // Single validation step now checks both profanity & availability via serverless function
  const isValid = await validateUsername(username, statusElement);
  if (!isValid) return false;

  window.location.replace(
    `../main/main?username=${encodeURIComponent(sanitizeUsername(username))}`,
  );

  return true;
}

const identityForm = document.getElementById("identityForm");
const submitButton = identityForm?.querySelector(".submit");
const usernameStatus = document.getElementById("usernameStatus");

if (identityForm != null) {
  identityForm.addEventListener("submit", async function (event) {
    // Prevent default HTML form submission to stop page reloads
    event.preventDefault();

    const username = new FormData(identityForm).get("username") ?? "";

    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitButton.setAttribute("aria-busy", "true");

    if (usernameStatus) {
      usernameStatus.textContent = "Checking username...";
      usernameStatus.classList.remove("is-error", "is-success");
      usernameStatus.classList.add("is-checking");
    }

    try {
      const success = await setUserName(username, usernameStatus);
      if (success && usernameStatus) {
        usernameStatus.textContent = "Username available. Redirecting...";
        usernameStatus.classList.remove("is-checking", "is-error");
        usernameStatus.classList.add("is-success");
      } else if (!success && usernameStatus) {
        usernameStatus.classList.remove("is-checking");
        usernameStatus.classList.add("is-error");
      }
    } catch (err) {
      if (usernameStatus) {
        usernameStatus.textContent = "An error occurred. Please try again.";
        usernameStatus.classList.remove("is-checking");
        usernameStatus.classList.add("is-error");
      }
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove("is-loading");
      submitButton.removeAttribute("aria-busy");
    }
  });
}
