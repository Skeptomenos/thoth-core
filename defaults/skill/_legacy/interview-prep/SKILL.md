---
name: interview-prep
description: Generate tailored interview questions for hiring candidates. Gathers job description, resume, and hiring standards to create focused, role-appropriate questions.
---

# Skill: Interview Prep (Hiring Manager)
# Strategy: Manager (Skill) -> Contractor (Agent)

## 1. Objective
Orchestrate the generation of high-fidelity interview questions by gathering OS context and launching the 'InterviewCraft' agent.

## 2. Executable Protocol
1. **Identify Target**: Confirm `candidate_name`, `target_career_step` (e.g. CS5), and `primary_goal`.
2. **Context Retrieval**:
   - Run `read` on `kernel/Standards/hiring-standards.md`.
   - Run `google-workspace_search_gmail_messages` for the candidate's resume/CV.
   - Run `drive-synapsis_read_google_drive_file` for the Job Description (linked in hiring-standards).
3. **Bundle & Delegate**:
   - Launch `task(subagent_type="general", description="Generate Interview Questions for [Candidate]")`.
   - **Prompt Pattern**: "You are acting as the Persona in kernel/Agents/interview-craft.md. Perform a DIRECT EXECUTION. Inputs: [Standards Context], [JD Content], [CV Content], [Goal], [Target Career Step]."
4. **Persistence**:
   - Save the agent's output to `work/Inbox/Tasks/Interviews/[Candidate]/questions.md`.
   - Update the candidate's entry in `work/Team/open-position-hiring.md` with the file link.
