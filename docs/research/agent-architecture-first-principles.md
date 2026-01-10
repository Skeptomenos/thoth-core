---
type: research
hemisphere: kernel
created: 2026-01-09
updated: 2026-01-09
tags: [research, agent-architecture, claude-code, first-principles, improvements]
summary: Analysis of "What makes Claude Code powerful" article - extracting patterns, validating Thoth architecture, and identifying improvement opportunities
source: "https://medium.com/eigencloud (Anthropic community article, January 2026)"
---

# Agent Architecture: First Principles Analysis

> Extracting actionable knowledge from "What makes Claude Code powerful is surprisingly simple" for Thoth development.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [The Core Pattern: The Agent Loop](#the-core-pattern-the-agent-loop)
3. [Building Blocks](#building-blocks)
4. [Thoth vs Claude Code: Architecture Comparison](#thoth-vs-claude-code-architecture-comparison)
5. [What Thoth Already Has](#what-thoth-already-has)
6. [Improvement Opportunities](#improvement-opportunities)
7. [Implementation Priorities](#implementation-priorities)
8. [Code Patterns to Copy](#code-patterns-to-copy)
9. [Related Documents](#related-documents)

---

## Executive Summary

The article distills AI agent architecture to first principles, showing how Claude Code works from a simple bash script up to a full agent. 

**Key finding**: Thoth already implements all core architectural patterns. The value is in:
1. **Validation** — Our architecture is sound
2. **Improvements** — Specific enhancements for Work-Master, Life-Master, delegation format
3. **Reference** — Copyable patterns for future development

**The fundamental insight**: 
> "What makes Claude Code powerful is surprisingly simple: it's a loop that lets an AI read files, run commands, and iterate until a task is done."

---

## The Core Pattern: The Agent Loop

### The Pattern

```
while (task not complete):
    1. AI decides what action to take
    2. Execute that action
    3. Show AI the result
    4. Go back to step 1
```

This is the **only fundamental pattern**. Everything else (tools, permissions, context management) is refinement.

### Why It Works

| Traditional Chat | Agent Loop |
|------------------|------------|
| AI thinks, human executes | AI thinks AND executes |
| Single-shot answers | Iterative refinement |
| No self-correction | Can try, fail, retry |
| Context is manual | Context is discovered |
| Human is the hands | AI has hands |

### Thoth Implementation

Thoth implements this via:
- **Main conversation loop** — OpenCode's core runtime
- **`background_task` tool** — Spawns sub-agents with their own loops
- **Skill system** — Multi-step workflows with iteration
- **Todo tracking** — Forces completion of multi-step tasks

---

## Building Blocks

### 1. Structured Tools (vs Raw Bash)

**Why structured tools > bash:**
| Aspect | Raw Bash | Structured Tools |
|--------|----------|------------------|
| Safety | Unlimited access | Controlled surface area |
| Efficiency | Spawns subprocess | Native operations |
| Precision | Output parsing fragile | Typed responses |
| Type safety | None | Parameters validated |

**Example tools** (from article):
```typescript
// Instead of: eval("cat file.txt")
{
  name: "read_file",
  description: "Read file contents",
  input_schema: {
    properties: { path: { type: "string" } },
    required: ["path"]
  }
}
```

**Thoth status**: ✅ Uses OpenCode's typed tool system

### 2. Permission Controls

**The pattern:**
```typescript
function execute_with_permission(tool_name, tool_input) {
  if (is_dangerous(tool_name, tool_input)) {
    if (!user_confirms()) {
      return "DENIED BY USER"
    }
  }
  return execute(tool_name, tool_input)
}
```

**Permission categories:**
| Category | Example Actions | Handling |
|----------|-----------------|----------|
| Safe | Read files, analyze | Auto-allow |
| Potentially dangerous | Write files, run commands | Warn + confirm |
| Always dangerous | rm -rf, sudo, external comms | Always confirm |

**Thoth status**: ✅ `permission-enforcer` hook implements this

### 3. Surgical Edits (str_replace)

**Why full file replacement is bad:**
- **Expensive** — More output tokens = more cost
- **Error-prone** — AI might accidentally drop lines
- **Slow** — Generating 1000 lines takes time

**The str_replace pattern:**
```typescript
function edit_file(path, old_str, new_str) {
  content = read(path)
  
  // Uniqueness requirement is a FEATURE
  if (content.count(old_str) == 0) return "Not found"
  if (content.count(old_str) > 1) return "Not unique"
  
  return write(path, content.replace(old_str, new_str))
}
```

**Why uniqueness requirement helps:**
- Forces AI to include enough context
- Creates natural diff for human review
- Prevents accidental mass replacements

**Thoth status**: ✅ OpenCode's `edit` tool uses this pattern

### 4. Search Tools

**The problem**: AI can only work with files it knows about.

**Solution**: Give AI tools to explore:
- `glob` — Find files by pattern
- `grep` — Search for patterns in files
- `ast_grep` — AST-aware code search

**Discovery pattern:**
```
1. glob("**/*.py") → Find all Python files
2. grep("def authenticate", "src/") → Find auth code
3. read_file("src/auth.py") → Read relevant file
4. edit_file(...) → Make changes
```

**Thoth status**: ✅ Has glob, grep, ast_grep tools

### 5. Context Management

**The problem**: Context windows are finite.

**Solution 1: Summarization (Compaction)**
```typescript
function compact_conversation(messages) {
  summary = llm.summarize(messages, {
    preserve: ["original task", "key findings", "current state", "what's left"]
  })
  return [{ role: "user", content: `Previous work summary:\n${summary}` }]
}
```

**Solution 2: Sub-agents (Delegation)**
```typescript
function delegate_to_subagent(task, tools_allowed) {
  // Sub-agent has its OWN context
  result = run_agent(task, tools_allowed, max_turns=10)
  // Only return the result, not the full conversation
  return result.final_answer
}
```

**Thoth status**: ✅ Has both:
- `context-window-monitor` + `preemptive-compaction` hooks
- Sub-agents (Work-Master, Life-Master, Code-Master, etc.)

### 6. Project-Specific Context

**The pattern**: CLAUDE.md file at project root, auto-injected into context.

**What it contains:**
- Project overview
- Key commands (build, test, lint)
- Architecture overview
- Conventions
- Known issues

**Why it works:**
- Knowledge travels with the code
- AI knows project-specific conventions
- Reduces repeated explanations

**Thoth status**: ✅ `AGENTS.md` + `directory-agents-injector` hook

---

## Thoth vs Claude Code: Architecture Comparison

### What Both Have

| Pattern | Claude Code | Thoth |
|---------|-------------|-------|
| Agent loop | ✅ Core runtime | ✅ OpenCode runtime |
| Structured tools | ✅ Tool API | ✅ Plugin tools |
| Permission system | ✅ Approval prompts | ✅ permission-enforcer |
| Surgical edits | ✅ str_replace | ✅ edit tool |
| Search tools | ✅ glob, grep | ✅ glob, grep, ast_grep |
| Context management | ✅ Compaction | ✅ Multiple hooks |
| Project context | ✅ CLAUDE.md | ✅ AGENTS.md |
| Sub-agents | ✅ Delegation | ✅ Master agents |

### What Thoth Has Beyond Claude Code

| Thoth Capability | Description | Value |
|------------------|-------------|-------|
| **Hemisphere System** | Structured work/life/coding/kernel domains | Knowledge organized by life area |
| **Smart Merge Protocol** | Coherent knowledge updates | Knowledge accumulates, doesn't contradict |
| **Trust Arc** | Earned autonomy | Permission expands with proven competence |
| **Temporal Awareness** | Biological/calendar awareness | Respects human rhythms |
| **Skill System** | Structured workflows | Complex procedures as invokable units |
| **Sentinel Service** | Background monitoring | Proactive without prompting |
| **Cross-Hemisphere Synthesis** | Connect domains | Work stress → health impact, etc. |

### What Claude Code Has That Thoth Could Improve

| Claude Code Strength | Thoth Gap | Priority |
|---------------------|-----------|----------|
| 7-section delegation format | Not explicit in Master agents | HIGH |
| Evidence-based completion | In Code-Master, not Work/Life-Master | MEDIUM |
| Dynamic prompt building | Could be more granular | LOW |
| Parallel execution emphasis | Could be stronger in prompts | MEDIUM |

---

## What Thoth Already Has

### Implemented Patterns

**1. Agent Loop** ✅
- OpenCode runtime provides this
- `background_task` enables parallel loops
- Skills implement multi-step workflows

**2. Structured Tools** ✅
- Plugin tools via OpenCode API
- Typed parameters and responses
- Tool restrictions per agent

**3. Permission Controls** ✅
```typescript
// From src/hooks/permission-enforcer.ts
const APPROVAL_REQUIRED_ACTIONS = [
  { tool: "google-workspace_send_gmail_message", reason: "Outbound communication" },
  { tool: "slack_conversations_add_message", reason: "Outbound communication" },
  // ...
]
```

**4. Context Management** ✅
- `context-window-monitor` — Tracks usage
- `preemptive-compaction` — Compacts at 85%
- Sub-agents — Isolated context per domain

**5. Project Context** ✅
- AGENTS.md files at any directory level
- `directory-agents-injector` hook auto-injects on file reads
- Hierarchical: walks from file to root

**6. Todo Enforcement** ✅
```typescript
// From shared-hooks/todo-continuation-enforcer.ts
// Forces completion of incomplete todos
```

---

## Improvement Opportunities

### HIGH PRIORITY

#### 1. 7-Section Delegation Format for Master Agents

**Current state**: Work-Master and Life-Master have informal delegation format:
```markdown
### Receiving Delegations
Thoth delegates with:
- Zeus's request
- Relevant knowledge
- Constraints
- What I need back
```

**Problem**: Missing critical sections:
- MUST DO (exhaustive requirements)
- MUST NOT DO (forbidden actions)
- REQUIRED TOOLS (prevents tool sprawl)

**Proposed enhancement**: Add explicit 7-section format to both Master agents:

```markdown
### Delegation Format (Thoth → Master)

When Thoth delegates, expect ALL 7 sections:

1. **TASK**: Atomic, specific goal (one deliverable)
2. **EXPECTED OUTCOME**: What success looks like, measurable
3. **CONTEXT**: Relevant files, Zeus's state, constraints
4. **REQUIRED TOOLS**: Which tools you may use (whitelist)
5. **MUST DO**: 
   - Required behaviors (list exhaustively)
   - Tone and depth expectations
   - What to include in response
6. **MUST NOT DO**:
   - Forbidden actions (especially external comms without approval)
   - Anti-patterns specific to this task
7. **RETURN FORMAT**: Expected structure of your response
```

**Implementation location**: 
- `src/agents/work-master.ts` — Update `<Integration_With_Thoth>` section
- `src/agents/life-master.ts` — Update `<Integration_With_Thoth>` section
- `src/specialization/prompt-sections.ts` — Add to Core Capabilities if delegating

#### 2. Evidence-Based Completion for Master Agents

**Current state**: Code-Master has evidence requirements (via Sisyphus methodology). Work-Master and Life-Master do not.

**Problem**: No verification standard for non-coding tasks.

**Proposed enhancement**: Add evidence requirements to Master agents:

```markdown
### Evidence Requirements

A task is NOT complete without evidence:

| Action | Required Evidence |
|--------|-------------------|
| Knowledge update | File path and change summary |
| Person/project lookup | Actual file content cited |
| Communication draft | Draft presented for approval |
| Calendar analysis | Specific events referenced |
| Decision made | Decision logged with rationale |
| Pattern identified | Specific instances cited |

**Rule**: If you claim to have read something, quote from it.
```

**Implementation location**:
- `src/agents/work-master.ts` — Add to Operating_Principles
- `src/agents/life-master.ts` — Add to Operating_Principles

### MEDIUM PRIORITY

#### 3. Parallel Execution Emphasis

**Current state**: Background task capability exists but not emphasized in Master agent prompts.

**Proposed enhancement**: Add parallel execution guidance:

```markdown
### Parallel Information Gathering

When gathering context, prefer parallel over sequential:

# GOOD: Fire parallel queries
background_task(agent="explore", prompt="Find all mentions of [person]")
background_task(agent="explore", prompt="Find recent projects with [person]")
# Continue immediately, collect later

# BAD: Sequential blocking
result1 = task(...)  # Wait
result2 = task(...)  # Wait again
```

**Implementation location**:
- Consider adding to Core_Capabilities sections

#### 4. Failure Recovery Protocol

**Current state**: No explicit failure recovery in Work/Life-Master.

**Proposed enhancement** (adapted from Sisyphus):

```markdown
### When Things Go Wrong

If an approach isn't working:
1. STOP — Don't keep trying the same thing
2. DOCUMENT — What was attempted, what failed
3. ESCALATE — Ask Thoth for guidance or alternative approach
4. NEVER — Leave Zeus with incomplete/wrong information
```

### LOW PRIORITY

#### 5. Dynamic Prompt Building Based on Integrations

**Current state**: Prompt building uses Specialization (depth/domain) but not active integrations.

**Opportunity**: Build sections based on what's connected:
```typescript
function buildDynamicPrompt(spec, integrations) {
  const sections = [CORE_IDENTITY]
  
  if (integrations.includes('gmail')) {
    sections.push(GMAIL_CAPABILITIES)
  }
  if (integrations.includes('slack')) {
    sections.push(SLACK_CAPABILITIES)
  }
  // ...
}
```

**Status**: Low priority — current approach works, optimization not urgent.

---

## Implementation Priorities

| Priority | Improvement | Effort | Impact |
|----------|-------------|--------|--------|
| 1 | 7-section delegation in Work-Master | Small | High |
| 2 | 7-section delegation in Life-Master | Small | High |
| 3 | Evidence requirements in Work-Master | Small | Medium |
| 4 | Evidence requirements in Life-Master | Small | Medium |
| 5 | Parallel execution emphasis | Small | Medium |
| 6 | Failure recovery protocol | Small | Medium |
| 7 | Dynamic prompt by integrations | Medium | Low |

### Recommended First Implementation

Start with Work-Master (more likely to be tested first):
1. Add 7-section delegation format
2. Add evidence requirements
3. Add failure recovery
4. Test with real delegation from Thoth

Then replicate to Life-Master.

---

## Code Patterns to Copy

### Pattern 1: Permission Check Function

From article, adapted for Thoth context:
```typescript
const DANGEROUS_PATTERNS = {
  work: ["send_email", "send_slack", "create_calendar_event"],
  life: ["share_health_info", "financial_transaction"],
  coding: ["git_push", "deploy", "delete_branch"]
}

function requiresApproval(domain: Domain, action: string): boolean {
  return DANGEROUS_PATTERNS[domain]?.some(p => action.includes(p)) ?? false
}
```

### Pattern 2: Evidence Collection

```typescript
interface TaskEvidence {
  action: string
  evidence: string
  source?: string
  verified: boolean
}

function collectEvidence(action: string, result: unknown): TaskEvidence {
  return {
    action,
    evidence: extractEvidence(result),
    source: extractSource(result),
    verified: true
  }
}
```

### Pattern 3: 7-Section Delegation Builder

```typescript
interface Delegation {
  task: string
  expectedOutcome: string
  context: string[]
  requiredTools: string[]
  mustDo: string[]
  mustNotDo: string[]
  returnFormat: string
}

function buildDelegation(d: Delegation): string {
  return `
1. TASK: ${d.task}
2. EXPECTED OUTCOME: ${d.expectedOutcome}
3. CONTEXT:
${d.context.map(c => `   - ${c}`).join('\n')}
4. REQUIRED TOOLS: ${d.requiredTools.join(', ')}
5. MUST DO:
${d.mustDo.map(m => `   - ${m}`).join('\n')}
6. MUST NOT DO:
${d.mustNotDo.map(m => `   - ${m}`).join('\n')}
7. RETURN FORMAT: ${d.returnFormat}
`
}
```

### Pattern 4: Context Window Check

From article concept:
```typescript
const MAX_CONTEXT = 100000 // tokens
const WARNING_THRESHOLD = 0.85

function shouldCompact(currentTokens: number): boolean {
  return currentTokens / MAX_CONTEXT > WARNING_THRESHOLD
}
```

---

## Key Takeaways

1. **The loop is everything** — Agent power comes from iteration, not single-shot intelligence

2. **Structured > unstructured** — Typed tools beat raw bash, every time

3. **Permission is feature, not limitation** — Human-in-loop for dangerous actions builds trust

4. **Context is finite** — Manage it actively (compaction, sub-agents, lazy loading)

5. **Evidence or it didn't happen** — No claim without proof

6. **Delegation needs structure** — Vague prompts = vague results

7. **Thoth is architecturally sound** — We have the patterns, now refine the implementation

---

## Related Documents

- [[omo-methodology.md]] — Full Sisyphus/OMO methodology reference
- [[plugin-architecture.md]] — Thoth plugin architecture
- [[implementation-vehicles.md]] — When to use prompt vs hook vs skill
- [[system-prompt-architecture.md]] — How prompts are assembled

---

*Research document for Thoth development | Source: Community article on Claude Code architecture*
