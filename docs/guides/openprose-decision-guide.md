---
type: knowledge
hemisphere: kernel
created: 2026-01-09
updated: 2026-01-09
tags: [openprose, workflows, orchestration, decision, background-task, opencode-sdk]
summary: Decision guide comparing OpenProse, background_task, and OpenCode SDK for multi-agent orchestration
---

# Multi-Agent Orchestration Decision Guide

## Overview

This document explains the three approaches for multi-agent orchestration in THOTH and helps decide when to use each:

1. **`background_task`** — Prompt-based, simple parallel execution
2. **OpenProse** — Declarative workflow language for AI sessions
3. **OpenCode SDK** — Programmatic TypeScript/JavaScript control

---

## What is OpenProse?

OpenProse is a **programming language for AI sessions**. It treats an AI session as a Turing-complete computer and provides syntax to:

- Declare agents with specific configurations
- Define parallel and sequential execution
- Pass context between sessions
- Use semantic conditions for intelligent control flow

**Key insight**: When an LLM reads the OpenProse specification, it doesn't just *describe* a virtual machine — it *becomes* that VM and executes the program.

---

## The Three Approaches

### Approach A: `background_task` (Prompt-Based)

```markdown
# In a SKILL.md file

Launch three simultaneous background_task calls:

**Agent A: Email Scan**
background_task(
  agent="general",
  description="Email triage scan",
  prompt="Scan recent emails..."
)

**Agent B: Calendar Scan**
background_task(
  agent="general", 
  description="Calendar analysis",
  prompt="Analyze today's calendar..."
)

Then collect results with background_output(task_id) and synthesize.
```

### Approach B: OpenProse (Declarative)

```prose
# morning-boot.prose

agent email_scanner:
  model: sonnet
  skills: ["google-workspace"]
  prompt: "You are the Lead Triage Specialist..."

agent calendar_scanner:
  model: sonnet
  skills: ["google-workspace"]
  prompt: "You are the Daily Grid Architect..."

parallel:
  email = session: email_scanner
  calendar = session: calendar_scanner

session: synthesizer
  prompt: "Create today's daily log"
  context: { email, calendar }
```

### Approach C: OpenCode SDK (Programmatic)

```typescript
// orchestrator.ts
import { createOpencode } from "@opencode-ai/sdk"

const { client } = await createOpencode()

// True parallel execution with full control
const [email, calendar, slack] = await Promise.all([
  runSession(client, "Scan emails and categorize by urgency"),
  runSession(client, "Analyze today's calendar"),
  runSession(client, "Check Slack mentions"),
])

// Synthesis with context
const dailyLog = await runSession(client, 
  `Create daily log from: ${JSON.stringify({ email, calendar, slack })}`
)

async function runSession(client, prompt: string) {
  const session = await client.session.create()
  const result = await client.session.prompt({
    path: { id: session.data.id },
    body: { parts: [{ type: "text", text: prompt }] }
  })
  return result
}
```

---

## Comparison Matrix

| Aspect | `background_task` | OpenProse | OpenCode SDK |
|--------|-------------------|-----------|--------------|
| **Type** | Prompt-based | Declarative DSL | Programmatic API |
| **Language** | Markdown/Prose | `.prose` files | TypeScript/JavaScript |
| **Agent Definition** | Inline in prompt | Declared once, reused | Code-defined |
| **Parallel Execution** | `background_task()` calls | `parallel:` block | `Promise.all()` |
| **Context Passing** | Manual `background_output()` | `context:` property | Variables in code |
| **State Tracking** | Manual | Narration protocol | Full programmatic control |
| **Reusability** | Copy-paste | `block name():` | Functions/modules |
| **Semantic Conditions** | Not available | `**condition**` markers | Code logic |
| **Error Handling** | Manual | `try/catch/finally` | Native try/catch |
| **Session Control** | Limited | Via Task tool | Full API (create, abort, resume) |
| **Streaming** | No | No | Yes (`event.subscribe`) |
| **Debugging** | Implicit | Emoji trace | Full debugging tools |
| **Learning Curve** | Low | Medium | Medium-High |
| **Best For** | Quick tasks | Reusable workflows | Complex orchestration |

---

## When to Use Each

### Use `background_task` When:

- Simple, one-off parallel tasks
- Quick prototyping
- Tasks that don't need reuse
- You need maximum flexibility in prose
- Working entirely within a conversation

### Use OpenProse When:

- Complex multi-step workflows
- Workflows that will be reused
- Need clear execution trace
- Multiple agents with different configurations
- Semantic conditions needed (`loop until **it's ready**`)
- Want composable, maintainable workflows
- Human-readable workflow definitions

### Use OpenCode SDK When:

- Building external tools/integrations
- Need full programmatic control
- Complex conditional logic beyond semantic conditions
- Streaming results required
- Session lifecycle management (pause, resume, abort)
- Building custom UIs or automation scripts
- Embedding OpenCode in other applications
- Maximum performance for parallel execution

---

## OpenProse Core Concepts

### 1. Agent Declarations

Define agents once, use everywhere:

```prose
agent researcher:
  model: sonnet
  skills: ["web-search"]
  prompt: "You are a research expert"
```

### 2. Sessions

Spawn agents to do work:

```prose
let result = session: researcher
  prompt: "Research quantum computing"
```

### 3. Parallel Execution

Run multiple sessions concurrently:

```prose
parallel:
  a = session "Task A"
  b = session "Task B"
  c = session "Task C"
# All three run simultaneously, results collected
```

### 4. Context Passing

Pass data between sessions:

```prose
let research = session "Research the topic"

session "Write summary"
  context: research  # research output is passed in
```

### 5. Semantic Conditions (Fourth Wall)

Let the AI decide when conditions are met:

```prose
loop until **the code is production ready** (max: 5):
  session "Improve the code"
```

The `**...**` syntax means: "AI, you decide when this is true."

### 6. Reusable Blocks

Define once, call anywhere:

```prose
block review(topic):
  session "Research {topic}"
  session "Analyze {topic}"
  session "Summarize {topic}"

# Later:
do review("AI safety")
do review("quantum computing")
```

### 7. Error Handling

```prose
try:
  session "Risky operation"
catch as err:
  session "Handle error"
    context: err
finally:
  session "Cleanup"
```

---

## Execution Trace (Narration Protocol)

OpenProse uses emoji markers to track execution:

| Emoji | Meaning |
|-------|---------|
| 📋 | Program start/end |
| 📍 | Current statement |
| 📦 | Variable binding |
| ✅ | Success |
| ⚠️ | Error |
| 🔀 | Parallel block |
| 🔄 | Loop iteration |

**Example trace:**
```
📋 Program Start
📍 Statement 1: parallel block
🔀 Entering parallel (3 branches)
   [Task: email] [Task: calendar] [Task: slack]
🔀 Parallel complete:
   - email = "3 urgent items..."
   - calendar = "5 meetings today..."
   - slack = "2 DMs pending..."
📦 email, calendar, slack bound
📍 Statement 2: session: synthesizer
✅ Session complete: "Daily log created"
📋 Program Complete
```

---

## Migration Example: Morning Boot

### Before (background_task)

```markdown
Launch three simultaneous background_task calls:

background_task(agent="general", prompt="Scan emails...")
background_task(agent="general", prompt="Analyze calendar...")
background_task(agent="general", prompt="Check Slack...")

Collect with background_output() and synthesize.
```

### After (OpenProse)

```prose
agent email_scanner:
  model: sonnet
  skills: ["google-workspace"]
  prompt: "You are the Lead Triage Specialist..."

agent calendar_scanner:
  model: sonnet
  skills: ["google-workspace"]

agent slack_scanner:
  model: sonnet
  skills: ["slack"]

parallel:
  email = session: email_scanner
  calendar = session: calendar_scanner
  slack = session: slack_scanner

session: synthesizer
  prompt: "Create daily log"
  context: { email, calendar, slack }
```

**Benefits:**
- Agents defined once, configured clearly
- Parallel execution explicit
- Context flow visible
- Reusable for other workflows

---

## Decision Flowchart

```
Is this a one-off, simple task?
├── YES → Use background_task
└── NO
    ↓
Will this workflow be reused?
├── YES → Use OpenProse
└── NO
    ↓
Does it need multiple configured agents?
├── YES → Use OpenProse
└── NO
    ↓
Does it need semantic conditions?
├── YES → Use OpenProse
└── NO
    ↓
Do you need clear execution trace?
├── YES → Use OpenProse
└── NO → Use background_task
```

## OpenCode SDK Deep Dive

### What is the OpenCode SDK?

The OpenCode SDK (`@opencode-ai/sdk`) is a mature, type-safe JavaScript/TypeScript client for controlling OpenCode programmatically. It provides the same capabilities as the TUI but accessible via code.

**Key insight**: The SDK is what the TUI uses internally — you can do anything the TUI can do.

### Installation

```bash
npm install @opencode-ai/sdk
```

### Core Concepts

#### Creating an Instance

```typescript
import { createOpencode } from "@opencode-ai/sdk"

// Start server + client together
const { client, server } = await createOpencode({
  hostname: "127.0.0.1",
  port: 4096,
  config: {
    model: "anthropic/claude-sonnet-4",
  },
})

// Or connect to existing server
import { createOpencodeClient } from "@opencode-ai/sdk"
const client = createOpencodeClient({ baseUrl: "http://localhost:4096" })
```

#### Session Management

```typescript
// Create a session
const session = await client.session.create({ body: { title: "My task" } })

// Send a prompt
const result = await client.session.prompt({
  path: { id: session.data.id },
  body: {
    parts: [
      { type: "text", text: "Analyze this codebase" },
      { type: "file", mime: "text/plain", url: "file://src/index.ts" }
    ]
  }
})

// Abort a running session
await client.session.abort({ path: { id: session.data.id } })

// List all sessions
const sessions = await client.session.list()
```

#### Real-Time Events

```typescript
// Subscribe to server events
const events = await client.event.subscribe()
for await (const event of events.stream) {
  console.log("Event:", event.type, event.properties)
}
```

#### File Operations

```typescript
// Search for text in files
const matches = await client.find.text({ query: { pattern: "function.*" } })

// Find files by name
const files = await client.find.files({ query: { query: "*.ts", type: "file" } })

// Read a file
const content = await client.file.read({ query: { path: "src/index.ts" } })
```

### SDK API Reference

| Category | Method | Description |
|----------|--------|-------------|
| **Global** | `global.health()` | Check server health |
| **App** | `app.agents()` | List available agents |
| **Session** | `session.create()` | Create new session |
| | `session.prompt()` | Send prompt to session |
| | `session.abort()` | Abort running session |
| | `session.messages()` | Get session messages |
| | `session.delete()` | Delete session |
| **Files** | `find.text()` | Search text in files |
| | `find.files()` | Find files by name |
| | `file.read()` | Read file content |
| **Events** | `event.subscribe()` | Real-time event stream |
| **Config** | `config.get()` | Get configuration |
| | `config.providers()` | List providers |

### SDK vs OpenProse: Hybrid Approach

The SDK and OpenProse are complementary:

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenProse Workflow                       │
│              (Human-readable, declarative)                  │
│                                                             │
│  parallel:                                                  │
│    email = session: email_scanner                           │
│    calendar = session: calendar_scanner                     │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼ Executes via
┌─────────────────────────────────────────────────────────────┐
│                    OpenCode SDK                             │
│              (Programmatic execution)                       │
│                                                             │
│  await Promise.all([                                        │
│    client.session.prompt({ ... }),                          │
│    client.session.prompt({ ... }),                          │
│  ])                                                         │
└─────────────────────────────────────────────────────────────┘
```

**Future possibility**: OpenProse could use the SDK as its execution engine instead of the Task tool, enabling:
- True parallel execution (not simulated)
- Session persistence across context windows
- Streaming results
- Better error handling

---

## Integration with THOTH

OpenProse is installed as a global skill in OpenCode:
- Location: `~/.config/opencode/skill/open-prose/`
- Activation: `/prose-run <file.prose>` or mention OpenProse

### Workflow Files Location

Store `.prose` files in:
```
thoth-kb/kernel/workflows/
├── morning-boot.prose
├── evening-close.prose
├── weekly-review.prose
└── deep-work.prose
```

### Invoking from Skills

A SKILL.md can invoke a `.prose` workflow:
```markdown
When triggered, execute:
/prose-run kernel/workflows/morning-boot.prose
```

---

## Related Documents

- [[./unified-architecture-vision.md]] — Overall THOTH architecture
- [[./external-innovations-analysis.md]] — OpenProse detailed analysis
- [[./practical-roadmap.md]] — Implementation timeline

---

## Progress Log

- 2026-01-09: Initial document created
