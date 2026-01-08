---
name: capsule-init
description: Upgrades a project file or folder to a focused Thoth Capsule.
---

# Capsule Init Skill

Use this skill when a project grows too complex or when you want to "Deep Dive" into a specific subfolder.

## Logic

### 1. Target Identification
Identify if it's a file (`Projects/foo.md`) or a folder (`coding/bar/`).

### 2. Location Check
Determine if the capsule is inside or outside the Thoth repo:
```bash
# Get thoth repo root (if inside)
THOTH_ROOT=$(git -C <target_path> rev-parse --show-toplevel 2>/dev/null)

# Check if this is actually the thoth repo (not some other repo)
# by verifying kernel/ exists
if [[ -d "$THOTH_ROOT/kernel" ]]; then
  echo "Inside thoth repo"
else
  echo "Outside thoth repo (or different repo)"
fi
```

### 3. Strategy
Read the existing content to distill the "Strategic North Star".

### 4. Scaffold
Create the capsule structure:

| File | Purpose | When to Create |
|------|---------|----------------|
| `AGENTS.md` | Bootloader with persona and context | Always |
| `CONTEXT.md` | Strategic Interface | Always |
| `opencode.json` | Instruction Pinning | Always |
| `.opencode/oh-my-opencode.json` | Plugin config (disables Sisyphus) | **ALWAYS** (symlink if inside, copy if outside) |

### 5. Migration
Move the original project file to `README.md` within the new capsule.

## Templates

Use templates in `kernel/templates/`:
- `AGENTS.template.md` — Bootloader structure
- `CONTEXT.template.md` — Strategic interface
- `oh-my-opencode.template.json` — Plugin config for external capsules

## Plugin Config (CRITICAL - ALWAYS REQUIRED)

oh-my-opencode uses `process.cwd()` to find config, NOT git root. Every capsule needs `.opencode/oh-my-opencode.json` accessible from its directory.

### Inside Thoth Repo → Create Symlink

Calculate the relative path from capsule to root `.opencode/`:

```bash
# Example: capsule at coding/projects/my-app/
# Depth = 3 levels from root
# Symlink target = ../../../.opencode/oh-my-opencode.json

# Calculate depth from root
CAPSULE_PATH="coding/projects/my-app"  # relative to thoth root
DEPTH=$(echo "$CAPSULE_PATH" | tr -cd '/' | wc -c)
DEPTH=$((DEPTH + 1))  # add 1 for the directory itself

# Build relative path (../ repeated DEPTH times)
REL_PATH=$(printf '../%.0s' $(seq 1 $DEPTH))

# Create symlink
mkdir -p "$CAPSULE_PATH/.opencode"
cd "$CAPSULE_PATH/.opencode"
ln -s "${REL_PATH}.opencode/oh-my-opencode.json" oh-my-opencode.json
```

**Quick reference for common depths:**

| Capsule Location | Depth | Symlink Target |
|------------------|-------|----------------|
| `kernel/` | 1 | `../../.opencode/oh-my-opencode.json` |
| `work/projects/` | 2 | `../../../.opencode/oh-my-opencode.json` |
| `coding/projects/my-app/` | 3 | `../../../../.opencode/oh-my-opencode.json` |

### Outside Thoth Repo → Copy Template

```bash
mkdir -p <capsule>/.opencode
cp kernel/templates/oh-my-opencode.template.json <capsule>/.opencode/oh-my-opencode.json
```

**Without this config, the capsule will use Sisyphus instead of Thoth.**

## Prompt Requirements

Ask the user for:
- Strategic Objective (if not inferable)
- Persona choice (ARCHITECT, COS, SYSTEM, etc.)
- Target location (confirm if outside thoth repo)
