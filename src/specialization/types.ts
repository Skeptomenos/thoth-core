/**
 * Specialization Types
 *
 * Defines the types for Thoth's depth-based specialization system.
 */

/**
 * The four hemispheres of Thoth's knowledge base
 */
export type Domain = "work" | "life" | "coding" | "kernel";

/**
 * Depth levels for specialization
 * 0 = Root (Pure Thoth)
 * 1 = Hemisphere (e.g., /work/)
 * 2 = Category (e.g., /work/projects/)
 * 3 = Entity/Capsule (e.g., /work/projects/project-x/)
 */
export type DepthLevel = 0 | 1 | 2 | 3;

/**
 * The result of specialization detection
 */
export interface Specialization {
  /** The calculated depth level (0-3) */
  depth: DepthLevel;

  /** The primary domain/hemisphere */
  domain: Domain | null;

  /** The category within the domain (depth 2+) */
  category: string | null;

  /** The specific entity (depth 3) */
  entity: string | null;

  /** The full relative path from knowledge base root */
  relativePath: string;

  /** Boot sequence files to load */
  bootSequence: string[];

  /** Whether depth was overridden (via AGENTS.md or CONTEXT.md) */
  depthOverridden: boolean;

  /** Source of depth override if any */
  depthSource: "folder" | "agents-md" | "context-md";
}

/**
 * AGENTS.md frontmatter structure
 */
export interface AgentsMdFrontmatter {
  /** Explicit depth override */
  depth?: number;

  /** Hemisphere this AGENTS.md belongs to */
  hemisphere?: Domain;

  /** Boot sequence files */
  boot_sequence?: string[];

  /** Additional tags */
  tags?: string[];
}

/**
 * Parsed AGENTS.md file
 */
export interface ParsedAgentsMd {
  /** Parsed frontmatter */
  frontmatter: AgentsMdFrontmatter | null;

  /** Content after frontmatter */
  content: string;

  /** Full file path */
  path: string;
}

/**
 * Session specialization state
 */
export interface SessionSpecializationState {
  /** Session ID */
  sessionID: string;

  /** Detected specialization */
  specialization: Specialization;

  /** Whether boot has been executed */
  bootExecuted: boolean;

  /** Timestamp of detection */
  detectedAt: number;
}

/**
 * Boot instruction to inject on first message
 */
export interface BootInstruction {
  /** The instruction text to inject */
  instruction: string;

  /** Files that should be read */
  files: string[];

  /** Mode description for confirmation output */
  modeDescription: string;
}
