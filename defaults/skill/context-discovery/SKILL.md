---
name: context-discovery
description: Use when a skill needs Thoth KB context (identity, stakeholders, projects) and it hasn't been discovered yet this session. Called automatically by morning-boot and other context-dependent skills.
triggers: 
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
This skill is typically invoked by other skills, not directly by user.
-->

# Context Discovery

**Core principle:** Find the Thoth KB and extract context needed for skills to operate, adapting to the actual file structure rather than assuming an ideal one.

---

## When to Use

- Morning-boot or other skills need user context (email, stakeholders)
- Running from unknown directory and need to find KB root
- Context hasn't been discovered yet this session
- User asks "where is my knowledge base"

**Do NOT use when:**
- Context is already cached in session
- User explicitly provides context (email, etc.)
- Running a skill that doesn't need KB context

---

## Quick Reference

| Task | How |
|------|-----|
| Find KB root | Check config → walk up for markers → check siblings |
| Determine hemisphere | Parse CWD path for `/work/`, `/life/`, `/coding/` |
| Find email | Read `{hemisphere}/AGENTS.md`, extract from MCP config table |
| Find stakeholders | Check `{hemisphere}/Stakeholders/_index.md` or `{hemisphere}/people/_index.md` |
| Cache results | Store in `.thoth-state/context.json` for session reuse |

---

## Discovery Algorithm

### Step 1: Check Explicit Config (Fastest)

```
Check: ~/.config/opencode/thoth.json
Look for: { "kb_root": "/path/to/thoth-kb" }
```

If found, use this path directly. Skip walk-up.

### Step 2: Walk Up for Markers

Starting from CWD, check each parent directory for:

| Marker | Priority | Indicates |
|--------|----------|-----------|
| `.opencode/thoth.json` with `"type": "thoth-kb"` | 1 (best) | Explicit KB marker |
| `.thoth-root` file | 2 | Simple marker file |
| `kernel/` + `work/` + `life/` directories | 3 | Structure-based detection |

Stop at first match. That's the KB root.

### Step 3: Check Siblings (If Walk-Up Fails)

If in a development directory (like `thoth-core`), check sibling directories:

```bash
ls .. | grep -E "(thoth-kb|kb)" 
```

Look for directories containing `kernel/` or `.opencode/thoth.json`.

### Step 4: Determine Hemisphere

Analyze CWD path:

| Path Contains | Hemisphere |
|---------------|------------|
| `/work/` | work |
| `/life/` | life |
| `/coding/` | coding |
| `/kernel/` | kernel |
| None of above | unknown |

If hemisphere is `unknown` and KB root was found, default based on context:
- Morning boot → default to `work`
- Or ask user which hemisphere

### Step 5: Extract Identity

Read `{kb_root}/{hemisphere}/AGENTS.md` and find the MCP configuration table:

```markdown
## MCP Tool Configuration

| MCP Server | Required Parameter | Value |
|------------|-------------------|-------|
| google-workspace | user_google_email | user@example.com |
```

Extract `user_google_email` value.

**Fallback locations:**
1. `{hemisphere}/AGENTS.md` MCP table (preferred)
2. `{hemisphere}/digital-identity.md`
3. `{hemisphere}/_identity.md`
4. `kernel/config/identity.md`

### Step 6: Locate Stakeholders

Check in order (use first that exists):
1. `{kb_root}/{hemisphere}/Stakeholders/_index.md`
2. `{kb_root}/{hemisphere}/people/_index.md`
3. `{kb_root}/{hemisphere}/Team/_index.md` (for direct reports)

### Step 7: Build Context Object

```json
{
  "kb_root": "/path/to/thoth-kb",
  "hemisphere": "work",
  "identity": {
    "email": "user@example.com",
    "source": "work/AGENTS.md"
  },
  "stakeholders": {
    "path": "work/Stakeholders/_index.md",
    "count": 32
  },
  "projects": {
    "path": "work/projects/_index.md"
  },
  "ready": true,
  "missing": []
}
```

### Step 8: Cache Results

Write to `.thoth-state/context.json` in KB root for session reuse.

---

## Output Format

Return a structured context object:

```
CONTEXT DISCOVERY RESULT
========================

KB Root: /path/to/thoth-kb
Hemisphere: work
Source: ~/.config/opencode/thoth.json (or walk-up, or sibling)

Identity:
  Email: user@example.com
  Timezone: Europa/Berlin (if found)
  Source: work/AGENTS.md

Stakeholders:
  Path: work/Stakeholders/_index.md
  Count: 32 files

Projects:
  Path: work/projects/_index.md

Ready: YES
Missing Required: (none)
Missing Optional: [timezone]
```

If discovery fails:

```
CONTEXT DISCOVERY FAILED
========================

KB Root: NOT FOUND
Searched:
  - ~/.config/opencode/thoth.json: not found
  - Walk-up from /current/path: no markers found
  - Siblings: no thoth-kb found

Action Required: Run context-onboarding to set up KB
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Assuming fixed file paths | Always use discovery algorithm, never hardcode |
| Not checking config file first | Config is fastest path, always check first |
| Stopping at first `kernel/` found | Verify it's a real KB (has work/ or life/ too) |
| Parsing AGENTS.md wrong | Look for MCP table specifically, not general content |
| Not caching results | Always cache to `.thoth-state/context.json` |

---

## Red Flags - STOP

- Hardcoding `/Users/username/...` paths
- Assuming `_identity.md` exists (it often doesn't)
- Not handling "hemisphere unknown" case
- Returning partial results without `ready: false` flag
- Not reporting what's missing when discovery fails

---

## Verification Checklist

- [ ] Can find KB when running from KB root
- [ ] Can find KB when running from hemisphere subdirectory
- [ ] Can find KB when running from sibling directory (e.g., thoth-core)
- [ ] Correctly extracts email from AGENTS.md MCP table
- [ ] Reports missing files clearly when KB incomplete
- [ ] Caches results for session reuse
- [ ] Works for new user with no KB (reports failure, suggests onboarding)

---

## Integration

Other skills call discovery like this:

```prose
# In morning-boot.prose

# Check for cached context
let cached = session "Read .thoth-state/context.json if exists and fresh"

if **no cached context or stale**:
  let context = do context-discovery
  
  if **context.ready is false**:
    do context-onboarding
    let context = do context-discovery  # retry
    
# Use context
let email = context.identity.email
```

---

*Context Discovery v1.0 | Part of Thoth Skill System*
