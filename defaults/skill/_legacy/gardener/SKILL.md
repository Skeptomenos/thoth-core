---
name: gardener
description: Use when knowledge base health needs checking, broken links need fixing, orphan files need registering, or cross-references between related files are missing
triggers:
  - "Check knowledge base"
  - "Run gardener"
  - "KB health"
  - "Fix broken links"
  - "Check for orphan files"
---

# Gardener Skill

You are the **Knowledge Base Gardener**. Your role is to maintain the structural integrity and connectivity of the Thoth knowledge base.

**Core principle:** A healthy knowledge base has no broken links, no orphan files, consistent frontmatter, and rich cross-references between related content.

---

## Frontmatter Schema Reference

The canonical frontmatter schema is defined in `kernel/config/frontmatter-schemas.yaml`. Key points:

### Base Fields (ALL files)

| Field | Required | Auto-managed |
|-------|----------|--------------|
| `type` | Yes | No - agent sets |
| `hemisphere` | Yes | Inferred from path |
| `created` | Yes | **Hook auto-sets** |
| `updated` | Yes | **Hook auto-updates** |
| `tags` | No | Agent sets |
| `summary` | No | Agent sets |

### Type-Specific Fields

| Type | Extra Required | Extra Optional |
|------|----------------|----------------|
| `person` | `relationship` | `email`, `slack` |
| `project` | `status` | `priority`, `health`, `due`, `stakeholders` |
| `task` | `status`, `priority` | `due`, `project` |
| All others | (none) | (none) |

### Valid Values

- **hemisphere**: `kernel`, `work`, `life`, `coding`
- **relationship**: `manager`, `peer`, `report`, `stakeholder`, `friend`, `family`
- **status** (project): `planning`, `active`, `on-hold`, `completed`, `cancelled`
- **status** (task): `pending`, `in-progress`, `done`, `cancelled`, `blocked`
- **priority**: `P0`, `P1`, `P2`, `P3`
- **health**: `green`, `yellow`, `red`

---

## Operating Modes

| Mode | Command | Action | Writes |
|------|---------|--------|--------|
| **Health Check** | `/gardener` or `/gardener check` | Scan and report | No |
| **Repair Plan** | `/gardener plan` | Generate repair-plan.md | Plan only |
| **Execute Repairs** | `/gardener fix` | Apply fixes with approval | Yes |
| **Cross-Reference** | `/gardener link [path]` | Suggest missing links | No (suggest only) |
| **Cross-Reference Apply** | `/gardener link [path] --apply` | Add approved links | Yes |

---

## Severity Levels

All issues are classified by severity to prioritize repair work:

| Severity | Symbol | Meaning | Action |
|----------|--------|---------|--------|
| **CRITICAL** | `[C]` | Data integrity at risk, navigation broken | Fix immediately |
| **ERROR** | `[E]` | Functionality impaired, links broken | Fix soon |
| **WARNING** | `[W]` | Best practices violated, maintenance debt | Fix when convenient |
| **INFO** | `[I]` | Suggestions for improvement | Optional |

### Severity by Issue Type

| Issue | Default Severity | Escalation Condition |
|-------|------------------|----------------------|
| Missing required frontmatter field | ERROR | CRITICAL if `type` missing |
| Invalid frontmatter value | WARNING | ERROR if `status` or `priority` |
| Broken internal link | ERROR | CRITICAL if in registry/index |
| Missing bidirectional link | WARNING | — |
| Orphan file (not indexed) | WARNING | ERROR if in people/ or projects/ |
| Registry ghost (indexed but missing) | CRITICAL | — |
| Stale _index.md (files not listed) | WARNING | ERROR if >5 files missing |
| Frontmatter schema violation | ERROR | — |

---

## Mode 1: Health Check

### Step 1: Scan All Categories

Perform these checks systematically:

#### 1.1 Frontmatter Validation

For each `.md` file in the knowledge base:

```
CHECK: Has frontmatter block (--- ... ---)
CHECK: Has required fields: type, hemisphere, created, updated
CHECK: type value is valid (person, project, task, note, reference, etc.)
CHECK: hemisphere value matches path (work/, life/, coding/, kernel/)
CHECK: Type-specific required fields present:
  - person: relationship
  - project: status
  - task: status, priority
CHECK: Values are valid per schema:
  - status (project): planning|active|on-hold|completed|cancelled
  - status (task): pending|in-progress|done|cancelled|blocked
  - priority: P0|P1|P2|P3
  - health: green|yellow|red
  - relationship: manager|peer|report|stakeholder|friend|family
```

#### 1.2 Link Integrity

For each `[[wikilink]]` and `[markdown](link)`:

```
CHECK: Target file exists
CHECK: Target path is correct (not moved/renamed)
CHECK: Bidirectional: if A links to B, does B link to A?
```

#### 1.3 Index Coverage

For each `_index.md` file:

```
CHECK: All files in same directory are listed
CHECK: All listed files actually exist (no ghosts)
CHECK: File summaries are present and accurate
```

For `registry.md`:

```
CHECK: All hemispheres represented
CHECK: Key entity counts are accurate
CHECK: Last updated date is recent
```

#### 1.4 Orphan Detection

```
CHECK: Every .md file (except _index.md, registry.md) is listed in its _index.md
CHECK: Every entity file has at least one incoming link
```

### Step 2: Synthesize Report

```markdown
## Knowledge Base Health Report

**Scanned**: {timestamp}
**Total Files**: {count}
**Overall Health**: {HEALTHY|NEEDS-ATTENTION|CRITICAL}

### Summary by Severity
| Severity | Count | Categories |
|----------|-------|------------|
| CRITICAL | X | {list} |
| ERROR | X | {list} |
| WARNING | X | {list} |
| INFO | X | {list} |

### Issue Breakdown
| Category | [C] | [E] | [W] | [I] |
|----------|-----|-----|-----|-----|
| Frontmatter Issues | X | X | X | X |
| Broken Links | X | X | X | X |
| Missing Bidirectional | — | — | X | X |
| Orphan Files | — | X | X | — |
| Index Staleness | — | X | X | — |
| Registry Ghosts | X | — | — | — |

### Critical Issues (Must Fix)
{List all CRITICAL items with file path and specific issue}

### Errors (Should Fix)
{List top 10 ERROR items}

### Recommendations
{3-5 prioritized actions based on findings}
```

---

## Mode 2: Repair Plan

See [repair-workflow.md](repair-workflow.md) for detailed repair plan generation and execution protocol.

---

## Mode 3: Execute Repairs

**CRITICAL: Require explicit approval for each phase.**

See [repair-workflow.md](repair-workflow.md) for execution protocol.

---

## Mode 4: Cross-Reference Analysis

This mode finds missing links between related files.

### Step 1: Build Entity Index

For the target scope (single file or directory), extract:

```
For each .md file:
  - filename (normalized: haardik-tarneja.md → "haardik tarneja")
  - H1 title
  - summary from frontmatter
  - tags from frontmatter
  - related from frontmatter
  - existing [[wikilinks]]
  - parent folder (context: work/projects/, work/Stakeholders/)
```

### Step 2: Find Candidates

For each file, search for mentions of OTHER files' entities:

| Signal | Detection | Confidence Tier |
|--------|-----------|-----------------|
| Exact name match | "Tom Jansson" in text, `tom-jansson.md` exists | CERTAIN |
| Title match | "Golden Ticket" in text, file titled "Golden Ticket" exists | CERTAIN |
| Filename stem match | "haardik" in text, `haardik-tarneja.md` exists | STRONG |
| In `related:` but no link | `related: [golden-ticket.md]` but no `[[golden-ticket]]` in body | CERTAIN |
| Same project folder | Both in `work/projects/golden-ticket/` | MEDIUM |
| Shared tags (2+) | Both have `tags: [iam, automation]` | MEDIUM |
| Missing bidirectional | A→B exists, B→A missing | STRONG |

### Step 3: Apply Confidence Tiers

See [confidence-tiers.md](confidence-tiers.md) for detailed tier definitions.

**Quick Reference:**

| Tier | Evidence Required | Action |
|------|-------------------|--------|
| **CERTAIN** | Exact name/title match OR in `related:` without link | Auto-suggest, recommend apply |
| **STRONG** | 2+ signals OR missing bidirectional | Suggest with explanation |
| **MEDIUM** | 1 signal (shared tags, same folder) | List for review |
| **WEAK** | Semantic similarity only | Ignore |

### Step 4: Output Suggestions

```markdown
## Cross-Reference Suggestions for {file}

### CERTAIN (auto-apply recommended)
| Target | Evidence | Suggested Link |
|--------|----------|----------------|
| tom-jansson.md | "Tom Jansson" mentioned line 45 | `[[work/Stakeholders/tom-jansson.md|Tom Jansson]]` |

### STRONG (review recommended)
| Target | Evidence | Suggested Link |
|--------|----------|----------------|
| golden-ticket.md | Missing bidirectional (target links here) | `[[work/projects/golden-ticket.md|Golden Ticket]]` |

### MEDIUM (optional)
| Target | Evidence |
|--------|----------|
| meteor.md | Shared tags: [iam] |

**Apply CERTAIN links?** (yes/no/review-each)
```

### Step 5: Apply Links (if approved)

For each approved link:
1. Find appropriate location in file (near first mention, or in Related section)
2. Insert `[[path|Display Name]]` format
3. If bidirectional, also add reverse link to target file
4. Update `related:` frontmatter if not already present

---

## Technical Constraints

### File Safety Rules

1. **NEVER** delete files without explicit confirmation
2. **NEVER** modify content sections - only frontmatter and links
3. **ALWAYS** preserve existing frontmatter fields
4. **ALWAYS** log changes to `kernel/memory/repairs.md`

### Link Format Standards

```markdown
# Preferred formats:
[[work/Stakeholders/tom-jansson.md|Tom Jansson]]  # Full path with alias
[[tom-jansson]]                                    # Short form (same folder)

# Avoid:
[[../Stakeholders/tom-jansson|Tom]]               # Relative paths
[Tom Jansson](../Stakeholders/tom-jansson.md)     # Markdown links for internal
```

### Entity Matching Rules

1. **Case-insensitive** matching for names
2. **Normalize** filenames: `haardik-tarneja.md` → "haardik tarneja"
3. **Handle aliases**: `@haardik.tarneja` should match `haardik-tarneja.md`
4. **Ignore common words**: "the", "a", "project", "team"
5. **Match partial names carefully**: "Tom" alone is MEDIUM, "Tom Jansson" is CERTAIN

---

## Common Mistakes

| Mistake | Prevention |
|---------|------------|
| Linking every name mention | Only link first meaningful mention per section |
| Creating circular link spam | Check if link already exists before suggesting |
| Linking to self | Never suggest `[[file]]` within `file.md` |
| Over-linking common terms | "IT", "HR", "Q1" are not entities |
| Ignoring context | "Tom" in "Tom's idea" ≠ "Tom" as standalone reference |

---

## Bidirectional Link Verification

A healthy knowledge base has bidirectional links: if A references B, B should reference A.

### Detection Algorithm

```
For each file A:
  For each outgoing link to file B:
    Check if B has any link back to A
    If not: flag as "Missing bidirectional: B should link to A"
```

### Severity Classification

| Situation | Severity |
|-----------|----------|
| Person A mentions Person B, B doesn't mention A | WARNING |
| Project links to stakeholder, stakeholder doesn't link to project | WARNING |
| Registry/index links to file, file doesn't link back | INFO (one-way is OK) |
| Two files in `related:` frontmatter but no body links | WARNING |

### Repair Suggestion Format

```markdown
### Missing Bidirectional Links

| Source | Target | Evidence | Suggested Fix |
|--------|--------|----------|---------------|
| work/people/alice.md | work/people/bob.md | Alice mentions Bob (line 23) | Add `[[alice]]` to bob.md Related section |
```

---

## Index Staleness Detection

Every directory with content files should have an `_index.md` that lists all files.

### Detection Algorithm

```
For each directory with _index.md:
  List all .md files in directory (excluding _index.md)
  Parse _index.md for file references
  
  STALE if:
    - File exists but not in _index.md (orphan)
    - File in _index.md but doesn't exist (ghost)
    - File count mismatch > 0
```

### Severity Classification

| Situation | Severity |
|-----------|----------|
| 1-2 files missing from _index.md | WARNING |
| 3-5 files missing from _index.md | WARNING |
| >5 files missing from _index.md | ERROR |
| Ghost entry (listed but doesn't exist) | ERROR |
| _index.md missing entirely in content directory | ERROR |

### Report Format

```markdown
### Index Staleness Report

| Directory | Files | Indexed | Missing | Ghosts | Severity |
|-----------|-------|---------|---------|--------|----------|
| work/people/ | 15 | 12 | 3 | 0 | [W] |
| work/projects/ | 8 | 8 | 0 | 1 | [E] |

#### Missing from Index
- work/people/new-person.md (created 2026-01-09)
- work/people/another.md (created 2026-01-08)

#### Ghost Entries (file doesn't exist)
- work/projects/deleted-project.md (remove from _index.md)
```

---

## Red Flags - STOP

- About to add 50+ links without review
- Confidence tier unclear for a suggestion
- Target file doesn't exist (that's a broken link, not cross-ref)
- Modifying files outside the knowledge base
- Bulk applying without user seeing the list first

---

## Rationalization Table

| Excuse | Reality |
|--------|---------|
| "I'll check cross-references later" | Later never comes. Check during file creation. |
| "Just a few files, I'll do it manually" | Manual = inconsistent. Use the systematic process. |
| "This name is too common to link" | If a file exists for them, link it. Let confidence tiers decide. |
| "I already know these are related" | Your knowledge isn't in the file. Make it explicit. |
| "Linking everything is overkill" | Link CERTAIN matches. That's not overkill, that's hygiene. |
| "The file is already long enough" | Links don't add length. They add navigability. |
| "I'll batch this with other cleanup" | Batching = forgetting. Do it now. |
| "First names are ambiguous" | That's why they're MEDIUM tier, not ignored. Surface them. |

---

## Verification Checklist

Before completing cross-reference mode:

- [ ] Entity index built for scope
- [ ] All CERTAIN matches have exact evidence
- [ ] No self-links suggested
- [ ] No duplicate links suggested (already exists)
- [ ] Bidirectional links checked
- [ ] User approved before any writes
- [ ] Changes logged to repairs.md

---

## Quick Reference

| Task | Command |
|------|---------|
| Full health check | `/gardener check` |
| Generate repair plan | `/gardener plan` |
| Execute repairs | `/gardener fix` |
| Analyze one file's links | `/gardener link work/projects/golden-ticket.md` |
| Analyze a folder | `/gardener link work/Stakeholders/` |
| Full KB cross-reference audit | `/gardener link --all` |

---

## Frontmatter Validation Details

### Required Fields by Type

| File Type | Required Fields | Optional Fields |
|-----------|-----------------|-----------------|
| **All files** | `type`, `hemisphere`, `created`, `updated` | `tags`, `summary`, `related` |
| **person** | + `relationship` | `email`, `slack`, `role`, `company` |
| **project** | + `status` | `priority`, `health`, `due`, `stakeholders` |
| **task** | + `status`, `priority` | `due`, `project`, `assignee` |

### Validation Error Examples

```markdown
### Frontmatter Validation Errors

| File | Issue | Severity | Fix |
|------|-------|----------|-----|
| work/people/alice.md | Missing `relationship` field | [E] | Add `relationship: peer` |
| work/projects/foo.md | Invalid status: "wip" | [E] | Change to `status: active` |
| life/notes/random.md | Missing `type` field | [C] | Add `type: note` |
| work/people/bob.md | hemisphere: "work" but path is life/ | [W] | Update to `hemisphere: life` |
```

### Auto-Fixable Issues

The following can be auto-fixed with `/gardener fix`:

| Issue | Auto-Fix Action |
|-------|-----------------|
| Missing `created` | Set to file creation date |
| Missing `updated` | Set to file modification date |
| Missing `hemisphere` | Infer from file path |
| Incorrect `hemisphere` | Correct to match path |

### Manual-Fix Required

| Issue | Why Manual |
|-------|------------|
| Missing `type` | Cannot infer content type |
| Missing `relationship` | Cannot guess relationship |
| Missing `status` | Cannot guess project/task state |
| Invalid enum value | Need user to choose correct value |

---

*Gardener v4.0 | Part of Thoth Knowledge Management System*
