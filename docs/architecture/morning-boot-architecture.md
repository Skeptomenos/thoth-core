---
created: 2026-01-09
updated: 2026-01-09
---

# Morning Boot Architecture

> **Purpose**: Complete technical documentation of the morning boot workflow for refinement and debugging.
> **Last Updated**: 2026-01-09
> **Status**: Working (v1.1) — tool names fixed, OpenProse executable

---

## Overview

Morning boot is a parallel workflow that scans email, calendar, and Slack, then synthesizes results into a daily briefing. It runs 3 agents simultaneously for speed (~30-45s total vs ~100s sequential).

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  email_scanner  │  │ calendar_scanner│  │  slack_scanner  │
│     (bg task)   │  │    (bg task)    │  │    (bg task)    │
│                 │  │                 │  │                 │
│  ~46s runtime   │  │   ~24s runtime  │  │   ~34s runtime  │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │   Thoth (main)  │
                    │                 │
                    │  Synthesizes    │
                    │  all 3 outputs  │
                    │  into briefing  │
                    └─────────────────┘
```

---

## Trigger & Invocation

### How It's Triggered

| Trigger Phrase | Defined In | Action |
|----------------|------------|--------|
| "start my day" | `thoth-kb/work/AGENTS.md` | Should invoke `skill: morning-boot` |
| "morning routine" | `thoth-kb/work/AGENTS.md` | Should invoke `skill: morning-boot` |
| "morning boot" | `thoth-kb/work/AGENTS.md` | Should invoke `skill: morning-boot` |
| "daily briefing" | `thoth-kb/work/AGENTS.md` | Should invoke `skill: morning-boot` |

### How It's Actually Executed (Current State)

The OpenProse `.prose` file is **not yet executable** — there's no `/prose-run` command implemented. Instead, Thoth manually:

1. Reads the `.prose` file for agent definitions
2. Fires 3 `background_task` calls in parallel
3. Waits for all 3 to complete
4. Synthesizes results in the main session

### Files Involved

| File | Purpose |
|------|---------|
| `thoth-kb/.opencode/skill/morning-boot/SKILL.md` | Skill definition, triggers, fallback logic |
| `thoth-kb/.opencode/skill/morning-boot/morning-boot.prose` | OpenProse workflow (agent definitions, execution flow) |
| `thoth-kb/work/AGENTS.md` | MCP identity config (`user_google_email`) |

---

## Technical Execution

### Step 1: Fire Parallel Agents

Thoth fires 3 `background_task` calls simultaneously:

```typescript
// All 3 fire at once (parallel)
background_task({ agent: "general", prompt: EMAIL_SCANNER_PROMPT, description: "Email triage scan" })
background_task({ agent: "general", prompt: CALENDAR_SCANNER_PROMPT, description: "Calendar analysis scan" })
background_task({ agent: "general", prompt: SLACK_SCANNER_PROMPT, description: "Slack pulse scan" })
```

### Step 2: Wait for Completion

System sends notifications as each completes:
```
[BACKGROUND TASK COMPLETED] Task "Calendar analysis scan" finished in 24s.
[BACKGROUND TASK COMPLETED] Task "Email triage scan" finished in 46s.
[BACKGROUND TASK COMPLETED] Task "Slack pulse scan" finished in 34s.
```

### Step 3: Retrieve Results

```typescript
background_output({ task_id: "bg_xxxxx" })  // For each task
```

### Step 4: Synthesize

Thoth (main session) combines all 3 outputs into a single daily briefing. This is currently done by Thoth directly, not by a separate synthesizer agent.

---

## Agent: Email Scanner

### Identity

| Property | Value |
|----------|-------|
| Agent Type | `general` (via background_task) |
| Runtime | ~46 seconds |
| MCP Tools Used | `google-workspace_search_gmail_messages`, possibly `google-workspace_get_gmail_message_content` |

### Prompt (Current)

```
You are the Email Triage Specialist.

**Your Mission**: Scan recent emails and categorize them by urgency.

**Step 1 - Identity**:
Use this email for all google-workspace tools: david.helmus@hellofresh.com

**Step 2 - Scan Emails**:
Use google-workspace_search_gmail_messages with:
- user_google_email: david.helmus@hellofresh.com
- query: "newer_than:1d"
- page_size: 30

**Step 3 - Categorize**:
For each email, assign one category:
- URGENT: Needs response TODAY (blockers, exec requests, incidents)
- ACTION: Needs response THIS WEEK (normal work items)
- FYI: Informational only (newsletters, notifications, CC'd items)

**Output Format**:
Return a structured report:
```
## Email Triage Report

### URGENT (X items)
- [Sender] Subject - Recommended action

### ACTION (X items)
- [Sender] Subject - Recommended action

### FYI (X items)
- [Sender] Subject
```

If there are errors accessing Gmail, report the error clearly.
```

### Tool Calls Made

| Order | Tool | Parameters | Purpose |
|-------|------|------------|---------|
| 1 | `google-workspace_search_gmail_messages` | `user_google_email`, `query: "newer_than:1d"`, `page_size: 30` | Get list of recent emails (page_size, NOT max_results) |
| 2+ | `google-workspace_get_gmail_message_content` (optional) | `message_id` | Read full content if needed |

### Output Format

```markdown
## Email Triage Report

### URGENT (2 items)
- [Microsoft Azure via IAM Team] Alert 'IdentityRiskEvent...' - Review immediately

### ACTION (2 items)
- [Tiffany Villa] Invitation: L2 Task Volume Reduction - Respond to invite

### FYI (26 items)
- [Perry Elento] EOW Summary | Perry 09.01.2026
...
```

### Known Issues

| Issue | Impact | Proposed Fix |
|-------|--------|--------------|
| No pre-filtering of automated emails | PIM alerts, noreply@ clutter FYI section | Add query exclusions: `-from:noreply@* -from:*@microsoft.com` |
| No sender prioritization | Exec emails treated same as random | Inject sender priority list or check `work/people/` |
| One-size query for all days | Monday morning misses weekend emails | Detect day-of-week, adjust `newer_than:` |
| No "already read" filtering | May surface emails already handled | Add `-is:read` or track in KB |
| Categorization is pure LLM vibes | Inconsistent between runs | Add explicit rules for common patterns |

### Optimization Ideas

**Pre-filter query:**
```
query: "newer_than:1d -from:noreply@* -from:*notifications* -category:promotions -category:updates"
```

**Two-tier categorization:**
```
TIER 1 (Auto-rules):
- From: [manager], [skip-level], [exec list] → URGENT
- Subject contains: "urgent", "asap", "blocker", "p0" → URGENT
- From: *@microsoft.com, *@google.com (system) → FYI
- From: noreply@*, notifications@* → FYI

TIER 2 (LLM judgment):
- Everything else → LLM decides ACTION vs FYI
```

---

## Agent: Calendar Scanner

### Identity

| Property | Value |
|----------|-------|
| Agent Type | `general` (via background_task) |
| Runtime | ~24 seconds |
| MCP Tools Used | `google-workspace_get_events` |

### Prompt (Current)

```
You are the Calendar Analyst.

**Your Mission**: Analyze today's calendar and identify preparation needed.

**Step 1 - Identity**:
Use this email for all google-workspace tools: david.helmus@hellofresh.com

**Step 2 - Get Today's Events**:
Use google-workspace_get_events with:
- user_google_email: david.helmus@hellofresh.com
- time_min: 2026-01-09T00:00:00Z
- time_max: 2026-01-09T23:59:59Z
- detailed: true

**Step 3 - Analyze Each Meeting**:
For each meeting identify:
- Prep required (documents to review, context to gather)
- Key attendees and their roles
- Your role (presenter, participant, optional)
- Conflicts or back-to-back issues

**Step 4 - Identify Time Blocks**:
Find gaps of 1+ hours for deep work.

**Output Format**:
```
## Calendar Analysis

### Meeting Load
- Total meetings: X
- Total meeting hours: X
- Complexity: Light/Medium/Heavy

### Meetings Requiring Prep
| Time | Meeting | Prep Needed |
|------|---------|-------------|

### Conflicts/Warnings
- [Any back-to-back or overlap issues]

### Deep Work Blocks
- [Time ranges available for focused work]
```

If there are errors accessing Calendar, report the error clearly.
```

### Tool Calls Made

| Order | Tool | Parameters | Purpose |
|-------|------|------------|---------|
| 1 | `google-workspace_get_events` | `user_google_email`, `time_min` (RFC3339), `time_max` (RFC3339), `detailed: true` | Get today's calendar (NOT list_calendar_events) |

### Output Format

```markdown
## Calendar Analysis

### Meeting Load
- Total meetings: 3
- Total meeting hours: 2.5 hours
- Complexity: Light

### Meetings Requiring Prep
| Time | Meeting | Prep Needed |
|------|---------|-------------|
| 10:00-11:00 | Google team planning | Review permissions structure |

### Conflicts/Warnings
- None detected

### Deep Work Blocks
- 13:05-15:30 (2.5 hours) - Best block
```

### Known Issues

| Issue | Impact | Proposed Fix |
|-------|--------|--------------|
| Date is hardcoded in prompt | Thoth must compute date each time | Use dynamic date injection |
| No timezone awareness | UTC vs local confusion | Inject user's timezone |
| No attendee enrichment | Doesn't know who people are | Cross-reference `work/people/` |
| "Prep needed" is guesswork | Agent invents prep requirements | Check for linked docs, past meetings |
| Doesn't check tomorrow | Misses evening prep for morning meetings | Add tomorrow lookahead option |

### Optimization Ideas

**Attendee enrichment:**
```
For each attendee, check if they exist in work/people/:
- If found: Include their role, relationship, recent context
- If not found: Note as "unknown - may want to research"
```

**Prep intelligence:**
```
Check meeting description for:
- Linked documents (Google Docs, Slides) → "Review [doc name]"
- Agenda items → Extract and list
- Previous meeting in series → "Check notes from last session"
```

---

## Agent: Slack Scanner

### Identity

| Property | Value |
|----------|-------|
| Agent Type | `general` (via background_task) |
| Runtime | ~34 seconds |
| MCP Tools Used | `slack_channels_list`, `slack_conversations_search_messages`, `slack_conversations_history` |

### Prompt (Current)

```
You are the Slack Monitor.

**Your Mission**: Check recent Slack activity and identify items needing attention.

**Step 1 - List Channels**:
Use slack_channels_list with channel_types: "public_channel,private_channel,im,mpim"

**Step 2 - Search for Mentions**:
Use slack_conversations_search_messages to search for recent activity (last 24 hours).

**Step 3 - Scan DMs**:
Check direct message channels for unread or recent messages.

**Step 4 - Categorize**:
- RESPOND: DMs or mentions needing a reply
- REVIEW: Threads to catch up on
- NOISE: Can be ignored

**Output Format**:
```
## Slack Pulse

### Needs Response (X items)
- [Channel/DM] From: [person] - Summary

### Review Later (X items)
- [Channel] Thread summary

### Activity Summary
- Active channels: X
- Unread DMs: X
```

If there are errors accessing Slack, report the error clearly.
```

### Tool Calls Made

| Order | Tool | Parameters | Purpose |
|-------|------|------------|---------|
| 1 | `slack_channels_list` | `channel_types: "public_channel,private_channel,im,mpim"` | Get all channels |
| 2 | `slack_conversations_search_messages` | `query`, date filters | Find mentions/activity |
| 3+ | `slack_conversations_history` | `channel_id` | Read specific channels |

### Output Format

```markdown
## Slack Pulse

### Needs Response (1 item)
- #tier1-enterprise-ai-architecture - From: Ali Altay - Confirmed next steps

### Review Later (2 items)
- #clan-genai - Mario shared Slack MCP news

### Activity Summary
- Active channels: 50+
- Unread DMs: 0
```

### Known Issues

| Issue | Impact | Proposed Fix |
|-------|--------|--------------|
| No explicit @mention search | May miss direct mentions | Search specifically for `<@USER_ID>` |
| Channel list is huge (50+) | Wastes tokens listing all | Filter to priority channels only |
| No priority channel concept | #random treated same as #incidents | Define priority channel list |
| "Unread" detection unclear | Slack API doesn't expose unread easily | May need different approach |
| DM scanning is broad | Could be slow with many DMs | Limit to last N DMs or time window |

### Optimization Ideas

**Priority channels:**
```
PRIORITY_CHANNELS = [
  "#incidents",
  "#tier1-*",
  "#team-identity",
  "DMs from manager"
]

Scan priority channels first, others only if time permits
```

**Mention-focused search:**
```
Search for: "<@U123USERID>" in last 24h
This catches direct @mentions specifically
```

---

## Synthesis Step

### Current Implementation

Synthesis is done by Thoth (main session) after collecting all 3 scanner outputs. There is a `synthesizer` agent defined in the `.prose` file but it's not used.

### What Thoth Does

1. Reads all 3 outputs
2. Identifies top priority (usually URGENT email or critical meeting)
3. Creates "Top 3 for Today" from across all sources
4. Calculates complexity budget based on meeting load
5. Lists deep work windows from calendar
6. Compiles pending responses from email + slack
7. Formats final briefing

### Output Format

```markdown
## Daily Briefing — Friday, January 9, 2026

### Top Priority
[Single most important thing]

### Top 3 for Today
1. [Priority 1]
2. [Priority 2]
3. [Priority 3]

### Complexity Budget
Meeting load: Light/Medium/Heavy
Task capacity: X Heavy / Y Light tasks

### Deep Work Windows
- [Time blocks]

### Pending Responses
- [ ] [Items needing reply]

### Calendar Overview
[Quick meeting summary]
```

---

## Configuration & Identity

### MCP Identity (Required)

All google-workspace tools require `user_google_email` parameter.

| Context | Email | Defined In |
|---------|-------|------------|
| Work | `david.helmus@hellofresh.com` | `thoth-kb/work/AGENTS.md` |
| Personal | `david@helmus.me` | `thoth-kb/life/AGENTS.md` |

### Current Approach

Email is **hardcoded in the prompt** sent to each agent:
```
Use this email for all google-workspace tools: david.helmus@hellofresh.com
```

This works but isn't elegant. Future improvement: inject from config.

---

## Post-Workflow Actions

### Defined in SKILL.md (Not Yet Implemented)

After workflow completes, should:

1. Create folder: `work/operations/daily-log/YYYY-MM-DD/`
2. Save files:
   - `mail-triage.md` — Email scan results
   - `cal-grid.md` — Calendar analysis  
   - `slack-pulse.md` — Slack activity
   - `daily-log.md` — Synthesized briefing

### Current State

Files are **not saved automatically**. Thoth presents briefing verbally only.

---

## Performance Profile

| Component | Duration | Notes |
|-----------|----------|-------|
| Email Scanner | ~46s | Slowest — may be reading email bodies |
| Calendar Scanner | ~24s | Fast — single API call |
| Slack Scanner | ~34s | Medium — multiple channel scans |
| **Total (parallel)** | **~46s** | Limited by slowest agent |
| Synthesis | ~5s | Thoth's own processing |

### Comparison to Sequential

If run sequentially: 46 + 24 + 34 = **104 seconds**
Parallel execution: **46 seconds** (2.3x faster)

---

## Known Bugs & Issues

### Critical

| Issue | Status | Notes |
|-------|--------|-------|
| OpenProse not executable | **Fixed** | OpenProse skill IS installed at `~/.config/opencode/skill/open-prose/` — use `/prose-run` |
| Files not saved to daily-log | Not Implemented | Need to add post-workflow step |
| ~~Tool name mismatch in .prose~~ | **Fixed 2026-01-09** | Changed `list_calendar_events` → `get_events` |
| ~~Email param mismatch~~ | **Fixed 2026-01-09** | Changed `max_results` → `page_size` |

### Medium

| Issue | Status | Notes |
|-------|--------|-------|
| Email noise (PIM, noreply) | Needs Fix | Add query filters |
| No sender prioritization | Needs Fix | Add exec list / people lookup |
| Hardcoded date in calendar | Needs Fix | Dynamic date injection |
| Slack channel overload | Needs Fix | Priority channel filtering |

### Low

| Issue | Status | Notes |
|-------|--------|-------|
| Model spec in .prose ignored | Known | background_task uses global model |
| Synthesizer agent unused | Known | Thoth synthesizes directly |
| No Monday/weekend detection | Enhancement | Adjust time windows by day |

---

## Improvement Roadmap

### Phase 1: Prompt Fixes (Quick Wins)
- [ ] Add email query filters for noise
- [ ] Fix tool names in .prose to match actual MCP
- [ ] Add dynamic date injection
- [ ] Define priority Slack channels

### Phase 2: Intelligence (Medium Effort)
- [ ] Sender prioritization (exec list, manager detection)
- [ ] Attendee enrichment from `work/people/`
- [ ] Cross-reference meetings with projects

### Phase 3: Persistence (Infrastructure)
- [ ] Auto-save outputs to daily-log folder
- [ ] Track "already triaged" emails to avoid duplicates
- [ ] Build historical patterns (typical meeting load, etc.)

### Phase 4: Advanced (Future)
- [ ] Implement OpenProse runner
- [ ] Add Jira/tasks scanner
- [ ] Add "what slipped from yesterday" check
- [ ] Predictive prep (what will you need this afternoon?)

---

## Testing

### Manual Test Command

```
"test morning boot"
```

Thoth will:
1. Read the .prose file
2. Fire 3 background_task agents
3. Wait for completion
4. Synthesize and present briefing

### Verification Checklist

- [ ] All 3 agents complete without error
- [ ] Email triage shows URGENT/ACTION/FYI sections
- [ ] Calendar shows meeting load and deep work blocks
- [ ] Slack shows needs-response items
- [ ] Final briefing includes Top 3 and complexity budget

---

## Related Documentation

- `thoth-core/docs/opencode-sdk-limitations.md` — Why we use background_task instead of SDK
- `thoth-kb/work/AGENTS.md` — MCP identity configuration
- `thoth-kb/.opencode/skill/morning-boot/SKILL.md` — Skill definition
