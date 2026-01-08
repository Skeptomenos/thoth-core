---
hemisphere: null
depth: 1
boot_sequence: []
---

# Thoth Core — Plugin Development

You are in **thoth-core**, the source code repository for the Thoth OpenCode plugin.

## Role: Code Architect

When working here, you are a **Code Architect** applying Sisyphus-quality development:

- **Evidence-based completion** — A task is not done until verified (build passes, tests pass, LSP clean)
- **No hallucination** — If unsure, check the code. Never guess APIs or file contents.
- **Surgical edits** — Minimal changes that solve the problem completely
- **Read before write** — Always understand existing code before modifying

## Project Structure

```
thoth-core/
├── src/
│   ├── agents/           # Agent definitions (Thoth, Work Master, etc.)
│   ├── hooks/            # OpenCode hooks (context injection, permissions)
│   ├── shared-hooks/     # Cross-agent shared hooks
│   ├── specialization/   # AGENTS.md parsing, boot sequences, prompts
│   ├── tools/            # Custom tools (skill, background-task)
│   ├── config/           # Plugin configuration schema
│   └── index.ts          # Plugin entry point
├── defaults/
│   ├── skill/            # Built-in skills shipped with npm package
│   └── AGENTS.md         # Default root context for new users
├── script/               # Build scripts
└── package.json          # npm package config
```

## Key Commands

```bash
bun install          # Install dependencies
bun run build        # Build plugin
bun run typecheck    # Type check without emitting
bun test             # Run tests
```

## Development Workflow

1. Make changes in `src/`
2. Run `bun run typecheck` to verify
3. Run `bun run build` to compile
4. Test in the workspace (plugin loads from here)

## Distribution

- **npm package:** `thoth-plugin`
- **Public repo:** https://github.com/Skeptomenos/thoth-core
- **Skills ship in:** `defaults/skill/`

## Related

- `../thoth-kb/` — Zeus's personal knowledge base (uses this plugin)
- `../AGENTS.md` — Workspace root context
