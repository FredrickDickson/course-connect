import type { Page } from "@playwright/test";
import { BasePage } from "./BasePage";

export class QuizPage extends BasePage {
  readonly intro = this.page.getByTestId("quiz-intro");
  readonly startQuizButton = this.page.getByTestId("start-quiz");
  readonly taking = this.page.getByTestId("quiz-taking");
  readonly currentQuestion = this.page.getByTestId("current-question");
  readonly multipleChoiceAnswers = this.page.getByTestId("multiple-choice-answers");
  readonly nextQuestionButton = this.page.getByTestId("next-question");
  readonly prevQuestionButton = this.page.getByTestId("prev-question");
  readonly submitQuizButton = this.page.getByTestId("submit-quiz");
  readonly results = this.page.getByTestId("quiz-results");
  readonly backToDashboardButton = this.page.getByTestId("back-to-dashboard");
  readonly retakeQuizButton = this.page.getByTestId("retake-quiz");
  readonly maxAttemptsReached = this.page.getByTestId("max-attempts-reached");

  constructor(page: Page) {
    super(page);
  }

  async goto(quizId: string) {
    await this.page.goto(`/quiz/${quizId}`);
  }

  /** Each answer's Label wraps its literal answer text — simplest robust
   * way to pick an option without needing its underlying quiz_answers.id. */
  async selectAnswerByText(answerText: string) {
    await this.multipleChoiceAnswers.getByText(answerText, { exact: true }).click();
  }
}
