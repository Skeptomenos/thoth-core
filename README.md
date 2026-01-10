# Thoth

> Life orchestration system and OpenCode plugin for managing work, personal life, and technical projects.

Thoth is a knowledge-based life operating system that acts as your chief of staff. Unlike traditional coding assistants, Thoth is designed to **support, guide, and mentor** — not just write code.

---

## Ecosystem Integration

Thoth is the convergence of multiple OpenCode innovations. It is built upon and integrates with:

- **[OpenCode](https://github.com/opencode-ai/opencode)**: The foundational AI plugin architecture.
- **[OhMyOpenCode](https://github.com/code-yeongyu/oh-my-opencode)**: The "batteries-included" framework that inspired Thoth's distribution model.
- **[Personal-OS](https://github.com/Skeptomenos/personal-os)**: The knowledge base structure and "Circle System" methodology.
- **[OpenProse](https://github.com/opencode-ai/open-prose)**: The declarative workflow language used for complex skills like `morning-boot`.
- **[Vibe-Kanban](https://github.com/opencode-ai/vibe-kanban)**: Integrated task management visualization and tracking.

Thoth acts as the **Root Orchestrator**, coordinating these tools into a unified "Operating System for Life".

---

## Installation

### Via npm (Recommended)

```bash
npm install -g thoth-plugin
```

Then add to your OpenCode config (`~/.config/opencode/opencode.json`):

```json
{
  "plugin": [
    "thoth-plugin"
  ]
}
```

### Initialize Your Knowledge Base

```bash
# Create a new knowledge base with default structure
npx thoth-plugin init

# Or initialize in a specific directory
npx thoth-plugin init ./my-thoth-kb
```

### Configure Knowledge Base Path

Create `~/.config/opencode/thoth-plugin.json`:

```json
{
  "enabled": true,
  "knowledge_base": "/path/to/your/thoth-kb"
}
```

---

## LLM Installation Instructions

<!-- 
INSTRUCTIONS FOR AI ASSISTANTS:

When a user asks you to "install Thoth plugin" or provides a link to this repository,
follow these steps:

1. Install the plugin globally:
   npm install -g thoth-plugin

2. Add to OpenCode config (~/.config/opencode/opencode.json):
   - Read the existing config file
   - Add "thoth-plugin" to the "plugin" array
   - If "plugin" array doesn't exist, create it

3. Initialize the knowledge base:
   npx thoth-plugin init ~/thoth-kb

4. Configure the knowledge base path (~/.config/opencode/thoth-plugin.json):
   {
     "enabled": true,
     "knowledge_base": "/Users/<username>/thoth-kb"
   }

5. Restart OpenCode to load the plugin

EXAMPLE COMMANDS:
```bash
# Install
npm install -g thoth-plugin

# Add to OpenCode config
# Edit ~/.config/opencode/opencode.json and add "thoth-plugin" to plugin array

# Initialize knowledge base
npx thoth-plugin init ~/thoth-kb

# Create thoth config
echo '{"enabled": true, "knowledge_base": "'$HOME'/thoth-kb"}' > ~/.config/opencode/thoth-plugin.json

# Restart OpenCode
```
-->

If you're an AI assistant helping a user install Thoth, see the HTML comment above for step-by-step instructions.

---

## Features

- **Four Hemispheres**: Organized knowledge across work, life, coding, and system (kernel)
- **Depth-Based Specialization**: Agent persona adapts based on where you are in the knowledge base
- **Smart Delegation**: Routes tasks to specialized sub-agents (Work Master, Life Master, Code Master)
- **Permission System**: Critical actions require explicit approval
- **Knowledge Persistence**: Learns and remembers across sessions
- **Skill System**: Automatic skill triggers for common workflows (morning boot, email triage, etc.)

## Depth-Based Specialization

Thoth's personality and expertise change based on your current directory:

| Depth | Example | Persona |
|-------|---------|---------|
| 0 | `/thoth-kb/` | Pure Chief of Staff |
| 1 | `/thoth-kb/work/` | Executive COS (crisp, P0-focused) |
| 1 | `/thoth-kb/life/` | Personal Consultant (warm, Socratic) |
| 2 | `/thoth-kb/work/projects/` | Project Portfolio Manager |
| 3 | `/thoth-kb/work/projects/x/` | Deep Expert on Project X |

## Structure

```
thoth-kb/                    # Your knowledge base
├── kernel/                  # System config, memory, standards
├── work/                    # Professional life
├── life/                    # Personal life  
├── coding/                  # Technical projects
└── .opencode/skill/         # Custom skills
```

## Skills

Thoth includes built-in skills that trigger automatically based on your intent:

| Trigger Phrases | Skill |
|-----------------|-------|
| "start my day", "morning routine", "prepare me for the day" | morning-boot |
| "end of day", "wrap up", "evening summary" | evening-close |
| "check my email", "email triage" | mail-triage |
| "process meeting notes", "drill meeting" | post-meeting-drill |
| "check slack", "slack mentions" | slack-pulse |
| "brain dump", "capture this" | thought-router |
| "draft an email", "write email to" | email-draft |

### Managing Skills

```bash
# List all available skills
npx thoth-plugin skill list

# Update skills to latest version (interactive)
npx thoth-plugin skill update
```

The `skill update` command:
- Compares your local skills with the latest package
- Shows what's new, updated, or locally modified
- Prompts for confirmation before each update
- Offers to help you contribute back if your local version is more advanced

### Skill Distribution Architecture

```
thoth-core (this repo)              thoth-kb (your knowledge base)
├── defaults/skill/        ──────>  ├── .opencode/skill/
│   ├── skill-generator/    copy    │   ├── skill-generator/
│   ├── email-draft/        on      │   ├── email-draft/
│   ├── morning-boot/       init    │   ├── morning-boot/
│   └── ...                 or      │   └── my-local-skill/
└── src/cli.ts              update  └── ...
```

**Key principles:**
- **Source of truth**: `thoth-core/defaults/skill/` is canonical
- **All skills are public**: Personalization via knowledge base files, not skill forks
- **Distribution via npm**: Skills ship with the package
- **Contribute back**: Local improvements can be PR'd to thoth-core

### Creating Skills

Skills follow a TDD-inspired process (RED-GREEN-REFACTOR):

1. **RED**: Test baseline behavior without the skill (using subagent)
2. **GREEN**: Write minimal skill that fixes the failure
3. **REFACTOR**: Close loopholes, add to rationalization table

Use the `skill-generator` skill:
```
/skill-generator
```

Skills follow a modular architecture with three components:

```
skill-name/
├── SKILL.md              # Workflow logic (required)
├── skill-name-template.md   # Output template (optional)
└── skill-name.prose      # OpenProse orchestration (optional)
```

Skills are defined with YAML frontmatter:

```yaml
---
name: my-skill
description: Use when [specific triggers]. Third person.
triggers:
  - phrase that activates this skill
  - another trigger phrase
template: my-skill-template.md    # Optional output template
created: 2026-01-01
updated: 2026-01-01
---

# My Skill

**Core principle:** One sentence summary.

## When to Use
- Trigger condition 1
- Trigger condition 2

## Quick Reference
| Task | Action |
|------|--------|

## Common Mistakes
| Mistake | Prevention |
|---------|------------|
```

The `triggers` field enables automatic skill invocation when the user's message matches.

See `docs/concepts/skill-architecture.md` for the full architecture specification.

## Sub-Agents

Thoth delegates to specialized agents:

| Agent | Role |
|-------|------|
| Work Master | Professional life orchestrator |
| Life Master | Personal life orchestrator |
| Code Master | Technical projects (Sisyphus-quality code) |
| Coach | Reflection and thinking partner |
| Sentinel | Proactive monitoring |
| Diplomat | Communication drafting |
| Chronicler | Meeting and event processing |

## Configuration

### Global Config

`~/.config/opencode/thoth-plugin.json`:

```json
{
  "enabled": true,
  "knowledge_base": "/path/to/your/thoth-kb"
}
```

### Local Override

`.opencode/thoth-plugin.json` in any workspace:

```json
{
  "knowledge_base": "./relative/path/to/kb"
}
```

## Development

### Building from Source

```bash
git clone https://github.com/Skeptomenos/thoth-core.git
cd thoth-core
bun install
bun run build
```

### Development Workflow

1. Edit source in `src/`
2. Build: `bun run build`
3. Test locally: Add absolute path to OpenCode config
4. Publish: `npm version patch && npm publish`

## Philosophy

Thoth operates on these principles:

1. **Chief of Staff, not servant** — Warm but professional, challenges when appropriate
2. **Context is king** — Retrieves relevant knowledge before acting
3. **Permission-aware** — Critical actions require approval
4. **Cross-domain synthesis** — Can connect insights across hemispheres
5. **Continuous learning** — Persists learnings to the knowledge base

## Links

- **npm**: https://www.npmjs.com/package/thoth-plugin
- **GitHub**: https://github.com/Skeptomenos/thoth-core

## License

MIT
