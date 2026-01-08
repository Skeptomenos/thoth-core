import { tool } from "@opencode-ai/plugin";
import { existsSync, readdirSync, readFileSync, lstatSync, readlinkSync } from "fs";
import { homedir } from "os";
import { join, basename, resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Get the directory of this module for finding defaults
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to npm package defaults (relative to dist/tools/skill/ -> dist/defaults/skill/)
const NPM_DEFAULTS_SKILL_DIR = join(__dirname, "..", "..", "defaults", "skill");

import type { SkillScope, SkillMetadata, SkillInfo, LoadedSkill, SkillFrontmatter } from "./types";

/**
 * Deduplicate skills by name - first occurrence wins (project > user > builtin)
 */
function deduplicateSkills<T extends { name: string }>(skills: T[]): T[] {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const nameLower = skill.name.toLowerCase();
    if (seen.has(nameLower)) return false;
    seen.add(nameLower);
    return true;
  });
}

interface FrontmatterResult<T = Record<string, unknown>> {
  data: T;
  body: string;
}

function parseFrontmatter<T = Record<string, unknown>>(content: string): FrontmatterResult<T> {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { data: {} as T, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  const data: Record<string, string | boolean | string[]> = {};
  const lines = yamlContent.split("\n");
  let currentKey: string | null = null;
  let currentArray: string[] | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed.startsWith("- ") && currentKey && currentArray !== null) {
      currentArray.push(trimmed.slice(2).trim());
      continue;
    }

    if (currentKey && currentArray !== null) {
      data[currentKey] = currentArray;
      currentKey = null;
      currentArray = null;
    }

    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      const valueStr = line.slice(colonIndex + 1).trim();

      if (valueStr === "") {
        currentKey = key;
        currentArray = [];
      } else if (valueStr === "true") {
        data[key] = true;
      } else if (valueStr === "false") {
        data[key] = false;
      } else {
        data[key] = valueStr;
      }
    }
  }

  if (currentKey && currentArray !== null) {
    data[currentKey] = currentArray;
  }

  return { data: data as T, body };
}

function resolveSymlink(filePath: string): string {
  try {
    const stats = lstatSync(filePath, { throwIfNoEntry: false });
    if (stats?.isSymbolicLink()) {
      return resolve(filePath, "..", readlinkSync(filePath));
    }
    return filePath;
  } catch {
    return filePath;
  }
}

function parseSkillFrontmatter(data: Record<string, unknown>): SkillFrontmatter {
  return {
    name: typeof data.name === "string" ? data.name : "",
    description: typeof data.description === "string" ? data.description : "",
    license: typeof data.license === "string" ? data.license : undefined,
    "allowed-tools": Array.isArray(data["allowed-tools"]) ? data["allowed-tools"] : undefined,
    metadata:
      typeof data.metadata === "object" && data.metadata !== null
        ? (data.metadata as Record<string, string>)
        : undefined,
  };
}

function discoverSkillsFromDir(
  skillsDir: string,
  scope: SkillScope
): Array<{ name: string; description: string; scope: SkillScope }> {
  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills: Array<{ name: string; description: string; scope: SkillScope }> = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const skillPath = join(skillsDir, entry.name);

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const resolvedPath = resolveSymlink(skillPath);

      const skillMdPath = join(resolvedPath, "SKILL.md");
      if (!existsSync(skillMdPath)) continue;

      try {
        const content = readFileSync(skillMdPath, "utf-8");
        const { data } = parseFrontmatter(content);

        skills.push({
          name: (data.name as string) || entry.name,
          description: (data.description as string) || "",
          scope,
        });
      } catch {
        continue;
      }
    }
  }

  return skills;
}

function discoverSkillsSync(): Array<{ name: string; description: string; scope: SkillScope }> {
  const userSkillsDir = join(homedir(), ".opencode", "skill");
  const projectSkillsDir = join(process.cwd(), ".opencode", "skill");

  // Discover from all three sources
  const builtinSkills = discoverSkillsFromDir(NPM_DEFAULTS_SKILL_DIR, "builtin");
  const userSkills = discoverSkillsFromDir(userSkillsDir, "user");
  const projectSkills = discoverSkillsFromDir(projectSkillsDir, "project");

  // Project > User > Builtin (first occurrence wins via deduplication)
  return deduplicateSkills([...projectSkills, ...userSkills, ...builtinSkills]);
}

async function parseSkillMd(skillPath: string): Promise<SkillInfo | null> {
  const resolvedPath = resolveSymlink(skillPath);
  const skillMdPath = join(resolvedPath, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    return null;
  }

  try {
    const content = readFileSync(skillMdPath, "utf-8");
    const { data, body } = parseFrontmatter(content);

    const frontmatter = parseSkillFrontmatter(data);

    const metadata: SkillMetadata = {
      name: frontmatter.name || basename(skillPath),
      description: frontmatter.description,
      license: frontmatter.license,
      allowedTools: frontmatter["allowed-tools"],
      metadata: frontmatter.metadata,
    };

    const referencesDir = join(resolvedPath, "references");
    const scriptsDir = join(resolvedPath, "scripts");
    const assetsDir = join(resolvedPath, "assets");

    const references = existsSync(referencesDir)
      ? readdirSync(referencesDir).filter((f) => !f.startsWith("."))
      : [];

    const scripts = existsSync(scriptsDir)
      ? readdirSync(scriptsDir).filter((f) => !f.startsWith(".") && !f.startsWith("__"))
      : [];

    const assets = existsSync(assetsDir)
      ? readdirSync(assetsDir).filter((f) => !f.startsWith("."))
      : [];

    return {
      name: metadata.name,
      path: resolvedPath,
      basePath: resolvedPath,
      metadata,
      content: body,
      references,
      scripts,
      assets,
    };
  } catch {
    return null;
  }
}

async function discoverSkillsFromDirAsync(skillsDir: string): Promise<SkillInfo[]> {
  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillInfo[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const skillPath = join(skillsDir, entry.name);

    if (entry.isDirectory() || entry.isSymbolicLink()) {
      const skillInfo = await parseSkillMd(skillPath);
      if (skillInfo) {
        skills.push(skillInfo);
      }
    }
  }

  return skills;
}

async function discoverSkills(): Promise<SkillInfo[]> {
  const userSkillsDir = join(homedir(), ".opencode", "skill");
  const projectSkillsDir = join(process.cwd(), ".opencode", "skill");

  // Discover from all three sources
  const builtinSkills = await discoverSkillsFromDirAsync(NPM_DEFAULTS_SKILL_DIR);
  const userSkills = await discoverSkillsFromDirAsync(userSkillsDir);
  const projectSkills = await discoverSkillsFromDirAsync(projectSkillsDir);

  // Project > User > Builtin (first occurrence wins via deduplication)
  return deduplicateSkills([...projectSkills, ...userSkills, ...builtinSkills]);
}

function findMatchingSkills(skills: SkillInfo[], query: string): SkillInfo[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(Boolean);

  return skills
    .map((skill) => {
      let score = 0;
      const nameLower = skill.metadata.name.toLowerCase();
      const descLower = skill.metadata.description.toLowerCase();

      if (nameLower === queryLower) score += 100;
      if (nameLower.includes(queryLower)) score += 50;

      for (const term of queryTerms) {
        if (nameLower.includes(term)) score += 20;
        if (descLower.includes(term)) score += 10;
      }

      return { skill, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ skill }) => skill);
}

async function loadSkillWithReferences(
  skill: SkillInfo,
  includeRefs: boolean
): Promise<LoadedSkill> {
  const referencesLoaded: Array<{ path: string; content: string }> = [];

  if (includeRefs && skill.references.length > 0) {
    for (const ref of skill.references) {
      const refPath = join(skill.path, "references", ref);
      try {
        const content = readFileSync(refPath, "utf-8");
        referencesLoaded.push({ path: ref, content });
      } catch {
        // Skip unreadable references
      }
    }
  }

  return {
    name: skill.name,
    metadata: skill.metadata,
    basePath: skill.basePath,
    body: skill.content,
    referencesLoaded,
  };
}

function formatSkillList(skills: SkillInfo[]): string {
  if (skills.length === 0) {
    return "No skills found in ~/.opencode/skill/";
  }

  const lines = ["# Available Skills\n"];

  for (const skill of skills) {
    lines.push(`- **${skill.metadata.name}**: ${skill.metadata.description || "(no description)"}`);
  }

  lines.push(`\n**Total**: ${skills.length} skills`);
  return lines.join("\n");
}

function formatLoadedSkills(loadedSkills: LoadedSkill[]): string {
  if (loadedSkills.length === 0) {
    return "No skills loaded.";
  }

  const skill = loadedSkills[0];
  const sections: string[] = [];

  sections.push(`Base directory for this skill: ${skill.basePath}/`);
  sections.push("");
  sections.push(skill.body.trim());

  if (skill.referencesLoaded.length > 0) {
    sections.push("\n---\n### Loaded References\n");
    for (const ref of skill.referencesLoaded) {
      sections.push(`#### ${ref.path}\n`);
      sections.push("```");
      sections.push(ref.content.trim());
      sections.push("```\n");
    }
  }

  sections.push(`\n---\n**Launched skill**: ${skill.metadata.name}`);

  return sections.join("\n");
}

export function createSkillTool(): ReturnType<typeof tool> {
  const availableSkills = discoverSkillsSync();
  const skillListForDescription = availableSkills
    .map((s) => `- ${s.name}: ${s.description} (${s.scope})`)
    .join("\n");

  return tool({
    description: `Execute a skill within the main conversation.

When you invoke a skill, the skill's prompt will expand and provide detailed instructions on how to complete the task.

Available Skills:
${skillListForDescription || "(No skills discovered yet)"}`,

    args: {
      skill: tool.schema
        .string()
        .describe(
          "The skill name or search query to find and load. Can be exact skill name (e.g., 'morning-boot') or keywords (e.g., 'morning', 'boot')."
        ),
    },

    async execute(args) {
      const skills = await discoverSkills();

      if (!args.skill) {
        return formatSkillList(skills) + "\n\nProvide a skill name to load.";
      }

      const matchingSkills = findMatchingSkills(skills, args.skill);

      if (matchingSkills.length === 0) {
        return (
          `No skills found matching "${args.skill}".\n\n` +
          formatSkillList(skills) +
          "\n\nTry a different skill name."
        );
      }

      const loadedSkills: LoadedSkill[] = [];

      for (const skillInfo of matchingSkills.slice(0, 3)) {
        const loaded = await loadSkillWithReferences(skillInfo, true);
        loadedSkills.push(loaded);
      }

      return formatLoadedSkills(loadedSkills);
    },
  });
}
