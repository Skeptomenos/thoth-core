import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import { parse } from "yaml";
import { SkillSchema, type Skill } from "../schemas/skill";
import { log } from "../shared";

export type SkillScope = "user" | "project" | "builtin";

export interface LoadedSkill {
  name: string;
  scope: SkillScope;
  path: string;
  data: Skill;
  extras: {
    references: string[];
    scripts: string[];
    assets: string[];
  };
}

export class SkillRegistry {
  private skills = new Map<string, LoadedSkill>();
  private readonly npmDefaultsPath: string;

  constructor() {
    this.npmDefaultsPath = resolve(__dirname, "..", "..", "defaults", "skill");
    
    if (!existsSync(this.npmDefaultsPath)) {
      this.npmDefaultsPath = resolve(process.cwd(), "defaults", "skill");
    }
  }

  async loadSkills(): Promise<void> {
    this.skills.clear();

    this.discoverSkills(this.npmDefaultsPath, "builtin");

    const userSkillsDir = join(homedir(), ".opencode", "skill");
    this.discoverSkills(userSkillsDir, "user");

    const projectSkillsDir = join(process.cwd(), ".opencode", "skill");
    this.discoverSkills(projectSkillsDir, "project");

    log(`SkillRegistry loaded ${this.skills.size} skills`);
  }

  getSkill(name: string): LoadedSkill | undefined {
    return this.skills.get(name);
  }

  getAllSkills(): LoadedSkill[] {
    return Array.from(this.skills.values());
  }

  private discoverSkills(directory: string, scope: SkillScope) {
    if (!existsSync(directory)) return;

    try {
      const entries = readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip hidden and underscore-prefixed entries
        if (entry.name.startsWith(".") || entry.name.startsWith("_")) {
          continue;
        }
        
        // Handle both directories and symlinks to directories
        const isDir = entry.isDirectory() || entry.isSymbolicLink();
        if (!isDir) {
          continue;
        }

        const skillPath = join(directory, entry.name);
        const skillFile = join(skillPath, "SKILL.md");

        if (existsSync(skillFile)) {
          this.loadSingleSkill(entry.name, skillPath, skillFile, scope);
        }
      }
    } catch (err) {
      log(`Failed to discover skills in ${directory}: ${err}`);
    }
  }

  private loadSingleSkill(name: string, dirPath: string, filePath: string, scope: SkillScope) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
      
      if (!frontmatterMatch) {
        log(`Skipping invalid skill ${name}: missing frontmatter`);
        return;
      }

      const frontmatter = parse(frontmatterMatch[1]);
      const promptContent = content.replace(frontmatterMatch[0], "").trim();

      const result = SkillSchema.safeParse({
        path: dirPath,
        frontmatter,
        content: promptContent,
      });

      if (result.success) {
        const referencesDir = join(dirPath, "references");
        const scriptsDir = join(dirPath, "scripts");
        const assetsDir = join(dirPath, "assets");

        const references = existsSync(referencesDir)
          ? readdirSync(referencesDir).filter((f) => !f.startsWith("."))
          : [];

        const scripts = existsSync(scriptsDir)
          ? readdirSync(scriptsDir).filter((f) => !f.startsWith(".") && !f.startsWith("__"))
          : [];

        const assets = existsSync(assetsDir)
          ? readdirSync(assetsDir).filter((f) => !f.startsWith("."))
          : [];

        this.skills.set(name, {
          name,
          scope,
          path: dirPath,
          data: result.data,
          extras: { references, scripts, assets },
        });
      } else {
        log(`Skipping invalid skill ${name}: schema validation failed`);
      }
    } catch (err) {
      log(`Error loading skill ${name}: ${err}`);
    }
  }
}
