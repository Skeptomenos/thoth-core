#!/usr/bin/env bun
import { TestHarness, printReport } from "../src/sdk/test-harness";
import { buildThothPrompt, detectSpecialization } from "../src/specialization";

const MORNING_BOOT_PROMPTS = [
  "prepare me for the day",
  "start my day", 
  "morning routine",
  "what do I need to do today",
];

async function main() {
  const prompt = process.argv[2] ?? MORNING_BOOT_PROMPTS[0];
  const directory = process.argv[3] ?? "/Users/davidhelmus/Repos/thoth/thoth-kb";
  const baseUrl = process.argv[4] ?? "http://localhost:4097";
  
  console.log(`\nTesting morning boot with prompt: "${prompt}"`);
  console.log(`Directory: ${directory}`);
  console.log(`Connecting to: ${baseUrl}`);
  
  const spec = detectSpecialization(directory, directory);
  const systemPrompt = buildThothPrompt(spec);
  console.log(`Thoth prompt loaded (${systemPrompt.length} chars, depth ${spec.depth})\n`);

  const model = { providerID: "anthropic", modelID: "claude-sonnet-4-20250514" };
  console.log(`Model: ${model.providerID}/${model.modelID}\n`);

  const harness = new TestHarness({ baseUrl, directory, systemPrompt, model });
  
  try {
    await harness.connect();
    const result = await harness.runScenario(prompt, {
      title: "Morning Boot Test",
      timeoutMs: 180000,
    });
    
    printReport(result);
    
    console.log("\n\nANALYSIS:");
    console.log("=========");
    
    const skillInvoked = result.toolCallsSummary.some(tc => tc.tool === "skill");
    const readCalls = result.toolCallsSummary.filter(tc => tc.tool === "read");
    const googleWorkspaceCalls = result.toolCallsSummary.filter(tc => 
      tc.tool.startsWith("google-workspace")
    );
    const slackCalls = result.toolCallsSummary.filter(tc => 
      tc.tool.startsWith("slack")
    );
    
    console.log(`\nSkill invoked: ${skillInvoked ? "YES ✓" : "NO ✗"}`);
    console.log(`Read calls: ${readCalls.reduce((sum, tc) => sum + tc.count, 0)}`);
    console.log(`Google Workspace calls: ${googleWorkspaceCalls.reduce((sum, tc) => sum + tc.count, 0)}`);
    console.log(`Slack calls: ${slackCalls.reduce((sum, tc) => sum + tc.count, 0)}`);
    
    if (!skillInvoked) {
      console.log("\n⚠️  WARNING: Skill was not invoked. Check if:");
      console.log("   - The skill trigger matches the prompt");
      console.log("   - The skill tool is available");
      console.log("   - The SKILL.md file exists and is valid");
    }
    
    const agentsMdReads = readCalls.flatMap(tc => tc.inputs)
      .filter(input => String(input.filePath ?? "").includes("AGENTS.md"));
    
    if (agentsMdReads.length > 0) {
      console.log(`\n✓ AGENTS.md was read (good for identity lookup)`);
    } else {
      console.log(`\n⚠️  AGENTS.md was not read - identity may be missing`);
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (err) {
    console.error(`\nError: ${err}`);
    console.error("\nMake sure OpenCode is running on the specified port.");
    console.error("Start it with: opencode --server");
    process.exit(1);
  } finally {
    await harness.disconnect();
  }
}

main();
