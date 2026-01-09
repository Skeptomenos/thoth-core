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

## Model Configuration

### How OpenCode Resolves Models

OpenCode uses this priority order for model selection (from [official docs](https://opencode.ai/docs/models/)):

1. `--model` CLI flag
2. `model` key in `opencode.json` config
3. Last used model
4. First model using internal priority

### Global Default Model

Set a global default model in `~/.config/opencode/opencode.json`:

```json
{
  "model": "google-vertex-anthropic/claude-opus-4-5@20251101",
  ...
}
```

All agents without explicit model configuration will inherit this.

### Agent Model Inheritance

Per the [OpenCode agents documentation](https://opencode.ai/docs/agents/):

> **Model**: If you don't specify a model, primary agents use the model globally configured while **subagents will use the model of the primary agent that invoked the subagent**.

This means:
- Omit `model` from agent configs to inherit from global
- Subagents automatically inherit from their parent agent
- Only specify `model` when you intentionally want a different model (e.g., using Gemini Flash for exploration tasks)

### Plugin Agent Configuration

For plugins like thoth-plugin, **do not hardcode models** in AgentConfig:

```typescript
// GOOD - inherits from global config
export const thothAgent: AgentConfig = {
  description: "...",
  mode: "primary",
  thinking: { type: "enabled", budgetTokens: 32000 },
  maxTokens: 64000,
  prompt: "...",
};

// BAD - hardcoded model creates maintenance burden
export const thothAgent: AgentConfig = {
  model: "google-vertex-anthropic/claude-opus-4-5@20251101",  // Don't do this
  ...
};
```

### oh-my-opencode Agent Configuration

For agents in `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "agents": {
    "Sisyphus": {
      "temperature": 0.3,
      "permission": { "edit": "allow", "bash": "allow" }
      // No "model" - inherits from global
    },
    "librarian": {
      "model": "google-vertex/gemini-3-flash-preview",  // Intentionally different
      "temperature": 0.1
    }
  }
}
```

### Server Restart Required

**Critical**: Config changes only take effect after restarting OpenCode. The running server caches the configuration at startup.

### npm link and Plugin Caching

When using `npm link` for local plugin development:

1. The plugin is symlinked from `~/.cache/opencode/node_modules/thoth-plugin` to your local repo
2. Changes require `bun run build` in the plugin repo
3. If OpenCode crashes after plugin changes, the cache may be corrupted
4. **Fix corrupted cache**:
   ```bash
   rm -rf ~/.cache/opencode/node_modules/thoth-plugin
   cd ~/.cache/opencode && bun install
   # Then re-establish the link:
   cd /path/to/thoth-core && npm link
   cd ~/.cache/opencode && npm link thoth-plugin
   ```

## background_task Behavior

### MCP Availability

`background_task` inherits MCP tools from the **project where OpenCode was started**, not from the directory referenced in file paths.

Example: If OpenCode is running in `thoth-core` but you read files from `thoth-kb`, the MCPs configured in `thoth-kb` are NOT available.

**Implication for testing**: To test skills that use MCPs, OpenCode must be started in the directory with MCP configuration (e.g., `thoth-kb`).

### What background_task Inherits
- Tools available to the parent session
- MCP servers configured for the project
- Plugin-provided tools and agents

### What background_task Does NOT Inherit
- MCP configuration from other directories
- AGENTS.md from other directories (must be explicitly read as a file)

## Recommendations for Testing

### For Unit Testing Skills
Use `opencode run` with `--agent` and `--format json`:
```bash
cd /path/to/thoth-kb && opencode run --agent Thoth --format json "prompt"
```

But be aware of flakiness — may need retries.

### For Integration Testing
Use `background_task` from within an active OpenCode session **started in the correct directory**. This inherits the full context including:
- MCP tool access (from the project's MCP config)
- Skill definitions
- Plugin configuration

Note: AGENTS.md identity must be read as a file; it's not automatically injected.

### For E2E Testing
Start OpenCode in the target directory, then use the SDK to create sessions and observe behavior. Accept that sessions will use the server's default agent.

## Test Harness Status

The test harness in `src/sdk/test-harness.ts` and `script/test-morning-boot-cli.ts` represents our attempt to automate testing. Current status:

- **SDK-based approach**: Works for creating sessions and reading transcripts, but cannot specify agent/system prompt
- **CLI-based approach**: More promising but flaky — needs investigation into why `opencode run` fails silently
- **background_task approach**: Works well when OpenCode is started in the correct directory with MCP access

## Future Work

1. **Investigate `opencode run` flakiness** — why does it return exit code 1 with no output?
2. **Consider OpenCode API improvements** — request ability to specify agent in SDK session creation
3. **Build retry logic** — wrap `opencode run` with retries and timeout handling
4. **Use `background_task` for testing** — reliable when run from correct directory context
