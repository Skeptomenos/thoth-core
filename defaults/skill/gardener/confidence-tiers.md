# Confidence Tiers for Cross-Reference Suggestions

This document defines the evidence requirements for each confidence tier. The gardener uses rule-based confidence, not LLM-estimated percentages.

---

## Tier Definitions

### CERTAIN (Auto-apply recommended)

**Evidence required:** ONE of the following:

| Signal | Example | Why Certain |
|--------|---------|-------------|
| Exact full name match | "Tom Jansson" in text, `tom-jansson.md` exists | Unambiguous identity |
| Exact title match | "Golden Ticket" in text, file H1 is "Golden Ticket" | Unambiguous reference |
| In `related:` without body link | `related: [golden-ticket.md]` but no `[[golden-ticket]]` | Explicit intent, missing execution |
| Explicit @mention | `@haardik.tarneja` matches `haardik-tarneja.md` | Direct reference syntax |

**Action:** Suggest with "auto-apply recommended" flag. User can batch-approve.

---

### STRONG (Review recommended)

**Evidence required:** TWO OR MORE of the following, OR one high-signal match:

| Signal | Example | Notes |
|--------|---------|-------|
| Missing bidirectional | A links to B, B doesn't link to A | High-value connection |
| Filename stem + context | "Haardik" in Golden Ticket file, both in work/ | Context strengthens match |
| First name + same project | "Tom" in file, both tagged `golden-ticket` | Project context disambiguates |
| Shared tags (2+) | Both have `tags: [iam, automation]` | Topical relationship |

**Action:** Suggest with explanation. User reviews individually or by batch.

---

### MEDIUM (Optional, list only)

**Evidence required:** ONE weak signal:

| Signal | Example | Notes |
|--------|---------|-------|
| Shared tags (1) | Both have `tags: [iam]` | Weak topical link |
| Same parent folder | Both in `work/projects/` | Structural proximity |
| Partial name match | "James" in text, `james-brooks.md` exists | Ambiguous without context |
| Summary keyword overlap | Both summaries mention "automation" | Semantic similarity |

**Action:** List for awareness. Do not suggest applying unless user requests.

---

### WEAK (Ignore)

**Evidence:** Semantic similarity only, no structural signals.

| Signal | Example | Why Ignore |
|--------|---------|------------|
| Common word overlap | Both mention "project" | Too generic |
| Single shared tag (generic) | Both have `tags: [work]` | Not meaningful |
| Same hemisphere only | Both in `work/` | Too broad |

**Action:** Do not surface. These create noise, not value.

---

## Evidence Accumulation

Signals stack. More signals = higher tier.

```
1 weak signal           → MEDIUM
2 weak signals          → STRONG
1 strong signal         → STRONG
1 certain signal        → CERTAIN
Any certain + anything  → CERTAIN
```

---

## Disambiguation Rules

When a name could match multiple files:

| Situation | Resolution |
|-----------|------------|
| "Tom" matches `tom-jansson.md` and `tom-smith.md` | Downgrade to MEDIUM, note ambiguity |
| "Tom Jansson" matches exactly one file | CERTAIN |
| "Tom" + context "People Team" matches one file | STRONG (context disambiguates) |
| "Tom" with no context | MEDIUM at best, likely ignore |

---

## False Positive Prevention

Do NOT suggest links when:

1. **Already linked** - Check existing `[[wikilinks]]` first
2. **Self-reference** - Never link a file to itself
3. **Common terms** - "IT", "HR", "Q1", "2026" are not entities
4. **Possessive context** - "Tom's idea" may not warrant a link
5. **Quoted/example text** - Code blocks, quotes may mention names without intent
6. **Negative context** - "Not Tom" or "unlike Golden Ticket" may not warrant links

---

## Output Format by Tier

### CERTAIN
```markdown
| Target | Evidence | Suggested Link |
|--------|----------|----------------|
| tom-jansson.md | Exact: "Tom Jansson" at line 45 | `[[work/Stakeholders/tom-jansson.md\|Tom Jansson]]` |
```

### STRONG
```markdown
| Target | Evidence | Suggested Link |
|--------|----------|----------------|
| golden-ticket.md | Bidirectional missing + shared tag [iam] | `[[work/projects/golden-ticket.md\|Golden Ticket]]` |
```

### MEDIUM
```markdown
| Target | Evidence |
|--------|----------|
| meteor.md | Shared tag: [iam] |
```

---

## Verification Questions

Before finalizing a suggestion, ask:

1. Would a reader benefit from this link?
2. Is the connection meaningful or coincidental?
3. Does the context support the reference?
4. Is this the right place to add the link (first mention, related section)?

If uncertain on any question, downgrade one tier.
