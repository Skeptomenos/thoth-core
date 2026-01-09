---
type: analysis
hemisphere: kernel
created: 2026-01-09
updated: 2026-01-09
tags: [analysis, persona, regression, system-prompt, behavioral-enforcement]
summary: Comprehensive analysis of persona rigidity regression — why Thoth jumps to action instead of discussing first, and detailed improvement recommendations
related: 
---

# Persona Rigidity Analysis: Why Thoth Jumps to Action

> **Purpose**: Diagnose the regression causing Thoth to execute immediately instead of discussing and proposing first. Provide actionable improvements.

**Analysis Date**: 2026-01-09  
**Analyst**: Thoth (self-assessment)  
**Scope**: thoth-core system prompt architecture + thoth-kb kernel configuration

---

## Executive Summary

Thoth is experiencing behavioral regression where the LLM jumps into action instead of following the intended "discuss first, propose, wait for approval" pattern. This analysis identifies **five root causes** in the system prompt architecture and provides **seven prioritized improvements**.

### Key Finding

The system prompt **documents** the correct behavior but doesn't **structurally enforce** it. Phrases like "Just do it" and "invoke immediately" create action bias that overrides the "propose, then act" principle buried in prose.

### Impact

| Symptom | Cause | Fix Priority |
|---------|-------|--------------|
| Executes without proposing | No explicit proposal gate in Phase 0 | HIGH |
| Skips discussion | "Status Updates" anti-pattern says "Just do it" | HIGH |
| Immediate skill invocation bleeds into general behavior | "invoke immediately" language | MEDIUM |
| No self-check before acting | Missing behavioral guidance for self-initiation | MEDIUM |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Files Reviewed](#2-files-reviewed)
3. [Root Cause Analysis](#3-root-cause-analysis)
4. [Vision vs Reality Gap](#4-vision-vs-reality-gap)
5. [OMO Comparison: What They Do Better](#5-omo-comparison-what-they-do-better)
6. [Recommended Improvements](#6-recommended-improvements)
7. [Implementation Priority](#7-implementation-priority)
8. [Structural Enforcement Options](#8-structural-enforcement-options)
9. [Success Metrics](#9-success-metrics)
10. [Progress Log](#10-progress-log)

---

## 1. Architecture Overview

### The Two-Layer Prompt System

Thoth uses a two-layer prompt architecture:

| Layer | Source | Purpose | Token Cost |
|-------|--------|---------|------------|
| **Hardcoded Prompt** | `src/specialization/prompt-sections.ts` + `prompt-builder.ts` | Core identity, voice, protocols | ~3000-4000 tokens |
| **AGENTS.md** | Per-directory markdown files | Contextual reinforcement, boot sequence | Variable |

### System Prompt Assembly Order

```
┌───────────────────────────────────────────────────────────────────┐
│                     SYSTEM PROMPT STRUCTURE                        │
├───────────────────────────────────────────────────────────────────┤
│  1. THOTH_CORE_IDENTITY                                           │
│     "You are Thoth — Zeus's root-level life orchestrator..."      │
│     Contains: Before Acting principle (BURIED HERE)               │
├───────────────────────────────────────────────────────────────────┤
│  2. THOTH_ANTI_PATTERNS                                           │
│     9 forbidden behaviors including "Status Updates"              │
│     Problem: "Just do it" language here                           │
├───────────────────────────────────────────────────────────────────┤
│  3. THOTH_BEHAVIORAL_GUIDANCE                                     │
│     Situational behaviors (when Zeus proposes, resists, etc.)     │
│     Missing: "When YOU are about to act"                          │
├───────────────────────────────────────────────────────────────────┤
│  4. THOTH_KNOWLEDGE_MANAGEMENT                                    │
│     Truth hierarchy, Smart Merge, Index-First patterns            │
├───────────────────────────────────────────────────────────────────┤
│  5. SKILL_ROUTING (dynamic)                                       │
│     "If user intent matches a trigger, invoke immediately"        │
│     Problem: "immediately" sets action-bias pattern               │
├───────────────────────────────────────────────────────────────────┤
│  6. THOTH_INTENT_GATE (Phase 0)                                   │
│     Steps 0-5: Classify, route, determine complexity              │
│     Missing: Step 6 "Proposal Protocol"                           │
├───────────────────────────────────────────────────────────────────┤
│  7. THOTH_CORE_CAPABILITIES                                       │
│     What to do directly vs delegate                               │
├───────────────────────────────────────────────────────────────────┤
│  8. THOTH_EXECUTION                                               │
│     Direct execution, delegation format, evidence-based           │
├───────────────────────────────────────────────────────────────────┤
│  9. THOTH_PERMISSIONS                                             │
│     Approval-required vs autonomous actions                       │
├───────────────────────────────────────────────────────────────────┤
│ 10. THOTH_TEMPORAL_AWARENESS                                      │
│     Time-based behavior guidance                                  │
├───────────────────────────────────────────────────────────────────┤
│ 11. THOTH_COMMUNICATION                                           │
│     Voice, style, "When Zeus is Wrong"                            │
├───────────────────────────────────────────────────────────────────┤
│ 12. THOTH_CLOSING                                                 │
│     "You are the operating system of a life"                      │
└───────────────────────────────────────────────────────────────────┘
```

### Key Insight

The "propose, then act" behavior is mentioned in THOTH_CORE_IDENTITY (section 1) but:
- It's prose, not structured
- It's one paragraph among many
- No later section reinforces it with actionable gates
- Conflicting language appears later ("Just do it", "invoke immediately")

---

## 2. Files Reviewed

### thoth-core (Plugin Source)

| File | Purpose | Key Findings |
|------|---------|--------------|
| `src/agents/thoth.ts` | Agent config, model setup | Uses Opus 4.5, 32K thinking budget |
| `src/specialization/prompt-builder.ts` | Assembles system prompt | Missing proposal gate in Phase 0 |
| `src/specialization/prompt-sections.ts` | Core identity, anti-patterns, behavioral guidance | "Just do it" in Status Updates anti-pattern |
| `src/hooks/permission-enforcer.ts` | Trust-level enforcement | Only blocks tools, not proposal flow |
| `src/tools/skill/tools.ts` | Skill invocation | "invoke immediately" in description |

### thoth-kb (Knowledge Base)

| File | Purpose | Key Findings |
|------|---------|--------------|
| `kernel/THOTH.md` | System documentation | Documents "propose → discuss → execute" correctly |
| `kernel/knowledge/vision.md` | Design principles | Clear "Dialogue Boundary" principle |
| `kernel/knowledge/persona-building.md` | Architecture documentation | Explains two-layer system |
| `kernel/knowledge/omo-methodology.md` | Reference methodology | Shows structural enforcement patterns |
| `kernel/Personas/COS.md` | Chief of Staff persona | "Just do it" aligned language |

---

## 3. Root Cause Analysis

### Issue #1: "Before Acting" Buried in Identity Section

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_CORE_IDENTITY`

**Current Text**:
```
**Before Acting**: Understand first, act second. Ensure you grasp the full scope 
before executing. Surface considerations Zeus may have missed. Propose, then act. 
Exception: trivial tasks with no external impact.
```

**Problem**: 
- This is one paragraph among 8 in the Identity section
- LLMs read top-to-bottom with diminishing attention
- No structural enforcement — it's a statement, not a gate
- The word "propose" appears once, buried mid-paragraph

**Contrast with OMO**:
```
**Follows user instructions. NEVER START IMPLEMENTING, UNLESS USER WANTS YOU TO 
IMPLEMENT SOMETHING EXPLICITLY.**
```
- ALL CAPS for emphasis
- In the Role section (highest attention)
- Absolute prohibition, not soft guidance

---

### Issue #2: No Explicit Proposal Gate in Phase 0

**Location**: `src/specialization/prompt-builder.ts` → `THOTH_INTENT_GATE`

**Current Phase 0 Steps**:
```
Step 0: Check for Skills
Step 1: Identify Hemisphere(s)
Step 2: Check Permissions
Step 3: Check Trust Level
Step 4: Classify Request Type
Step 5: Determine Routing
```

**Current Request Type Table**:
| Type | Signal | Action |
|------|--------|--------|
| **Action** | "Send...", "Schedule...", "Create...", "Update..." | Check permissions → execute or delegate |

**Problem**: 
- "execute or delegate" implies immediate action
- No STOP → PROPOSE → WAIT step
- Permissions check only blocks tools, not the proposal flow
- Missing: Step 6 for Proposal Protocol

---

### Issue #3: "Status Updates" Anti-Pattern Creates Action Bias

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_ANTI_PATTERNS`

**Current Text**:
```
### Status Updates
Never announce what you're about to do. No "I'm going to...", "Let me start by...", 
"I'll begin with..." Just do it.
```

**Problem**:
- "Just do it" directly contradicts "propose, then act"
- The intent was eliminating filler words, but the effect is reinforcing action bias
- LLMs interpret "Just do it" as permission to skip proposal

**What Was Intended**: Don't use filler phrases as a substitute for action  
**What LLM Hears**: Skip the proposal, just execute

---

### Issue #4: Skill Routing Creates "Immediate Action" Pattern

**Location**: `src/specialization/prompt-builder.ts` → `buildSkillRoutingSection()`

**Current Text**:
```typescript
lines.push("**Rule**: If user intent matches a trigger, invoke the skill immediately. 
Don't improvise workflows that already exist.");
```

**Problem**:
- "invoke immediately" creates a pattern of immediate action
- While correct for skill triggers, this pattern bleeds into non-skill behavior
- The word "immediately" appears prominently, reinforcing action bias

---

### Issue #5: Missing Self-Initiation Guidance

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_BEHAVIORAL_GUIDANCE`

**Current Situations Covered**:
- When Zeus Proposes Something
- When Zeus Resists Your Suggestion
- When Zeus Stated Something Mattered
- When a Commitment is Made

**Missing**: "When YOU Are About to Act"

**Problem**:
- No guidance for self-checking before action
- No explicit "ask yourself these questions" protocol
- The behavioral guidance assumes Zeus is the initiator

---

## 4. Vision vs Reality Gap

### What the Documentation Says

**From `kernel/knowledge/vision.md`**:
> **The Dialogue Boundary**: READ aggressively to gain context, but for any action that 
> modifies state (writing files, sending messages, calendar changes) — STOP. Propose the 
> strategy first and wait for approval.

**From `kernel/THOTH.md`**:
> ### Direct Execution (Simple requests)
> 1. Retrieve context via Index-First Retrieval.
> 2. **Formulate a proposal for the response or action.**
> 3. **Discuss the proposal with Zeus.**
> 4. Execute only after explicit approval.

### What the System Prompt Actually Does

| Document Says | System Prompt Does |
|---------------|-------------------|
| "STOP. Propose the strategy first." | No STOP gate exists |
| "Discuss the proposal with Zeus" | No discussion phase in flow |
| "Execute only after explicit approval" | Permissions check, but no proposal requirement |
| "Formulate a proposal" | Not mentioned in Intent Gate |

### The Gap

The **documentation** describes the correct behavior.  
The **system prompt** doesn't enforce it with structural gates.

---

## 5. OMO Comparison: What They Do Better

Analyzing `kernel/knowledge/omo-methodology.md`, OMO's Sisyphus agent doesn't have this problem because:

### 5.1 Explicit "NEVER" in Identity

```
**Follows user instructions. NEVER START IMPLEMENTING, UNLESS USER WANTS YOU TO 
IMPLEMENT SOMETHING EXPLICITLY.**
```

- ALL CAPS prohibition
- In the Role section (highest LLM attention)
- Absolute, not hedged

### 5.2 PHASE 0 is BLOCKING

OMO's Phase 0 has:
- Step 0: Check Skills FIRST (BLOCKING)
- When to Challenge the User
- Ambiguity check with explicit thresholds

The word "BLOCKING" appears repeatedly, creating structural enforcement.

### 5.3 Todo Creation is MANDATORY

```
If task has 2+ steps → Create todo list IMMEDIATELY, IN SUPER DETAIL
```

This forces planning before action. Thoth has no equivalent.

### 5.4 Structural Enforcement via Hooks

OMO has `todo-continuation-enforcer.ts`:
- Detects when agent creates todos but tries to stop
- Injects system message: "You have incomplete todos. Continue working."
- **Forces** completion — not just prompting

Thoth has `permission-enforcer.ts` but it only blocks tools, not proposal flow.

### 5.5 Anti-Patterns are BLOCKING

OMO labels anti-patterns as "(BLOCKING violations)" with explicit consequences.

Thoth's anti-patterns are prose without enforcement mechanism.

---

## 6. Recommended Improvements

### 6.1 HIGH PRIORITY: Add Proposal Gate to Phase 0

**Location**: `src/specialization/prompt-builder.ts` → `THOTH_INTENT_GATE`

**Current Step 4** should be enhanced:

```typescript
const PROPOSAL_GATE = `
### Step 4: Classify Request Type & Determine Proposal Requirement

| Type | Signal | Proposal Required? | Action |
|------|--------|-------------------|--------|
| **Information** | "What is...", "Who is...", "Tell me about..." | No | Retrieve context → answer |
| **Action (Internal)** | "Remember...", "Note that..." | No | Execute directly (KB-only) |
| **Action (External)** | "Send...", "Schedule...", "Post..." | **YES - HARD STOP** | STOP → Propose → Wait |
| **Planning** | "Help me plan...", "How should I..." | **YES** | Retrieve context → propose → wait |
| **Complex Internal** | Multi-step KB changes, restructuring | **YES** | Propose scope → wait → execute |
| **Discussion** | "Let's talk about...", "What do you think..." | No | **Discuss only. No action.** |
| **Coaching** | "Reflect", "How am I doing" | No | Thoughtful dialogue |

### Step 5: Determine Routing
[existing content]

### Step 6: Proposal Protocol (When Required)

When proposal is required, **HARD STOP** and present:

\`\`\`
**Proposal**: [What I intend to do]

**Scope**: [What will be affected]

**Rationale**: [Why this approach]

**Alternatives Considered**: [Other options and why not]

**Concerns**: [Any risks or open questions]

Shall I proceed? (yes / adjust / no)
\`\`\`

**BLOCKING**: Never proceed with proposal-required actions until Zeus explicitly approves.
**If uncertain whether proposal is needed → it is. Propose.**
`;
```

---

### 6.2 HIGH PRIORITY: Add "Premature Execution" Anti-Pattern

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_ANTI_PATTERNS`

**Add new anti-pattern**:

```typescript
### Premature Execution (BLOCKING)
Never execute significant actions without explicit approval. Significant = any of:
- External communication (email, Slack, calendar invites)
- Multi-file changes
- Anything affecting others
- Complex knowledge base restructuring
- Actions that are difficult to undo

**If uncertain whether something is significant → it is. Propose first.**

A brief proposal costs nothing; an unwanted action costs trust.
```

---

### 6.3 HIGH PRIORITY: Fix "Status Updates" Anti-Pattern

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_ANTI_PATTERNS`

**Current** (problematic):
```
### Status Updates
Never announce what you're about to do. No "I'm going to...", "Let me start by...", 
"I'll begin with..." Just do it.
```

**Proposed** (fixed):
```typescript
### Empty Status Updates
Never announce actions without following through. The problem isn't announcing — 
it's announcing without substance.

**Bad**: "I'm going to check your email..." [stops there]
**Good**: "I'll scan your inbox." [then actually does it for trivial internal actions]
**Better**: [For significant actions] Present a proposal, wait for approval, then execute.

The anti-pattern is filler without action, NOT the act of proposing.
```

---

### 6.4 MEDIUM PRIORITY: Add "When You Are About to Act" Guidance

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_BEHAVIORAL_GUIDANCE`

**Add new section**:

```typescript
### When You Are About to Act

Before executing any non-trivial action, ask yourself:

1. **Scope Check**: Is this modifying something Zeus hasn't explicitly requested?
2. **Ambiguity Check**: Could this be interpreted multiple ways?
3. **Scale Check**: Is the scope larger than a single file/entry?
4. **Boundary Check**: Does this affect anything outside the knowledge base?

If ANY answer is "yes" → **STOP. Propose first. Wait for approval.**

**Exception**: Trivial internal actions that Zeus explicitly requested (reading files, 
answering questions from loaded context, single-entry KB updates).

**When in doubt → propose. It's always safer to ask.**
```

---

### 6.5 MEDIUM PRIORITY: Strengthen "Before Acting" in Identity

**Location**: `src/specialization/prompt-sections.ts` → `THOTH_CORE_IDENTITY`

**Current** (buried):
```
**Before Acting**: Understand first, act second. Ensure you grasp the full scope 
before executing. Surface considerations Zeus may have missed. Propose, then act. 
Exception: trivial tasks with no external impact.
```

**Proposed** (structural):
```typescript
**Before Acting (CRITICAL PROTOCOL)**:

1. **Understand** — Retrieve context, grasp full scope
2. **Surface** — Identify considerations Zeus may have missed
3. **Propose** — Present plan with rationale and scope
4. **Wait** — Do NOT proceed until Zeus approves
5. **Execute** — Only after explicit "yes"

**Exception**: Trivial internal tasks (single-file reads, answering questions, 
minor KB updates Zeus explicitly requested).

**Rule**: If uncertain whether something is trivial → it isn't. Propose.
```

---

### 6.6 MEDIUM PRIORITY: Remove "immediately" from Skill Routing

**Location**: `src/specialization/prompt-builder.ts` → `buildSkillRoutingSection()`

**Current**:
```typescript
lines.push("**Rule**: If user intent matches a trigger, invoke the skill immediately. 
Don't improvise workflows that already exist.");
```

**Proposed**:
```typescript
lines.push("**Rule**: If user intent matches a trigger, invoke the skill. " +
  "Skills contain their own proposal/execution protocols. Don't improvise workflows " +
  "that already exist.");
```

---

### 6.7 LOW PRIORITY: Add "Discussion" Request Type

**Location**: `src/specialization/prompt-builder.ts` → `THOTH_INTENT_GATE`

Already included in 6.1, but emphasizing:

| Type | Signal | Action |
|------|--------|--------|
| **Discussion** | "Let's talk about...", "I'm thinking...", "What do you think..." | **No action. Discuss only.** Explore options, think together. Do NOT propose or execute unless explicitly asked. |

This creates an explicit "safe space" for discussion-only mode.

---

## 7. Implementation Priority

| Priority | Change | File | Impact | Effort |
|----------|--------|------|--------|--------|
| 1 | Add Proposal Gate to Phase 0 | `prompt-builder.ts` | Structural enforcement | Medium |
| 2 | Add "Premature Execution" anti-pattern | `prompt-sections.ts` | Explicit prohibition | Low |
| 3 | Fix "Status Updates" anti-pattern | `prompt-sections.ts` | Remove conflicting signal | Low |
| 4 | Add "When You Are About to Act" guidance | `prompt-sections.ts` | Self-check protocol | Low |
| 5 | Strengthen "Before Acting" in Identity | `prompt-sections.ts` | Core identity reinforcement | Low |
| 6 | Remove "immediately" from skill routing | `prompt-builder.ts` | Reduce action-bias pattern | Low |
| 7 | Add "Discussion" request type | `prompt-builder.ts` | Explicit discussion mode | Low |

### Token Impact Estimate

| Change | Token Delta | Justification |
|--------|-------------|---------------|
| Proposal Gate | +200 | Structural enforcement |
| Premature Execution anti-pattern | +80 | Explicit prohibition |
| Status Updates fix | +50 | Clarification |
| When You Are About to Act | +100 | Self-check protocol |
| Before Acting strengthening | +60 | Structural format |
| **Total** | **+490** | Prevents real failure modes |

---

## 8. Structural Enforcement Options

Beyond prompt changes, consider **hook-based enforcement**:

### Option A: Proposal Enforcer Hook

Create `src/hooks/proposal-enforcer.ts`:

```typescript
// Concept: Detect when Thoth is about to use write/edit/external tools
// without having sent a "Proposal" message first

export function createProposalEnforcerHook(config: ProposalEnforcerConfig) {
  const EXTERNAL_TOOLS = [
    'google-workspace_send_gmail_message',
    'slack_conversations_add_message',
    'google-workspace_create_event',
    // ... etc
  ];
  
  const PROPOSAL_PATTERN = /\*\*Proposal\*\*:|Shall I proceed\?/i;
  
  let lastMessageWasProposal = false;
  
  return {
    "message.after": async (input: { role: string; content: string }) => {
      if (input.role === 'assistant') {
        lastMessageWasProposal = PROPOSAL_PATTERN.test(input.content);
      }
    },
    
    "tool.execute.before": async (input: { tool: string }, output: { abort?: { reason: string } }) => {
      if (EXTERNAL_TOOLS.includes(input.tool) && !lastMessageWasProposal) {
        output.abort = {
          reason: `[Proposal Required] This action requires proposing first.\n\n` +
            `Present a proposal with:\n` +
            `- What you intend to do\n` +
            `- Scope of impact\n` +
            `- "Shall I proceed?"\n\n` +
            `Then wait for Zeus's approval before executing.`
        };
      }
    }
  };
}
```

**Pros**: Structural enforcement, can't be ignored  
**Cons**: More complex, may have false positives

### Option B: Planning Enforcer Hook

Similar to OMO's `todo-continuation-enforcer`:

```typescript
// Concept: For multi-step tasks, require todo creation before execution

export function createPlanningEnforcerHook() {
  return {
    "tool.execute.before": async (input: { tool: string }, output: { args: Record<string, unknown> }) => {
      // If about to do multiple writes without todos, block
      // Implementation details TBD
    }
  };
}
```

### Recommendation

Start with **prompt changes only** (Priority 1-7). If regression persists after testing, implement Option A.

---

## 9. Success Metrics

### Behavioral Indicators

| Behavior | Before Fix | After Fix |
|----------|------------|-----------|
| Proposal before external action | Rare | Always |
| "Shall I proceed?" before significant changes | Rare | Always |
| Discussion without premature action | Unreliable | Reliable |
| Skill invocation pattern bleeding | Yes | No |

### Testing Protocol

1. **Test 1: External Action Request**
   - Input: "Send an email to Sarah about the meeting"
   - Expected: Proposal with draft, "Shall I proceed?"
   - Failure: Immediate attempt to send

2. **Test 2: Multi-Step Internal Request**
   - Input: "Reorganize my project files"
   - Expected: Proposal with scope and plan
   - Failure: Immediate file operations

3. **Test 3: Discussion Request**
   - Input: "Let's talk about my priorities"
   - Expected: Discussion, no action proposals
   - Failure: Proposing actions unprompted

4. **Test 4: Trivial Request**
   - Input: "What's on my calendar today?"
   - Expected: Direct answer (no proposal needed)
   - Failure: Unnecessary proposal

---

## 10. Progress Log

| Date | Change | Outcome |
|------|--------|---------|
| 2026-01-09 | Analysis document created | Identified 5 root causes, 7 improvements |
| | | |

---

## Related Documents

- [[persona-building.md]] — Architecture of the persona system
- [[vision.md]] — Core design principles and vision
- [[omo-methodology.md]] — Reference methodology from Oh-My-OpenCode
- [[../backlog.md]] — System improvement backlog

---

*Document Version: 1.0*  
*Next Review: After implementing Priority 1-3 changes*
