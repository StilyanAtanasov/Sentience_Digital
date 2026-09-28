# Sentience Digital

![Sentience Digital](https://img.shields.io/badge/Sentience%20Digital-visual%20alertness%20test-2364aa?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853d?style=flat-square&logo=node.js&logoColor=white)
![Vercel](https://img.shields.io/badge/deployed%20with-Vercel-black?style=flat-square&logo=vercel)
![Tests](https://img.shields.io/badge/tests-26%20unit%20%2B%206%20E2E-success?style=flat-square)

> A timed, server-validated visual alertness challenge built around observation, colour discrimination, and a public leaderboard.

Sentience Digital is a small full-stack quiz application with an intentionally strict trust model. The browser provides the experience, but it does not decide the result. Quiz attempts, answer keys, elapsed time, score calculation, username reservation, and leaderboard writes are controlled by server-side code.

The project is designed as both a playable experience and a practical example of how to protect a browser-based competition from ordinary client-side tampering.

---

## Contents

- [Product idea](#product-idea)
- [How the experience works](#how-the-experience-works)
- [Question and scoring model](#question-and-scoring-model)
- [Architecture](#architecture)
- [End-to-end request flow](#end-to-end-request-flow)
- [Security model](#security-model)
- [Data model](#data-model)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Known limitations and operational notes](#known-limitations-and-operational-notes)
- [Design decisions](#design-decisions)
- [License](#license)

---

## Product idea

The application presents a short, focused test in which users must combine two different kinds of attention:

1. **Visual recall:** identify the number written in a shuffled image.
2. **Visual discrimination:** identify which of four colour fields is different.

The test is deliberately simple to understand but difficult to optimize by guessing. Questions are generated on the server, the second section uses weighted difficulty, and speed contributes only a limited bonus. This makes accuracy the dominant factor while still rewarding a decisive, well-paced attempt.

The public leaderboard gives the test a repeatable competitive loop:

```text
Choose a name -> Start a test -> Answer 25 questions -> Submit once -> Compare scores
```

### Goals

- Provide a polished, distraction-free quiz experience.
- Keep the answer key out of browser-delivered source code.
- Calculate points and time on the server.
- Make replaying or duplicating an attempt difficult.
- Keep usernames readable, normalized, and reasonably moderated.
- Use a lightweight serverless architecture with minimal operational overhead.

### Non-goals

- It is not a medical, psychological, or clinical assessment.
- Anonymous Firebase authentication does not prove that one human equals one account.
- The application does not claim to stop determined automation or physically assisted cheating.

---

## How the experience works

### 1. Identity page

The user enters a display name on the identity page. The browser sends it to `GET /api/check-username` for:

- format validation;
- Unicode normalization;
- duplicate detection;
- profanity screening through `vector.profanity.dev`.

This first check improves the user experience, but it is not treated as the final authority. The name is validated and checked again when the score is submitted because another user may claim the name between those two requests.

### 2. Anonymous authentication

The browser signs in anonymously with Firebase Authentication. Firebase returns an ID token, which is sent to protected API routes as a Bearer token.

The anonymous account gives the server a stable Firebase UID for the current browser identity without requiring an email address or password.

### 3. Attempt creation

`POST /api/start-attempt` creates a UUID attempt ID and a server-side attempt record. The record contains:

- the authenticated Firebase UID;
- the shuffled image order;
- the image answer key for that order;
- the correct colour option for each colour question;
- the server start timestamp.

The attempt is stored in Upstash Redis with a one-hour expiration. The browser receives the attempt ID and display data, but the API does not expose the answer key as a separate public configuration file.

### 4. Quiz interaction

The browser renders the questions dynamically. It uses safe DOM APIs such as `textContent` for user-visible text and collects:

- ten text answers for Part I;
- fifteen radio-button answers for Part II;
- `null` for unanswered colour questions.

The visible timer is informational. The server timestamp is authoritative.

### 5. Submission

`POST /api/submit-score` validates the request, verifies ownership, checks the attempt age, re-checks the username, atomically consumes the Redis attempt, calculates points, calculates the score, reserves the username, and writes the leaderboard record.

### 6. Leaderboard

`GET /api/leaderboard` reads Firebase records, filters malformed records, sorts valid entries, and returns the top 100 results.

The ranking order is:

1. Higher score.
2. Higher raw points.
3. Lower elapsed time.
4. Alphabetical username as a deterministic final tie-breaker.

---

## Question and scoring model

### Question composition

| Section   | Questions |         Points | How it works                           |
| --------- | --------: | -------------: | -------------------------------------- |
| Part I    |        10 |         1 each | Type the number shown in each image.   |
| Part II   |        15 |   1 to 10 each | Select the differently coloured field. |
| **Total** |    **25** | **66 maximum** | Accuracy is more important than speed. |

Part II uses the following weights:

```text
[1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 5, 6, 7, 8, 10]
```

The sum is 56. Adding the ten Part I points gives a maximum of 66.

### Randomization

Each attempt randomizes two things independently:

- the order of the ten image questions;
- the correct option index from 1 to 4 for each colour question.

The image order is generated with an in-place Fisher-Yates shuffle. The result is a permutation: every image appears exactly once, with no duplicates introduced by the shuffle.

The colour display is then generated from the selected correct index. One field uses the `special` colour and the other three use the corresponding `common` colour.

### Point calculation

For each Part I answer, the submitted value is converted with `Number()` and compared with the server-stored numeric answer. Each exact match contributes one point.

For each Part II answer, the submitted integer is compared strictly with the server-stored correct option. A correct answer contributes that question's configured weight; an unanswered question contributes zero.

The server never accepts a client-provided point total.

### Final score formula

```text
score = points × 1000 + round(10000 / (elapsedSeconds + 10))
```

The implementation applies these protections:

- non-positive or non-integer points produce a score of `0`;
- elapsed time is floored to whole seconds;
- elapsed time is never allowed below one second;
- attempts older than one hour are rejected;
- scores above the known maximum are rejected;
- the maximum possible time bonus is 909.

Because one additional point is worth 1,000 score units, no amount of speed can compensate for losing a correct answer.

#### Example

```text
points = 20
elapsedSeconds = 100

score = 20 × 1000 + round(10000 / 110)
score = 20,000 + 91
score = 20,091
```

---

## Architecture

```mermaid
flowchart LR
    Browser[Browser UI\nHTML CSS JavaScript]
    Auth[Firebase Authentication\nAnonymous ID token]
    Vercel[Vercel Functions\nAPI routes]
    Redis[Upstash Redis\nTemporary attempts\nRate-limit counters]
    Firebase[Firebase Admin SDK\nRealtime Database\nLeaderboard]
    Profanity[vector.profanity.dev\nUsername screening]

    Browser -->|sign in anonymously| Auth
    Browser -->|Bearer token + answers| Vercel
    Vercel -->|verify ID token| Auth
    Vercel -->|create/read/consume attempts| Redis
    Vercel -->|reserve name + write score| Firebase
    Vercel -->|screen username| Profanity
    Browser -->|read leaderboard through API| Vercel
```

### Runtime responsibilities

| Layer                 | Responsibility                                          | Trust level                  |
| --------------------- | ------------------------------------------------------- | ---------------------------- |
| Browser               | Rendering, input collection, navigation, friendly timer | Untrusted                    |
| Vercel API            | Authentication, validation, scoring, ownership, writes  | Trusted application boundary |
| Upstash Redis         | Expiring attempts and atomic one-time consumption       | Trusted infrastructure       |
| Firebase Admin        | Authentication verification and leaderboard persistence | Trusted infrastructure       |
| Firebase client rules | Prevent direct browser database access                  | Must be configured securely  |

The central principle is simple: **the browser is a presentation layer, not a referee**.

---

## End-to-end request flow

```mermaid
sequenceDiagram
    participant U as Browser
    participant A as Firebase Auth
    participant V as Vercel API
    participant R as Upstash Redis
    participant F as Firebase RTDB
    participant P as Profanity API

    U->>A: Sign in anonymously
    A-->>U: ID token
    U->>V: POST /api/start-attempt
    V->>A: Verify token
    V->>R: Store answer key and start time, TTL 1 hour
    V-->>U: Attempt ID and display data
    U->>V: POST /api/submit-score with answers
    V->>A: Verify token
    V->>R: Read attempt and verify UID
    V->>P: Check username
    V->>R: GETDEL attempt
    V->>F: Transactionally reserve username
    V->>F: Write score record
    V-->>U: Score and points
    U->>V: GET /api/leaderboard
    V->>F: Read and validate records
    V-->>U: Sorted top 100
```

### Why the submission order matters

The `GETDEL` operation is atomic. It prevents two concurrent requests from using the same attempt. Once consumed, the attempt cannot be replayed.

The trade-off is that a later Firebase failure can happen after the attempt has already been consumed. In that case, the user may lose a valid submission. This is documented as an operational limitation and is the main area that would benefit from a durable submission state or idempotency record.

---

## Security model

### Authentication and authorization

Protected routes require:

```http
Authorization: Bearer <Firebase ID token>
```

The API verifies the token with Firebase Admin. The decoded UID is stored with the Redis attempt and must match on submission and cancellation.

This provides attempt ownership: a valid token for one anonymous identity cannot submit another identity's attempt.

### Server-side answer keys

`api/_quiz.js` is server-only. It contains:

- image answer values;
- Part II correct-answer generation;
- point weights;
- score calculation;
- maximum score calculation.

The browser receives enough information to render the test, but the authoritative answer comparison remains on the server.

### Input validation

Submission validation checks:

- HTTP method;
- authentication token;
- username format and length;
- exactly ten Part I values;
- Part I value type and maximum length;
- exactly fifteen Part II values;
- Part II values of `null` or integers from 1 through 4;
- UUID-shaped attempt ID;
- attempt ownership;
- attempt age;
- score bounds.

Validation is performed server-side even when the browser already applies input restrictions.

### Replay prevention

Redis stores each attempt under a UUID-shaped key with a one-hour TTL. Submission uses atomic `GETDEL`, so a successful attempt is single-use.

The `end-attempt` route removes an unfinished attempt when a user leaves without submitting. If cancellation fails, the one-hour TTL still limits its lifetime.

### Username protection

Usernames are:

- normalized with Unicode NFKC normalization;
- trimmed;
- limited to 40 characters;
- rejected if they contain control or formatting characters;
- compared case-insensitively;
- checked against the profanity service;
- reserved in Firebase with a transaction.

The transaction is important because a normal read-then-write sequence could allow two simultaneous users to claim the same name.

The reservation key is a SHA-256 hash of the normalized username. The hash keeps the index key predictable and avoids placing the raw username directly in that path.

### Rate limiting

Rate limits are implemented with Redis `INCR` counters and expiration windows.

| Operation        | Key basis    |             Limit |
| ---------------- | ------------ | ----------------: |
| Start attempt    | Client IP    | 10 per 10 minutes |
| Submit score     | Firebase UID |  3 per 10 minutes |
| Submit score     | Client IP    | 30 per 10 minutes |
| End attempt      | Client IP    | 20 per 10 minutes |
| Username check   | Client IP    |     30 per minute |
| Leaderboard read | Client IP    |     60 per minute |

Rate limiting reduces accidental abuse and basic automation. It is not a complete identity or anti-cheating system, especially because anonymous Firebase accounts can be created repeatedly.

### Browser and response safety

The Vercel configuration adds:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- a restrictive referrer policy;
- a permissions policy disabling camera, geolocation, and microphone access.

Leaderboard names are rendered as text rather than injected as HTML, reducing the risk of username-based cross-site scripting.

### Firebase database rules

The browser should never have direct access to the Realtime Database. Configure Firebase rules to deny direct reads and writes:

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

The server uses the Firebase Admin SDK, which operates separately from these client rules.

---

## Data model

### Redis attempt record

Stored under:

```text
quiz-attempt:<attemptId>
```

Conceptual shape:

```json
{
  "uid": "firebase-user-id",
  "imageOrder": [4, 9, 1, 7, 3, 10, 2, 8, 6, 5],
  "partOneAnswers": [6, 2, 74, 1, 4, 2, 16, 5, 9, 6],
  "partTwoAnswers": [2, 4, 1, 3, 2, 1, 4, 3, 2, 4, 1, 3, 2, 4, 1],
  "startedAt": 1760000000000
}
```

The record expires automatically after one hour.

### Firebase leaderboard record

Stored under `users/<generated-id>`:

```json
{
  "username": "ExamplePlayer",
  "points": 54,
  "time": 87,
  "score": 54210
}
```

Username reservations are stored under a separate `usernameIndex/<sha256>` path and point to the generated Firebase user record key.

### Privacy note

The leaderboard intentionally stores a public display name, points, time, and score. It does not store email addresses or passwords. Anonymous Firebase UIDs are used for request ownership and are not returned in leaderboard responses.

---

## API reference

### `GET /api/check-username?name=<name>`

Checks whether a username is valid, available, and appropriate.

**Success response:**

```json
{
  "available": true,
  "appropriate": true
}
```

Possible responses include `400` for invalid input, `429` for rate limiting, and `500` when the database or profanity service cannot be reached.

### `POST /api/start-attempt`

Requires Firebase authentication. Creates a new one-hour attempt.

**Success response:**

```json
{
  "attemptId": "11111111-1111-4111-8111-111111111111",
  "imageOrder": [1, 8, 3, 10, 5, 2, 9, 4, 6, 7],
  "colourOptions": [["#...", "#...", "#...", "#..."]]
}
```

The answer key is retained by the server and is not accepted from the client.

### `POST /api/submit-score`

Requires Firebase authentication and a JSON body:

```json
{
  "name": "ExamplePlayer",
  "attemptId": "11111111-1111-4111-8111-111111111111",
  "partOneAnswers": ["74", "16", "", "6", "6", "9", "1", "2", "5", "2"],
  "partTwoAnswers": [1, 2, null, 4, 2, 3, 1, null, 2, 4, 1, 3, 2, 4, 1]
}
```

**Success response:**

```json
{
  "ok": true,
  "score": 54210,
  "points": 54
}
```

The route returns errors for invalid data, invalid or expired attempts, duplicate usernames, rate limits, profanity failures, and persistence failures.

### `POST /api/end-attempt`

Requires Firebase authentication and accepts:

```json
{
  "attemptId": "11111111-1111-4111-8111-111111111111"
}
```

The route verifies ownership and deletes the unfinished Redis attempt. A successful deletion returns `204 No Content`.

### `GET /api/leaderboard`

Returns up to 100 valid leaderboard entries:

```json
[
  {
    "username": "ExamplePlayer",
    "points": 54,
    "time": 87,
    "score": 54210
  }
]
```

Malformed Firebase records are ignored instead of being exposed to the browser.

---

## Project structure

```text
.
├── api/                         # Vercel serverless API routes
│   ├── _auth.js                 # Firebase ID-token verification
│   ├── _firebase.js             # Firebase Admin initialization
│   ├── _quiz.js                 # Server-only answer keys and scoring
│   ├── _rate-limit.js           # Redis counters and client-IP helper
│   ├── check-username.js        # Username availability and moderation
│   ├── end-attempt.js           # Cancel an unfinished attempt
│   ├── leaderboard.js            # Read and sort public results
│   ├── start-attempt.js          # Generate and store an attempt
│   └── submit-score.js           # Validate, score, reserve, and persist
├── assets/                      # Static media and visual resources
├── components/                  # Shared UI components and loader styles
├── global/                      # Global reset and shared styles
├── identity/                    # Username entry page
├── JS/                          # Browser-side application modules
│   ├── core.js                  # Firebase client and API calls
│   ├── identity.js              # Username-page behavior
│   ├── loader.js                # Loading-state behavior
│   ├── main.js                  # Quiz rendering and answer collection
│   └── quiz-config.js            # Public difficulty labels/configuration
├── leaderboard/                 # Leaderboard page and styles
├── main/                        # Quiz page, styles, and test images
├── shared/                      # Safe shared validation/parser utilities
├── test/                        # Unit and Playwright tests
├── .env.example                 # Required environment variable template
├── package.json                 # Scripts and dependencies
├── playwright.config.js         # Browser-test configuration
└── vercel.json                  # Vercel routing and security headers
```

The separation between `api/_quiz.js` and public browser modules is intentional. Moving the answer key into a browser-imported module would make it visible to anyone using browser developer tools.

---

## Local development

### Prerequisites

- Node.js 22 or later.
- A Firebase project with Authentication and Realtime Database enabled.
- Anonymous sign-in enabled in Firebase Authentication.
- An Upstash Redis database.
- Vercel CLI. Use a current version compatible with the installed Firebase Admin dependencies.

Check your versions:

```bash
node --version
npm --version
npx vercel --version
```

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create a local `.env` file from `.env.example`:

```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nPASTE_YOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://your-firebase-project-id-default-rtdb.region.firebasedatabase.app
UPSTASH_REDIS_REST_URL=https://your-redis-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-rest-token
```

Keep `.env` out of version control. The private key must remain server-only.

### Start the local server

Use Vercel's development server because the project depends on Vercel API routes and server environment variables:

```bash
npx vercel@latest dev
```

The application is normally available at:

```text
http://localhost:3000

```

Do not use a plain static file server when testing API-backed functionality. A static server can render the pages but cannot execute the serverless routes.

### Important local CLI note

Older Vercel CLI releases may fail while loading the current Firebase Admin dependency tree with an error similar to:

```text
require() of ES Module ... jose ... from ... jwks-rsa ... not supported
```

Use the current CLI explicitly:

```bash
npx vercel@latest dev
```

Node.js `22.12.0` or newer is recommended when using the latest Vercel CLI.

---

## Testing and verification

### Unit tests

```bash
npm test
```

The unit suite covers:

- question counts;
- answer-key sizes;
- image-order permutation integrity;
- score formula examples;
- point-priority behavior;
- maximum score bounds;
- image and colour point aggregation;
- JSON parsing behavior;
- username normalization and duplicate detection.

### End-to-end tests

```bash
npm run test:e2e
```

The Playwright suite checks:

- the identity page;
- username validation messaging;
- navigation into the quiz;
- ending an unfinished quiz;
- the leaderboard call to action;
- keyboard focus behavior.

### Full test command

```bash
npm run test:all
```

### Current coverage boundary

The existing tests do not fully exercise live Firebase and Redis failure behavior. Additional handler-level tests would be valuable for:

- concurrent submissions;
- replayed attempt IDs;
- wrong-user attempt access;
- Firebase write failures after Redis `GETDEL`;
- username reservation races;
- malformed Redis records;
- rate-limit exhaustion;
- trusted proxy IP handling;
- profanity-service timeouts.

---

## Deployment

### Vercel

The repository is structured for Vercel's file-based serverless functions:

- files in `api/` become API routes;
- static HTML, CSS, JavaScript, and images are served from the project root;
- `vercel.json` supplies clean URL behavior and response security headers.

Configure the same environment variables in the Vercel project settings. Never commit the Firebase private key or Upstash token.

### Firebase

Before production use:

1. Enable anonymous authentication.
2. Create the Realtime Database.
3. Deploy rules that deny direct client reads and writes.
4. Create a server service account with only the permissions required by the application.
5. Confirm the database URL matches the deployed Firebase project.

### Upstash Redis

The application expects REST credentials through environment variables. Redis stores temporary attempt state and rate-limit counters, so losing Redis availability affects starting, submitting, and throttling attempts.

### Production checklist

- [ ] Use a current Vercel CLI and Node.js runtime.
- [ ] Configure all production environment variables.
- [ ] Verify Firebase anonymous sign-in works.
- [ ] Deny direct Firebase client access.
- [ ] Confirm Upstash credentials and expiration behavior.
- [ ] Confirm the deployed site can call every API route.
- [ ] Test a full real submission with a non-production username.
- [ ] Verify rate limits and `Retry-After` responses.
- [ ] Review Firebase and Vercel logs after the first deployment.
- [ ] Run `npm audit` and review dependency advisories before release.

---

## Known limitations and operational notes

### Submission recovery

The submission path consumes the Redis attempt before the Firebase score write completes. If Firebase fails after consumption, the user may receive an error and be unable to retry the same attempt. A stronger production design would add a durable submission record or idempotency key so the operation can be retried safely.

### Attempt-ending race

`end-attempt` currently reads an attempt and then deletes it in two operations. A simultaneous submission could race with cancellation. This should be replaced with an atomic state transition if deterministic behavior under concurrency becomes important.

### IP header trust

Rate limiting uses `x-forwarded-for` and `x-real-ip`. This assumes the hosting proxy supplies trustworthy values. If the deployment environment allows clients to control these headers, IP-based limits can be bypassed.

### Anonymous identity

Anonymous Firebase accounts are convenient but can be recreated. The per-UID submission limit is therefore not equivalent to a per-person limit. Stronger abuse prevention could add CAPTCHA, stronger account requirements, device signals, or moderation workflows.

### External profanity service

Username submission depends on `vector.profanity.dev`. A timeout or non-success response causes the request to fail rather than silently accepting an unchecked name. This is safer for moderation consistency but means the external service is part of the submission availability path.

### Time measurement

Time is measured from the server's attempt creation timestamp to the server's receipt of the submission. Network latency contributes slightly to elapsed time, but the client cannot reduce the measured duration by changing its local clock.

---

## Design decisions

### Why serverless functions?

The application has small, request-oriented operations and does not need a continuously running application server. Vercel Functions provide a direct mapping from route files to endpoints and keep deployment simple.

### Why Redis for attempts?

Attempts are temporary, naturally expire, and need atomic one-time consumption. Redis provides TTLs and `GETDEL`, which fit those requirements better than storing unfinished attempts permanently in the leaderboard database.

### Why Firebase Realtime Database for scores?

Leaderboard records are small and the project needs straightforward server-side reads, transactions, and writes. Firebase Admin provides those operations without exposing database credentials to the browser.

### Why keep points and time separate from score?

The leaderboard stores the raw points, elapsed time, and final score. This makes the result explainable, supports deterministic tie-breaking, and preserves useful data if the presentation formula changes later.

### Why validate twice?

The identity page performs an early check to give the user immediate feedback. The submit route repeats all important checks because browser validation can be bypassed and because availability can change between requests.

---

## License

See [LICENSE](LICENSE) for the project license.

---

## Quick command reference

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run browser tests
npm run test:e2e

# Run all tests
npm run test:all

# Start the Vercel development environment
npx vercel@latest dev

# Check production dependency advisories
npm audit --omit=dev
```
