#!/usr/bin/env node

/**
 * Documentation Link Validator
 * 
 * Validates all internal links in documentation files to ensure they point to existing files
 * and that anchor references point to existing headers.
 * 
 * Usage: node docs/scripts/validate-links.js [--fix] [--verbose]
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const autoFix = args.includes('--fix');

let totalLinks = 0;
let brokenLinks = 0;
let fixedLinks = 0;

/**
 * Get all markdown files in a directory recursively
 */
function getMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules and hidden directories
      if (!file.startsWith('.') && file !== 'node_modules') {
        getMarkdownFiles(filePath, fileList);
      }
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Extract all markdown links from content
 */
function extractLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2],
      fullMatch: match[0]
    });
  }
  
  return links;
}

/**
 * Extract headers from markdown content
 */
function extractHeaders(content) {
  const headerRegex = /^#{1,6}\s+(.+)$/gm;
  const headers = [];
  let match;
  
  while ((match = headerRegex.exec(content)) !== null) {
    const headerText = match[1].trim();
    const anchor = headerText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headers.push(anchor);
  }
  
  return headers;
}

/**
 * Validate a single link
 */
function validateLink(link, sourceFile) {
  totalLinks++;
  
  // Skip external links
  if (link.url.startsWith('http://') || link.url.startsWith('https://')) {
    if (verbose) {
      console.log(`  ✓ External: ${link.url}`);
    }
    return true;
  }
  
  // Skip mailto and other protocols (but not Windows paths like C:\...)
  // Use proper scheme detection: scheme must start with letter, followed by alphanumeric/+/-/.
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(link.url)) {
    if (verbose) {
      console.log(`  ✓ Protocol: ${link.url}`);
    }
    return true;
  }
  
  // Parse link (may include anchor)
  const [linkPath, anchor] = link.url.split('#');
  
  // Resolve relative path
  const sourceDir = path.dirname(sourceFile);
  const targetPath = linkPath 
    ? path.resolve(sourceDir, linkPath)
    : sourceFile; // Same file anchor
  
  // Check if target file exists
  if (linkPath && !fs.existsSync(targetPath)) {
    console.log(`  ✗ Broken link in ${path.relative(DOCS_DIR, sourceFile)}`);
    console.log(`    Link: ${link.url}`);
    console.log(`    Text: ${link.text}`);
    console.log(`    Target not found: ${path.relative(DOCS_DIR, targetPath)}`);
    brokenLinks++;
    return false;
  }
  
  // Check anchor if present
  if (anchor) {
    const targetContent = fs.readFileSync(targetPath, 'utf8');
    const headers = extractHeaders(targetContent);
    
    if (!headers.includes(anchor)) {
      console.log(`  ✗ Broken anchor in ${path.relative(DOCS_DIR, sourceFile)}`);
      console.log(`    Link: ${link.url}`);
      console.log(`    Anchor not found: #${anchor}`);
      console.log(`    Available anchors: ${headers.slice(0, 5).join(', ')}${headers.length > 5 ? '...' : ''}`);
      brokenLinks++;
      return false;
    }
  }
  
  if (verbose) {
    console.log(`  ✓ Valid: ${link.url}`);
  }
  
  return true;
}

/**
 * Validate all links in a file
 */
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const links = extractLinks(content);
  
  if (links.length === 0) {
    if (verbose) {
      console.log(`\n📄 ${path.relative(DOCS_DIR, filePath)} - No links`);
    }
    return true;
  }
  
  console.log(`\n📄 ${path.relative(DOCS_DIR, filePath)} - ${links.length} links`);
  
  let allValid = true;
  links.forEach(link => {
    if (!validateLink(link, filePath)) {
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Main execution
 */
function main() {
  console.log('=== Documentation Link Validator ===\n');
  console.log(`Scanning: ${DOCS_DIR}\n`);
  
  const markdownFiles = getMarkdownFiles(DOCS_DIR);
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  let allValid = true;
  markdownFiles.forEach(file => {
    if (!validateFile(file)) {
      allValid = false;
    }
  });
  
  // Summary
  console.log('\n=== Validation Summary ===');
  console.log(`Total links checked: ${totalLinks}`);
  console.log(`Broken links: ${brokenLinks}`);
  
  if (allValid) {
    console.log('\n✓ All links are valid!');
    process.exit(0);
  } else {
    console.log('\n❌ Found broken links - please fix them');
    process.exit(1);
  }
}

// Run the validator
main();
