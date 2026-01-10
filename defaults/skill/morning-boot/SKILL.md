---
name: morning-boot
description: The master orchestrator for your morning routine. Parallelizes scans across email, calendar, and Slack, then synthesizes into a daily briefing.
triggers:
  - "start my day"
  - "morning boot"
  - "prepare my day"
  - "daily briefing"
  - "morning routine"
template: daily-log-template.md
created: 2026-01-09
updated: 2026-01-09
---

<!--
ARCHITECTURE REFERENCE — READ BEFORE MODIFYING

This skill follows the Skill Architecture pattern documented in:
  docs/concepts/skill-architecture.md

Key concepts:
- Skills are modular context units (workflow + template + orchestration)
- Subagents invoke skills as context templates
- Templates ensure consistent output quality
- Synthesis happens in main session (not subagent) for full context access
- Nesting enables context discovery chains

DO NOT modify this skill without reading the architecture doc first.
-->

# Morning Boot Skill

You are the **Daily Operations Orchestrator**. Coordinate parallel scans, synthesize results with full session context, and produce the daily briefing.

---

## Architecture

```
Main Session (Thoth)
│
├─▶ SKILL.md (this file)
│   │
│   ├── Phase 1: Context Discovery
│   │
│   ├── Phase 2: Execute OpenProse VM
│   │   └── morning-boot.prose
│   │       └── parallel:
│   │           ├── email_scanner → mail-triage skill → email summary
│   │           ├── calendar_scanner → cal-grid skill → calendar summary
│   │           └── slack_scanner → slack-pulse skill → slack summary
│   │
│   ├── Phase 3: Synthesize (YOU do this, with full context)
│   │   └── Use daily-log-template.md
│   │
│   ├── Phase 4: Persist outputs
│   │
│   └── Phase 5: Present to user
│
└── Back to Main Session
```

**Key insight:** Subagents do the heavy scanning (keeps main context clean). YOU do the synthesis (you have full context: spillover, projects, commitments).

---

## Phase 1: Context Discovery

**Step 1.1 — Get Identity:**

```
skill({ name: "context-discovery" })
```

Store:
- `EMAIL` — User's work email
- `KB_ROOT` — Knowledge base path

**If discovery fails:** Stop and report. User needs to run `thoth link`.

**Step 1.2 — Determine output path:**

```
OUTPUT_DIR = {KB_ROOT}/work/operations/daily-log/{YYYY-MM-DD}/
```

Create the directory if it doesn't exist.

---

## Phase 2: Execute OpenProse Workflow

Load and embody the OpenProse VM. Execute `morning-boot.prose`.

The .prose file spawns three scanner agents in parallel:
- `email_scanner` → invokes `mail-triage` skill
- `calendar_scanner` → invokes `cal-grid` skill  
- `slack_scanner` → invokes `slack-pulse` skill

Each skill:
- Handles its own context discovery
- Reads its own config files
- Uses its own template for output format
- Returns a structured summary

**Receive back:** `{ email, calendar, slack }` — summaries from all three scanners.

---

## Phase 3: Synthesize Daily Briefing

**YOU do this step** — not a subagent. You have the full session context.

**Step 3.1 — Load template:**

Read `daily-log-template.md` from this skill folder.

**Step 3.2 — Gather additional context:**

Check for spillover and commitments:
- Read `{KB_ROOT}/work/dashboard.md` for current priorities
- Read previous day's `daily-log.md` for unfinished items
- Cross-reference with known projects and commitments

**Step 3.3 — Apply synthesis logic:**

| Input | Analysis |
|-------|----------|
| Email ACTION items | → Pending responses (email) |
| Calendar meetings | → Meeting load, complexity budget |
| Calendar focus blocks | → Deep work windows |
| Slack RESPOND items | → Pending responses (slack) |
| Meeting notes detected | → Handoff count for post-meeting-drill |
| Spillover from yesterday | → Carry forward or reprioritize |
| Dashboard priorities | → Cross-reference with today's items |

**Step 3.4 — Determine Top Priority and Top 3:**

Apply Executive Filter:
1. What MUST happen today? (deadlines, blockers, commitments)
2. What SHOULD happen today? (important but not urgent)
3. What CAN happen today? (if time permits)

**Step 3.5 — Calculate Complexity Budget:**

| Meeting Load | Meetings | Task Capacity |
|--------------|----------|---------------|
| Light | 0-2 | 2-3 Heavy tasks |
| Medium | 3-4 | 1-2 Heavy tasks |
| Heavy | 5+ | 1 Light task max |

**Step 3.6 — Fill template:**

Replace placeholders in `daily-log-template.md` with synthesized values.

---

## Phase 4: Persist Outputs

Write all files to `{OUTPUT_DIR}`:

| File | Content |
|------|---------|
| `daily-log.md` | Synthesized briefing (from Phase 3) |
| `mail-triage.md` | Email scan results (from email scanner) |
| `cal-grid.md` | Calendar analysis (from calendar scanner) |
| `slack-pulse.md` | Slack activity (from slack scanner) |

---

## Phase 5: Present to User

Verbal summary format:

```
## Morning Briefing — {DATE}

**Top Priority:** {TOP_PRIORITY}

**Top 3:**
1. {PRIORITY_1}
2. {PRIORITY_2}
3. {PRIORITY_3}

**Day Shape:** {COMPLEXITY} day — {MEETING_COUNT} meetings, {DEEP_WORK_HOURS}h deep work available

**Pending Responses:** {EMAIL_ACTION_COUNT} emails, {SLACK_RESPOND_COUNT} Slack messages

**Meeting Notes:** {MEETING_NOTES_COUNT} ready for processing

Files saved to: work/operations/daily-log/{DATE}/
```

---

## Fallback Mode

If any scanner fails:

1. **Report which failed** and the error
2. **Continue with remaining scanners** — partial data is better than none
3. **Synthesize with available data**
4. **Offer retry:** "Want me to retry the {failed} scan?"

If ALL scanners fail:

1. **Fall back to KB data:**
   - Read `work/dashboard.md`
   - Read `work/inbox/`
   - Check recent daily logs
2. **Synthesize from KB** — not as fresh, but still useful
3. **Report the situation** to user

---

## Templates

| Template | Purpose |
|----------|---------|
| `daily-log-template.md` | Final synthesized briefing |
| `mail-triage/mail-triage-template.md` | Email scan output |
| `cal-grid/cal-grid-template.md` | Calendar scan output |
| `slack-pulse/slack-pulse-template.md` | Slack scan output |

---

## Related Files

- `morning-boot.prose` — OpenProse parallel execution
- `daily-log-template.md` — Output template
- `work/operations/slack-map.md` — Slack channel configuration
- `work/dashboard.md` — Current priorities (for synthesis context)

---

*Morning Boot Skill v3.0 | Template-driven synthesis with full context*
