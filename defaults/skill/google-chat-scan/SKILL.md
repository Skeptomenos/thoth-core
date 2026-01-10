---
name: google-chat-scan
description: Use when needing to scan Google Chat spaces for messages, extract action items, summarize conversations, or find specific information in chat history
triggers: 
created: 2026-01-07
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
-->

# Google Chat Scan

Scan Google Chat spaces to extract actionable information from conversations.

**Core principle:** Scan with purpose. Always filter by date/query to avoid overwhelming context with irrelevant messages.

---

## When to Use

- User asks to check Google Chat for updates
- Need to extract action items from a conversation
- Summarizing what was discussed in a space
- Finding specific information mentioned in chat
- Processing meeting follow-ups from chat

**Do NOT use when:**
- User wants to send a message (use `send_message` directly)
- Looking for a specific message URL (use `search_messages` directly)
- Space ID is unknown and user hasn't specified which space

---

## Quick Reference

| Task | Tool | Key Parameters |
|------|------|----------------|
| List available spaces | `google-workspace_list_spaces` | `user_google_email`, `space_type` |
| Get recent messages | `google-workspace_get_messages` | `space_id`, `page_size`, `order_by` |
| Search by keyword | `google-workspace_search_messages` | `query`, `space_id` (optional) |
| Send a message | `google-workspace_send_message` | `space_id`, `message_text` |

---

## Process

### Step 1: Identify Target Space

If user specifies a space name:
```
google-workspace_list_spaces → find matching space_id
```

If user says "all spaces" or is vague:
```
Ask: "Which space should I scan? Or should I list your available spaces?"
```

### Step 2: Retrieve Messages

**For recent messages:**
```
google-workspace_get_messages(
  space_id="spaces/XXXXX",
  page_size=50,
  order_by="createTime desc"
)
```

**For keyword search:**
```
google-workspace_search_messages(
  query="action items",
  space_id="spaces/XXXXX"  # optional - omit to search all
)
```

### Step 3: Extract Information

Analyze messages for:
- **Action items**: Tasks, deadlines, requests with owners
- **Decisions**: Conclusions reached, approvals given
- **Questions**: Open items needing response
- **Key info**: Dates, links, important announcements

### Step 4: Present Results

```markdown
## Chat Scan: {space_name}

**Period**: {date range or "recent"}
**Messages scanned**: {count}

### Action Items
- [ ] {task} — Owner: {person}, Due: {date if mentioned}

### Decisions Made
- {decision} — By: {person}, Date: {date}

### Open Questions
- {question} — From: {person}

### Key Information
- {important detail}
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Scanning without date filter | Always ask about timeframe or default to "today/this week" |
| Fetching 1000+ messages | Use `page_size` limit, paginate if needed |
| Missing space_id | List spaces first, confirm with user |
| Extracting without context | Include who said what and when |
| Assuming action items are explicit | Look for implicit requests ("can you...", "we need to...") |

---

## Red Flags - STOP

- About to fetch messages without knowing the space
- No date/query filter on large spaces
- User hasn't provided Google email for authentication
- Scanning personal DMs without explicit permission

---

## Verification Checklist

- [ ] User's Google email obtained for auth
- [ ] Target space identified (or user confirmed "all")
- [ ] Date range or query filter applied
- [ ] Results formatted with owners and dates
- [ ] Action items clearly marked as tasks

---

*Google Chat Scan v1.0 | Part of Thoth Knowledge Management System*
