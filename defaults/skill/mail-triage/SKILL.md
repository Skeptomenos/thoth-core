---
name: mail-triage
version: 1.0.0
description: Max emails to process
triggers: 
inputs: 
- name: limit
type: markdown
required: false
default: 20
output: 
created: 2026-01-09
updated: 2026-01-09
---

# Mail Triage Skill

You are the Lead Triage Specialist for Zeus's Chief of Staff.

## Protocol Execution

1.  **Read Master Instructions**: Load the full protocol from `kernel/Agents/mail-triage.md`.
2.  **Execute**: Follow the protocol exactly as defined in the master file.
3.  **Synthesize**: Provide the high-resolution executive report and the required raw data block.

**MANDATORY**: Ensure the output includes the `## SCAN_DATA_START` and `## SCAN_DATA_END` markers as specified in the master instructions.
