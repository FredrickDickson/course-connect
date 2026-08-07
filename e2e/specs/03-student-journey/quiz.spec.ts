import { test, expect } from "@playwright/test";
import { QuizPage } from "../../pom/QuizPage";
import { getSeededQuizId } from "../../fixtures/seeded-course";

test.describe("Quiz (/quiz/:quizId, student)", () => {
  // Both submission tests submit attempts for the same seeded student+quiz
  // and the results view reads "latest attempt" — running them in parallel
  // (the config's default) races two concurrent submissions against that
  // "latest" read, occasionally showing one test's result on the other's
  // page. Serial avoids the shared-state race.
  test.describe.configure({ mode: "serial" });

  test("intro shows quiz details before starting", async ({ page }) => {
    const quizId = await getSeededQuizId();
    const quiz = new QuizPage(page);
    await quiz.goto(quizId);
    await expect(quiz.intro).toBeVisible();
    await expect(page.getByText("Passing Score: 50%")).toBeVisible();
  });

  test("answering correctly and submitting shows a PASSED result", async ({ page }) => {
    const quizId = await getSeededQuizId();
    const quiz = new QuizPage(page);
    await quiz.goto(quizId);
    await quiz.startQuizButton.click();
    await expect(quiz.currentQuestion).toBeVisible();
    await quiz.selectAnswerByText("4");
    await quiz.submitQuizButton.click();
    await expect(quiz.results).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("PASSED")).toBeVisible();
    await expect(page.getByText("100%")).toBeVisible();
  });

  test("answering incorrectly shows a FAILED result with a retake option", async ({ page }) => {
    const quizId = await getSeededQuizId();
    const quiz = new QuizPage(page);
    await quiz.goto(quizId);
    await quiz.startQuizButton.click();
    await quiz.selectAnswerByText("3"); // seeded wrong answer
    await quiz.submitQuizButton.click();
    await expect(quiz.results).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("FAILED")).toBeVisible();
    await expect(quiz.retakeQuizButton).toBeVisible();
  });
});
