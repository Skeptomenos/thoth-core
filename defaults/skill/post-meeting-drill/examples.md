---
created: 2026-01-10
updated: 2026-01-10
---

# Post-Meeting Drill — Examples

## Example: Golden Ticket Meeting

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
- Attendees: Tom, Zeus, Christine
- Resolve: tom.md found in Stakeholders
- Load daily-log

Phase 2: Extract (from FULL transcript, not just summary)
- Decision: Child tickets needed for operations
- Action (Zeus): Contact regional leads — P0
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

## Example: Routine 1:1 Meeting

```
Input: message_id 19b984456a821234

Phase 0: Acquire
- Meeting: "1:1 with Sarah" — Jan 8, 2026
- Fetch Google Doc (full transcript)

Phase 1: Hydrate
- No specific project — general sync
- Attendee: Sarah → work/Team/sarah.md
- Load daily-log

Phase 2: Extract
- Action (Sarah): Review Q1 roadmap draft — P1
- New Fact: Sarah considering conference talk proposal
- Sentiment: Positive, engaged

Phase 3: Route
- Action → sarah.md ## Action Items
- Action → daily-log.md ## Delegated Today
- New Fact → sarah.md ## Notes
- Sentiment → sarah.md ## Interaction Log

Phase 4: Urgency
- No urgency signals detected
- Result: 🟢 LOW

Phase 5: Synthesize
- Standard synthesis only (no urgent alert)
```

---

## Example: External Stakeholder Meeting

```
Input: message_id 19b985567b932345

Phase 0: Acquire
- Meeting: "Vendor Review: Acme Corp" — Jan 9, 2026
- Fetch Google Doc (full transcript)

Phase 1: Hydrate
- Project: Platform Migration
- Attendee: John (Acme) — NOT FOUND in KB
- Entity Resolution: Create new file

Phase 2: Extract
- Decision: Proceed with Acme proposal pending legal review
- Action (Zeus): Send NDA to legal — P1
- Action (John): Provide technical specs — by Jan 15
- Risk: Integration timeline depends on legal clearance

Phase 3: Route
- Create: work/Stakeholders/john.md (new contact)
- Update: work/Stakeholders/_index.md
- Decision → platform-migration.md ## Strategic Decisions
- Action (Zeus) → daily-log.md ### P1
- Action (John) → john.md ## Action Items
- Risk → platform-migration.md ## Blockers & Risks

Phase 4: Urgency
- Signal: "depends on legal clearance" = Blocker risk
- Amplifier: Platform Migration is active project
- Result: 🟡 MEDIUM

Phase 5: Synthesize
- Standard synthesis with MEDIUM flags
```
