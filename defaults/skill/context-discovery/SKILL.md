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

**Path-aware behavior:** Context discovery detects WHERE you're running from and adjusts scope accordingly:
- **KB root** → Dual mode (both work + life)
- **work/** → Single mode (work only)
- **life/** → Single mode (life only)

---

## Quick Reference

| Task | How |
|------|-----|
| Find KB root | Check config → walk up for markers → check siblings |
| Determine mode | CWD at root = dual; CWD in hemisphere = single |
| Find email | Read `{hemisphere}/AGENTS.md`, extract from MCP config table |
| Find stakeholders | Check `{hemisphere}/Stakeholders/_index.md` — peers, bosses, external contacts |
| Find team | Check `{hemisphere}/Team/_index.md` — direct reports |
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

### Step 4: Determine Mode and Hemisphere(s)

**Calculate relative path from KB root to CWD:**

```
relative_path = CWD - kb_root
```

**Mode detection:**

| CWD Location | Mode | Hemispheres |
|--------------|------|-------------|
| KB root itself (`relative_path` is empty or `.`) | **dual** | work + life |
| Inside `kernel/` | **dual** | work + life |
| Inside `work/...` | **single** | work |
| Inside `life/...` | **single** | life |
| Inside `coding/...` | **single** | coding |
| Outside KB (sibling project) | **dual** | work + life |

### Step 5: Extract Identity (Per Hemisphere)

For EACH active hemisphere, read `{kb_root}/{hemisphere}/AGENTS.md` and find the MCP configuration table:

```markdown
## MCP Tool Configuration

| MCP Server | Required Parameter | Value |
|------------|-------------------|-------|
| google-workspace | user_google_email | user@example.com |
```

Extract `user_google_email` value.

**Fallback locations (per hemisphere):**
1. `{hemisphere}/AGENTS.md` MCP table (preferred)
2. `{hemisphere}/digital-identity.md`
3. `{hemisphere}/_identity.md`

### Step 6: Locate People (Per Hemisphere)

For EACH active hemisphere, discover:

**Stakeholders** (peers, bosses, external contacts):
- Check: `{kb_root}/{hemisphere}/Stakeholders/_index.md`
- Fallback: `{kb_root}/{hemisphere}/people/_index.md`

**Team** (direct reports) — typically work only:
- Check: `{kb_root}/{hemisphere}/Team/_index.md`

### Step 7: Build Context Object

**Single mode (one hemisphere):**

```json
{
  "kb_root": "/path/to/thoth-kb",
  "mode": "single",
  "hemisphere": "work",
  "identity": {
    "email": "user@company.com",
    "source": "work/AGENTS.md"
  },
  "stakeholders": {
    "path": "work/Stakeholders/_index.md",
    "count": 32
  },
  "team": {
    "path": "work/Team/_index.md",
    "count": 8
  },
  "projects": {
    "path": "work/projects/_index.md"
  },
  "ready": true,
  "missing": []
}
```

**Dual mode (both hemispheres):**

```json
{
  "kb_root": "/path/to/thoth-kb",
  "mode": "dual",
  "hemisphere": null,
  "hemispheres": {
    "work": {
      "email": "user@company.com",
      "source": "work/AGENTS.md",
      "stakeholders": {
        "path": "work/Stakeholders/_index.md",
        "count": 32
      },
      "team": {
        "path": "work/Team/_index.md",
        "count": 8
      },
      "projects": {
        "path": "work/projects/_index.md"
      }
    },
    "life": {
      "email": "user@personal.me",
      "source": "life/AGENTS.md",
      "people": {
        "path": "life/people/_index.md",
        "count": 12
      }
    }
  },
  "ready": true,
  "missing": []
}
```

### Step 8: Cache Results

Write to `.thoth-state/context.json` in KB root for session reuse.

---

## Output Format

### Single Mode Output

```
CONTEXT DISCOVERY RESULT
========================

KB Root: /path/to/thoth-kb
Mode: SINGLE
Hemisphere: work
Source: ~/.config/opencode/thoth.json

Identity:
  Email: user@company.com
  Timezone: Europe/Amsterdam
  Source: work/AGENTS.md

Stakeholders (peers, bosses, external):
  Path: work/Stakeholders/_index.md
  Count: 32 files

Team (direct reports):
  Path: work/Team/_index.md
  Count: 8 files

Projects:
  Path: work/projects/_index.md

Ready: YES
```

### Dual Mode Output

```
CONTEXT DISCOVERY RESULT
========================

KB Root: /path/to/thoth-kb
Mode: DUAL
Hemispheres: work, life
Source: ~/.config/opencode/thoth.json

=== WORK HEMISPHERE ===

Identity:
  Email: user@company.com
  Timezone: Europe/Amsterdam
  Source: work/AGENTS.md

Stakeholders (peers, bosses, external):
  Path: work/Stakeholders/_index.md
  Count: 32 files

Team (direct reports):
  Path: work/Team/_index.md
  Count: 8 files

Projects:
  Path: work/projects/_index.md

=== LIFE HEMISPHERE ===

Identity:
  Email: user@personal.me
  Source: life/AGENTS.md

People:
  Path: life/people/_index.md
  Count: 12 files

Ready: YES
```

### Failure Output

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
| Ignoring mode detection | Always check CWD relative to KB root |
| Returning single when dual expected | KB root and kernel/ paths require dual mode |

---

## Red Flags - STOP

- Hardcoding `/Users/username/...` paths
- Assuming `_identity.md` exists (it often doesn't)
- Not handling mode detection properly
- Returning partial results without `ready: false` flag
- Not reporting what's missing when discovery fails
- Treating dual mode as single (losing one hemisphere's context)

---

## Verification Checklist

- [ ] Can find KB when running from KB root → returns DUAL mode
- [ ] Can find KB when running from work/ → returns SINGLE mode (work)
- [ ] Can find KB when running from life/ → returns SINGLE mode (life)
- [ ] Can find KB when running from kernel/ → returns DUAL mode
- [ ] Can find KB when running from sibling directory → returns DUAL mode
- [ ] Correctly extracts email from BOTH hemispheres in dual mode
- [ ] Reports missing files clearly when KB incomplete
- [ ] Caches results for session reuse

---

## Integration

Other skills use context discovery like this:

```prose
# In morning-boot.prose

let context = do context-discovery

if **context.mode == "dual"**:
  # Scan both hemispheres
  let work_email = context.hemispheres.work.email
  let life_email = context.hemispheres.life.email
  
  parallel:
    agent work_scanner: "Scan work inbox" with work_email
    agent life_scanner: "Scan personal inbox" with life_email
    
else:
  # Single hemisphere
  let email = context.identity.email
  agent scanner: "Scan inbox" with email
```

---

*Context Discovery v2.0 | Path-Aware Hemisphere Detection | Part of Thoth Skill System*
