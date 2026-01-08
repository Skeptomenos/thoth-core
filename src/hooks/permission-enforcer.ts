import { log, readFileSync, expandPath } from "../shared";
import * as path from "path";

const ALWAYS_REQUIRE_APPROVAL: PermissionRule[] = [
  { tool: "google-workspace_send_gmail_message", reason: "Sending email to external parties" },
  { tool: "slack_conversations_add_message", reason: "Posting to Slack" },
  { tool: "google-workspace_send_message", reason: "Sending Google Chat message" },
  { tool: "stripe_*", reason: "Financial transaction" },
  { tool: "paypal_*", reason: "Financial transaction" },
  { tool: "bash", pattern: /rm\s+-rf|rmdir|delete|DROP\s+TABLE|TRUNCATE/i, reason: "Destructive command" },
  { tool: "drive-synapsis_delete_file", reason: "Deleting file" },
  { tool: "drive-synapsis_bulk_delete_files", reason: "Bulk deleting files" },
  { tool: "drive-synapsis_update_google_doc", reason: "Modifying shared Google Doc" },
  { tool: "drive-synapsis_update_sheet_cell", reason: "Modifying shared Google Sheet" },
  { tool: "drive-synapsis_share_file_with_user", reason: "Sharing file with others" },
  { tool: "drive-synapsis_make_file_public", reason: "Making file public" },
  { tool: "bash", pattern: /git\s+push/i, reason: "Pushing to remote repository" },
  { tool: "write", pattern: /THOTH\.md|MASTER\.md|permissions\.md/i, reason: "Modifying system prompts" },
  { tool: "edit", pattern: /THOTH\.md|MASTER\.md|permissions\.md/i, reason: "Modifying system prompts" },
];

const TRUST_LEVEL_2_AUTONOMOUS: PermissionRule[] = [
  { tool: "write", pattern: /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp)["']?(?:[,}\s]|$)/i, reason: "Code modification" },
  { tool: "edit", pattern: /\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h|hpp)["']?(?:[,}\s]|$)/i, reason: "Code modification" },
  { tool: "bash", pattern: /npm\s+(run\s+)?(build|test)|pytest|cargo\s+(build|test)|go\s+(build|test)/i, reason: "Build/test command" },
  { tool: "bash", pattern: /git\s+commit/i, reason: "Creating git commit" },
];

const TRUST_LEVEL_3_AUTONOMOUS: PermissionRule[] = [
  { tool: "google-workspace_send_gmail_message", pattern: /Re:|Fwd:|follow.?up/i, reason: "Routine email" },
  { tool: "google-workspace_create_event", reason: "Creating calendar event" },
  { tool: "google-workspace_modify_event", reason: "Modifying calendar event" },
  { tool: "slack_conversations_add_message", pattern: /#internal|#team/i, reason: "Internal Slack message" },
];

interface PermissionRule {
  tool: string;
  pattern?: RegExp;
  reason: string;
}

interface TrustState {
  level: 1 | 2 | 3;
  temporaryOverrides?: Array<{
    scope: string;
    permission: string;
    expires?: string;
  }>;
}

export interface PermissionEnforcerConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
}

export function createPermissionEnforcerHook(config: PermissionEnforcerConfig) {
  const { knowledgeBasePath, enabled = true } = config;

  if (!enabled) {
    return null;
  }

  function getTrustState(): TrustState {
    const trustPath = path.join(expandPath(knowledgeBasePath), "kernel", "state", "trust.md");
    const content = readFileSync(trustPath);
    
    if (!content) {
      log("Trust state file not found, defaulting to level 1");
      return { level: 1 };
    }

    const levelMatch = content.match(/## Current Level:\s*(\d)/);
    const level = levelMatch ? parseInt(levelMatch[1], 10) as 1 | 2 | 3 : 1;

    const overrides: TrustState["temporaryOverrides"] = [];
    const overrideSection = content.match(/## Temporary Overrides\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n##|$)/);
    
    if (overrideSection) {
      const rows = overrideSection[1].trim().split("\n");
      for (const row of rows) {
        const cells = row.split("|").map(c => c.trim()).filter(Boolean);
        if (cells.length >= 3 && cells[0] !== "(none)") {
          overrides.push({
            scope: cells[0],
            permission: cells[1],
            expires: cells[3] || undefined,
          });
        }
      }
    }

    return { level, temporaryOverrides: overrides };
  }

  function checkRule(
    rule: PermissionRule,
    toolName: string,
    args: Record<string, unknown>
  ): boolean {
    if (rule.tool.endsWith("*")) {
      const prefix = rule.tool.slice(0, -1);
      if (!toolName.startsWith(prefix)) return false;
    } else if (rule.tool !== toolName) {
      return false;
    }

    if (rule.pattern) {
      const argsString = JSON.stringify(args);
      if (!rule.pattern.test(argsString)) return false;
    }

    return true;
  }

  function checkTemporaryOverride(
    trustState: TrustState,
    toolName: string,
    args: Record<string, unknown>
  ): boolean {
    if (!trustState.temporaryOverrides?.length) return false;

    const now = new Date();
    
    for (const override of trustState.temporaryOverrides) {
      if (override.expires) {
        const expiresDate = new Date(override.expires);
        if (now > expiresDate) continue;
      }

      const argsString = JSON.stringify(args);
      if (argsString.includes(override.scope) || toolName.includes(override.scope)) {
        return true;
      }
    }

    return false;
  }

  return {
    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown>; abort?: { reason: string } }
    ) => {
      const { tool } = input;
      const args = output.args;

      const trustState = getTrustState();

      if (checkTemporaryOverride(trustState, tool, args)) {
        log(`Permission granted via temporary override for ${tool}`);
        return;
      }

      for (const rule of ALWAYS_REQUIRE_APPROVAL) {
        if (checkRule(rule, tool, args)) {
          output.abort = {
            reason: `[Permission Required] ${rule.reason}\n\nThis action requires explicit approval. Please confirm you want to proceed.`,
          };
          log(`Blocked ${tool}: ${rule.reason}`);
          return;
        }
      }

      if (trustState.level < 2) {
        for (const rule of TRUST_LEVEL_2_AUTONOMOUS) {
          if (checkRule(rule, tool, args)) {
            output.abort = {
              reason: `[Trust Level 2 Required] ${rule.reason}\n\nCurrent trust level: ${trustState.level}. This action requires trust level 2 or higher.`,
            };
            log(`Blocked ${tool} at trust level ${trustState.level}: ${rule.reason}`);
            return;
          }
        }
      }

      if (trustState.level < 3) {
        for (const rule of TRUST_LEVEL_3_AUTONOMOUS) {
          if (checkRule(rule, tool, args)) {
            output.abort = {
              reason: `[Trust Level 3 Required] ${rule.reason}\n\nCurrent trust level: ${trustState.level}. This action requires trust level 3 (Trusted).`,
            };
            log(`Blocked ${tool} at trust level ${trustState.level}: ${rule.reason}`);
            return;
          }
        }
      }

      log(`Permission granted for ${tool} at trust level ${trustState.level}`);
    },
  };
}

export type PermissionEnforcerHook = ReturnType<typeof createPermissionEnforcerHook>;
