#!/usr/bin/env node

/**
 * Documentation Link Validator
 * 
 * Validates all internal links in markdown documentation files to ensure
 * they point to existing files and anchors.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
const ANCHOR_REGEX = /^#+\s+(.+)$/gm;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`[^`]+`/g;

// Results tracking
const results = {
  totalFiles: 0,
  totalLinks: 0,
  brokenLinks: [],
  warnings: [],
  errors: []
};

/**
 * Convert heading text to anchor format (GitHub-style)
 * Handles Unicode normalization and special characters
 */
function headingToAnchor(heading, seenAnchors = null) {
  // Normalize Unicode (NFC normalization)
  let normalized = heading.normalize('NFC');
  
  // Convert to lowercase and trim
  let anchor = normalized
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove punctuation except hyphens and underscores
    .replace(/[^\w\u0080-\uFFFF-]/g, '')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
  
  // Handle duplicates if seenAnchors map is provided
  if (seenAnchors) {
    const baseAnchor = anchor;
    let counter = 0;
    
    while (seenAnchors.has(anchor)) {
      counter++;
      anchor = `${baseAnchor}-${counter}`;
    }
    
    seenAnchors.set(anchor, true);
  }
  
  return anchor;
}

/**
 * Extract all anchors from markdown content
 * Handles duplicate headings by appending -1, -2, etc.
 */
function extractAnchors(content) {
  const anchors = new Set();
  const seenAnchors = new Map(); // Track duplicates
  
  // Strip code blocks and inline code to avoid false positives
  let cleanedContent = content;
  
  // Remove fenced code blocks using existing regex
  cleanedContent = cleanedContent.replace(CODE_BLOCK_REGEX, '');
  
  // Remove inline code using existing regex
  cleanedContent = cleanedContent.replace(INLINE_CODE_REGEX, '');
  
  // Extract anchors from cleaned content
  let match;
  while ((match = ANCHOR_REGEX.exec(cleanedContent)) !== null) {
    const anchor = headingToAnchor(match[1], seenAnchors);
    anchors.add(anchor);
  }
  
  return anchors;
}

/**
 * Check if a file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Validate a single link
 */
function validateLink(link, sourceFile, linkText) {
  // Skip external links
  if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('//')) {
    return { valid: true, type: 'external' };
  }
  
  // Skip mailto and other protocols
  if (link.includes(':')) {
    return { valid: true, type: 'protocol' };
  }
  
  // Parse link and anchor (preserve multiple '#' in anchor)
  const hashIdx = link.indexOf('#');
  const linkPath = hashIdx === -1 ? link : link.slice(0, hashIdx);
  const anchor = hashIdx === -1 ? '' : link.slice(hashIdx + 1);
  
  // Handle anchor-only links (same file)
  if (!linkPath && anchor) {
    const content = fs.readFileSync(sourceFile, 'utf8');
    const anchors = extractAnchors(content);
    
    // Decode URL-encoded anchor for comparison (e.g., %27 -> ')
    let decodedAnchor = anchor;
    try {
      decodedAnchor = decodeURIComponent(anchor);
    } catch (e) {
      // If decoding fails, use original anchor
    }
    
    if (!anchors.has(decodedAnchor)) {
      return {
        valid: false,
        type: 'anchor',
        error: `Anchor '#${anchor}' not found in current file`
      };
    }
    
    return { valid: true, type: 'anchor' };
  }
  
  // Resolve relative path
  const sourceDir = path.dirname(sourceFile);
  const targetPath = path.resolve(sourceDir, linkPath);
  
  // Check if target file exists
  if (!fileExists(targetPath)) {
    return {
      valid: false,
      type: 'file',
      error: `File not found: ${path.relative(DOCS_DIR, targetPath)}`
    };
  }
  
  // If anchor specified, check if it exists in target file
  if (anchor) {
    const content = fs.readFileSync(targetPath, 'utf8');
    const anchors = extractAnchors(content);
    
    // Decode URL-encoded anchor for comparison (e.g., %27 -> ')
    let decodedAnchor = anchor;
    try {
      decodedAnchor = decodeURIComponent(anchor);
    } catch (e) {
      // If decoding fails, use original anchor
    }
    
    if (!anchors.has(decodedAnchor)) {
      return {
        valid: false,
        type: 'anchor',
        error: `Anchor '#${anchor}' not found in ${path.relative(DOCS_DIR, targetPath)}`
      };
    }
  }
  
  return { valid: true, type: 'internal' };
}

/**
 * Remove code blocks and inline code from content
 */
function removeCodeFromContent(content) {
  // Replace code blocks with placeholders to preserve line structure
  let cleaned = content.replace(CODE_BLOCK_REGEX, (match) => {
    return '\n'.repeat((match.match(/\n/g) || []).length);
  });
  
  // Replace inline code with empty string
  cleaned = cleaned.replace(INLINE_CODE_REGEX, '');
  
  return cleaned;
}

/**
 * Process a single markdown file
 */
function processFile(filePath) {
  results.totalFiles++;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(DOCS_DIR, filePath);
  
  // Remove code blocks and inline code before checking links
  const contentWithoutCode = removeCodeFromContent(content);
  
  let match;
  let fileHasIssues = false;
  
  // Reset regex state
  LINK_REGEX.lastIndex = 0;
  
  while ((match = LINK_REGEX.exec(contentWithoutCode)) !== null) {
    const linkText = match[1];
    const link = match[2];
    
    results.totalLinks++;
    
    const validation = validateLink(link, filePath, linkText);
    
    if (!validation.valid) {
      fileHasIssues = true;
      results.brokenLinks.push({
        file: relativePath,
        linkText,
        link,
        error: validation.error,
        type: validation.type
      });
    }
  }
  
  return !fileHasIssues;
}

/**
 * Recursively find all markdown files
 */
function findMarkdownFiles(dir) {
  const files = [];
  
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        files.push(...findMarkdownFiles(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (MARKDOWN_EXTENSIONS.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    results.errors.push(`Error reading directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Generate report
 */
function generateReport() {
  console.log('\n=== Documentation Link Validation Report ===\n');
  
  console.log(`Files scanned: ${results.totalFiles}`);
  console.log(`Links checked: ${results.totalLinks}`);
  console.log(`Broken links: ${results.brokenLinks.length}`);
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length}`);
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (results.brokenLinks.length > 0) {
    console.log('\n❌ Broken Links:\n');
    
    // Group by file
    const byFile = {};
    results.brokenLinks.forEach(broken => {
      if (!byFile[broken.file]) {
        byFile[broken.file] = [];
      }
      byFile[broken.file].push(broken);
    });
    
    Object.keys(byFile).sort().forEach(file => {
      console.log(`📄 ${file}`);
      byFile[file].forEach(broken => {
        console.log(`  ❌ [${broken.linkText}](${broken.link})`);
        console.log(`     ${broken.error}`);
      });
      console.log('');
    });
  } else {
    console.log('\n✅ All links are valid!\n');
  }
  
  return results.brokenLinks.length === 0 && results.errors.length === 0;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting documentation link validation...\n');
  console.log(`Scanning directory: ${DOCS_DIR}\n`);
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }
  
  const markdownFiles = findMarkdownFiles(DOCS_DIR);
  
  if (markdownFiles.length === 0) {
    console.log('No markdown files found.');
    process.exit(0);
  }
  
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  markdownFiles.forEach(file => {
    processFile(file);
  });
  
  const success = generateReport();
  
  process.exit(success ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { validateLink, extractAnchors, headingToAnchor, removeCodeFromContent };
