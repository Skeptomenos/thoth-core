import { tool } from "@opencode-ai/plugin";
import { readFileSync } from "fs";
import { join } from "path";
import type { SkillRegistry } from "../../services/skill-registry";
import type { LoadedSkill } from "../../services/skill-registry";

function buildTriggerSection(skills: LoadedSkill[]): string {
  const skillsWithTriggers = skills.filter((s) => s.data.frontmatter.triggers && s.data.frontmatter.triggers.length > 0);
  
  if (skillsWithTriggers.length === 0) {
    return "";
  }

  const lines = [
    "\n\nSkill Triggers (invoke skill when user says these phrases):",
  ];

  for (const skill of skillsWithTriggers) {
    const triggers = skill.data.frontmatter.triggers.map((t) => `"${t}"`).join(", ");
    lines.push(`- ${triggers} → ${skill.name}`);
  }

  lines.push("\nIMPORTANT: If user intent matches a trigger phrase, invoke the skill immediately. Don't improvise.");

  return lines.join("\n");
}

function findMatchingSkills(skills: LoadedSkill[], query: string): LoadedSkill[] {
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(Boolean);

  return skills
    .map((skill) => {
      let score = 0;
      const nameLower = skill.name.toLowerCase();
      const descLower = skill.data.frontmatter.description.toLowerCase();

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

function formatSkillList(skills: LoadedSkill[]): string {
  if (skills.length === 0) {
    return "No skills found.";
  }

  const lines = ["# Available Skills\n"];

  for (const skill of skills) {
    lines.push(`- **${skill.name}**: ${skill.data.frontmatter.description || "(no description)"} (${skill.scope})`);
  }

  lines.push(`\n**Total**: ${skills.length} skills`);
  return lines.join("\n");
}

function formatLoadedSkill(skill: LoadedSkill): string {
  const sections: string[] = [];

  sections.push(`Base directory for this skill: ${skill.path}/`);
  sections.push("");
  sections.push(skill.data.content.trim());

  if (skill.extras && skill.extras.references.length > 0) {
    sections.push("\n---\n### Loaded References\n");
    for (const ref of skill.extras.references) {
      const refPath = join(skill.path, "references", ref);
      try {
        const content = readFileSync(refPath, "utf-8");
        sections.push(`#### ${ref}\n`);
        sections.push("```");
        sections.push(content.trim());
        sections.push("```\n");
      } catch {
        // Skip unreadable files silently to avoid cluttering output
      }
    }
  }

  sections.push(`\n---\n**Launched skill**: ${skill.name}`);

  return sections.join("\n");
}

export function createSkillTool(registry: SkillRegistry): ReturnType<typeof tool> {
  const availableSkills = registry.getAllSkills();
  const skillListForDescription = availableSkills
    .map((s) => `- ${s.name}: ${s.data.frontmatter.description} (${s.scope})`)
    .join("\n");
  const triggerSection = buildTriggerSection(availableSkills);

  return tool({
    description: `Execute a skill within the main conversation.

When you invoke a skill, the skill's prompt will expand and provide detailed instructions on how to complete the task.

Available Skills:
${skillListForDescription || "(No skills discovered yet)"}${triggerSection}`,

    args: {
      skill: tool.schema
        .string()
        .describe(
          "The skill name or search query to find and load. Can be exact skill name (e.g., 'morning-boot') or keywords (e.g., 'morning', 'boot')."
        ),
    },

    async execute(args) {
      if (!args.skill) {
        return formatSkillList(registry.getAllSkills()) + "\n\nProvide a skill name to load.";
      }

      await registry.loadSkills();
      const skills = registry.getAllSkills();

      const matchingSkills = findMatchingSkills(skills, args.skill);

      if (matchingSkills.length === 0) {
        return (
          `No skills found matching "${args.skill}".\n\n` +
          formatSkillList(skills) +
          "\n\nTry a different skill name."
        );
      }

      const loadedSkill = matchingSkills[0];
      return formatLoadedSkill(loadedSkill);
    },
  });
}
