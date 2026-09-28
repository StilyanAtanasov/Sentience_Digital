import { database } from "./_firebase.js";
import { checkRateLimit, getClientIp } from "./_rate-limit.js";

const LIMIT = 100;

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const allowed = await checkRateLimit(
      `leaderboard:ip:${getClientIp(request)}`,
      60,
      60,
    );

    if (!allowed) {
      response.setHeader("Retry-After", "60");
      return response.status(429).json({ error: "Too many requests" });
    }

    const snapshot = await database.ref("users").once("value");
    const records = snapshot.val() ?? {};
    const leaderboard = Object.values(records)
      .filter(
        (record) =>
          record &&
          typeof record === "object" &&
          typeof record.username === "string" &&
          Number.isInteger(record.points) &&
          Number.isInteger(record.time) &&
          Number.isInteger(record.score),
      )
      .map(({ username, points, time, score }) => ({
        username,
        points,
        time,
        score,
      }))
      .sort(
        (first, second) =>
          second.score - first.score ||
          second.points - first.points ||
          first.time - second.time ||
          first.username.localeCompare(second.username),
      )
      .slice(0, LIMIT);

    return response.status(200).json(leaderboard);
  } catch (error) {
    console.error("Failed to read leaderboard", error);
    return response.status(500).json({ error: "Unable to load leaderboard" });
  }
}
