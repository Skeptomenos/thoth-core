#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { SkillSchema } from "../src/schemas/skill";

const SKILLS_DIR = process.argv[2] || "defaults/skill";

console.log(`Linting skills in: ${SKILLS_DIR}`);

if (!existsSync(SKILLS_DIR)) {
  console.error(`Error: Skills directory not found: ${SKILLS_DIR}`);
  process.exit(1);
}

const skills = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith(".") && !d.name.startsWith("_"))
  .map((d) => d.name);

let hasErrors = false;

for (const skill of skills) {
  const skillPath = join(SKILLS_DIR, skill);
  const skillFile = join(skillPath, "SKILL.md");

  if (!existsSync(skillFile)) {
    console.warn(`⚠️  ${skill}: Missing SKILL.md`);
    continue;
  }

  try {
    const content = readFileSync(skillFile, "utf-8");
    const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/);
    
    if (!frontmatterMatch) {
      console.error(`❌ ${skill}: Missing or invalid frontmatter`);
      hasErrors = true;
      continue;
    }

    const frontmatter = parse(frontmatterMatch[1]);
    const promptContent = content.replace(frontmatterMatch[0], "").trim();

    const result = SkillSchema.safeParse({
      path: skillPath,
      frontmatter,
      content: promptContent,
    });

    if (!result.success) {
      console.error(`❌ ${skill}: Validation failed`);
      result.error.issues.forEach((err) => {
        console.error(`   - ${err.path.join(".")}: ${err.message}`);
      });
      hasErrors = true;
    } else {
      console.log(`✓ ${skill}: Valid`);
    }
  } catch (err) {
    console.error(`❌ ${skill}: Parse error - ${err}`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.log("\n❌ Linting failed");
  process.exit(1);
} else {
  console.log("\n✅ All skills valid");
}
