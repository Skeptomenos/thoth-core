#!/usr/bin/env npx ts-node

/**
 * Batch Frontmatter Addition Script
 * Adds YAML frontmatter to all markdown files that don't have it.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const DRY_RUN = process.argv.includes('--dry-run');

// Directories to process
const HEMISPHERES = ['kernel', 'work', 'life', 'coding'];

// Files to skip (already have frontmatter or are special)
const SKIP_PATTERNS = [
  /node_modules/,
  /\.git/,
  /scripts\//,
  /src\//,
  /\.opencode/,
];

interface FileInfo {
  path: string;
  hemisphere: string;
  type: string;
  title: string;
}

function detectType(filePath: string, content: string): string {
  const relativePath = path.relative(ROOT, filePath).toLowerCase();
  const filename = path.basename(filePath).toLowerCase();
  
  // Index files
  if (filename === 'readme.md' || filename === '_index.md' || filename === 'registry.md' || filename === 'dashboard.md') {
    return 'index';
  }
  
  // Master files
  if (filename === 'master.md') {
    return 'agent';
  }
  
  // People
  if (relativePath.includes('/team/') || relativePath.includes('/stakeholders/') || 
      relativePath.includes('/people/') || relativePath.includes('/network/')) {
    return 'person';
  }
  
  // Projects
  if (relativePath.includes('/projects/') || relativePath.includes('/personal/')) {
    return 'project';
  }
  
  // Tasks
  if (relativePath.includes('/tasks/') || relativePath.includes('/inbox/')) {
    return 'task';
  }
  
  // Config
  if (relativePath.includes('/config/') || relativePath.includes('/templates/')) {
    return 'config';
  }
  
  // Standards
  if (relativePath.includes('/standards/')) {
    return 'standard';
  }
  
  // Documentation
  if (relativePath.includes('/documentation/') || relativePath.includes('/archive/')) {
    return 'reference';
  }
  
  // State
  if (relativePath.includes('/state/')) {
    return 'state';
  }
  
  // Memory
  if (relativePath.includes('/memory/')) {
    return 'memory';
  }
  
  // Knowledge
  if (relativePath.includes('/knowledge/') || relativePath.includes('/areas/')) {
    return 'knowledge';
  }
  
  // Operations
  if (relativePath.includes('/operations/') || relativePath.includes('/sprints/')) {
    return 'operations';
  }
  
  // Identity
  if (relativePath.includes('/identity/')) {
    return 'identity';
  }
  
  // Chronicle
  if (filename.includes('chronicle') || filename.includes('log')) {
    return 'chronicle';
  }
  
  // Skills
  if (relativePath.includes('/skills/') || relativePath.includes('/agents/')) {
    return 'skill';
  }
  
  // Personas
  if (relativePath.includes('/personas/')) {
    return 'persona';
  }
  
  // Default
  return 'document';
}

function detectHemisphere(filePath: string): string {
  const relativePath = path.relative(ROOT, filePath).toLowerCase();
  
  if (relativePath.startsWith('kernel/')) return 'kernel';
  if (relativePath.startsWith('work/')) return 'work';
  if (relativePath.startsWith('life/')) return 'life';
  if (relativePath.startsWith('coding/')) return 'coding';
  
  return 'root';
}

function extractTitle(content: string, filename: string): string {
  // Try to find first heading
  const headingMatch = content.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }
  
  // Fall back to filename
  return filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
}

function hasFrontmatter(content: string): boolean {
  return content.trimStart().startsWith('---');
}

function generateFrontmatter(info: FileInfo): string {
  const today = new Date().toISOString().split('T')[0];
  
  return `---
type: ${info.type}
hemisphere: ${info.hemisphere}
created: ${today}
updated: ${today}
tags: []
summary: "${info.title}"
---

`;
}

function processFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Skip if already has frontmatter
  if (hasFrontmatter(content)) {
    return false;
  }
  
  const filename = path.basename(filePath);
  const info: FileInfo = {
    path: filePath,
    hemisphere: detectHemisphere(filePath),
    type: detectType(filePath, content),
    title: extractTitle(content, filename),
  };
  
  const frontmatter = generateFrontmatter(info);
  const newContent = frontmatter + content;
  
  if (DRY_RUN) {
    console.log(`[DRY-RUN] Would add frontmatter to: ${path.relative(ROOT, filePath)}`);
    console.log(`  Type: ${info.type}, Hemisphere: ${info.hemisphere}`);
  } else {
    fs.writeFileSync(filePath, newContent);
    console.log(`Added frontmatter to: ${path.relative(ROOT, filePath)}`);
  }
  
  return true;
}

function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(ROOT, fullPath);
    
    // Skip patterns
    if (SKIP_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  console.log('=== Frontmatter Addition Script ===');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');
  
  let processed = 0;
  let skipped = 0;
  
  // Process each hemisphere
  for (const hemisphere of HEMISPHERES) {
    const hemisphereDir = path.join(ROOT, hemisphere);
    
    if (!fs.existsSync(hemisphereDir)) {
      console.log(`Skipping ${hemisphere}/ - directory not found`);
      continue;
    }
    
    console.log(`\nProcessing ${hemisphere}/...`);
    
    const files = findMarkdownFiles(hemisphereDir);
    
    for (const file of files) {
      const wasProcessed = processFile(file);
      if (wasProcessed) {
        processed++;
      } else {
        skipped++;
      }
    }
  }
  
  // Also process root-level md files
  console.log('\nProcessing root files...');
  const rootFiles = fs.readdirSync(ROOT)
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(ROOT, f));
  
  for (const file of rootFiles) {
    const wasProcessed = processFile(file);
    if (wasProcessed) {
      processed++;
    } else {
      skipped++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log(`Processed: ${processed} files`);
  console.log(`Skipped (already have frontmatter): ${skipped} files`);
  
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main();
