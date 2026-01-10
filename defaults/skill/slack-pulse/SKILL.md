---
name: slack-pulse
description: Scan Slack for mentions, DMs, and high-value channel activity requiring attention.
triggers: 
template: slack-pulse-template.md
config: 
- path: work/operations/slack-map.md
as: slack_config
created: 2026-01-09
updated: 2026-01-09
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->

# Slack Pulse Skill

You are the Real-Time Pulse Monitor. Your mission is to scan Slack for messages requiring attention and surface what matters.

---

## Context Requirements (EXECUTE FIRST)

This skill requires the user's identity AND Slack channel configuration.

**Step 0 — Get Identity:**

1. **Check if passed in context**: If you received `context.identity`, use it directly.

2. **If not passed, invoke context-discovery skill**: Call `skill({ name: "context-discovery" })` and use the returned context.

3. **Store `kb_root`** for loading Slack config in Step 1.

**If discovery fails**: Stop and report the error from context-discovery.

**Step 1 — Load Slack Configuration:**

Read the Slack channel map:
```
Read: {kb_root}/work/operations/slack-map.md
```

Parse the configuration to extract:
- **Priority Channels**: Channel IDs to always scan (e.g., `C09QGBFUR4G`)
- **Tier 0 DMs**: Leadership chain usernames (scan 7 days)
- **Team DM Anchors**: Team member usernames (scan 2 days)
- **Stakeholder DM Anchors**: Key stakeholder usernames (scan 2 days)
- **Exclusion Patterns**: Patterns to skip (e.g., `#in-*`, `#alerts-*`)

**If slack-map.md not found**: Fall back to basic mention scanning only.

---

## When to Use

- Morning boot Slack scan
- "Check my Slack"
- "Any messages I need to respond to?"
- "What's happening on Slack?"

---

## Tools Required

| Action | Tool | Parameters |
|--------|------|------------|
| List channels | slack_channels_list | `channel_types: "public_channel,private_channel,im,mpim"` |
| Get channel history | slack_conversations_history | `channel_id`, `limit: "1d"` or `"7d"` |
| Get thread replies | slack_conversations_replies | `channel_id`, `thread_ts` |
| Search messages | slack_conversations_search_messages | `filter_date_during: "today"` |
| Write output | write | `work/operations/daily-log/YYYY-MM-DD/slack-pulse.md` |

---

## Execution Protocol

### Phase 1: Identify Channels to Scan

Use the parsed `slack-map.md` configuration:

| Source | Config Section | Lookback |
|--------|----------------|----------|
| Priority Channels | `Priority Channels` table | 1 day |
| Leadership DMs | `Tier 0: Critical DMs` table | 7 days |
| Team DMs | `Team DM Anchors` table | 2 days |
| Stakeholder DMs | `Stakeholder DM Anchors` table | 2 days |
| All mentions | Search | 1 day |

**For Priority Channels** (those with Channel IDs):
```
slack_conversations_history(
  channel_id={channel_id},  # e.g., "C09QGBFUR4G"
  limit="1d"
)
```

**For DMs** (use @username):
```
slack_conversations_history(
  channel_id="@{username}",  # e.g., "@vasco.taveira"
  limit="7d"  # or "2d" for team/stakeholder
)
```

### Phase 2: Scan for Mentions

Search for messages mentioning the user:
```
slack_conversations_search_messages(
  filter_date_during="today",
  filter_users_with="@me"
)
```

### Phase 3: Scan Priority DMs

For each Tier 0/1 DM or channel:
```
slack_conversations_history(
  channel_id={channel_id},
  limit="1d"
)
```

### Phase 4: Fetch Thread Context

For items needing response, get full thread:
```
slack_conversations_replies(
  channel_id={channel_id},
  thread_ts={thread_ts}
)
```

### Phase 5: Classify Messages

For each message, determine action needed:

| Classification | Criteria | Action |
|----------------|----------|--------|
| **RESPOND** | Direct question, request, blocking issue | Needs reply |
| **MONITOR** | FYI, discussion to track | Watch but no action |
| **IGNORE** | Noise, already handled | Skip |

**Priority Boosters:**

| Signal | Boost |
|--------|-------|
| From manager or skip-level | +2 |
| From direct report | +1 |
| Contains "urgent", "blocker", "help" | +1 |
| Unanswered >4 hours | +1 |
| Thread with multiple replies | +1 |

---

## Output Format

**Template:** Read `slack-pulse-template.md` from this skill folder.

**Output path:** `work/operations/daily-log/YYYY-MM-DD/slack-pulse.md`

Fill the template placeholders with scan results:

| Placeholder | Value |
|-------------|-------|
| `{{DATE}}` | Today's date (YYYY-MM-DD) |
| `{{TIME}}` | Scan completion time (HH:MM) |
| `{{CHANNELS_SCANNED}}` | Number of channels scanned |
| `{{DMS_CHECKED}}` | Number of DMs checked |
| `{{RESPOND_COUNT}}` | Items needing response |
| `{{MONITOR_COUNT}}` | Items to monitor |
| `{{NOISE_COUNT}}` | Items filtered as noise |
| `{{RESPOND_ITEMS_TABLE}}` | Table rows for RESPOND items |
| `{{MONITOR_ITEMS_TABLE}}` | Table rows for MONITOR items |
| `{{ANCHOR_CANDIDATES_TABLE}}` | Table rows for anchor candidates |
| `{{PRIORITY_CHANNELS_TABLE}}` | Scan summary per priority channel |
| `{{TIER0_DMS_TABLE}}` | Scan summary per leadership DM |
| `{{TEAM_DMS_TABLE}}` | Scan summary per team DM |
| `{{STAKEHOLDER_DMS_TABLE}}` | Scan summary per stakeholder DM |
| `{{IMMEDIATE_ACTIONS}}` | Bulleted list of urgent responses |
| `{{WATCH_LIST}}` | Bulleted list of items to monitor |
| `{{CHANNEL_HEALTH_NOTES}}` | Any observations about channel usage |

**Critical:** Output MUST include `## SCAN_DATA_START` and `## SCAN_DATA_END` markers for parsing.

---

## Completion Checklist

- [ ] Context discovery completed
- [ ] Channels listed and prioritized
- [ ] Mentions scanned
- [ ] Priority DMs checked
- [ ] Thread context fetched for RESPOND items
- [ ] Messages classified (RESPOND/MONITOR/IGNORE)
- [ ] Output written to `work/operations/daily-log/YYYY-MM-DD/slack-pulse.md`
- [ ] SCAN_DATA markers included

---

## Error Handling

| Error | Action |
|-------|--------|
| No Slack access | Report OAuth/token needed, stop |
| Rate limited | Wait and retry with smaller batch |
| Channel not found | Skip and note in output |

---

## Channel Discovery

If you encounter high-signal messages from unknown channels, flag them as "Anchor Candidates" for future Tier 1 monitoring:

```markdown
### Anchor Candidates
| Channel | Reason | Recommendation |
|---------|--------|----------------|
| #new-project | Multiple relevant discussions | Add to Tier 1 |
```
