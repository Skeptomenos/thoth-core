#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

const KNOWLEDGE_BASE_TEMPLATE = `
# Thoth Knowledge Base

Welcome to your personal Thoth knowledge base.

## Structure

- **work/** - Professional life (projects, people, logs)
- **life/** - Personal life (health, finance, home)
- **coding/** - Technical projects and inventory
- **kernel/** - System configuration and agents

## Operating Modes

Thoth adapts based on where you start the session:

- **Root Mode**: \`cd ~/thoth\`
  - Generic orchestrator, routing, system maintenance.
- **Work Mode**: \`cd ~/thoth/work\`
  - Professional Chief of Staff. P0 focus. Deep work context.
- **Life Mode**: \`cd ~/thoth/life\`
  - Personal consultant. Health, finance, relationships.
- **Code Mode**: \`cd ~/thoth/coding\`
  - Technical architect. Codebase analysis.

## Getting Started

1. Start OpenCode in the desired context:
   \`cd ~/thoth && opencode\`

2. Ask Thoth: "Help me onboard"
`;

function init() {
  const targetDir = process.argv[3] || join(homedir(), "thoth");
  
  if (existsSync(targetDir)) {
    console.log(`Directory already exists: ${targetDir}`);
    console.log("Use a different path or remove existing directory.");
    process.exit(1);
  }
  
  console.log(`Creating Thoth knowledge base at: ${targetDir}`);
  
  try {
    mkdirSync(join(targetDir, "work", "projects"), { recursive: true });
    mkdirSync(join(targetDir, "work", "people"), { recursive: true });
    mkdirSync(join(targetDir, "work", "inbox"), { recursive: true });
    mkdirSync(join(targetDir, "work", "logs"), { recursive: true });
    
    mkdirSync(join(targetDir, "life", "inbox"), { recursive: true });
    mkdirSync(join(targetDir, "life", "areas"), { recursive: true });
    
    mkdirSync(join(targetDir, "coding", "projects"), { recursive: true });
    mkdirSync(join(targetDir, "coding", "inbox"), { recursive: true });
    
    mkdirSync(join(targetDir, "kernel", "config"), { recursive: true });
    mkdirSync(join(targetDir, "kernel", "templates"), { recursive: true });
    mkdirSync(join(targetDir, "kernel", "Agents"), { recursive: true });

    let npmDefaultsPath = resolve(__dirname, "..", "defaults");
    
    if (!existsSync(npmDefaultsPath)) {
        npmDefaultsPath = resolve(__dirname, "..", "..", "defaults");
    }

    if (existsSync(npmDefaultsPath)) {
      console.log("Copying default skills and agents...");
      const skillDest = join(targetDir, ".opencode", "skill");
      mkdirSync(skillDest, { recursive: true });
      cpSync(join(npmDefaultsPath, "skill"), skillDest, { recursive: true });
      
      const agentsSrc = join(npmDefaultsPath, "AGENTS.md");
      if (existsSync(agentsSrc)) {
          cpSync(agentsSrc, join(targetDir, "AGENTS.md"));
      }
    } else {
        console.warn("Warning: Could not find defaults directory. Skills will not be pre-populated.");
    }
    
    writeFileSync(join(targetDir, "README.md"), KNOWLEDGE_BASE_TEMPLATE.trim());
    
    console.log("✓ Knowledge base created!");
    console.log("");
    console.log("Next steps:");
    console.log(`1. cd ${targetDir}`);
    console.log("2. Start OpenCode");
    console.log("3. Ask Thoth: 'Help me onboard'");
    
  } catch (err) {
      console.error("Failed to initialize knowledge base:", err);
      process.exit(1);
  }
}

const command = process.argv[2];

if (command === "init") {
  init();
} else {
  console.log("Thoth - Life Orchestrator for OpenCode");
  console.log("");
  console.log("Commands:");
  console.log("  thoth init [path]  Create knowledge base (default: ~/thoth)");
}
