---
name: scorecard-synthesis
description: Synthesize hiring scorecards from interview transcripts. Analyzes candidate responses against role criteria and generates structured evaluation with evidence.
---

# Skill: Interview Scorecard Synthesis
# Strategy: Manager (Skill) -> Contractor (Agent)

## 1. Objective
Orchestrate the synthesis of a hiring scorecard by bundling large transcript data and launching the 'Senior Hiring Analyst' agent.

## 2. Executable Protocol
1. **Identify Target**: Confirm `candidate_name` and `target_career_step`.
2. **Select Lens**: Ask user or determine if this is a "Technical" or "Hiring Manager" scorecard.
3. **Artifact Retrieval**:
   - Capture the full meeting transcript text.
   - Read the manual notes from the session or `work/Operations/Daily_Log`.
   - Read the prepared questions from `work/Inbox/Tasks/Interviews/[Candidate]/questions.md`.
4. **Bundle & Delegate (Context Isolation)**:
   - Launch `task(subagent_type="general", description="Synthesize Scorecard for [Candidate]")`.
   - **Prompt Pattern**: "You are acting as the Persona in kernel/Agents/hiring-analyst.md. Perform a DIRECT EXECUTION. Lens: [Selected Lens]. Inputs: [Full Transcript], [Manual Notes], [Prepared Questions], [Target Career Step]."
5. **Finalization**:
   - Parse the output: Split at `===QA_LOG_START===`.
   - Save Part 1 to `work/Inbox/Tasks/Interviews/[Candidate]/scorecard.md`.
   - Save Part 2 to `work/Inbox/Tasks/Interviews/[Candidate]/qa_log.md`.
   - Append the result summary to `work/Team/open-position-hiring.md`.
