/**
 * Read Confirmation Hook
 *
 * After file reads, injects a confirmation message into the conversation.
 * This creates an audit trail and prevents hallucination about what was read.
 *
 * Value:
 * - Prevents "I read file X" when it wasn't actually read
 * - Creates audit trail of file access
 * - Helps with context management
 */

import { log, expandPath } from "../shared";
import * as path from "path";

export interface ReadConfirmationConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
  /** Only confirm reads within the knowledge base (default: true) */
  kbOnly?: boolean;
}

interface ReadTracker {
  pendingReadPaths: Map<string, string>;
}

export function createReadConfirmationHook(config: ReadConfirmationConfig) {
  const { knowledgeBasePath, enabled = true, kbOnly = true } = config;

  if (!enabled) {
    return null;
  }

  const kbPath = expandPath(knowledgeBasePath);

  const tracker: ReadTracker = {
    pendingReadPaths: new Map(),
  };

  return {
    "tool.execute.before": async (
      input: { tool: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      if (input.tool !== "read") return;

      const filePath = output.args?.filePath as string | undefined;
      if (filePath && input.callID) {
        tracker.pendingReadPaths.set(input.callID, filePath);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; callID: string },
      output: { title: string; output: string; metadata: unknown }
    ) => {
      if (input.tool !== "read") return;

      const filePath = tracker.pendingReadPaths.get(input.callID);
      tracker.pendingReadPaths.delete(input.callID);

      if (!filePath) return;

      // If kbOnly is true, only confirm reads within the knowledge base
      if (kbOnly && !filePath.startsWith(kbPath)) {
        return;
      }

      // Count lines in the output
      const lineCount = output.output?.split("\n").length || 0;

      // Extract relative path for cleaner logging
      const relativePath = filePath.startsWith(kbPath)
        ? filePath.slice(kbPath.length + 1)
        : path.basename(filePath);

      log(`[Read confirmed: ${relativePath} (${lineCount} lines)]`);
    },
  };
}

export type ReadConfirmationHook = ReturnType<typeof createReadConfirmationHook>;
