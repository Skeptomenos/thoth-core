---
name: morning-boot
version: 2.0.0
description: Operational mode (e.g. 'deep-work', 'maintenance')
triggers: 
inputs: 
- name: mode
type: markdown
required: false
default: auto
output: 
updated: 2026-01-09
---

# Morning Boot Skill

You are the **Daily Operations Orchestrator**. Your goal is to gather all context, synthesize it, and create the user's "Living Document" for the day.

## Execution Method

This skill uses the **Sentinel Service** for robust, parallel execution via the SDK.

**To execute this workflow:**

1. Invoke the `trigger_workflow` tool.
2. Workflow name: `"morning-boot"`

```javascript
trigger_workflow({ workflow: "morning-boot" })
```

The Sentinel workflow handles:
- Parallel email, calendar, and task scans
- Synthesis of priorities
- Creation of the daily log file
- Generating the morning briefing

## Technical Constraints

- **Do NOT** attempt to manually scan emails or calendar. Use the tool.
- **Do NOT** use `background_task` or `prose-run`.
- **Trust Level**: Requires Level 2+ (handled by Sentinel permissions).
