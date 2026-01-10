---
name: morning-boot
description: The master orchestrator for your morning routine. Parallelizes scans across email, calendar, and Slack, then synthesizes into a daily briefing. Path-aware — scans both work and life when run from KB root.
triggers: 
template: daily-log-template.md
created: 2026-01-09
updated: 2026-01-10
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
- PATH-AWARE: Dual mode (work+life) at KB root, single mode in hemispheres

DO NOT modify this skill without reading the architecture doc first.
-->

# Morning Boot Skill

You are the **Daily Operations Orchestrator**. Coordinate parallel scans, synthesize results with full session context, and produce the daily briefing.

**Path-aware behavior:**
- Running from **KB root** → Scan BOTH work and life (dual mode)
- Running from **work/** → Scan work only (single mode)
- Running from **life/** → Scan life only (single mode)

---

## Architecture

```
Main Session (Thoth)
│
├─▶ SKILL.md (this file)
│   │
│   ├── Phase 1: Context Discovery (detects mode)
│   │
│   ├── Phase 2: Execute Parallel Scans
│   │   │
│   │   ├── [DUAL MODE] Both hemispheres:
│   │   │   ├── work_email_scanner → mail-triage (work email)
│   │   │   ├── work_calendar_scanner → cal-grid (work calendar)
│   │   │   ├── work_slack_scanner → slack-pulse
│   │   │   ├── life_email_scanner → mail-triage (personal email)
│   │   │   └── life_calendar_scanner → cal-grid (personal calendar)
│   │   │
│   │   └── [SINGLE MODE] One hemisphere:
│   │       ├── email_scanner → mail-triage
│   │       ├── calendar_scanner → cal-grid
│   │       └── slack_scanner → slack-pulse (work only)
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

**Step 1.1 — Get Identity and Mode:**

```
skill({ name: "context-discovery" })
```

Context discovery returns:
- `mode` — "single" or "dual"
- `kb_root` — Knowledge base path
- For single mode: `hemisphere`, `identity.email`
- For dual mode: `hemispheres.work.email`, `hemispheres.life.email`

**Store based on mode:**

```
If mode == "dual":
  WORK_EMAIL = hemispheres.work.email
  LIFE_EMAIL = hemispheres.life.email
  WORK_STAKEHOLDERS = hemispheres.work.stakeholders
  WORK_TEAM = hemispheres.work.team
  LIFE_PEOPLE = hemispheres.life.people
Else:
  EMAIL = identity.email
  HEMISPHERE = hemisphere
  STAKEHOLDERS = stakeholders (if work)
  TEAM = team (if work)
```

**If discovery fails:** Stop and report. User needs to run `thoth link`.

**Step 1.2 — Determine output path:**

```
OUTPUT_DIR = {KB_ROOT}/work/operations/daily-log/{YYYY-MM-DD}/
```

Create the directory if it doesn't exist.

---

## Phase 2: Execute Parallel Scans

### Dual Mode (KB root — both hemispheres)

Spawn **5 parallel scanners**:

| Agent | Skill | Email | Purpose |
|-------|-------|-------|---------|
| `work_email_scanner` | mail-triage | `WORK_EMAIL` | Work inbox |
| `work_calendar_scanner` | cal-grid | `WORK_EMAIL` | Work calendar |
| `work_slack_scanner` | slack-pulse | (workspace) | Slack activity |
| `life_email_scanner` | mail-triage | `LIFE_EMAIL` | Personal inbox |
| `life_calendar_scanner` | cal-grid | `LIFE_EMAIL` | Personal calendar |

**Note:** Slack is work-only. No personal Slack scan.

**Receive back:**
```json
{
  "work": {
    "email": { /* mail-triage output */ },
    "calendar": { /* cal-grid output */ },
    "slack": { /* slack-pulse output */ }
  },
  "life": {
    "email": { /* mail-triage output */ },
    "calendar": { /* cal-grid output */ }
  }
}
```

### Single Mode (inside hemisphere)

Spawn **3 parallel scanners** (or 2 for life):

| Agent | Skill | Purpose |
|-------|-------|---------|
| `email_scanner` | mail-triage | Inbox scan |
| `calendar_scanner` | cal-grid | Calendar analysis |
| `slack_scanner` | slack-pulse | Slack activity (work only) |

**Receive back:** `{ email, calendar, slack }` — summaries from scanners.

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

### Single Mode Synthesis

| Input | Analysis |
|-------|----------|
| Email ACTION items | → Pending responses (email) |
| Calendar meetings | → Meeting load, complexity budget |
| Calendar focus blocks | → Deep work windows |
| Slack RESPOND items | → Pending responses (slack) |
| Meeting notes detected | → Handoff count for post-meeting-drill |
| Spillover from yesterday | → Carry forward or reprioritize |
| Dashboard priorities | → Cross-reference with today's items |

### Dual Mode Synthesis

| Input | Analysis |
|-------|----------|
| **Work email** ACTION items | → Work pending responses |
| **Work calendar** meetings | → Work meeting load |
| **Slack** RESPOND items | → Slack pending |
| **Life email** ACTION items | → Personal pending (flag if urgent) |
| **Life calendar** events | → Personal commitments (flag conflicts) |
| Meeting notes detected | → Handoff count for post-meeting-drill |
| Spillover from yesterday | → Carry forward or reprioritize |

**Cross-hemisphere conflict detection:**
- Work meeting overlaps with personal appointment? → FLAG
- Personal urgent email during heavy work day? → SURFACE
- Life event that might affect work focus? → NOTE

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

For dual mode, include a **Life section** in the briefing:
```markdown
## Personal

**Today's personal commitments:**
- {LIFE_EVENTS}

**Personal inbox:** {LIFE_EMAIL_SUMMARY}

**Conflicts:** {CROSS_HEMISPHERE_CONFLICTS}
```

---

## Phase 4: Persist Outputs

Write all files to `{OUTPUT_DIR}`:

### Single Mode Files

| File | Content |
|------|---------|
| `daily-log.md` | Synthesized briefing (from Phase 3) |
| `mail-triage.md` | Email scan results |
| `cal-grid.md` | Calendar analysis |
| `slack-pulse.md` | Slack activity (work only) |

### Dual Mode Files

| File | Content |
|------|---------|
| `daily-log.md` | Synthesized briefing (includes both hemispheres) |
| `mail-triage-work.md` | Work email scan results |
| `mail-triage-life.md` | Personal email scan results |
| `cal-grid-work.md` | Work calendar analysis |
| `cal-grid-life.md` | Personal calendar analysis |
| `slack-pulse.md` | Slack activity |

---

## Phase 5: Present to User

### Single Mode Presentation

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

### Dual Mode Presentation

```
## Morning Briefing — {DATE}

**Top Priority:** {TOP_PRIORITY}

**Top 3:**
1. {PRIORITY_1}
2. {PRIORITY_2}
3. {PRIORITY_3}

### Work

**Day Shape:** {COMPLEXITY} day — {WORK_MEETING_COUNT} meetings, {DEEP_WORK_HOURS}h deep work available

**Pending Responses:** {WORK_EMAIL_ACTION_COUNT} work emails, {SLACK_RESPOND_COUNT} Slack

### Personal

**Today:** {LIFE_EVENTS_SUMMARY}

**Pending:** {LIFE_EMAIL_ACTION_COUNT} personal emails

### Conflicts

{CROSS_HEMISPHERE_CONFLICTS or "None detected"}

---

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

- `daily-log-template.md` — Output template
- `work/operations/slack-map.md` — Slack channel configuration
- `work/dashboard.md` — Current priorities (for synthesis context)

---

*Morning Boot Skill v4.0 | Path-aware dual/single hemisphere scanning*
