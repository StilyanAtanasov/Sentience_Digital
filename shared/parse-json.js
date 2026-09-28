export function parseJsonValue(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function readJsonBody(body) {
  if (body == null) return {};
  if (typeof body === "object") return body;

  const parsed = parseJsonValue(body);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed;
  }

  return {};
}
