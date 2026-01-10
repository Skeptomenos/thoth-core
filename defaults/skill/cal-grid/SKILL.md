---
name: cal-grid
description: Map the daily calendar grid identifying meetings, deep work slots, and preparation needs.
triggers: 
template: cal-grid-template.md
created: 2026-01-09
updated: 2026-01-09
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->

# Calendar Grid Skill

You are the Daily Grid Architect. Your mission is to scan today's calendar and produce a high-resolution grid of the day.

---

## Context Requirements (EXECUTE FIRST)

This skill requires the user's email address for API calls.

**Step 0 — Get Identity:**

1. **Check if passed in context**: If you received `context.identity.email`, use it directly.

2. **If not passed, invoke context-discovery skill**: Call `skill({ name: "context-discovery" })` and use the returned `email` value.

3. **Store as `EMAIL`** for use in all API calls below.

**If discovery fails**: Stop and report the error from context-discovery.

---

## When to Use

- Morning boot calendar scan
- "What's on my calendar today?"
- "Any meetings I need to prepare for?"
- Before planning focus time

---

## Tools Required

| Action       | Tool                        | Parameters                                                             |
| ------------ | --------------------------- | ---------------------------------------------------------------------- |
| Get events   | google-workspace_get_events | `user_google_email: {EMAIL}`, `time_min`, `time_max`, `detailed: true` |
| Write output | write                       | `work/operations/daily-log/YYYY-MM-DD/cal-grid.md`                                     |

---

## Execution Protocol

### Phase 1: Scan Calendar

```
google-workspace_get_events(
  user_google_email={EMAIL},
  time_min="YYYY-MM-DDT00:00:00Z",  # Today start
  time_max="YYYY-MM-DDT23:59:59Z",  # Today end
  detailed=true
)
```

Also scan tomorrow for preparation awareness:
```
google-workspace_get_events(
  user_google_email={EMAIL},
  time_min="YYYY-MM-DD+1T00:00:00Z",  # Tomorrow start
  time_max="YYYY-MM-DD+1T23:59:59Z",  # Tomorrow end
  detailed=true
)
```

### Phase 2: Analyze Each Meeting

For each event, determine:

| Field | Analysis |
|-------|----------|
| **Time** | Start-end in local time |
| **Event** | Title (clean up noise) |
| **Attendees** | Who's attending, any VIPs? |
| **Prep Needed** | What preparation is required? |
| **Classification** | 1:1, Team, External, Focus, Admin |

**Classification Guide:**

| Type | Signal |
|------|--------|
| 1:1 | Two attendees, recurring |
| Team | 3+ internal attendees |
| External | External domain attendees |
| Focus | Blocked time, no attendees |
| Admin | Recurring admin tasks |

### Phase 3: Identify Focus Blocks

Find gaps between meetings that could be used for deep work:

| Block Quality | Duration |
|---------------|----------|
| Deep Work | 90+ minutes |
| Shallow Work | 30-90 minutes |
| Buffer | <30 minutes |

### Phase 4: Flag Preparation Needs

For each meeting, assess:
- Do I need to review anything beforehand?
- Are there action items I committed to?
- Is this a high-stakes meeting (skip-level, external)?

---

## Output Format

**Template:** Read `cal-grid-template.md` from this skill folder.

**Output path:** `work/operations/daily-log/YYYY-MM-DD/cal-grid.md`

Fill the template placeholders with scan results:

| Placeholder | Value |
|-------------|-------|
| `{{DATE}}` | Today's date (YYYY-MM-DD) |
| `{{TIME}}` | Scan completion time (HH:MM) |
| `{{CALENDAR_ID}}` | Calendar scanned (usually "primary") |
| `{{MEETING_COUNT}}` | Total meetings today |
| `{{MEETING_HOURS}}` | Total hours in meetings |
| `{{FOCUS_HOURS}}` | Available focus time |
| `{{COMPLEXITY}}` | Light/Medium/Heavy |
| `{{TODAY_MEETINGS_TABLE}}` | Table rows for today's meetings |
| `{{FOCUS_BLOCKS_TABLE}}` | Table rows for focus blocks |
| `{{PREP_REQUIRED_TABLE}}` | Table rows for meetings needing prep |
| `{{CONFLICTS_TABLE}}` | Table rows for conflicts (if any) |
| `{{TOMORROW_TABLE}}` | Table rows for tomorrow preview |
| `{{HIGH_PRIORITY_PREP}}` | Urgent prep items |
| `{{STANDARD_PREP}}` | Standard prep items |
| `{{DEEP_WORK_STRATEGY}}` | Recommended focus block usage |

**Critical:** Output MUST include `## SCAN_DATA_START` and `## SCAN_DATA_END` markers for parsing.

---

## Completion Checklist

- [ ] Context discovery completed (have EMAIL)
- [ ] Today's events scanned
- [ ] Tomorrow's events scanned for prep
- [ ] Each meeting classified
- [ ] Focus blocks identified
- [ ] Preparation needs flagged
- [ ] Output written to `work/operations/daily-log/YYYY-MM-DD/cal-grid.md`
- [ ] SCAN_DATA markers included

---

## Error Handling

| Error | Action |
|-------|--------|
| No calendar access | Report OAuth needed, stop |
| Empty calendar | Report "No meetings scheduled", still output focus blocks |
| API rate limit | Wait and retry once |
