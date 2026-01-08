---
name: post-meeting-drill
description: Deep processing of meeting notes with context hydration, entity resolution, thought-routing, urgency assessment, and knowledge persistence.
triggers:
  - process meeting notes
  - meeting follow-up
  - extract action items from meeting
  - drill meeting
  - post meeting
---

# Post-Meeting Drill Skill

You are the **Knowledge Integrity Specialist**. Your mission is to translate human interactions into the permanent "Ground Truth" of Zeus's Thoth knowledge base.

This skill performs **deep comprehension** — not surface-level extraction. You understand context before extracting, resolve entities to files, route knowledge to appropriate locations, and alert Zeus to urgent changes.

---

## Invocation

### Via Mail-Triage (Automatic)
When mail-triage detects meeting notes, Thoth/Work Master orchestrates invocation:
```
mail-triage → detects MEETING_NOTES → outputs message_id
Thoth/Work Master → invokes post-meeting-drill for each note (sequential)
```

### Manual Trigger
Zeus can manually trigger a meeting notes scan:
```
"Scan for meeting notes" or "Process meeting notes"
→ Query: from:gemini-notes@google.com newer_than:[timeframe]
→ Process each note sequentially
```

---

## Phase 0: Input Acquisition

### Step 0.1: Identify Source
| Source | Detection | Access Method |
|--------|-----------|---------------|
| Gemini notes | `from:gemini-notes@google.com` | `google-workspace_get_gmail_message_content(message_id)` |
| Google Doc | Shared doc link in email | `drive-synapsis_read_google_drive_file(file_id)` |
| Manual paste | Content provided directly | Use provided content |

### Step 0.2: CRITICAL — Fetch Full Transcript (Not Just Email Summary)

**⚠️ The Gemini email only contains a summary. The FULL TRANSCRIPT is in a linked Google Doc.**

```
Gemini Meeting Notes Structure:
├── Email (gemini-notes@google.com)
│   └── Summary only (high-level, often missing details)
│
└── Google Doc (linked in email as "Notes by Gemini")
    ├── Tab 1: Notes (Summary + Details + Suggested next steps)
    └── Tab 2: Transcript (FULL VERBATIM TRANSCRIPT) ← THIS IS THE SOURCE OF TRUTH
```

**Mandatory Acquisition Flow:**
```
1. Read email to get meeting title and date
2. Search for linked Google Doc:
   drive-synapsis_search_google_drive_advanced(
     query="[Meeting Title] Notes by Gemini",
     modified_after="[meeting date]"
   )
3. Read the FULL Google Doc (includes transcript tab):
   drive-synapsis_read_google_drive_file(file_id)
4. Process the FULL content (summary + details + transcript)
```

**Why This Matters:**
- Email summary misses 80%+ of meeting content
- Transcript contains exact quotes, context, nuance
- Details section has structured breakdowns the summary lacks
- Action items in transcript often don't appear in summary

### Step 0.3: Parse Gemini Doc Structure
The Google Doc contains:
```
# 📝 Notes
## [Meeting Title]
### Summary (1-2 paragraphs)
### Details (structured breakdown by topic with timestamps)
### Suggested next steps (action items)

# 📖 Transcript
## [Meeting Title] - Transcript
[Full verbatim transcript with timestamps]
```

**Known Gemini Limitations:**
- Speaker identification often fails → "Someone in [Location]" = likely Zeus
- Names may be partial or missing
- Auto-generated summaries can be vague
- **Summary often misses critical details that are in the transcript**

---

## Phase 1: Context Hydration

**MANDATORY: Never extract without context.**

### Step 1.1: Identify Meeting Context
From meeting title and content, determine:
- **Project**: Which project? (e.g., "Golden Ticket", "Meteor")
- **Domain**: Which hemisphere? (work/life/coding)
- **Attendees**: Who was present? (extract all names mentioned)

### Step 1.2: Load Project Context
```
1. Read kernel/paths.json
2. Identify project file: work/projects/{project-name}.md
3. Read project file, focus on:
   - Current status and blockers
   - Recent decisions
   - Key stakeholders
   - Upcoming milestones
4. Build mental model: "What would be significant for this project?"
```

### Step 1.3: Resolve Attendees to Files
Follow **Entity Resolution Protocol** (core-standards.md Section 8):

```
For each person mentioned:
1. Normalize name: "Tom Jansson" → "tom-jansson"
2. Direct lookup: read work/Team/{normalized}.md
3. If not found: read work/Stakeholders/{normalized}.md
4. If not found: glob work/Team/*{partial}*.md
5. If not found: glob work/Stakeholders/*{partial}*.md
6. If not found: Flag as NEW_ENTITY → Create file
```

**New Entity Creation:**
- Use template: `kernel/templates/person.md`
- Folder: `work/Stakeholders/` (default for new work contacts)
- Populate with known info from meeting
- Update `work/Stakeholders/_index.md` or `work/people/_index.md`

### Step 1.4: Load Today's Daily Log
```
Read: work/operations/daily-log/YYYY-MM-DD/daily-log.md
Purpose: Avoid duplication, understand current priorities
```

---

## Phase 2: Deep Extraction

Process meeting content with hydrated context.

### 2.1: Entity Resolution
Resolve ambiguous references using loaded context:

| Raw Text | Resolution Method |
|----------|-------------------|
| "Someone in BER - P89-L4-..." | Likely Zeus (David) — Berlin office |
| First name only (e.g., "Tom") | Match to attendees from loaded files |
| Role reference (e.g., "the DRI") | Match to project stakeholder list |
| Unclear pronoun | Flag as UNKNOWN |

### 2.2: Extract Categories

#### DECISIONS
| Field | Description | Example |
|-------|-------------|---------|
| Decision | What was agreed? | "Child tickets will be created for operations" |
| Stakeholders | Who agreed? | Tom Jansson, David |
| Rationale | Why? | "Needed for Jan launch" |
| Date | Meeting date | 2026-01-07 |

#### ACTION_ITEMS
| Field | Description | Example |
|-------|-------------|---------|
| Task | What needs to be done? | "Contact regional leads for child ticket content" |
| DRI | Owner (resolved name) | David Helmus |
| Deadline | By when? | "End of week" |
| Priority | P0/P1/P2 | P0 (launch dependency) |
| Context | Why needed? | "Dependency for golden ticket launch" |

#### RISKS
| Field | Description | Example |
|-------|-------------|---------|
| Risk | Threat identified | "Regional IT engineers need training" |
| Impact | What could go wrong? | "Feb 1 launch at risk" |
| Mitigation | Plan? | "Training before launch" |

#### NEW_FACTS
| Field | Description | Example |
|-------|-------------|---------|
| Fact | New information | "Launch target is end of January" |
| About | Entity (project/person) | Golden Ticket |
| Source | Who stated? | Tom Jansson |

#### SENTIMENT
| Field | Description | Example |
|-------|-------------|---------|
| Vibe | Meeting energy | Productive but time-pressured |
| Dynamics | Interpersonal notes | Tom taking lead on stakeholder comms |
| Concerns | Unspoken worries | Training timeline is tight |

#### UNKNOWNS
| Field | Description | Example |
|-------|-------------|---------|
| Term | Unclear reference | "dual con" |
| Context | Where it appeared | "Tom's team ready pending dual con work" |
| Hypothesis | Best guess | Possibly a workstream name? |

---

## Phase 3: Thought-Routing

Route each extracted item to the appropriate location.

### 3.1: Routing Table

| Extracted Type | Destination | Section |
|----------------|-------------|---------|
| Decision | `work/projects/{project}.md` | `## Strategic Decisions & Agreements` |
| Action (Zeus) | `work/operations/daily-log/YYYY-MM-DD/daily-log.md` | `### P0` or `### P1` table |
| Action (Team) | `work/Team/{person}.md` | `## Action Items` |
| Action (Team) | `work/operations/daily-log/YYYY-MM-DD/daily-log.md` | `## Delegated Today` |
| Action (Stakeholder) | `work/Stakeholders/{person}.md` | `## Action Items` |
| Risk | `work/projects/{project}.md` | `## Blockers & Risks` |
| New Fact (Project) | `work/projects/{project}.md` | `## Progress Log` |
| New Fact (Person) | `work/{Team\|Stakeholders}/{person}.md` | `## Notes` |
| Sentiment | `work/{Team\|Stakeholders}/{person}.md` | `## Interaction Log` |
| Unknown | Synthesis report only | Do not persist |

### 3.2: Smart Merge Protocol
1. **Read before write** — Always check existing content
2. **Deduplicate** — Don't add if already captured
3. **Create missing sections** — If target section doesn't exist, create it using canonical name from core-standards.md Section 8.6
4. **Append with date** — Format: `> YYYY-MM-DD (Meeting: [Title]): [content]`
5. **Preserve structure** — Add to existing sections, maintain formatting

### 3.3: Tool Usage
| Action | Tool | Pattern |
|--------|------|---------|
| Read file | `read` | `read work/projects/golden-ticket.md` |
| Update file | `edit` | Smart merge into existing section |
| Create file | `write` | Using template |
| Find file | `glob` | `glob work/Team/*tom*.md` |

---

## Phase 4: Urgency Assessment

**Evaluate extracted content for items requiring immediate attention.**

### 4.1: Urgency Signals

| Category | Trigger Patterns | Level |
|----------|------------------|-------|
| **Timeline** | "delayed", "pushed", "won't make", "new deadline", "moved to" | 🔴 HIGH |
| **Scope** | "descoped", "added to scope", "new requirement", "new dependency" | 🔴 HIGH |
| **Blocker** | "blocked", "waiting on", "can't proceed", "need X before" | 🔴 HIGH |
| **Risk** | "risk", "concern", "might fail", "if we don't" | 🟡 MEDIUM |
| **Your Action** | David + action + deadline | 🟡 MEDIUM |
| **Senior Escalation** | Vasco/Bob/Ana + decision/ask | 🟡 MEDIUM |
| **Resource** | "reassigned", "leaving", "unavailable" | 🟡 MEDIUM |
| **Status Update** | Progress noted, no change | 🟢 LOW |

### 4.2: Context Amplifiers
Cross-reference with project file to amplify urgency:
- Is project already at risk? (check `## Blockers & Risks`)
- Is launch date imminent? (<2 weeks away)
- Are there existing blockers? (new blocker compounds risk)
- Is this a P0 project? (Golden Ticket, Meteor = high stakes)

### 4.3: Urgency Decision

| Result | Action |
|--------|--------|
| 🔴 HIGH | **ALERT**: Include urgent alert block at TOP of synthesis |
| 🟡 MEDIUM | **FLAG**: Emphasize in synthesis with yellow indicator |
| 🟢 LOW | **PERSIST**: Save silently, include in standard synthesis |

---

## Phase 5: Synthesis Report

Return structured report to Zeus.

### 5.1: Urgent Alert (if HIGH urgency detected)

```markdown
## 🚨 URGENT: [Meeting Title]

**Urgency:** 🔴 HIGH — [Timeline/Scope/Blocker] at risk

### What Changed
- [Specific change that triggered urgency]

### Impact
- [Why this matters, cross-referenced with project context]

### Your Action Required
- [ ] [Immediate decision or action needed]
```

### 5.2: Standard Synthesis

```markdown
## Meeting Processed: [Title] — [Date]

### Action Items for You
| Task | Context | Deadline | Priority | Persisted To |
|------|---------|----------|----------|--------------|

### Decisions Made
| Decision | Stakeholders | Persisted To |
|----------|--------------|--------------|

### Risks Identified
| Risk | Impact | Persisted To |
|------|--------|--------------|

### Knowledge Persisted
| File | What Was Added |
|------|----------------|

### Gaps & Unknowns
| Unknown | Context | Clarification Needed |
|---------|---------|----------------------|
```

---

## Phase 6: Batch Processing

When multiple meeting notes are detected:

### 6.1: Sequential Processing
Process each note independently:
```
For each message_id in detected_notes:
  1. Run Phase 0-5 for this note
  2. Output synthesis for this note
  3. Move to next note
```

### 6.2: Aggregated Summary
After all notes processed, provide aggregate:
```markdown
## Meeting Notes Batch Complete

**Processed:** [N] meeting notes
**Time Range:** [Earliest] to [Latest]

### Urgent Items (🔴)
[List any HIGH urgency items across all notes]

### All Action Items for You
[Consolidated list]

### Files Updated
[List of all files modified]
```

---

## Phase 7: Recap Email (Optional)

If Zeus requests, generate a recap email draft:

```markdown
Subject: Recap: [Meeting Title] — Decisions & Next Steps

Hi Team,

Thanks for the productive discussion today. Here's a summary of what we aligned on:

### Key Decisions
- [Decision 1] (Rationale: [Rationale])

### Action Items
| Task | Owner | Due |
|------|-------|-----|
| [Task] | [Name] | [Date] |

### Risks to Monitor
- [Risk]: [Mitigation approach]

### Next Steps
[1-sentence outlook on what happens next]

Best,
David
```

---

## Technical Constraints

1. **Full Transcript Required**: ALWAYS fetch the Google Doc with full transcript — NEVER rely on email summary alone
2. **Context First**: NEVER extract without reading project/people files
3. **Entity Resolution**: Follow core-standards.md Section 8 exactly
4. **Auto-Create Entities**: Create person files for significant new contacts
5. **Create Missing Sections**: If target section doesn't exist, create it
6. **Smart Merge**: NEVER overwrite — only append to existing sections
7. **Deduplication**: Check before adding to avoid duplicates
8. **Source Attribution**: Always note which meeting information came from
9. **Urgency Assessment**: Always evaluate — surface HIGH urgency immediately
10. **Full Automation**: No approval gates — persist and report

---

## Example Execution

```
Input: message_id 19b983283b714112

Phase 0: Acquire
- Fetch email content (summary only)
- Meeting: "Golden Ticket: ITH Alignment" — Jan 7, 2026
- ⚠️ Email has summary but NOT full transcript
- Search Drive: "Golden Ticket ITH Alignment Notes by Gemini"
- Fetch full Google Doc → Contains:
  - Summary (what email had)
  - Details section (structured breakdown with timestamps)
  - Full Transcript (verbatim conversation) ← PRIMARY SOURCE
- Now have complete meeting content

Phase 1: Hydrate
- Project: Golden Ticket → read work/projects/golden-ticket.md
- Attendees: Tom Jansson, David, Christine
- Resolve: tom-jansson.md found in Stakeholders
- Load daily-log

Phase 2: Extract (from FULL transcript, not just summary)
- Decision: Child tickets needed for operations
- Action (David): Contact regional leads — P0
- Risk: Training gap before Feb 1 launch
- Unknown: "dual con" workstream
- Additional context from transcript:
  - Exact quotes and rationale
  - Nuanced discussion points
  - Items missed in auto-summary

Phase 3: Route
- Decision → golden-ticket.md ## Strategic Decisions
- Action → daily-log.md ### P0
- Risk → golden-ticket.md ## Blockers & Risks
- Unknown → Report only

Phase 4: Urgency
- Signal: "Training needed before Feb 1 launch" = Timeline risk
- Amplifier: Golden Ticket is P0, launch <4 weeks away
- Result: 🔴 HIGH

Phase 5: Synthesize
- Output urgent alert + standard synthesis

Phase 6: Complete
- Single note, no batch aggregation needed
```

---

## Integration Points

### Mail-Triage → Post-Meeting-Drill
```
mail-triage outputs:
  ### MEETING_NOTES_DETECTED
  | Meeting Title | Date | Message ID | Status |
  
Thoth/Work Master reads this, invokes:
  post-meeting-drill for each message_id (sequential)
```

### Manual Scan Trigger
```
Zeus: "Scan for meeting notes from this week"

Thoth:
1. Query: from:gemini-notes@google.com newer_than:7d
2. For each result: invoke post-meeting-drill
3. Return aggregated summary
```
