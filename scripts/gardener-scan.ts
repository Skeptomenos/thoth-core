#!/usr/bin/env npx tsx
/**
 * Gardener Scan Script
 *
 * A deterministic script that scans the Thoth knowledge base for:
 * - Broken [[wikilinks]]
 * - Missing frontmatter
 * - Invalid frontmatter fields
 * - Orphan files (not in any registry)
 * - Registry entries pointing to non-existent files
 * - Bidirectional link violations
 *
 * Outputs a structured migration-report.json for use by the gardener skill.
 *
 * Usage:
 *   npx tsx scripts/gardener-scan.ts [--fix] [--verbose] [--path <subdir>]
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

interface FrontMatter {
  type?: string;
  hemisphere?: string;
  created?: string;
  updated?: string;
  tags?: string[];
  summary?: string;
  related?: string[];
  status?: string;
  [key: string]: unknown;
}

interface FileIssue {
  file: string;
  issue: string;
  severity: "error" | "warning" | "info";
  details?: string;
  autoFixable: boolean;
  suggestedFix?: string;
}

interface BrokenLink {
  sourceFile: string;
  targetPath: string;
  lineNumber: number;
  linkText: string;
}

interface OrphanFile {
  file: string;
  hemisphere: string;
  suggestedRegistry: string;
}

interface RegistryGhost {
  registry: string;
  referencedPath: string;
  lineNumber: number;
}

interface ScanReport {
  timestamp: string;
  scannedPath: string;
  totalFiles: number;
  totalIssues: number;
  issues: {
    frontmatter: FileIssue[];
    brokenLinks: BrokenLink[];
    orphanFiles: OrphanFile[];
    registryGhosts: RegistryGhost[];
    bidirectionalViolations: FileIssue[];
  };
  registryStats: {
    [hemisphere: string]: {
      entriesFound: number;
      entriesValid: number;
      entriesMissing: number;
    };
  };
  summary: {
    errors: number;
    warnings: number;
    info: number;
    autoFixable: number;
  };
}

// ============================================================================
// Configuration
// ============================================================================

const KNOWLEDGE_BASE_ROOT = path.resolve(process.cwd());

const HEMISPHERES = ["kernel", "work", "life", "coding"];

const REQUIRED_FRONTMATTER_FIELDS = ["type", "hemisphere", "created", "updated"];

const CIRCLE_1_PATTERNS = [
  "registry.md",
  "dashboard.md",
  "chronicle.md",
  "_index.md",
  "README.md",
  "MASTER.md",
];

// Files to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.opencode/,
  /dist/,
  /build/,
  /\.venv/,
  /TEMPLATE-/,
];

// ============================================================================
// Utilities
// ============================================================================

function shouldSkipFile(filePath: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(filePath));
}

function getHemisphere(filePath: string): string | null {
  const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, filePath);
  const parts = relativePath.split(path.sep);
  if (parts.length > 0 && HEMISPHERES.includes(parts[0])) {
    return parts[0];
  }
  return null;
}

function parseFrontMatter(content: string): {
  frontmatter: FrontMatter | null;
  body: string;
  hasFrontmatter: boolean;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n?/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: null, body: content, hasFrontmatter: false };
  }

  try {
    const yamlContent = match[1];
    const frontmatter: FrontMatter = {};

    // Simple YAML parser for our use case
    const lines = yamlContent.split("\n");
    let currentKey: string | null = null;
    let currentArray: string[] | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      // Check for array item
      if (trimmed.startsWith("- ") && currentKey && currentArray !== null) {
        currentArray.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ""));
        continue;
      }

      // Save previous array if we had one
      if (currentKey && currentArray !== null) {
        frontmatter[currentKey] = currentArray;
        currentArray = null;
      }

      // Check for key-value pair
      const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
      if (kvMatch) {
        currentKey = kvMatch[1];
        const value = kvMatch[2].trim();

        if (value === "" || value === "[]") {
          // Empty array or value to be filled by following lines
          if (value === "[]") {
            frontmatter[currentKey] = [];
          } else {
            currentArray = [];
          }
        } else if (value.startsWith("[") && value.endsWith("]")) {
          // Inline array
          const arrayContent = value.slice(1, -1);
          frontmatter[currentKey] = arrayContent
            ? arrayContent.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
            : [];
        } else {
          // Regular value
          frontmatter[currentKey] = value.replace(/^["']|["']$/g, "");
        }
      }
    }

    // Save final array if we had one
    if (currentKey && currentArray !== null) {
      frontmatter[currentKey] = currentArray;
    }

    return {
      frontmatter,
      body: content.slice(match[0].length),
      hasFrontmatter: true,
    };
  } catch {
    return { frontmatter: null, body: content, hasFrontmatter: true };
  }
}

function extractWikilinks(content: string): Array<{ target: string; lineNumber: number; text: string }> {
  const links: Array<{ target: string; lineNumber: number; text: string }> = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match [[path]] or [[path|alias]]
    const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      links.push({
        target: match[1].trim(),
        lineNumber: i + 1,
        text: match[0],
      });
    }
  }

  return links;
}

function extractMarkdownLinks(content: string): Array<{ target: string; lineNumber: number; text: string }> {
  const links: Array<{ target: string; lineNumber: number; text: string }> = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match [text](path) for local .md files
    const regex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const target = match[2].trim();
      // Skip external links
      if (!target.startsWith("http://") && !target.startsWith("https://")) {
        links.push({
          target,
          lineNumber: i + 1,
          text: match[0],
        });
      }
    }
  }

  return links;
}

function resolveLink(sourceFile: string, targetPath: string): string {
  // Handle absolute paths from KB root
  if (targetPath.startsWith("/")) {
    return path.join(KNOWLEDGE_BASE_ROOT, targetPath);
  }

  // Handle paths that start with hemisphere
  for (const hemisphere of HEMISPHERES) {
    if (targetPath.startsWith(`${hemisphere}/`)) {
      return path.join(KNOWLEDGE_BASE_ROOT, targetPath);
    }
  }

  // Relative path from source file's directory
  const sourceDir = path.dirname(sourceFile);
  return path.resolve(sourceDir, targetPath);
}

function getAllMarkdownFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (shouldSkipFile(fullPath)) continue;

    if (entry.isDirectory()) {
      getAllMarkdownFiles(fullPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// ============================================================================
// Scanners
// ============================================================================

function scanFrontmatter(filePath: string, content: string): FileIssue[] {
  const issues: FileIssue[] = [];
  const { frontmatter, hasFrontmatter } = parseFrontMatter(content);
  const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, filePath);

  // Skip Circle 1 files for some checks
  const isCircle1 = CIRCLE_1_PATTERNS.some((p) => relativePath.endsWith(p));

  if (!hasFrontmatter) {
    issues.push({
      file: relativePath,
      issue: "missing_frontmatter",
      severity: isCircle1 ? "warning" : "error",
      details: "File has no YAML frontmatter",
      autoFixable: true,
      suggestedFix: "Add frontmatter block with required fields",
    });
    return issues;
  }

  if (!frontmatter) {
    issues.push({
      file: relativePath,
      issue: "invalid_frontmatter",
      severity: "error",
      details: "Frontmatter exists but could not be parsed",
      autoFixable: false,
    });
    return issues;
  }

  // Check required fields
  for (const field of REQUIRED_FRONTMATTER_FIELDS) {
    if (!frontmatter[field]) {
      issues.push({
        file: relativePath,
        issue: `missing_field_${field}`,
        severity: "warning",
        details: `Missing required frontmatter field: ${field}`,
        autoFixable: true,
        suggestedFix: `Add "${field}" field to frontmatter`,
      });
    }
  }

  // Validate hemisphere if present
  if (frontmatter.hemisphere && !HEMISPHERES.includes(frontmatter.hemisphere as string)) {
    issues.push({
      file: relativePath,
      issue: "invalid_hemisphere",
      severity: "error",
      details: `Invalid hemisphere "${frontmatter.hemisphere}". Must be one of: ${HEMISPHERES.join(", ")}`,
      autoFixable: true,
      suggestedFix: `Set hemisphere to "${getHemisphere(filePath) || "kernel"}"`,
    });
  }

  // Check if hemisphere matches actual location
  const actualHemisphere = getHemisphere(filePath);
  if (frontmatter.hemisphere && actualHemisphere && frontmatter.hemisphere !== actualHemisphere) {
    issues.push({
      file: relativePath,
      issue: "hemisphere_mismatch",
      severity: "warning",
      details: `Frontmatter says "${frontmatter.hemisphere}" but file is in "${actualHemisphere}"`,
      autoFixable: true,
      suggestedFix: `Update hemisphere to "${actualHemisphere}"`,
    });
  }

  // Validate date formats
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const dateField of ["created", "updated"]) {
    if (frontmatter[dateField] && !dateRegex.test(frontmatter[dateField] as string)) {
      issues.push({
        file: relativePath,
        issue: `invalid_date_${dateField}`,
        severity: "warning",
        details: `Invalid date format for "${dateField}": ${frontmatter[dateField]}. Expected YYYY-MM-DD`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

function scanBrokenLinks(
  filePath: string,
  content: string,
  allFiles: Set<string>
): BrokenLink[] {
  const broken: BrokenLink[] = [];
  const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, filePath);

  // Scan wikilinks
  const wikilinks = extractWikilinks(content);
  for (const link of wikilinks) {
    let targetPath = link.target;

    // Add .md extension if missing
    if (!targetPath.endsWith(".md")) {
      targetPath += ".md";
    }

    const resolvedPath = resolveLink(filePath, targetPath);
    const resolvedRelative = path.relative(KNOWLEDGE_BASE_ROOT, resolvedPath);

    if (!allFiles.has(resolvedPath) && !fs.existsSync(resolvedPath)) {
      broken.push({
        sourceFile: relativePath,
        targetPath: resolvedRelative,
        lineNumber: link.lineNumber,
        linkText: link.text,
      });
    }
  }

  // Scan markdown links
  const mdLinks = extractMarkdownLinks(content);
  for (const link of mdLinks) {
    const resolvedPath = resolveLink(filePath, link.target);
    const resolvedRelative = path.relative(KNOWLEDGE_BASE_ROOT, resolvedPath);

    if (!allFiles.has(resolvedPath) && !fs.existsSync(resolvedPath)) {
      broken.push({
        sourceFile: relativePath,
        targetPath: resolvedRelative,
        lineNumber: link.lineNumber,
        linkText: link.text,
      });
    }
  }

  return broken;
}

function scanOrphanFiles(
  allFiles: string[],
  registryContents: Map<string, string>
): OrphanFile[] {
  const orphans: OrphanFile[] = [];

  // Build set of all referenced files from registries
  const referencedFiles = new Set<string>();

  for (const [registryPath, content] of registryContents) {
    const wikilinks = extractWikilinks(content);
    const mdLinks = extractMarkdownLinks(content);

    for (const link of [...wikilinks, ...mdLinks]) {
      let targetPath = link.target;
      if (!targetPath.endsWith(".md")) {
        targetPath += ".md";
      }
      const resolved = resolveLink(registryPath, targetPath);
      referencedFiles.add(resolved);
    }
  }

  // Check each file
  for (const file of allFiles) {
    const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, file);
    const hemisphere = getHemisphere(file);

    // Skip Circle 1 files (they don't need to be in registries)
    if (CIRCLE_1_PATTERNS.some((p) => relativePath.endsWith(p))) continue;

    // Skip templates
    if (relativePath.includes("/templates/")) continue;

    // Skip root level files
    if (!hemisphere) continue;

    if (!referencedFiles.has(file)) {
      orphans.push({
        file: relativePath,
        hemisphere: hemisphere || "unknown",
        suggestedRegistry: `${hemisphere}/registry.md`,
      });
    }
  }

  return orphans;
}

function scanRegistryGhosts(
  registryPath: string,
  content: string,
  allFiles: Set<string>
): RegistryGhost[] {
  const ghosts: RegistryGhost[] = [];
  const relativePath = path.relative(KNOWLEDGE_BASE_ROOT, registryPath);

  const wikilinks = extractWikilinks(content);
  const mdLinks = extractMarkdownLinks(content);

  for (const link of [...wikilinks, ...mdLinks]) {
    let targetPath = link.target;
    if (!targetPath.endsWith(".md")) {
      targetPath += ".md";
    }

    const resolved = resolveLink(registryPath, targetPath);

    if (!allFiles.has(resolved) && !fs.existsSync(resolved)) {
      ghosts.push({
        registry: relativePath,
        referencedPath: path.relative(KNOWLEDGE_BASE_ROOT, resolved),
        lineNumber: link.lineNumber,
      });
    }
  }

  return ghosts;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes("--verbose");
  const subPath = args.find((a) => !a.startsWith("--"));

  const scanPath = subPath ? path.resolve(KNOWLEDGE_BASE_ROOT, subPath) : KNOWLEDGE_BASE_ROOT;

  if (verbose) {
    console.log(`Scanning: ${scanPath}`);
    console.log(`Knowledge Base Root: ${KNOWLEDGE_BASE_ROOT}`);
  }

  // Collect all markdown files
  const allFilePaths = getAllMarkdownFiles(scanPath);
  const allFiles = new Set(allFilePaths);

  if (verbose) {
    console.log(`Found ${allFilePaths.length} markdown files`);
  }

  // Initialize report
  const report: ScanReport = {
    timestamp: new Date().toISOString(),
    scannedPath: path.relative(KNOWLEDGE_BASE_ROOT, scanPath) || ".",
    totalFiles: allFilePaths.length,
    totalIssues: 0,
    issues: {
      frontmatter: [],
      brokenLinks: [],
      orphanFiles: [],
      registryGhosts: [],
      bidirectionalViolations: [],
    },
    registryStats: {},
    summary: {
      errors: 0,
      warnings: 0,
      info: 0,
      autoFixable: 0,
    },
  };

  // Initialize registry stats
  for (const hemisphere of HEMISPHERES) {
    report.registryStats[hemisphere] = {
      entriesFound: 0,
      entriesValid: 0,
      entriesMissing: 0,
    };
  }

  // Collect registry contents
  const registryContents = new Map<string, string>();
  for (const hemisphere of HEMISPHERES) {
    const registryPath = path.join(KNOWLEDGE_BASE_ROOT, hemisphere, "registry.md");
    if (fs.existsSync(registryPath)) {
      registryContents.set(registryPath, fs.readFileSync(registryPath, "utf-8"));
    }

    // Also check _index.md files
    const indexPaths = [
      path.join(KNOWLEDGE_BASE_ROOT, hemisphere, "people", "_index.md"),
      path.join(KNOWLEDGE_BASE_ROOT, hemisphere, "projects", "_index.md"),
    ];
    for (const indexPath of indexPaths) {
      if (fs.existsSync(indexPath)) {
        registryContents.set(indexPath, fs.readFileSync(indexPath, "utf-8"));
      }
    }
  }

  // Scan each file
  for (const filePath of allFilePaths) {
    const content = fs.readFileSync(filePath, "utf-8");

    // Frontmatter scan
    const frontmatterIssues = scanFrontmatter(filePath, content);
    report.issues.frontmatter.push(...frontmatterIssues);

    // Broken links scan
    const brokenLinks = scanBrokenLinks(filePath, content, allFiles);
    report.issues.brokenLinks.push(...brokenLinks);
  }

  // Orphan files scan
  report.issues.orphanFiles = scanOrphanFiles(allFilePaths, registryContents);

  // Registry ghosts scan
  for (const [registryPath, content] of registryContents) {
    const ghosts = scanRegistryGhosts(registryPath, content, allFiles);
    report.issues.registryGhosts.push(...ghosts);

    // Update stats
    const hemisphere = getHemisphere(registryPath);
    if (hemisphere) {
      const wikilinks = extractWikilinks(content);
      const mdLinks = extractMarkdownLinks(content);
      const totalLinks = wikilinks.length + mdLinks.length;
      report.registryStats[hemisphere].entriesFound += totalLinks;
      report.registryStats[hemisphere].entriesValid += totalLinks - ghosts.length;
      report.registryStats[hemisphere].entriesMissing += ghosts.length;
    }
  }

  // Calculate summary
  for (const issue of report.issues.frontmatter) {
    report.totalIssues++;
    if (issue.severity === "error") report.summary.errors++;
    if (issue.severity === "warning") report.summary.warnings++;
    if (issue.severity === "info") report.summary.info++;
    if (issue.autoFixable) report.summary.autoFixable++;
  }

  report.totalIssues +=
    report.issues.brokenLinks.length +
    report.issues.orphanFiles.length +
    report.issues.registryGhosts.length;

  report.summary.errors +=
    report.issues.brokenLinks.length + report.issues.registryGhosts.length;
  report.summary.warnings += report.issues.orphanFiles.length;

  // Write report
  const reportPath = path.join(KNOWLEDGE_BASE_ROOT, "migration-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Console output
  console.log("\n=== Gardener Scan Complete ===\n");
  console.log(`Total files scanned: ${report.totalFiles}`);
  console.log(`Total issues found: ${report.totalIssues}`);
  console.log(`  - Errors: ${report.summary.errors}`);
  console.log(`  - Warnings: ${report.summary.warnings}`);
  console.log(`  - Auto-fixable: ${report.summary.autoFixable}`);
  console.log(`\nFrontmatter issues: ${report.issues.frontmatter.length}`);
  console.log(`Broken links: ${report.issues.brokenLinks.length}`);
  console.log(`Orphan files: ${report.issues.orphanFiles.length}`);
  console.log(`Registry ghosts: ${report.issues.registryGhosts.length}`);

  if (verbose) {
    console.log("\n--- Registry Stats ---");
    for (const [hemisphere, stats] of Object.entries(report.registryStats)) {
      console.log(`  ${hemisphere}: ${stats.entriesValid}/${stats.entriesFound} valid`);
    }
  }

  console.log(`\nReport saved to: ${reportPath}`);

  // Exit with error code if there are errors
  if (report.summary.errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Scan failed:", err);
  process.exit(1);
});
