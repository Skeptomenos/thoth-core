---
name: mail-triage
description: Use when Zeus asks to check email, process inbox, or scan for messages. Exhaustively drains inbox and outputs structured triage report with meeting notes detection.
triggers: 
template: mail-triage-template.md
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->

# Mail Triage Skill

**Core principle:** Exhaust the inbox, classify everything, detect meeting notes for handoff, persist structured output. Never improvise.

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

- Zeus asks to check email or process inbox
- Morning boot routine (mail-triage is a component)
- Any request about what's in the inbox

**Do NOT use when:**
- Zeus asks to read a specific email (just read it)
- Zeus asks to send/draft an email (use email-draft skill)
- Processing meeting notes deeply (that's post-meeting-drill)

---

## Quick Reference

| Task | Tool | Command |
|------|------|---------|
| Query inbox | google-workspace_search_gmail_messages | `query: "label:inbox"` |
| Read threads batch | google-workspace_get_gmail_threads_content_batch | `thread_ids: [...]` |
| Read single message | google-workspace_get_gmail_message_content | `message_id: "..."` |
| Persist output | write | `work/operations/daily-log/YYYY-MM-DD/mail-triage.md` |

**Email:** Use `{EMAIL}` from Context Discovery (Step 0)

---

## Process

### Phase 1: Query Inbox

```
google-workspace_search_gmail_messages(
  query="label:inbox",
  user_google_email={EMAIL},
  page_size=25
)
```

Paginate until inbox is exhausted.

### Phase 2: Batch Read Threads

```
google-workspace_get_gmail_threads_content_batch(
  thread_ids=[...],
  user_google_email={EMAIL}
)
```

Process in batches of 25 max.

### Phase 3: Classify Each Item

| Classification | Definition | Action |
|----------------|------------|--------|
| **ACTION** | Requires Zeus's decision/response | Add to ACTION_ITEMS table |
| **FYI** | Contextually relevant, no immediate action | Add to FYI_ITEMS table |
| **ARCHIVE** | Noise, automated, redundant | Add to ARCHIVED table |
| **MEETING_NOTES** | From `gemini-notes@google.com` or contains meeting notes | Add to MEETING_NOTES_DETECTED table |

#### Priority Boosters (for ACTION items)

| Signal | Boost |
|--------|-------|
| From: Direct report | +1 |
| From: Manager or skip-level | +2 |
| Contains "urgent", "blocker", "ASAP" | +1 |
| Contains deadline language | +1 |
| In TO: (not CC:) | +1 |
| Unanswered >24h | +1 |

### Phase 4: MEETING_NOTES Detection

**CRITICAL GATE: Meeting notes trigger AUTO-HANDOFF to post-meeting-drill.**

#### Detection Rules

| Pattern | Classification |
|---------|----------------|
| From: `gemini-notes@google.com` | MEETING_NOTES |
| Subject contains "Notes from" + meeting context | MEETING_NOTES |
| Subject contains "shared a document" + "meeting"/"notes" | MEETING_NOTES |

#### When Detected — Extract Doc ID

1. **STOP** — Do NOT read the Google Doc content
2. **STOP** — Do NOT extract action items
3. **Extract the Google Doc ID** from the email body:
   - Look for link pattern: `docs.google.com/document/d/{DOC_ID}/`
   - Extract `DOC_ID` from the URL
4. Extract metadata:
   - Meeting title (from subject)
   - Meeting date (from email date)
   - **Doc ID** (extracted from link)
   - Message ID (for reference)
5. Add to `MEETING_NOTES_DETECTED` table with doc_id
6. Continue to next email

**The auto-handoff happens AFTER triage is complete (Phase 7).**

### Phase 5: Output (MANDATORY FORMAT)

**Template:** Read `mail-triage-template.md` from this skill folder.

**Output path:** `work/operations/daily-log/YYYY-MM-DD/mail-triage.md`

Fill the template placeholders with scan results:

| Placeholder | Value |
|-------------|-------|
| `{{DATE}}` | Today's date (YYYY-MM-DD) |
| `{{TIME}}` | Scan completion time (HH:MM) |
| `{{TOTAL_ITEMS}}` | Total emails processed |
| `{{EXECUTIVE_SUMMARY}}` | 2-3 sentences: What needs attention? |
| `{{ACTION_ITEMS_TABLE}}` | Table rows for ACTION items |
| `{{ACTION_COUNT}}` | Count of ACTION items |
| `{{FYI_ITEMS_TABLE}}` | Table rows for FYI items |
| `{{FYI_COUNT}}` | Count of FYI items |
| `{{MEETING_NOTES_TABLE}}` | Table rows for detected meeting notes (must include doc_id column) |
| `{{MEETING_NOTES_COUNT}}` | Count of meeting notes |
| `{{ARCHIVED_TABLE}}` | Table rows for archived items |
| `{{ARCHIVED_COUNT}}` | Count of archived items |
| `{{RECOMMENDATIONS}}` | Specific follow-up actions |

**Critical:** Output MUST include `## SCAN_DATA_START` and `## SCAN_DATA_END` markers for parsing.

### Phase 6: Report to Zeus

After persisting, return verbal summary:

```
Processed [N] emails.

**ACTION (N):** [Brief list]
**FYI (N):** [Brief list]  
**MEETING_NOTES (N):** Auto-processing via post-meeting-drill
**ARCHIVED (N):** [Count]

Persisted to: work/operations/daily-log/YYYY-MM-DD/mail-triage.md
```

### Phase 7: Auto-Handoff to Post-Meeting-Drill

**If MEETING_NOTES_COUNT > 0**, automatically invoke post-meeting-drill:

```
For each meeting note detected:
  skill({ 
    name: "post-meeting-drill",
    context: { doc_id: "{DOC_ID}", title: "{TITLE}", date: "{DATE}" }
  })
```

**Do NOT ask Zeus** — auto-process. This is the whole point of extracting doc_id in Phase 4.

**Loop prevention:** If `context.caller == "post-meeting-drill"`, skip this phase.

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Reading Gemini docs during triage | MEETING_NOTES = metadata only. Handoff to post-meeting-drill. |
| Not persisting to file | Output MUST be written to `mail-triage.md`. Not optional. |
| Missing SCAN_DATA markers | These are parsing anchors. Always include `## SCAN_DATA_START` and `## SCAN_DATA_END`. |
| Improvising output format | Use the exact template. Tables must have correct columns. |
| Processing meeting notes "since I'm already here" | No. Flag and handoff. That's the whole point. |
| Forgetting message IDs | Every item needs Message ID for downstream tools. |
| Stopping before inbox exhausted | Paginate until `page_token` is empty. |

---

## Red Flags - STOP

- About to call `drive-synapsis_read_google_drive_file` for a Gemini doc → STOP. That's post-meeting-drill's job.
- Output doesn't have `SCAN_DATA_START` marker → STOP. Use the template.
- Not writing to file → STOP. Persistence is mandatory.
- Skipping MEETING_NOTES_DETECTED table → STOP. This enables handoff.
- Using wrong email address → STOP. Use `{EMAIL}` from Context Discovery.

---

## Verification Checklist

Before reporting complete:

- [ ] All inbox items processed (paginated to exhaustion)
- [ ] Each item classified into exactly one category
- [ ] MEETING_NOTES items have message_id (not processed deeply)
- [ ] Output written to `work/operations/daily-log/YYYY-MM-DD/mail-triage.md`
- [ ] Output has `## SCAN_DATA_START` and `## SCAN_DATA_END` markers
- [ ] All tables have correct columns per template
- [ ] Handoff section lists meeting notes count and processing instruction
- [ ] Verbal summary provided to Zeus

---

## Edge Cases

### Empty Inbox
```markdown
# Mail Triage — [Date]

**Items Processed:** 0

Inbox clear. No items to process.

(Still check for meeting notes in last 24h that may have been auto-archived)
```

### High Volume (>50 items)
- Process in batches of 25
- Prioritize ACTION classification first
- Aggregate ARCHIVE items: "12 PIM notifications archived"

### Ambiguous Classification
- Default to FYI with note: "Review recommended"
- Never auto-archive if sender is in Team or Stakeholders

---

## Integration: Bidirectional with Post-Meeting-Drill

### mail-triage → post-meeting-drill (Auto)

When mail-triage detects meeting notes:
1. Extract doc_id from email body (Google Doc link)
2. After triage complete, auto-invoke post-meeting-drill with doc_id
3. No user confirmation needed — this is the default flow

### post-meeting-drill → mail-triage (On Demand)

When post-meeting-drill is invoked manually without doc_id:
1. post-meeting-drill calls mail-triage with `context.caller = "post-meeting-drill"`
2. mail-triage scans for meeting notes, returns doc_ids
3. mail-triage skips Phase 7 (no recursive handoff)
4. post-meeting-drill processes the returned doc_ids

This bidirectional design means:
- **mail-triage always hands off** to post-meeting-drill automatically
- **post-meeting-drill can trigger** mail-triage to find notes
- **No infinite loops** via `context.caller` check

---

*Mail Triage Skill v2.1 | Auto-handoff with doc_id extraction*
