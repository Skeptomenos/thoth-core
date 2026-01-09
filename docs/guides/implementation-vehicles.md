---
type: reference
hemisphere: kernel
created: 2026-01-09
updated: 2026-01-09
tags: [architecture, development, patterns, vehicles]
summary: Guide for choosing between system prompt, hooks, skills, and sub-agents when implementing Thoth capabilities
---

# Implementation Vehicles Guide

When adding new capabilities to Thoth, choose the right implementation vehicle based on scope, token cost, and behavioral requirements.

---

## Quick Decision Matrix

| Question | Yes → | No → |
|----------|-------|------|
| Needed EVERY message? | Prompt or Hook | Skill or Agent |
| About WHO Thoth is? | **System Prompt** | Other |
| Must happen regardless of reasoning? | **Hook** | Other |
| Complex multi-step workflow? | **Skill** | Other |
| Needs deep domain expertise? | **Sub-Agent** | Other |
| Can work independently of session? | **Sub-Agent** | Handle directly |

---

## Vehicle Comparison

| Vehicle | Token Cost | Scope | When Active |
|---------|------------|-------|-------------|
| **System Prompt** | Permanent (~2500-4000 tokens) | Every message | Always |
| **Hook** | Zero (code) | Specific triggers | On matched events |
| **Skill** | Zero until invoked | On-demand | When triggered |
| **Sub-Agent** | Spawned separately | Delegated tasks | When called |

---

## System Prompt Sections

### Purpose
- Always-on behavior and reasoning patterns
- Core identity and personality
- Universal rules that apply to every interaction

### When to Use
- Behavior that must influence EVERY response
- Identity-defining characteristics
- Cross-cutting concerns (permissions, anti-patterns)
- Context retrieval strategies

### When NOT to Use
- Optional workflows (use Skill)
- Rare behaviors (use Skill)
- Enforcement without reasoning (use Hook)
- Domain-specific expertise (use Sub-Agent)

### Examples in Thoth
| Section | Purpose |
|---------|---------|
| `<Identity>` | Who Thoth is |
| `<Anti_Patterns>` | What to avoid |
| `<Permission_System>` | Approval requirements |
| `<Temporal_Awareness>` | Time-based reasoning |
| `<Phase_0_Intent_Gate>` | Request classification |
| `<Core_Capabilities>` | Delegation guidance |

### Token Budget Consideration
Every token in the system prompt is paid on EVERY message. Be ruthless about what goes here. If something can be a skill or hook instead, prefer that.

---

## Hooks

### Purpose
- Enforcement of rules (blocking, approval)
- Injection of context (read/write confirmation)
- Interception of tool calls
- Side effects without reasoning overhead

### Available Events
| Event | Trigger | Use Case |
|-------|---------|----------|
| `tool.execute.before` | Before tool runs | Block, modify, inject |
| `tool.execute.after` | After tool completes | Log, confirm, inject |
| `event` (session.created) | Session starts | Initialize state |
| `event` (message.updated) | Message changes | Error recovery |

### When to Use
- Something MUST happen regardless of LLM reasoning
- Need to block/modify tool calls
- Need to inject context after operations
- Enforcement that can't be "reasoned around"

### When NOT to Use
- Complex reasoning required (use Prompt or Skill)
- Multi-step workflows (use Skill)
- User-facing output (hooks are silent)

### Examples in Thoth
| Hook | Purpose |
|------|---------|
| `permission-enforcer` | Block unauthorized tool calls |
| `temporal-awareness` | Block work tools on weekends |
| `read-confirmation` | Log file reads for audit |
| `write-confirmation` | Remind about index updates |
| `frontmatter-enforcer` | Validate KB file structure |
| `context-aperture` | Inject retrieval guidance |

### Code Location
`thoth-core/src/hooks/`

---

## Skills

### Purpose
- Complex multi-step workflows
- Optional behaviors triggered on-demand
- Detailed instructions for specific tasks
- Zero token cost until invoked

### Structure
```
.opencode/skill/{skill-name}/
├── SKILL.md          # Main instructions (frontmatter + markdown)
├── supporting.md     # Optional supporting docs
└── templates/        # Optional templates
```

### Frontmatter
```yaml
---
name: skill-name
description: When to use this skill
triggers:
  - "Trigger phrase 1"
  - "Trigger phrase 2"
---
```

### When to Use
- Workflow with 3+ steps
- Behavior only needed sometimes
- Complex procedures that would bloat prompt
- Reusable patterns across sessions

### When NOT to Use
- Always-on behavior (use Prompt)
- Enforcement (use Hook)
- Deep domain expertise (use Sub-Agent)
- Simple actions that don't need instructions

### Examples in Thoth
| Skill | Purpose |
|-------|---------|
| `morning-boot` | Start-of-day workflow |
| `evening-close` | End-of-day summary |
| `onboarding` | Breadth-first domain discovery |
| `gardener` | KB health and maintenance |
| `mail-triage` | Email processing |
| `post-meeting-drill` | Meeting note extraction |

### Skill Location
- Default skills: `thoth-core/defaults/skill/`
- Project skills: `.opencode/skill/`
- KB skills: `thoth-kb/.opencode/skill/`

---

## Sub-Agents

### Purpose
- Deep domain expertise
- Parallel execution
- Work that can proceed independently
- Specialized personas

### Available Agents
| Agent | Domain | Use For |
|-------|--------|---------|
| **Work-Master** | Professional life | Projects, colleagues, career |
| **Life-Master** | Personal life | Health, relationships, home |
| **Code-Master** | Technical projects | Development, debugging |
| **coach** | Thinking partner | Decisions, reflection |
| **sentinel** | Monitoring | What needs attention |
| **diplomat** | Communications | Draft emails, messages |
| **chronicler** | Processing | Meeting notes, extraction |

### When to Use
- Task requires deep domain context
- Work can proceed without session context
- Parallel execution beneficial
- Specialized expertise needed

### When NOT to Use
- Needs current session context (handle directly)
- Simple lookup or action
- User expects immediate response

### Delegation Format (7-Section)
```markdown
1. TASK: Atomic, specific goal
2. EXPECTED OUTCOME: Concrete deliverables
3. REQUIRED SKILLS: Which skill to invoke
4. REQUIRED TOOLS: Explicit tool whitelist
5. MUST DO: Exhaustive requirements
6. MUST NOT DO: Forbidden actions
7. CONTEXT: File paths, constraints
```

### Background vs Foreground
| Mode | Tool | Use Case |
|------|------|----------|
| Foreground | `task()` | Need result before continuing |
| Background | `background_task()` | Parallel work, collect later |

---

## Decision Flowchart

```
Is this behavior needed EVERY message?
├─ YES → Is it about WHO Thoth is or HOW to behave?
│   ├─ YES → SYSTEM PROMPT
│   └─ NO → Probably HOOK (enforcement)
└─ NO → Is it triggered by user intent?
    ├─ YES → Is it a complex workflow?
    │   ├─ YES → SKILL
    │   └─ NO → Lightweight prompt section or nothing
    └─ NO → Is it proactive/background?
        ├─ YES → HOOK (injection) or SUB-AGENT (sentinel)
        └─ NO → Probably doesn't need implementation
```

---

## Common Mistakes

| Mistake | Problem | Solution |
|---------|---------|----------|
| Putting optional workflow in prompt | Token waste | Make it a skill |
| Using skill for enforcement | Can be reasoned around | Use hook |
| Hook with complex reasoning | Hooks can't reason | Use prompt section |
| Delegating context-dependent work | Agent lacks context | Handle directly |
| Putting rare behavior in prompt | Token waste | Make it a skill |

---

## Adding New Capabilities Checklist

Before implementing, answer:

1. [ ] Is this needed every message? → Consider prompt
2. [ ] Must this happen regardless of reasoning? → Consider hook
3. [ ] Is this a multi-step workflow? → Consider skill
4. [ ] Does this need specialized expertise? → Consider sub-agent
5. [ ] What's the token cost? → Minimize prompt additions
6. [ ] Can it be triggered on-demand? → Prefer skill over prompt

---

## Related Documents

- [[system-prompt-architecture.md]] — How the prompt is assembled
- [[plugin-architecture.md]] — Plugin structure
- [[thoth-enhancement-plan.md]] — Enhancement planning
- [[removed-prompt-sections.md]] — What was removed and why

---

*Implementation Vehicles Guide v1.0 | Part of Thoth Development Documentation*
