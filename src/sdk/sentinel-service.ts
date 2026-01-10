import { ThothClient, type SessionResult } from "./thoth-client";
import { log, getTemporalContext, type TemporalContext } from "../shared";

export type TriggerType = "schedule" | "file-change" | "manual";

export interface ScheduleTrigger {
  type: "schedule";
  cron?: string;
  time?: string;
  days?: Array<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun">;
}

export interface FileChangeTrigger {
  type: "file-change";
  paths: string[];
  debounceMs?: number;
}

export interface ManualTrigger {
  type: "manual";
}

export type Trigger = ScheduleTrigger | FileChangeTrigger | ManualTrigger;

export interface WorkflowDefinition {
  name: string;
  description?: string;
  triggers: Trigger[];
  quietHours?: { start: string; end: string };
  execute: (context: WorkflowContext) => Promise<string>;
}

export interface WorkflowContext {
  temporal: TemporalContext;
  client: ThothClient;
  triggerType: TriggerType;
  triggerData?: unknown;
}

export interface SentinelConfig {
  pollIntervalMs?: number;
  quietHours?: { start: string; end: string };
  enabled?: boolean;
}

type ScheduleEntry = {
  workflow: WorkflowDefinition;
  nextRun: Date;
};

export class SentinelService {
  private client: ThothClient;
  private config: SentinelConfig;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private schedules: ScheduleEntry[] = [];
  private running = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(client: ThothClient, config: SentinelConfig = {}) {
    this.client = client;
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 60_000,
      quietHours: config.quietHours,
      enabled: config.enabled ?? true,
    };
  }

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.name, workflow);
    this.updateSchedules(workflow);
    log(`Sentinel: Registered workflow "${workflow.name}"`);
  }

  unregisterWorkflow(name: string): void {
    this.workflows.delete(name);
    this.schedules = this.schedules.filter((s) => s.workflow.name !== name);
    log(`Sentinel: Unregistered workflow "${name}"`);
  }

  async start(): Promise<void> {
    if (this.running) {
      log("Sentinel: Already running");
      return;
    }

    if (!this.config.enabled) {
      log("Sentinel: Disabled via config");
      return;
    }

    this.running = true;
    log("Sentinel: Starting...");

    this.pollTimer = setInterval(() => {
      this.tick().catch((err) => {
        log(`Sentinel: Tick error: ${err}`);
      });
    }, this.config.pollIntervalMs);

    await this.tick();
    log("Sentinel: Started");
  }

  stop(): void {
    if (!this.running) return;

    this.running = false;
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    log("Sentinel: Stopped");
  }

  async triggerWorkflow(
    name: string,
    triggerType: TriggerType = "manual",
    triggerData?: unknown
  ): Promise<SessionResult | null> {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      log(`Sentinel: Workflow "${name}" not found`);
      return null;
    }

    return this.executeWorkflow(workflow, triggerType, triggerData);
  }

  listWorkflows(): Array<{ name: string; description?: string; triggers: Trigger[] }> {
    return Array.from(this.workflows.values()).map((w) => ({
      name: w.name,
      description: w.description,
      triggers: w.triggers,
    }));
  }

  private async tick(): Promise<void> {
    if (!this.running) return;

    const now = new Date();
    const temporal = getTemporalContext();

    if (this.isQuietHours(temporal)) {
      log("Sentinel: In quiet hours, skipping tick");
      return;
    }

    const dueSchedules = this.schedules.filter((s) => s.nextRun <= now);

    for (const schedule of dueSchedules) {
      try {
        await this.executeWorkflow(schedule.workflow, "schedule");
        this.updateNextRun(schedule);
      } catch (err) {
        log(`Sentinel: Failed to execute "${schedule.workflow.name}": ${err}`);
      }
    }
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition,
    triggerType: TriggerType,
    triggerData?: unknown
  ): Promise<SessionResult> {
    const temporal = getTemporalContext();

    if (workflow.quietHours && this.isInTimeRange(temporal.time, workflow.quietHours)) {
      log(`Sentinel: Workflow "${workflow.name}" in quiet hours, skipping`);
      return {
        sessionId: "",
        response: "Skipped: quiet hours",
        success: false,
        error: "Quiet hours",
      };
    }

    log(`Sentinel: Executing workflow "${workflow.name}" (trigger: ${triggerType})`);

    const context: WorkflowContext = {
      temporal,
      client: this.client,
      triggerType,
      triggerData,
    };

    try {
      const result = await workflow.execute(context);
      log(`Sentinel: Workflow "${workflow.name}" completed`);
      return {
        sessionId: "",
        response: result,
        success: true,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log(`Sentinel: Workflow "${workflow.name}" failed: ${errorMessage}`);
      return {
        sessionId: "",
        response: "",
        success: false,
        error: errorMessage,
      };
    }
  }

  private updateSchedules(workflow: WorkflowDefinition): void {
    const scheduleTriggers = workflow.triggers.filter(
      (t): t is ScheduleTrigger => t.type === "schedule"
    );

    for (const trigger of scheduleTriggers) {
      const nextRun = this.calculateNextRun(trigger);
      if (nextRun) {
        this.schedules.push({ workflow, nextRun });
      }
    }
  }

  private updateNextRun(schedule: ScheduleEntry): void {
    const scheduleTrigger = schedule.workflow.triggers.find(
      (t): t is ScheduleTrigger => t.type === "schedule"
    );

    if (scheduleTrigger) {
      const nextRun = this.calculateNextRun(scheduleTrigger);
      if (nextRun) {
        schedule.nextRun = nextRun;
      } else {
        this.schedules = this.schedules.filter((s) => s !== schedule);
      }
    }
  }

  private calculateNextRun(trigger: ScheduleTrigger): Date | null {
    const now = new Date();

    if (trigger.time) {
      const [hours, minutes] = trigger.time.split(":").map(Number);
      const next = new Date(now);
      next.setHours(hours, minutes, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }

      if (trigger.days && trigger.days.length > 0) {
        const dayMap: Record<string, number> = {
          sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
        };
        const allowedDays = trigger.days.map((d) => dayMap[d]);

        while (!allowedDays.includes(next.getDay())) {
          next.setDate(next.getDate() + 1);
        }
      }

      return next;
    }

    return null;
  }

  private isQuietHours(temporal: TemporalContext): boolean {
    if (!this.config.quietHours) return false;
    return this.isInTimeRange(temporal.time, this.config.quietHours);
  }

  private isInTimeRange(
    currentTime: string,
    range: { start: string; end: string }
  ): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(range.start);
    const end = this.timeToMinutes(range.end);

    if (start <= end) {
      return current >= start && current <= end;
    }
    return current >= start || current <= end;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }
}

export function createDeepResearchWorkflow(): WorkflowDefinition {
  return {
    name: "deep-research",
    description: "Multi-vector research pipeline (Web, Code, Docs)",
    triggers: [{ type: "manual" }],
    execute: async (context) => {
      const { client } = context;
      const topic = context.triggerData as string || "latest LLM agent patterns";

      const [results] = await client.runPipeline([
        {
          parallel: [
            {
              sequence: [
                { 
                  prompt: `Generate 3 specific search queries to investigate: ${topic}`,
                  options: { title: "Web: Query Gen" }
                },
                { 
                  prompt: (input) => `Based on these queries: ${input}\n\nSummarize the key high-level concepts found on the web.`,
                  options: { title: "Web: Summarize" }
                }
              ]
            },
            
            {
              sequence: [
                { 
                  prompt: `What are the core technical keywords for: ${topic}? Return as a comma-separated list.`,
                  options: { title: "Code: Keywords" }
                },
                { 
                  prompt: (input) => `Search GitHub/Codebase patterns for these keywords: ${input}\n\nDescribe common implementation patterns.`,
                  options: { title: "Code: Patterns" }
                }
              ]
            },

            {
              sequence: [
                { 
                  prompt: `Identify the authoritative bodies or standards for: ${topic}`,
                  options: { title: "Docs: Standards" }
                },
                { 
                  prompt: (input) => `Synthesize the official documentation stance from: ${input}`,
                  options: { title: "Docs: Synthesis" }
                }
              ]
            }
          ]
        },
        
        {
          prompt: (input) => {
            return `Create a comprehensive research report on "${topic}" by synthesizing these three perspectives:
            
            1. WEB LANDSCAPE:
            ${Array.isArray(input) ? input[0] : ""}
            
            2. TECHNICAL IMPLEMENTATION:
            ${Array.isArray(input) ? input[1] : ""}
            
            3. STANDARDS & DOCS:
            ${Array.isArray(input) ? input[2] : ""}`
          },
          options: { title: "Final Synthesis" }
        }
      ]);

      return typeof results === "string" ? results : JSON.stringify(results);
    },
  };
}

// Morning boot workflow is implemented as an OpenProse skill, not an SDK workflow.
// See: thoth-kb/.opencode/skill/morning-boot/morning-boot.prose
// Invoke via: skill({ name: "morning-boot" })
