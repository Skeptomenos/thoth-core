#!/usr/bin/env bun
import { spawn } from "child_process";

const MORNING_BOOT_PROMPTS = [
  "prepare me for the day",
  "start my day",
  "morning routine", 
  "what do I need to do today",
];

interface TestResult {
  prompt: string;
  agent: string;
  directory: string;
  success: boolean;
  durationMs: number;
  events: ParsedEvent[];
  toolCalls: ToolCallSummary[];
  errors: string[];
  transcript: string;
}

interface ParsedEvent {
  type: string;
  data: Record<string, unknown>;
}

interface ToolCallSummary {
  tool: string;
  count: number;
  inputs: Record<string, unknown>[];
}

async function runTest(
  prompt: string,
  directory: string,
  agent: string = "Thoth"
): Promise<TestResult> {
  const startTime = Date.now();
  const events: ParsedEvent[] = [];
  const errors: string[] = [];

  return new Promise((resolve) => {
    const proc = spawn("opencode", [
      "run",
      "--agent", agent,
      "--format", "json",
      "--title", `Test: ${prompt.slice(0, 30)}`,
      prompt,
    ], {
      cwd: directory,
      env: { ...process.env },
      stdio: ["pipe", "pipe", "pipe"],
    });

    const chunks: Buffer[] = [];
    let stderr = "";

    proc.stdout?.on("data", (data: Buffer) => {
      chunks.push(data);
    });

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      const durationMs = Date.now() - startTime;
      const stdout = Buffer.concat(chunks).toString("utf-8");

      for (const line of stdout.split("\n").filter(Boolean)) {
        try {
          const event = JSON.parse(line);
          events.push({ type: event.type ?? "unknown", data: event });
        } catch {}
      }

      if (stderr.trim()) {
        errors.push(stderr.trim());
      }

      if (code !== 0) {
        errors.push(`Process exited with code ${code}`);
      }

      const toolCalls = summarizeToolCalls(events);
      const transcript = buildTranscript(events);

      resolve({
        prompt,
        agent,
        directory,
        success: code === 0 && errors.length === 0,
        durationMs,
        events,
        toolCalls,
        errors,
        transcript,
      });
    });

    proc.on("error", (err) => {
      errors.push(`Spawn error: ${err.message}`);
      resolve({
        prompt,
        agent,
        directory,
        success: false,
        durationMs: Date.now() - startTime,
        events,
        toolCalls: [],
        errors,
        transcript: "",
      });
    });
  });
}

function summarizeToolCalls(events: ParsedEvent[]): ToolCallSummary[] {
  const toolMap = new Map<string, { count: number; inputs: Record<string, unknown>[] }>();

  for (const event of events) {
    const part = event.data.part as { type?: string; toolName?: string; input?: Record<string, unknown> } | undefined;
    if (event.type === "part.begin" && part?.type === "tool-invocation") {
      const toolName = part.toolName ?? "unknown";
      const input = part.input ?? {};
      
      if (!toolMap.has(toolName)) {
        toolMap.set(toolName, { count: 0, inputs: [] });
      }
      const entry = toolMap.get(toolName)!;
      entry.count++;
      entry.inputs.push(input);
    }
  }

  return Array.from(toolMap.entries()).map(([tool, data]) => ({
    tool,
    count: data.count,
    inputs: data.inputs,
  }));
}

function buildTranscript(events: ParsedEvent[]): string {
  const lines: string[] = [];

  for (const event of events) {
    const delta = event.data.delta as { type?: string; text?: string } | undefined;
    if (event.type === "part.delta" && delta?.type === "text") {
      lines.push(delta.text ?? "");
    }
  }

  return lines.join("");
}

function printReport(result: TestResult): void {
  console.log("\n" + "=".repeat(80));
  console.log(`PROMPT: "${result.prompt}"`);
  console.log(`AGENT: ${result.agent}`);
  console.log(`DIRECTORY: ${result.directory}`);
  console.log(`SUCCESS: ${result.success}`);
  console.log(`DURATION: ${result.durationMs}ms`);
  console.log("=".repeat(80));

  if (result.errors.length > 0) {
    console.log("\nERRORS:");
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }

  console.log("\nTOOL CALLS:");
  if (result.toolCalls.length === 0) {
    console.log("  (none)");
  } else {
    for (const tc of result.toolCalls) {
      console.log(`  ${tc.tool}: ${tc.count}x`);
    }
  }

  console.log("\nTRANSCRIPT:");
  console.log("-".repeat(80));
  console.log(result.transcript || "(empty)");
  console.log("-".repeat(80));

  console.log("\nANALYSIS:");
  const skillInvoked = result.toolCalls.some(tc => tc.tool === "skill");
  const readCalls = result.toolCalls.filter(tc => tc.tool === "read");
  const googleCalls = result.toolCalls.filter(tc => tc.tool.startsWith("google-workspace"));
  const slackCalls = result.toolCalls.filter(tc => tc.tool.startsWith("slack"));

  console.log(`  Skill invoked: ${skillInvoked ? "YES ✓" : "NO ✗"}`);
  console.log(`  Read calls: ${readCalls.reduce((sum, tc) => sum + tc.count, 0)}`);
  console.log(`  Google Workspace calls: ${googleCalls.reduce((sum, tc) => sum + tc.count, 0)}`);
  console.log(`  Slack calls: ${slackCalls.reduce((sum, tc) => sum + tc.count, 0)}`);

  if (!skillInvoked) {
    console.log("\n  ⚠️  Skill was not invoked");
  }

  const agentsMdReads = readCalls.flatMap(tc => tc.inputs)
    .filter(input => String(input.filePath ?? "").includes("AGENTS.md"));
  
  if (agentsMdReads.length > 0) {
    console.log("  ✓ AGENTS.md was read");
  } else {
    console.log("  ⚠️  AGENTS.md was not read");
  }
}

async function main() {
  const prompt = process.argv[2] ?? MORNING_BOOT_PROMPTS[0];
  const directory = process.argv[3] ?? "/Users/davidhelmus/Repos/thoth/thoth-kb";
  const agent = process.argv[4] ?? "Thoth";

  console.log(`\nRunning morning boot test...`);
  console.log(`  Prompt: "${prompt}"`);
  console.log(`  Directory: ${directory}`);
  console.log(`  Agent: ${agent}`);

  const result = await runTest(prompt, directory, agent);
  printReport(result);

  process.exit(result.success ? 0 : 1);
}

main();
