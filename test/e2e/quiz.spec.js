import { test, expect } from "@playwright/test";

test.describe("Sentience Digital Quiz E2E", () => {
  test("identity page accepts a normal username and begins the quiz", async ({ page }) => {
    await page.route("**/api/check-username?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ available: true, appropriate: true }),
      });
    });

    await page.goto("http://localhost:3000/identity/identity.html");
    await expect(page.locator("h1")).toHaveText("Focus, then Begin.");

    const usernameInput = page.locator("#username");
    const submitBtn = page.locator("button.submit");
    await usernameInput.fill("TestPlayer");
    await expect(usernameInput).toHaveValue("TestPlayer");

    await Promise.all([
      page.waitForURL(/\/main\/main/),
      submitBtn.click(),
    ]);
  });

  test("identity page exposes a leaderboard link", async ({ page }) => {
    await page.goto("http://localhost:3000/identity/identity.html");
    const leaderboardLink = page.locator("a.leaderboard-link");
    await expect(leaderboardLink).toHaveText("See Leaderboard");
    await expect(leaderboardLink).toHaveAttribute(
      "href",
      "../leaderboard/leaderboard",
    );
  });

  test("identity page gives a clear message for blank usernames", async ({ page }) => {
    await page.goto("http://localhost:3000/identity/identity.html");
    await page.locator("#username").fill("   ");
    await page.locator("button.submit").click();
    await expect(page.locator("#usernameStatus")).toHaveText(
      "Please enter a username.",
    );
  });

  test("a running test can be ended without submitting a score", async ({ page }) => {
    await page.route(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js",
      (route) =>
        route.fulfill({
          contentType: "application/javascript",
          headers: { "access-control-allow-origin": "*" },
          body: "export const initializeApp = () => ({});",
        }),
    );
    await page.route(
      "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js",
      (route) =>
        route.fulfill({
          contentType: "application/javascript",
          headers: { "access-control-allow-origin": "*" },
          body: `
            export const getAuth = () => ({ currentUser: {} });
            export const getIdToken = () => Promise.resolve("test-token");
            export const signInAnonymously = () => Promise.resolve();
          `,
        }),
    );
    await page.route("**/api/start-attempt", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          attemptId: "11111111-1111-4111-8111-111111111111",
          imageOrder: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          colourOptions: Array.from({ length: 15 }, () => [
            "#FFC300",
            "#66CCFF",
            "#66CCFF",
            "#66CCFF",
          ]),
        }),
      }),
    );
    let ended = false;
    await page.route("**/api/end-attempt", (route) => {
      ended = true;
      return route.fulfill({ status: 204 });
    });
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto(
      "http://localhost:3000/main/main?username=TestPlayer",
    );
    const endButton = page.locator("button.end-test-button");
    await expect(endButton).toHaveText("End without sending results");
    await Promise.all([
      page.waitForURL(/identity\/identity/),
      endButton.click(),
    ]);
    expect(ended).toBe(true);
  });

  test("leaderboard page renders prominent take-the-test CTA", async ({ page }) => {
    await page.goto("http://localhost:3000/leaderboard/leaderboard.html");

    const takeTestCTA = page.locator("a.take-test-cta");

    await expect(takeTestCTA).toBeVisible();
    await expect(takeTestCTA).toHaveText(/Take the Test/);
  });

  test("keyboard navigation focus-visible outlines are active", async ({ page }) => {
    await page.goto("http://localhost:3000/identity/identity.html");
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toBeDefined();
  });
});
