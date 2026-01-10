---
name: slack-write
description: Use when writing Slack messages, team announcements, or channel posts. Ensures correct mrkdwn formatting instead of Markdown.
triggers: 
created: 2026-01-07
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
-->

# Slack Write

**Core principle:** Slack uses `mrkdwn`, NOT Markdown. Different syntax for bold, links, and structure.

---

## When to Use

- Posting messages to Slack channels
- Team announcements or updates
- Any `slack_conversations_add_message` call

**Do NOT use when:**
- Reading/scanning Slack (use slack-pulse)
- Writing emails (use email-draft)
- Writing KB documentation (Markdown is fine)

---

## Quick Reference

| Format | mrkdwn Syntax | NOT This |
|--------|---------------|----------|
| **Bold** | `*text*` | `**text**` |
| *Italic* | `_text_` | `*text*` |
| ~~Strike~~ | `~text~` | `~~text~~` |
| `Code` | `` `code` `` | same |
| Link | `<https://url|text>` | `[text](url)` |
| User mention | `<@U123ABC>` | `@username` |
| Channel | `<#C123ABC>` | `#channel` |
| Emoji | `:emoji_name:` | same |
| Quote | `>text` | same |
| Line break | `\n` in string | same |

---

## Structure for Readability

Slack renders everything inline. Create visual breaks with:

### Section Headers
Use emoji + bold:
```
:rotating_light: *Important Update*
```

### Dividers
Use unicode box drawing (not `---`):
```
────────────────────────────
```
Or emoji line:
```
:small_blue_diamond::small_blue_diamond::small_blue_diamond:
```

### Bullets
No native list syntax. Use:
- `•` (unicode bullet)
- `◦` (hollow bullet)
- Emoji: `:white_check_mark:`, `:arrow_right:`

### Numbered Lists
Manual numbering with line breaks:
```
1. First item\n2. Second item\n3. Third item
```

---

## Message Template

```
:emoji: *Header Title*

Brief intro paragraph.

────────────────────────────

:dart: *Section One*
• Point one
• Point two

:warning: *Section Two*
• Important note

────────────────────────────

:link: Links: <https://example.com|Click here>

Questions? Reply in thread.
```

---

## Process

### 1. Draft Content
Write the message content first, focusing on clarity.

### 2. Convert to mrkdwn
- Replace `**bold**` → `*bold*`
- Replace `[text](url)` → `<url|text>`
- Add emoji section headers
- Add unicode dividers for visual breaks

### 3. Present Final Payload for Approval
**CRITICAL:** Show Zeus the *exact* final string that will be sent.
- If formatting changes the wording, you MUST get re-approval.
- Use a code block to show the verbatim payload.

### 4. Post only after "Yes" to the final payload
```
slack_conversations_add_message(
  channel_id="C123ABC",
  content_type="text/markdown",
  payload="*Approved Final Payload*"
)
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| `**bold**` | Use `*bold*` — single asterisks |
| `[text](url)` | Use `<url|text>` — angle brackets, pipe separator |
| `---` for divider | Use `────────────────────────────` (unicode) |
| Markdown tables | Not supported — use aligned text or bullet lists |
| `- item` for bullets | Use `•` or `◦` unicode bullets |
| Wall of text | Add emoji headers and dividers for scannability |
| Assuming Markdown works | mrkdwn is NOT Markdown — always convert |

---

## Red Flags - STOP

- About to use `**` for bold → STOP, use `*`
- About to use `[text](url)` → STOP, use `<url|text>`
- About to use `---` for divider → STOP, use unicode `────────`
- Message is a wall of text → STOP, add section breaks
- Not sure about syntax → Check Quick Reference table

---

## Verification Checklist

- [ ] No `**` double asterisks (use single `*`)
- [ ] Links use `<url|text>` format
- [ ] Dividers use unicode, not `---`
- [ ] Has visual structure (headers, breaks)
- [ ] Emoji used for scannability
- [ ] Presented to Zeus before posting

---

## Useful Emoji

| Purpose | Emoji |
|---------|-------|
| Alert/Important | `:rotating_light:` `:warning:` `:exclamation:` |
| Info/Update | `:information_source:` `:mega:` `:loudspeaker:` |
| Action/Task | `:dart:` `:arrow_right:` `:point_right:` |
| Success | `:white_check_mark:` `:tada:` `:sparkles:` |
| Link/Reference | `:link:` `:bookmark:` `:page_facing_up:` |
| Question | `:question:` `:thinking_face:` |
| Divider | `:small_blue_diamond:` `:heavy_minus_sign:` |

---

*Slack Write Skill v1.0 | mrkdwn formatting for Slack messages*
