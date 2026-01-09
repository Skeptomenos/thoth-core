/**
 * Test Harness for Thoth Skills
 * 
 * Spawns fresh SDK sessions to test skills in isolation.
 * Captures full transcript including tool calls for analysis.
 * 
 * Usage:
 *   const harness = new TestHarness();
 *   await harness.connect();
 *   const result = await harness.runScenario("prepare me for the day");
 *   console.log(result.transcript);
 *   await harness.disconnect();
 */

import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import { log } from "../shared";

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string | MessagePart[];
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp?: string;
}

export interface MessagePart {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  toolUseId?: string;
  toolName?: string;
  input?: Record<string, unknown>;
  output?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  output: string;
  isError?: boolean;
}

export interface ScenarioResult {
  sessionId: string;
  success: boolean;
  messages: Message[];
  transcript: string;
  toolCallsSummary: ToolCallSummary[];
  errors: string[];
  durationMs: number;
}

export interface ToolCallSummary {
  tool: string;
  count: number;
  inputs: Array<Record<string, unknown>>;
  errors: string[];
}

export interface TestHarnessConfig {
  baseUrl?: string;
  directory?: string;
  agent?: string;
  systemPrompt?: string;
  model?: { providerID: string; modelID: string };
  waitForCompletionMs?: number;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}

export class TestHarness {
  private client: OpencodeClient | null = null;
  private config: TestHarnessConfig;

  constructor(config: TestHarnessConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? "http://localhost:4096",
      waitForCompletionMs: config.waitForCompletionMs ?? 1000,
      pollIntervalMs: config.pollIntervalMs ?? 500,
      maxWaitMs: config.maxWaitMs ?? 300000,
    };
  }

  async connect(): Promise<void> {
    log(`Connecting to OpenCode at ${this.config.baseUrl}`);
    this.client = createOpencodeClient({ baseUrl: this.config.baseUrl! });

    try {
      await this.client.config.get();
      log("TestHarness connected successfully");
    } catch (err) {
      this.client = null;
      throw new Error(`Failed to connect to OpenCode: ${err}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    log("TestHarness disconnected");
  }

  async runScenario(
    prompt: string,
    options: { title?: string; timeoutMs?: number } = {}
  ): Promise<ScenarioResult> {
    if (!this.client) {
      throw new Error("TestHarness not connected. Call connect() first.");
    }

    const startTime = Date.now();
    const errors: string[] = [];

    const session = await this.client.session.create({
      body: {
        title: options.title ?? `Test: ${prompt.slice(0, 50)}...`,
      },
      query: this.config.directory ? { directory: this.config.directory } : undefined,
    });

    const sessionId = session.data?.id;
    if (!sessionId) {
      throw new Error("Failed to create session: no session ID returned");
    }

    log(`Created test session: ${sessionId}`);

    try {
      await this.client.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [{ type: "text", text: prompt }],
          agent: this.config.agent,
          system: this.config.systemPrompt,
          model: this.config.model,
        },
        query: this.config.directory ? { directory: this.config.directory } : undefined,
      });
    } catch (err) {
      errors.push(`Prompt error: ${err}`);
    }

    const maxWait = options.timeoutMs ?? this.config.maxWaitMs!;
    const pollInterval = this.config.pollIntervalMs!;
    let elapsed = 0;

    while (elapsed < maxWait) {
      await this.sleep(pollInterval);
      elapsed += pollInterval;

      try {
        const statusResult = await this.client.session.status();
        const allStatuses = (statusResult.data ?? {}) as Record<string, { type?: string }>;
        const sessionStatus = allStatuses[sessionId];
        
        const isRunning = sessionStatus?.type === "running" || sessionStatus?.type === "pending";
        if (!isRunning) {
          log(`Session completed after ${elapsed}ms`);
          break;
        }
      } catch (err) {
        log(`Status check failed: ${err}`);
      }
    }

    if (elapsed >= maxWait) {
      errors.push(`Timeout: session did not complete within ${maxWait}ms`);
    }

    const messagesResult = await this.client.session.messages({
      path: { id: sessionId },
    });

    const rawMessages = (messagesResult.data as unknown[]) ?? [];
    const messages = this.parseMessages(rawMessages);
    const transcript = this.formatTranscript(messages);
    const toolCallsSummary = this.summarizeToolCalls(messages);

    return {
      sessionId,
      success: errors.length === 0,
      messages,
      transcript,
      toolCallsSummary,
      errors,
      durationMs: Date.now() - startTime,
    };
  }

  async runComparison(
    scenarios: Array<{ name: string; prompt: string }>
  ): Promise<Map<string, ScenarioResult>> {
    const results = new Map<string, ScenarioResult>();

    for (const scenario of scenarios) {
      log(`Running scenario: ${scenario.name}`);
      const result = await this.runScenario(scenario.prompt, {
        title: scenario.name,
      });
      results.set(scenario.name, result);
    }

    return results;
  }

  private parseMessages(rawMessages: unknown[]): Message[] {
    return rawMessages.map((raw) => {
      const msg = raw as {
        id?: string;
        role?: string;
        content?: unknown;
        tool_calls?: unknown[];
        createdAt?: string;
      };

      const message: Message = {
        id: msg.id ?? "",
        role: (msg.role as Message["role"]) ?? "assistant",
        content: this.parseContent(msg.content),
        timestamp: msg.createdAt,
      };

      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        message.toolCalls = msg.tool_calls.map((tc) => {
          const toolCall = tc as {
            id?: string;
            name?: string;
            function?: { name?: string; arguments?: string };
            input?: Record<string, unknown>;
          };
          return {
            id: toolCall.id ?? "",
            name: toolCall.name ?? toolCall.function?.name ?? "",
            input: toolCall.input ?? 
              (toolCall.function?.arguments 
                ? JSON.parse(toolCall.function.arguments) 
                : {}),
          };
        });
      }

      return message;
    });
  }

  private parseContent(content: unknown): string | MessagePart[] {
    if (typeof content === "string") return content;
    if (!Array.isArray(content)) return String(content ?? "");

    return content.map((part) => {
      const p = part as {
        type?: string;
        text?: string;
        id?: string;
        name?: string;
        input?: Record<string, unknown>;
        content?: string;
      };

      if (p.type === "text") {
        return { type: "text" as const, text: p.text ?? "" };
      }
      if (p.type === "tool_use") {
        return {
          type: "tool_use" as const,
          toolUseId: p.id,
          toolName: p.name,
          input: p.input,
        };
      }
      if (p.type === "tool_result") {
        return {
          type: "tool_result" as const,
          toolUseId: p.id,
          output: p.content ?? "",
        };
      }
      return { type: "text" as const, text: JSON.stringify(p) };
    });
  }

  private formatTranscript(messages: Message[]): string {
    const lines: string[] = [];

    for (const msg of messages) {
      const rolePrefix = msg.role.toUpperCase().padEnd(10);
      
      if (typeof msg.content === "string") {
        lines.push(`${rolePrefix} ${msg.content}`);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "text" && part.text) {
            lines.push(`${rolePrefix} ${part.text}`);
          } else if (part.type === "tool_use") {
            lines.push(
              `${rolePrefix} [TOOL] ${part.toolName}(${JSON.stringify(part.input)})`
            );
          } else if (part.type === "tool_result") {
            const truncated = (part.output ?? "").slice(0, 200);
            lines.push(`${rolePrefix} [RESULT] ${truncated}...`);
          }
        }
      }

      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          lines.push(
            `${rolePrefix} [TOOL CALL] ${tc.name}(${JSON.stringify(tc.input).slice(0, 100)}...)`
          );
        }
      }

      lines.push("");
    }

    return lines.join("\n");
  }

  private summarizeToolCalls(messages: Message[]): ToolCallSummary[] {
    const toolMap = new Map<string, ToolCallSummary>();

    for (const msg of messages) {
      if (msg.toolCalls) {
        for (const tc of msg.toolCalls) {
          this.addToolCall(toolMap, tc.name, tc.input);
        }
      }

      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "tool_use" && part.toolName) {
            this.addToolCall(toolMap, part.toolName, part.input ?? {});
          }
        }
      }
    }

    return Array.from(toolMap.values()).sort((a, b) => b.count - a.count);
  }

  private addToolCall(
    toolMap: Map<string, ToolCallSummary>,
    name: string,
    input: Record<string, unknown>
  ): void {
    const existing = toolMap.get(name);
    if (existing) {
      existing.count++;
      existing.inputs.push(input);
    } else {
      toolMap.set(name, {
        tool: name,
        count: 1,
        inputs: [input],
        errors: [],
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export async function quickTest(
  prompt: string,
  options?: TestHarnessConfig
): Promise<ScenarioResult> {
  const harness = new TestHarness(options);
  await harness.connect();
  try {
    return await harness.runScenario(prompt);
  } finally {
    await harness.disconnect();
  }
}

export function printReport(result: ScenarioResult): void {
  console.log("\n" + "=".repeat(80));
  console.log(`SESSION: ${result.sessionId}`);
  console.log(`SUCCESS: ${result.success}`);
  console.log(`DURATION: ${result.durationMs}ms`);
  console.log("=".repeat(80));

  if (result.errors.length > 0) {
    console.log("\nERRORS:");
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }

  console.log("\nTOOL CALLS SUMMARY:");
  for (const tc of result.toolCallsSummary) {
    console.log(`  ${tc.tool}: ${tc.count}x`);
  }

  console.log("\nTRANSCRIPT:");
  console.log("-".repeat(80));
  console.log(result.transcript);
  console.log("-".repeat(80));
}
