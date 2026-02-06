---
created: 2026-01-14
updated: 2026-01-14
---

# Tool Hooks in System Prompt

**Type:** Enhancement  
**Priority:** High  
**Created:** 2026-01-14  
**Status:** Open

---

## Problem

Thoth has a pre-execution hook system defined in `kernel/config/hooks.md` that mandates invoking specific skills before calling certain tools (e.g., `slack-write` before `slack_conversations_add_message`). However, this system **failed in practice** because:

1. The hook registry lives in a file that must be actively checked
2. There's no enforcement at the tool-call level
3. The agent can (and did) skip the hook and call the tool directly

**Incident:** On 2026-01-14, a Slack message was sent using markdown formatting instead of Slack's `mrkdwn` syntax because the `slack-write` skill was not invoked before the tool call.

---

## Current State

- Hook registry exists: `thoth-kb/kernel/config/hooks.md`
- Reference exists in: `thoth-kb/AGENTS.md` and `thoth-kb/work/AGENTS.md`
- Enforcement: None (relies on agent memory/compliance)

---

## Proposed Solution

Embed the tool hooks directly into the system prompt as a **blocking gate**. This ensures the agent cannot "forget" to check the file.

### Implementation

Add a new section `<Tool_Hooks>` to the main Thoth system prompt (THOTH.md or equivalent):

```markdown
<Tool_Hooks>
## Pre-Execution Hooks (BLOCKING)

Before calling these tools, you MUST invoke the mandatory skill FIRST. Do NOT call the tool directly.

| Tool                              | Mandatory Skill | Purpose                           |
| --------------------------------- | --------------- | --------------------------------- |
| `slack_conversations_add_message` | `slack-write`   | mrkdwn formatting + approval gate |
| `gws-mcp-advanced_send_gmail_message` | `email-draft` | Context-aware drafting + approval |

### Enforcement Protocol

1. **STOP** before calling any tool in this list
2. **INVOKE** the mandatory skill using `skill({ skill: "skill-name" })`
3. **WAIT** for skill to complete and format the payload
4. **ONLY THEN** call the tool with the skill-formatted payload

### Violation Consequence

Calling a hooked tool without first invoking its skill is a **Trust Level 1 violation**.
</Tool_Hooks>
```

---

## Success Criteria

1. Agent cannot send Slack messages without first invoking `slack-write` skill
2. Agent cannot send emails without first invoking `email-draft` skill
3. Formatting is always correct (mrkdwn for Slack, proper structure for email)
4. Zeus approves final payload before send

---

## Dependencies

- `slack-write` skill must exist and be functional
- `email-draft` skill must exist and be functional
- System prompt must be regenerated/updated

---

## Notes

- Consider whether the hook check should happen in Phase 0 (Intent Gate) or just-in-time before the tool call
- Future: Could extend to calendar events, document sharing, etc.
