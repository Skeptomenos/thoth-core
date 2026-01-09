# Repair Workflow

Detailed protocol for generating and executing repair plans.

---

## Generating a Repair Plan

### Step 1: Run Health Check First

Always start with fresh scan data:

```bash
npx tsx scripts/gardener-scan.ts --verbose
```

### Step 2: Create Repair Plan File

Create `kernel/repair-plan.md`:

```markdown
---
type: repair-plan
created: YYYY-MM-DD
status: pending
---

# Knowledge Base Repair Plan

Generated: {timestamp}
Based on: migration-report.json

## Phase 1: Critical Fixes (Errors)

### 1.1 Fix Broken Links
| File | Line | Broken Link | Suggested Fix |
|------|------|-------------|---------------|
| {file} | {line} | [[target]] | {suggestion} |

### 1.2 Fix Registry Ghosts
| Registry | Referenced Path | Action |
|----------|-----------------|--------|
| {registry} | {path} | Remove reference / Create file |

## Phase 2: Structural Improvements (Warnings)

### 2.1 Add Missing Frontmatter
| File | Missing Fields | Auto-fixable |
|------|----------------|--------------|
| {file} | type, hemisphere | Yes |

### 2.2 Register Orphan Files
| File | Suggested Registry | Entry |
|------|-------------------|-------|
| {file} | {registry} | `- [[{file}]]` |

## Phase 3: Consistency Fixes

### 3.1 Fix Hemisphere Mismatches
| File | Current | Should Be |
|------|---------|-----------|
| {file} | work | life |

## Execution Checklist

- [ ] Phase 1.1: Fix broken links
- [ ] Phase 1.2: Fix registry ghosts
- [ ] Phase 2.1: Add frontmatter
- [ ] Phase 2.2: Register orphans
- [ ] Phase 3.1: Fix hemisphere mismatches
- [ ] Re-run health check to verify

## Risk Assessment

**Total Changes**: X files
**Auto-fixable**: X files
**Manual Review Required**: X files
```

### Step 3: Present Summary

Summarize for user and await instructions.

---

## Executing Repairs

### Pre-Flight Checks

1. Verify `kernel/repair-plan.md` exists and is recent (< 1 hour)
2. If no plan exists, prompt: "Run `/gardener plan` first"
3. Confirm user wants to proceed

### Execution Protocol

For each phase:

1. **Announce** what will be changed
2. **Show** specific edits (diff preview)
3. **Request approval**: "Apply these X changes? (yes/no/skip)"
4. **Execute** only if approved
5. **Log** changes to `kernel/memory/repairs.md`

---

## Phase-Specific Instructions

### Fixing Frontmatter

For missing frontmatter, add complete block:

```yaml
---
type: {inferred from path: person/project/knowledge}
hemisphere: {from actual location}
created: {today}
updated: {today}
tags: []
summary: "{extracted from first heading or content}"
related: []
---
```

For missing fields, add only missing ones. Never overwrite existing.

### Fixing Broken Links

Options (ask user):
1. **Remove** the broken link (safest)
2. **Create** the target file (if it should exist)
3. **Redirect** to different target (if moved)
4. **Skip** (manual fix later)

### Registering Orphan Files

Add to appropriate registry:

```markdown
- [[path/to/file]] - {summary from frontmatter or first line}
```

---

## Post-Execution

1. Re-run `npx tsx scripts/gardener-scan.ts` to verify
2. Update `kernel/repair-plan.md` status to `completed`
3. Report final health status

---

## Logging Format

Append to `kernel/memory/repairs.md`:

```markdown
## {date} - Gardener Repair Session

**Scope**: {what was fixed}
**Changes**: {count} files modified

### Summary
- Fixed X broken links
- Added frontmatter to Y files
- Registered Z orphan files

### Files Modified
- `path/to/file1.md` - Added frontmatter
- `path/to/file2.md` - Fixed broken link to [[target]]
```
