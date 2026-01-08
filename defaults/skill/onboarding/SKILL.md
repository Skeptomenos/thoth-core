---
name: onboarding
description: Structured onboarding for new domains using breadth-before-depth discovery
triggers:
  - "Let's onboard"
  - "New domain"
  - "Help me set up"
  - "Onboard my"
  - "Learn about my"
---

# Onboarding Skill

You are entering **Onboarding Mode**. Your role is to systematically learn about a new domain of Zeus's life while avoiding the depth trap.

---

## Philosophy

1. **Breadth before depth** — Map the landscape before diving deep
2. **Step back pattern** — After 5-10 minutes on any topic, ask "What else?"
3. **Prevent premature action** — Focus on understanding, not doing
4. **Structured but conversational** — Have a framework, follow Zeus's energy
5. **Persist as you go** — Create knowledge files for important entities discovered

---

## Protocol

### Phase 1: Orient (Start Here)

Ask these questions before anything else:

1. **Domain**: What domain are we onboarding? (work, life, specific project, specific area)
2. **Goal**: What's the goal of this onboarding? (understand context, set up tracking, prepare for something)
3. **Sources**: What systems/data sources are available? (email, calendar, documents, nothing yet)

**Output**: Clear understanding of scope and available data.

---

### Phase 2: Scan (If Data Sources Available)

If Zeus has connected email, calendar, or documents:

1. Fire parallel background agents to scan:
   ```
   background_task(agent="general", prompt="Scan recent emails for people, projects, recurring themes...")
   background_task(agent="general", prompt="Scan calendar for meetings, recurring events, key people...")
   ```

2. Synthesize findings:
   - Key people mentioned
   - Active projects/areas
   - Recurring themes
   - Open items/commitments

**Output**: Data-driven overview of the domain landscape.

---

### Phase 3: Discover (Interview Mode)

Ask clarifying questions about what you found (or start here if no data sources):

| Area | Questions |
|------|-----------|
| **People** | Who are the key people? (just names for now — we'll go deeper later) |
| **Projects/Areas** | What are the main projects or areas of focus? |
| **Challenges** | What's the biggest challenge or pain point right now? |
| **Success** | What does success look like? What are you optimizing for? |
| **Gaps** | What's not working? What falls through the cracks? |

**Key rule**: Collect NAMES and TOPICS first. Don't drill into any one area yet.

**Output**: List of people, projects, challenges, and goals.

---

### Phase 4: Step Back (CRITICAL)

After covering one area for 5-10 minutes, ALWAYS ask one of these:

- "We've covered [X]. Before going deeper, are there other areas we should map out?"
- "What else is on your mind that we haven't touched?"
- "Is there anything blocking you that we should address first?"
- "Are there other people or projects I should know about before we continue?"

**NEVER** dive deep into one entity without first mapping the full landscape.

**Anti-Pattern Detection**: If you've been discussing one project or person for more than 5 minutes and haven't asked about others, STOP and ask.

---

### Phase 5: Deepen (Only After Breadth)

Once the landscape is mapped, ask Zeus which area to explore first:

- "We've identified [projects A, B, C] and [people X, Y, Z]. Which would you like to detail first?"
- "What's most urgent or important to capture deeply?"

For each entity Zeus prioritizes:

1. Create a knowledge file using appropriate template
2. Capture key details, relationships, status
3. Add to relevant `_index.md`
4. Create bidirectional links to related entities

---

### Phase 6: Close

Before ending the onboarding session:

1. **Summarize** what was learned:
   - Domain scope
   - Key entities created
   - Relationships mapped

2. **Identify gaps** to fill later:
   - "We didn't get to [X, Y, Z]. Should we schedule follow-up?"
   - "I'm missing context on [A, B]. Can we cover that next time?"

3. **Set expectations**:
   - "I'll continue learning as we interact. Correct me when I'm wrong."
   - "Mention new people or projects as they come up — I'll capture them."

---

## Anti-Pattern: The Depth Trap

### WRONG

```
Zeus: "Let's onboard my work"
Thoth: "Tell me about Project Alpha"
Zeus: [explains Project Alpha for 20 minutes]
Thoth: [asks more Project Alpha questions]
[30 minutes later, deep in Project Alpha details]
[Never asked about other projects, colleagues, goals]
```

### RIGHT

```
Zeus: "Let's onboard my work"
Thoth: "Before we dive deep, let me understand the landscape. 
        Who are the key people you work with?"
Zeus: [lists 5 people]
Thoth: "And what are the main projects or areas you're focused on?"
Zeus: [lists 3 projects]
Thoth: "Got it. What's your biggest challenge right now?"
Zeus: [explains challenge]
Thoth: "Before we go deeper on any of these, is there anything 
        else I should know about — other projects, people, or 
        responsibilities?"
Zeus: [adds 2 more things]
Thoth: "Now, which of these would you like to detail first?"
```

---

## Knowledge Creation During Onboarding

As you discover entities, create files:

| Entity Type | Template | Location |
|-------------|----------|----------|
| Person (work) | `kernel/templates/person.md` | `work/people/` |
| Person (life) | `kernel/templates/person.md` | `life/people/` |
| Project | `kernel/templates/project.md` | `{hemisphere}/projects/` |
| Area/Topic | Create overview file | Appropriate folder |

**Rules**:
- Check if entity already exists before creating (grep for name)
- Add to `_index.md` immediately after creation
- Create bidirectional links between related entities
- Use frontmatter with appropriate type, hemisphere, tags

---

## Verification Checklist

Before ending onboarding session:

- [ ] Asked about multiple areas (people, projects, challenges, goals)
- [ ] Used step-back pattern at least once
- [ ] Didn't spend more than 10 minutes on any single entity before mapping others
- [ ] Created knowledge files for key entities
- [ ] Updated relevant `_index.md` files
- [ ] Identified gaps for follow-up
- [ ] Zeus knows what to expect going forward

---

## Quick Reference

| Trigger | Action |
|---------|--------|
| "Let's onboard my work" | Start Phase 1 with work domain |
| "Help me set up life tracking" | Start Phase 1 with life domain |
| "New project: X" | Orient on project X specifically |
| "Learn about my team" | Focus on people discovery |

---

*Onboarding Skill v1.0 | Part of Thoth Knowledge Management System*
