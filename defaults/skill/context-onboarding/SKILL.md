---
name: context-onboarding
description: Use when context-discovery fails and user needs to set up their Thoth KB. Guides user through creating identity files and basic KB structure. Triggered automatically when morning-boot can't find required context.
triggers: 
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill is typically invoked when context-discovery fails.
-->

# Context Onboarding

**Core principle:** Get the user from zero to working morning-boot in under 2 minutes with the minimum viable configuration.

---

## When to Use

- context-discovery returned `ready: false`
- User has no thoth-kb set up
- User asks to "set up thoth" or "initialize knowledge base"
- First-time user trying to run a context-dependent skill

**Do NOT use when:**
- context-discovery succeeded (ready: true)
- User just needs to add a single file (guide them directly)
- User explicitly wants manual setup

---

## Quick Reference

| Task | Action |
|------|--------|
| Determine KB location | Ask user OR use `~/.thoth-kb/` default |
| Get work email | Ask user (required for morning-boot) |
| Get timezone | Ask user OR detect from system |
| Create structure | kernel/, work/, life/ directories |
| Create config | `~/.config/opencode/thoth.json` + `.opencode/thoth.json` |
| Create identity | `work/AGENTS.md` with MCP config table |

---

## Onboarding Flow

### Phase 1: Assess Current State

Read the discovery results (passed as context) to understand what's missing:

```
Missing KB root → Need to create KB structure
Missing identity → Need email address
Missing stakeholders → Optional, can add later
```

### Phase 2: Minimal Questions (Max 3)

Ask ONLY what's required. Don't over-ask.

**Question 1: KB Location** (if no KB found)
```
Where would you like your Thoth knowledge base?

Options:
1. ~/.thoth-kb/ (recommended - works from anywhere)
2. Current directory: /path/to/cwd
3. Custom path

[Default: ~/.thoth-kb/]
```

**Question 2: Work Email** (required)
```
What's your work email address?
(Used for Gmail/Calendar API calls)

Example: you@company.com
```

**Question 3: Timezone** (optional, can detect)
```
What's your timezone?

[Detected: America/Los_Angeles]
Press Enter to accept, or type a different timezone.
```

### Phase 3: Create Files

#### 3.1: Global Config (`~/.config/opencode/thoth.json`)

```json
{
  "kb_root": "/Users/username/.thoth-kb",
  "default_hemisphere": "work",
  "created": "2026-01-09",
  "version": "1.0"
}
```

#### 3.2: Project Marker (`{kb_root}/.opencode/thoth.json`)

```json
{
  "type": "thoth-kb",
  "version": "1.0",
  "hemispheres": ["kernel", "work", "life"]
}
```

#### 3.3: Directory Structure

```
{kb_root}/
├── .opencode/
│   └── thoth.json         # Project marker
├── kernel/
│   └── AGENTS.md          # System context
├── work/
│   ├── AGENTS.md          # Work context with MCP config
│   └── Stakeholders/      # Empty, to be populated
└── life/
    └── AGENTS.md          # Life context
```

#### 3.4: Root AGENTS.md

```markdown
---
hemisphere: null
depth: 0
---

# Thoth Knowledge Base

Your personal knowledge management system organized into hemispheres.

## Hemispheres

| Hemisphere | Purpose |
|------------|---------|
| kernel/ | System configuration and preferences |
| work/ | Professional life - email, calendar, projects, colleagues |
| life/ | Personal life - health, relationships, home, finance |

## Getting Started

Run `morning-boot` to start your day with email triage and calendar review.
```

#### 3.5: Work AGENTS.md (Critical - Contains Identity)

```markdown
---
hemisphere: work
depth: 1
---

# Work Hemisphere

Professional life domain.

## MCP Tool Configuration (CRITICAL)

| MCP Server | Required Parameter | Value |
|------------|-------------------|-------|
| google-workspace | user_google_email | {USER_EMAIL} |
| drive-synapsis | user_google_email | {USER_EMAIL} |

**Rules:**
- Always include `user_google_email` parameter in Google Workspace calls
- Never guess or hardcode email addresses

## Skill Triggers

| Trigger Phrases | Skill |
|----------------|-------|
| "start my day", "morning boot" | morning-boot |
| "check email", "email triage" | mail-triage |
| "check slack" | slack-pulse |

## Structure

| Directory | Purpose |
|-----------|---------|
| Stakeholders/ | Key people you work with |
| projects/ | Active work initiatives |
| Team/ | Direct reports (if applicable) |
```

#### 3.6: Life AGENTS.md

```markdown
---
hemisphere: life
depth: 1
---

# Life Hemisphere

Personal life domain.

## MCP Tool Configuration

| MCP Server | Required Parameter | Value |
|------------|-------------------|-------|
| google-workspace | user_google_email | {PERSONAL_EMAIL_OR_SAME} |

## Structure

| Directory | Purpose |
|-----------|---------|
| people/ | Family, friends, relationships |
| health/ | Fitness, medical, wellness |
| home/ | Household, maintenance |
| finance/ | Budget, investments |
```

#### 3.7: Kernel AGENTS.md

```markdown
---
hemisphere: kernel
depth: 1
---

# Kernel

System configuration and Thoth self-improvement.

## Purpose

- Store preferences and settings
- Track decisions and learnings
- Configure Thoth behavior

## Structure

| Directory | Purpose |
|-----------|---------|
| config/ | User preferences |
| memory/ | Decisions log |
| state/ | Runtime state |
```

### Phase 4: Verify Setup

After creating files:

1. Read back the created `work/AGENTS.md`
2. Verify email is correctly embedded
3. Confirm directory structure exists
4. Update global config with kb_root

### Phase 5: Handoff

```
✅ Thoth KB created at ~/.thoth-kb/

What was set up:
- Global config: ~/.config/opencode/thoth.json
- KB structure: kernel/, work/, life/
- Work identity: work/AGENTS.md (email: you@company.com)

Next steps:
1. Run `morning-boot` - it should work now!
2. First run will prompt for Google OAuth
3. Add stakeholders to work/Stakeholders/ over time

Optional:
- Add personal email to life/AGENTS.md
- Create project files in work/projects/
```

---

## Templates

### Minimal Work AGENTS.md

Use this template, replacing `{EMAIL}`:

```markdown
---
hemisphere: work
depth: 1
---

# Work Hemisphere

## MCP Tool Configuration (CRITICAL)

| MCP Server | Required Parameter | Value |
|------------|-------------------|-------|
| google-workspace | user_google_email | {EMAIL} |
| drive-synapsis | user_google_email | {EMAIL} |

## Skill Triggers

| Trigger | Skill |
|---------|-------|
| "morning boot" | morning-boot |
| "check email" | mail-triage |
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Asking too many questions | Max 3 questions. Email is the only truly required one. |
| Creating complex structure | Minimal viable: just work/AGENTS.md with email is enough |
| Not creating global config | Always create `~/.config/opencode/thoth.json` for cross-directory access |
| Forgetting MCP table format | Must be exact format with headers: MCP Server, Required Parameter, Value |
| Not verifying creation | Always read back critical files to confirm |

---

## Red Flags - STOP

- Asking more than 3 questions
- Creating files without confirming location with user
- Skipping the global config file
- Not embedding email in MCP table format
- Leaving placeholders like `{EMAIL}` in final files
- Not providing clear next steps

---

## Verification Checklist

- [ ] Asked ≤3 questions
- [ ] Created `~/.config/opencode/thoth.json` with kb_root
- [ ] Created `.opencode/thoth.json` in KB root
- [ ] Created work/AGENTS.md with MCP config table
- [ ] Email is correctly embedded (not placeholder)
- [ ] Provided clear next steps to user
- [ ] User can now run morning-boot successfully

---

## Integration with Discovery

After onboarding completes, discovery should be re-run:

```prose
# In calling skill (e.g., morning-boot)

let context = do context-discovery

if **context.ready is false**:
  do context-onboarding
    context: context  # Pass discovery results
  
  # Retry discovery
  let context = do context-discovery
  
  if **still not ready**:
    throw "Setup incomplete. Please check the error messages above."

# Proceed with context
```

---

*Context Onboarding v1.0 | Part of Thoth Skill System*
