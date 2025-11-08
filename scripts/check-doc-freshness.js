#!/usr/bin/env node

/**
 * Documentation Freshness Checker
 * 
 * Identifies outdated documentation by analyzing:
 * - Last modification date
 * - Related code file changes
 * - Version mismatches
 * - Stale content indicators
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const CODE_DIRS = [
  path.join(__dirname, '..', 'api'),
  path.join(__dirname, '..', 'frontend'),
  path.join(__dirname, '..', 'server')
];
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];
const STALE_THRESHOLD_DAYS = 180; // 6 months
const WARNING_THRESHOLD_DAYS = 90; // 3 months

// Results tracking
const results = {
  totalFiles: 0,
  staleFiles: [],
  warningFiles: [],
  recentFiles: [],
  errors: []
};

/**
 * Get file modification date using git
 */
function getGitLastModified(filePath) {
  try {
    const result = execSync(
      `git log -1 --format=%ct "${filePath}"`,
      { encoding: 'utf8', cwd: path.dirname(filePath) }
    ).trim();
    
    if (result) {
      return new Date(parseInt(result) * 1000);
    }
  } catch (error) {
    // Fall back to file system date if git fails
  }
  
  return null;
}

/**
 * Get file modification date from file system
 */
function getFileSystemLastModified(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtime;
  } catch (error) {
    return null;
  }
}

/**
 * Get last modification date (prefer git, fallback to fs)
 */
function getLastModified(filePath) {
  return getGitLastModified(filePath) || getFileSystemLastModified(filePath);
}

/**
 * Calculate days since last modification
 */
function daysSinceModified(date) {
  const now = new Date();
  const diffTime = Math.abs(now - date);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Extract metadata from markdown frontmatter
 */
function extractMetadata(content) {
  const metadata = {
    version: null,
    lastUpdated: null,
    status: null
  };
  
  // Check for YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];
    
    const versionMatch = frontmatter.match(/version:\s*(.+)/i);
    if (versionMatch) metadata.version = versionMatch[1].trim();
    
    const dateMatch = frontmatter.match(/(?:last[_\s]?updated|date):\s*(.+)/i);
    if (dateMatch) metadata.lastUpdated = dateMatch[1].trim();
    
    const statusMatch = frontmatter.match(/status:\s*(.+)/i);
    if (statusMatch) metadata.status = statusMatch[1].trim();
  }
  
  // Check for metadata in document information section
  const docInfoMatch = content.match(/##\s*Document Information[\s\S]*?(?=\n##|$)/i);
  if (docInfoMatch) {
    const docInfo = docInfoMatch[0];
    
    if (!metadata.version) {
      const versionMatch = docInfo.match(/\*\*Version\*\*:\s*(.+)/i);
      if (versionMatch) metadata.version = versionMatch[1].trim();
    }
    
    if (!metadata.lastUpdated) {
      const dateMatch = docInfo.match(/\*\*Last Updated\*\*:\s*(.+)/i);
      if (dateMatch) metadata.lastUpdated = dateMatch[1].trim();
    }
    
    if (!metadata.status) {
      const statusMatch = docInfo.match(/\*\*Status\*\*:\s*(.+)/i);
      if (statusMatch) metadata.status = statusMatch[1].trim();
    }
  }
  
  return metadata;
}

/**
 * Check for stale content indicators
 */
function checkStaleIndicators(content) {
  const indicators = [];
  
  // Check for TODO/FIXME markers
  if (content.match(/\[TODO\]|\[FIXME\]|TODO:|FIXME:/gi)) {
    indicators.push('Contains TODO/FIXME markers');
  }
  
  // Check for placeholder text
  if (content.match(/\[.*?\]|\{.*?\}|TBD|To be determined/gi)) {
    const placeholderCount = (content.match(/\[.*?\]/g) || []).length;
    if (placeholderCount > 5) {
      indicators.push(`Contains ${placeholderCount} placeholder sections`);
    }
  }
  
  // Check for deprecated status
  if (content.match(/deprecated|obsolete|no longer (used|maintained|supported)/gi)) {
    indicators.push('Marked as deprecated or obsolete');
  }
  
  // Check for old date references
  const yearMatches = content.match(/20\d{2}/g);
  if (yearMatches) {
    const currentYear = new Date().getFullYear();
    const oldYears = yearMatches.filter(year => parseInt(year) < currentYear - 1);
    if (oldYears.length > 3) {
      indicators.push('Contains multiple references to old years');
    }
  }
  
  return indicators;
}

/**
 * Find related code files
 */
function findRelatedCodeFiles(docPath) {
  const relatedFiles = [];
  const docName = path.basename(docPath, path.extname(docPath));
  
  // Search for files with similar names in code directories
  CODE_DIRS.forEach(codeDir => {
    if (!fs.existsSync(codeDir)) return;
    
    try {
      const files = execSync(
        `find "${codeDir}" -type f \\( -name "*.js" -o -name "*.ts" -o -name "*.jsx" -o -name "*.tsx" \\) 2>/dev/null || true`,
        { encoding: 'utf8', shell: '/bin/bash' }
      ).trim().split('\n').filter(Boolean);
      
      files.forEach(file => {
        const fileName = path.basename(file, path.extname(file));
        if (fileName.toLowerCase().includes(docName.toLowerCase()) ||
            docName.toLowerCase().includes(fileName.toLowerCase())) {
          relatedFiles.push(file);
        }
      });
    } catch (error) {
      // Silently continue if find command fails
    }
  });
  
  return relatedFiles;
}

/**
 * Check if related code has been modified more recently
 */
function checkCodeChanges(docPath, docModified) {
  const relatedFiles = findRelatedCodeFiles(docPath);
  const newerFiles = [];
  
  relatedFiles.forEach(codeFile => {
    const codeModified = getLastModified(codeFile);
    if (codeModified && codeModified > docModified) {
      const daysDiff = daysSinceModified(codeModified);
      newerFiles.push({
        file: path.relative(path.join(__dirname, '..'), codeFile),
        daysSince: daysDiff
      });
    }
  });
  
  return newerFiles;
}

/**
 * Process a single markdown file
 */
function processFile(filePath) {
  results.totalFiles++;
  
  const relativePath = path.relative(DOCS_DIR, filePath);
  const lastModified = getLastModified(filePath);
  
  if (!lastModified) {
    results.errors.push(`Could not determine modification date for ${relativePath}`);
    return;
  }
  
  const daysSince = daysSinceModified(lastModified);
  const content = fs.readFileSync(filePath, 'utf8');
  const metadata = extractMetadata(content);
  const staleIndicators = checkStaleIndicators(content);
  const newerCodeFiles = checkCodeChanges(filePath, lastModified);
  
  const fileInfo = {
    path: relativePath,
    lastModified: lastModified.toISOString().split('T')[0],
    daysSince,
    metadata,
    staleIndicators,
    newerCodeFiles
  };
  
  if (daysSince > STALE_THRESHOLD_DAYS || staleIndicators.length > 0 || newerCodeFiles.length > 0) {
    results.staleFiles.push(fileInfo);
  } else if (daysSince > WARNING_THRESHOLD_DAYS) {
    results.warningFiles.push(fileInfo);
  } else {
    results.recentFiles.push(fileInfo);
  }
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
  console.log('\n=== Documentation Freshness Report ===\n');
  
  console.log(`Files analyzed: ${results.totalFiles}`);
  console.log(`Stale files: ${results.staleFiles.length}`);
  console.log(`Warning files: ${results.warningFiles.length}`);
  console.log(`Recent files: ${results.recentFiles.length}`);
  
  if (results.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${results.errors.length}`);
    results.errors.forEach(error => {
      console.log(`  - ${error}`);
    });
  }
  
  if (results.staleFiles.length > 0) {
    console.log('\n🔴 Stale Documentation (Needs Review):\n');
    
    results.staleFiles
      .sort((a, b) => b.daysSince - a.daysSince)
      .forEach(file => {
        console.log(`📄 ${file.path}`);
        console.log(`   Last modified: ${file.lastModified} (${file.daysSince} days ago)`);
        
        if (file.metadata.status) {
          console.log(`   Status: ${file.metadata.status}`);
        }
        
        if (file.staleIndicators.length > 0) {
          console.log(`   Issues:`);
          file.staleIndicators.forEach(indicator => {
            console.log(`     - ${indicator}`);
          });
        }
        
        if (file.newerCodeFiles.length > 0) {
          console.log(`   Related code modified more recently:`);
          file.newerCodeFiles.slice(0, 3).forEach(codeFile => {
            console.log(`     - ${codeFile.file} (${codeFile.daysSince} days ago)`);
          });
        }
        
        console.log('');
      });
  }
  
  if (results.warningFiles.length > 0) {
    console.log('\n🟡 Documentation Approaching Staleness:\n');
    
    results.warningFiles
      .sort((a, b) => b.daysSince - a.daysSince)
      .forEach(file => {
        console.log(`📄 ${file.path}`);
        console.log(`   Last modified: ${file.lastModified} (${file.daysSince} days ago)`);
        console.log('');
      });
  }
  
  if (results.staleFiles.length === 0 && results.warningFiles.length === 0) {
    console.log('\n✅ All documentation is up to date!\n');
  }
  
  // Summary statistics
  console.log('\n=== Summary ===\n');
  console.log(`Thresholds:`);
  console.log(`  Warning: ${WARNING_THRESHOLD_DAYS} days`);
  console.log(`  Stale: ${STALE_THRESHOLD_DAYS} days`);
  console.log('');
  console.log(`Distribution:`);
  console.log(`  Recent (< ${WARNING_THRESHOLD_DAYS} days): ${results.recentFiles.length}`);
  console.log(`  Warning (${WARNING_THRESHOLD_DAYS}-${STALE_THRESHOLD_DAYS} days): ${results.warningFiles.length}`);
  console.log(`  Stale (> ${STALE_THRESHOLD_DAYS} days): ${results.staleFiles.length}`);
  console.log('');
  
  return results.staleFiles.length === 0;
}

/**
 * Main execution
 */
function main() {
  console.log('Starting documentation freshness check...\n');
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
  
  // Exit with warning code if there are stale files
  process.exit(success ? 0 : 2);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { extractMetadata, checkStaleIndicators, daysSinceModified };
