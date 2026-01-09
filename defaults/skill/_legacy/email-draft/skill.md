---
name: email-draft
description: Use when drafting emails, composing replies, or writing professional messages that will be sent via Gmail.
triggers:
  - draft email
  - draft a reply
  - write an email
  - respond to email
  - compose email
  - reply to this email
  - help me write an email
  - email response
---

# Email Draft

**Core principle:** Gmail does not support Markdown. Always use HTML formatting with `body_format="html"`.

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

### 3. Present for Approval

Show full email in chat before saving:

```
**Draft ready for review:**

---
[Email content]
---

**To:** recipient
**CC:** if applicable

Shall I save as draft?
```

### 4. Save Draft

```python
google-workspace_draft_gmail_message(
  user_google_email="david.helmus@hellofresh.com",
  to="recipient@example.com",
  subject="Re: Subject",
  body="<p>HTML content</p>",
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
| Forgetting `body_format="html"` | Always include — defaults to plain text |
| Missing `thread_id` on replies | Retrieve from original message first |
| Sending without approval | Always draft first, ask Zeus to confirm |
| Using personal email for work | Work context = `david.helmus@hellofresh.com` |

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
