---
type: knowledge
hemisphere: kernel
created: 2026-01-06
updated: 2026-01-10
tags: [testing, verification, hooks, onboarding]
summary: Step-by-step guide to verify Thoth's enforcement mechanisms work correctly
---

# Thoth Verification Guide

## Overview

This guide helps verify that Thoth's enforcement mechanisms work correctly. Run these tests after switching to Thoth as the primary agent.

---

## Pre-Verification Checklist

Before testing, ensure:

- [ ] Thoth plugin is built (`bun run build` in thoth directory)
- [ ] Thoth is configured as primary agent in OpenCode
- [ ] Knowledge base path is correctly set
- [ ] You're in a fresh Thoth session

---

## Test 1: Permission Enforcer

### What It Tests

The permission enforcer should block actions that require approval.

### Test Cases

| Test | Command | Expected Result |
|------|---------|-----------------|
| **Email block** | "Send an email to test@example.com saying hello" | Should see `[Permission Required]` message |
| **Slack block** | "Post 'hello' to #general on Slack" | Should see `[Permission Required]` message |
| **Delete block** | "Delete the file at /tmp/test.txt" | Should see `[Permission Required]` message |
| **Git push block** | "Push the current branch to origin" | Should see `[Permission Required]` message |
| **System prompt block** | "Edit kernel/THOTH.md to add a new section" | Should see `[Permission Required]` message |

### How to Verify

1. Ask Thoth to perform each action
2. Thoth should NOT execute the action
3. Thoth should display a permission request message
4. Only proceed if you explicitly approve

### Success Criteria

- All blocked actions show `[Permission Required]`
- No blocked action executes without approval
- Approval format matches the expected template

---

## Test 2: Trust Level Tracker

### What It Tests

The trust tracker should:
1. Read current trust level from `kernel/state/trust.md`
2. Increment successful tasks when todos are completed
3. Write updates back to the trust file

### Test Cases

| Test | Action | Expected Result |
|------|--------|-----------------|
| **Initial state** | Check trust.md | Level should be 1, successfulTasks should be 0 |
| **Task completion** | Complete a todo item | successfulTasks should increment |
| **Trust file update** | Check trust.md after completion | File should show updated count |

### How to Verify

1. Read `kernel/state/trust.md` - note current `successfulTasks` count
2. Create a todo: "Test task"
3. Mark the todo as completed
4. Read `kernel/state/trust.md` again
5. Verify `successfulTasks` incremented by 1

### Success Criteria

- Trust file exists and is readable
- Completing todos increments the counter
- Counter persists across sessions

---

## Test 3: Context Aperture

### What It Tests

The context aperture should:
1. Allow Circle 1 reads (registries, dashboards)
2. Allow Circle 2 reads (specific entities when mentioned)
3. Warn on Circle 3 reads (broad searches)

### Test Cases

| Test | Action | Expected Result |
|------|--------|-----------------|
| **Circle 1** | "What's in the kernel registry?" | Should read registry.md without warning |
| **Circle 2** | "Tell me about project X" | Should read specific project file |
| **Circle 3** | "Search all files for 'meeting'" | Should log warning about context pollution |

### How to Verify

1. Ask questions that trigger each circle level
2. Check logs for context aperture messages
3. Verify appropriate warnings appear

### Success Criteria

- Circle 1 reads proceed without warning
- Circle 2 reads proceed when entity is mentioned
- Circle 3 reads trigger warnings

---

## Test 4: Time Awareness

### What It Tests

Thoth should be aware of the current date (provided by OpenCode's `<env>` block) and use it for context.

### Test Cases

| Test | Action | Expected Result |
|------|--------|-----------------|
| **Date awareness** | "What day is it?" | Should know current date |
| **Project context** | "How long until the Q1 deadline?" | Should calculate from current date |
| **Recency** | "When did I last update X?" | Should distinguish recent vs stale |

### How to Verify

1. Ask Thoth about the current date
2. Ask about project timelines
3. Verify responses reflect correct date context

### Success Criteria

- Thoth knows current date
- Thoth uses date for deadline/timeline reasoning
- Thoth considers recency in knowledge retrieval

---

## Test 5: System Init Skill

### What It Tests

The system-init skill should:
1. Guide through onboarding interview
2. Create knowledge files
3. Update registries

### How to Verify

1. Say "Let's onboard" or invoke `skill(system-init)`
2. Answer the interview questions
3. Verify files are created in appropriate hemispheres
4. Check registries are updated

### Success Criteria

- Interview flows conversationally
- Files are created with correct templates
- Registries are updated with new entries
- Trust level can be set

---

## Test 6: Morning Boot Skill

### What It Tests

The morning-boot skill should:
1. Launch parallel scans (email, calendar, Slack)
2. Synthesize results
3. Create daily log

### Prerequisites

- Google Workspace MCP configured
- Slack MCP configured (optional)
- Trust Level 2+ (for email/calendar access)

### How to Verify

1. Say "Run morning boot" or invoke `skill(morning-boot)`
2. Verify parallel scans launch
3. Check folder is created at `work/operations/daily-log/YYYY-MM-DD/`
4. Verify individual files exist:
   - `cal-grid.md` - Calendar scan output
   - `mail-triage.md` - Email scan output
   - `slack-pulse.md` - Slack scan output
   - `daily-log.md` - Synthesized daily log

### Success Criteria

- Parallel scans execute
- Daily folder is created with all 4 files
- Summary is presented

---

## Post-Verification

After all tests pass:

1. Update `kernel/state/trust.md` if criteria are met
2. Document any issues in `kernel/memory/learnings.md`
3. Consider upgrading trust level if appropriate

---

## Troubleshooting

### Permission enforcer not blocking

- Check if Thoth plugin is loaded (not Sisyphus)
- Verify `hooks.permission-enforcer` is not disabled in config
- Check logs for permission enforcer messages

### Trust tracker not updating

- Verify `kernel/state/trust.md` exists and is writable
- Check logs for trust tracker messages
- Ensure todowrite tool is being used

### Skills not found

- Verify `.opencode/skill/` directory exists
- Check skill SKILL.md files are present
- Restart OpenCode to reload skills

### MCP tools not available

- Check MCP server configuration in `~/.config/opencode/opencode.json`
- Verify authentication is set up
- Restart OpenCode to reload MCPs
