---
created: 2026-01-10
updated: 2026-01-10
---

# Meeting Synthesis Template

## Urgent Alert Block (if HIGH urgency)

```markdown
## 🚨 URGENT: {{MEETING_TITLE}}

**Urgency:** 🔴 HIGH — {{URGENCY_REASON}}

### What Changed
- {{CHANGE_DESCRIPTION}}

### Impact
- {{IMPACT_DESCRIPTION}}

### Your Action Required
- [ ] {{IMMEDIATE_ACTION}}
```

---

## Standard Synthesis

```markdown
## Meeting Processed: {{MEETING_TITLE}} — {{DATE}}

### Action Items for You

| Task | Context | Deadline | Priority | Persisted To |
|------|---------|----------|----------|--------------|
{{ACTION_ITEMS_TABLE}}

### Decisions Made

| Decision | Stakeholders | Persisted To |
|----------|--------------|--------------|
{{DECISIONS_TABLE}}

### Risks Identified

| Risk | Impact | Persisted To |
|------|--------|--------------|
{{RISKS_TABLE}}

### Knowledge Persisted

| File | What Was Added |
|------|----------------|
{{PERSISTENCE_TABLE}}

### Gaps & Unknowns

| Unknown | Context | Clarification Needed |
|---------|---------|----------------------|
{{UNKNOWNS_TABLE}}
```

---

## Batch Aggregate Summary

```markdown
## Meeting Notes Batch Complete

**Processed:** {{COUNT}} meeting notes
**Time Range:** {{DATE_RANGE}}

### Urgent Items (🔴)
{{URGENT_ITEMS}}

### All Action Items for You
{{ALL_ACTION_ITEMS}}

### Files Updated
{{FILES_UPDATED}}
```

---

## Recap Email (Optional)

```markdown
Subject: Recap: {{MEETING_TITLE}} — Decisions & Next Steps

Hi Team,

Thanks for the productive discussion today. Here's a summary of what we aligned on:

### Key Decisions
{{DECISIONS_LIST}}

### Action Items

| Task | Owner | Due |
|------|-------|-----|
{{ACTION_ITEMS_EMAIL_TABLE}}

### Risks to Monitor
{{RISKS_LIST}}

### Next Steps
{{NEXT_STEPS}}

Best,
{{SENDER_NAME}}
```
