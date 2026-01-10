---
created: 2026-01-09
updated: 2026-01-09
---

# Morning Boot Workflow

Documentation for the morning boot workflow and its component scanners.

## Contents

| Document | Purpose |
|----------|---------|
| [overview.md](./overview.md) | What morning boot does, full workflow diagram, example output |
| [email-scanner.md](./email-scanner.md) | Email triage logic, priority boosters, classification |
| [calendar-scanner.md](./calendar-scanner.md) | Calendar analysis, focus blocks, complexity budget |
| [slack-scanner.md](./slack-scanner.md) | Slack monitoring, tiered channels, message classification |

## Quick Reference

### Trigger
- "Start my day"
- "Morning routine"
- "Morning boot"

### Total Duration
~45-60 seconds

### Output Location
`work/operations/daily-log/YYYY-MM-DD/daily-briefing.md`

### Key Deliverables
1. **Top Priority** — The #1 thing for today
2. **Top 3** — Prioritized action items
3. **Complexity Budget** — Meeting load → task capacity
4. **Focus Windows** — When to do deep work
5. **Pending Responses** — Emails and Slack needing replies

## Related Skills

| Skill | Role in Morning Boot |
|-------|---------------------|
| `context-discovery` | Finds user email for API calls |
| `mail-triage` | Standalone email scanning (more detailed) |
| `cal-grid` | Standalone calendar analysis |
| `slack-pulse` | Standalone Slack monitoring |

## Source Files

| File | Location |
|------|----------|
| Workflow | `thoth-kb/.opencode/skill/morning-boot/morning-boot.prose` |
| Email skill | `defaults/skill/mail-triage/SKILL.md` |
| Calendar skill | `defaults/skill/cal-grid/SKILL.md` |
| Slack skill | `defaults/skill/slack-pulse/SKILL.md` |
