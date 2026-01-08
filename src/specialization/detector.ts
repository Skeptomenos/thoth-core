/**
 * Specialization Detector
 *
 * Detects the appropriate depth and domain based on the current working directory.
 * Uses a hybrid approach: folder depth as default, with overrides via AGENTS.md or CONTEXT.md.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import type {
  Specialization,
  Domain,
  DepthLevel,
  AgentsMdFrontmatter,
  ParsedAgentsMd,
} from "./types";
import { getBootSequence } from "./boot-sequences";

const AGENTS_FILENAME = "AGENTS.md";
const CONTEXT_FILENAME = "CONTEXT.md";

/**
 * Valid domain/hemisphere names
 */
const VALID_DOMAINS: Domain[] = ["work", "life", "coding", "kernel"];

/**
 * Parse AGENTS.md frontmatter (YAML between --- delimiters)
 */
function parseAgentsMd(filePath: string): ParsedAgentsMd | null {
  if (!existsSync(filePath)) return null;

  try {
    const content = readFileSync(filePath, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

    if (!frontmatterMatch) {
      return {
        frontmatter: null,
        content: content,
        path: filePath,
      };
    }

    const frontmatterRaw = frontmatterMatch[1];
    const bodyContent = frontmatterMatch[2];

    // Simple YAML parsing for our specific keys
    const frontmatter: AgentsMdFrontmatter = {};

    // Parse depth
    const depthMatch = frontmatterRaw.match(/^depth:\s*(\d+)/m);
    if (depthMatch) {
      frontmatter.depth = parseInt(depthMatch[1], 10);
    }

    // Parse hemisphere
    const hemisphereMatch = frontmatterRaw.match(/^hemisphere:\s*(\w+)/m);
    if (hemisphereMatch && VALID_DOMAINS.includes(hemisphereMatch[1] as Domain)) {
      frontmatter.hemisphere = hemisphereMatch[1] as Domain;
    }

    // Parse boot_sequence (simple array format)
    const bootMatch = frontmatterRaw.match(/^boot_sequence:\s*\n((?:\s*-\s*.+\n?)+)/m);
    if (bootMatch) {
      frontmatter.boot_sequence = bootMatch[1]
        .split("\n")
        .map((line) => line.replace(/^\s*-\s*/, "").trim())
        .filter(Boolean);
    }

    return {
      frontmatter,
      content: bodyContent,
      path: filePath,
    };
  } catch {
    return null;
  }
}

/**
 * Detect the domain from the first path segment after knowledge base root
 */
function detectDomain(relativePath: string): Domain | null {
  const segments = relativePath.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const firstSegment = segments[0].toLowerCase();
  if (VALID_DOMAINS.includes(firstSegment as Domain)) {
    return firstSegment as Domain;
  }

  return null;
}

/**
 * Calculate depth from folder structure
 */
function calculateFolderDepth(relativePath: string): DepthLevel {
  const segments = relativePath.split("/").filter(Boolean);
  return Math.min(segments.length, 3) as DepthLevel;
}

/**
 * Extract category from path (second segment)
 */
function extractCategory(relativePath: string): string | null {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.length >= 2 ? segments[1] : null;
}

/**
 * Extract entity from path (third segment or deeper)
 */
function extractEntity(relativePath: string): string | null {
  const segments = relativePath.split("/").filter(Boolean);
  return segments.length >= 3 ? segments[2] : null;
}

/**
 * Check if directory has CONTEXT.md (indicates a capsule = Depth 3)
 */
function hasContextMd(cwd: string): boolean {
  return existsSync(join(cwd, CONTEXT_FILENAME));
}

/**
 * Main detection function: determines specialization from current working directory
 */
export function detectSpecialization(
  cwd: string,
  knowledgeBasePath: string
): Specialization {
  // Normalize paths
  const normalizedCwd = cwd.endsWith("/") ? cwd.slice(0, -1) : cwd;
  const normalizedBase = knowledgeBasePath.endsWith("/")
    ? knowledgeBasePath.slice(0, -1)
    : knowledgeBasePath;

  // Calculate relative path
  let relativePath = "";
  if (normalizedCwd.startsWith(normalizedBase)) {
    relativePath = normalizedCwd.slice(normalizedBase.length);
    if (relativePath.startsWith("/")) {
      relativePath = relativePath.slice(1);
    }
  }

  // Detect domain from path
  const domain = detectDomain(relativePath);

  // Calculate folder-based depth
  let depth = calculateFolderDepth(relativePath);
  let depthSource: Specialization["depthSource"] = "folder";
  let depthOverridden = false;

  // Check for AGENTS.md override
  const agentsMdPath = join(normalizedCwd, AGENTS_FILENAME);
  const agentsMd = parseAgentsMd(agentsMdPath);

  if (agentsMd?.frontmatter?.depth !== undefined) {
    const overrideDepth = agentsMd.frontmatter.depth;
    if (overrideDepth >= 0 && overrideDepth <= 3) {
      depth = overrideDepth as DepthLevel;
      depthSource = "agents-md";
      depthOverridden = true;
    }
  }

  // Check for CONTEXT.md (signals capsule = Depth 3)
  if (!depthOverridden && hasContextMd(normalizedCwd)) {
    depth = 3;
    depthSource = "context-md";
    depthOverridden = true;
  }

  // Extract category and entity
  const category = extractCategory(relativePath);
  const entity = extractEntity(relativePath);

  // Get boot sequence for this depth/domain
  const bootSequence = getBootSequence(
    depth,
    domain,
    category,
    relativePath,
    agentsMd?.frontmatter?.boot_sequence
  );

  return {
    depth,
    domain,
    category,
    entity,
    relativePath,
    bootSequence,
    depthOverridden,
    depthSource,
  };
}

/**
 * Find all AGENTS.md files from cwd up to knowledge base root
 * Returns paths from root to deepest (for layered injection)
 */
export function findAgentsMdChain(
  cwd: string,
  knowledgeBasePath: string
): ParsedAgentsMd[] {
  const found: ParsedAgentsMd[] = [];
  let current = cwd;

  // Normalize base path
  const normalizedBase = knowledgeBasePath.endsWith("/")
    ? knowledgeBasePath.slice(0, -1)
    : knowledgeBasePath;

  while (current.startsWith(normalizedBase) || current === normalizedBase) {
    const agentsPath = join(current, AGENTS_FILENAME);
    const parsed = parseAgentsMd(agentsPath);
    if (parsed) {
      found.push(parsed);
    }

    if (current === normalizedBase) break;

    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  // Reverse so root is first, deepest is last
  return found.reverse();
}

/**
 * Check if a path is within the knowledge base
 */
export function isWithinKnowledgeBase(
  filePath: string,
  knowledgeBasePath: string
): boolean {
  const normalizedPath = filePath.startsWith("/") ? filePath : join(process.cwd(), filePath);
  const normalizedBase = knowledgeBasePath.endsWith("/")
    ? knowledgeBasePath.slice(0, -1)
    : knowledgeBasePath;

  return normalizedPath.startsWith(normalizedBase);
}
