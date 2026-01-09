---
type: document
hemisphere: kernel
created: 2026-01-06
updated: 2026-01-08
tags: [architecture, plugin, design]
summary: "Thoth Plugin Architecture - high-level design and components"
---

# Thoth Plugin Architecture

## The Unified Life Orchestrator

---

**Version**: 1.1.0  
**Created**: 2025-01-05  
**Updated**: 2026-01-08
**Status**: Implemented (v1.1.1 published to npm)

> **See also**: [[system-prompt-architecture.md]] for detailed system prompt assembly documentation.

---

## Table of Contents

1. [Vision](#vision)
2. [Architecture Overview](#architecture-overview)
3. [Integration Sources](#integration-sources)
4. [Agent Architecture](#agent-architecture)
5. [Hook System](#hook-system)
6. [Skill System](#skill-system)
7. [Knowledge Base Structure](#knowledge-base-structure)
8. [Permission & Trust System](#permission--trust-system)
9. [Config System](#config-system)
10. [Implementation Plan](#implementation-plan)

---

## Vision

Thoth is a **unified life orchestrator** that combines:

- **Thoth's Soul**: Chief of Staff relationship, permission system, trust-building arc
- **Sisyphus's Hands**: Multi-agent parallelism, enforcement hooks, evidence-based completion
- **ExOS's Heart**: Rhythmic workflows, context aperture, temporal awareness

The result: An AI that knows you deeply, works with senior-engineer quality, and respects your daily rhythms.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              THOTH PLUGIN                                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         AGENT LAYER                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │ │
│  │  │  THOTH   │  │  WORK    │  │  LIFE    │  │  CODE    │               │ │
│  │  │ (Primary)│  │  MASTER  │  │  MASTER  │  │  MASTER  │               │ │
│  │  │ Opus 4.5 │  │ Sonnet   │  │ Sonnet   │  │ Sonnet   │               │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         HOOK LAYER                                      │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ Permission      │  │ Trust Level     │  │ Context         │        │ │
│  │  │ Enforcer        │  │ Tracker         │  │ Aperture        │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │ │
│  │  │ Todo            │  │ Temporal        │  │ Knowledge       │        │ │
│  │  │ Continuation    │  │ Awareness       │  │ Persistence     │        │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         SKILL LAYER                                     │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │ Morning     │  │ Evening     │  │ Thought     │  │ Post-Meeting│   │ │
│  │  │ Boot        │  │ Close       │  │ Router      │  │ Drill       │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      KNOWLEDGE BASE (thoth/)                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │ │
│  │  │ kernel/  │  │ work/    │  │ life/    │  │ coding/  │               │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Sources

### From Sisyphus (oh-my-opencode)

| Component | Integration Method |
|-----------|-------------------|
| Todo Continuation Enforcer | Import and reuse |
| Background Agent Manager | Import and reuse |
| Comment Checker | Import and reuse |
| Preemptive Compaction | Import and reuse |
| Session Recovery | Import and reuse |
| Evidence-based completion | Built into agent prompts |
| 7-section delegation format | Built into agent prompts |
| Failure recovery protocol | Built into agent prompts |

### From Personal-OS (ExOS)

| Component | Integration Method |
|-----------|-------------------|
| Morning Boot workflow | Skill implementation |
| Evening Close workflow | Skill implementation |
| Thought Router | Skill implementation |
| Post-Meeting Drill | Skill implementation |
| Context Aperture (Circle 1-2-3) | Hook + agent prompts |
| Temporal Awareness (Chronos) | Built into agent prompts |
| Smart Merge protocol | Built into agent prompts |
| Standardized output markers | Built into skill prompts |

### From Thoth (existing)

| Component | Integration Method |
|-----------|-------------------|
| Chief of Staff identity | Core agent prompt |
| Permission system | Hook enforcement |
| Trust-building arc | Hook + state file |
| Onboarding philosophy | Built into agent prompts |
| Self-refinement | Built into agent prompts |
| Cross-hemisphere synthesis | Built into agent prompts |
| Knowledge base structure | thoth/ directory |

---

## Agent Architecture

### Thoth (Primary Agent)

**Model**: Claude Opus 4.5 (with extended thinking)  
**Role**: Root orchestrator, intent classification, cross-hemisphere synthesis

**Key Behaviors**:
1. Intent Gate (Phase 0) - Classify every request
2. Context Retrieval (Phase 1) - Lazy loading with circles
3. Execution (Phase 2) - Direct, delegate, or parallel
4. Persistence (Phase 3) - Smart merge to knowledge base

**Prompt Structure** (see [[system-prompt-architecture.md]] for full details):

| Section | Purpose |
|---------|---------|
| `<Identity>` | Chief of Staff relationship, core function |
| `<Anti_Patterns>` | What NEVER to do (hallucination, sycophancy, etc.) |
| `<Behavioral_Guidance>` | What TO do in key situations |
| `<Knowledge_Management>` | Truth hierarchy, Smart Merge, Index-First patterns |
| `<Skill_Routing>` | **DYNAMIC** — skill triggers discovered at boot |
| `<Core_Capabilities>` | When to delegate vs execute |
| `<Execution>` | 7-Section Format, evidence-based completion |
| `<Permission_System>` | What requires approval |
| `<Communication_Style>` | Voice and tone |
| `<Boot_Context>` | **DYNAMIC** — pre-loaded files from AGENTS.md |
| `<Closing>` | Mission statement |

### Work Master (Subagent)

**Model**: Claude Sonnet 4.5  
**Role**: Professional life orchestrator

**Key Behaviors**:
- Stakeholder intelligence
- Project tracking
- Communication assistance
- Time and priority management
- Career development support

### Life Master (Subagent)

**Model**: Claude Sonnet 4.5  
**Role**: Personal life orchestrator

**Key Behaviors**:
- Relationship intelligence
- Health & wellbeing awareness
- Life administration
- Personal growth support
- Emotional support (with boundaries)

### Code Master (Subagent)

**Model**: Claude Sonnet 4.5  
**Role**: Technical projects orchestrator (inherits Sisyphus methodology)

**Key Behaviors**:
- Production-quality code
- Evidence-based completion
- Systematic debugging
- Technical decision documentation
- Architecture awareness

---

## Hook System

### Permission Enforcer Hook

**Trigger**: `tool.execute.before`  
**Purpose**: Block actions requiring approval without explicit permission

```typescript
// Pseudo-implementation
const APPROVAL_REQUIRED_ACTIONS = [
  { tool: "google-workspace_send_gmail_message", reason: "Outbound communication" },
  { tool: "slack_conversations_add_message", reason: "Outbound communication" },
  { tool: "write", pattern: /shared|external/, reason: "Modifying shared files" },
  { tool: "bash", pattern: /rm -rf|delete/, reason: "Destructive action" },
];

function checkPermission(tool: string, args: unknown): PermissionResult {
  // Check if action requires approval
  // Check trust level for expanded permissions
  // Return { allowed: boolean, reason?: string }
}
```

### Trust Level Tracker Hook

**Trigger**: `event` (session.created, tool.execute.after)  
**Purpose**: Track trust level and update based on behavior

**Trust Levels**:
| Level | Name | Autonomous Actions |
|-------|------|-------------------|
| 1 | New | Read only, all writes require approval |
| 2 | Established | Code edits with evidence, knowledge updates |
| 3 | Trusted | Routine communications, calendar changes |

**Trust Earning**:
- Successful task completions
- Accurate predictions
- No permission violations
- User grants expanded permissions

### Context Aperture Hook

**Trigger**: `tool.execute.after` (for read operations)  
**Purpose**: Enforce lazy loading and warn on context pollution

**Circles**:
1. **Circle 1 (Map)**: registry.md, dashboard.md, chronicle.md - ALWAYS allowed
2. **Circle 2 (Territory)**: Specific entity files - IF intent targets them
3. **Circle 3 (Deep Dive)**: grep/glob - ONLY if Circle 1-2 fail

### Temporal Awareness Hook

**Trigger**: `event` (session.created)  
**Purpose**: Inject temporal context into session

**Injected Context**:
```markdown
<temporal_context>
  Date: 2025-01-05 (Sunday)
  Time: 00:51 (Late Night - Restoration Mode)
  Week: 1 of 52
  Quarter: Q1
  Day Mode: Weekend Sanctuary
  Biological Mode: Restoration (block work unless Emergency P0)
</temporal_context>
```

### Knowledge Persistence Hook

**Trigger**: `event` (session.ended, tool.execute.after for write)  
**Purpose**: Ensure Smart Merge protocol is followed

**Validations**:
- Deduplication check before writes
- Audit trail (Progress Log) updated
- Status propagation to dashboards
- Bidirectional linking maintained

---

## Skill System

Skills are invokable workflows triggered by commands.

### Morning Boot Skill

**Trigger**: "Run morning boot", "Start my day"

**Protocol**:
```
1. INITIALIZE
   - Load temporal context (day mode, week, quarter)
   - Read chronicle.md for previous state
   - Read dashboard.md for priorities
   - Load yesterday's overflow

2. PARALLEL SCANS (3 simultaneous background_task)
   - Email Scan → mail-triage output
   - Calendar Scan → cal-grid output
   - Slack Scan → slack-pulse output

3. SYNTHESIS
   - Create folder `work/operations/daily-log/YYYY-MM-DD/`
   - Save individual scan outputs:
     - `cal-grid.md` - Calendar scan results
     - `mail-triage.md` - Email scan results  
     - `slack-pulse.md` - Slack scan results
   - Parse SCAN_DATA_START blocks from each
   - Merge with overflow and local tasks
   - Apply Executive Filter (Top 3 priorities)
   - Generate synthesized `daily-log.md`

4. FINALIZE
   - Save `daily-log.md` to `work/operations/daily-log/YYYY-MM-DD/`
   - Present summary to user
   - Suggest Complexity Budget
```

### Evening Close Skill

**Trigger**: "End of day", "Close out"

**Protocol**:
```
1. AUDIT
   - Read daily-log.md
   - Compare priorities vs action log
   - Identify incomplete items

2. SUMMARIZE
   - Generate executive recap
   - Key wins, blockers, decisions
   - Update Evening Summary section

3. EXTRACT OVERFLOW
   - Collect incomplete P0/P1 items
   - Create overflow-tomorrow.md

4. PERSIST (Smart Merge)
   - Team observations → team/[person].md
   - Decisions → project files
   - Chronicle update (1 sentence)

5. WEEKLY (Friday only)
   - Trigger gardener skill
   - Append health report
```

### Thought Router Skill

**Trigger**: "Dump: [idea]", "Quick thought: [idea]"

**Protocol**:
```
1. PARSE
   - Extract the thought content
   - Identify keywords and entities

2. CLASSIFY
   - Work-related → work/inbox/
   - Life-related → life/inbox/
   - Code-related → coding/inbox/
   - Ambiguous → kernel/inbox/

3. ROUTE
   - Create or append to appropriate file
   - Add timestamp and context
   - Link to related entities if identified

4. CONFIRM
   - Brief confirmation to user
   - Suggest follow-up if needed
```

### Post-Meeting Drill Skill

**Trigger**: Meeting notes detected, "Drill meeting notes"

**Protocol**:
```
1. INGEST
   - Fetch notes from source (Drive, email attachment)
   - Parse full content

2. ANALYZE (use Oracle for high-fidelity)
   - Extract Agreements
   - Extract Decisions
   - Extract Action Items
   - Assess Sentiment

3. PERSIST (Smart Merge)
   - Update project files with decisions
   - Update team files with observations
   - Log action items to tasks

4. RECAP
   - Generate recap email draft
   - Present for approval
```

---

## Knowledge Base Structure

```
thoth/
├── kernel/
│   ├── THOTH.md                    # Main Thoth system prompt
│   ├── registry.md                 # System index
│   ├── config/
│   │   ├── permissions.md          # Permission rules
│   │   ├── integrations.md         # Connected services
│   │   └── preferences.md          # User preferences
│   ├── state/
│   │   ├── trust.md                # Trust level state
│   │   ├── active-threads.md       # Current tasks/conversations
│   │   └── session-memory.md       # Cross-session memory
│   ├── memory/
│   │   ├── decisions.md            # Decision log
│   │   ├── learnings.md            # What Thoth learned
│   │   └── patterns.md             # Observed patterns
│   ├── templates/
│   │   ├── person.md
│   │   ├── project.md
│   │   ├── decision.md
│   │   ├── knowledge.md
│   │   └── daily-log.md
│   └── logs/
│       └── [date]-actions.md
│
├── work/
│   ├── MASTER.md                   # Work Master prompt
│   ├── registry.md                 # Work index
│   ├── identity/
│   │   ├── role.md
│   │   ├── goals.md
│   │   └── style.md
│   ├── people/
│   │   ├── _index.md
│   │   └── [name].md
│   ├── projects/
│   │   ├── _index.md
│   │   ├── dashboard.md
│   │   └── [project]/
│   ├── operations/
│   │   ├── chronicle.md
│   │   └── daily-log/
│   │       ├── TEMPLATE-daily-log.md
│   │       └── [YYYY-MM-DD]/
│   │           ├── daily-log.md
│   │           ├── cal-grid.md
│   │           ├── mail-triage.md
│   │           └── slack-pulse.md
│   └── inbox/
│       └── tasks/
│
├── life/
│   ├── MASTER.md                   # Life Master prompt
│   ├── registry.md                 # Life index
│   ├── identity/
│   │   ├── core.md
│   │   ├── goals.md
│   │   └── preferences.md
│   ├── people/
│   │   ├── _index.md
│   │   ├── family/
│   │   └── friends/
│   ├── health/
│   │   ├── physical.md
│   │   ├── mental.md
│   │   └── habits.md
│   ├── finance/
│   ├── home/
│   └── inbox/
│
└── coding/
    ├── MASTER.md                   # Code Master prompt
    ├── registry.md                 # Coding index
    ├── projects/
    │   ├── _index.md
    │   └── [project]/
    │       ├── overview.md
    │       ├── architecture.md
    │       └── decisions.md
    ├── knowledge/
    │   ├── patterns.md
    │   ├── tools.md
    │   └── learnings.md
    └── inbox/
```

---

## Permission & Trust System

### Permission Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION MATRIX                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ ALWAYS AUTONOMOUS (Trust Level 1+)                                           │
│ • Read any file in knowledge base                                            │
│ • Search/grep/glob                                                           │
│ • Fire background agents                                                     │
│ • Create/update Zeus-owned knowledge files                                   │
│ • Run LSP diagnostics                                                        │
│ • Analyze and think                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ AUTONOMOUS AT TRUST LEVEL 2+                                                 │
│ • Modify code files (with evidence)                                          │
│ • Run builds/tests                                                           │
│ • Create git commits (with message approval)                                 │
│ • Update project documentation                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ AUTONOMOUS AT TRUST LEVEL 3+                                                 │
│ • Send routine emails (templates, follow-ups)                                │
│ • Modify calendar (non-external attendees)                                   │
│ • Post to internal Slack channels                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│ ALWAYS REQUIRES APPROVAL (Any Trust Level)                                   │
│ • Send external communications (new threads)                                 │
│ • Financial transactions                                                     │
│ • Delete files                                                               │
│ • Modify shared files (Google Drive, etc.)                                   │
│ • Push to remote repositories                                                │
│ • Modify system prompts                                                      │
│ • Share information externally                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Trust State File

Location: `thoth/kernel/state/trust.md`

```markdown
---
type: state
hemisphere: kernel
created: 2025-01-05
updated: 2025-01-05
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
| 2025-01-05 | 1     | Init   | System initialized             |

## Temporary Overrides

| Scope                  | Permission      | Granted    | Expires    |
|------------------------|-----------------|------------|------------|
| (none)                 |                 |            |            |

## Trust Earning Criteria

- [ ] 10 successful task completions without errors
- [ ] 5 accurate predictions confirmed by user
- [ ] 0 permission violations in last 7 days
- [ ] User explicitly grants expanded permissions
```

---

## Config System

### Plugin Config Schema

```typescript
interface ThothPluginConfig {
  // Enable/disable Thoth as primary agent
  enabled: boolean;
  
  // Path to knowledge base (default: ./thoth or ~/thoth)
  knowledge_base: string;
  
  // Agent model overrides
  agents?: {
    thoth?: { model?: string; thinking?: boolean };
    "work-master"?: { model?: string };
    "life-master"?: { model?: string };
    "code-master"?: { model?: string };
  };
  
  // Hook configuration
  hooks?: {
    "permission-enforcer"?: boolean;
    "trust-level-tracker"?: boolean;
    "context-aperture"?: boolean;
    "temporal-awareness"?: boolean;
    "knowledge-persistence"?: boolean;
  };
  
  // Skill configuration
  skills?: {
    "morning-boot"?: boolean;
    "evening-close"?: boolean;
    "thought-router"?: boolean;
    "post-meeting-drill"?: boolean;
  };
  
  // Integration configuration
  integrations?: {
    google_workspace?: boolean;
    slack?: boolean;
    jira?: boolean;
    drive_sync?: boolean;
  };
}
```

### Sisyphus/Thoth Switching

In `~/.config/opencode/opencode.json`:

```json
{
  "plugins": {
    "oh-my-opencode": {
      "sisyphus_agent": {
        "disabled": true
      }
    },
    "thoth-plugin": {
      "enabled": true,
      "knowledge_base": "~/thoth"
    }
  }
}
```

Or with environment variable:
```bash
export OPENCODE_PRIMARY_AGENT=thoth  # or sisyphus
```

---

## Implementation Plan

### Phase 1: Plugin Scaffold (Day 1)

1. Create `thoth-plugin/` directory structure
2. Set up package.json, tsconfig.json
3. Create plugin entry point (src/index.ts)
4. Define config schema (src/config/schema.ts)

### Phase 2: Core Agents (Day 1-2)

1. Implement Thoth agent with unified prompt
2. Implement Work Master agent
3. Implement Life Master agent
4. Implement Code Master agent (inherit Sisyphus methodology)

### Phase 3: Hook System (Day 2)

1. Implement permission-enforcer hook
2. Implement trust-level-tracker hook
3. Implement context-aperture hook
4. Implement temporal-awareness hook
5. Import and wire Sisyphus hooks (todo-continuation, etc.)

### Phase 4: Skill System (Day 2-3)

1. Implement morning-boot skill
2. Implement evening-close skill
3. Implement thought-router skill
4. Implement post-meeting-drill skill

### Phase 5: Knowledge Base (Day 3)

1. Update thoth/ structure with new files
2. Create templates
3. Add state files (trust.md, etc.)
4. Create initial registry files

### Phase 6: Integration & Testing (Day 3-4)

1. Wire up MCP servers (Google Workspace, Slack, Jira)
2. Test Sisyphus/Thoth switching
3. Test rhythmic workflows
4. Verify enforcement hooks work

---

## Success Criteria

1. **Thoth works as primary agent** - User can switch from Sisyphus to Thoth
2. **Morning boot completes in <2 minutes** - Parallel scans work
3. **Permission system enforces** - Blocked actions show approval request
4. **Trust level persists** - Survives across sessions
5. **Context aperture works** - No context pollution warnings
6. **Evening close persists knowledge** - Smart merge updates files
7. **Code Master matches Sisyphus quality** - Evidence-based completion

---

---

## Related Documents

- [[system-prompt-architecture.md]] — How the system prompt is assembled
- [[skill-system.md]] — How skills work and trigger syntax
- [[vision.md]] — Original THOTH vision

---

*Architecture document for Thoth Plugin v1.1.0*
