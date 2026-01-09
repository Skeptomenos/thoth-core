import { createOpencodeClient, createOpencode, type OpencodeClient } from "@opencode-ai/sdk";
import { log } from "../shared";
import { writeFile } from "fs/promises";
import { dirname } from "path";
import { mkdir } from "fs/promises";

export interface ThothClientConfig {
  baseUrl?: string;
  spawnServer?: boolean;
  port?: number;
  defaultModel?: string;
  client?: OpencodeClient;
}

export interface SessionOptions {
  agent?: string;
  model?: string;
  title?: string;
  files?: string[];
}

export interface SessionResult {
  sessionId: string;
  response: string;
  success: boolean;
  error?: string;
}

// Recursive input/output types for composable pipelines
export type PipelineOutput = string | Array<PipelineOutput>;

export type PipelineUnit =
  | { 
      prompt: string | ((input: PipelineOutput) => string); 
      options?: SessionOptions 
    }
  | { 
      parallel: PipelineUnit[] 
    }
  | { 
      sequence: PipelineUnit[] 
    };

export class ThothClient {
  private client: OpencodeClient | null = null;
  private config: ThothClientConfig;
  private serverProcess: { url: string; close(): void } | null = null;

  constructor(config: ThothClientConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? "http://localhost:4096",
      spawnServer: config.spawnServer ?? false,
      port: config.port ?? 4096,
      defaultModel: config.defaultModel ?? "anthropic/claude-sonnet-4-5",
    };
    
    if (config.client) {
      this.client = config.client;
    }
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    if (this.config.spawnServer) {
      log("Spawning new OpenCode server...");
      const { client, server } = await createOpencode({
        hostname: "127.0.0.1",
        port: this.config.port,
        config: {
          model: this.config.defaultModel,
        },
      });
      this.client = client;
      this.serverProcess = server;
      log(`OpenCode server spawned on port ${this.config.port}`);
    } else {
      log(`Connecting to existing OpenCode server at ${this.config.baseUrl}`);
      this.client = createOpencodeClient({ baseUrl: this.config.baseUrl! });
    }

    try {
      await this.client.config.get();
      log("ThothClient connected successfully");
    } catch (err) {
      this.client = null;
      throw new Error(`Failed to connect to OpenCode: ${err}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.close();
      this.serverProcess = null;
    }
    this.client = null;
    log("ThothClient disconnected");
  }

  async runSession(prompt: string, options: SessionOptions = {}): Promise<SessionResult> {
    if (!this.client) {
      throw new Error("ThothClient not connected. Call connect() first.");
    }

    try {
      const session = await this.client.session.create({
        body: {
          title: options.title ?? "ThothClient Session",
        },
      });

      const sessionId = session.data?.id;
      if (!sessionId) {
        throw new Error("Failed to create session: no session ID returned");
      }

      const parts: Array<{ type: "text"; text: string } | { type: "file"; mime: string; url: string }> = [
        { type: "text", text: prompt },
      ];

      if (options.files) {
        for (const file of options.files) {
          parts.push({
            type: "file",
            mime: "text/plain",
            url: `file://${file}`,
          });
        }
      }

      const result = await this.client.session.prompt({
        path: { id: sessionId },
        body: { parts },
      });

      const responseText = this.extractResponseText(result);

      return {
        sessionId,
        response: responseText,
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Session error: ${errorMessage}`);
      return {
        sessionId: "",
        response: "",
        success: false,
        error: errorMessage,
      };
    }
  }

  async runPipeline(units: PipelineUnit[]): Promise<PipelineOutput[]> {
    const results: PipelineOutput[] = [];
    let previousResult: PipelineOutput = "";

    for (const unit of units) {
      const result = await this.executeUnit(unit, previousResult);
      results.push(result);
      previousResult = result;
    }

    return results;
  }

  private async executeUnit(unit: PipelineUnit, input: PipelineOutput): Promise<PipelineOutput> {
    if ("parallel" in unit) {
      const results = await Promise.all(
        unit.parallel.map((u) => this.executeUnit(u, input))
      );
      return results;
    }

    if ("sequence" in unit) {
      let currentInput = input;
      let lastResult: PipelineOutput = "";
      
      for (const step of unit.sequence) {
        lastResult = await this.executeUnit(step, currentInput);
        currentInput = lastResult;
      }
      return lastResult;
    }

    const promptText = typeof unit.prompt === "function" 
      ? unit.prompt(input) 
      : unit.prompt;

    const result = await this.runSession(promptText, unit.options);
    if (!result.success) {
      throw new Error(`Pipeline step failed: ${result.error}`);
    }
    return result.response;
  }

  async runParallel(
    tasks: Array<{ prompt: string; options?: SessionOptions }>
  ): Promise<SessionResult[]> {
    return Promise.all(
      tasks.map(({ prompt, options }) => this.runSession(prompt, options))
    );
  }

  async abortSession(sessionId: string): Promise<void> {
    if (!this.client) {
      throw new Error("ThothClient not connected");
    }

    await this.client.session.abort({ path: { id: sessionId } });
    log(`Session ${sessionId} aborted`);
  }

  async listAgents(): Promise<string[]> {
    if (!this.client) {
      throw new Error("ThothClient not connected");
    }

    const agents = await this.client.app.agents();
    return Object.keys(agents.data ?? {});
  }

  async isHealthy(): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.config.get();
      return true;
    } catch {
      return false;
    }
  }

  async notify(message: string, level: "info" | "success" | "warning" | "error" = "info"): Promise<void> {
    await this.showToast(message, level);
  }

  async showToast(message: string, variant: "info" | "success" | "warning" | "error" = "info"): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.tui.showToast({
        body: {
          message,
          variant,
        },
      });
    } catch (err) {
      log(`Failed to show toast: ${err}`);
    }
  }

  async writeFile(path: string, content: string): Promise<void> {
    try {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, content, "utf-8");
    } catch (err) {
      throw new Error(`Failed to write file ${path}: ${err}`);
    }
  }

  private extractResponseText(result: unknown): string {
    try {
      const data = (result as { data?: unknown })?.data;
      if (typeof data === "string") return data;

      if (Array.isArray(data)) {
        const assistantMessages = data.filter(
          (m: { role?: string }) => m.role === "assistant"
        );
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        if (lastMessage?.content) {
          if (typeof lastMessage.content === "string") {
            return lastMessage.content;
          }
          if (Array.isArray(lastMessage.content)) {
            return lastMessage.content
              .filter((c: { type?: string }) => c.type === "text")
              .map((c: { text?: string }) => c.text ?? "")
              .join("\n");
          }
        }
      }

      return JSON.stringify(data);
    } catch {
      return "";
    }
  }
}

export async function createThothClient(
  config?: ThothClientConfig
): Promise<ThothClient> {
  const client = new ThothClient(config);
  await client.connect();
  return client;
}
