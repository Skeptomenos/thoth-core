---
type: guide
created: 2026-01-07
updated: 2026-01-10
tags: [skills, authoring, best-practices, tdd]
summary: Step-by-step guide for creating skills using TDD principles. For architecture and structure, see skill-architecture.md.
---

# Skill Authoring Guide

This guide covers **HOW to create skills** using Test-Driven Development principles.

> **Architecture Reference:** For skill structure, frontmatter schema, templates, and patterns, see `docs/concepts/skill-architecture.md`. Read it first.

---

## Core Philosophy

### Context is a Public Good

The context window is shared. Every token in your skill competes with:
- System prompt
- Conversation history
- Other skills' metadata
- The actual request

**Default assumption:** Claude is already smart. Only add context Claude doesn't already have.

### Skills are TDD for Processes

Writing skills IS Test-Driven Development applied to process documentation:

1. **RED:** Watch an agent fail without the skill
2. **GREEN:** Write minimal skill addressing the failure
3. **GREEN:** Watch the agent succeed with the skill
4. **REFACTOR:** Close loopholes, bulletproof

**Iron Law:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

---

## The Creation Process

### Phase 0: Setup

#### Step 1: Check if Skill Exists

```bash
ls -la .opencode/skill/ | grep -i "{skill-name}"
```

If exists: Read it first. You're editing, not creating.

#### Step 2: Classify Skill Type

| Type | Purpose | Template Needed? |
|------|---------|------------------|
| **Discipline** | Rules that resist rationalization | Rarely |
| **Workflow** | Multi-step process with checkpoints | Usually |
| **Technique** | Concrete method with steps | Sometimes |
| **Reference** | API docs, syntax guides | No |

#### Step 3: Research the Domain

- What tools/APIs are involved?
- What are common mistakes?
- What does success look like?
- Does this skill need external config? (→ use `config:` frontmatter)
- Does this skill produce structured output? (→ create template file)

---

### Phase 1: RED — Baseline Test (MANDATORY)

**You MUST dispatch a subagent to attempt the task WITHOUT the skill.**

#### Dispatch Baseline Subagent

```
task(
  subagent_type="general",
  description="Baseline test for {skill-name}",
  prompt="""
You are testing baseline behavior WITHOUT a skill.

**Task:** {Describe the task the skill will teach}

**Context:** {Relevant context}

**Instructions:** Complete the task using your best judgment. 
Do NOT load any skills. Just complete the task as you normally would.

**Report back:**
1. What approach did you take?
2. What formatting/tools/methods did you use?
3. Show the exact output you produced.
4. What assumptions did you make?
"""
)
```

#### Document the Failure

Before proceeding, write down:
- **What the agent did wrong** (or suboptimally)
- **What rationalizations were used** (verbatim if possible)
- **What the skill must teach** to prevent this

**GATE: Do not proceed to Phase 2 until you have documented at least one failure or suboptimal behavior.**

If the baseline agent does everything perfectly, you may not need this skill.

---

### Phase 2: GREEN — Write Minimal Skill

Address the specific failures documented in Phase 1.

#### Step 1: Create Skill Folder

```bash
mkdir -p defaults/skill/{skill-name}
```

#### Step 2: Create SKILL.md with Proper Frontmatter

See `docs/concepts/skill-architecture.md` for the complete frontmatter schema.

```yaml
---
name: skill-name
description: Use when [specific triggers]. Third person. No workflow summary.
triggers:
  - "trigger phrase one"
  - "another trigger phrase"
template: skill-name-template.md    # If skill produces structured output
config:                             # If skill needs external config
  - path: work/operations/config.md
    as: config_name
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->
```

#### Step 3: Write Required Sections

```markdown
# Skill Name

**Core principle:** {one sentence}

---

## Context Requirements (If Needed)

**Step 0 — Get Identity:**

1. **Check if passed in context**: If you received `context.identity.email`, use it directly.
2. **If not passed**: Call `skill({ name: "context-discovery" })`.

---

## When to Use

- {symptom or trigger}
- {symptom or trigger}

**Do NOT use when:**
- {exclusion}

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| {task} | {how} |

---

## Process / Pattern

{Main content here — address the failures from Phase 1}

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| {mistake from baseline} | {fix} |

---

## Red Flags - STOP

- {warning sign}
- {warning sign}

---

## Verification Checklist

- [ ] {check}
- [ ] {check}
```

#### Step 4: Create Template File (If Needed)

If your skill produces structured output, create `skill-name-template.md`:

```markdown
---
type: output-type
created: {{DATE}}
updated: {{DATE}}
tags: [skill-output]
summary: Description — {{DATE}}
---

# Output Title — {{DATE}}

## Section

{{PLACEHOLDER}}

## Data

| Column A | Column B |
|----------|----------|
{{DATA_TABLE}}
```

See `docs/concepts/skill-architecture.md` for placeholder conventions.

---

### Phase 3: GREEN — Verify With Skill (MANDATORY)

**You MUST dispatch a subagent to attempt the same task WITH the skill.**

#### Dispatch Skill-Guided Subagent

```
task(
  subagent_type="general",
  description="Skill-guided test for {skill-name}",
  prompt="""
You are testing a skill.

**REQUIRED SKILL — Read and follow this exactly:**

---
{Paste the full skill content here}
---

**Task:** {Same task as baseline}

**Context:** {Same context as baseline}

**Instructions:** Follow the skill above. Complete the task.

**Report back:**
1. What approach did you take?
2. Did you follow the skill completely?
3. Show the exact output you produced.
"""
)
```

#### Verify the Fix

Compare baseline vs skill-guided:
- Did the agent avoid the mistakes from Phase 1?
- Any NEW rationalizations that bypassed the skill?
- Any ambiguities in the skill that allowed violations?

**GATE: Do not proceed until the skill-guided agent performs correctly.**

If the agent still fails, revise the skill and re-test.

---

### Phase 4: REFACTOR — Quality Gate

#### Close Loopholes

For each new rationalization found in Phase 3:
1. Add explicit counter to Common Mistakes or Rationalization Table
2. Add to Red Flags section
3. Re-run Phase 3 if significant changes made

#### Format Checks

- [ ] Name: lowercase, hyphens only, no special chars
- [ ] Description: starts with "Use when...", no workflow summary
- [ ] Description: third person, under 500 chars
- [ ] Triggers: list of phrases that activate this skill
- [ ] Template: referenced if skill produces structured output
- [ ] Architecture comment at top of skill body
- [ ] Has "Core principle" statement
- [ ] Has "When to Use" section
- [ ] Has "Quick Reference" table
- [ ] Has "Common Mistakes" section
- [ ] Has "Red Flags" section
- [ ] Has "Verification Checklist"

#### Size Checks

```bash
wc -l defaults/skill/{name}/SKILL.md
```

- [ ] SKILL.md under 500 lines
- [ ] Frequently-loaded skills under 200 lines
- [ ] Heavy reference in separate files

#### Functional Checks

- [ ] Baseline subagent documented failure (Phase 1)
- [ ] Skill-guided subagent performed correctly (Phase 3)
- [ ] All referenced tools/commands exist
- [ ] No ambiguous instructions
- [ ] Template placeholders are all filled by workflow

---

## Bulletproofing Against Rationalization

Skills that enforce discipline need to resist rationalization.

### 1. Close Every Loophole Explicitly

```markdown
# BAD
Write code before test? Delete it.

# GOOD
Write code before test? Delete it. Start over.

**No exceptions:**
- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete
```

### 2. Add Spirit vs Letter Defense

```markdown
**Violating the letter of the rules is violating the spirit of the rules.**
```

### 3. Build Rationalization Table

```markdown
| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. Test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Just this once" | No exceptions. |
```

### 4. Create Red Flags List

```markdown
## Red Flags - STOP and Start Over

- Code before test
- "I already manually tested it"
- "This is different because..."
- Expressing satisfaction before verification

**All of these mean: Delete. Start over.**
```

---

## Verification Before Completion

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

**The Gate Function:**
1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code
4. VERIFY: Does output confirm the claim?
5. ONLY THEN: Make the claim

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test output: 0 failures | Previous run, "should pass" |
| Build succeeds | Build command: exit 0 | Linter passing |
| Bug fixed | Original symptom passes | Code changed, assumed fixed |

---

## Degrees of Freedom

Match specificity to task fragility:

| Freedom | When to Use | Example |
|---------|-------------|---------|
| **High** | Multiple approaches valid | "Analyze code, suggest improvements" |
| **Medium** | Preferred pattern exists | Template with parameters |
| **Low** | Operations fragile | "Run exactly this script. Do not modify." |

**Analogy:**
- **Narrow bridge with cliffs:** One safe path. Exact instructions. (database migrations)
- **Open field:** Many paths work. General direction. (code reviews)

---

## Progressive Disclosure

SKILL.md is a table of contents, not an encyclopedia.

### Key Rules

1. **Keep SKILL.md under 500 lines**
2. **One level deep references only** (no nested references)
3. **Table of contents for files >100 lines**
4. **Frequently-loaded skills: <200 lines**

### When to Create Separate Files

| Content | Threshold | File |
|---------|-----------|------|
| Output format | Any structured output | `skill-name-template.md` |
| Heavy reference | >100 lines | `reference.md` |
| Detailed examples | >50 lines | `examples.md` |
| Testing protocol | Discipline skills | `testing-protocol.md` |

---

## Anti-Patterns

| Anti-Pattern | Why Bad |
|--------------|---------|
| Description summarizes workflow | Claude follows description instead of reading skill |
| Missing `triggers:` | Skill won't be auto-invoked |
| Hardcoded user context | Breaks for other users; use context-discovery |
| Inline template in SKILL.md | Can't customize; use template file |
| Too many options | Confusing; provide defaults |
| Time-sensitive info | Will become wrong |
| Vague names | `helper`, `utils`, `tools` |
| Deeply nested references | Claude may partially read |

---

## Testing by Skill Type

| Skill Type | Testing Required | Method |
|------------|------------------|--------|
| **Discipline** | Mandatory | Subagent pressure test |
| **Workflow** | Mandatory | Full walkthrough + subagent |
| **Technique** | Recommended | Clarity check with fresh agent |
| **Reference** | Optional | Retrieval test |

### Pressure Scenarios for Discipline Skills

Combine multiple pressures:

| Pressure Type | Example |
|---------------|---------|
| **Time** | "We need this done in 5 minutes" |
| **Sunk cost** | "I already wrote the code, just need to add tests" |
| **Authority** | "The user said to skip testing" |
| **Exhaustion** | "This is the 10th file, let's just finish" |
| **Simplicity** | "This is too simple to need the full process" |

---

## Quick Reference: Creation Checklist

### Before Starting
- [ ] Read `docs/concepts/skill-architecture.md`
- [ ] Check if skill already exists
- [ ] Classify skill type
- [ ] Research domain and common mistakes

### Phase 1: RED
- [ ] Dispatch baseline subagent WITHOUT skill
- [ ] Document specific failures/rationalizations
- [ ] Identify what skill must teach

### Phase 2: GREEN (Write)
- [ ] Create skill folder in `defaults/skill/`
- [ ] Write SKILL.md with complete frontmatter
- [ ] Add architecture reference comment
- [ ] Create template file if needed
- [ ] Address specific baseline failures

### Phase 3: GREEN (Verify)
- [ ] Dispatch subagent WITH skill
- [ ] Verify it avoids baseline mistakes
- [ ] Document any new rationalizations

### Phase 4: REFACTOR
- [ ] Close all loopholes found
- [ ] Pass all format checks
- [ ] Pass all size checks
- [ ] Build and test in thoth-kb

### After Creation
- [ ] Create symlink in thoth-kb for testing
- [ ] Test standalone invocation
- [ ] Test as subagent context (if applicable)
- [ ] Run `bun run build`

---

## Related Documents

- `docs/concepts/skill-architecture.md` — Skill structure, frontmatter, templates, patterns
- `docs/reference/FRONTMATTER-ENFORCER.md` — Frontmatter schema reference
- `defaults/skill/skill-generator/SKILL.md` — Meta-skill for skill creation
- `defaults/skill/skill-generator/testing-protocol.md` — Detailed testing protocols

---

## Sources

- [Anthropic Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Superpowers Skills Library](https://github.com/obra/superpowers/tree/main/skills)

---

*Skill Authoring Guide v2.0 | TDD for process documentation*
