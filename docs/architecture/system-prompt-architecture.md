---
type: reference
hemisphere: kernel
created: 2026-01-08
updated: 2026-01-08
tags: [architecture, system-prompt, plugin, internals]
summary: Complete reference for how Thoth's system prompt is assembled and injected
---

# System Prompt Architecture

How Thoth's system prompt is constructed, what each section does, and how dynamic content is injected.

## Overview

Thoth's system prompt is assembled by `buildThothPrompt()` in `prompt-builder.ts`. The prompt is modular: static sections define identity and behavior, while dynamic sections are injected based on:

- **Skills discovered** at session start (triggers)
- **Boot sequence files** from AGENTS.md
- **Specialization depth** (currently unused, but infrastructure exists)

## Prompt Assembly Order

The prompt is built in this exact order:

| # | Section | Source | Purpose |
|---|---------|--------|---------|
| 1 | `<Identity>` | prompt-sections.ts | Core identity, relationship with Zeus, boundaries |
| 2 | `<Anti_Patterns>` | prompt-sections.ts | What NEVER to do (hallucination, sycophancy, etc.) |
| 3 | `<Behavioral_Guidance>` | prompt-sections.ts | What TO do in key situations |
| 4 | `<Knowledge_Management>` | prompt-sections.ts | Truth hierarchy, Smart Merge, Index-First patterns |
| 5 | `<Skill_Routing>` | prompt-builder.ts | **DYNAMIC**: Skill triggers discovered at boot |
| 6 | `<Core_Capabilities>` | prompt-builder.ts | When to delegate vs execute, agent types |
| 7 | `<Execution>` | prompt-builder.ts | 7-Section Format, evidence-based completion |
| 8 | `<Permission_System>` | prompt-builder.ts | What requires approval vs autonomous |
| 9 | `<Communication_Style>` | prompt-builder.ts | Voice, tone, what not to do |
| 10 | `<Boot_Context>` | prompt-builder.ts | **DYNAMIC**: Pre-loaded files from boot_sequence |
| 11 | `<Closing>` | prompt-builder.ts | Mission statement |

## Section Details

### 1. Identity (`THOTH_CORE_IDENTITY`)

**Location**: `prompt-sections.ts` lines 17-44

**Purpose**: Establishes who Thoth is and how it relates to Zeus.

**Key elements**:
- Named after Egyptian scribe-god (executor AND archivist)
- Proactive executive partner, not servant or friend
- Core function: Intent → understand → retrieve → propose → execute → verify → persist
- Boundary Principle: READ freely, WRITE with care
- Knowledge Grounding: Facts come from files, not memory
- NOT a coding assistant — strategic, not technical

### 2. Anti-Patterns (`THOTH_ANTI_PATTERNS`)

**Location**: `prompt-sections.ts` lines 50-79

**Purpose**: Hard constraints on behavior. These are "never do" rules.

**Patterns blocked**:
- **Hallucination**: No facts without file citation
- **Sycophancy**: No "Great question!" empty affirmations
- **Flooding**: Short responses when possible
- **Nagging**: Don't repeat reminders
- **Passivity**: Surface important things proactively
- **Blind Acceptance**: Be critical of proposals
- **Overreach**: Stop before external actions
- **Lazy Reading**: Actually read files, don't skim
- **Status Updates**: No "I'm going to..." announcements

### 3. Behavioral Guidance (`THOTH_BEHAVIORAL_GUIDANCE`)

**Location**: `prompt-sections.ts` lines 85-99

**Purpose**: Positive behaviors in specific situations.

**Situations covered**:
- When Zeus proposes something → Be critical, find flaws
- When Zeus resists your suggestion → Ask why once, then defer
- When Zeus stated something mattered → Remember it, surface drift
- When a commitment is made → Track it, surface before it slips

### 4. Knowledge Management (`THOTH_KNOWLEDGE_MANAGEMENT`)

**Location**: `prompt-sections.ts` lines 105-239

**Purpose**: The comprehensive guide to handling information.

**Subsections**:
- **Truth Hierarchy**: What sources to trust and in what order
- **Source Attribution**: Every fact needs provenance
- **Smart Merge Protocol**: How to update files without creating contradictions
- **Before Creating Files**: Deduplication check
- **Index-First Writing**: Always update _index.md when creating/updating files
- **When to Persist**: Triggers for knowledge persistence
- **Bidirectional Linking**: If A refs B, B should ref A
- **Status Propagation**: Update file → update index → update dashboards
- **Index-First Retrieval**: How to look up information
- **Hallucination Check**: Verify before stating facts

### 5. Skill Routing (`buildSkillRoutingSection()`) — DYNAMIC

**Location**: `prompt-builder.ts` lines 99-140

**Purpose**: Inject skill triggers discovered at session start.

**How it works**:
1. Scan `.opencode/skill/` in project and user directories
2. Parse YAML frontmatter from each `SKILL.md`
3. Extract `name` and `triggers` fields
4. Build a routing table: `"trigger phrase" → skill({ skill: "name" })`

**Example output**:
```
<Skill_Routing>
## Skill Routing (CHECK BEFORE RESPONDING)

Before responding to user requests, check if their intent matches a skill trigger:

- "Run morning boot", "Start my day" → `skill({ skill: "morning-boot" })`
- "Process this meeting", "Drill meeting notes" → `skill({ skill: "post-meeting-drill" })`

**Rule**: If user intent matches a trigger, invoke the skill immediately.
</Skill_Routing>
```

**Only included if**: At least one skill has triggers defined.

### 6. Core Capabilities (`THOTH_CORE_CAPABILITIES`)

**Location**: `prompt-builder.ts` lines 149-179

**Purpose**: When to delegate vs execute directly.

**Delegation matrix**:
| Situation | Action |
|-----------|--------|
| Simple lookup | Execute directly |
| Knowledge update | Execute directly |
| Parallel research | Fire background agents |
| Complex workflow | Invoke a skill |
| Deep domain work | Delegate to sub-agent |

### 7. Execution (`THOTH_EXECUTION`)

**Location**: `prompt-builder.ts` lines 188-218

**Purpose**: How to actually do things.

**Key elements**:
- Direct Execution steps (retrieve → act → persist → respond)
- 7-Section Format for delegation
- Evidence-Based Completion table (from Sisyphus)

### 8. Permission System (`THOTH_PERMISSIONS`)

**Location**: `prompt-builder.ts` lines 223-258

**Purpose**: What requires approval vs what's autonomous.

**Requires approval** (HARD STOP):
- Sending emails/messages
- Financial transactions
- Deleting files
- Modifying shared files
- Modifying system prompts
- Sharing externally
- Pushing to remote repos

**Autonomous**:
- Reading any files
- Creating/updating Zeus-owned knowledge files
- Internal analysis
- Firing background agents
- Running diagnostics

### 9. Communication Style (`THOTH_COMMUNICATION`)

**Location**: `prompt-builder.ts` lines 260-272

**Purpose**: Voice and tone guidance.

**Key points**:
- Warm but professional
- Clear and direct
- Reference what you know about Zeus
- Push back when something seems off
- Don't over-explain, hedge, or forget context

### 10. Boot Context — DYNAMIC

**Location**: `prompt-builder.ts` lines 378-436

**Purpose**: Pre-load files specified in AGENTS.md boot_sequence.

**How it works**:
1. Read `boot_sequence` array from AGENTS.md frontmatter
2. Resolve paths (relative to knowledge base or cwd)
3. Read each file's content
4. Inject as `<Boot_Context>` section before `<Closing>`

**Example output**:
```
<Boot_Context>
## Boot Context (Pre-Loaded)

**Loaded:** ✓ registry.md, ✓ digital-identity.md
**Not found:** missing-file.md

---

### registry.md

[file content]

---

### digital-identity.md

[file content]
</Boot_Context>
```

### 11. Closing (`THOTH_CLOSING`)

**Location**: `prompt-builder.ts` lines 274-289

**Purpose**: Mission statement and closing framing.

**Key message**: "You are the operating system of a life. Act accordingly."

## Dynamic Injection Points

### Skill Routing Injection

**Entry point**: `buildThothPrompt()` line 320

**Flow**:
```
buildThothPrompt()
  └─ buildSkillRoutingSection()
       ├─ discoverTriggersFromDir(project/.opencode/skill/)
       ├─ discoverTriggersFromDir(user/.opencode/skill/)
       └─ Merge (project wins duplicates)
           └─ Build routing table string
```

**Trigger discovery** (`parseSkillTriggers()`):
- Parses YAML frontmatter from SKILL.md
- Looks for `name:` and `triggers:` fields
- Returns `{ name, triggers[] }` or null

### Boot Content Injection

**Entry point**: `buildThothPromptWithBoot()` lines 441-473

**Flow**:
```
buildThothPromptWithBoot(spec, cwd, knowledgeBasePath)
  ├─ buildThothPrompt(spec)  → base prompt
  └─ readBootContent(spec, cwd, knowledgeBasePath)
       ├─ resolveBootPaths(bootSequence, cwd, kb)
       └─ Read each file, build <Boot_Context>
           └─ Insert before <Closing>
```

## Specialization System (Dormant)

The codebase has infrastructure for depth-based specialization that's currently not active:

### Hemisphere Voices (`HEMISPHERE_VOICE`)

**Location**: `prompt-sections.ts` lines 245-352

Defines voice modifiers for each domain:
- **work**: Executive Chief of Staff voice
- **life**: Personal Consultant voice  
- **coding**: Technical Architect voice
- **kernel**: AI Research Engineer voice

### Category Expertise (`CATEGORY_EXPERTISE`)

**Location**: `prompt-sections.ts` lines 358-491

Expertise sections for specific categories:
- `work/projects`: Project Portfolio Mode
- `work/stakeholders`: Stakeholder Management Mode
- `life/finances`: Financial Advisor Mode
- `life/health`: Health Coach Mode
- `life/relationships`: Relationship Guide Mode
- `coding/projects`: Technical Projects Mode

### Deep Expertise (`DEEP_EXPERTISE`)

**Location**: `prompt-sections.ts` lines 497-522

Voice refinement for depth 3 (entity-level).

### Why Dormant?

The jacket/specialization system was deprioritized. Current approach:
- AGENTS.md files provide context at session start
- Voice comes from the human prompt instructions, not system prompt injection
- See backlog: "Rethink jacket/specialization system"

## How AGENTS.md Supplements the Prompt

AGENTS.md files are NOT injected into the system prompt. They work differently:

1. **Boot sequence**: Files listed in `boot_sequence` frontmatter are loaded into `<Boot_Context>`
2. **Session context**: OpenCode reads AGENTS.md and uses it to understand directory context
3. **Instructions**: The prose in AGENTS.md may be shown to the model by OpenCode

### AGENTS.md Frontmatter

```yaml
---
hemisphere: work
depth: 1
boot_sequence:
  - registry.md
  - digital-identity.md
---
```

- `hemisphere`: Domain routing hint
- `depth`: Specialization level (0-3)
- `boot_sequence`: Files to pre-load into context

## Source Files Reference

| File | Purpose |
|------|---------|
| `src/specialization/prompt-builder.ts` | Main assembly logic, skill routing, boot content |
| `src/specialization/prompt-sections.ts` | Static prompt sections, voice modifiers, expertise |
| `src/specialization/types.ts` | Type definitions (Specialization, Domain, etc.) |
| `src/specialization/boot-sequences.ts` | Boot path resolution logic |
| `src/tools/skill/types.ts` | Skill schema including triggers field |
| `src/tools/skill/tools.ts` | Skill discovery and invocation |

## Design Principles

1. **Behavior-first**: Prompt defines HOW to behave, not WHAT to know
2. **Dynamic discovery**: Skills and boot content discovered at runtime
3. **Additive depth**: Each depth level adds to previous (when enabled)
4. **File-grounded**: Everything should trace back to a file source

## Related Documents

- [[skill-system.md]] — How skills work, trigger syntax
- [[plugin-architecture.md]] — Overall plugin structure
- [[vision.md]] — Design philosophy

---

*Last updated: 2026-01-08*
