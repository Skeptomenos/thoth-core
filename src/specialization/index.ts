/**
 * Specialization Module
 *
 * Main exports for Thoth's depth-based specialization system.
 */

// Types
export type {
  Domain,
  DepthLevel,
  Specialization,
  AgentsMdFrontmatter,
  ParsedAgentsMd,
  SessionSpecializationState,
  BootInstruction,
} from "./types";

// Detection
export {
  detectSpecialization,
  findAgentsMdChain,
  isWithinKnowledgeBase,
} from "./detector";

// Boot sequences
export {
  getBootSequence,
  resolveBootPaths,
  describeBootSequence,
} from "./boot-sequences";

// Prompt sections
export {
  THOTH_CORE_IDENTITY,
  HEMISPHERE_VOICE,
  CATEGORY_EXPERTISE,
  DEEP_EXPERTISE,
  getFocusInstruction,
  getModeConfirmationTemplate,
} from "./prompt-sections";

// Prompt builder
export {
  buildThothPrompt,
  buildThothPromptWithBoot,
  getBootInstruction,
  readBootContent,
} from "./prompt-builder";
