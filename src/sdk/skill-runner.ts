import { ThothClient, type SessionOptions } from "./thoth-client";
import { log } from "../shared";

export interface SkillTest {
  name: string;
  skillName: string;
  input: string;
  expectedOutput?: string | RegExp;
  timeoutMs?: number;
}

export interface TestResult {
  testName: string;
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
}

export class SkillRunner {
  constructor(private client: ThothClient) {}

  async runTest(test: SkillTest): Promise<TestResult> {
    const startTime = Date.now();
    log(`Running test: ${test.name}`);

    try {
      const result = await this.client.runSession(test.input, {
        title: `Test: ${test.name}`,
        agent: "general",
        files: [],
      });

      const durationMs = Date.now() - startTime;

      if (!result.success) {
        return {
          testName: test.name,
          success: false,
          output: result.response,
          error: result.error,
          durationMs,
        };
      }

      let success = true;
      let error: string | undefined;

      if (test.expectedOutput) {
        if (typeof test.expectedOutput === "string") {
          success = result.response.includes(test.expectedOutput);
          if (!success) {
            error = `Expected output to include "${test.expectedOutput}"`;
          }
        } else if (test.expectedOutput instanceof RegExp) {
          success = test.expectedOutput.test(result.response);
          if (!success) {
            error = `Expected output to match ${test.expectedOutput}`;
          }
        }
      }

      return {
        testName: test.name,
        success,
        output: result.response,
        error,
        durationMs,
      };
    } catch (err) {
      return {
        testName: test.name,
        success: false,
        output: "",
        error: String(err),
        durationMs: Date.now() - startTime,
      };
    }
  }

  async runSuite(tests: SkillTest[]): Promise<TestResult[]> {
    const results: TestResult[] = [];
    for (const test of tests) {
      results.push(await this.runTest(test));
    }
    return results;
  }
}
