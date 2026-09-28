"use strict";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  getIdToken,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyA3kQgeZB4fXs1zDGOWjcDkUgn48ZimqPs",
  authDomain: "sentience-8e8e5.firebaseapp.com",
  projectId: "sentience-8e8e5",
  appId: "1:929549475301:web:63d7ae801cbe092fc6a30c",
});

const auth = getAuth(app);
const authentication = signInAnonymously(auth);

async function getToken() {
  await authentication;
  return getIdToken(auth.currentUser);
}

export async function startQuizAttempt() {
  const token = await getToken();
  const response = await fetch("/api/start-attempt", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to start attempt (${response.status})`);
  }

  const data = await response.json();
  return data;
}

export async function submitQuizAttempt(
  name,
  attemptId,
  partOneAnswers,
  partTwoAnswers,
) {
  const token = await getToken();
  const response = await fetch("/api/submit-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name,
      attemptId,
      partOneAnswers,
      partTwoAnswers,
    }),
  });

  const errData = await response.json().catch(() => ({}));
  if (response.status === 409) {
    throw new Error(
      "That username is already on the leaderboard. Please choose another.",
    );
  }
  if (response.status === 429) {
    throw new Error(
      "Rate limit reached: Maximum 3 attempts per 10 minutes. Please wait before trying again.",
    );
  }
  if (!response.ok) {
    throw new Error(
      errData.error || `Your score could not be saved (${response.status}).`,
    );
  }

  return errData;
}

export async function endQuizAttempt(attemptId) {
  const token = await getToken();
  const response = await fetch("/api/end-attempt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ attemptId }),
  });

  if (!response.ok && response.status !== 404) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Unable to end the quiz.");
  }
}

export async function readUserData() {
  const response = await fetch("/api/leaderboard");
  if (!response.ok) {
    throw new Error(`Failed to load leaderboard (${response.status})`);
  }
  return response.json();
}
