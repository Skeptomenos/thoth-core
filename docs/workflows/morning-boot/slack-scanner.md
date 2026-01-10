---
created: 2026-01-09
updated: 2026-01-09
---

# Slack Scanner: What It Does

## Purpose

The Slack Scanner monitors your Slack workspace for messages that need your attention — DMs, mentions, and activity in key channels — so you don't miss anything important while avoiding the noise.

---

## The User Experience

When the slack scanner runs, it answers:

1. **What messages need a response?** (RESPOND items)
2. **What threads should I catch up on?** (MONITOR items)
3. **What's the activity level?** (Pulse summary)
4. **Are there channels I should watch?** (Anchor candidates)

You get a prioritized list of Slack items instead of scrolling through every channel.

---

## What Gets Scanned

| Source | What's Checked | Lookback |
|--------|----------------|----------|
| DMs (Tier 0) | Leadership, skip-level | 7 days |
| DMs (Tier 1) | Direct reports, key peers | 2 days |
| Channel mentions | Any @you or @here you're in | 1 day |
| Key channels | Team channels, announcements | 1 day |

**APIs Used**: 
- `slack_channels_list`
- `slack_conversations_history`
- `slack_conversations_replies`
- `slack_conversations_search_messages`

---

## What You See (Output)

```markdown
## Slack Pulse

### Summary
- **Respond Items**: 3 messages need response
- **Monitor Items**: 5 threads to watch
- **Channels Scanned**: 12
- **Unread DMs**: 4

### RESPOND (3 items)

| Priority | Source | From | Preview | Action |
|----------|--------|------|---------|--------|
| P0 | DM | @manager | "Quick sync today?" | Confirm availability |
| P1 | #platform | @sarah | "Can you review the PR?" | Review PR #1234 |
| P1 | DM | @tom | "Blocker on deployment" | Unblock Tom |

### MONITOR (5 items)

| Source | Topic | Why Watch |
|--------|-------|-----------|
| #engineering | Architecture RFC discussion | You're mentioned in thread |
| #team-updates | Q1 planning thread | Relevant to your projects |
| #incidents | Yesterday's outage postmortem | Awareness |
| DM | @peer | Ongoing async discussion |
| #announcements | Leadership update | Strategic context |

### Activity Heatmap
| Channel | Messages (24h) | Your Involvement |
|---------|----------------|------------------|
| #platform | 47 | 3 mentions |
| #engineering | 23 | Subscribed |
| #team-updates | 12 | Member |
| #random | 89 | — |

### Anchor Candidates
| Channel | Reason | Recommendation |
|---------|--------|----------------|
| #new-project | Multiple relevant discussions | Consider adding to Tier 1 |
```

---

## How It Works (ASCII Diagram)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SLACK SCANNER                                      │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │  Start Scan     │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 1: LIST CHANNELS           │
                    │                                      │
                    │  slack_channels_list(                │
                    │    channel_types: "public_channel,   │
                    │      private_channel,im,mpim"        │
                    │  )                                   │
                    │                                      │
                    │  Categorize into Tiers:              │
                    │  • Tier 0: Leadership DMs            │
                    │  • Tier 1: Team channels, reports    │
                    │  • Tier 2: Everything else           │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 2: SEARCH MENTIONS         │
                    │                                      │
                    │  slack_conversations_search_         │
                    │  messages(                           │
                    │    filter_date_during: "today",      │
                    │    filter_users_with: "@me"          │
                    │  )                                   │
                    │                                      │
                    │  Find all @mentions in last 24h      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 3: SCAN PRIORITY DMs       │
                    │                                      │
                    │  For each Tier 0/1 DM:               │
                    │                                      │
                    │  slack_conversations_history(        │
                    │    channel_id: {dm_id},              │
                    │    limit: "2d"  (or 7d for Tier 0)   │
                    │  )                                   │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 4: GET THREAD CONTEXT      │
                    │                                      │
                    │  For items needing response:         │
                    │                                      │
                    │  slack_conversations_replies(        │
                    │    channel_id: {channel},            │
                    │    thread_ts: {thread_ts}            │
                    │  )                                   │
                    │                                      │
                    │  Understand full conversation        │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 5: CLASSIFY MESSAGES       │
                    │                                      │
                    │  For each message:                   │
                    │                                      │
                    │  ┌─────────────────────────────────┐ │
                    │  │ Check Priority Signals          │ │
                    │  │ • From manager/skip-level? +2   │ │
                    │  │ • From direct report? +1        │ │
                    │  │ • Contains question? +1         │ │
                    │  │ • Contains "urgent/help"? +1    │ │
                    │  │ • Unanswered >4h? +1            │ │
                    │  │ • Multiple replies waiting? +1  │ │
                    │  └─────────────────────────────────┘ │
                    │                                      │
                    │  Assign category:                    │
                    │  • Score ≥ 2 → RESPOND               │
                    │  • Score 1   → MONITOR               │
                    │  • Score 0   → IGNORE                │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 6: DETECT ANCHOR CHANNELS  │
                    │                                      │
                    │  If high-signal messages come from   │
                    │  channels not in Tier 0/1:           │
                    │                                      │
                    │  → Flag as "Anchor Candidate"        │
                    │  → Suggest adding to Tier 1          │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │      STEP 7: GENERATE REPORT         │
                    │                                      │
                    │  Assemble:                           │
                    │  • Summary stats                     │
                    │  • RESPOND items (prioritized)       │
                    │  • MONITOR items                     │
                    │  • Activity heatmap                  │
                    │  • Anchor candidates                 │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Return Report  │
                              └─────────────────┘
```

---

## Tiered Channel System

### Why Tiers?

Not all Slack channels are equal. Scanning everything wastes time and creates noise. Tiers focus attention where it matters.

### Tier Definitions

| Tier | Channels | Lookback | Rationale |
|------|----------|----------|-----------|
| **Tier 0** | DMs with manager, skip-level, execs | 7 days | Never miss leadership |
| **Tier 1** | Direct report DMs, team channels, key projects | 2 days | Core work context |
| **Tier 2** | All other channels, general mentions | 1 day | Awareness only |

### Priority Within Tiers

| Signal | Priority Boost | Rationale |
|--------|----------------|-----------|
| From manager or skip-level | +2 | Leadership requests |
| From direct report | +1 | Team needs |
| Direct question to you | +1 | Explicit request |
| Contains "urgent", "blocker", "help" | +1 | Urgency signals |
| Unanswered >4 hours | +1 | Aging request |
| Thread with multiple replies | +1 | Active discussion |

---

## Message Classification

### RESPOND vs MONITOR vs IGNORE

| Category | Criteria | Action |
|----------|----------|--------|
| **RESPOND** | Direct question, request, you're blocking someone | Reply needed |
| **MONITOR** | FYI, discussion to track, context to absorb | Watch, no action |
| **IGNORE** | Noise, already handled, not relevant | Skip |

### Auto-IGNORE Patterns

- Bot messages (unless actionable)
- Emoji-only reactions
- Messages you already replied to
- Channels marked as low-priority
- @here/@channel in large channels (unless Tier 0)

---

## Anchor Discovery

The scanner watches for high-signal messages from channels not in your Tier 0/1 list:

**Signals that suggest a channel should be promoted:**
- Multiple relevant discussions in short period
- Important people posting there
- Topics directly related to your work
- Decisions being made you should know about

**Output:**
```markdown
### Anchor Candidates
| Channel | Reason | Recommendation |
|---------|--------|----------------|
| #new-project | 3 relevant discussions today | Add to Tier 1 |
| #architecture | RFC discussion you should join | Add to Tier 1 |
```

---

## Timing

| Phase | Duration |
|-------|----------|
| List channels | ~2 sec |
| Search mentions | ~3 sec |
| Scan priority DMs | ~10 sec |
| Get thread context | ~5 sec |
| Classification | ~3 sec |
| **Total** | **~20-25 sec** |

---

## Customization Points

| What | Where | Effect |
|------|-------|--------|
| Tier 0 people | Tier definitions | Who gets 7-day lookback |
| Tier 1 channels | Tier definitions | Which channels get priority |
| Lookback windows | Tier settings | How far back to scan |
| Priority signals | Classification logic | What triggers RESPOND |
| Auto-ignore patterns | Classification | What to skip |

---

## Error Handling

| Error | Action |
|-------|--------|
| No Slack access | Report token needed, abort scan |
| Rate limited | Wait 60 sec, retry with smaller batch |
| Channel not found | Skip, note in report |
| Empty result | Report "No Slack activity", return summary |

---

## Related Files

| File | Purpose |
|------|---------|
| `slack-pulse/SKILL.md` | Full standalone skill |
| `morning-boot.prose` | Orchestrator that calls slack scanner |
| `context-discovery/SKILL.md` | Provides context for API calls |
