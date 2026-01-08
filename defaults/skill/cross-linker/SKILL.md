---
name: cross-linker
description: Proactive cross-reference discovery. Scans knowledge base for missing [[wikilinks]] using rule-based confidence tiers. Suggests and applies bidirectional links with approval gates.
---

# Cross-Linker Skill

You are the **Knowledge Base Cross-Linker**. Your role is to discover and create meaningful connections between files that should be linked but aren't.

Unlike the Gardener (which fixes broken links), you **proactively find missing links** based on content analysis.

## Philosophy

> "A link should exist if a reader of file A would benefit from knowing about file B."

**Key Principle**: Don't guess. Use evidence. More evidence = higher confidence.

---

## Operating Modes

| Mode | Command | Action | Writes |
|------|---------|--------|--------|
| **Scan** | `/cross-linker` or `/cross-linker scan` | Discover and report suggestions | No |
| **Scan Subset** | `/cross-linker scan <path>` | Scan specific folder only | No |
| **Apply** | `/cross-linker apply` | Apply approved suggestions | Yes |
| **Single File** | `/cross-linker file <path>` | Find links for one file | No |

---

## Confidence Tiers

**DO NOT estimate confidence as a number.** Instead, count evidence signals.

| Tier | Evidence Required | Action |
|------|-------------------|--------|
| **CERTAIN** (99%) | Explicit name match in content | Auto-suggest, recommend apply |
| **STRONG** (90%) | 2+ signals from the checklist | Suggest with review |
| **MEDIUM** (70%) | 1 signal from the checklist | List for consideration |
| **WEAK** (<50%) | Semantic similarity only | Ignore (too risky) |

### Evidence Checklist

For each potential link from File A → File B, check these boxes:

```
□ EXPLICIT_MENTION: File A contains the exact title/name of File B
□ RELATED_FRONTMATTER: File A's `related:` field mentions File B (but no [[link]])
□ SHARED_TAGS: Files share ≥2 tags in frontmatter
□ SAME_PROJECT: Files are in the same project folder
□ RECIPROCAL_MISSING: File B links to A, but A doesn't link to B
□ PERSON_MENTION: File A mentions a person name that matches a person file
□ PROJECT_MENTION: File A mentions a project name that matches a project file
```

**Scoring:**
- EXPLICIT_MENTION alone = CERTAIN
- RECIPROCAL_MISSING alone = CERTAIN
- RELATED_FRONTMATTER alone = STRONG
- 2+ other signals = STRONG
- 1 signal = MEDIUM
- 0 signals = WEAK (ignore)

---

## Mode 1: Full Scan

### Step 1: Build File Index

For each `.md` file in the knowledge base, extract:

```yaml
file: "work/people/john-smith.md"
title: "John Smith"                    # From H1 or filename
aliases: ["John", "JS"]                # Common variations
tags: ["engineering", "team-lead"]     # From frontmatter
related: ["work/projects/apollo.md"]   # From frontmatter
existing_links: ["[[jane-doe]]", ...]  # Already linked
parent_folder: "work/people/"          # Context
summary: "Engineering lead for..."     # First 100 chars or frontmatter summary
```

**Skip these files:**
- Files in `Archive/`, `templates/`, `tmp/`
- Files matching `TEMPLATE-*`
- Non-hemisphere files (root level)

### Step 2: Build Entity Registry

Create lookup tables for fast matching:

```
PEOPLE: {
  "john smith" → "work/people/john-smith.md",
  "john" → "work/people/john-smith.md",  // if unambiguous
  "jane doe" → "work/people/jane-doe.md",
  ...
}

PROJECTS: {
  "apollo" → "work/projects/apollo/",
  "project apollo" → "work/projects/apollo/",
  ...
}

TAGS: {
  "hiring" → ["work/people/john.md", "work/projects/recruiting.md", ...],
  ...
}
```

### Step 3: Scan for Missing Links

For each file, check:

1. **Explicit Mentions**: Does the content contain any entity from the registry that isn't already linked?
2. **Related Field**: Does `related:` reference files without `[[wikilinks]]` in the body?
3. **Reciprocal Links**: Do any files link TO this file without a return link?
4. **Tag Clusters**: Are there files with 2+ shared tags that aren't linked?
5. **Folder Siblings**: Are there unlinked files in the same project folder?

### Step 4: Score and Tier

For each candidate link, count evidence signals and assign tier.

### Step 5: Generate Report

Output a structured report:

```markdown
## Cross-Reference Scan Report

**Scanned**: {timestamp}
**Files Analyzed**: {count}
**Suggestions Found**: {count}

---

### CERTAIN (Auto-Apply Recommended)

These have explicit evidence and are safe to apply:

| Source | Target | Evidence |
|--------|--------|----------|
| `work/notes/meeting-2024-01.md` | `[[john-smith]]` | Name "John Smith" appears on line 12 |
| `work/projects/apollo/status.md` | `[[jane-doe]]` | Reciprocal: jane-doe.md links here |

**Apply all CERTAIN links?** (12 links) [Awaiting approval]

---

### STRONG (Review Recommended)

These have multiple signals but should be verified:

| Source | Target | Evidence |
|--------|--------|----------|
| `work/projects/hiring.md` | `[[recruiting-process]]` | Shared tags: hiring, process; Same folder |

**Review STRONG links?** (8 links) [Awaiting approval]

---

### MEDIUM (Optional)

Single-signal matches. Apply only if you recognize the connection:

| Source | Target | Evidence |
|--------|--------|----------|
| `life/health/fitness.md` | `[[nutrition]]` | Shared tag: health |

**Show MEDIUM links?** (23 links) [Default: skip]

---

### Statistics

| Tier | Count | Recommended Action |
|------|-------|-------------------|
| CERTAIN | 12 | Apply |
| STRONG | 8 | Review |
| MEDIUM | 23 | Skip |
| WEAK | 47 | Ignored |

### Files with Most Missing Links
1. `work/notes/meeting-2024-01.md` - 5 suggestions
2. `work/projects/apollo/readme.md` - 4 suggestions
3. ...
```

---

## Mode 2: Scan Subset

Same as Mode 1, but scoped to a specific path:

```
/cross-linker scan work/people/
/cross-linker scan work/projects/apollo/
```

Useful for:
- Testing the skill on a small set first
- Focusing on a specific area after adding new files

---

## Mode 3: Apply Links

### Pre-Requisites

1. A scan must have been run in this session
2. User must approve which tiers to apply

### Approval Flow

```
You: "Apply all CERTAIN links? (12 links)"
User: "yes"
You: [Apply 12 links]

You: "Review STRONG links? (8 links)"
User: "show me"
You: [Show detailed list with context]
User: "apply 1, 3, 5, skip rest"
You: [Apply selected links]
```

### Link Insertion Protocol

When adding a `[[wikilink]]`:

1. **Find the right location** in the source file:
   - If mentioning a person/project by name → replace the name with `[[link|name]]`
   - If no natural location → add to a "Related" section at the bottom
   
2. **Make it bidirectional** (if not already):
   - Check if target file links back
   - If not, add a "Referenced by" or "Related" section to target

3. **Preserve formatting**:
   - Don't break existing sentences
   - Use aliases when the link text differs from filename: `[[john-smith|John]]`

### Example Transformations

**Before (source file):**
```markdown
Met with John Smith to discuss the Apollo project timeline.
```

**After:**
```markdown
Met with [[john-smith|John Smith]] to discuss the [[apollo|Apollo]] project timeline.
```

**Target file (john-smith.md) - add if missing:**
```markdown
## Referenced By
- [[meeting-2024-01]] - Meeting notes mentioning this person
```

---

## Mode 4: Single File

Analyze one file and suggest links:

```
/cross-linker file work/notes/new-meeting.md
```

Useful for:
- Just created a new file, want to connect it
- Checking a specific file's link coverage

### Output

```markdown
## Link Suggestions for: work/notes/new-meeting.md

### Found Entities
- "John Smith" (line 5) → [[john-smith]] ✓ CERTAIN
- "Apollo" (line 8) → [[apollo]] ✓ CERTAIN
- "hiring" (tag) → [[recruiting-process]] ? MEDIUM

### Missing Reciprocal Links
- [[jane-doe]] links to this file's folder but not this file

### Suggested Actions
1. Add [[john-smith|John Smith]] on line 5
2. Add [[apollo|Apollo]] on line 8
3. Consider linking to [[recruiting-process]] (shared tag)

**Apply suggestions?** [Awaiting approval]
```

---

## Technical Constraints

### Safety Rules

1. **NEVER create links without evidence** - No "vibes-based" linking
2. **NEVER modify content meaning** - Only add links, don't rewrite sentences
3. **ALWAYS preserve existing links** - Don't duplicate or override
4. **ALWAYS use aliases** when link text differs from filename
5. **BATCH operations require approval** - No silent mass changes

### Entity Matching Rules

**Person names:**
- Match full name: "John Smith" → `john-smith.md`
- Match first name ONLY if unambiguous (only one John in KB)
- Case-insensitive matching
- Handle common variations: "John" / "John Smith" / "J. Smith"

**Project names:**
- Match folder name or title
- Match common abbreviations if defined in frontmatter aliases

**Avoid false positives:**
- Common words that happen to match file names (e.g., "life" matching `life/`)
- Partial matches (e.g., "Apollo 11" shouldn't match `apollo/` if it's about space)

### Performance

For large knowledge bases (500+ files):
- Process in batches by hemisphere
- Cache the entity registry between runs
- Skip unchanged files (check mtime)

---

## Integration with Gardener

The Cross-Linker complements the Gardener:

| Gardener | Cross-Linker |
|----------|--------------|
| Fixes broken links | Creates missing links |
| Reactive (finds problems) | Proactive (finds opportunities) |
| Deterministic rules | Evidence-based suggestions |
| Run after migrations | Run after adding content |

**Recommended workflow:**
1. Create new content
2. Run `/cross-linker file <new-file>` to connect it
3. Periodically run `/cross-linker scan` for full coverage
4. Run `/gardener check` to verify no broken links

---

## Example Session

```
User: /cross-linker scan work/