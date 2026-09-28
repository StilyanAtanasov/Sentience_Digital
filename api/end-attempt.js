import { auth } from "./_firebase.js";
import { verifyRequest } from "./_auth.js";
import { checkRateLimit, getClientIp, redis } from "./_rate-limit.js";
import { parseJsonValue, readJsonBody } from "../shared/parse-json.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const decodedToken = await verifyRequest(auth, request);
  if (!decodedToken) {
    return response.status(401).json({ error: "Authentication required" });
  }

  const allowed = await checkRateLimit(
    `attempt-end:ip:${getClientIp(request)}`,
    20,
    600,
  );
  if (!allowed) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "Too many requests" });
  }

  const { attemptId } = readJsonBody(request.body);
  if (typeof attemptId !== "string" || !/^[a-f0-9-]{36}$/i.test(attemptId)) {
    return response.status(400).json({ error: "Invalid quiz attempt" });
  }

  try {
    const attempt = parseJsonValue(await redis.get(`quiz-attempt:${attemptId}`));
    if (!attempt || attempt.uid !== decodedToken.uid) {
      return response.status(404).end();
    }

    await redis.del(`quiz-attempt:${attemptId}`);
    return response.status(204).end();
  } catch (error) {
    console.error("Failed to end quiz attempt", error);
    return response.status(500).json({ error: "Unable to end quiz" });
  }
}
