export async function verifyRequest(auth, request) {
  const authorization = request.headers.authorization ?? "";
  if (!authorization.startsWith("Bearer ")) return null;

  try {
    return await auth.verifyIdToken(authorization.slice("Bearer ".length));
  } catch {
    return null;
  }
}
