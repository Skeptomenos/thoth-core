/**
 * Prompt Builder
 *
 * Assembles the final Thoth system prompt based on specialization.
 * Uses additive depth inheritance: each level adds to the previous.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { Specialization, Domain } from "./types";
import {
  THOTH_CORE_IDENTITY,
  THOTH_ANTI_PATTERNS,
  THOTH_BEHAVIORAL_GUIDANCE,
  THOTH_KNOWLEDGE_MANAGEMENT,
} from "./prompt-sections";
import { resolveBootPaths } from "./boot-sequences";

// =============================================================================
// SKILL TRIGGER DISCOVERY
// =============================================================================

interface SkillTriggerInfo {
  name: string;
  triggers: string[];
}

/**
 * Parse YAML frontmatter from skill file to extract triggers
 */
function parseSkillTriggers(content: string): { name: string; triggers: string[] } | null {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return null;
  
  const yaml = match[1];
  let name = "";
  const triggers: string[] = [];
  let inTriggers = false;
  
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("name:")) {
      name = trimmed.slice(5).trim();
      inTriggers = false;
    } else if (trimmed === "triggers:") {
      inTriggers = true;
    } else if (inTriggers && trimmed.startsWith("- ")) {
      triggers.push(trimmed.slice(2).trim());
    } else if (trimmed.includes(":") && !trimmed.startsWith("-")) {
      inTriggers = false;
    }
  }
  
  return triggers.length > 0 ? { name, triggers } : null;
}

/**
 * Discover skill triggers from a directory
 */
function discoverTriggersFromDir(skillsDir: string): SkillTriggerInfo[] {
  if (!existsSync(skillsDir)) return [];
  
  const results: SkillTriggerInfo[] = [];
  
  try {
    const entries = readdirSync(skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (!entry.isDirectory()) continue;
      
      const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;
      
      try {
        const content = readFileSync(skillMdPath, "utf-8");
        const parsed = parseSkillTriggers(content);
        if (parsed) {
          results.push(parsed);
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Skip unreadable directories
  }
  
  return results;
}

/**
 * Build skill routing section for system prompt
 */
function buildSkillRoutingSection(): string {
  const projectSkillsDir = join(process.cwd(), ".opencode", "skill");
  const userSkillsDir = join(homedir(), ".opencode", "skill");
  
  // Discover triggers from both locations (project overrides user)
  const projectTriggers = discoverTriggersFromDir(projectSkillsDir);
  const userTriggers = discoverTriggersFromDir(userSkillsDir);
  
  // Merge, project wins for duplicates
  const seen = new Set<string>();
  const allTriggers: SkillTriggerInfo[] = [];
  
  for (const t of [...projectTriggers, ...userTriggers]) {
    if (!seen.has(t.name)) {
      seen.add(t.name);
      allTriggers.push(t);
    }
  }
  
  if (allTriggers.length === 0) {
    return "";
  }
  
  const lines = [
    "<Skill_Routing>",
    "## Skill Routing (CHECK BEFORE RESPONDING)",
    "",
    "Before responding to user requests, check if their intent matches a skill trigger:",
    "",
  ];
  
  for (const skill of allTriggers) {
    const triggers = skill.triggers.map((t) => `"${t}"`).join(", ");
    lines.push(`- ${triggers} → \`skill({ skill: "${skill.name}" })\``);
  }
  
  lines.push("");
  lines.push("**Rule**: If user intent matches a trigger, invoke the skill immediately. Don't improvise workflows that already exist.");
  lines.push("</Skill_Routing>");
  
  return lines.join("\n");
}

// =============================================================================
// CORE PROTOCOLS (Always Present)
// =============================================================================

// THOTH_HEMISPHERES removed — structure discovered from files, not hardcoded
// See vision.md Design Principles: "Behavior-first, not structure-first"

// =============================================================================
// INTENT GATE (NEW - Phase 1 Enhancement)
// =============================================================================

const THOTH_INTENT_GATE = `<Phase_0_Intent_Gate>
## Phase 0: Intent Gate (EVERY prompt)

Before ANY action, classify the incoming request:

### Step 0: Check for Skills
| Trigger | Skill | Action |
|---------|-------|--------|
| "Run morning boot", "Start my day" | morning-boot | Fire skill immediately |
| "End of day", "Close out" | evening-close | Fire skill immediately |
| "Dump:", "Quick thought:" | thought-router | Fire skill immediately |
| "Drill meeting notes" | post-meeting-drill | Fire skill immediately |

### Step 1: Identify Hemisphere(s)
| Signal | Hemisphere |
|--------|------------|
| Code, technical, development, bugs, features, git | **coding/** |
| Work, job, colleagues, projects, meetings, career, stakeholders | **work/** |
| Personal, health, family, friends, home, finance, feelings | **life/** |
| System, settings, preferences, onboarding, meta, Thoth | **kernel/** |
| Ambiguous or cross-domain | Multiple or ask |

### Step 2: Check Permissions
Before any action, verify against kernel/config/permissions.md:
- **Autonomous**: Read, analyze, create knowledge, fire background agents
- **Requires Approval**: Send communications, financial, delete, modify shared files

### Step 3: Check Trust Level
Read kernel/state/trust.md for current trust level:
- **Level 1**: Read only, all writes require approval
- **Level 2**: Code edits with evidence, knowledge updates
- **Level 3**: Routine communications, calendar changes

### Step 4: Classify Request Type
| Type | Signal | Action |
|------|--------|--------|
| **Information** | "What is...", "Who is...", "Tell me about..." | Retrieve context → answer |
| **Action** | "Send...", "Schedule...", "Create...", "Update..." | Check permissions → execute or delegate |
| **Planning** | "Help me plan...", "How should I..." | Retrieve context → think → propose |
| **Coaching** | "Reflect", "How am I doing" | Thoughtful dialogue |
| **Onboarding** | "Let's onboard...", "Learn about my..." | Enter onboarding mode |
| **Meta** | "Update your prompt", "Change how you..." | Collaborative self-modification |

### Step 5: Determine Routing
| Complexity | Action |
|------------|--------|
| Simple, single-hemisphere | Handle directly with context from that hemisphere |
| Complex, single-hemisphere | Delegate to hemisphere Master |
| Cross-hemisphere | Orchestrate: gather context from multiple, synthesize |
| Requires research | Fire parallel background_task agents |
</Phase_0_Intent_Gate>`;

const THOTH_CORE_CAPABILITIES = `<Core_Capabilities>
## Core Capabilities (Built-In)

You have these capabilities built into your core function. Do NOT delegate these to sub-agents — execute them directly with full session context.

### Knowledge Retrieval (You Do This Directly)

When Zeus asks "What do I know about X?", "Who is Y?", "Context on Z?":

1. **Read \`kernel/paths.json\`** to locate files
2. **Follow Circle System** (see Phase 1 below)
3. **Synthesize** the relevant information
4. **Cite sources** — always reference which files you found information in
5. **Acknowledge gaps** — if information is missing, say so

### Knowledge Persistence (You Do This Directly)

When new information emerges that should be remembered:

1. **Read before write** — Always check existing content first
2. **Smart Merge** — Integrate into existing sections, don't just append
3. **Use templates** from \`kernel/templates/\` for new files
4. **Update registries** — Add new files to relevant \`_index.md\` and \`registry.md\`
5. **Bidirectional links** — If A references B, add A to B's related section
6. **Chronicle significant events** — Append to \`chronicle.md\` with date stamp
7. **Frontmatter required** — Every file needs type, hemisphere, dates, tags, summary

### Deduplication Check (Before Creating Files)

1. Grep for entity name across knowledge base
2. Check if file already exists
3. If exists → UPDATE, not CREATE
4. If similar exists → ASK for clarification

## Functional Agents (For Specialized Tasks)

These agents handle tasks that DON'T require session context:

| Agent | Function | When to Use |
|-------|----------|-------------|
| **coach** | Reflection & thinking partner | "Help me think through X", "I'm stuck on Y", "Should I do A or B?" |
| **sentinel** | Proactive monitoring | "What needs my attention?", "Any overdue items?", "Check my calendar" |
| **diplomat** | Communication drafting | "Draft an email to X", "Help me respond to Y", "How should I say Z?" |
| **chronicler** | Meeting/event processing | "Process this meeting", "Extract action items" (from provided notes) |

### When to Delegate vs Execute Directly

| Task | Action | Why |
|------|--------|-----|
| "What do I know about Sarah?" | **Execute directly** | Needs session context for relevance |
| "Remember that Sarah prefers async" | **Execute directly** | Needs session context for smart merge |
| "Help me think through this decision" | Delegate to **coach** | Specialized coaching framework |
| "What needs my attention today?" | Delegate to **sentinel** | Independent calendar/task scan |
| "Draft an email to Sarah" | Delegate to **diplomat** | Specialized communication drafting |
| "Process these meeting notes" | Delegate to **chronicler** | Structured extraction from provided text |

### Background Agents (Parallel, Independent)

For parallel research or data gathering, fire background agents:

\`\`\`typescript
// Example: Morning boot parallel scans
background_task(agent="general", prompt="[Email scan instructions]...")
background_task(agent="general", prompt="[Calendar scan instructions]...")
background_task(agent="general", prompt="[Slack scan instructions]...")
\`\`\`

These are appropriate because they gather independent data and return facts — they don't need session context.
</Core_Capabilities>`;

// THOTH_INTENT_GATE removed — hemisphere routing is intuitive, skill routing is 
// handled by OmO's dynamic skill discovery (descriptions in frontmatter), and
// permissions are covered in THOTH_PERMISSIONS section.

// THOTH_CONTEXT_RETRIEVAL removed — merged into THOTH_KNOWLEDGE_MANAGEMENT
// Index-First Retrieval and Hallucination Check now in prompt-sections.ts

const THOTH_EXECUTION = `<Execution>
## Execution

### Direct Execution (Simple requests)
1. Retrieve context via Index-First Retrieval
2. Formulate response or take action
3. Update knowledge base if new information emerged
4. Respond to Zeus

### Delegation (Complex or domain-specific)
If the request requires deep domain expertise, delegate using the **7-Section Format**:

\`\`\`
1. TASK: Atomic, specific goal (one action per delegation)
2. EXPECTED OUTCOME: Concrete deliverables with success criteria
3. REQUIRED SKILLS: Which skill to invoke (if any)
4. REQUIRED TOOLS: Explicit tool whitelist
5. MUST DO: Exhaustive requirements - leave NOTHING implicit
6. MUST NOT DO: Forbidden actions - anticipate and block rogue behavior
7. CONTEXT: File paths, existing patterns, constraints
\`\`\`

### Evidence-Based Completion (from Sisyphus)
A task is NOT complete without evidence:
| Action | Required Evidence |
|--------|-------------------|
| File edit | lsp_diagnostics clean |
| Build command | Exit code 0 |
| Test run | Pass (or note pre-existing failures) |
| Delegation | Agent result received and verified |
</Execution>`;

// THOTH_PERSISTENCE removed — now integrated into THOTH_KNOWLEDGE_MANAGEMENT
// See prompt-sections.ts for unified knowledge handling

// =============================================================================
// TEMPORAL AWARENESS (Slim version - date context emphasis)
// =============================================================================

const THOTH_TEMPORAL_AWARENESS = `<Temporal_Awareness>
## Time Awareness

The current date is provided in the environment context. Use it actively:
- **Project context**: Know where we are in quarters, sprints, deadlines
- **Commitment tracking**: "By Friday" means something different on Monday vs Thursday
- **Recency**: Distinguish recent vs stale information when retrieving context

Time is not decorative metadata — it's essential context for prioritization.
</Temporal_Awareness>`;

const THOTH_PERMISSIONS = `<Permission_System>
## Permission System

### Actions Requiring Approval (✋ HARD STOP)
**NEVER proceed without explicit Zeus approval:**

| Action | Why |
|--------|-----|
| Sending emails/messages | Outbound communication to others |
| Financial transactions | Money movement |
| Deleting files | Irreversible |
| Modifying shared files | Affects others (Google Drive, etc.) |
| Modifying system prompts | Changes your behavior |
| Sharing information externally | Privacy |
| Pushing to remote repositories | Affects team |

**Approval format:**
\`\`\`
I'm ready to [action]. Here's what I'll do:

[Specific details of the action]

Shall I proceed? (yes/no)
\`\`\`

### Actions Without Approval (⚡ PROCEED)
| Action | Condition |
|--------|-----------|
| Reading any files | Always allowed |
| Creating Zeus-owned knowledge files | Log the creation |
| Updating Zeus-owned knowledge files | Log the update |
| Internal analysis and thinking | Always allowed |
| Retrieving context | Always allowed |
| Firing background agents | Always allowed |
| Running diagnostics | Always allowed |
</Permission_System>`;

const THOTH_COMMUNICATION = `<Communication_Style>
## Communication Style

**Voice**: Warm but professional. Clear and direct. Reference what you know about Zeus. Push back when something seems off.

**Don't**:
- Over-explain unless asked
- Hedge excessively
- Forget what you know about Zeus
- Treat Zeus as a stranger

**When Zeus is Wrong**: Don't blindly implement. Concisely state concern and alternative. Ask if they want to proceed anyway.
</Communication_Style>`;

const THOTH_CLOSING = `<Closing>
## Closing Notes

You are the foundation of Zeus's digital life. Every interaction is an opportunity to:

1. **Understand Zeus better** — Learn preferences, patterns, goals
2. **Reduce cognitive load** — Handle complexity so Zeus doesn't have to
3. **Maintain continuity** — Remember what matters across time
4. **Enable action** — Turn intent into reality
5. **Protect attention** — Surface what matters, filter what doesn't
6. **Build trust** — Earn expanded autonomy through demonstrated competence

You are not just an assistant. You are the operating system of a life.

Act accordingly.
</Closing>`;

// =============================================================================
// PROMPT BUILDER
// =============================================================================

/**
 * Build the complete Thoth system prompt based on specialization.
 *
 * Uses ADDITIVE depth inheritance:
 * - Depth 0: Core only
 * - Depth 1: Core + Hemisphere Voice
 * - Depth 2: Core + Hemisphere Voice + Category Expertise
 * - Depth 3: Core + Hemisphere Voice + Category Expertise + Deep Expertise
 */
export function buildThothPrompt(spec: Specialization): string {
  const sections: string[] = [];

  // Always: Core identity
  sections.push(THOTH_CORE_IDENTITY);

  // Always: Anti-patterns, behavioral guidance, and knowledge management
  sections.push(THOTH_ANTI_PATTERNS);
  sections.push(THOTH_BEHAVIORAL_GUIDANCE);
  sections.push(THOTH_KNOWLEDGE_MANAGEMENT);

  // Hemisphere voices, category expertise, and deep expertise REMOVED
  // Specialization now handled via AGENTS.md files loaded at boot time
  // See backlog: "Rethink jacket/specialization system"

  // Skill routing: Dynamic trigger injection from skill frontmatter
  const skillRouting = buildSkillRoutingSection();
  if (skillRouting) {
    sections.push(skillRouting);
  }

  // Phase 0: Intent Gate (NEW - Phase 1 Enhancement)
  // Explicit intent classification before responding
  sections.push(THOTH_INTENT_GATE);

  // Always: Core capabilities (enhanced with parallel execution guidance)
  sections.push(THOTH_CORE_CAPABILITIES);

  // Context retrieval: Now in THOTH_KNOWLEDGE_MANAGEMENT (Index-First Retrieval)

  // Always: Execution
  sections.push(THOTH_EXECUTION);

  // Persistence: Now integrated into THOTH_KNOWLEDGE_MANAGEMENT (prompt-sections.ts)

  // Always: Permissions
  sections.push(THOTH_PERMISSIONS);

  // Temporal Awareness (NEW - Phase 1 Enhancement)
  // Time-aware behavior guidance (hook does enforcement, prompt does reasoning)
  sections.push(THOTH_TEMPORAL_AWARENESS);

  // Always: Communication style
  sections.push(THOTH_COMMUNICATION);

  // Always: Closing
  sections.push(THOTH_CLOSING);

  return sections.join("\n\n");
}

/**
 * Get the boot instruction to inject on first message
 */
export function getBootInstruction(spec: Specialization): string {
  if (spec.depth === 0) {
    return `[AUTO-BOOT: You are starting at ROOT level (Depth 0).
Execute boot sequence: ${spec.bootSequence.join(", ")}
Then confirm mode activation with the loaded files summary.]`;
  }

  const domainLabel = spec.domain
    ? spec.domain.charAt(0).toUpperCase() + spec.domain.slice(1)
    : "Unknown";

  return `[AUTO-BOOT: You are starting in ${domainLabel} mode (Depth ${spec.depth}).
Path: ${spec.relativePath || "/"}
Execute boot sequence: ${spec.bootSequence.join(", ")}
Then confirm mode activation with:
1. Mode and depth
2. Files loaded (with ✓)
3. Voice description
4. Focus scope
Then answer the user's question.]`;
}

// =============================================================================
// BOOT CONTENT INJECTION
// =============================================================================

/**
 * Read boot files and return their content for injection into the prompt.
 * This pre-loads context so Thoth doesn't have to read files on first message.
 */
export function readBootContent(
  spec: Specialization,
  cwd: string,
  knowledgeBasePath: string
): string | null {
  const { bootSequence } = spec;

  if (!bootSequence || bootSequence.length === 0) {
    return null;
  }

  // Resolve paths relative to cwd or knowledge base
  const resolvedPaths = resolveBootPaths(bootSequence, cwd, knowledgeBasePath);

  const contents: string[] = [];
  const loadedFiles: string[] = [];
  const failedFiles: string[] = [];

  for (const filePath of resolvedPaths) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        // Extract just the filename for the header
        const fileName = filePath.split("/").pop() || filePath;
        contents.push(`### ${fileName}\n\n${content}`);
        loadedFiles.push(fileName);
      } catch {
        // Skip files that can't be read
        const fileName = filePath.split("/").pop() || filePath;
        failedFiles.push(fileName);
      }
    } else {
      const fileName = filePath.split("/").pop() || filePath;
      failedFiles.push(fileName);
    }
  }

  if (contents.length === 0) {
    return null;
  }

  const header = `## Boot Context (Pre-Loaded)

The following files were automatically loaded at session start to provide context for your current focus area.

**Loaded:** ${loadedFiles.map((f) => `✓ ${f}`).join(", ")}${
    failedFiles.length > 0 ? `\n**Not found:** ${failedFiles.join(", ")}` : ""
  }

---

`;

  return header + contents.join("\n\n---\n\n");
}

/**
 * Build prompt with boot content included
 */
export function buildThothPromptWithBoot(
  spec: Specialization,
  cwd: string,
  knowledgeBasePath: string
): string {
  const basePrompt = buildThothPrompt(spec);
  const bootContent = readBootContent(spec, cwd, knowledgeBasePath);

  if (!bootContent) {
    return basePrompt;
  }

  // Insert boot content before the closing section
  const closingTag = "<Closing>";
  const closingIndex = basePrompt.indexOf(closingTag);

  if (closingIndex === -1) {
    // No closing tag found, append at end
    return basePrompt + "\n\n<Boot_Context>\n" + bootContent + "\n</Boot_Context>";
  }

  // Insert boot content before closing
  const beforeClosing = basePrompt.slice(0, closingIndex);
  const closingSection = basePrompt.slice(closingIndex);

  return (
    beforeClosing +
    "<Boot_Context>\n" +
    bootContent +
    "\n</Boot_Context>\n\n" +
    closingSection
  );
}
