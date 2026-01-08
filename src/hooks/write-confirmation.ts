/**
 * Write Confirmation Hook
 *
 * After file writes/edits, injects a confirmation message with reminders.
 * This creates an audit trail and reinforces the Smart Merge protocol.
 *
 * Value:
 * - Reminds about _index.md updates for new files
 * - Creates audit trail of file modifications
 * - Reinforces Smart Merge protocol
 */

import { log, expandPath } from "../shared";
import * as path from "path";

export interface WriteConfirmationConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
  /** Only confirm writes within the knowledge base (default: true) */
  kbOnly?: boolean;
}

interface WriteTracker {
  pendingWritePaths: Map<string, { filePath: string; action: "write" | "edit" }>;
}

export function createWriteConfirmationHook(config: WriteConfirmationConfig) {
  const { knowledgeBasePath, enabled = true, kbOnly = true } = config;

  if (!enabled) {
    return null;
  }

  const kbPath = expandPath(knowledgeBasePath);

  const tracker: WriteTracker = {
    pendingWritePaths: new Map(),
  };

  return {
    "tool.execute.before": async (
      input: { tool: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      if (input.tool !== "write" && input.tool !== "edit") return;

      const filePath = output.args?.filePath as string | undefined;
      if (filePath && input.callID) {
        tracker.pendingWritePaths.set(input.callID, {
          filePath,
          action: input.tool as "write" | "edit",
        });
      }
    },

    "tool.execute.after": async (
      input: { tool: string; callID: string },
      output: { title: string; output: string; metadata: unknown }
    ) => {
      if (input.tool !== "write" && input.tool !== "edit") return;

      const pending = tracker.pendingWritePaths.get(input.callID);
      tracker.pendingWritePaths.delete(input.callID);

      if (!pending) return;

      const { filePath, action } = pending;

      // If kbOnly is true, only confirm writes within the knowledge base
      if (kbOnly && !filePath.startsWith(kbPath)) {
        return;
      }

      // Extract relative path for cleaner logging
      const relativePath = filePath.startsWith(kbPath)
        ? filePath.slice(kbPath.length + 1)
        : path.basename(filePath);

      // Determine action label
      const actionLabel = action === "write" ? "Created/Overwrote" : "Edited";

      // Check if this is a new file (write tool) that might need indexing
      const isNewFile = action === "write";
      const isMarkdownFile = filePath.endsWith(".md");
      const isIndexFile = relativePath.includes("_index.md") || relativePath.includes("registry.md");

      // Build the confirmation message
      let message = `[${actionLabel}: ${relativePath}]`;

      // Add reminder for new markdown files (except index files themselves)
      if (isNewFile && isMarkdownFile && !isIndexFile) {
        message += "\nReminder: Update _index.md if this is a new file. Check bidirectional links.";
      }

      log(message);
    },
  };
}

export type WriteConfirmationHook = ReturnType<typeof createWriteConfirmationHook>;
