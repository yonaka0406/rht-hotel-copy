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
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
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
    
    // Skip external links and protocols
    if (url.startsWith('http://') || url.startsWith('https://') || url.includes(':')) {
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
  
  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const links = extractInternalLinks(content, file);
    const relativePath = path.relative(DOCS_DIR, file);
    
    referenceMap.set(relativePath, {
      path: file,
      linksTo: links,
      linkedFrom: []
    });
  });
  
  // Build reverse references
  referenceMap.forEach((data, sourcePath) => {
    data.linksTo.forEach(targetPath => {
      const target = referenceMap.get(targetPath);
      if (target) {
        target.linkedFrom.push(sourcePath);
      }
    });
  });
  
  return referenceMap;
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
  
  const referenceMap = buildReferenceMap(markdownFiles);
  
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
  console.log(`Orphaned documents: ${orphaned.length}`);
  console.log(`Dead end documents: ${deadEnds.length}`);
  
  if (orphaned.length > 0) {
    console.log('\n⚠️  Action required: Link or remove orphaned documents');
    process.exit(1);
  } else {
    console.log('\n✓ Reference structure looks good!');
    process.exit(0);
  }
}

// Run the checker
main();
