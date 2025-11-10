#!/usr/bin/env node

/**
 * Documentation Cross-Reference Checker
 * 
 * Checks that cross-references between documentation files are valid and bidirectional
 * where appropriate.
 * 
 * Usage: node docs/scripts/check-references.js [--verbose]
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..');
const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

/**
 * Get all markdown files recursively
 */
function getMarkdownFiles(dir, fileList = []) {
  let files;
  
  // Wrap readdirSync in try/catch to handle permission errors
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    // If reading directory fails, return current fileList and continue
    if (verbose) {
      console.warn(`Warning: Could not read directory ${dir}: ${err.message}`);
    }
    return fileList;
  }
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let stat;
    
    // Wrap statSync in try/catch to handle permission errors or bad paths
    try {
      stat = fs.statSync(filePath);
    } catch (err) {
      // Silently skip entries that can't be stat'd
      if (verbose) {
        console.warn(`Warning: Could not stat ${filePath}: ${err.message}`);
      }
      return; // Continue to next file
    }
    
    if (stat.isDirectory()) {
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
 * Extract internal links from content
 */
function extractInternalLinks(content, sourceFile) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];
    
    // Skip external links and protocols (but not Windows paths like C:\...)
    // Use proper scheme detection: scheme must start with letter, followed by alphanumeric/+/-/.
    if (url.startsWith('http://') || url.startsWith('https://') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(url)) {
      continue;
    }
    
    const [linkPath] = url.split('#');
    if (linkPath) {
      const sourceDir = path.dirname(sourceFile);
      const targetPath = path.resolve(sourceDir, linkPath);
      links.push(path.relative(DOCS_DIR, targetPath));
    }
  }
  
  return links;
}

/**
 * Build reference map
 */
function buildReferenceMap(files) {
  const referenceMap = new Map();
  const brokenLinks = [];
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const links = extractInternalLinks(content, file);
    const relativePath = path.relative(DOCS_DIR, file);
    
    referenceMap.set(relativePath, {
      path: file,
      linksTo: links,
      linkedFrom: [],
      brokenLinks: []
    });
  });
  
  // Build reverse references and detect broken links
  referenceMap.forEach((data, sourcePath) => {
    data.linksTo.forEach(targetPath => {
      const target = referenceMap.get(targetPath);
      if (target) {
        target.linkedFrom.push(sourcePath);
      } else {
        // Broken link detected - target file doesn't exist
        const brokenLink = {
          sourcePath: sourcePath,
          targetPath: targetPath,
          sourceFile: data.path
        };
        data.brokenLinks.push(brokenLink);
        brokenLinks.push(brokenLink);
      }
    });
  });
  
  return { referenceMap, brokenLinks };
}

/**
 * Find orphaned documents (not linked from anywhere)
 */
function findOrphanedDocs(referenceMap) {
  const orphaned = [];
  const importantFiles = ['README.md', 'MAINTENANCE.md'];
  
  referenceMap.forEach((data, filePath) => {
    const fileName = path.basename(filePath);
    
    // Skip index files and important root files
    if (fileName === 'README.md' || importantFiles.includes(fileName)) {
      return;
    }
    
    if (data.linkedFrom.length === 0) {
      orphaned.push(filePath);
    }
  });
  
  return orphaned;
}

/**
 * Find documents with no outgoing links
 */
function findDeadEnds(referenceMap) {
  const deadEnds = [];
  
  referenceMap.forEach((data, filePath) => {
    if (data.linksTo.length === 0) {
      deadEnds.push(filePath);
    }
  });
  
  return deadEnds;
}

/**
 * Suggest bidirectional links
 */
function suggestBidirectionalLinks(referenceMap) {
  const suggestions = [];
  
  referenceMap.forEach((data, sourcePath) => {
    data.linksTo.forEach(targetPath => {
      const target = referenceMap.get(targetPath);
      if (target && !target.linksTo.includes(sourcePath)) {
        // Check if it makes sense to have a bidirectional link
        const sourceDir = path.dirname(sourcePath);
        const targetDir = path.dirname(targetPath);
        
        // Suggest bidirectional links for docs in same or related sections
        if (sourceDir === targetDir || 
            sourceDir.startsWith(targetDir) || 
            targetDir.startsWith(sourceDir)) {
          suggestions.push({
            from: targetPath,
            to: sourcePath,
            reason: 'Related documents in same section'
          });
        }
      }
    });
  });
  
  return suggestions;
}

/**
 * Main execution
 */
function main() {
  console.log('=== Documentation Cross-Reference Checker ===\n');
  console.log(`Scanning: ${DOCS_DIR}\n`);
  
  const markdownFiles = getMarkdownFiles(DOCS_DIR);
  console.log(`Found ${markdownFiles.length} markdown files\n`);
  
  const { referenceMap, brokenLinks } = buildReferenceMap(markdownFiles);
  
  // Check for broken links first (most critical)
  console.log('--- Broken Links ---');
  if (brokenLinks.length > 0) {
    console.log(`Found ${brokenLinks.length} broken links:\n`);
    brokenLinks.forEach(link => {
      console.log(`  ❌ ${link.sourcePath}`);
      console.log(`     → ${link.targetPath} (file not found)`);
    });
    console.log('\nThese links point to non-existent files and must be fixed.\n');
  } else {
    console.log('✓ No broken links found\n');
  }
  
  // Find orphaned documents
  console.log('--- Orphaned Documents ---');
  const orphaned = findOrphanedDocs(referenceMap);
  if (orphaned.length > 0) {
    console.log(`Found ${orphaned.length} documents not linked from anywhere:\n`);
    orphaned.forEach(doc => {
      console.log(`  ⚠️  ${doc}`);
    });
    console.log('\nConsider linking these from relevant section READMEs or removing if obsolete.\n');
  } else {
    console.log('✓ No orphaned documents found\n');
  }
  
  // Find dead ends
  console.log('--- Dead End Documents ---');
  const deadEnds = findDeadEnds(referenceMap);
  if (deadEnds.length > 0) {
    console.log(`Found ${deadEnds.length} documents with no outgoing links:\n`);
    deadEnds.slice(0, 10).forEach(doc => {
      console.log(`  ℹ️  ${doc}`);
    });
    if (deadEnds.length > 10) {
      console.log(`  ... and ${deadEnds.length - 10} more`);
    }
    console.log('\nConsider adding "Related Documentation" sections to these files.\n');
  } else {
    console.log('✓ All documents have outgoing links\n');
  }
  
  // Suggest bidirectional links
  if (verbose) {
    console.log('--- Bidirectional Link Suggestions ---');
    const suggestions = suggestBidirectionalLinks(referenceMap);
    if (suggestions.length > 0) {
      console.log(`Found ${suggestions.length} potential bidirectional links:\n`);
      suggestions.slice(0, 10).forEach(suggestion => {
        console.log(`  💡 ${suggestion.from} → ${suggestion.to}`);
        console.log(`     Reason: ${suggestion.reason}`);
      });
      if (suggestions.length > 10) {
        console.log(`  ... and ${suggestions.length - 10} more suggestions`);
      }
      console.log();
    } else {
      console.log('✓ No additional bidirectional links suggested\n');
    }
  }
  
  // Summary
  console.log('=== Summary ===');
  console.log(`Total documents: ${markdownFiles.length}`);
  console.log(`Broken links: ${brokenLinks.length}`);
  console.log(`Orphaned documents: ${orphaned.length}`);
  console.log(`Dead end documents: ${deadEnds.length}`);
  
  if (brokenLinks.length > 0 || orphaned.length > 0) {
    if (brokenLinks.length > 0) {
      console.log('\n❌ Critical: Fix broken links');
    }
    if (orphaned.length > 0) {
      console.log('⚠️  Action required: Link or remove orphaned documents');
    }
    process.exit(1);
  } else {
    console.log('\n✓ Reference structure looks good!');
    process.exit(0);
  }
}

// Run the checker
main();
