import { database } from "./_firebase.js";
import { checkRateLimit, getClientIp } from "./_rate-limit.js";
import {
  getUsernameValidationError,
  hasDuplicateUsername,
  sanitizeUsername,
} from "../shared/username.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const allowed = await checkRateLimit(
    `username-check:ip:${getClientIp(request)}`,
    30,
    60,
  );

  if (!allowed) {
    response.setHeader("Retry-After", "60");
    return response.status(429).json({ error: "Too many requests" });
  }

  const rawUsername = request.query?.name;
  const username = sanitizeUsername(rawUsername);
  const formatError = getUsernameValidationError(rawUsername);
  if (formatError) {
    return response.status(400).json({ error: formatError });
  }

  try {
    const snapshot = await database.ref("users").once("value");
    const records = snapshot.val() ?? {};
    const exists = hasDuplicateUsername(records, username);

    let appropriate = true;
    const res = await fetch("https://vector.profanity.dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: username }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Failed to check profanity");
    const data = await res.json();
    appropriate = data?.isProfanity === false;

    return response.status(200).json({ available: !exists, appropriate });
  } catch (error) {
    console.error("Failed to check username", error);
    return response.status(500).json({ error: "Unable to check username" });
  }
}
