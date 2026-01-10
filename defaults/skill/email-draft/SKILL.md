---
name: email-draft
description: Use when drafting emails, composing replies, or writing professional messages that will be sent via Gmail.
triggers: 
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill can be invoked standalone OR as a subagent context template.
-->

# Email Draft

**Core principle:** Gmail does not support Markdown. Always use HTML formatting with `body_format="html"`.

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

- Drafting a reply to an email
- Composing a new email
- Writing professional messages via Gmail

**Do NOT use when:**
- Sending Slack messages (different formatting)
- Writing internal KB notes (Markdown is fine)

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Bold text | `<b>text</b>` |
| Italic text | `<i>text</i>` |
| Line break | `<br>` |
| Paragraph | `<p>text</p>` |
| Bullet list | `<ul><li>item</li></ul>` |
| Numbered list | `<ol><li>item</li></ol>` |
| Create draft | `google-workspace_draft_gmail_message` with `body_format="html"` |
| Send email | `google-workspace_send_gmail_message` with `body_format="html"` |

---

## Process

### 1. Gather Context

**For replies:**
- Retrieve thread with `get_gmail_thread_content(thread_id, user_google_email)`
- Extract `thread_id` and `in_reply_to` (Message-ID header)
- Note key points requiring response

**For new emails:**
- Confirm recipient and purpose
- Check stakeholder file if available (`work/Stakeholders/` or `work/Team/`)

### 2. Draft Content

Structure:
1. **Opening** — Acknowledge their message (replies) or state purpose (new)
2. **Body** — Key points with `<b>headers</b>` for multiple topics
3. **Closing** — Next steps or call to action
4. **Sign-off** — "Best, David"

Format with HTML:
- `<b>` for section headers
- `<ul><li>` for lists of 3+ items  
- `<p>` for paragraph separation
- `<i>` sparingly for emphasis

### 3. Present Final Payload for Approval
**CRITICAL:** Show Zeus the *exact* final HTML string that will be saved.
- If HTML conversion changes the wording, you MUST get re-approval.
- Use a code block to show the verbatim HTML payload.

### 4. Save Draft
```python
google-workspace_draft_gmail_message(
  user_google_email={EMAIL},
  to="recipient@example.com",
  subject="Re: Subject",
  body="<p>Approved HTML payload</p>",
  body_format="html",           # CRITICAL
  thread_id="...",              # For replies
  in_reply_to="<message-id>"    # For replies
)
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Using Markdown `**bold**` | Use HTML `<b>bold</b>` — Gmail renders Markdown literally |
| Forgetting `body_format="html"` | Always include — plain text drafts have a **known bug** where they open empty in Gmail |
| Missing `thread_id` on replies | Retrieve from original message first |
| Sending without approval | Always draft first, ask Zeus to confirm |
| Using wrong email | Use `{EMAIL}` from Context Discovery |
| Calling MCP tool without invoking skill | Always use this skill for email drafts — ensures correct formatting |

---

## Red Flags - STOP

- About to use `**` or `__` for formatting — STOP, use HTML
- About to send without Zeus approval — STOP, save as draft
- Can't find thread_id for a reply — STOP, retrieve original thread first

---

## Verification Checklist

- [ ] Used HTML tags, not Markdown
- [ ] Included `body_format="html"` parameter
- [ ] For replies: included `thread_id` and `in_reply_to`
- [ ] Presented draft to Zeus before saving
- [ ] Used correct email (work vs personal context)
