#!/usr/bin/env node
import { createThothClient, SkillRunner, type SkillTest } from "../src/sdk";
import { log } from "../src/shared";

async function main() {
  log("Starting Skill Tests...");

  const client = await createThothClient({
    baseUrl: "http://localhost:4096",
  });

  if (!(await client.isHealthy())) {
    console.error("❌ OpenCode server is not reachable. Is it running?");
    process.exit(1);
  }

  const runner = new SkillRunner(client);

  const tests: SkillTest[] = [
    {
      name: "Morning Boot Trigger",
      skillName: "morning-boot",
      input: "Good morning",
      expectedOutput: /Morning Boot Skill/,
      timeoutMs: 30000,
    },
    {
      name: "Evening Close Trigger",
      skillName: "evening-close",
      input: "End of day",
      expectedOutput: /Evening Close Skill/,
      timeoutMs: 30000,
    },
    {
      name: "Thought Router - Work",
      skillName: "thought-router",
      input: "Quick thought: Remind Sarah about the project deadline",
      expectedOutput: /WORK/i,
      timeoutMs: 15000,
    },
    {
      name: "Thought Router - Life",
      skillName: "thought-router",
      input: "Remember to buy milk",
      expectedOutput: /LIFE/i,
      timeoutMs: 15000,
    }
  ];

  log(`Running ${tests.length} tests...`);
  const results = await runner.runSuite(tests);

  console.log("\nTest Results:");
  console.log("─".repeat(50));

  let failureCount = 0;

  for (const result of results) {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${status} | ${result.testName} (${result.durationMs}ms)`);
    
    if (!result.success) {
      failureCount++;
      console.log(`   Error: ${result.error}`);
      if (result.output) {
        console.log(`   Output: ${result.output.substring(0, 100)}...`);
      }
    }
  }

  console.log("─".repeat(50));

  if (failureCount > 0) {
    console.log(`\n❌ ${failureCount} tests failed`);
    process.exit(1);
  } else {
    console.log("\n✅ All tests passed");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
