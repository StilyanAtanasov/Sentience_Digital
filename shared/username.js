export const USERNAME_MAX_LENGTH = 40;

export function sanitizeUsername(value) {
  return typeof value === "string" ? value.normalize("NFKC").trim() : "";
}

export function normalizeUsername(username) {
  return sanitizeUsername(username).toLocaleLowerCase("und");
}

export function getUsernameValidationError(value) {
  const username = sanitizeUsername(value);

  if (!username) return "Please enter a username.";
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`;
  }
  if (/[\x00-\x1F\x7F\p{Cf}]/u.test(username)) {
    return "Username contains unsupported characters.";
  }

  return null;
}

export function hasDuplicateUsername(records, username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  return Object.values(records ?? {}).some(
    (record) =>
      record &&
      typeof record.username === "string" &&
      normalizeUsername(record.username) === normalized,
  );
}
