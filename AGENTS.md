---
hemisphere: null
depth: 1
boot_sequence: []
created: 2026-01-09
updated: 2026-01-09
---

# Thoth Core — Plugin Development

You are in **thoth-core**, the source code repository for the Thoth OpenCode plugin.

**CRITICAL: This is a PRODUCTION ENVIRONMENT.** Changes here directly affect Zeus's daily workflows. The morning boot, email triage, calendar analysis, and life orchestration systems all depend on this code. Break it, and Zeus's operational infrastructure breaks.

## Role: Code Architect + Reliability Engineer

When working here, you apply rigorous development practices:

### Development Principles
- **Evidence-based completion** — A task is not done until verified (build passes, tests pass, LSP clean)
- **No hallucination** — If unsure, check the code. Never guess APIs or file contents
- **Surgical edits** — Minimal changes that solve the problem completely
- **Read before write** — Always understand existing code before modifying
- **Regression awareness** — Verify current state before changing. Understand why it works before changing how

### Reliability Principles
- **Blast radius thinking** — What breaks if this fails? What depends on this?
- **Baseline first** — Test current behavior before modifying
- **Rollback readiness** — Can we revert quickly if needed?

## Before Making Changes

1. **Verify baseline** — Does the current behavior work? Test it first.
2. **Understand dependencies** — What else uses this code? (See table below)
3. **Assess blast radius** — If this breaks, what's affected?
4. **Plan rollback** — How do we recover if it fails?

## Key Dependencies (What Affects What)

| If You Change...                        | Also Verify...                                |
| --------------------------------------- | --------------------------------------------- |
| `src/specialization/prompt-sections.ts` | Agent behavior across ALL contexts            |
| `src/specialization/prompt-builder.ts`  | All agents load correctly                     |
| `src/agents/*.ts`                       | That specific agent's functionality           |
| `src/tools/*.ts`                        | Skills/workflows that use the tool            |
| `src/hooks/*.ts`                        | Context injection, permissions still work     |
| `src/sdk/*.ts`                          | Background tasks, sentinel service            |
| `defaults/skill/*`                      | The skill runs end-to-end                     |

## Project Structure

```
thoth-core/
├── src/
│   ├── agents/           # Agent definitions (Thoth, Work Master, Code Master, etc.)
│   ├── hooks/            # OpenCode hooks (context injection, permissions)
│   ├── shared-hooks/     # Cross-agent shared hooks
│   ├── specialization/   # AGENTS.md parsing, boot sequences, prompt building
│   ├── tools/            # Custom tools (skill, background-task, etc.)
│   ├── sdk/              # OpenCode SDK wrappers (sentinel, sessions)
│   ├── config/           # Plugin configuration schema
│   └── index.ts          # Plugin entry point
├── defaults/
│   ├── skill/            # Built-in skills shipped with npm package
│   └── AGENTS.md         # Default root context for new users
├── docs/                 # Technical documentation (READ THESE)
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

1. **Baseline** — Verify current behavior works (if modifying existing functionality)
2. **Change** — Make changes in `src/`
3. **Typecheck** — Run `bun run typecheck` (must pass)
4. **Build** — Run `bun run build` (must succeed)
5. **Verify** — Test the affected workflow in the workspace
6. **Document** — Update docs if behavior changed significantly

## Verification by Change Type

| Change Type      | Required Verification                     |
| ---------------- | ----------------------------------------- |
| Prompt changes   | Manual test of affected agent/skill       |
| Agent config     | Full agent startup + basic interaction    |
| Hook changes     | Agent flow test in workspace              |
| Tool changes     | End-to-end skill that uses the tool       |
| SDK changes      | background_task or sentinel test          |
| Build/config     | Fresh build + plugin loads in OpenCode    |

---

## Documentation Reference

### Architecture & Concepts

| Document | Purpose | Read When... |
|----------|---------|--------------|
| `README.md` | Project overview, installation, ecosystem | Starting fresh or onboarding |
| `docs/guides/HOOKS.md` | How hooks work, patterns, examples | Modifying or creating hooks |
| `docs/reference/opencode-sdk-limitations.md` | SDK constraints, workarounds, model inheritance | Working with SDK, background_task, sessions |
| `docs/architecture/morning-boot-architecture.md` | Complete morning boot workflow documentation | Modifying morning boot or its scanners |

### Design Knowledge (in docs/)

These documents explain WHY things work the way they do:

| Document | Purpose | Read When... |
|----------|---------|--------------|
| `docs/architecture/system-prompt-architecture.md` | How the system prompt is assembled and layered | Modifying prompts or identity |
| `docs/architecture/plugin-architecture.md` | Plugin system design, how components connect | Understanding overall architecture |
| `docs/reference/opencode-plugin-api.md` | OpenCode plugin API reference | Working with hooks, tools, agents |
| `docs/guides/implementation-vehicles.md` | When to use prompt vs hook vs skill vs agent | Choosing implementation approach |
| `docs/guides/skill-authoring-guide.md` | How to write and structure skills | Creating or modifying skills |
| `docs/reference/omo-methodology.md` | Inherited patterns from Oh-My-OpenCode | Understanding enforcement patterns |
| `docs/guides/verification-guide.md` | Testing and verification approaches | Validating changes |
| `docs/analysis/persona-rigidity-analysis.md` | Past regression analysis — why Thoth jumped to action | Avoiding behavioral regressions |

### Source Code Maps

| Directory | Key Files | Purpose |
|-----------|-----------|---------|
| `src/specialization/` | `prompt-sections.ts`, `prompt-builder.ts` | Core identity, voice, behavioral guidance |
| `src/agents/` | `thoth.ts`, `code-master.ts`, etc. | Agent definitions and prompts |
| `src/hooks/` | `permission-enforcer.ts`, `context-injector.ts` | Enforcement and context injection |
| `src/tools/` | `skill.ts`, `background-task.ts` | Custom tool implementations |
| `src/sdk/` | `sentinel-service.ts`, `session.ts` | SDK wrappers for background operations |

### External References

| Resource | URL | Purpose |
|----------|-----|---------|
| OpenCode Docs | https://opencode.ai/docs | Core OpenCode plugin API |
| OpenProse | https://github.com/opencode-ai/open-prose | Workflow language for skills |

---

## Common Tasks Quick Reference

### Adding a new prompt section
1. Edit `src/specialization/prompt-sections.ts`
2. Wire it in `src/specialization/prompt-builder.ts`
3. Run `bun run build`
4. Test affected agent behavior

### Creating a new hook
1. Follow pattern in `docs/guides/HOOKS.md`
2. Create file in `src/hooks/`
3. Register in `src/index.ts`
4. Test that hook fires correctly

### Modifying an agent
1. Edit relevant file in `src/agents/`
2. Run `bun run build`
3. Test agent in workspace

### Updating a skill
1. Edit files in `defaults/skill/<skill-name>/`
2. Run `bun run build` (copies to dist)
3. Test skill end-to-end

---

## Distribution

- **npm package:** `thoth-plugin`
- **Public repo:** https://github.com/Skeptomenos/thoth-core
- **Skills ship in:** `defaults/skill/`

## Related

- `../thoth-kb/` — Zeus's personal knowledge base (uses this plugin)
- `../AGENTS.md` — Workspace root context
