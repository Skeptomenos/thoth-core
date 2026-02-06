---
type: architecture
created: 2026-01-10
updated: 2026-01-10
summary: Defines the skill architecture pattern used in Thoth — skills as modular context units with templates and nesting.
---

# Skill Architecture

This document defines the architectural pattern for skills in Thoth. **Read this before modifying any skill.**

---

## Core Concept: Skills as Modular Context Units

A skill is NOT just "code that does something." A skill is a **self-contained unit** that serves three functions:

| Function             | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| **Context Template** | Tells an agent HOW to do something (workflow logic)  |
| **Output Template**  | Defines WHAT the output looks like (consistent format) |
| **Orchestration**    | Coordinates WHO does what (parallel execution)       |

---

## Skill Folder Structure

```
skill-name/
├── SKILL.md              # Workflow logic (required)
├── skill-name-template.md   # Output template (optional)
└── skill-name.prose      # OpenProse orchestration (optional)
```

### SKILL.md (Required)

The main skill file. Contains:
- **Frontmatter**: Metadata including `template` reference
- **Workflow phases**: Step-by-step execution instructions
- **Context discovery**: How to get required context
- **Output specification**: What to produce (references template)

### Template Files (Optional)

Define the output format with placeholders:
- `{{PLACEHOLDER}}` syntax for variable substitution
- Frontmatter for file metadata
- `SCAN_DATA_START` / `SCAN_DATA_END` markers for parseable sections

### OpenProse Files (Optional)

For skills that orchestrate parallel execution:
- Define agents with prompts
- Coordinate parallel sessions
- Pass context between agents

---

## Frontmatter Specification

Every SKILL.md must have frontmatter:

```yaml
---
name: skill-name                    # Required: Skill identifier
description: What this skill does   # Required: One-line description
triggers:                           # Optional: Trigger phrases
  - "trigger phrase one"
  - "trigger phrase two"
template: skill-name-template.md    # Optional: Output template file
config:                             # Optional: Config files to load
  - path: work/operations/slack-map.md
    as: slack_config
created: YYYY-MM-DD                 # Required: Creation date
updated: YYYY-MM-DD                 # Required: Last update date
---
```

### Template Reference

When `template` is specified:
1. Agent reads the template file from the skill folder
2. Agent fills placeholders with computed values
3. Agent writes output to the specified location

This ensures consistent output format regardless of which agent executes the skill.

---

## Skills as Context Templates for Subagents

A key architectural insight: **skills shape how subagents work**.

When a subagent invokes a skill:
1. The skill's SKILL.md becomes the subagent's context
2. The subagent follows the workflow defined in SKILL.md
3. The subagent uses the template for consistent output
4. Results flow back to the orchestrating agent

This means skills are **composable**:
- Invoked directly by user (`/mail-triage`)
- Invoked by another skill as subagent context
- Invoked by OpenProse as part of parallel orchestration

---

## Nesting Pattern

Skills can invoke other skills for context discovery:

```
morning-boot (orchestrator)
├── context-discovery (nested skill for identity)
├── mail-triage (subagent context template)
│   └── context-discovery (nested, or uses passed context)
├── cal-grid (subagent context template)
│   └── context-discovery (nested, or uses passed context)
└── slack-pulse (subagent context template)
    ├── context-discovery (nested, or uses passed context)
    └── slack-map.md (config file)
```

### Context Flow

1. **Orchestrator discovers context first** (optional optimization)
2. **Passes context to subagents** via OpenProse `context:` property
3. **Subagents check for passed context** before discovering their own
4. **If not passed, subagents discover independently**

This is specified in each skill's "Context Requirements" section:

```markdown
## Context Requirements

**Step 0 — Get Identity:**

1. **Check if passed in context**: If you received `context.identity.email`, use it directly.
2. **If not passed, invoke context-discovery skill**: Call `skill({ name: "context-discovery" })`.
```

---

## Template Placeholder Syntax

Templates use `{{PLACEHOLDER}}` syntax:

```markdown
# Report — {{DATE}}

**Generated:** {{TIME}}

## Summary

{{EXECUTIVE_SUMMARY}}

## Data

| Column A | Column B |
|----------|----------|
{{DATA_TABLE}}
```

### Placeholder Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `{{UPPER_SNAKE}}` | Simple value substitution | `{{DATE}}`, `{{TIME}}` |
| `{{*_TABLE}}` | Multi-row table content | `{{ACTION_ITEMS_TABLE}}` |
| `{{*_COUNT}}` | Numeric count | `{{EMAIL_COUNT}}` |
| `{{#if CONDITION}}...{{/if}}` | Conditional sections | `{{#if MEETING_NOTES_COUNT > 0}}` |

---

## Why This Architecture?

### 1. Modularity

Each skill folder is self-contained. To change email scanning:
- Edit `mail-triage/SKILL.md` for workflow
- Edit `mail-triage/mail-triage-template.md` for output format

Nothing else needs to change.

### 2. No Duplication

- Workflow logic lives in ONE place (SKILL.md)
- Output format lives in ONE place (template)
- Config lives in ONE place (config files)

### 3. Consistent Quality

Templates enforce output structure. Same workflow → same output format → predictable quality.

### 4. Context Isolation

Subagents get their own context window. Heavy scanning (reading 50 emails) doesn't pollute the main session. Only synthesized results flow back up.

### 5. Composability

Skills can be:
- Standalone commands (`/mail-triage`)
- Subagent context templates (invoked by `morning-boot`)
- Nested for context discovery (context-discovery inside slack-pulse)

---

## Modification Guidelines

### Before Changing a Skill

1. **Read this document** — Understand the architecture
2. **Read the skill's SKILL.md** — Understand its current workflow
3. **Check for dependents** — What other skills invoke this one?
4. **Check the template** — Will your changes break the output format?

### Adding a New Skill

1. Create folder: `defaults/skill/skill-name/`
2. Create `SKILL.md` with proper frontmatter
3. Create template file if skill produces output
4. Create `.prose` file if skill orchestrates parallel work
5. Test standalone AND as subagent context

### Changing a Template

1. Check what fills the placeholders (in SKILL.md)
2. Ensure new placeholders are filled by the workflow
3. Test that output still has required markers (e.g., `SCAN_DATA_START`)

### Changing Orchestration (.prose)

1. Understand which skills are invoked
2. Verify context passing is correct
3. Test that results flow back properly
4. Ensure main session does final synthesis (not a subagent)

---

## Anti-Patterns

| Don't | Why | Instead |
|-------|-----|---------|
| Duplicate workflow logic | Creates drift, maintenance burden | Single source in SKILL.md |
| Hardcode output format in SKILL.md | Can't customize without changing logic | Use template file |
| Synthesize in subagent | Subagent lacks main session context | Return to orchestrator for synthesis |
| Skip context discovery check | Breaks standalone invocation | Always check for passed context first |
| Inline templates in .prose agents | Duplicates template, harder to maintain | Reference skill which has template |

---

## Example: Morning Boot Flow

```
User: "Start my day"

Main Session (Thoth)
│
├─▶ skill({ name: "morning-boot" })
│
└── SKILL.md loads, Thoth follows workflow:
    │
    ├── Phase 1: Context Discovery
    │   └── skill({ name: "context-discovery" }) → EMAIL, KB_ROOT
    │
    ├── Phase 2: Execute OpenProse
    │   └── morning-boot.prose
    │       └── parallel:
    │           ├── email_scanner
    │           │   └── skill({ name: "mail-triage" })
    │           │       └── Uses mail-triage-template.md
    │           ├── calendar_scanner
    │           │   └── skill({ name: "cal-grid" })
    │           │       └── Uses cal-grid-template.md
    │           └── slack_scanner
    │               └── skill({ name: "slack-pulse" })
    │                   └── Uses slack-pulse-template.md
    │
    ├── Phase 3: Synthesize (Thoth, with full context)
    │   └── Uses daily-log-template.md
    │   └── Cross-references dashboard, spillover, commitments
    │
    ├── Phase 4: Persist outputs
    │   └── Write to work/operations/daily-log/YYYY-MM-DD/
    │
    └── Phase 5: Present to user
```

---

## Context Discovery Pattern

Skills can invoke other skills for context. The most common pattern is delegating to `context-discovery` for user identity.

### The Pattern

```markdown
## Context Requirements (EXECUTE FIRST)

**Step 0 — Get Identity:**

1. **Check if passed in context**: If you received `context.identity.email`, use it directly.

2. **If not passed, invoke context-discovery skill**: Call `skill({ name: "context-discovery" })` and use the returned `email` value.

3. **Store as `EMAIL`** for use in all API calls below.

**If discovery fails**: Stop and report the error from context-discovery.
```

### Two Invocation Paths

| Path | Scenario | Context Source |
|------|----------|----------------|
| **Standalone** | User invokes skill directly | Skill calls `context-discovery` |
| **Orchestrated** | Skill invoked by morning-boot | Context passed via OpenProse `context:` |

This dual-path design means skills work both ways without modification.

### Common Context Skills

| Skill | Returns | Used By |
|-------|---------|---------|
| `context-discovery` | `{ email, kb_root, hemisphere, ready }` | mail-triage, email-draft, calendar skills |
| `context-onboarding` | Creates config files | Called when discovery fails |

---

## Skill Development Workflow

### Single Source of Truth

All skills are authored in `thoth-core/defaults/skill/`. This is the canonical location that gets bundled into the npm package.

```
thoth-core/defaults/skill/     ← EDIT HERE (source of truth)
         ↑
         │ symlinks
         │
thoth-kb/.opencode/skill/      ← TEST HERE (symlinks to source)
```

### Symlink Architecture

For local development, `thoth-kb/.opencode/skill/` contains symlinks to `thoth-core/defaults/skill/`:

```bash
# Example symlink
mail-triage -> ../../../thoth-core/defaults/skill/mail-triage
```

**Benefits:**
- Edit once in thoth-core, changes instantly visible in thoth-kb
- Test skills in thoth-kb with real data
- No manual sync between repositories
- `bun run build` bundles the source for npm publish

### Setting Up Symlinks

To create symlinks for a new skill:

```bash
cd thoth-kb/.opencode/skill
ln -s ../../../thoth-core/defaults/skill/my-new-skill my-new-skill
```

To convert an existing skill folder to a symlink:

```bash
cd thoth-kb/.opencode/skill
rm -rf my-skill
ln -s ../../../thoth-core/defaults/skill/my-skill my-skill
```

### Skill Registry Support

The skill registry (`src/services/skill-registry.ts`) discovers skills through symlinks. It checks both `isDirectory()` and `isSymbolicLink()` when scanning for skills.

```typescript
// Handles both directories and symlinks to directories
const isDir = entry.isDirectory() || entry.isSymbolicLink();
```

This ensures OpenCode discovers symlinked skills correctly.

---

## Related Documents

- `docs/guides/skill-authoring-guide.md` — How to write skills
- `docs/reference/FRONTMATTER-ENFORCER.md` — Frontmatter schema for skills
- `defaults/skill/open-prose/prose.md` — OpenProse VM specification
- `defaults/skill/context-discovery/SKILL.md` — Context discovery implementation
- `defaults/skill/context-onboarding/SKILL.md` — Onboarding when discovery fails

---

*Skill Architecture v1.0 | Skills as modular context units with templates and nesting*
