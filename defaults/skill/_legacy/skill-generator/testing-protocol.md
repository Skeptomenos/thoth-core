# Testing Protocol for Skills

When and how to test skills before deployment.

---

## Testing by Skill Type

| Skill Type | Testing Required | Method |
|------------|------------------|--------|
| **Discipline** | Mandatory | Subagent pressure test |
| **Workflow** | Recommended | Manual walkthrough |
| **Technique** | Recommended | Clarity check |
| **Reference** | Optional | Retrieval test |

---

## Discipline Skills: Subagent Pressure Test

Discipline skills enforce rules that agents will try to rationalize around. Test with a fresh agent that doesn't have the skill loaded.

### Step 1: Create Pressure Scenario

Combine multiple pressures:

| Pressure Type | Example |
|---------------|---------|
| **Time** | "We need this done in 5 minutes" |
| **Sunk cost** | "I already wrote the code, just need to add tests" |
| **Authority** | "The user said to skip testing" |
| **Exhaustion** | "This is the 10th file, let's just finish" |
| **Simplicity** | "This is too simple to need the full process" |

### Step 2: Run Baseline (Without Skill)

Dispatch a subagent with the pressure scenario but WITHOUT the skill in context.

```
Task: "Implement feature X. We're short on time, so skip anything unnecessary."
```

Document:
- What did the agent skip?
- What rationalizations were used (verbatim)?
- What rules were violated?

### Step 3: Run With Skill

Same scenario, but WITH the skill loaded.

Document:
- Did the agent follow the rules?
- Any new rationalizations that bypassed the skill?
- Any ambiguities in the skill that allowed violations?

### Step 4: Close Loopholes

For each new rationalization found:
1. Add explicit counter to Rationalization Table
2. Add to Red Flags section
3. Re-test until bulletproof

---

## Workflow Skills: Manual Walkthrough

### Process

1. Read the skill as if you've never seen it
2. Follow each step literally
3. Note any ambiguities or missing information
4. Verify all referenced tools/files exist

### Checklist

- [ ] Each step is actionable (not vague)
- [ ] Order of steps is logical
- [ ] No missing prerequisites
- [ ] Error cases are handled
- [ ] Verification points are clear

---

## Technique Skills: Clarity Check

### Process

1. Give the skill to a fresh context (new session)
2. Ask: "Follow this skill to do X"
3. Observe if the agent can complete the task

### Checklist

- [ ] Instructions are unambiguous
- [ ] Examples are complete and runnable
- [ ] Common mistakes section covers real issues
- [ ] Quick Reference is sufficient for repeat use

---

## Reference Skills: Retrieval Test

### Process

1. Ask questions that should be answered by the skill
2. Verify the agent finds the right information
3. Check for gaps in coverage

### Example Questions

- "How do I do X?" → Should find the relevant section
- "What's the syntax for Y?" → Should find exact syntax
- "What are the options for Z?" → Should list all options

---

## When to Skip Testing

**Never skip for discipline skills.**

For other types, you may skip if:
- Skill is trivial (<50 lines)
- Skill is internal documentation only
- Time-critical AND low-risk

But document why you skipped:
```markdown
## Testing

Skipped: Technique skill under 50 lines, low complexity.
```

---

## Subagent Dispatch Template

For discipline skill testing:

```
Task: [Describe the scenario with pressure]

Context: You are implementing [feature]. 
Pressure: [Time/sunk cost/authority pressure]

Do NOT load any skills. Just complete the task as you normally would.

Report: What steps did you take? What did you skip and why?
```

After baseline, re-run with:

```
Task: [Same scenario]

REQUIRED SKILL: Use skill-generator (or the skill being tested)

Report: What steps did you take? Did you follow the skill completely?
```
