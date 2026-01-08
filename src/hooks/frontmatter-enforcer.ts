import { log, readFileSync, writeFileSync, expandPath } from "../shared";
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
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
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          lines.push(`  - ${item}`);
        }
      }
    } else if (typeof value === "string" && value.includes(":")) {
      lines.push(`${key}: "${value}"`);
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

function reconstructMarkdown(
  frontmatter: FrontmatterData,
  body: string
): string {
  return `---\n${serializeFrontmatter(frontmatter)}\n---\n\n${body.replace(/^\n+/, "")}`;
}

function ensureDates(
  content: string,
  created: string,
  updated: string
): string {
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

export function createFrontmatterEnforcerHook(
  config: FrontmatterEnforcerConfig
) {
  const { knowledgeBasePath, enabled = true } = config;

  if (!enabled) return null;

  const kbPath = expandPath(knowledgeBasePath);
  const pendingEdits = new Map<string, string>();

  function isKbMarkdownFile(filePath: string): boolean {
    if (!filePath.endsWith(".md")) return false;
    return path.resolve(filePath).startsWith(path.resolve(kbPath));
  }

  return {
    "tool.execute.before": async (
      input: { tool: string; callID?: string },
      output: { args: Record<string, unknown>; abort?: { reason: string } }
    ) => {
      const filePath = output.args.filePath as string | undefined;
      if (!filePath || !isKbMarkdownFile(filePath)) return;

      if (input.tool === "write") {
        const content = output.args.content as string | undefined;
        if (!content) return;

        const today = getToday();
        const existing = readFileSync(filePath);
        const createdDate = existing
          ? (parseMarkdown(existing).frontmatter.created as string) || today
          : today;

        output.args.content = ensureDates(content, createdDate, today);
        log(`Frontmatter: dates enforced for ${path.basename(filePath)}`);
      }

      if (input.tool === "edit" && input.callID) {
        pendingEdits.set(input.callID, filePath);
      }
    },

    "tool.execute.after": async (
      input: { tool: string; callID: string },
      _output: { title: string; output: string; metadata: unknown }
    ) => {
      if (input.tool !== "edit") return;

      const filePath = pendingEdits.get(input.callID);
      pendingEdits.delete(input.callID);
      if (!filePath) return;

      const content = readFileSync(filePath);
      if (!content) return;

      const parsed = parseMarkdown(content);
      if (!parsed.hasFrontmatter) return;

      parsed.frontmatter.updated = getToday();
      writeFileSync(
        filePath,
        reconstructMarkdown(parsed.frontmatter, parsed.body)
      );
      log(`Frontmatter: updated timestamp for ${path.basename(filePath)}`);
    },
  };
}

export type FrontmatterEnforcerHook = ReturnType<
  typeof createFrontmatterEnforcerHook
>;
