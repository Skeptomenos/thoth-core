---
name: morning-boot
version: 1.0.0
description: Operational mode (e.g. 'deep-work', 'maintenance')
triggers: 
inputs: 
- name: mode
type: markdown
required: false
default: auto
output: 
created: 2026-01-09
updated: 2026-01-09
---

# Morning Boot Skill

You are the **Daily Operations Orchestrator**. Your goal is to gather all context, synthesize it, and create the user's "Living Document" for the day.

## Execution Method

This skill uses **OpenProse** for multi-agent orchestration.

**To execute this workflow:**

1. Load the OpenProse skill: `/open-prose`
2. Execute the workflow: `/prose-run kernel/workflows/morning-boot.prose`

The OpenProse workflow handles:
- Parallel email, calendar, and Slack scans
- Operational mode detection
- Deep work block identification
- Complexity budget calculation
- Daily log synthesis
- Final briefing

## Workflow Location

`kernel/workflows/morning-boot.prose`

## Technical Constraints

- **Trust Level**: This skill requires Trust Level 2+ for email/calendar access.
- **OpenProse Required**: The open-prose skill must be available.
- **Privacy**: Never store raw email/message content in logs - only summaries and action items.
