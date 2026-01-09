---
type: knowledge
hemisphere: kernel
created: 2026-01-07
updated: 2026-01-07
tags: [skills, authoring, best-practices, meta]
summary: Comprehensive guide for writing effective AI agent skills, synthesized from Anthropic official docs and Superpowers examples
related: [plugin-architecture.md, thoth-user-guide.md]
---

# Skill Authoring Guide

> Synthesized from [Anthropic's official best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) and [Superpowers skill library](https://github.com/obra/superpowers/tree/main/skills).

## Core Philosophy

### From Anthropic: Context is a Public Good

The context window is shared. Every token in your skill competes with:
- System prompt
- Conversation history
- Other skills' metadata
- The actual request

**Default assumption:** Claude is already very smart. Only add context Claude doesn't already have.

### From Superpowers: Skills are TDD for Processes

Writing skills IS Test-Driven Development applied to process documentation:
1. Write test cases (pressure scenarios)
2. Watch them fail (baseline behavior)
3. Write the skill
4. Watch tests pass (agents comply)
5. Refactor (close loopholes)

**Iron Law:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

---

## Skill Structure

### Required: YAML Frontmatter

```yaml
---
name: skill-name-with-hyphens
description: Use when [specific triggering conditions]. Third person, max 1024 chars.
---
```

**Name rules:**
- Max 64 characters
- Lowercase letters, numbers, hyphens only
- No special characters, no reserved words (anthropic, claude)
- Use gerund form: `processing-pdfs`, `writing-plans`, `systematic-debugging`

**Description rules:**
- Start with "Use when..." to focus on triggers
- Third person (injected into system prompt)
- Describe WHEN to use, NOT what it does
- Include symptoms, situations, contexts

```yaml
# BAD: Summarizes workflow (Claude may follow this instead of reading skill)
description: Use when executing plans - dispatches subagent per task with code review

# GOOD: Just triggering conditions
description: Use when executing implementation plans with independent tasks
```

### Body Structure

```markdown
# Skill Name

## Overview
What is this? Core principle in 1-2 sentences.
"Violating the letter of the rules is violating the spirit of the rules."

## When to Use
- Bullet list with SYMPTOMS and use cases
- When NOT to use
- Small flowchart IF decision is non-obvious

## The Iron Law (for discipline skills)
The non-negotiable rule in a code block.

## Core Pattern / Process
Before/after comparison or step-by-step workflow.

## Quick Reference
Table for scanning common operations.

## Common Mistakes / Red Flags
What goes wrong + fixes.
"STOP and Start Over" triggers.

## Rationalization Table
| Excuse | Reality |
Capture every excuse agents make.

## Verification Checklist
- [ ] Checkboxes for completion criteria
```

---

## Degrees of Freedom

Match specificity to task fragility:

| Freedom | When to Use | Example |
|---------|-------------|---------|
| **High** | Multiple approaches valid, context-dependent | "Analyze code structure, check for bugs, suggest improvements" |
| **Medium** | Preferred pattern exists, some variation OK | Template with parameters |
| **Low** | Operations fragile, consistency critical | "Run exactly this script. Do not modify." |

**Analogy:**
- **Narrow bridge with cliffs:** One safe path. Exact instructions. (database migrations)
- **Open field:** Many paths work. General direction. (code reviews)

---

## Progressive Disclosure

SKILL.md is a table of contents, not an encyclopedia.

### Pattern 1: High-level with References

```markdown
# PDF Processing

## Quick start
[inline code example]

## Advanced features
**Form filling**: See [FORMS.md](FORMS.md)
**API reference**: See [REFERENCE.md](REFERENCE.md)
```

Claude loads referenced files only when needed.

### Pattern 2: Domain-specific Organization

```
bigquery-skill/
├── SKILL.md (overview and navigation)
└── reference/
    ├── finance.md
    ├── sales.md
    └── product.md
```

### Key Rules

1. **Keep SKILL.md under 500 lines**
2. **One level deep references only** (no nested references)
3. **Table of contents for files >100 lines**
4. **Frequently-loaded skills: <200 words**

---

## Workflows and Feedback Loops

### Checklist Pattern

For complex multi-step tasks, provide a copyable checklist:

```markdown
## Workflow

Copy this checklist and track progress:

```
Task Progress:
- [ ] Step 1: Analyze the form
- [ ] Step 2: Create field mapping
- [ ] Step 3: Validate mapping
- [ ] Step 4: Apply changes
- [ ] Step 5: Verify output
```

**Step 1: Analyze the form**
Run: `python scripts/analyze.py input.pdf`
...
```

### Feedback Loop Pattern

```markdown
## Validation Loop

1. Make your edits
2. **Validate immediately**: `python validate.py`
3. If validation fails:
   - Review error message
   - Fix issues
   - Run validation again
4. **Only proceed when validation passes**
```

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

From Superpowers' `verification-before-completion` skill:

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

## Testing Skills (TDD for Documentation)

### RED Phase: Baseline Testing

1. Create pressure scenarios (3+ combined pressures)
2. Run scenarios WITHOUT skill
3. Document exact behavior and rationalizations verbatim
4. Identify patterns in failures

### GREEN Phase: Write Minimal Skill

1. Address specific baseline failures identified
2. Run scenarios WITH skill
3. Verify agents now comply

### REFACTOR Phase: Close Loopholes

1. Identify NEW rationalizations from testing
2. Add explicit counters
3. Build rationalization table
4. Re-test until bulletproof

---

## Code and Scripts

### Utility Scripts > Generated Code

Pre-made scripts offer:
- More reliable than generated code
- Save tokens (no code in context)
- Ensure consistency

```markdown
## Utility scripts

**analyze_form.py**: Extract form fields
```bash
python scripts/analyze_form.py input.pdf > fields.json
```

**validate.py**: Check for errors
```bash
python scripts/validate.py fields.json
# Returns: "OK" or lists conflicts
```
```

### Script Guidelines

1. **Handle errors explicitly** (don't punt to Claude)
2. **Document magic numbers** (no voodoo constants)
3. **Make execution intent clear**: "Run X" vs "See X for algorithm"

---

## Anti-Patterns

### Avoid

| Anti-Pattern | Why Bad |
|--------------|---------|
| Windows paths (`\`) | Breaks on Unix |
| Too many options | Confusing; provide defaults |
| Time-sensitive info | Will become wrong |
| Inconsistent terminology | Confuses Claude |
| Narrative examples | "In session 2025-10-03..." - not reusable |
| Multi-language dilution | Mediocre quality, maintenance burden |
| Vague names | `helper`, `utils`, `tools` |
| Deeply nested references | Claude may partially read |

### Good Patterns

| Pattern | Example |
|---------|---------|
| Template pattern | Provide exact output structure |
| Examples pattern | Input/output pairs like prompting |
| Conditional workflow | Decision trees with clear paths |
| Parallel dispatch | One agent per independent problem |

---

## Skill Types

| Type | Purpose | Example |
|------|---------|---------|
| **Technique** | Concrete method with steps | `systematic-debugging`, `condition-based-waiting` |
| **Pattern** | Way of thinking about problems | `test-driven-development` |
| **Reference** | API docs, syntax guides | `pptxgenjs.md` |
| **Discipline** | Rules that resist rationalization | `verification-before-completion` |
| **Workflow** | Multi-step process with checkpoints | `executing-plans`, `morning-boot` |

---

## Skill Creation Checklist

### RED Phase
- [ ] Create pressure scenarios (3+ combined pressures for discipline skills)
- [ ] Run scenarios WITHOUT skill - document baseline verbatim
- [ ] Identify patterns in rationalizations/failures

### GREEN Phase
- [ ] Name uses only letters, numbers, hyphens
- [ ] YAML frontmatter with name and description only
- [ ] Description starts with "Use when..." (no workflow summary)
- [ ] Description in third person
- [ ] Keywords throughout for search
- [ ] Clear overview with core principle
- [ ] Address specific baseline failures
- [ ] Run scenarios WITH skill - verify compliance

### REFACTOR Phase
- [ ] Identify NEW rationalizations from testing
- [ ] Add explicit counters
- [ ] Build rationalization table
- [ ] Create red flags list
- [ ] Re-test until bulletproof

### Quality Checks
- [ ] Small flowchart only if decision non-obvious
- [ ] Quick reference table
- [ ] Common mistakes section
- [ ] No narrative storytelling
- [ ] Under 500 lines (under 200 for frequently-loaded)

---

## Quick Reference: Skill Anatomy

```
skill-name/
├── SKILL.md              # Main reference (required, <500 lines)
├── reference.md          # Heavy reference (if >100 lines)
├── examples.md           # Usage examples (if needed)
└── scripts/
    └── utility.py        # Executable tools
```

**Frontmatter:**
```yaml
---
name: lowercase-with-hyphens
description: Use when [triggers]. Third person. No workflow summary.
---
```

**Body sections:**
1. Overview (core principle)
2. When to Use (symptoms, NOT to use)
3. Iron Law (if discipline skill)
4. Core Pattern/Process
5. Quick Reference (table)
6. Common Mistakes/Red Flags
7. Rationalization Table (if discipline)
8. Verification Checklist

---

## Sources

- [Anthropic Skill Authoring Best Practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Superpowers Skills Library](https://github.com/obra/superpowers/tree/main/skills)
  - `writing-skills` - Meta-skill for creating skills
  - `verification-before-completion` - Evidence before claims
  - `systematic-debugging` - Root cause investigation
  - `test-driven-development` - RED-GREEN-REFACTOR
  - `writing-plans` - Implementation plan structure
  - `executing-plans` - Batch execution with checkpoints
  - `dispatching-parallel-agents` - Parallel problem solving
