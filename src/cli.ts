#!/usr/bin/env node
/**
 * Thoth CLI - Knowledge Base Management
 *
 * Usage:
 *   npx thoth-plugin init [path]
 *   npx thoth-plugin skill update [path]
 *   npx thoth-plugin skill list
 */

import {
  existsSync,
  mkdirSync,
  cpSync,
  writeFileSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NPM_DEFAULTS_PATH = join(__dirname, "defaults");

// ============================================================================
// Utilities
// ============================================================================

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function hashFile(filePath: string): string {
  if (!existsSync(filePath)) return "";
  const content = readFileSync(filePath, "utf-8");
  return createHash("md5").update(content).digest("hex");
}

function getSkillVersion(skillPath: string): string | null {
  const skillFile = join(skillPath, "SKILL.md");
  if (!existsSync(skillFile)) {
    // Try lowercase
    const altFile = join(skillPath, "skill.md");
    if (!existsSync(altFile)) return null;
    const content = readFileSync(altFile, "utf-8");
    const match = content.match(/Skill Generator v([\d.]+)/);
    return match ? match[1] : "1.0";
  }
  const content = readFileSync(skillFile, "utf-8");
  const match = content.match(/v([\d.]+)/);
  return match ? match[1] : "1.0";
}

function countLines(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  return readFileSync(filePath, "utf-8").split("\n").length;
}

// ============================================================================
// README Template
// ============================================================================

const README_TEMPLATE = `# Thoth Knowledge Base

Welcome to your personal Thoth knowledge base - your AI chief of staff for life orchestration.

## Structure

| Hemisphere | Purpose |
|------------|---------|
| \`work/\` | Professional life - projects, colleagues, career |
| \`life/\` | Personal life - health, relationships, home, finance |
| \`coding/\` | Technical projects and development |
| \`kernel/\` | System configuration and preferences |

## Getting Started

1. Start OpenCode in this directory:
   \`\`\`bash
   cd ${process.argv[3] || "~/thoth"}
   opencode
   \`\`\`

2. Ask Thoth to help you onboard:
   \`\`\`
   Help me set up my knowledge base
   \`\`\`

3. Or run the onboarding skill:
   \`\`\`
   /system-init
   \`\`\`

## Available Skills

Run these skills to automate common workflows:

| Skill | Description |
|-------|-------------|
| \`/morning-boot\` | Start your day with inbox triage and calendar review |
| \`/evening-close\` | End-of-day summary and overflow extraction |
| \`/mail-triage\` | Process Gmail inbox systematically |
| \`/slack-pulse\` | Scan Slack for mentions and important messages |
| \`/thought-router\` | Quick capture and route thoughts |
| \`/post-meeting-drill\` | Process meeting notes into action items |

## Configuration

Configure Thoth in \`.opencode/thoth-plugin.json\`:

\`\`\`json
{
  "knowledge_base": "${process.argv[3] || "~/thoth"}"
}
\`\`\`

## Learn More

- Ask: "What can you help me with?"
- Ask: "Explain how Thoth works"
- Ask: "What skills are available?"
`;

// ============================================================================
// Init Command
// ============================================================================

function copyDefaultSkills(targetSkillDir: string): void {
  const sourceSkillDir = join(NPM_DEFAULTS_PATH, "skill");

  if (!existsSync(sourceSkillDir)) {
    console.log("  (No default skills found in package)");
    return;
  }

  const skills = readdirSync(sourceSkillDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const skill of skills) {
    const source = join(sourceSkillDir, skill);
    const target = join(targetSkillDir, skill);
    cpSync(source, target, { recursive: true });
  }

  console.log(`  Copied ${skills.length} default skills`);
}

function init(targetPath?: string): void {
  const targetDir = targetPath || join(homedir(), "thoth");

  if (existsSync(targetDir)) {
    console.log(`\nError: Directory already exists: ${targetDir}`);
    console.log("Use a different path or remove the existing directory.");
    console.log("\nExample:");
    console.log(`  npx thoth-plugin init ~/my-thoth`);
    process.exit(1);
  }

  console.log(`\nCreating Thoth knowledge base at: ${targetDir}\n`);

  // Create directory structure
  const dirs = [
    // Work hemisphere
    "work/projects",
    "work/people",
    "work/inbox",
    "work/logs",
    // Life hemisphere
    "life/inbox",
    "life/health",
    "life/relationships",
    "life/finances",
    // Coding hemisphere
    "coding/projects",
    "coding/references",
    // Kernel hemisphere
    "kernel/config",
    "kernel/templates",
    "kernel/memory",
    "kernel/Personas",
    // OpenCode config
    ".opencode/skill",
  ];

  for (const dir of dirs) {
    mkdirSync(join(targetDir, dir), { recursive: true });
  }
  console.log("  Created directory structure");

  // Copy default AGENTS.md if available
  const defaultAgentsMd = join(NPM_DEFAULTS_PATH, "AGENTS.md");
  if (existsSync(defaultAgentsMd)) {
    cpSync(defaultAgentsMd, join(targetDir, "AGENTS.md"));
    console.log("  Copied root AGENTS.md");
  }

  // Copy default skills
  copyDefaultSkills(join(targetDir, ".opencode", "skill"));

  // Create README
  writeFileSync(join(targetDir, "README.md"), README_TEMPLATE);
  console.log("  Created README.md");

  // Create minimal config files
  writeFileSync(
    join(targetDir, "kernel", "config", "preferences.md"),
    `---
type: config
hemisphere: kernel
created: ${new Date().toISOString().split("T")[0]}
updated: ${new Date().toISOString().split("T")[0]}
---

# Preferences

Your personal preferences for Thoth.

## Communication Style

- Default: balanced (not too verbose, not too terse)

## Timezone

- Default: auto-detect

## Work Hours

- Default: 9:00 - 18:00

---

*Edit this file to customize Thoth's behavior.*
`
  );
  console.log("  Created kernel/config/preferences.md");

  // Create registry files for each hemisphere
  const hemispheres = ["work", "life", "coding", "kernel"];
  for (const hemi of hemispheres) {
    writeFileSync(
      join(targetDir, hemi, "registry.md"),
      `---
type: registry
hemisphere: ${hemi}
created: ${new Date().toISOString().split("T")[0]}
updated: ${new Date().toISOString().split("T")[0]}
---

# ${hemi.charAt(0).toUpperCase() + hemi.slice(1)} Registry

Index of all knowledge in the ${hemi} hemisphere.

## Contents

*This registry will be populated as you add knowledge.*
`
    );
  }
  console.log("  Created hemisphere registries");

  console.log("\n✓ Knowledge base created!\n");
  console.log("Next steps:");
  console.log(`  1. cd ${targetDir}`);
  console.log("  2. opencode");
  console.log('  3. Ask: "Help me onboard"\n');
}

// ============================================================================
// Skill Commands
// ============================================================================

interface SkillComparison {
  name: string;
  status: "identical" | "local-newer" | "package-newer" | "local-only" | "package-only";
  localLines?: number;
  packageLines?: number;
  localHash?: string;
  packageHash?: string;
}

function findKbPath(startPath?: string): string | null {
  // Try to find .opencode/skill directory
  const searchPaths = [
    startPath,
    process.cwd(),
    join(process.cwd(), ".."),
    join(homedir(), "thoth"),
  ].filter(Boolean) as string[];

  for (const basePath of searchPaths) {
    const skillPath = join(basePath, ".opencode", "skill");
    if (existsSync(skillPath)) {
      return basePath;
    }
  }
  return null;
}

function compareSkills(localSkillDir: string): SkillComparison[] {
  const packageSkillDir = join(NPM_DEFAULTS_PATH, "skill");
  const results: SkillComparison[] = [];

  if (!existsSync(packageSkillDir)) {
    console.log("Error: No skills found in package");
    return results;
  }

  // Get all skills from both locations
  const packageSkills = existsSync(packageSkillDir)
    ? readdirSync(packageSkillDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  const localSkills = existsSync(localSkillDir)
    ? readdirSync(localSkillDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  const allSkills = [...new Set([...packageSkills, ...localSkills])].sort();

  for (const skill of allSkills) {
    const localPath = join(localSkillDir, skill);
    const packagePath = join(packageSkillDir, skill);

    const localExists = existsSync(localPath);
    const packageExists = existsSync(packagePath);

    // Find the main skill file (SKILL.md or skill.md)
    const localFile = localExists
      ? existsSync(join(localPath, "SKILL.md"))
        ? join(localPath, "SKILL.md")
        : join(localPath, "skill.md")
      : "";
    const packageFile = packageExists
      ? existsSync(join(packagePath, "SKILL.md"))
        ? join(packagePath, "SKILL.md")
        : join(packagePath, "skill.md")
      : "";

    const localHash = localFile ? hashFile(localFile) : "";
    const packageHash = packageFile ? hashFile(packageFile) : "";

    const localLines = localFile ? countLines(localFile) : 0;
    const packageLines = packageFile ? countLines(packageFile) : 0;

    let status: SkillComparison["status"];

    if (!localExists && packageExists) {
      status = "package-only";
    } else if (localExists && !packageExists) {
      status = "local-only";
    } else if (localHash === packageHash) {
      status = "identical";
    } else if (localLines > packageLines) {
      status = "local-newer";
    } else {
      status = "package-newer";
    }

    results.push({
      name: skill,
      status,
      localLines: localLines || undefined,
      packageLines: packageLines || undefined,
      localHash: localHash || undefined,
      packageHash: packageHash || undefined,
    });
  }

  return results;
}

async function skillUpdate(kbPath?: string): Promise<void> {
  const basePath = findKbPath(kbPath);

  if (!basePath) {
    console.log("\nError: Could not find Thoth knowledge base.");
    console.log("Run this command from your knowledge base directory, or specify the path:");
    console.log("  npx thoth-plugin skill update ~/thoth\n");
    process.exit(1);
  }

  const localSkillDir = join(basePath, ".opencode", "skill");
  const packageSkillDir = join(NPM_DEFAULTS_PATH, "skill");

  console.log(`\nComparing skills in: ${localSkillDir}\n`);

  const comparisons = compareSkills(localSkillDir);

  // Group by status
  const identical = comparisons.filter((c) => c.status === "identical");
  const packageNewer = comparisons.filter((c) => c.status === "package-newer");
  const localNewer = comparisons.filter((c) => c.status === "local-newer");
  const packageOnly = comparisons.filter((c) => c.status === "package-only");
  const localOnly = comparisons.filter((c) => c.status === "local-only");

  // Display summary
  console.log("Skill Status Summary:");
  console.log("─".repeat(60));

  if (identical.length > 0) {
    console.log(`\n✓ Up to date (${identical.length}):`);
    identical.forEach((s) => console.log(`  ${s.name}`));
  }

  if (packageNewer.length > 0) {
    console.log(`\n↓ Updates available (${packageNewer.length}):`);
    packageNewer.forEach((s) =>
      console.log(`  ${s.name} (local: ${s.localLines} lines → package: ${s.packageLines} lines)`)
    );
  }

  if (localNewer.length > 0) {
    console.log(`\n↑ Local is more advanced (${localNewer.length}):`);
    localNewer.forEach((s) =>
      console.log(`  ${s.name} (local: ${s.localLines} lines vs package: ${s.packageLines} lines)`)
    );
  }

  if (packageOnly.length > 0) {
    console.log(`\n+ New skills available (${packageOnly.length}):`);
    packageOnly.forEach((s) => console.log(`  ${s.name}`));
  }

  if (localOnly.length > 0) {
    console.log(`\n○ Local only (${localOnly.length}):`);
    localOnly.forEach((s) => console.log(`  ${s.name}`));
  }

  console.log("\n" + "─".repeat(60));

  // Handle updates
  const toUpdate = [...packageNewer, ...packageOnly];

  if (toUpdate.length === 0) {
    console.log("\n✓ All skills are up to date!\n");
    return;
  }

  console.log(`\n${toUpdate.length} skill(s) can be updated.\n`);

  for (const skill of toUpdate) {
    const action = skill.status === "package-only" ? "install" : "update";
    const answer = await prompt(
      `${action === "install" ? "Install" : "Update"} ${skill.name}? [y/N/q] `
    );

    if (answer === "q") {
      console.log("\nAborted.\n");
      return;
    }

    if (answer === "y" || answer === "yes") {
      const source = join(packageSkillDir, skill.name);
      const target = join(localSkillDir, skill.name);
      cpSync(source, target, { recursive: true });
      console.log(`  ✓ ${skill.name} ${action}d`);
    } else {
      console.log(`  ○ ${skill.name} skipped`);
    }
  }

  // Offer to contribute local-newer skills
  if (localNewer.length > 0) {
    console.log("\n" + "─".repeat(60));
    console.log("\nYou have skills that are more advanced than the package.");
    console.log("Consider contributing them back to Thoth!\n");

    for (const skill of localNewer) {
      const answer = await prompt(
        `Would you like to contribute ${skill.name} back to Thoth? [y/N] `
      );

      if (answer === "y" || answer === "yes") {
        console.log(`\n  To contribute ${skill.name}:`);
        console.log(`  1. Fork https://github.com/davidhelmus/thoth-core`);
        console.log(`  2. Copy your skill to defaults/skill/${skill.name}/`);
        console.log(`  3. Open a Pull Request\n`);
      }
    }
  }

  console.log("\n✓ Done!\n");
}

function skillList(kbPath?: string): void {
  const basePath = findKbPath(kbPath);

  if (!basePath) {
    console.log("\nShowing skills from package only (no knowledge base found).\n");
  }

  const packageSkillDir = join(NPM_DEFAULTS_PATH, "skill");
  const localSkillDir = basePath ? join(basePath, ".opencode", "skill") : null;

  const packageSkills = existsSync(packageSkillDir)
    ? readdirSync(packageSkillDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  const localSkills = localSkillDir && existsSync(localSkillDir)
    ? readdirSync(localSkillDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  const allSkills = [...new Set([...packageSkills, ...localSkills])].sort();

  console.log("\nAvailable Skills:");
  console.log("─".repeat(40));

  for (const skill of allSkills) {
    const inPackage = packageSkills.includes(skill);
    const inLocal = localSkills.includes(skill);

    let status = "";
    if (inPackage && inLocal) status = "✓";
    else if (inLocal) status = "○ (local only)";
    else status = "+ (available)";

    console.log(`  ${status} ${skill}`);
  }

  console.log("\n");
}

// ============================================================================
// Help
// ============================================================================

function showHelp(): void {
  console.log(`
Thoth - Life Orchestrator for OpenCode

Usage:
  npx thoth-plugin <command> [options]

Commands:
  init [path]           Create a new knowledge base (default: ~/thoth)
  skill update [path]   Update skills from the latest package
  skill list            List available skills

Examples:
  npx thoth-plugin init                # Create at ~/thoth
  npx thoth-plugin init ~/my-thoth     # Create at custom path
  npx thoth-plugin skill update        # Update skills in current KB
  npx thoth-plugin skill list          # List all available skills

Learn more: https://github.com/davidhelmus/thoth-core
`);
}

// ============================================================================
// Main
// ============================================================================

const command = process.argv[2];
const subcommand = process.argv[3];

switch (command) {
  case "init":
    init(process.argv[3]);
    break;
  case "skill":
    switch (subcommand) {
      case "update":
        skillUpdate(process.argv[4]);
        break;
      case "list":
        skillList(process.argv[4]);
        break;
      default:
        console.log(`\nUnknown skill command: ${subcommand}`);
        console.log("Available: skill update, skill list\n");
        process.exit(1);
    }
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    showHelp();
    if (command && command !== "help") {
      console.log(`Unknown command: ${command}\n`);
      process.exit(1);
    }
}
