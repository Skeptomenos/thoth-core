---
created: 2026-01-09
updated: 2026-01-09
---

# Calendar Scanner: What It Does

## Purpose

The Calendar Scanner analyzes your day's schedule to identify preparation needs, find focus time, and assess your complexity budget for the day.

---

## The User Experience

When the calendar scanner runs, it answers:

1. **What meetings do I have today?** (Full grid with times)
2. **Which meetings need preparation?** (Prep alerts)
3. **When can I do deep work?** (Focus windows)
4. **How heavy is my day?** (Complexity assessment)
5. **What's coming tomorrow?** (Prep lookahead)

You get a tactical view of your day instead of just a list of meetings.

---

## What Gets Scanned

| Source | Time Range | Detail Level |
|--------|------------|--------------|
| Primary Calendar | Today 00:00-23:59 | Full details (attendees, description) |
| Primary Calendar | Tomorrow 00:00-23:59 | Preview for prep |

**API Used**: `google-workspace_get_events`

---

## What You See (Output)

```markdown
## Calendar Analysis

### Day Summary
- **Meetings**: 5 scheduled
- **Meeting Hours**: 4.5 hours
- **Complexity**: Medium
- **Deep Work Available**: 2.5 hours

### Today's Grid
| Time | Event | Attendees | Prep | Type |
|------|-------|-----------|------|------|
| 09:00-09:30 | Standup | Team (8) | None | Team |
| 10:00-11:00 | 1:1 with Manager | Manager | Review goals | 1:1 |
| 11:00-12:30 | — FOCUS BLOCK — | | Deep Work | |
| 12:30-13:00 | Lunch | | | |
| 14:00-15:00 | Design Review | Platform Team (5) | Read RFC | Team |
| 15:00-15:30 | — BUFFER — | | Transition | |
| 15:30-16:30 | External Sync | Client + PM | Review deck | External |
| 16:30-17:00 | Team Sync | Team (6) | None | Team |

### Focus Blocks
| Block | Duration | Quality | Best For |
|-------|----------|---------|----------|
| 11:00-12:30 | 90 min | Deep Work | Heavy task, coding, writing |
| 15:00-15:30 | 30 min | Buffer | Quick emails, prep for next meeting |

### Preparation Alerts

#### High Priority
- [ ] **10:00 1:1 with Manager**: Review quarterly goals document before meeting
- [ ] **15:30 External Sync**: Review client deck, prep talking points

#### Standard
- [ ] **14:00 Design Review**: Skim the RFC linked in invite

### Tomorrow Preview
| Time | Event | Prep Needed |
|------|-------|-------------|
| 09:00 | All-Hands | None |
| 14:00 | Interview: Senior Engineer | Review resume tonight |

### Conflicts & Warnings
- ⚠️ Back-to-back: Design Review → External Sync (no buffer)
- ⚠️ External meeting at 15:30 — block 15 min before for prep
```

---

## How It Works (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          CALENDAR SCANNER                                    │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Start Scan     │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 1: FETCH TODAY'S EVENTS    │
                    │                                      │
                    │  google-workspace_get_events(        │
                    │    user_google_email: {EMAIL},       │
                    │    time_min: "YYYY-MM-DDT00:00:00Z", │
                    │    time_max: "YYYY-MM-DDT23:59:59Z", │
                    │    detailed: true                    │
                    │  )                                   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 2: FETCH TOMORROW          │
                    │                                      │
                    │  Same API call for tomorrow          │
                    │  (for preparation lookahead)         │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 3: CLASSIFY EACH MEETING   │
                    │                                      │
                    │  For each event:                     │
                    │                                      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Determine Meeting Type          │ │
                    │  │ • 2 attendees, recurring → 1:1  │ │
                    │  │ • 3+ internal → Team            │ │
                    │  │ • External domains → External   │ │
                    │  │ • No attendees → Focus/Block    │ │
                    │  │ • Admin patterns → Admin        │ │
                    │  └─────────────────────────────────┘ │
                    │                                      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Assess Prep Needed              │ │
                    │  │ • Has attachments? → Review     │ │
                    │  │ • External? → High prep         │ │
                    │  │ • 1:1 with manager? → Check     │ │
                    │  │ • Description mentions docs?    │ │
                    │  └─────────────────────────────────┘ │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 4: FIND FOCUS BLOCKS       │
                    │                                      │
                    │  Scan gaps between meetings:         │
                    │                                      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Gap Duration → Quality          │ │
                    │  │ • 90+ min → Deep Work           │ │
                    │  │ • 30-90 min → Shallow Work      │ │
                    │  │ • <30 min → Buffer              │ │
                    │  └─────────────────────────────────┘ │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 5: ASSESS COMPLEXITY       │
                    │                                      │
                    │  Count meetings → Complexity:        │
                    │  • 0-2 meetings → Light              │
                    │  • 3-4 meetings → Medium             │
                    │  • 5+ meetings → Heavy               │
                    │                                      │
                    │  Calculate total meeting hours       │
                    │  Calculate total focus time          │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 6: DETECT CONFLICTS        │
                    │                                      │
                    │  Check for:                          │
                    │  • Overlapping meetings              │
                    │  • Back-to-back with no buffer       │
                    │  • External meetings without prep    │
                    │  • Double-booked slots               │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 7: GENERATE REPORT         │
                    │                                      │
                    │  Assemble:                           │
                    │  • Day summary stats                 │
                    │  • Full grid with focus blocks       │
                    │  • Prep alerts (prioritized)         │
                    │  • Tomorrow preview                  │
                    │  • Conflicts & warnings              │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Return Report  │
                              └─────────────────┘
```

---

## Meeting Classification

### Meeting Types

| Type | Detection Signal | Typical Prep |
|------|------------------|--------------|
| **1:1** | 2 attendees, often recurring | Check goals, gather updates |
| **Team** | 3+ internal attendees | Review agenda if exists |
| **External** | External email domains | High prep — review materials, prep talking points |
| **Focus** | Blocked time, no attendees | Protect it! |
| **Admin** | Recurring admin patterns | Minimal prep |
| **Interview** | Title contains "interview" | Review candidate materials |

### Prep Priority

| Signal | Prep Level | Action |
|--------|------------|--------|
| External attendees | **High** | Review deck, prep talking points, check context |
| 1:1 with manager | **High** | Review goals, prepare updates, gather questions |
| Has attachments | **Medium** | Review attached documents |
| Description links docs | **Medium** | Skim linked materials |
| Recurring team sync | **Low** | Quick agenda check |
| Standup | **None** | Show up |

---

## Focus Block Quality

| Duration | Quality | Best For |
|----------|---------|----------|
| **90+ minutes** | Deep Work | Complex tasks, coding, writing, strategic thinking |
| **60-90 minutes** | Solid Work | Medium complexity, reviews, planning |
| **30-60 minutes** | Shallow Work | Emails, quick reviews, admin tasks |
| **<30 minutes** | Buffer | Transitions, prep for next meeting, break |

---

## Complexity Budget

Your capacity for deep work depends on meeting load:

| Meetings | Hours in Meetings | Complexity | Task Capacity |
|----------|-------------------|------------|---------------|
| 0-2 | <2 hours | **Light** | 2-3 Heavy tasks |
| 3-4 | 2-4 hours | **Medium** | 1-2 Heavy tasks |
| 5-6 | 4-6 hours | **Heavy** | 1 Light task max |
| 7+ | 6+ hours | **Survival** | Focus on meetings only |

---

## Timing

| Phase | Duration |
|-------|----------|
| Fetch today's events | ~3 sec |
| Fetch tomorrow's events | ~3 sec |
| Classification & analysis | ~5 sec |
| **Total** | **~10-15 sec** |

---

## Customization Points

| What | Where | Effect |
|------|-------|--------|
| Lookahead days | Add more API calls | Scan further ahead |
| Focus thresholds | Gap duration → Quality mapping | Adjust what counts as "deep work" |
| Complexity buckets | Meeting count ranges | Tune to your tolerance |
| Prep signals | Detection logic | Add/remove prep triggers |
| External domain list | Classification | Define what counts as "external" |

---

## Error Handling

| Error | Action |
|-------|--------|
| No calendar access | Report OAuth needed, abort scan |
| Empty calendar | Report "No meetings today! 🎉", show full day as focus |
| API rate limit | Wait and retry once |
| Event parse failure | Skip event, note in report |

---

## Related Files

| File | Purpose |
|------|---------|
| `cal-grid/SKILL.md` | Full standalone skill |
| `morning-boot.prose` | Orchestrator that calls calendar scanner |
| `context-discovery/SKILL.md` | Provides EMAIL for API calls |
