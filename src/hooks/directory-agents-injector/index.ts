/**
 * Directory Agents Injector Hook
 *
 * Injects AGENTS.md content into context when files are read.
 * Walks up the directory tree and injects all AGENTS.md files found,
 * from root to deepest (layered context).
 *
 * Ported from oh-my-opencode with Thoth-specific adaptations.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  loadInjectedPaths,
  saveInjectedPaths,
  clearInjectedPaths,
} from "./storage";
import { AGENTS_FILENAME } from "./constants";
import type { ToolExecuteInput, ToolExecuteOutput, EventInput } from "./types";
import { log } from "../../shared";

interface DirectoryAgentsInjectorOptions {
  /** Path to the Thoth knowledge base */
  knowledgeBasePath: string;
  /** Working directory for the session */
  directory: string;
}

export function createDirectoryAgentsInjectorHook(options: DirectoryAgentsInjectorOptions) {
  const { knowledgeBasePath, directory } = options;
  const sessionCaches = new Map<string, Set<string>>();

  function getSessionCache(sessionID: string): Set<string> {
    if (!sessionCaches.has(sessionID)) {
      sessionCaches.set(sessionID, loadInjectedPaths(sessionID));
    }
    return sessionCaches.get(sessionID)!;
  }

  function resolveFilePath(title: string): string | null {
    if (!title) return null;
    if (title.startsWith("/")) return title;
    return resolve(directory, title);
  }

  /**
   * Find all AGENTS.md files from startDir up to knowledgeBasePath
   * Returns paths from root to deepest (for layered injection)
   */
  function findAgentsMdUp(startDir: string): string[] {
    const found: string[] = [];
    let current = startDir;

    // Normalize the knowledge base path
    const normalizedBase = knowledgeBasePath.endsWith("/")
      ? knowledgeBasePath.slice(0, -1)
      : knowledgeBasePath;

    while (true) {
      const agentsPath = join(current, AGENTS_FILENAME);
      if (existsSync(agentsPath)) {
        found.push(agentsPath);
      }

      // Stop if we've reached the knowledge base root
      if (current === normalizedBase) break;

      const parent = dirname(current);

      // Stop if we've gone above the knowledge base
      if (!parent.startsWith(normalizedBase)) break;

      // Stop if we can't go higher
      if (parent === current) break;

      current = parent;
    }

    // Reverse so root is first, deepest is last
    return found.reverse();
  }

  /**
   * Check if a file path is within the knowledge base
   */
  function isWithinKnowledgeBase(filePath: string): boolean {
    const normalizedBase = knowledgeBasePath.endsWith("/")
      ? knowledgeBasePath.slice(0, -1)
      : knowledgeBasePath;
    return filePath.startsWith(normalizedBase);
  }

  const toolExecuteAfter = async (
    input: ToolExecuteInput,
    output: ToolExecuteOutput
  ) => {
    // Only trigger on file reads
    if (input.tool.toLowerCase() !== "read") return;

    const filePath = resolveFilePath(output.title);
    if (!filePath) return;

    // Only inject for files within the knowledge base
    if (!isWithinKnowledgeBase(filePath)) return;

    const dir = dirname(filePath);
    const cache = getSessionCache(input.sessionID);
    const agentsPaths = findAgentsMdUp(dir);

    const toInject: { path: string; content: string }[] = [];

    for (const agentsPath of agentsPaths) {
      const agentsDir = dirname(agentsPath);

      // Skip if already injected for this session
      if (cache.has(agentsDir)) continue;

      try {
        const content = readFileSync(agentsPath, "utf-8");
        toInject.push({ path: agentsPath, content });
        cache.add(agentsDir);
      } catch (err) {
        log(`Failed to read AGENTS.md at ${agentsPath}:`, err);
      }
    }

    if (toInject.length === 0) return;

    // Append injected content to output
    for (const { path, content } of toInject) {
      const relativePath = path.replace(knowledgeBasePath, "").replace(/^\//, "");
      output.output += `\n\n[Directory Context: ${relativePath}]\n${content}`;
    }

    // Persist the updated cache
    saveInjectedPaths(input.sessionID, cache);

    log(`Injected ${toInject.length} AGENTS.md file(s) for session ${input.sessionID}`);
  };

  const eventHandler = async ({ event }: EventInput) => {
    const props = event.properties as Record<string, unknown> | undefined;

    // Clear cache when session is deleted
    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined;
      if (sessionInfo?.id) {
        sessionCaches.delete(sessionInfo.id);
        clearInjectedPaths(sessionInfo.id);
        log(`Cleared AGENTS.md cache for deleted session ${sessionInfo.id}`);
      }
    }

    // Clear cache when session is compacted
    if (event.type === "session.compacted") {
      const sessionID = (props?.sessionID ??
        (props?.info as { id?: string } | undefined)?.id) as string | undefined;
      if (sessionID) {
        sessionCaches.delete(sessionID);
        clearInjectedPaths(sessionID);
        log(`Cleared AGENTS.md cache for compacted session ${sessionID}`);
      }
    }
  };

  return {
    "tool.execute.after": toolExecuteAfter,
    event: eventHandler,
  };
}

export { AGENTS_FILENAME } from "./constants";
