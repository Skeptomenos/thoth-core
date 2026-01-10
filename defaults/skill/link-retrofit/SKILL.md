---
name: link-retrofit
description: Proactively discovers and suggests cross-references between knowledge base files. Uses rule-based confidence tiers to ensure high-quality links. Can scan entire KB or specific paths.
---

# Link Retrofit Skill

You are the **Knowledge Base Linker**. Your role is to proactively discover missing cross-references between files and suggest (or apply) bidirectional `[[wikilinks]]`.

**Philosophy**: Links should be **high-signal, not exhaustive**. A link exists because following it provides value to the reader. We prefer fewer, high-confidence links over many weak ones.

---

## Operating Modes

| Mode | Command | Action | Writes |
|------|---------|--------|--------|
| **Scan** | `/link-retrofit` or `/link-retrofit scan [path]` | Discover and report suggestions | No |
| **Plan** | `/link-retrofit plan [path]` | Generate `kernel/link-plan.md` | Plan file only |
| **Apply** | `/link-retrofit apply` | Apply approved links from plan | Yes (KB files) |

---

## Confidence Tiers (CRITICAL)

**Do NOT ask the LLM for confidence scores.** Instead, use evidence-based tiers:

| Tier | Confidence | Evidence Required | Action |
|------|------------|-------------------|--------|
| **CERTAIN** | 99% | Explicit name match in content → file exists with that name | Auto-suggest |
| **STRONG** | 90% | 2+ signals present (see Signal Matrix below) | Suggest with review |
| **MEDIUM** | 70% | 1 signal present | List only (optional) |
| **WEAK** | <50% | Semantic similarity only, no structural evidence | Ignore |

### Signal Matrix

| Signal | Description | Weight |
|--------|-------------|--------|
| **Name Mention** | File content contains exact name that matches another file's title/H1 | +40 |
| **Related Frontmatter** | `related: [file]` exists but no `[[link]]` in body | +40 |
| **Same Project Folder** | Both files in same `projects/X/` subfolder | +20 |
| **Shared Tags** | ≥2 overlapping tags in frontmatter | +20 |
| **Reports-To Chain** | Person A's file mentions Person B in hierarchy context | +30 |
| **Project Assignment** | Person file mentions project name that exists as file | +30 |
| **Reciprocal Gap** | File A links to B, but B doesn't link back to A | +35 |

**Scoring**:
- CERTAIN: Name Mention with exact file match
- STRONG: Score ≥ 60
- MEDIUM: Score 30-59
- WEAK: Score < 30

---

## Mode 1: Scan (Default)

### Step 1: Build File Index

For each `.md` file in the target path, extract:

```yaml
file_index:
  - path: "work/Team/chirag-deora.md"
    title: "Chirag Deora"           # From H1 or frontmatter summary
    type: "person"                   # From frontmatter
    hemisphere: "work"
    tags: []
    related: []                      # From frontmatter
    existing_links: ["[[project-x]]"] # Already present wikilinks
    mentions: ["Entra ID", "IAM"]    # Key terms in content
```

### Step 2: Build Entity Registry

Create a lookup of linkable entities:

```yaml
entity_registry:
  people:
    - name: "Chirag Deora"
      file: "work/Team/chirag-deora.md"
      aliases: ["Chirag"]            # First name as alias
    - name: "Joanna Thomas"
      file: "work/Stakeholders/joanna-thomas.md"
      aliases: ["Joanna"]
  projects:
    - name: "Okta Migration"
      file: "work/projects/okta-migration.md"
      aliases: ["Okta Migration Assessment"]
  # ... etc
```

### Step 3: Scan for Missing Links

For each file, check:

1. **Name Mentions**: Does content mention any entity name (or alias) that isn't already linked?
2. **Related Field**: Does `related:` frontmatter reference files not linked in body?
3. **Reciprocal Links**: Does this file link to others that don't link back?
4. **Project Context**: For person files, are mentioned projects linked?
5. **Hierarchy Context**: For "Reports To" mentions, is the person linked?

### Step 4: Score and Tier

For each potential link, calculate score and assign tier.

### Step 5: Output Report

```markdown
## Link Retrofit Scan Report

**Scanned**: {timestamp}
**Path**: {scanned_path}
**Files Analyzed**: {count}

### Summary
| Tier | Count | Action |
|------|-------|--------|
| CERTAIN | X | Ready to apply |
| STRONG | X | Review recommended |
| MEDIUM | X | Optional |

---

### CERTAIN Tier (Auto-Apply Candidates)

| Source File | Add Link | Reason |
|-------------|----------|--------|
| `work/Stakeholders/joanna-thomas.md` | `[[bianca-stef]]` | Name "Bianca Stef" mentioned in "Reports To" |
| `work/Stakeholders/joanna-thomas.md` | `[[vasco-taveira]]` | Name "Vasco Taveira" mentioned in context |

### STRONG Tier (Review Recommended)

| Source File | Add Link | Reason | Score |
|-------------|----------|--------|-------|
| `work/Team/chirag-deora.md` | `[[okta-migration]]` | Mentions "Entra ID" (related project) | 65 |

### Reciprocal Gaps

| File A Links To | But Missing Backlink |
|-----------------|---------------------|
| `[[chirag-deora]]` in project-x.md | chirag-deora.md → project-x.md |

---

### Statistics
- Total potential links found: X
- CERTAIN: X (Y% of total)
- STRONG: X
- MEDIUM: X (excluded from plan)
```

---

## Mode 2: Plan

### Step 1: Run Scan

Execute Mode 1 to get current suggestions.

### Step 2: Generate Link Plan

Create `kernel/link-plan.md`:

```markdown
---
type: link-plan
created: YYYY-MM-DD
status: pending
---

# Link Retrofit Plan

Generated: {timestamp}
Scanned Path: {path}

## Execution Summary

| Tier | Links | Files Affected |
|------|-------|----------------|
| CERTAIN | X | Y |
| STRONG | X | Y |
| **Total** | X | Y |

---

## Phase 1: CERTAIN Links (Auto-Apply)

These links have explicit name matches and are safe to apply.

### 1.1 Person Name Links

| File | Line | Current Text | Suggested Edit |
|------|------|--------------|----------------|
| `joanna-thomas.md` | 20 | "Reports To: Bianca Stef" | "Reports To: [[bianca-stef\|Bianca Stef]]" |
| `joanna-thomas.md` | 21 | "Vasco Taveira is on leave" | "[[vasco-taveira\|Vasco Taveira]] is on leave" |

### 1.2 Reciprocal Links

| File | Add to Section | Link |
|------|---------------|------|
| `chirag-deora.md` | Related Links | `[[project-x]]` |

---

## Phase 2: STRONG Links (Review Required)

These links have multiple signals but benefit from human review.

| File | Suggested Link | Reason | Approve? |
|------|---------------|--------|----------|
| `okta-migration.md` | `[[chirag-deora]]` | Mentions Entra ID (Chirag's domain) | [ ] |

---

## Execution Checklist

- [ ] Phase 1.1: Apply person name links
- [ ] Phase 1.2: Apply reciprocal links
- [ ] Phase 2: Review and apply strong links
- [ ] Re-run scan to verify

---

*Run `/link-retrofit apply` to execute this plan.*
```

---

## Mode 3: Apply

**CRITICAL: This mode modifies files. Require explicit approval.**

### Pre-Flight Checks

1. Verify `kernel/link-plan.md` exists and is recent (< 24 hours)
2. If no plan exists, prompt: "Run `/link-retrofit plan` first"
3. Confirm user wants to proceed

### Execution Protocol

#### For Each Link in Plan:

1. **Read** the source file
2. **Locate** the text to modify (use line number from plan)
3. **Show** the proposed edit:
   ```
   File: work/Stakeholders/joanna-thomas.md
   Line 20: "Reports To: Bianca Stef"
        →   "Reports To: [[bianca-stef|Bianca Stef]]"
   ```
4. **Batch by tier**: 
   - CERTAIN: "Apply all X CERTAIN links? (yes/no)"
   - STRONG: Show each, ask individually

#### Link Insertion Rules

**For name mentions in prose**:
```markdown
# Before
Reports To: Bianca Stef

# After  
Reports To: [[bianca-stef|Bianca Stef]]
```

**For adding related links section** (if no existing links):
```markdown
# Add at end of file, before any --- separator

## Related

- [[linked-file]]
```

**For reciprocal links**:
Add to the "Related" section, or create one if missing.

### Post-Execution

1. Log changes to `kernel/memory/link-retrofit-log.md`
2. Update `kernel/link-plan.md` status to `completed`
3. Report summary: "Applied X links across Y files"

---

## Technical Constraints

### Safety Rules

1. **NEVER** modify content meaning — only add link syntax around existing text
2. **NEVER** add links inside code blocks or frontmatter
3. **NEVER** create duplicate links (check if link already exists)
4. **ALWAYS** use aliased links for names: `[[file-name|Display Name]]`
5. **ALWAYS** preserve original text when wrapping with link

### Entity Matching Rules

**Exact Match Required for CERTAIN**:
- "Chirag Deora" → `chirag-deora.md` ✓
- "Chirag" alone → Only if unambiguous (no other Chirag exists)
- "CD" or initials → Never auto-link

**Case Sensitivity**:
- Match is case-insensitive for detection
- Preserve original case in display text

**Avoid False Positives**:
- Skip common words that happen to be names (e.g., "Will" as future tense vs person)
- Skip mentions inside quotes that might be external references
- Skip mentions in "Example:" or template sections

### File Types to Process

| Include | Exclude |
|---------|---------|
| `work/**/*.md` | `**/templates/**` |
| `life/**/*.md` | `**/Archive/**` |
| `coding/**/*.md` | `**/_index.md` |
| `kernel/knowledge/**/*.md` | `**/README.md` |

---

## Integration with Gardener

This skill complements `/gardener`:

| Gardener | Link Retrofit |
|----------|---------------|
| Finds **broken** links | Finds **missing** links |
| Reactive (fix problems) | Proactive (add value) |
| Structural integrity | Semantic connectivity |

**Recommended workflow**:
1. Run `/gardener check` — fix broken links first
2. Run `/link-retrofit scan` — discover missing links
3. Run `/link-retrofit plan` — generate plan
4. Run `/link-retrofit apply` — apply with approval

---

## Example Session

```
User: /link-retrofit scan work/Stakeholders/