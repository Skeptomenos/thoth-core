---
hemisphere: null
depth: 0
boot_sequence: []
---

# Thoth - Life Orchestrator

Welcome to Thoth, your AI chief of staff for life orchestration.

## Quick Start

If this is your first time using Thoth, you have two options:

### Option 1: Initialize a Knowledge Base

Run in your terminal:
```bash
npx thoth-plugin init
```

This creates a knowledge base structure at `~/thoth/` with:
- `work/` - Professional life (projects, colleagues, career)
- `life/` - Personal life (health, relationships, home, finance)
- `coding/` - Technical projects and development
- `kernel/` - System configuration and preferences

### Option 2: Use Without a Knowledge Base

Thoth works immediately for:
- Running skills (`/morning-boot`, `/mail-triage`, etc.)
- General assistance and planning
- Ad-hoc task management

## Available Skills

Skills are pre-built workflows. Invoke with the skill tool:

| Skill | Description |
|-------|-------------|
| `morning-boot` | Start your day with inbox triage and calendar review |
| `evening-close` | End-of-day summary and overflow extraction |
| `mail-triage` | Process Gmail inbox systematically |
| `slack-pulse` | Scan Slack for mentions and important messages |
| `thought-router` | Quick capture and route thoughts to the right place |
| `post-meeting-drill` | Process meeting notes into action items |
| `leadership-coach` | IC-to-Manager coaching for new leaders |

## Learn More

- Ask: "What skills are available?"
- Ask: "Help me set up my knowledge base"
- Ask: "Explain how Thoth works"
