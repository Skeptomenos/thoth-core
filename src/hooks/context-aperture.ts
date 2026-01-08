import { log, expandPath } from "../shared";
import * as path from "path";

export interface ContextApertureConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
  warnOnDeepDive?: boolean;
}

interface ReadTracker {
  circle1Reads: Set<string>;
  circle2Reads: Set<string>;
  circle3Reads: Set<string>;
  sessionStartTime: number;
  pendingReadPaths: Map<string, string>;
}

const CIRCLE_1_PATTERNS = [
  /registry\.md$/,
  /dashboard\.md$/,
  /chronicle\.md$/,
  /_index\.md$/,
];

const CIRCLE_2_PATTERNS = [
  /\/people\/[^/]+\.md$/,
  /\/projects\/[^/]+\.md$/,
  /\/projects\/[^/]+\/overview\.md$/,
  /\/identity\/[^/]+\.md$/,
  /\/state\/[^/]+\.md$/,
  /\/config\/[^/]+\.md$/,
];

export function createContextApertureHook(config: ContextApertureConfig) {
  const { knowledgeBasePath, enabled = true, warnOnDeepDive = true } = config;

  if (!enabled) {
    return null;
  }

  const kbPath = expandPath(knowledgeBasePath);
  
  const tracker: ReadTracker = {
    circle1Reads: new Set(),
    circle2Reads: new Set(),
    circle3Reads: new Set(),
    sessionStartTime: Date.now(),
    pendingReadPaths: new Map(),
  };

  function classifyRead(filePath: string): 1 | 2 | 3 | null {
    if (!filePath.startsWith(kbPath)) {
      return null;
    }

    const relativePath = filePath.slice(kbPath.length);

    for (const pattern of CIRCLE_1_PATTERNS) {
      if (pattern.test(relativePath)) {
        return 1;
      }
    }

    for (const pattern of CIRCLE_2_PATTERNS) {
      if (pattern.test(relativePath)) {
        return 2;
      }
    }

    return 3;
  }

  function getContextStats(): {
    circle1: number;
    circle2: number;
    circle3: number;
    total: number;
    sessionDurationMs: number;
  } {
    return {
      circle1: tracker.circle1Reads.size,
      circle2: tracker.circle2Reads.size,
      circle3: tracker.circle3Reads.size,
      total: tracker.circle1Reads.size + tracker.circle2Reads.size + tracker.circle3Reads.size,
      sessionDurationMs: Date.now() - tracker.sessionStartTime,
    };
  }

  function generateContextWarning(): string | null {
    const stats = getContextStats();
    
    if (stats.circle3 > 5 && stats.circle1 < 2) {
      return `[Context Aperture Warning] Deep dive detected without proper orientation.
Read ${stats.circle3} Circle 3 files but only ${stats.circle1} Circle 1 files.
Recommendation: Start with registry.md and dashboard.md before deep exploration.`;
    }

    if (stats.total > 20) {
      return `[Context Aperture Warning] High context load detected (${stats.total} files read).
Consider focusing on specific entities rather than broad exploration.`;
    }

    return null;
  }

  return {
    event: async (input: { event: { type: string } }) => {
      if (input.event.type === "session.created") {
        tracker.circle1Reads.clear();
        tracker.circle2Reads.clear();
        tracker.circle3Reads.clear();
        tracker.pendingReadPaths.clear();
        tracker.sessionStartTime = Date.now();
        log("Context aperture tracker reset for new session");
      }
    },

    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      if (input.tool !== "read") return;
      
      const filePath = output.args?.filePath as string | undefined;
      if (filePath && input.callID) {
        tracker.pendingReadPaths.set(input.callID, filePath);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: unknown }
    ) => {
      if (input.tool !== "read") return;

      const filePath = tracker.pendingReadPaths.get(input.callID);
      tracker.pendingReadPaths.delete(input.callID);
      
      if (!filePath) return;

      const circle = classifyRead(filePath);
      if (circle === null) return;

      switch (circle) {
        case 1:
          tracker.circle1Reads.add(filePath);
          log(`Circle 1 read: ${path.basename(filePath)}`);
          break;
        case 2:
          tracker.circle2Reads.add(filePath);
          log(`Circle 2 read: ${path.basename(filePath)}`);
          break;
        case 3:
          tracker.circle3Reads.add(filePath);
          log(`Circle 3 read: ${path.basename(filePath)}`);
          
          if (warnOnDeepDive) {
            const warning = generateContextWarning();
            if (warning) {
              log(warning);
            }
          }
          break;
      }
    },

    getContextStats,
    generateContextWarning,
  };
}

export type ContextApertureHook = ReturnType<typeof createContextApertureHook>;
