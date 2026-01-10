---
name: skill-generator
description: Use when creating a new skill, editing an existing skill, or when asked to document a reusable process or technique
triggers: 
created: 2026-01-07
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
AUTHORING GUIDE: docs/guides/skill-authoring-guide.md
TEMPLATES: skill-template.md (in this folder)
-->

# Skill Generator

**Core principle:** No skill without baseline failure first. TDD for process documentation.

**Violating the letter of this process is violating the spirit of this process.**

---

## The Iron Law

```
NO SKILL FILE CREATED UNTIL RED PHASE SUBAGENT COMPLETES
```

If you create SKILL.md before documenting a baseline failure, delete it. Start over. No exceptions.

---

## Quick Reference: The Phases

| Phase | Action | Gate |
|-------|--------|------|
| 0 | Check exists, classify type | — |
| 1 RED | Subagent WITHOUT skill → document failure | Must have failure |
| 2 GREEN | Write skill in thoth-core | — |
| 3 GREEN | Subagent WITH skill → verify fix | Must pass |
| 4 REFACTOR | Symlink, build, quality checks | All pass |

---

## Phase 0: Setup

**Check exists:** `ls defaults/skill/ | grep -i {name}`

**Classify type:**
- **Discipline** — Rules resisting rationalization
- **Workflow** — Multi-step with checkpoints  
- **Technique** — Concrete method
- **Reference** — API docs

**Determine requirements:**
- Structured output? → Create template file
- Needs user email? → Add context discovery
- Needs config? → Add `config:` frontmatter

---

## Phase 1: RED — Baseline Test (MANDATORY)

Dispatch subagent WITHOUT the skill:

```
task(
  subagent_type="general",
  description="Baseline test for {skill-name}",
  prompt="""
You are testing baseline behavior WITHOUT a skill.

**Task:** {Describe the task}
**Context:** {Relevant context}

Complete the task using your best judgment. Do NOT load any skills.

**Report:** What approach? What output? What assumptions?
"""
)
```

**Document:** What went wrong? What rationalizations? What must skill teach?

**GATE:** Do not proceed without documented failure.

---

## Phase 2: GREEN — Write Skill

### Location: thoth-core (MANDATORY)

```bash
cd /path/to/thoth-core
mkdir -p defaults/skill/{skill-name}
```

Never create directly in thoth-kb. Symlink comes in Phase 4.

### Create SKILL.md

See `skill-template.md` in this folder for the complete template.

**Required frontmatter:**
```yaml
---
name: skill-name
description: Use when [triggers]. No workflow summary.
triggers:
  - "phrase that activates"
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

**Required sections:** Core principle, When to Use, Quick Reference, Process, Common Mistakes, Red Flags, Verification Checklist

**If skill produces output:** Create `skill-name-template.md` with `{{PLACEHOLDER}}` syntax.

---

## Phase 3: GREEN — Verify (MANDATORY)

Dispatch subagent WITH the skill:

```
task(
  subagent_type="general",
  description="Skill-guided test for {skill-name}",
  prompt="""
You are testing a skill.

**REQUIRED SKILL:**
---
{Paste skill content}
---

**Task:** {Same as baseline}

Follow the skill exactly. Report: What approach? Did you follow completely?
"""
)
```

**Verify:** Avoided baseline mistakes? New rationalizations? Ambiguities?

**GATE:** Do not proceed until agent performs correctly.

---

## Phase 4: REFACTOR — Deploy

### Symlink to thoth-kb

```bash
cd /path/to/thoth-kb/.opencode/skill
ln -s ../../../thoth-core/defaults/skill/{skill-name} {skill-name}
```

### Build and verify

```bash
cd /path/to/thoth-core && bun run build
```

### Quality Checklist

- [ ] Baseline failure documented (Phase 1)
- [ ] Skill-guided test passed (Phase 3)
- [ ] Name: lowercase, hyphens only
- [ ] Description: "Use when...", no workflow summary
- [ ] Triggers: list of activation phrases
- [ ] Architecture comment after frontmatter
- [ ] Template file if structured output
- [ ] Under 500 lines (under 200 if frequent)
- [ ] Symlink created and verified
- [ ] Build succeeds

---

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "Too simple for structure" | Simple skills need discoverability. Follow format. |
| "I'll add sections later" | Later never comes. Add now. |
| "Baseline is overkill" | Baseline reveals what you'll skip. Mandatory. |
| "I already know what will fail" | You're guessing. Run the subagent. |
| "I'll test after writing" | That's not TDD. RED before GREEN. |
| "Description can summarize workflow" | Claude follows descriptions instead of reading. Never summarize. |

---

## Red Flags - STOP

- Creating SKILL.md before RED phase completes
- Skipping baseline for ANY skill type
- Description summarizes workflow
- Missing `triggers:` in frontmatter
- Hardcoded user email (use context-discovery)
- Skill created in thoth-kb instead of thoth-core
- Proceeding to Phase 4 without Phase 3 verification

**All mean: STOP. Go back.**

---

## Related

- `skill-template.md` — SKILL.md and output templates
- `testing-protocol.md` — Detailed testing by skill type
- `docs/concepts/skill-architecture.md` — Architecture reference
- `docs/guides/skill-authoring-guide.md` — Comprehensive guide

---

*Skill Generator v3.1 | Condensed TDD enforcement*
