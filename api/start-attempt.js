import { auth } from "./_firebase.js";
import { verifyRequest } from "./_auth.js";
import { checkRateLimit, getClientIp, redis } from "./_rate-limit.js";
import { createColourOptions, createQuizAttempt } from "./_quiz.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const token = await verifyRequest(auth, request);
  if (!token)
    return response.status(401).json({ error: "Authentication required" });

  const allowed = await checkRateLimit(
    `attempt:ip:${getClientIp(request)}`,
    10,
    600,
  );
  if (!allowed) {
    response.setHeader("Retry-After", "600");
    return response.status(429).json({ error: "Too many attempts" });
  }

  const attemptId = crypto.randomUUID();
  const attempt = { ...createQuizAttempt(), startedAt: Date.now() };
  await redis.set(
    `quiz-attempt:${attemptId}`,
    { uid: token.uid, ...attempt },
    { ex: 3600 },
  );

  return response.status(201).json({
    attemptId,
    imageOrder: attempt.imageOrder,
    colourOptions: createColourOptions(attempt.partTwoAnswers),
  });
}
