---
created: 2026-01-09
updated: 2026-01-09
---

# Morning Boot: What It Does

## The User Experience

When you run morning boot ("start my day", "morning routine"), Thoth scans your digital workspace and produces a **Daily Briefing** — a single document that tells you:

1. **What's the #1 priority today?**
2. **What are the Top 3 things to accomplish?**
3. **How heavy is your day?** (meeting load → task capacity)
4. **When can you do deep work?** (focus windows)
5. **What needs a response?** (emails, Slack messages)
6. **What meetings need prep?**

You get this in ~60 seconds without opening Gmail, Calendar, or Slack yourself.

---

## What Gets Scanned

| Source | What's Checked | Lookback |
|--------|----------------|----------|
| **Gmail** | Inbox emails | Last 24 hours |
| **Calendar** | Today's events + tomorrow preview | Today + Tomorrow |
| **Slack** | DMs, mentions, key channels | Last 24 hours |

---

## What You See (Output)

The morning boot produces a **Daily Briefing** written to:
```
work/operations/daily-log/YYYY-MM-DD/daily-briefing.md
```

### Example Output

```markdown
## Daily Briefing - 2026-01-09

### Top Priority
Respond to VP's email about Q1 roadmap — blocking team alignment

### Top 3 for Today
1. Reply to VP email with roadmap summary
2. Prep for 1:1 with manager (review quarterly goals)
3. Review PR from Sarah (promised yesterday)

### Complexity Budget
Meeting load: **Medium** (4 meetings, 3.5 hours)
Recommended task capacity: 1-2 Heavy tasks

### Deep Work Windows
- 11:00-12:30 (90 min) — Best for heavy task
- 15:30-17:00 (90 min) — Good for focused work

### Pending Responses
- [ ] Email: VP re: Q1 roadmap (URGENT)
- [ ] Email: Sarah re: PR review (ACTION)
- [ ] Slack: @tom in #platform asking about deployment

### Calendar Overview
| Time | Meeting | Prep |
|------|---------|------|
| 09:00 | Standup | None |
| 10:00 | 1:1 Manager | Review goals doc |
| 14:00 | Design Review | Read RFC |
| 16:00 | Team Sync | None |

### Preparation Alerts
- [ ] **10:00 1:1 with Manager**: Review quarterly goals document
- [ ] **14:00 Design Review**: Read the RFC shared in invite
```

---

## How It Works (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MORNING BOOT WORKFLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  "Start my day" │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 0: CONTEXT DISCOVERY       │
                    │                                      │
                    │  ~/.config/opencode/thoth.json       │
                    │           ↓                          │
                    │  {kb_root}/work/AGENTS.md            │
                    │           ↓                          │
                    │  Extract: user_google_email          │
                    └──────────────────┬───────────────────┘
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                            ▼                     ▼
                    ┌───────────────┐      ┌─────────────┐
                    │  Ready: YES   │      │  Ready: NO  │
                    └───────┬───────┘      └──────┬──────┘
                            │                     │
                            │                     ▼
                            │              ┌─────────────────┐
                            │              │ ABORT           │
                            │              │ "Run thoth link │
                            │              │  or thoth init" │
                            │              └─────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STEP 1: PARALLEL SCANS                                  │
│                                                                              │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐           │
│   │  EMAIL SCANNER  │   │ CALENDAR SCANNER│   │  SLACK SCANNER  │           │
│   │                 │   │                 │   │                 │           │
│   │ Gmail API       │   │ Calendar API    │   │ Slack API       │           │
│   │ Last 24h inbox  │   │ Today+Tomorrow  │   │ DMs, mentions   │           │
│   │                 │   │                 │   │                 │           │
│   │ Output:         │   │ Output:         │   │ Output:         │           │
│   │ - URGENT items  │   │ - Meeting list  │   │ - RESPOND items │           │
│   │ - ACTION items  │   │ - Prep needed   │   │ - REVIEW items  │           │
│   │ - FYI items     │   │ - Focus blocks  │   │ - Activity      │           │
│   └────────┬────────┘   └────────┬────────┘   └────────┬────────┘           │
│            │                     │                     │                     │
│            └─────────────────────┼─────────────────────┘                     │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 2: SYNTHESIS               │
                    │                                      │
                    │  Merge all scan results              │
                    │           ↓                          │
                    │  Apply Executive Filter              │
                    │  (What's the #1 priority?)           │
                    │           ↓                          │
                    │  Calculate Complexity Budget         │
                    │  (Meeting load → Task capacity)      │
                    │           ↓                          │
                    │  Generate Daily Briefing             │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 3: SAVE RESULTS            │
                    │                                      │
                    │  work/operations/daily-log/          │
                    │    └── YYYY-MM-DD/                   │
                    │          └── daily-briefing.md       │
                    └──────────────────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  BRIEFING SHOWN │
                              │   TO USER       │
                              └─────────────────┘
```

---

## Timing

| Phase | Duration | What Happens |
|-------|----------|--------------|
| Context Discovery | ~2 sec | Find email from config |
| Parallel Scans | ~30-45 sec | Gmail, Calendar, Slack API calls (run simultaneously) |
| Synthesis | ~10 sec | Merge results, prioritize |
| **Total** | **~45-60 sec** | Full briefing ready |

---

## Key Concepts

### Executive Filter
Not everything that's urgent is important. The synthesizer applies the Executive Filter:
- What actually needs MY attention vs. can be delegated?
- What moves the needle vs. what's just noise?
- What has real consequences if I don't act today?

### Complexity Budget
Your capacity for deep work depends on meeting load:

| Meeting Load | Meetings | Deep Work Capacity |
|--------------|----------|-------------------|
| **Light** | 0-2 | 2-3 Heavy tasks |
| **Medium** | 3-4 | 1-2 Heavy tasks |
| **Heavy** | 5+ | Focus on meetings, 1 Light task max |

### Focus Windows
Gaps between meetings where deep work is possible:

| Gap Duration | Quality |
|--------------|---------|
| 90+ minutes | Deep Work — tackle hard problems |
| 30-90 minutes | Shallow Work — emails, reviews, quick tasks |
| <30 minutes | Buffer — transitions, breaks, prep |

---

## Customization Points

You can tweak the morning boot by modifying:

| What | Where | Effect |
|------|-------|--------|
| Email lookback | `morning-boot.prose` → email_scanner | Change "newer_than:1d" |
| Priority signals | Individual skill files | Add/remove priority boosters |
| Slack channels | `slack-pulse/SKILL.md` | Define Tier 0/1/2 channels |
| Output format | `morning-boot.prose` → synthesizer | Change briefing structure |
| Complexity thresholds | `morning-boot.prose` → synthesizer | Adjust meeting load buckets |

---

## Related Files

| File | Purpose |
|------|---------|
| `morning-boot.prose` | Main workflow orchestration |
| `mail-triage/SKILL.md` | Email scanning logic |
| `cal-grid/SKILL.md` | Calendar analysis logic |
| `slack-pulse/SKILL.md` | Slack monitoring logic |
| `context-discovery/SKILL.md` | Identity resolution |
