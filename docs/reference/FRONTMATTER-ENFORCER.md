# Frontmatter Enforcer Hook

## Problem

Thoth knowledge base files need consistent frontmatter with `created` and `updated` dates. Relying on agent prompts to maintain this is unreliable (~80% compliance). Hook-based enforcement guarantees 100% compliance with zero agent burden.

## Solution

Intercept `write` and `edit` tool calls for `.md` files within the knowledge base. Automatically inject/update temporal fields.

## Schema Reference

See `kernel/config/frontmatter-schemas.yaml` for the complete schema. The hook enforces only the **base temporal fields**:

```yaml
created: YYYY-MM-DD  # Set once on creation, never modified
updated: YYYY-MM-DD  # Updated on every write/edit
```

All other fields (`type`, `hemisphere`, `tags`, `summary`, type-specific fields) remain agent responsibility.

## Implementation

```typescript
import { log, readFileSync, expandPath, writeFileSync } from "../shared";
import * as path from "path";

export interface FrontmatterEnforcerConfig {
  knowledgeBasePath: string;
  enabled?: boolean;
}

interface FrontmatterData {
  [key: string]: unknown;
}

interface ParsedMarkdown {
  hasFrontmatter: boolean;
  frontmatter: FrontmatterData;
  body: string;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function parseMarkdown(content: string): ParsedMarkdown {
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return { hasFrontmatter: false, frontmatter: {}, body: content };
  }

  const frontmatter: FrontmatterData = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();
    
    if (value === "[]") {
      value = [];
    } else if (typeof value === "string") {
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
    }
    frontmatter[key] = value;
  }

  return {
    hasFrontmatter: true,
    frontmatter,
    body: content.slice(match[0].length),
  };
}

function serializeFrontmatter(data: FrontmatterData): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      lines.push(value.length === 0 ? `${key}: []` : `${key}:\n${value.map(v => `  - ${v}`).join("\n")}`);
    } else if (typeof value === "string" && value.includes(":")) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

function reconstructMarkdown(frontmatter: FrontmatterData, body: string): string {
  return `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${body.replace(/^\n+/, "")}`;
}

function ensureDates(content: string, created: string, updated: string): string {
  const parsed = parseMarkdown(content);
  
  if (!parsed.hasFrontmatter) {
    return reconstructMarkdown({ created, updated }, content);
  }

  if (!parsed.frontmatter.created) {
    parsed.frontmatter.created = created;
  }
  parsed.frontmatter.updated = updated;
  
  return reconstructMarkdown(parsed.frontmatter, parsed.body);
}

export function createFrontmatterEnforcerHook(config: FrontmatterEnforcerConfig) {
  const { knowledgeBasePath, enabled = true } = config;

  if (!enabled) return null;

  const kbPath = expandPath(knowledgeBasePath);

  function isKbMarkdownFile(filePath: string): boolean {
    if (!filePath.endsWith(".md")) return false;
    return path.resolve(filePath).startsWith(path.resolve(kbPath));
  }

  return {
    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown>; abort?: { reason: string } }
    ) => {
      if (input.tool !== "write") return;

      const filePath = output.args.filePath as string | undefined;
      const content = output.args.content as string | undefined;
      if (!filePath || !content || !isKbMarkdownFile(filePath)) return;

      const today = getToday();
      const existing = readFileSync(filePath);
      const createdDate = existing 
        ? (parseMarkdown(existing).frontmatter.created as string) || today
        : today;

      output.args.content = ensureDates(content, createdDate, today);
      log(`Frontmatter: dates enforced for ${path.basename(filePath)}`);
    },

    "tool.execute.after": async (
      input: { tool: string },
      output: { args: Record<string, unknown> }
    ) => {
      if (input.tool !== "edit") return;

      const filePath = output.args.filePath as string | undefined;
      if (!filePath || !isKbMarkdownFile(filePath)) return;

      const content = readFileSync(filePath);
      if (!content) return;

      const parsed = parseMarkdown(content);
      if (!parsed.hasFrontmatter) return;

      parsed.frontmatter.updated = getToday();
      writeFileSync(filePath, reconstructMarkdown(parsed.frontmatter, parsed.body));
      log(`Frontmatter: updated timestamp for ${path.basename(filePath)}`);
    },
  };
}

export type FrontmatterEnforcerHook = ReturnType<typeof createFrontmatterEnforcerHook>;
```

## Behavior

| Scenario | Action |
|----------|--------|
| `write` new file, no frontmatter | Inject `created` + `updated` |
| `write` new file, has frontmatter | Add missing `created`/`updated` |
| `write` existing file | Preserve `created`, update `updated` |
| `edit` existing file | Update `updated` only |
| File outside KB | Pass through unchanged |
| Non-markdown file | Pass through unchanged |

## Registration

```typescript
import { createFrontmatterEnforcerHook } from "./hooks/frontmatter-enforcer";

const hook = createFrontmatterEnforcerHook({
  knowledgeBasePath: config.knowledge_base,
  enabled: config.hooks?.["frontmatter-enforcer"] ?? true,
});
```

## Testing Strategy

Unit tests for pure functions (no I/O):
- `parseMarkdown` - various frontmatter formats
- `ensureDates` - injection and preservation logic
- `serializeFrontmatter` - round-trip consistency

Integration tests (with temp files):
- Write hook modifies content correctly
- Edit hook updates file on disk
- KB boundary check works
- Existing `created` dates preserved
