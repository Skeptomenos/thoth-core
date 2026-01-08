# Hooks in Thoth

## What Are Hooks?

Hooks are **interceptors** that run before (or after) tool executions. Think of them as security checkpoints at an airport:

```
Agent Request → [HOOK] → Tool Execution → Result
                  ↑
            Can inspect,
            modify, or
            block
```

Every time an agent wants to use a tool (write a file, run a command, send an email), the request passes through registered hooks. Each hook can:

- **Inspect** the request (logging, auditing)
- **Modify** the request (transform arguments)
- **Block** the request (reject with reason)
- **Allow** unchanged (do nothing)

---

## Why Hooks?

Hooks solve a fundamental problem: **agents are probabilistic, but some behaviors must be deterministic**.

| Approach | Reliability | Agent Burden |
|----------|-------------|--------------|
| Prompt: "Always do X" | ~80% (agent might forget) | High |
| Hook: Enforce X | 100% (code enforces) | Zero |

Examples:
- **Permission Enforcer**: Block sensitive actions without approval
- **Trust Level Tracker**: Gate actions based on trust level
- **Frontmatter Enforcer**: Auto-inject metadata into markdown files

---

## The Hook Pattern

Every hook in thoth-core follows this structure:

```typescript
import { log } from "../shared";

// 1. Configuration interface
export interface MyHookConfig {
  enabled?: boolean;
  someSetting: string;
}

// 2. Factory function that creates the hook
export function createMyHook(config: MyHookConfig) {
  const { enabled = true, someSetting } = config;

  // Early exit if disabled
  if (!enabled) {
    return null;
  }

  // 3. Return object with event handlers
  return {
    // Event name → handler function
    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown>; abort?: { reason: string } }
    ) => {
      const { tool } = input;
      const args = output.args;

      // INSPECT: Log what's happening
      log(`Tool ${tool} called with args:`, args);

      // BLOCK: Set output.abort to reject
      if (someCondition) {
        output.abort = {
          reason: "This action is not allowed because...",
        };
        return;
      }

      // MODIFY: Change args before execution
      if (anotherCondition) {
        output.args.someField = "modified value";
      }

      // ALLOW: Do nothing, tool executes normally
    },
  };
}

// 4. Export type for consumers
export type MyHook = ReturnType<typeof createMyHook>;
```

---

## Hook Events

| Event | When | Use Case |
|-------|------|----------|
| `tool.execute.before` | Before tool runs | Validate, modify args, block |
| `tool.execute.after` | After tool completes | Log results, trigger side effects |

Currently, thoth-core primarily uses `tool.execute.before`.

---

## The Input/Output Contract

```typescript
"tool.execute.before": async (input, output) => {
  // INPUT (read-only)
  input.tool      // string: "write", "edit", "bash", etc.

  // OUTPUT (mutable)
  output.args     // Record<string, unknown>: tool arguments
  output.abort    // { reason: string } | undefined: set to block
}
```

### To Block an Action

```typescript
output.abort = {
  reason: "[Permission Required] This action needs approval.",
};
```

The tool will NOT execute. The agent sees the reason.

### To Modify Arguments

```typescript
output.args.content = transformedContent;
output.args.filePath = normalizedPath;
```

The tool executes with modified arguments.

### To Allow Unchanged

Simply return without modifying `output`. The tool executes normally.

---

## Existing Hooks

### Permission Enforcer

**Purpose**: Block sensitive actions based on rules and trust level.

```typescript
createPermissionEnforcerHook({
  knowledgeBasePath: "/path/to/thoth-kb",
  enabled: true,
});
```

**What it does**:
- Blocks emails, Slack messages, financial transactions without approval
- Gates code modifications behind trust level 2
- Gates external communications behind trust level 3
- Supports temporary overrides from `kernel/state/trust.md`

### Trust Level Tracker

**Purpose**: Track and manage trust levels across sessions.

### Context Aperture

**Purpose**: Control how much context is loaded based on task type.

### Temporal Awareness

**Purpose**: Inject time-based context (day mode, biological mode).

---

## Creating a New Hook

### Step 1: Create the File

```
src/hooks/my-hook.ts
```

### Step 2: Implement the Pattern

```typescript
import { log, readFileSync, expandPath } from "../shared";

export interface MyHookConfig {
  enabled?: boolean;
  // ... your config
}

export function createMyHook(config: MyHookConfig) {
  const { enabled = true } = config;

  if (!enabled) return null;

  return {
    "tool.execute.before": async (input, output) => {
      // Your logic here
    },
  };
}

export type MyHook = ReturnType<typeof createMyHook>;
```

### Step 3: Export from Index

```typescript
// src/hooks/index.ts
export {
  createMyHook,
  type MyHook,
  type MyHookConfig,
} from "./my-hook";
```

### Step 4: Register in Plugin

Hooks are registered in the plugin's initialization. See `src/index.ts` for how existing hooks are wired up.

---

## Best Practices

### 1. Early Exit for Irrelevant Tools

```typescript
// Don't process tools you don't care about
if (!["write", "edit"].includes(tool)) return;
if (!args.filePath?.endsWith(".md")) return;
```

### 2. Log Decisions

```typescript
log(`Blocked ${tool}: ${reason}`);
log(`Modified ${tool} args: added frontmatter`);
```

### 3. Clear Abort Reasons

```typescript
// Bad
output.abort = { reason: "Blocked" };

// Good
output.abort = {
  reason: `[Permission Required] Sending email to external parties requires approval.`,
};
```

### 4. Don't Mutate Input

`input` is read-only. Only modify `output.args`.

### 5. Handle Missing Args Gracefully

```typescript
const filePath = args.filePath as string | undefined;
if (!filePath) return; // Don't crash on missing args
```

---

## Debugging Hooks

Enable debug logging:

```bash
DEBUG=1 opencode
# or
THOTH_DEBUG=1 opencode
```

All `log()` calls will print to console with `[thoth-plugin]` prefix.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Request                           │
│                  tool: "write"                              │
│                  args: { filePath, content }                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hook 1: Permission Enforcer               │
│                                                             │
│   Is this a protected file? → Block if yes                  │
│   Is trust level sufficient? → Block if no                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hook 2: Frontmatter Enforcer              │
│                                                             │
│   Is this a .md file? → Inject/update frontmatter           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Hook N: ...                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tool Execution                            │
│                                                             │
│   write(filePath, content) → File written                   │
└─────────────────────────────────────────────────────────────┘
```

If ANY hook sets `output.abort`, execution stops immediately and the agent receives the abort reason.
