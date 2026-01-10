---
created: 2026-01-09
updated: 2026-01-09
---

# Email Scanner: What It Does

## Purpose

The Email Scanner triages your inbox and categorizes emails by urgency so you know what needs attention today vs. what can wait.

---

## The User Experience

When the email scanner runs, it answers:

1. **What emails need a response TODAY?** (URGENT)
2. **What needs attention THIS WEEK?** (ACTION)
3. **What's just informational?** (FYI)

You get a prioritized list instead of an overwhelming inbox count.

---

## What Gets Scanned

| Source | Query | Lookback |
|--------|-------|----------|
| Gmail Inbox | `newer_than:1d` | Last 24 hours |

**API Used**: `google-workspace_search_gmail_messages`

---

## What You See (Output)

```markdown
## Email Triage Report

### URGENT (2 items)
- [VP Engineering] Q1 Roadmap Review needed — Blocking team alignment, respond today
- [On-call] Production alert resolved — Acknowledge receipt

### ACTION (5 items)
- [Sarah] PR Review request — Review by EOD tomorrow
- [Manager] 1:1 agenda items — Add topics before Thursday
- [HR] Benefits enrollment reminder — Deadline Friday
- [Tom] Architecture RFC feedback — Review this week
- [Platform Team] Migration timeline — Confirm dates

### FYI (8 items)
- [Newsletter] Weekly engineering digest
- [Jira] 3 tickets updated
- [GitHub] PR merged notifications
- [Calendar] Meeting reminders
- ... (additional FYI items)
```

---

## How It Works (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EMAIL SCANNER                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Start Scan     │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 1: QUERY INBOX             │
                    │                                      │
                    │  google-workspace_search_gmail_      │
                    │  messages(                           │
                    │    user_google_email: {EMAIL},       │
                    │    query: "newer_than:1d",           │
                    │    page_size: 30                     │
                    │  )                                   │
                    │                                      │
                    │  Paginate until inbox exhausted      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 2: BATCH READ THREADS      │
                    │                                      │
                    │  google-workspace_get_gmail_         │
                    │  threads_content_batch(              │
                    │    thread_ids: [...],                │
                    │    user_google_email: {EMAIL}        │
                    │  )                                   │
                    │                                      │
                    │  Get full context for each thread    │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 3: CLASSIFY EACH EMAIL     │
                    │                                      │
                    │  For each email:                     │
                    │                                      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Check Priority Signals          │ │
                    │  │ • From manager/skip-level? +2   │ │
                    │  │ • From direct report? +1        │ │
                    │  │ • Contains "urgent"? +1         │ │
                    │  │ • In TO: (not CC)? +1           │ │
                    │  │ • Unanswered >24h? +1           │ │
                    │  └─────────────────────────────────┘ │
                    │                                      │
                    │  Assign category based on score:     │
                    │  • Score ≥ 3 → URGENT                │
                    │  • Score 1-2 → ACTION                │
                    │  • Score 0   → FYI                   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 4: GENERATE REPORT         │
                    │                                      │
                    │  Group by category:                  │
                    │  • URGENT: Needs response TODAY      │
                    │  • ACTION: Needs response THIS WEEK  │
                    │  • FYI: Informational only           │
                    │                                      │
                    │  Add recommended action for each     │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Return Report  │
                              └─────────────────┘
```

---

## Classification Logic

### Priority Boosters

| Signal | Boost | Rationale |
|--------|-------|-----------|
| From manager or skip-level | +2 | Leadership requests are high priority |
| From direct report | +1 | Team needs are important |
| Contains "urgent", "blocker", "ASAP" | +1 | Explicit urgency signals |
| Contains deadline language | +1 | Time-sensitive |
| In TO: field (not CC:) | +1 | Directly addressed to you |
| Unanswered >24 hours | +1 | Aging requests need attention |

### Category Thresholds

| Score | Category | Meaning |
|-------|----------|---------|
| ≥3 | **URGENT** | Respond TODAY — blockers, exec requests, incidents |
| 1-2 | **ACTION** | Respond THIS WEEK — normal work items |
| 0 | **FYI** | Informational — newsletters, notifications, CC'd |

### Auto-FYI Rules

These go straight to FYI regardless of sender:
- Automated notifications (Jira, GitHub, Calendar)
- Newsletters and digests
- CC'd emails where you're not in TO:
- Already-replied threads

---

## Meeting Notes Detection

The email scanner also watches for meeting notes or transcripts:

```
### Meeting Notes Detected
- [Fireflies] 1:1 with Manager transcript — Ready for processing
- [Otter.ai] Design Review notes — Ready for processing
```

These can be handed off to the `chronicler` agent for extraction.

---

## Timing

| Phase | Duration |
|-------|----------|
| Query inbox | ~5 sec |
| Batch read threads | ~10-15 sec |
| Classification | ~5 sec |
| **Total** | **~20-25 sec** |

---

## Customization Points

| What | Where | Effect |
|------|-------|--------|
| Lookback window | `query: "newer_than:1d"` | Change to 2d, 3d, etc. |
| Batch size | `page_size: 30` | Increase for busier inboxes |
| Priority signals | Priority Boosters table | Add/remove signals |
| Category thresholds | Score ranges | Adjust sensitivity |
| Auto-FYI rules | Classification logic | Add sender patterns to skip |

---

## Error Handling

| Error | Action |
|-------|--------|
| No Gmail access | Report OAuth needed, abort scan |
| Empty inbox | Report "No new emails", return empty report |
| API rate limit | Wait and retry once |
| Thread read failure | Skip thread, note in report |

---

## Related Files

| File | Purpose |
|------|---------|
| `mail-triage/SKILL.md` | Full standalone skill (more detailed) |
| `morning-boot.prose` | Orchestrator that calls email scanner |
| `context-discovery/SKILL.md` | Provides EMAIL for API calls |
