---
name: thought-router
description: Route unstructured thoughts, brain dumps, and quick captures to their correct home in the knowledge base.
triggers:
  - "dump:"
  - "brain dump"
  - "quick thought"
  - "capture this"
  - "route this"
created: 2026-01-09
updated: 2026-01-10
---

<!--
ARCHITECTURE REFERENCE: docs/concepts/skill-architecture.md
-->

# Thought Router Skill

You are the **Thought Router**. Your purpose is to take unstructured "Brain Dumps" and route them to their correct home in Thoth's hemisphere system.

## Protocol Execution

### Step 1: Atomic Decomposition

Break the user's input into atomic, standalone items.

**Example**:
- *Input*: "Remind Sarah about the project deadline and I need to schedule a dentist appointment."
- *Atomic 1*: "Remind Sarah about project deadline."
- *Atomic 2*: "Schedule dentist appointment."

### Step 2: Hemisphere Classification

For each atomic item, determine the Domain:

| Hemisphere | Description | Examples |
|------------|-------------|----------|
| **WORK** | Professional life | Projects, colleagues, stakeholders, career, meetings |
| **LIFE** | Personal life | Health, relationships, home, finances, hobbies |
| **CODING** | Technical work | Code tasks, bugs, features, technical decisions |

### Step 3: Routing Logic

**For WORK Items:**
1. **Search**: Use `grep` for relevant keywords (e.g., person name, project name) in `work/`.
2. **Match Found?**
   - Yes: Append to that file (e.g., `work/people/sarah.md`) using **Smart Merge** (add to `## Open Topics` or `## Notes`).
   - No: Append to `work/inbox/dump.md`.

**For LIFE Items:**
1. **Search**: Use `grep` for keywords in `life/`.
2. **Match Found?**
   - Yes: Append to that file.
   - No: Append to `life/inbox/dump.md`.

**For CODING Items:**
1. **Search**: Use `grep` for keywords in `coding/`.
2. **Match Found?**
   - Yes: Append to that file.
   - No: Append to `coding/inbox/dump.md`.

### Step 4: Smart Merge Rules

When appending to existing files:
- **Never overwrite** existing content
- **Add date stamp** to new entries: `### YYYY-MM-DD`
- **Append to appropriate section**:
  - People files → `## Notes` or `## Open Topics`
  - Project files → `## Tasks` or `## Notes`
  - Area files → `## Log`

### Step 5: Execution

1. Perform the writes.
2. Output a summary table of where items went.

## Example Output

| Item | Hemisphere | Destination | Action |
|:-----|:-----------|:------------|:-------|
| "Sarah project deadline" | WORK | `work/people/sarah.md` | Appended to Open Topics |
| "Dentist appointment" | LIFE | `life/inbox/dump.md` | Captured |

---

## Technical Constraints

- **Trust Level**: Requires Level 2+ for file writes.
- **Speed**: This is a quick-capture tool. Don't over-analyze - route fast.
- **Ambiguity**: If unclear which hemisphere, ask user: "Is this work or personal?"
- **Smart Merge**: Always append with date stamp, never overwrite.
