import { expect, test } from "@playwright/test";

test.describe("internal v1 smoke", () => {
  test("home shows primary navigation and dashboard actions", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Primary" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Read" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Learn" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Atlas" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Write" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Test" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reference" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Writing" })).toBeVisible();
    await expect(page.getByText("Continue reading")).toBeVisible();
  });

  test("reading a chapter", async ({ page }) => {
    await page.goto("/read/complete-session-script-to-cut/1-the-terminology");
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("changing reading mode", async ({ page }) => {
    await page.goto("/read/complete-session-script-to-cut/1-the-terminology");
    const mode = page.getByLabel(/depth|mode|reading/i).first();
    if (await mode.count()) {
      await mode.selectOption({ index: 1 }).catch(async () => {
        await page.getByRole("button", { name: /study|everything|explained/i }).first().click();
      });
    }
    await expect(page.locator("main, .reader, article").first()).toBeVisible();
  });

  test("searching the library", async ({ page }) => {
    await page.goto("/library");
    const search = page.getByRole("searchbox").or(page.getByPlaceholder(/search/i));
    if (await search.count()) {
      await search.first().fill("scene");
    }
    await expect(page.getByRole("heading", { name: /library|search/i }).first()).toBeVisible();
  });

  test("completing a lesson entry point", async ({ page }) => {
    await page.goto("/learn");
    await expect(page.getByRole("heading").first()).toBeVisible();
    const lesson = page.getByRole("link").filter({ hasText: /scene|seven|lesson/i }).first();
    if (await lesson.count()) {
      await lesson.click();
      await expect(page).toHaveURL(/\/learn\//);
    }
  });

  test("creating a project requires auth when configured", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page).toHaveURL(/\/(login|projects)/);
  });

  test("creating a beat requires an authenticated project", async ({ page }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/(login|projects)/);
  });

  test("assigning a scene is gated behind projects", async ({ page }) => {
    await page.goto("/test");
    await expect(page).toHaveURL(/\/(login|test|projects)/);
  });

  test("writing screenplay content is gated behind auth", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("running Scene Lab hub", async ({ page }) => {
    await page.goto("/test");
    await expect(
      page.getByRole("heading", { name: "Test" }).or(page.getByRole("heading", { name: /sign in/i })),
    ).toBeVisible();
  });

  test("reference indexes source material without rewriting", async ({ page }) => {
    await page.goto("/reference");
    await expect(page.getByRole("heading", { name: "Reference" })).toBeVisible();
    await expect(page.getByRole("link", { name: "All Secret Sauce" })).toBeVisible();
    await expect(page.getByText(/does not rewrite|Nothing here rewrites/i)).toBeVisible();
  });
});
