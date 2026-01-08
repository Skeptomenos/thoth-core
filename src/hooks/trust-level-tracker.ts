import { log, readFileSync, writeFileSync, expandPath } from "../shared";
import * as path from "path";

export type TrustLevel = 1 | 2 | 3;

export interface TrustState {
  level: TrustLevel;
  history: TrustHistoryEntry[];
  temporaryOverrides: TrustOverride[];
  criteria: TrustCriteria;
}

interface TrustHistoryEntry {
  date: string;
  level: TrustLevel;
  change: "Init" | "Upgrade" | "Downgrade" | "Override";
  reason: string;
}

interface TrustOverride {
  scope: string;
  permission: string;
  granted: string;
  expires?: string;
}

interface TrustCriteria {
  successfulTasks: number;
  permissionViolations: number;
  lastViolationDate?: string;
}

interface PendingTodoWrite {
  callID: string;
  previousTodos: Array<{ id: string; status: string }>;
}

export interface TrustLevelTrackerConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
}

const TRUST_STATE_TEMPLATE = `---
type: state
hemisphere: kernel
created: {{DATE}}
updated: {{DATE}}
---

# Trust State

## Current Level: 1

| Level | Name        | Description                                    |
|-------|-------------|------------------------------------------------|
| 1     | New         | Read-only, all actions require approval        |
| 2     | Established | Code edits with evidence, knowledge updates    |
| 3     | Trusted     | Routine communications, calendar changes       |

## Trust History

| Date       | Level | Change | Reason                          |
|------------|-------|--------|--------------------------------|
| {{DATE}} | 1     | Init   | System initialized             |

## Temporary Overrides

| Scope                  | Permission      | Granted    | Expires    |
|------------------------|-----------------|------------|------------|
| (none)                 |                 |            |            |

## Trust Earning Criteria

- Successful task completions: 0 / 10
- Permission violations (last 7 days): 0
- Last violation: never

## Upgrade Requirements

### Level 1 → Level 2
- [ ] 10 successful task completions without errors
- [ ] 0 permission violations in last 7 days

### Level 2 → Level 3
- [ ] 25 successful task completions
- [ ] 0 permission violations in last 30 days
- [ ] User explicitly grants expanded permissions
`;

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function createTrustLevelTrackerHook(config: TrustLevelTrackerConfig) {
  const { knowledgeBasePath, enabled = true } = config;

  if (!enabled) {
    return null;
  }

  const trustFilePath = path.join(
    expandPath(knowledgeBasePath),
    "kernel",
    "state",
    "trust.md"
  );

  const pendingTodoWrites = new Map<string, PendingTodoWrite>();

  function ensureTrustFileExists(): void {
    const content = readFileSync(trustFilePath);
    if (!content) {
      const today = getTodayDate();
      const initialContent = TRUST_STATE_TEMPLATE.replace(/\{\{DATE\}\}/g, today);
      writeFileSync(trustFilePath, initialContent);
      log("Created initial trust state file");
    }
  }

  function parseTrustState(): TrustState {
    ensureTrustFileExists();
    const content = readFileSync(trustFilePath) || "";

    const levelMatch = content.match(/## Current Level:\s*(\d)/);
    const level = (levelMatch ? parseInt(levelMatch[1], 10) : 1) as TrustLevel;

    const history: TrustHistoryEntry[] = [];
    const historySection = content.match(
      /## Trust History\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n##|$)/
    );
    if (historySection) {
      const rows = historySection[1].trim().split("\n");
      for (const row of rows) {
        const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
        if (cells.length >= 4 && cells[0] !== "(none)") {
          history.push({
            date: cells[0],
            level: parseInt(cells[1], 10) as TrustLevel,
            change: cells[2] as TrustHistoryEntry["change"],
            reason: cells[3],
          });
        }
      }
    }

    const temporaryOverrides: TrustOverride[] = [];
    const overrideSection = content.match(
      /## Temporary Overrides\n\n\|[^\n]+\n\|[^\n]+\n([\s\S]*?)(?=\n##|$)/
    );
    if (overrideSection) {
      const rows = overrideSection[1].trim().split("\n");
      for (const row of rows) {
        const cells = row.split("|").map((c) => c.trim()).filter(Boolean);
        if (cells.length >= 3 && cells[0] !== "(none)") {
          temporaryOverrides.push({
            scope: cells[0],
            permission: cells[1],
            granted: cells[2],
            expires: cells[3] || undefined,
          });
        }
      }
    }

    const successfulTasksMatch = content.match(/Successful task completions:\s*(\d+)/);
    const violationsMatch = content.match(/Permission violations \(last 7 days\):\s*(\d+)/);
    const lastViolationMatch = content.match(/Last violation:\s*(\S+)/);

    const criteria: TrustCriteria = {
      successfulTasks: successfulTasksMatch ? parseInt(successfulTasksMatch[1], 10) : 0,
      permissionViolations: violationsMatch ? parseInt(violationsMatch[1], 10) : 0,
      lastViolationDate: lastViolationMatch && lastViolationMatch[1] !== "never" 
        ? lastViolationMatch[1] 
        : undefined,
    };

    return { level, history, temporaryOverrides, criteria };
  }

  function updateTrustFile(state: TrustState): void {
    const today = getTodayDate();
    
    const historyRows = state.history
      .map((h) => `| ${h.date} | ${h.level}     | ${h.change} | ${h.reason} |`)
      .join("\n");

    const overrideRows = state.temporaryOverrides.length > 0
      ? state.temporaryOverrides
          .map((o) => `| ${o.scope} | ${o.permission} | ${o.granted} | ${o.expires || ""} |`)
          .join("\n")
      : "| (none)                 |                 |            |            |";

    const level2Tasks = Math.min(state.criteria.successfulTasks, 10);
    const level2Violations = state.criteria.permissionViolations === 0;

    const content = `---
type: state
hemisphere: kernel
created: ${state.history[0]?.date || today}
updated: ${today}
---

# Trust State

## Current Level: ${state.level}

| Level | Name        | Description                                    |
|-------|-------------|------------------------------------------------|
| 1     | New         | Read-only, all actions require approval        |
| 2     | Established | Code edits with evidence, knowledge updates    |
| 3     | Trusted     | Routine communications, calendar changes       |

## Trust History

| Date       | Level | Change | Reason                          |
|------------|-------|--------|--------------------------------|
${historyRows}

## Temporary Overrides

| Scope                  | Permission      | Granted    | Expires    |
|------------------------|-----------------|------------|------------|
${overrideRows}

## Trust Earning Criteria

- Successful task completions: ${state.criteria.successfulTasks} / 10
- Permission violations (last 7 days): ${state.criteria.permissionViolations}
- Last violation: ${state.criteria.lastViolationDate || "never"}

## Upgrade Requirements

### Level 1 → Level 2
- [${level2Tasks >= 10 ? "x" : " "}] 10 successful task completions without errors
- [${level2Violations ? "x" : " "}] 0 permission violations in last 7 days

### Level 2 → Level 3
- [${state.criteria.successfulTasks >= 25 ? "x" : " "}] 25 successful task completions
- [ ] 0 permission violations in last 30 days
- [ ] User explicitly grants expanded permissions
`;

    writeFileSync(trustFilePath, content);
    log(`Updated trust state file: level ${state.level}`);
  }

  function incrementSuccessfulTasks(): void {
    const state = parseTrustState();
    state.criteria.successfulTasks++;
    checkForUpgrade(state);
    updateTrustFile(state);
  }

  function recordPermissionViolation(reason: string): void {
    const state = parseTrustState();
    state.criteria.permissionViolations++;
    state.criteria.lastViolationDate = getTodayDate();
    
    state.history.push({
      date: getTodayDate(),
      level: state.level,
      change: "Downgrade",
      reason: `Permission violation: ${reason}`,
    });
    
    updateTrustFile(state);
    log(`Recorded permission violation: ${reason}`);
  }

  function checkForUpgrade(state: TrustState): void {
    const today = getTodayDate();
    
    if (state.level === 1) {
      const meetsLevel2 =
        state.criteria.successfulTasks >= 10 &&
        state.criteria.permissionViolations === 0;

      if (meetsLevel2) {
        state.level = 2;
        state.history.push({
          date: today,
          level: 2,
          change: "Upgrade",
          reason: "Met Level 2 criteria automatically",
        });
        log("Trust level upgraded to 2 (Established)");
      }
    }
  }

  function addTemporaryOverride(
    scope: string,
    permission: string,
    expiresInDays?: number
  ): void {
    const state = parseTrustState();
    const today = getTodayDate();
    
    let expires: string | undefined;
    if (expiresInDays) {
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + expiresInDays);
      expires = expiresDate.toISOString().split("T")[0];
    }

    state.temporaryOverrides.push({
      scope,
      permission,
      granted: today,
      expires,
    });

    updateTrustFile(state);
    log(`Added temporary override: ${scope} - ${permission}`);
  }

  function cleanExpiredOverrides(): void {
    const state = parseTrustState();
    const today = new Date();
    
    state.temporaryOverrides = state.temporaryOverrides.filter((o) => {
      if (!o.expires) return true;
      return new Date(o.expires) > today;
    });

    updateTrustFile(state);
  }

  function parseTodosFromArgs(args: Record<string, unknown>): Array<{ id: string; status: string }> {
    const todos = args.todos;
    if (!Array.isArray(todos)) return [];
    
    return todos
      .filter((t): t is { id: string; status: string } => 
        typeof t === "object" && t !== null && "id" in t && "status" in t
      )
      .map((t) => ({ id: String(t.id), status: String(t.status) }));
  }

  function countNewlyCompleted(
    previous: Array<{ id: string; status: string }>,
    current: Array<{ id: string; status: string }>
  ): number {
    const previousCompleted = new Set(
      previous.filter((t) => t.status === "completed").map((t) => t.id)
    );
    
    return current.filter(
      (t) => t.status === "completed" && !previousCompleted.has(t.id)
    ).length;
  }

  return {
    event: async (input: { event: { type: string; properties?: Record<string, unknown> } }) => {
      const { event } = input;

      if (event.type === "session.created") {
        ensureTrustFileExists();
        cleanExpiredOverrides();
        pendingTodoWrites.clear();
        log("Trust level tracker initialized for session");
      }
    },

    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { args: Record<string, unknown> }
    ) => {
      if (input.tool !== "todowrite") return;
      
      const currentTodos = parseTodosFromArgs(output.args);
      pendingTodoWrites.set(input.callID, {
        callID: input.callID,
        previousTodos: currentTodos,
      });
    },

    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: { title: string; output: string; metadata: unknown }
    ) => {
      if (input.tool !== "todowrite") return;

      const pending = pendingTodoWrites.get(input.callID);
      pendingTodoWrites.delete(input.callID);

      if (!pending) return;

      try {
        const resultTodos = JSON.parse(output.output) as Array<{ id: string; status: string }>;
        const newlyCompleted = countNewlyCompleted(pending.previousTodos, resultTodos);
        
        if (newlyCompleted > 0) {
          log(`Detected ${newlyCompleted} newly completed todo(s)`);
          for (let i = 0; i < newlyCompleted; i++) {
            incrementSuccessfulTasks();
          }
        }
      } catch {
        log("Could not parse todowrite output for trust tracking");
      }
    },

    getTrustState: parseTrustState,
    incrementSuccessfulTasks,
    recordPermissionViolation,
    addTemporaryOverride,
  };
}

export type TrustLevelTrackerHook = ReturnType<typeof createTrustLevelTrackerHook>;
