# Thoth Plugin Development

## Architecture

```
/Users/davidhelmus/Repos/thoth/
├── AGENTS.md                    # Workspace router
├── .opencode/
│   └── thoth-plugin.json        # Local KB path override
├── thoth-core/                  # Plugin source (this repo)
│   ├── src/                     # TypeScript source
│   ├── dist/                    # Compiled output
│   ├── defaults/                # Built-in skills & AGENTS.md
│   └── package.json             # npm package config
└── thoth-kb/                    # Personal knowledge base
    ├── work/                    # Work hemisphere
    ├── life/                    # Life hemisphere
    ├── coding/                  # Coding hemisphere
    ├── kernel/                  # System hemisphere
    └── .opencode/skill/         # Custom skills
```

## Configuration

### Global Config
`~/.config/opencode/opencode.json`:
```json
{
  "plugin": [
    "thoth-plugin",
    // ... other plugins
  ]
}
```

### Global Thoth Config
`~/.config/opencode/thoth-plugin.json`:
```json
{
  "enabled": true,
  "knowledge_base": "/Users/davidhelmus/Repos/thoth/thoth-kb"
}
```

### Local Override (optional)
`.opencode/thoth-plugin.json` in any workspace:
```json
{
  "knowledge_base": "./thoth-kb"
}
```

## Development Workflow

### 1. Make Changes
```bash
cd ~/Repos/thoth/thoth-core
# Edit files in src/
```

### 2. Build
```bash
bun run build
```

### 3. Test Locally (optional)
For local testing before publish, temporarily change `~/.config/opencode/opencode.json`:
```json
"plugin": ["/Users/davidhelmus/Repos/thoth/thoth-core"]
```

### 4. Publish
```bash
npm version patch  # or minor/major
npm publish
```

### 5. Test Published Version
Revert config to use npm package:
```json
"plugin": ["thoth-plugin"]
```
Start new OpenCode session to pick up the update.

### 6. Commit & Push
```bash
git add -A
git commit -m "description of changes"
git push
```

## Repositories

| Repo | URL | Purpose |
|------|-----|---------|
| thoth-core | https://github.com/Skeptomenos/thoth-core | Plugin source (public) |
| thoth-private | https://github.com/Skeptomenos/thoth-private | Knowledge base (private) |
| npm | https://www.npmjs.com/package/thoth-plugin | Published package |

## Key Files

### Source Files
- `src/index.ts` - Plugin entry point
- `src/tools/skill/` - Skill system tools
- `src/specialization/` - Agent specialization (boot sequences, personas)

### Distribution Files
- `defaults/AGENTS.md` - Default root agent prompt
- `defaults/skills/*.md` - Built-in skills
- `dist/` - Compiled JavaScript (generated)

## Skill Resolution Order

1. `.opencode/skill/` in current workspace
2. `.opencode/skill/` in knowledge base
3. `defaults/skills/` in npm package

## CLI Commands

```bash
# Initialize a new project with Thoth structure
npx thoth-plugin init

# This creates:
# - .opencode/skill/ directory
# - AGENTS.md with Thoth prompt
```

## Version History

| Version | Changes |
|---------|---------|
| 1.1.0 | npm distribution, defaults folder, CLI init |
| 1.0.x | Initial development |
