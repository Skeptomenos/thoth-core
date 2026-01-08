---
name: skill-generator
description: Use when creating a new skill, editing an existing skill, or when asked to document a reusable process or technique
---

# Skill Generator

You are creating or editing a skill for the Thoth knowledge system.

**Core principle:** No skill without baseline understanding first. Writing skills IS Test-Driven Development applied to process documentation.

**Violating the letter of this process is violating the spirit of this process.**

---

## The Iron Law

```
NO SKILL FILE CREATED UNTIL PHASE 1 IS COMPLETE
```

If you create a SKILL.md before completing Phase 1, delete it. Start over.

**No exceptions:**
- Don't keep it as "draft"
- Don't "refine it later"
- Don't skip because "it's simple"
- Delete means delete

---

## Phase 1: Research (Before Writing Anything)

### Step 1: Check if Skill Exists

```bash
ls -la .opencode/skill/ | grep -i "{skill-name}"
```

If exists: Read it first. You're editing, not creating.

### Step 2: Classify Skill Type

| Type | Purpose | Testing Approach |
|------|---------|------------------|
| **Discipline** | Rules that resist rationalization (TDD, verification) | Subagent pressure test |
| **Workflow** | Multi-step process with checkpoints | Manual walkthrough |
| **Technique** | Concrete method with steps | Clarity check |
| **Reference** | API docs, syntax guides | Retrieval test |

**Write down the type before proceeding.**

### Step 3: Research the Domain

For technique/reference skills:
- What tools/APIs are involved?
- What are common mistakes?
- What does success look like?

For discipline skills:
- What behavior are we enforcing?
- What rationalizations will agents use to skip it?
- What pressure scenarios test compliance?

### Step 4: Baseline Test (Discipline Skills Only)

Run a scenario WITHOUT the skill. Document:
- What did the agent do?
- What rationalizations were used?
- What was skipped?

See [testing-protocol.md](testing-protocol.md) for detailed testing procedures by skill type.

---

## Phase 2: Write Minimal Skill

### Frontmatter (Required)

```yaml
---
name: lowercase-with-hyphens
description: Use when [specific triggers]. Third person. No workflow summary.
---
```

**Description Rules:**
- ✅ Start with "Use when..."
- ✅ Describe triggers/symptoms only
- ✅ Third person (injected into system prompt)
- ❌ Never summarize the workflow
- ❌ Never use first person

### Required Sections

Copy this template and fill in:

```markdown
# Skill Name

**Core principle:** {one sentence}

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

{Main content here}

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| {mistake} | {fix} |

---

## Red Flags - STOP

- {warning sign}
- {warning sign}

---

## Verification Checklist

- [ ] {check}
- [ ] {check}
```

### Optional Sections (Add If Needed)

- **Rationalization Table** — Required for discipline skills
- **Examples** — One excellent example beats many mediocre ones
- **Supporting Files** — Only for heavy reference (>100 lines)

---

## Phase 3: Quality Gate

Before claiming the skill is complete, verify:

### Format Checks

- [ ] Name: lowercase, hyphens only, no special chars
- [ ] Description: starts with "Use when...", no workflow summary
- [ ] Description: third person, under 500 chars
- [ ] Has "Core principle" statement
- [ ] Has "When to Use" section
- [ ] Has "Quick Reference" table
- [ ] Has "Common Mistakes" section
- [ ] Has "Red Flags" section
- [ ] Has "Verification Checklist"

### Size Checks

```bash
wc -l .opencode/skill/{name}/SKILL.md
```

- [ ] SKILL.md under 500 lines
- [ ] Frequently-loaded skills under 200 lines
- [ ] Heavy reference in separate files

### Functional Check

- [ ] Walked through the skill as if following it
- [ ] All referenced tools/commands exist
- [ ] No ambiguous instructions

---

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "This skill is simple, doesn't need structure" | Simple skills still need discoverability. Follow the format. |
| "I'll add sections later" | Later never comes. Add them now. |
| "The example is self-explanatory" | Examples don't replace Quick Reference tables. |
| "It's just a reference skill" | Reference skills still need When to Use and Common Mistakes. |
| "I already know this domain" | Your knowledge isn't in the file. Document it. |
| "Baseline test is overkill" | Baseline reveals what you'll skip. Do it. |
| "Description can summarize the workflow" | Claude follows descriptions instead of reading skills. Never summarize. |

---

## Red Flags - STOP

- Creating SKILL.md before completing Phase 1
- Description summarizes workflow ("scans X, extracts Y, outputs Z")
- Missing "When to Use" section
- No Quick Reference table
- Skipping baseline test for discipline skills
- "I'll test it later"
- Skill over 500 lines without supporting files

**All of these mean: STOP. Go back to the phase you skipped.**

---

## Supporting Files

When to create separate files:

| Content | Threshold | File |
|---------|-----------|------|
| Heavy reference | >100 lines | `reference.md` |
| Detailed examples | >50 lines | `examples.md` |
| Testing protocol | Discipline skills | `testing-protocol.md` |

---

## Cross-Reference

**Required reading:** Read `kernel/knowledge/skill-authoring-guide.md` for comprehensive best practices.

This skill is a lightweight enforcement layer. The guide has the full theory and examples.

---

*Skill Generator v1.0 | Part of Thoth Knowledge Management System*
