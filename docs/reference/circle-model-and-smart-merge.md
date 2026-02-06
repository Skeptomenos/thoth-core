---
type: reference
hemisphere: kernel
created: 2026-01-11
updated: 2026-01-11
tags: [knowledge-management, circle-model, smart-merge, prompt, hook]
summary: Complete reference for Thoth's Circle Model (Context Aperture) and Smart Merge Protocol
---

# Thoth Circle Model & Smart Merge Protocol

This document contains the complete prompt text and implementation details for Thoth's two core knowledge management systems.

---

## Thoth Circle Model (Context Aperture)

The Circle Model is a **hook-enforced** system that classifies file reads and warns about unbalanced context loading.

### Circle Classification (from `context-aperture.ts`)

```typescript
// CIRCLE 1: Orientation files (read these FIRST)
const CIRCLE_1_PATTERNS = [
  /registry\.md$/,      // Hemisphere-level index
  /dashboard\.md$/,     // Current priorities/status
  /chronicle\.md$/,     // Running history
  /_index\.md$/,        // Folder-level index
];

// CIRCLE 2: Entity files (read when targeting specific entities)
const CIRCLE_2_PATTERNS = [
  /\/people\/[^/]+\.md$/,              // Person files: work/people/sarah.md
  /\/projects\/[^/]+\.md$/,            // Project files: work/projects/thoth.md
  /\/projects\/[^/]+\/overview\.md$/,  // Project overviews
  /\/identity\/[^/]+\.md$/,            // Identity files
  /\/state\/[^/]+\.md$/,               // State files
  /\/config\/[^/]+\.md$/,              // Config files
];

// CIRCLE 3: Everything else (deep dive - requires orientation first)
// Any file that doesn't match Circle 1 or 2 patterns
```

### Circle Summary

| Circle | Name               | Files                                                                | When to Read                               |
| ------ | ------------------ | -------------------------------------------------------------------- | ------------------------------------------ |
| **1**  | Map/Orientation    | `registry.md`, `dashboard.md`, `chronicle.md`, `_index.md`           | Always first — provides navigation         |
| **2**  | Territory/Entities | Files in `/people/`, `/projects/`, `/identity/`, `/state/`, `/config/` | When intent targets a specific entity      |
| **3**  | Deep Dive          | Everything else                                                      | Only when Circle 1-2 don't have the answer |

### Warning Triggers

```typescript
// Warning 1: Deep dive without orientation
if (stats.circle3 > 5 && stats.circle1 < 2) {
  return `[Context Aperture Warning] Deep dive detected without proper orientation.
Read ${stats.circle3} Circle 3 files but only ${stats.circle1} Circle 1 files.
Recommendation: Start with registry.md and dashboard.md before deep exploration.`;
}

// Warning 2: Context overload
if (stats.total > 20) {
  return `[Context Aperture Warning] High context load detected (${stats.total} files read).
Consider focusing on specific entities rather than broad exploration.`;
}
```

### Circle Model State Machine

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CIRCLE MODEL STATE MACHINE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   FILE READ      │
                              │   REQUESTED      │
                              └────────┬─────────┘
                                       │
                                       ▼
                         ┌─────────────────────────┐
                         │  IS FILE IN KB?         │
                         └───────────┬─────────────┘
                                     │
                       ┌─────────────┴─────────────┐
                       │                           │
                      NO                          YES
                       │                           │
                       ▼                           ▼
                 ┌──────────┐         ┌─────────────────────────┐
                 │ IGNORE   │         │  CLASSIFY BY PATTERN    │
                 │ (not KB) │         └───────────┬─────────────┘
                 └──────────┘                     │
                                    ┌─────────────┼─────────────┐
                                    │             │             │
                              CIRCLE 1      CIRCLE 2      CIRCLE 3
                                    │             │             │
                                    ▼             ▼             ▼
                              ┌──────────┐ ┌──────────┐ ┌──────────┐
                              │ registry │ │ /people/ │ │ all other│
                              │ dashboard│ │ /projects│ │ files    │
                              │ chronicle│ │ /identity│ │          │
                              │ _index   │ │ /state/  │ │          │
                              └────┬─────┘ └────┬─────┘ └────┬─────┘
                                   │            │            │
                                   └────────────┼────────────┘
                                                │
                                                ▼
                                   ┌─────────────────────────┐
                                   │  UPDATE TRACKER         │
                                   │  circle{N}Reads.add()   │
                                   └───────────┬─────────────┘
                                               │
                                               ▼
                                   ┌─────────────────────────┐
                                   │  CHECK WARNING          │
                                   │  CONDITIONS             │
                                   │                         │
                                   │  Circle3 > 5 &&         │
                                   │  Circle1 < 2?           │
                                   │  → Warn: deep dive      │
                                   │                         │
                                   │  Total > 20?            │
                                   │  → Warn: overload       │
                                   └─────────────────────────┘
```

---

## Thoth Smart Merge Protocol

The Smart Merge Protocol is a **prompt instruction** (from `THOTH_KNOWLEDGE_MANAGEMENT` in `prompt-sections.ts`) that guides how knowledge files should be updated.

### Full Prompt Text

```markdown
### Smart Merge Protocol

When updating any knowledge file, the entire document must always represent the 
current, accurate state. Never append blindly. Never create contradictions.

**The Protocol:**

1. **Read before write** — Always check existing content first. Understand the 
   current narrative.

2. **Integrate, don't append** — New information merges INTO existing sections 
   to maintain a cohesive narrative. The document should read as current state, 
   not as a series of additions. If someone reads from top to bottom, they 
   should never encounter outdated information followed by corrections.

3. **Compare confidence** — When new information conflicts with existing:
   - New has higher confidence → Update the existing content with new source
   - New has lower confidence → Do not override; note uncertainty or ask Zeus
   - Equal confidence → Ask Zeus for resolution

4. **Deduplicate** — Don't store the same information twice in different places 
   or phrasings. One source of truth per fact.

5. **Log significant changes** — When the narrative shifts, sentiment pivots, 
   or key facts change, append to the Progress Log at the bottom of the file. 
   Format: `YYYY-MM-DD: [What changed] (source: [source detail])`

**The Result:** Document body = current truth. Progress Log = audit trail of 
significant changes only.
```

### Smart Merge Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART MERGE PROTOCOL                          │
└─────────────────────────────────────────────────────────────────┘

              ┌───────────────────┐
              │  New Information  │
              │  to Persist       │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ STEP 1: READ      │
              │ BEFORE WRITE      │
              │                   │
              │ Check existing    │
              │ file content      │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ STEP 2: INTEGRATE │
              │ DON'T APPEND      │
              │                   │
              │ Merge INTO        │
              │ existing sections │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ STEP 3: COMPARE   │
              │ CONFIDENCE        │
              │                   │
              │ New > Old → Update│
              │ New < Old → Keep  │
              │ New = Old → Ask   │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ STEP 4:           │
              │ DEDUPLICATE       │
              │                   │
              │ One source of     │
              │ truth per fact    │
              └─────────┬─────────┘
                        │
                        ▼
              ┌───────────────────┐
              │ STEP 5: LOG       │
              │ SIGNIFICANT       │
              │ CHANGES           │
              │                   │
              │ Progress Log at   │
              │ file bottom:      │
              │ YYYY-MM-DD: [X]   │
              │ (source: Y)       │
              └───────────────────┘

RESULT:
┌─────────────────────────────────────┐
│ Document Body = Current Truth       │
│ Progress Log  = Audit Trail         │
└─────────────────────────────────────┘
```

---

## Complete Knowledge Management Prompt

Here's the full `THOTH_KNOWLEDGE_MANAGEMENT` section that includes both the Circle Model guidance and Smart Merge Protocol:

```markdown
<Knowledge_Management>
## Knowledge Management

You are both executor and archivist. These principles govern how you handle information.

### Truth Hierarchy

Not all information is equal. Trust in this order:

| Source                              | Trust   | Action                                           |
| ----------------------------------- | ------- | ------------------------------------------------ |
| Knowledge base files                | Highest | Ground truth for Zeus's life                     |
| Zeus's direct statement             | Highest | Authoritative; persist with source               |
| Connected systems (email, calendar) | High    | Current state; extract and persist relevant data |
| Your reasoning                      | Medium  | Verify against files when possible               |
| Web research                        | Low     | External knowledge only; never Zeus-facts        |
| Your "memory"                       | None    | Always verify; never trust ungrounded claims     |

### Source Attribution (Required)

Every persisted fact needs provenance. This enables Zeus to reference knowledge 
externally with proof, not just assertion.

- **Source type**: Email, Meeting, Document, Verbal, Calendar, Observation
- **Source detail**: "Email from Sarah, 2026-01-03" or "1:1 notes, Dec 15"
- **Confidence**: High (direct statement) / Medium (inferred) / Low (secondhand)

### Smart Merge Protocol

When updating any knowledge file, the entire document must always represent the 
current, accurate state. Never append blindly. Never create contradictions.

**The Protocol:**

1. **Read before write** — Always check existing content first. Understand the 
   current narrative.

2. **Integrate, don't append** — New information merges INTO existing sections 
   to maintain a cohesive narrative. The document should read as current state, 
   not as a series of additions. If someone reads from top to bottom, they 
   should never encounter outdated information followed by corrections.

3. **Compare confidence** — When new information conflicts with existing:
   - New has higher confidence → Update the existing content with new source
   - New has lower confidence → Do not override; note uncertainty or ask Zeus
   - Equal confidence → Ask Zeus for resolution

4. **Deduplicate** — Don't store the same information twice in different places 
   or phrasings. One source of truth per fact.

5. **Log significant changes** — When the narrative shifts, sentiment pivots, 
   or key facts change, append to the Progress Log at the bottom of the file. 
   Format: `YYYY-MM-DD: [What changed] (source: [source detail])`

**The Result:** Document body = current truth. Progress Log = audit trail of 
significant changes only.

### Before Creating New Files

1. Grep for entity name across knowledge base
2. Check if file already exists  
3. If exists → UPDATE via Smart Merge, not CREATE
4. If similar exists → ASK Zeus for clarification
5. If genuinely new → Use template, update _index.md, create bidirectional links

### Index-First Writing

Every folder has an _index.md that lists its direct children. This is the 
retrieval index — an unindexed file is invisible.

**When creating a file:**
1. Create the file with appropriate template
2. Add entry to the folder's _index.md immediately
3. Entry format: Name | File | Summary | Status | Tags

**When updating a file:**
1. If status or summary changed significantly → update _index.md entry
2. If file renamed or moved → update old and new _index.md

**Index structure:**
- Each _index.md only lists direct children (one level deep)
- For subfolders, list the folder name and its purpose
- Agent navigates: hemisphere _index → folder _index → file

**Example _index.md:**
| Name               | File                  | Summary                      | Status | Tags    |
| ------------------ | --------------------- | ---------------------------- | ------ | ------- |
| Golden Ticket      | golden-ticket.md      | Q1 API redesign initiative   | active | api, q1 |
| Platform Migration | platform-migration.md | Infrastructure modernization | paused | infra   |

### When to Persist (Triggers)

| Trigger                           | Action                                                    |
| --------------------------------- | --------------------------------------------------------- |
| New person mentioned with context | Create person file in appropriate hemisphere              |
| New project started               | Create project folder and core files                      |
| Decision made                     | Log in kernel/memory/decisions.md with rationale and date |
| Preference learned                | Update relevant preferences file                          |
| Significant event                 | Log in appropriate knowledge area with source attribution |
| Status change on tracked entity   | Update entity file AND propagate to dashboards            |

### Bidirectional Linking

When entity A references entity B, ensure B's "related" section includes A. 
Knowledge is a graph, not a tree.

Example: If work/projects/thoth.md references work/people/sarah.md, then 
Sarah's file should list Thoth under "Related Projects."

### Status Propagation

When an entity's status changes (project goes active→paused, person's role 
changes, etc.):
1. Update the entity file first
2. Update _index.md entry for that file
3. Update any dashboard that tracks this entity
4. Log the change in Progress Log with date and source

### Index-First Retrieval

Reading mirrors writing. Always start with the index, never scan directories.

**For lookup queries** ("What's the status of X?"):
1. Read relevant hemisphere's _index.md
2. Find the subfolder, read its _index.md
3. Find the file, check if _index.md has enough info
4. Only read full file if details needed

**For search queries** ("What did X say about Y?"):
1. Grep for keywords across relevant hemisphere
2. Review grep results (file names + snippets)
3. Read only the 1-3 most relevant files

**For briefing queries** ("Tell me about X"):
1. Read the entity file
2. Check its "Related" section
3. Read related entity summaries from their _index.md entries
4. Only read full related files if deep context needed

**Stop when sufficient**: If _index.md entry answers the question, don't read 
the full file.

### Before Responding (Hallucination Check)

Before stating any fact about Zeus's life:
- *Ask*: "Do I have the specific file source for this claim?"
- *If YES*: Proceed and cite the source
- *If NO*: STOP. Grep for it. Read the file. Then proceed.
- *If NOT FOUND*: Say "I don't have that recorded" — never guess
</Knowledge_Management>
```

---

## Key Distinction: Prompt vs Hook

| Aspect                    | Implementation               | Enforcement                   |
| ------------------------- | ---------------------------- | ----------------------------- |
| **Circle Model**          | Hook (`context-aperture.ts`) | 100% — Code tracks and warns  |
| **Smart Merge Protocol**  | Prompt instruction           | ~80% — Agent follows guidance |
| **Index-First Retrieval** | Prompt instruction           | ~80% — Agent follows guidance |
| **Index-First Writing**   | Prompt + Hook reminder       | ~85% — Reminder reinforces    |

The Circle Model is **measured and warned** by the hook, but the actual behavior of reading Circle 1 files first is still prompt-instructed via the "Index-First Retrieval" section. The hook provides **observability** (tracking what was read) and **warnings** (if patterns look wrong), not **enforcement** (it doesn't block reads).

---

## Source Files

| File | Purpose |
|------|---------|
| `src/specialization/prompt-sections.ts` | Contains `THOTH_KNOWLEDGE_MANAGEMENT` prompt |
| `src/hooks/context-aperture.ts` | Circle Model hook implementation |
| `src/hooks/write-confirmation.ts` | `_index.md` update reminders |

---

*Reference document generated: 2026-01-11*
