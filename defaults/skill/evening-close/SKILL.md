---
name: evening-close
description: Summarize the day, extract incomplete tasks into tomorrow's overflow, and persist daily learnings to the Knowledge Base.
triggers: 
template: evening-close-template.md
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->

# Evening Close Skill

**Core principle:** Every win, decision, and observation must be archived. Tomorrow begins with total clarity.

---

## Context Requirements (EXECUTE FIRST)

**Step 0 — Get Identity:**

1. **Check if passed in context**: If `context.identity.kb_root` exists, use it.
2. **If not passed**: Call `skill({ name: "context-discovery" })`.
3. **Store `KB_ROOT`** for all file paths below.

**If discovery fails**: Stop and report error.

---

## Quick Reference

| Task | Path |
|------|------|
| Today's log | `{KB_ROOT}/work/operations/daily-log/YYYY-MM-DD/daily-log.md` |
| Overflow file | `{KB_ROOT}/work/inbox/overflow-YYYY-MM-DD.md` |
| Chronicle | `{KB_ROOT}/work/chronicle.md` |
| People files | `{KB_ROOT}/work/people/{person}.md` |
| Project files | `{KB_ROOT}/work/projects/{project}.md` |

---

## Protocol

### Step 1: Audit

1. **Read Daily Log**: `{KB_ROOT}/work/operations/daily-log/YYYY-MM-DD/daily-log.md`
2. **Verify Progress**: Compare Top 3 Priorities against Action Log
3. **Identify incomplete items** (not mentioned or marked incomplete)

### Step 2: Summarize

Fill in `## Evening Summary` section of daily-log.md:

| Field | Content |
|-------|---------|
| Completed | Count + list |
| Blocked | Items with blockers |
| Deferred | Moved to tomorrow |
| Key Wins | 2-3 most impactful |
| Key Decisions | Strategic choices made |
| Observations | Learnings, patterns |

### Step 3: Extract Overflow

Create overflow file using template: `evening-close-template.md`

**Output path**: `{KB_ROOT}/work/inbox/overflow-YYYY-MM-DD.md`

Collect all P0/P1 items NOT completed from:
- Top 3 Priorities
- Pending Responses
- Action items from meetings

### Step 4: Knowledge Persistence

**Smart Merge** (append-only, never overwrite):

| Source | Destination | Section |
|--------|-------------|---------|
| People notes | `work/people/{person}.md` | `## Interaction Log` |
| Project decisions | `work/projects/{project}.md` | `## Decisions` |
| Day summary | `work/chronicle.md` | `## YYYY-MM-DD` |

Format: `> YYYY-MM-DD: [content]`

### Step 5: Weekly Maintenance (Friday Only)

If Friday:
- Run system hygiene checks
- Review week's chronicle entries
- Identify patterns or recurring blockers
- Suggest focus areas for next week

### Step 6: Finalize

1. Verify all file writes succeeded
2. Present summary + overflow list to user
3. Suggest preparation for tomorrow

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Overwriting existing content | Use append-only Smart Merge |
| Hallucinating outcomes | Mark unclear items as "UNCLEAR", ask user |
| Missing incomplete tasks | Cross-check ALL priority lists |

---

## Red Flags - STOP

- About to overwrite existing section content
- Item status is unclear (ask user first)
- Daily log doesn't exist (run morning-boot first)

---

## Verification Checklist

- [ ] Daily log updated with Evening Summary
- [ ] Overflow file created with all incomplete P0/P1
- [ ] Chronicle entry added
- [ ] People/project files updated if notes exist
- [ ] User presented with summary
