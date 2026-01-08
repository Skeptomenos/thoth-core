/**
 * Boot Sequences
 *
 * Defines what files should be loaded at each depth/domain combination.
 */

import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { Domain, DepthLevel } from "./types";

// Get the directory of this module for finding npm defaults
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to npm package defaults (relative to dist/specialization/)
const NPM_DEFAULTS_PATH = join(__dirname, "..", "defaults");

/**
 * Default boot sequences by domain and depth
 */
const DEFAULT_BOOT_SEQUENCES: Record<string, string[]> = {
  // Depth 0 - Root
  "0:null": ["kernel/registry.md"],

  // Depth 1 - Hemispheres
  "1:work": ["work/registry.md", "work/dashboard.md"],
  "1:life": ["life/registry.md", "life/dashboard.md"],
  "1:coding": ["coding/registry.md", "coding/dashboard.md"],
  "1:kernel": ["kernel/registry.md", "kernel/config/preferences.md"],

  // Depth 2 - Categories (general pattern, may be overridden)
  "2:work": ["_index.md", "dashboard.md"],
  "2:life": ["_index.md", "dashboard.md"],
  "2:coding": ["_index.md", "dashboard.md"],
  "2:kernel": ["_index.md"],

  // Depth 3 - Entities/Capsules
  "3:work": ["CONTEXT.md", "overview.md", "decisions.md"],
  "3:life": ["CONTEXT.md", "overview.md", "notes.md"],
  "3:coding": ["CONTEXT.md", "README.md", "architecture.md"],
  "3:kernel": ["CONTEXT.md", "overview.md"],
};

/**
 * Category-specific boot sequences (more specific than domain defaults)
 */
const CATEGORY_BOOT_SEQUENCES: Record<string, string[]> = {
  // Work categories
  "work/projects": ["projects/_index.md", "projects/dashboard.md"],
  "work/stakeholders": ["stakeholders/_index.md"],
  "work/inbox": ["inbox/_index.md"],

  // Life categories
  "life/finances": ["finances/_index.md", "finances/goals.md"],
  "life/health": ["health/_index.md", "health/habits.md"],
  "life/relationships": ["relationships/_index.md"],

  // Coding categories
  "coding/projects": ["projects/_index.md"],
  "coding/references": ["references/_index.md"],
};

/**
 * Get the boot sequence for a given specialization
 */
export function getBootSequence(
  depth: DepthLevel,
  domain: Domain | null,
  category: string | null,
  relativePath: string,
  overrideSequence?: string[]
): string[] {
  // If AGENTS.md provides explicit boot_sequence, use it
  if (overrideSequence && overrideSequence.length > 0) {
    return overrideSequence;
  }

  // Depth 0 - Root level
  if (depth === 0 || !domain) {
    return DEFAULT_BOOT_SEQUENCES["0:null"] || [];
  }

  // Depth 1 - Hemisphere level
  if (depth === 1) {
    return DEFAULT_BOOT_SEQUENCES[`1:${domain}`] || [];
  }

  // Depth 2 - Category level
  if (depth === 2 && category) {
    const categoryKey = `${domain}/${category}`;
    if (CATEGORY_BOOT_SEQUENCES[categoryKey]) {
      return CATEGORY_BOOT_SEQUENCES[categoryKey];
    }
    // Fall back to domain default for depth 2
    return DEFAULT_BOOT_SEQUENCES[`2:${domain}`] || [];
  }

  // Depth 3 - Entity/Capsule level
  if (depth === 3) {
    return DEFAULT_BOOT_SEQUENCES[`3:${domain}`] || [];
  }

  return [];
}

/**
 * Resolve boot sequence paths relative to current working directory
 * Falls back to npm package defaults if file not found in knowledge base
 */
export function resolveBootPaths(
  bootSequence: string[],
  cwd: string,
  knowledgeBasePath: string
): string[] {
  return bootSequence.map((file) => {
    // If file starts with a domain (work/, life/, etc.), it's relative to knowledge base
    if (
      file.startsWith("work/") ||
      file.startsWith("life/") ||
      file.startsWith("coding/") ||
      file.startsWith("kernel/")
    ) {
      const kbPath = `${knowledgeBasePath}/${file}`;
      
      // If file exists in knowledge base, use it
      if (existsSync(kbPath)) {
        return kbPath;
      }
      
      // Fall back to npm package defaults
      const npmPath = join(NPM_DEFAULTS_PATH, file);
      if (existsSync(npmPath)) {
        return npmPath;
      }
      
      // Return KB path anyway (will fail gracefully with helpful error)
      return kbPath;
    }

    // Otherwise, it's relative to cwd
    return `${cwd}/${file}`;
  });
}

/**
 * Get a human-readable description of the boot sequence
 */
export function describeBootSequence(bootSequence: string[]): string {
  if (bootSequence.length === 0) {
    return "No boot files configured";
  }

  return bootSequence
    .map((file) => `- ${file}`)
    .join("\n");
}
