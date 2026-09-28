import { auth, database } from "./_firebase.js";
import { verifyRequest } from "./_auth.js";
import { checkRateLimit, getClientIp, redis } from "./_rate-limit.js";
import {
  calculateAttemptPoints,
  calculateScore,
  MAX_POINTS,
  MAX_SCORE,
} from "./_quiz.js";
import {
  getUsernameValidationError,
  hasDuplicateUsername,
  normalizeUsername,
  sanitizeUsername,
} from "../shared/username.js";
import { parseJsonValue, readJsonBody } from "../shared/parse-json.js";
import { createHash } from "node:crypto";

function isValidPartOneAnswers(answers) {
  return (
    Array.isArray(answers) &&
    answers.length === 10 &&
    answers.every((answer) => typeof answer === "string" && answer.length <= 20)
  );
}

function isValidPartTwoAnswers(answers) {
  return (
    Array.isArray(answers) &&
    answers.length === 15 &&
    answers.every(
      (answer) =>
        answer === null ||
        (Number.isInteger(answer) && answer >= 1 && answer <= 4),
    )
  );
}

function usernameIndexKey(username) {
  return createHash("sha256").update(normalizeUsername(username)).digest("hex");
}

export default async function handler(request, response) {
  const receivedAt = Date.now();

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const decodedToken = await verifyRequest(auth, request);
  if (!decodedToken)
    return response.status(401).json({ error: "Invalid authentication" });

  const userAllowed = await checkRateLimit(
    `score:user:${decodedToken.uid}`,
    3,
    600,
  );
  const ipAllowed = await checkRateLimit(
    `score:ip:${getClientIp(request)}`,
    30,
    600,
  );

  if (!userAllowed || !ipAllowed) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "Too many submissions" });
  }

  const { name, attemptId, partOneAnswers, partTwoAnswers } = readJsonBody(
    request.body,
  );
  const username = sanitizeUsername(name);
  const usernameError = getUsernameValidationError(name);

  if (
    usernameError ||
    !isValidPartOneAnswers(partOneAnswers) ||
    !isValidPartTwoAnswers(partTwoAnswers) ||
    typeof attemptId !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(attemptId)
  ) {
    return response.status(400).json({ error: "Invalid data" });
  }

  try {
    const attemptKey = `quiz-attempt:${attemptId}`;
    const pendingAttempt = parseJsonValue(await redis.get(attemptKey));
    if (!pendingAttempt || pendingAttempt.uid !== decodedToken.uid) {
      return response.status(400).json({ error: "Invalid quiz attempt" });
    }

    const time = Math.max(
      1,
      Math.floor((receivedAt - Number(pendingAttempt.startedAt)) / 1000),
    );
    if (!Number.isFinite(time) || time > 3600) {
      return response.status(400).json({ error: "Quiz attempt has expired" });
    }

    const profanityRes = await fetch("https://vector.profanity.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: username }),
      signal: AbortSignal.timeout(5000),
    });
    if (!profanityRes.ok) {
      return response.status(502).json({ error: "Unable to verify username" });
    }
    const profanityData = await profanityRes.json();
    if (profanityData?.isProfanity !== false) {
      return response
        .status(400)
        .json({ error: "Username contains inappropriate or sensitive words" });
    }

    const usersRef = database.ref("users");
    const snapshot = await usersRef.once("value");
    const records = snapshot.val() ?? {};
    if (hasDuplicateUsername(records, username)) {
      return response.status(409).json({ error: "Username already exists" });
    }

    // GETDEL is atomic: one quiz attempt can produce at most one submission,
    // even when requests arrive concurrently.
    const attempt = parseJsonValue(await redis.getdel(attemptKey));
    if (!attempt || attempt.uid !== decodedToken.uid) {
      return response.status(400).json({ error: "Invalid quiz attempt" });
    }

    const points = calculateAttemptPoints(
      attempt,
      partOneAnswers,
      partTwoAnswers,
    );
    const score = calculateScore(points, time);
    if (points > MAX_POINTS || score > MAX_SCORE) {
      return response.status(400).json({ error: "Invalid score data" });
    }

    const newUserRef = usersRef.push();
    const usernameRef = database.ref(`usernameIndex/${usernameIndexKey(username)}`);
    const reservation = await usernameRef.transaction((currentUserId) =>
      currentUserId == null ? newUserRef.key : undefined,
    );
    if (!reservation.committed) {
      return response.status(409).json({ error: "Username already exists" });
    }

    try {
      await newUserRef.set({ username, points, time, score });
    } catch (error) {
      await usernameRef.transaction((currentUserId) =>
        currentUserId === newUserRef.key ? null : undefined,
      );
      throw error;
    }
    return response.status(201).json({ ok: true, score, points });
  } catch (error) {
    console.error("Failed to write score", error);
    return response.status(500).json({ error: "Unable to save score" });
  }
}
