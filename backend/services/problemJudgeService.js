import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROBLEMS_PATH = path.join(__dirname, "../data/problems.json");
const DEFAULT_TIME_LIMIT_MS = 2_000;
const DEFAULT_VISIBLE_CASES = 3;

function normalizeOutput(value) {
  return String(value ?? "")
    .trim()
    .replace(/\r/g, "")
    .split(/\n+/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .join("\n");
}

function parseTimeLimitMs(value) {
  if (Number.isFinite(Number(value))) return Math.max(250, Number(value));

  const match = String(value || "").trim().match(/^(\d+(?:\.\d+)?)\s*(ms|s)?$/i);
  if (!match) return DEFAULT_TIME_LIMIT_MS;

  const amount = Number(match[1]);
  return Math.max(250, match[2]?.toLowerCase() === "ms" ? amount : amount * 1_000);
}

function isHiddenTest(test, index) {
  if (test?.hidden === true || test?.visibility === "hidden" || test?.isHidden === true) return true;
  if (test?.hidden === false || test?.visibility === "visible" || test?.isHidden === false) return false;
  // Existing problems did not label their tests. Keep the first three as samples and judge the rest privately.
  return index >= DEFAULT_VISIBLE_CASES;
}

function allTests(problem) {
  const inlineTests = Array.isArray(problem.tests) ? problem.tests : [];
  const separateHiddenTests = Array.isArray(problem.hiddenTests)
    ? problem.hiddenTests.map((test) => ({ ...test, hidden: true }))
    : [];

  return [...inlineTests, ...separateHiddenTests].map((test, index) => ({
    input: String(test?.input ?? ""),
    output: String(test?.output ?? ""),
    hidden: isHiddenTest(test, index)
  }));
}

function classifyExecution(result) {
  const description = String(result?.judgeStatus || result?.status || "").toLowerCase();
  if (result?.status === "success" || description === "accepted") return null;
  if (description.includes("time limit") || description.includes("timeout")) return "time_limit_exceeded";
  if (description.includes("compilation")) return "compilation_error";
  return "runtime_error";
}

function verdictLabel(verdict) {
  return {
    accepted: "Accepted",
    wrong_answer: "Wrong Answer",
    time_limit_exceeded: "Time Limit Exceeded",
    runtime_error: "Runtime Error",
    compilation_error: "Compilation Error",
    judge_error: "Judge Error"
  }[verdict] || "Judge Error";
}

async function readProblems(filePath) {
  const data = await fs.readFile(filePath, "utf8");
  const problems = JSON.parse(data);
  return Array.isArray(problems) ? problems : [];
}

export function toPublicProblem(problem) {
  const {  ...publicProblem } = problem;
  const tests = allTests(problem);
  const visibleTests = tests
    .filter((test) => !test.hidden)
    .map(({ input, output }) => ({ input, output }));

  return {
    ...publicProblem,
    tests: visibleTests,
    testSummary: {
      visible: visibleTests.length,
      hidden: tests.length - visibleTests.length,
      total: tests.length
    }
  };
}

export class ProblemJudgeService {
  constructor(pistonService, { problemsPath = DEFAULT_PROBLEMS_PATH } = {}) {
    this.pistonService = pistonService;
    this.problemsPath = problemsPath;
  }

  async judge({ problemId, language, code }) {
    const problems = await readProblems(this.problemsPath);
    const problem = problems.find((item) => item.id === String(problemId));

    if (!problem || problem.published === false) {
      const error = new Error("Problem not found");
      error.status = 404;
      throw error;
    }

    const tests = allTests(problem);
    if (tests.length === 0) {
      const error = new Error("This problem does not have test cases yet.");
      error.status = 422;
      throw error;
    }

    const timeLimitMs = parseTimeLimitMs(problem.timeLimitMs || problem.timeLimit);
    const visibleTotal = tests.filter((test) => !test.hidden).length;
    let passed = 0;
    let visiblePassed = 0;
    let totalExecutionTime = 0;

    for (let index = 0; index < tests.length; index += 1) {
      const test = tests[index];
      let result;

      try {
        result = await this.pistonService.run({
          language,
          code,
          input: test.input,
          timeLimitMs
        });
      } catch (error) {
        const verdict = error?.code === "TIMEOUT" ? "time_limit_exceeded" : "judge_error";
        return this.result({ verdict, passed, visiblePassed, visibleTotal, tests, index, test, error: error.message, totalExecutionTime });
      }

      const executionTime = Number(result.executionTime) || 0;
      totalExecutionTime += executionTime;
      const executionVerdict = executionTime > timeLimitMs
        ? "time_limit_exceeded"
        : classifyExecution(result);

      if (executionVerdict) {
        return this.result({
          verdict: executionVerdict,
          passed,
          visiblePassed,
          visibleTotal,
          tests,
          index,
          test,
          actual: result.stdout,
          error: result.stderr,
          totalExecutionTime
        });
      }

      const actual = normalizeOutput(result.stdout);
      const expected = normalizeOutput(test.output);
      if (actual !== expected) {
        return this.result({ verdict: "wrong_answer", passed, visiblePassed, visibleTotal, tests, index, test, actual, totalExecutionTime });
      }

      passed += 1;
      if (!test.hidden) visiblePassed += 1;
    }

    return {
      verdict: "accepted",
      label: verdictLabel("accepted"),
      passed,
      total: tests.length,
      visiblePassed,
      visibleTotal,
      hiddenTotal: tests.length - visibleTotal,
      executionTime: totalExecutionTime,
      message: `All ${tests.length} test cases passed.`
    };
  }

  result({ verdict, passed, visiblePassed, visibleTotal, tests, index, test, actual, error, totalExecutionTime }) {
    const hidden = Boolean(test.hidden);
    const caseNumber = index + 1;
    const base = {
      verdict,
      label: verdictLabel(verdict),
      passed,
      total: tests.length,
      visiblePassed,
      visibleTotal,
      hiddenTotal: tests.length - visibleTotal,
      executionTime: totalExecutionTime,
      message: hidden
        ? `${verdictLabel(verdict)} on a hidden test case.`
        : `${verdictLabel(verdict)} on sample test case ${caseNumber}.`
    };

    if (hidden) return base;

    return {
      ...base,
      failedTestCase: {
        number: caseNumber,
        input: test.input,
        expected: test.output,
        actual: actual || "",
        error: error || ""
      }
    };
  }
}
