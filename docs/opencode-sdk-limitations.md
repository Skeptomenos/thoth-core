---
created: 2026-01-09
updated: 2026-01-09
---

# OpenCode SDK: Capabilities and Limitations

This document captures learnings from attempting to build a test harness for Thoth skills using the OpenCode SDK.

## Summary

The OpenCode SDK is designed for **creating sessions and sending prompts to an existing OpenCode server**. It does NOT support specifying custom agents, system prompts, or models — sessions inherit the server's default configuration.

## What Works

### Session Management
- `session.create({ body: { title } })` — Creates a new session
- `session.messages({ path: { id } })` — Retrieves all messages for a session
- `session.status()` — Returns status of all sessions (not per-session)

### Prompt Sending
- `session.prompt({ path: { id }, body: { parts } })` — Sends a prompt to a session
- Parts support `{ type: "text", text: "..." }` format

### Message Retrieval
- Full transcript including tool calls is available via `session.messages()`
- Messages include `info.agent`, `info.modelID`, `info.error` metadata

## What Doesn't Work (Limitations)

### Agent Selection is Ignored
The SDK accepts an `agent` parameter in the prompt body, but it's **ignored**:

```typescript
await client.session.prompt({
  path: { id: sessionId },
  body: {
    parts: [{ type: "text", text: prompt }],
    agent: "Thoth",  // IGNORED - session uses server's default agent
  },
});
```

Sessions always use the agent configured in the OpenCode server that's running.

### System Prompt Override is Ignored
The `system` parameter in the prompt body is also ignored:

```typescript
body: {
  parts: [...],
  system: "Custom system prompt...",  // IGNORED
}
```

### Model Override is Ignored
Same for the `model` parameter:

```typescript
body: {
  model: { providerID: "anthropic", modelID: "claude-sonnet-4-20250514" },  // IGNORED
}
```

### Directory Parameter is Insufficient
The `query: { directory }` parameter sets the working directory but does NOT:
- Load plugins from that directory
- Switch to agents defined in that directory
- Apply AGENTS.md from that directory

## `opencode run` CLI Behavior

The `opencode run` command has different behavior:

### What Works
- `opencode run --agent Thoth --format json "hi"` — Works when run directly via PTY
- Returns JSON-formatted events including tool calls
- Respects `--agent` flag (unlike SDK)

### What's Flaky
- Exit code 1 with no output in many scenarios
- Inconsistent behavior between direct PTY spawn and bash wrappers
- May fail silently when multiple OpenCode instances are running

### Observed Failure Modes
1. Command returns exit code 1 with zero output
2. No stderr or error message provided
3. Works intermittently — same command succeeds then fails

## Architecture Implications

### Why SDK Sessions Use Default Agent
SDK sessions connect to an **already-running OpenCode server**. That server was started in a specific directory with a specific configuration. The SDK cannot reconfigure the server — it can only interact with what's already running.

### The Context Inheritance Problem
- SDK sessions: **No context inheritance** — uses server's default configuration
- `background_task`: **Full context inheritance** — sub-agents see MCPs, AGENTS.md, tools
- `opencode run`: **Fresh context** — loads config from the current directory

## Recommendations for Testing

### For Unit Testing Skills
Use `opencode run` with `--agent` and `--format json`:
```bash
cd /path/to/thoth-kb && opencode run --agent Thoth --format json "prompt"
```

But be aware of flakiness — may need retries.

### For Integration Testing
Use `background_task` from within an active OpenCode session. This inherits the full context including:
- MCP tool access
- AGENTS.md identity configuration
- Skill definitions
- Plugin configuration

### For E2E Testing
Start OpenCode in the target directory, then use the SDK to create sessions and observe behavior. Accept that sessions will use the server's default agent.

## Test Harness Status

The test harness in `src/sdk/test-harness.ts` and `script/test-morning-boot-cli.ts` represents our attempt to automate testing. Current status:

- **SDK-based approach**: Works for creating sessions and reading transcripts, but cannot specify agent/system prompt
- **CLI-based approach**: More promising but flaky — needs investigation into why `opencode run` fails silently

## Future Work

1. **Investigate `opencode run` flakiness** — why does it return exit code 1 with no output?
2. **Consider OpenCode API improvements** — request ability to specify agent in SDK session creation
3. **Build retry logic** — wrap `opencode run` with retries and timeout handling
4. **Use `background_task` for testing** — may be more reliable since it inherits context properly
