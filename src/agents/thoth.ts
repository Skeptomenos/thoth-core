/**
 * Thoth Agent Configuration
 *
 * Thoth is Zeus's root-level life orchestrator and trusted chief of staff.
 * Uses depth-based specialization: the prompt is built dynamically based on
 * the current working directory when the session starts.
 *
 * Depth Model:
 * - Depth 0: /thoth/           → Pure Chief of Staff
 * - Depth 1: /thoth/work/      → Executive COS (crisp, P0-focused)
 * - Depth 2: /thoth/work/projects/ → Project Portfolio Manager
 * - Depth 3: /thoth/work/projects/xyz/ → Deep Expert on Project XYZ
 */

import type { AgentConfig } from "@opencode-ai/sdk";
import { buildThothPrompt, buildThothPromptWithBoot, detectSpecialization } from "../specialization";
import type { Specialization } from "../specialization";

/**
 * Default specialization (Depth 0 - Root level)
 */
const DEFAULT_SPECIALIZATION: Specialization = {
  depth: 0,
  domain: null,
  category: null,
  entity: null,
  relativePath: "",
  bootSequence: ["kernel/registry.md"],
  depthOverridden: false,
  depthSource: "folder",
};

/**
 * Build the default Thoth system prompt (Depth 0)
 */
const DEFAULT_THOTH_PROMPT = buildThothPrompt(DEFAULT_SPECIALIZATION);

/**
 * Create a Thoth agent with the given specialization
 * 
 * @param specialization - The detected specialization
 * @param cwd - Current working directory (for resolving boot files)
 * @param knowledgeBasePath - Path to the knowledge base root
 */
export function createThothAgent(
  specialization: Specialization,
  cwd?: string,
  knowledgeBasePath?: string
): AgentConfig {
  // Use boot-enhanced prompt if we have paths, otherwise fall back to basic prompt
  const prompt = cwd && knowledgeBasePath
    ? buildThothPromptWithBoot(specialization, cwd, knowledgeBasePath)
    : buildThothPrompt(specialization);

  return {
    description: getAgentDescription(specialization),
    mode: "primary",
    thinking: {
      type: "enabled",
      budgetTokens: 32000,
    },
    maxTokens: 64000,
    prompt,
    color: "#FFD700",
  };
}

/**
 * Generate agent description based on specialization
 */
function getAgentDescription(spec: Specialization): string {
  const parts: string[] = [
    "Thoth - Root-level life orchestrator and trusted chief of staff.",
  ];

  if (spec.depth === 0) {
    parts.push("Operating at ROOT level with cross-domain access.");
  } else if (spec.depth === 1 && spec.domain) {
    const domainDescriptions: Record<string, string> = {
      work: "Operating in WORK mode: Executive COS, crisp and P0-focused.",
      life: "Operating in LIFE mode: Personal Consultant, warm and values-aligned.",
      coding: "Operating in CODING mode: Technical Architect, strategic guidance.",
      kernel: "Operating in KERNEL mode: System Engineer, protecting the kernel.",
    };
    parts.push(domainDescriptions[spec.domain] || `Operating in ${spec.domain} mode.`);
  } else if (spec.depth === 2 && spec.domain && spec.category) {
    parts.push(`Operating in ${spec.domain}/${spec.category} mode (Depth 2).`);
  } else if (spec.depth === 3) {
    parts.push(`Operating as DEEP EXPERT on ${spec.entity || spec.relativePath} (Depth 3).`);
  }

  return parts.join(" ");
}

/**
 * The default Thoth agent configuration (Depth 0)
 *
 * This is used when no specialization is detected or as a fallback.
 * The actual agent used in a session is created dynamically based on
 * the detected specialization from the working directory.
 */
export const thothAgent: AgentConfig = {
  description:
    "Thoth - Root-level life orchestrator and trusted chief of staff. Manages all hemispheres (work, personal, coding, system). Routes intent to specialized agents, maintains knowledge base, enforces permissions, supports rhythmic workflows. Warm but professional advisor who knows everything about Zeus.",
  mode: "primary",
  thinking: {
    type: "enabled",
    budgetTokens: 32000,
  },
  maxTokens: 64000,
  prompt: DEFAULT_THOTH_PROMPT,
  color: "#FFD700",
};

/**
 * Re-export for convenience
 */
export { detectSpecialization, buildThothPrompt };
export type { Specialization };
