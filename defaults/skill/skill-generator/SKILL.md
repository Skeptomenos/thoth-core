---
name: skill-generator
description: Use when creating a new skill, editing an existing skill, or when asked to document a reusable process or technique
---

# Skill Generator

You are creating or editing a skill for the Thoth knowledge system.

**Core principle:** No skill without baseline failure first. Writing skills IS Test-Driven Development applied to process documentation.

**Violating the letter of this process is violating the spirit of this process.**

---

## The Iron Law

```
NO SKILL FILE CREATED UNTIL RED PHASE SUBAGENT COMPLETES
```

If you create a SKILL.md before the RED phase subagent documents a failure, delete it. Start over.

**No exceptions:**
- Don't keep it as "draft"
- Don't "refine it later"  
- Don't skip because "it's simple"
- Don't skip because "it's just a technique skill"
- Delete means delete

---

## Phase 0: Setup

### Step 1: Check if Skill Exists

```bash
ls -la .opencode/skill/ | grep -i "{skill-name}"
```

If exists: Read it first. You're editing, not creating.

### Step 2: Classify Skill Type

| Type | Purpose |
|------|---------|
| **Discipline** | Rules that resist rationalization (TDD, verification) |
| **Workflow** | Multi-step process with checkpoints |
| **Technique** | Concrete method with steps |
| **Reference** | API docs, syntax guides |

**Write down the type before proceeding.**

### Step 3: Research the Domain

- What tools/APIs are involved?
- What are common mistakes?
- What does success look like?

For discipline skills, also identify:
- What rationalizations will agents use to skip it?
- What pressure scenarios test compliance?

---

## Phase 1: RED — Baseline Test (MANDATORY)

**You MUST dispatch a subagent to attempt the task WITHOUT the skill.**

### Dispatch Baseline Subagent

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

### Document the Failure

Before proceeding, write down:
- **What the agent did wrong** (or suboptimally)
- **What rationalizations were used** (verbatim if possible)
- **What the skill must teach** to prevent this

**GATE: Do not proceed to Phase 2 until you have documented at least one failure or suboptimal behavior.**

If the baseline agent does everything perfectly, you may not need this skill.

---

## Phase 2: GREEN — Write Minimal Skill

Address the specific failures documented in Phase 1.

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

## Phase 3: GREEN — Verify With Skill (MANDATORY)

**You MUST dispatch a subagent to attempt the same task WITH the skill.**

### Dispatch Skill-Guided Subagent

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

### Verify the Fix

Compare baseline vs skill-guided:
- Did the agent avoid the mistakes from Phase 1?
- Any NEW rationalizations that bypassed the skill?
- Any ambiguities in the skill that allowed violations?

**GATE: Do not proceed until the skill-guided agent performs correctly.**

If the agent still fails, revise the skill and re-test.

---

## Phase 4: REFACTOR — Quality Gate

### Close Loopholes

For each new rationalization found in Phase 3:
1. Add explicit counter to Common Mistakes or Rationalization Table
2. Add to Red Flags section
3. Re-run Phase 3 if significant changes made

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

- [ ] Baseline subagent documented failure (Phase 1)
- [ ] Skill-guided subagent performed correctly (Phase 3)
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
| "Baseline test is overkill" | Baseline reveals what you'll skip. Do it. Subagent is mandatory. |
| "It's just a technique skill, doesn't need baseline" | Technique skills fail too. We learned this with email-draft. Test everything. |
| "I already know what will fail" | You're guessing. Run the subagent. Document actual behavior. |
| "I'll test after writing" | That's not TDD. RED comes before GREEN. Delete and start over. |
| "Description can summarize the workflow" | Claude follows descriptions instead of reading skills. Never summarize. |

---

## Red Flags - STOP

- Creating SKILL.md before RED phase subagent completes
- Skipping baseline test for ANY skill type
- "I already know what will fail" without running subagent
- Description summarizes workflow ("scans X, extracts Y, outputs Z")
- Missing "When to Use" section
- No Quick Reference table
- "I'll test it later"
- Skill over 500 lines without supporting files
- Proceeding to Phase 4 without Phase 3 subagent verification

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

*Skill Generator v2.0 | Part of Thoth Knowledge Management System*

---

## Quick Reference: The Phases

| Phase | Name | Action | Gate |
|-------|------|--------|------|
| 0 | Setup | Check exists, classify type, research domain | — |
| 1 | RED | Dispatch subagent WITHOUT skill, document failure | Must have documented failure |
| 2 | GREEN | Write minimal skill addressing failures | — |
| 3 | GREEN | Dispatch subagent WITH skill, verify fix | Must pass |
| 4 | REFACTOR | Close loopholes, quality checks | All checks pass |
