---
type: knowledge
hemisphere: kernel
created: 2026-01-05
updated: 2026-01-05
tags: [opencode, plugin, api, hooks, technical]
summary: Hard-won knowledge about OpenCode plugin API patterns, especially hook signatures and the callID bridging pattern.
---

# OpenCode Plugin API Knowledge

## Origin

This document captures learnings from debugging Thoth plugin hooks (2026-01-05). Two bugs were caused by misunderstanding the plugin API:

1. **Context Aperture**: TypeError crash on every file read
2. **Trust Level Tracker**: Silent failure - feature never worked

Both stemmed from the same root cause: assuming `tool.execute.after` has the same structure as `tool.execute.before`.

---

## Hook Signatures

### tool.execute.before

Called **before** a tool executes. You can read args and optionally abort.

```typescript
"tool.execute.before": async (
  input: { tool: string; sessionID: string; callID: string },
  output: { args: Record<string, unknown>; abort?: { reason: string } }
) => Promise<void>
```

| Field | Description |
|-------|-------------|
| `input.tool` | Tool name (e.g., "read", "write", "todowrite") |
| `input.sessionID` | Current session identifier |
| `input.callID` | Unique identifier for this specific tool invocation |
| `output.args` | The arguments passed to the tool |
| `output.abort` | Set this to abort the tool call with a reason |

### tool.execute.after

Called **after** a tool executes. You get the result, but **NOT the original args**.

```typescript
"tool.execute.after": async (
  input: { tool: string; sessionID: string; callID: string },
  output: { title: string; output: string; metadata: unknown }
) => Promise<void>
```

| Field | Description |
|-------|-------------|
| `input.tool` | Tool name |
| `input.sessionID` | Current session identifier |
| `input.callID` | Same callID as the corresponding `before` hook |
| `output.title` | Display title (for Read tool, this is the relative file path) |
| `output.output` | The tool's output as a string |
| `output.metadata` | Additional metadata (structure varies by tool) |

### Critical Difference

```
tool.execute.before              tool.execute.after
────────────────────             ─────────────────────
output.args ✓                    output.args ✗ (DOES NOT EXIST)
output.abort ✓                   output.title ✓
                                 output.output ✓
                                 output.metadata ✓
```

**The `after` hook does NOT have access to the original input arguments.**

---

## The callID Bridging Pattern

When you need data from `before` in `after`, use `callID` as a correlation key:

```typescript
const pendingCalls = new Map<string, CachedData>();

return {
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "targetTool") return;
    
    // Cache what you need, keyed by callID
    pendingCalls.set(input.callID, {
      someArg: output.args.someArg,
      timestamp: Date.now(),
    });
  },

  "tool.execute.after": async (input, output) => {
    if (input.tool !== "targetTool") return;

    // Retrieve cached data using the same callID
    const cached = pendingCalls.get(input.callID);
    pendingCalls.delete(input.callID);  // Always clean up
    
    if (!cached) return;

    // Now you have both:
    // - cached.someArg (from before)
    // - output.output (from after)
  },
};
```

### Why This Works

- `callID` is unique per tool invocation
- Same `callID` appears in both `before` and `after` for the same call
- Map provides O(1) lookup
- Deletion prevents memory leaks

### Memory Management

Always delete from the Map in `after`. Also clear the Map on session start:

```typescript
event: async (input) => {
  if (input.event.type === "session.created") {
    pendingCalls.clear();
  }
},
```

---

## Common Mistakes

### Mistake 1: Assuming args exist in after

```typescript
// WRONG - will crash or return undefined
"tool.execute.after": async (input, output) => {
  const filePath = output.args.filePath;  // ❌ args doesn't exist
}
```

### Mistake 2: Using `as unknown as` to force types

```typescript
// WRONG - masks the bug at compile time, crashes at runtime
await hook["tool.execute.after"]?.(
  input, 
  output as unknown as { args: Record<string, unknown> }  // ❌
);
```

If you need `as unknown as`, you're probably fighting the type system for a reason.

### Mistake 3: Not cleaning up the Map

```typescript
// WRONG - memory leak
"tool.execute.after": async (input, output) => {
  const cached = pendingCalls.get(input.callID);
  // Forgot to delete!
}
```

### Mistake 4: Silent failures from optional chaining

```typescript
// Doesn't crash, but never works
const result = output.result?.someProperty;  // result is always undefined
if (result) {
  doSomething();  // Never called
}
```

Optional chaining (`?.`) can hide bugs. If something should exist, assert it.

---

## Tool-Specific Notes

### Read Tool

- `output.title` contains the relative file path
- `output.output` contains the file content with line numbers

### TodoWrite Tool

- `output.output` is a JSON string of the todo array
- Parse with `JSON.parse(output.output)` to get `Array<{ id, content, status, priority }>`

### Write/Edit Tools

- `output.title` contains the file path
- `output.output` contains confirmation message

---

## Debugging Tips

1. **Log everything first**: Before assuming structure, log `input` and `output` to see actual shape
2. **Check for crashes vs silent failures**: Crashes are easier to debug
3. **Avoid type casts**: If TypeScript complains, it's usually right
4. **Test with real tool calls**: Unit tests may not catch hook signature issues

---

## References

- Bug discovered: 2026-01-05
- Files fixed: `src/hooks/context-aperture.ts`, `src/hooks/trust-level-tracker.ts`, `src/index.ts`
- Pattern applies to: Any OpenCode plugin using tool hooks
