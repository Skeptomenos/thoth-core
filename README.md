# Thoth

> Life orchestration system and OpenCode plugin for managing work, personal life, and technical projects.

Thoth is a knowledge-based life operating system that acts as your chief of staff. Unlike traditional coding assistants, Thoth is designed to **support, guide, and mentor** — not just write code.

## Features

- **Four Hemispheres**: Organized knowledge across work, life, coding, and system (kernel)
- **Depth-Based Specialization**: Agent persona adapts based on where you are in the knowledge base
- **Smart Delegation**: Routes tasks to specialized sub-agents (Work Master, Life Master, Code Master)
- **Permission System**: Critical actions require explicit approval
- **Knowledge Persistence**: Learns and remembers across sessions

## Depth-Based Specialization

Thoth's personality and expertise change based on your current directory:

| Depth | Example | Persona |
|-------|---------|---------|
| 0 | `/thoth/` | Pure Chief of Staff |
| 1 | `/thoth/work/` | Executive COS (crisp, P0-focused) |
| 1 | `/thoth/life/` | Personal Consultant (warm, Socratic) |
| 2 | `/thoth/work/projects/` | Project Portfolio Manager |
| 3 | `/thoth/work/projects/x/` | Deep Expert on Project X |

See [Persona Building Guide](kernel/knowledge/persona-building.md) for details.

## Structure

```
thoth/
├── kernel/          # System config, memory, standards
├── work/            # Professional life
├── life/            # Personal life  
├── coding/          # Technical projects
└── src/             # OpenCode plugin source
```

## As an OpenCode Plugin

Thoth is also an [OpenCode](https://github.com/nichochar/opencode) plugin that provides:

- **Thoth Agent**: Primary orchestrator with depth-based specialization
- **Sub-Agents**: Work Master, Life Master, Code Master, Coach, Sentinel, Diplomat, Chronicler
- **Hooks**: Permission enforcement, trust tracking, context management
- **Skills**: Morning boot, evening close, thought routing, meeting processing

### Installation

```bash
# In your opencode config
{
  "plugins": ["path/to/thoth"]
}
```

### Building

```bash
npm install
npm run build
```

## Documentation

- [**Thoth User Guide**](kernel/knowledge/thoth-user-guide.md) - Comprehensive guide to capabilities, usage, and configuration
- [Vision](kernel/knowledge/vision.md) - Chief of Staff philosophy
- [Persona Building](kernel/knowledge/persona-building.md) - How depth-based specialization works
- [Plugin Architecture](kernel/knowledge/plugin-architecture.md) - Technical architecture

## Philosophy

Thoth operates on these principles:

1. **Chief of Staff, not servant** — Warm but professional, challenges when appropriate
2. **Context is king** — Retrieves relevant knowledge before acting
3. **Permission-aware** — Critical actions require approval
4. **Cross-domain synthesis** — Can connect insights across hemispheres
5. **Continuous learning** — Persists learnings to the knowledge base

## License

Private repository.
