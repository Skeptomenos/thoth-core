#!/usr/bin/env node
/**
 * Thoth CLI - Knowledge Base Initialization
 *
 * Usage:
 *   npx thoth-plugin init [path]
 *   thoth init [path]
 */

import { existsSync, mkdirSync, cpSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NPM_DEFAULTS_PATH = join(__dirname, "defaults");

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

function showHelp(): void {
  console.log(`
Thoth - Life Orchestrator for OpenCode

Usage:
  npx thoth-plugin <command> [options]

Commands:
  init [path]    Create a new knowledge base (default: ~/thoth)

Examples:
  npx thoth-plugin init              # Create at ~/thoth
  npx thoth-plugin init ~/my-thoth   # Create at custom path
  npx thoth-plugin init ./kb         # Create in current directory

Learn more: https://github.com/davidhelmus/thoth-core
`);
}

// Main
const command = process.argv[2];

switch (command) {
  case "init":
    init(process.argv[3]);
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
