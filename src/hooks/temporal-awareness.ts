import { log, getTemporalContext, formatTemporalContext } from "../shared";

export interface TemporalAwarenessConfig {
  enabled?: boolean;
  timezone?: string;
  workStartHour?: number;
  workEndHour?: number;
}

export function createTemporalAwarenessHook(config: TemporalAwarenessConfig = {}) {
  const { enabled = true } = config;

  if (!enabled) {
    return null;
  }

  let injectedThisSession = false;

  function shouldBlockWork(): { blocked: boolean; reason?: string } {
    const temporal = getTemporalContext();

    if (temporal.isWeekend) {
      return {
        blocked: true,
        reason: "Weekend Sanctuary mode - work tasks blocked unless Emergency P0",
      };
    }

    if (temporal.biologicalMode === "restoration") {
      return {
        blocked: true,
        reason: "Restoration mode (evening/night) - work tasks blocked unless Emergency P0",
      };
    }

    return { blocked: false };
  }

  function getWorkRecommendation(): string {
    const temporal = getTemporalContext();

    switch (temporal.biologicalMode) {
      case "high-cognitive":
        return "High cognitive period - ideal for deep work, complex problems, creative tasks. Protect from interruptions.";
      case "collaborative":
        return "Collaborative period - good for meetings, emails, discussions, reviews.";
      case "restoration":
        return "Restoration period - avoid work, focus on personal time and recovery.";
      case "transition":
        return "Transition period - flexible, good for admin tasks and planning.";
    }
  }

  function getDayModeRecommendation(): string {
    const temporal = getTemporalContext();

    switch (temporal.dayMode) {
      case "launch":
        return "Monday Launch Mode - prioritize planning, alignment, and P0 definition.";
      case "execution":
        return "Execution Mode - protect deep work blocks, minimize administrative overhead.";
      case "closure":
        return "Friday Closure Mode - wrap up tasks, follow up on delegations, prepare weekly review.";
      case "weekend-sanctuary":
        return "Weekend Sanctuary - restoration priority, block work unless Emergency P0.";
    }
  }

  return {
    event: async (input: { event: { type: string } }) => {
      if (input.event.type === "session.created" && !injectedThisSession) {
        injectedThisSession = true;
        const temporal = getTemporalContext();
        const formatted = formatTemporalContext(temporal);
        
        log("Temporal context for session:", formatted);
      }
    },

    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown>; abort?: { reason: string } }
    ) => {
      const workTools = [
        "google-workspace_send_gmail_message",
        "slack_conversations_add_message",
        "jira_",
      ];

      const isWorkTool = workTools.some(
        (t) => input.tool.startsWith(t) || input.tool === t
      );

      if (!isWorkTool) return;

      const blockCheck = shouldBlockWork();
      if (blockCheck.blocked) {
        const args = output.args as Record<string, unknown>;
        const argsString = JSON.stringify(args).toLowerCase();
        
        const isEmergency = argsString.includes("p0") || 
                           argsString.includes("emergency") ||
                           argsString.includes("urgent") ||
                           argsString.includes("critical");

        if (!isEmergency) {
          output.abort = {
            reason: `[Temporal Awareness] ${blockCheck.reason}\n\nTo proceed, mark this as Emergency/P0 or wait until work hours.`,
          };
          log(`Blocked work tool ${input.tool}: ${blockCheck.reason}`);
        }
      }
    },

    getTemporalContext,
    formatTemporalContext,
    shouldBlockWork,
    getWorkRecommendation,
    getDayModeRecommendation,
  };
}

export type TemporalAwarenessHook = ReturnType<typeof createTemporalAwarenessHook>;
