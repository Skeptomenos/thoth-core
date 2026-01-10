#!/usr/bin/env node
import { existsSync, mkdirSync, cpSync, writeFileSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { homedir } from "node:os";

// Config file paths
const GLOBAL_CONFIG_DIR = join(homedir(), ".config", "opencode");
const GLOBAL_CONFIG_PATH = join(GLOBAL_CONFIG_DIR, "thoth.json");

// Get timezone from system
function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

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
    
    // Create .thoth-root marker file
    writeFileSync(join(targetDir, ".thoth-root"), "# Thoth Knowledge Base Root Marker\n# This file helps context-discovery locate the KB\n");
    
    // Create project marker (.opencode/thoth.json)
    const projectConfig = {
      type: "thoth-kb",
      version: "1.0",
      hemispheres: ["kernel", "work", "life"],
      created: new Date().toISOString().split("T")[0]
    };
    mkdirSync(join(targetDir, ".opencode"), { recursive: true });
    writeFileSync(
      join(targetDir, ".opencode", "thoth.json"), 
      JSON.stringify(projectConfig, null, 2) + "\n"
    );
    
    // Create global config (~/.config/opencode/thoth.json)
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    const globalConfig = {
      kb_root: targetDir,
      default_hemisphere: "work",
      timezone: getSystemTimezone(),
      created: new Date().toISOString().split("T")[0],
      version: "1.0"
    };
    writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(globalConfig, null, 2) + "\n");
    console.log(`✓ Global config created: ${GLOBAL_CONFIG_PATH}`);
    
    console.log("✓ Knowledge base created!");
    console.log("");
    console.log("Created:");
    console.log(`  - KB root: ${targetDir}`);
    console.log(`  - Global config: ${GLOBAL_CONFIG_PATH}`);
    console.log(`  - Project marker: ${join(targetDir, ".opencode", "thoth.json")}`);
    console.log("");
    console.log("Next steps:");
    console.log(`1. cd ${targetDir}`);
    console.log("2. Start OpenCode");
    console.log("3. Run '/morning-boot' to start your day");
    console.log("");
    console.log("Note: First run will prompt for Google OAuth to access email/calendar.");
    
  } catch (err) {
      console.error("Failed to initialize knowledge base:", err);
      process.exit(1);
  }
}

function link() {
  // Link current directory as a thoth-kb
  const targetDir = resolve(process.cwd());
  
  // Check if this looks like a thoth-kb
  const hasKernel = existsSync(join(targetDir, "kernel"));
  const hasWork = existsSync(join(targetDir, "work"));
  const hasLife = existsSync(join(targetDir, "life"));
  
  if (!hasKernel && !hasWork && !hasLife) {
    console.log("Warning: Current directory doesn't look like a Thoth KB.");
    console.log("Expected directories: kernel/, work/, or life/");
    console.log("");
    console.log("Continue anyway? This will create config files pointing to this directory.");
    console.log("(Run 'thoth init' to create a new KB instead)");
    console.log("");
  }
  
  try {
    // Create project marker if it doesn't exist
    const projectConfigPath = join(targetDir, ".opencode", "thoth.json");
    if (!existsSync(projectConfigPath)) {
      const projectConfig = {
        type: "thoth-kb",
        version: "1.0",
        hemispheres: ["kernel", "work", "life"].filter(h => existsSync(join(targetDir, h))),
        created: new Date().toISOString().split("T")[0]
      };
      mkdirSync(join(targetDir, ".opencode"), { recursive: true });
      writeFileSync(projectConfigPath, JSON.stringify(projectConfig, null, 2) + "\n");
      console.log(`✓ Project marker created: ${projectConfigPath}`);
    } else {
      console.log(`✓ Project marker exists: ${projectConfigPath}`);
    }
    
    // Create .thoth-root if it doesn't exist
    const markerPath = join(targetDir, ".thoth-root");
    if (!existsSync(markerPath)) {
      writeFileSync(markerPath, "# Thoth Knowledge Base Root Marker\n");
      console.log(`✓ Root marker created: ${markerPath}`);
    }
    
    // Create/update global config
    mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true });
    
    let globalConfig: Record<string, unknown> = {};
    if (existsSync(GLOBAL_CONFIG_PATH)) {
      try {
        globalConfig = JSON.parse(readFileSync(GLOBAL_CONFIG_PATH, "utf-8"));
      } catch {
        // Invalid JSON, start fresh
      }
    }
    
    globalConfig.kb_root = targetDir;
    globalConfig.default_hemisphere = globalConfig.default_hemisphere || "work";
    globalConfig.timezone = globalConfig.timezone || getSystemTimezone();
    globalConfig.updated = new Date().toISOString().split("T")[0];
    globalConfig.version = "1.0";
    
    writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(globalConfig, null, 2) + "\n");
    console.log(`✓ Global config updated: ${GLOBAL_CONFIG_PATH}`);
    
    console.log("");
    console.log(`Linked ${targetDir} as your Thoth KB.`);
    console.log("Context-discovery will now find this KB from any directory.");
    
  } catch (err) {
    console.error("Failed to link knowledge base:", err);
    process.exit(1);
  }
}

function status() {
  console.log("Thoth Configuration Status");
  console.log("===========================");
  console.log("");
  
  // Check global config
  if (existsSync(GLOBAL_CONFIG_PATH)) {
    try {
      const config = JSON.parse(readFileSync(GLOBAL_CONFIG_PATH, "utf-8"));
      console.log(`Global config: ${GLOBAL_CONFIG_PATH}`);
      console.log(`  kb_root: ${config.kb_root}`);
      console.log(`  timezone: ${config.timezone}`);
      console.log(`  default_hemisphere: ${config.default_hemisphere}`);
      
      // Check if kb_root exists
      if (config.kb_root && existsSync(config.kb_root)) {
        console.log(`  status: ✓ KB exists`);
        
        // Check for project marker
        const projectMarker = join(config.kb_root, ".opencode", "thoth.json");
        if (existsSync(projectMarker)) {
          console.log(`  project marker: ✓ exists`);
        } else {
          console.log(`  project marker: ✗ missing (run 'thoth link' from KB directory)`);
        }
      } else {
        console.log(`  status: ✗ KB not found at path`);
      }
    } catch {
      console.log(`Global config: ${GLOBAL_CONFIG_PATH} (invalid JSON)`);
    }
  } else {
    console.log("Global config: not found");
    console.log("  Run 'thoth init' to create a new KB, or");
    console.log("  Run 'thoth link' from an existing KB directory");
  }
}

const command = process.argv[2];

if (command === "init") {
  init();
} else if (command === "link") {
  link();
} else if (command === "status") {
  status();
} else {
  console.log("Thoth - Life Orchestrator for OpenCode");
  console.log("");
  console.log("Commands:");
  console.log("  thoth init [path]  Create new knowledge base (default: ~/thoth)");
  console.log("  thoth link         Link current directory as KB root");
  console.log("  thoth status       Show current configuration");
}
