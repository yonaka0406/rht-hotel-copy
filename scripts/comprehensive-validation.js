#!/usr/bin/env node

/**
 * Comprehensive Documentation Validation
 * 
 * Performs complete validation testing including:
 * - Link integrity across all documentation
 * - Content completeness verification
 * - Cross-reference system validation
 * - Migration verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const ROOT_DIR = path.join(__dirname, '..');
const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

// Expected documentation structure
const EXPECTED_STRUCTURE = {
  'README.md': 'Main documentation index',
  'getting-started/README.md': 'Getting started overview',
  'architecture/README.md': 'Architecture overview',
  'api/README.md': 'API overview',
  'frontend/README.md': 'Frontend overview',
  'backend/README.md': 'Backend overview',
  'deployment/README.md': 'Deployment overview',
  'integrations/README.md': 'Integrations overview',
  'features/README.md': 'Features overview',
  'development/README.md': 'Development overview',
  'reference/README.md': 'Reference overview',
  'templates/README.md': 'Templates overview'
};

// Results tracking
const results = {
  linkValidation: null,
  formatValidation: null,
  freshnessCheck: null,
  structureValidation: { passed: false, issues: [] },
  contentCompleteness: { passed: false, issues: [] },
  crossReferences: { passed: false, issues: [] },
  migrationVerification: { passed: false, issues: [] }
};

/**
 * Run external validation script
 */
function runValidationScript(scriptName, description) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Running ${description}...`);
  console.log('='.repeat(70));
  
  try {
    const scriptPath = path.join(__dirname, scriptName);
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: ROOT_DIR
    });
    return { passed: true, exitCode: 0 };
  } catch (error) {
    return { passed: false, exitCode: error.status || 1 };
  }
}

/**
 * Validate documentation structure
 */
function validateStructure() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Validating Documentation Structure...');
  console.log('='.repeat(70));
  
  const issues = [];
  
  // Check for expected files
  Object.entries(EXPECTED_STRUCTURE).forEach(([filePath, description]) => {
    const fullPath = path.join(DOCS_DIR, filePath);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Missing: ${filePath} (${description})`);
    }
  });
  
  // Check for orphaned files at root level
  const rootFiles = fs.readdirSync(ROOT_DIR);
  const docFiles = rootFiles.filter(file => {
    const ext = path.extname(file);
    return MARKDOWN_EXTENSIONS.includes(ext) && 
           file !== 'README.md' && 
           file !== 'CHANGELOG.md';
  });
  
  if (docFiles.length > 0) {
    issues.push(`Found ${docFiles.length} documentation files at root level that should be in docs/:`);
    docFiles.forEach(file => {
      issues.push(`  - ${file}`);
    });
  }
  
  // Report results
  if (issues.length === 0) {
    console.log('\n✅ Documentation structure is correct\n');
    return { passed: true, issues: [] };
  } else {
    console.log('\n❌ Structure Issues Found:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Check content completeness
 */
function checkContentCompleteness() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Checking Content Completeness...');
  console.log('='.repeat(70));
  
  const issues = [];
  
  // Find all markdown files
  const markdownFiles = findMarkdownFiles(DOCS_DIR);
  
  // Check each file for completeness
  markdownFiles.forEach(filePath => {
    const relativePath = path.relative(DOCS_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for empty or very short files
    if (content.trim().length < 100) {
      issues.push(`${relativePath}: File is too short (< 100 characters)`);
    }
    
    // Check for missing headers
    if (!content.match(/^#\s+.+/m)) {
      issues.push(`${relativePath}: Missing main heading`);
    }
    
    // Check for excessive placeholders
    const placeholders = (content.match(/\[TODO\]|\[FIXME\]|\[TBD\]/gi) || []).length;
    if (placeholders > 5) {
      issues.push(`${relativePath}: Contains ${placeholders} TODO/FIXME/TBD markers`);
    }
    
    // Check for broken image references
    const imageRefs = content.match(/!\[.*?\]\((.*?)\)/g);
    if (imageRefs) {
      imageRefs.forEach(ref => {
        const match = ref.match(/!\[.*?\]\((.*?)\)/);
        if (match) {
          const imagePath = match[1];
          if (!imagePath.startsWith('http') && !imagePath.startsWith('//')) {
            const fullImagePath = path.resolve(path.dirname(filePath), imagePath);
            if (!fs.existsSync(fullImagePath)) {
              issues.push(`${relativePath}: Missing image: ${imagePath}`);
            }
          }
        }
      });
    }
  });
  
  // Report results
  if (issues.length === 0) {
    console.log('\n✅ All documentation content is complete\n');
    return { passed: true, issues: [] };
  } else {
    console.log('\n⚠️  Content Completeness Issues:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Validate cross-reference system
 */
function validateCrossReferences() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Validating Cross-Reference System...');
  console.log('='.repeat(70));
  
  const issues = [];
  const markdownFiles = findMarkdownFiles(DOCS_DIR);
  
  // Build a map of all files and their sections
  const fileMap = new Map();
  markdownFiles.forEach(filePath => {
    const relativePath = path.relative(DOCS_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = extractSections(content);
    fileMap.set(relativePath, { path: filePath, sections });
  });
  
  // Check for bidirectional linking
  const linkGraph = new Map();
  markdownFiles.forEach(filePath => {
    const relativePath = path.relative(DOCS_DIR, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const links = extractInternalLinks(content, filePath);
    linkGraph.set(relativePath, links);
  });
  
  // Check for isolated documents (no incoming or outgoing links)
  linkGraph.forEach((outgoingLinks, file) => {
    const hasOutgoing = outgoingLinks.length > 0;
    const hasIncoming = Array.from(linkGraph.values()).some(links => 
      links.some(link => link.includes(file))
    );
    
    // Skip index files as they're expected to be linked from
    if (!file.includes('README.md') && !hasOutgoing && !hasIncoming) {
      issues.push(`${file}: Isolated document (no links in or out)`);
    }
  });
  
  // Report results
  if (issues.length === 0) {
    console.log('\n✅ Cross-reference system is well-connected\n');
    return { passed: true, issues: [] };
  } else {
    console.log('\n⚠️  Cross-Reference Issues:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Verify migration completeness
 */
function verifyMigration() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('Verifying Migration Completeness...');
  console.log('='.repeat(70));
  
  const issues = [];
  
  // Check for old documentation files at root
  const oldDocFiles = [
    'ARCHITECTURE.md',
    'BOOKING_ENGINE_API_DOCUMENTATION.md',
    'BOOKING_ENGINE_INTEGRATION_STRATEGY.md',
    'STATE_MGMT.md',
    'square_payment_integration.md'
  ];
  
  oldDocFiles.forEach(file => {
    const fullPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(fullPath)) {
      issues.push(`Old documentation file still exists: ${file}`);
    }
  });
  
  // Check that content was migrated to new locations
  const expectedMigrations = {
    'ARCHITECTURE.md': 'docs/architecture/',
    'STATE_MGMT.md': 'docs/frontend/state-management.md',
    'BOOKING_ENGINE_API_DOCUMENTATION.md': 'docs/api/endpoints/booking-engine.md',
    'BOOKING_ENGINE_INTEGRATION_STRATEGY.md': 'docs/integrations/booking-engine/',
    'square_payment_integration.md': 'docs/integrations/payment-systems/square-integration.md'
  };
  
  Object.entries(expectedMigrations).forEach(([oldFile, newLocation]) => {
    const newPath = path.join(ROOT_DIR, newLocation);
    if (!fs.existsSync(newPath)) {
      issues.push(`Migration target missing: ${newLocation} (from ${oldFile})`);
    }
  });
  
  // Report results
  if (issues.length === 0) {
    console.log('\n✅ Migration is complete\n');
    return { passed: true, issues: [] };
  } else {
    console.log('\n⚠️  Migration Issues:\n');
    issues.forEach(issue => console.log(`  ${issue}`));
    console.log('');
    return { passed: false, issues };
  }
}

/**
 * Extract sections from markdown content
 */
function extractSections(content) {
  const sections = [];
  const headerRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;
  
  while ((match = headerRegex.exec(content)) !== null) {
    sections.push(match[2].trim());
  }
  
  return sections;
}

/**
 * Extract internal links from markdown content
 */
function extractInternalLinks(content, sourceFile) {
  const links = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkRegex.exec(content)) !== null) {
    const link = match[2];
    
    // Skip external links
    if (link.startsWith('http://') || link.startsWith('https://') || link.startsWith('//')) {
      continue;
    }
    
    // Skip protocol links
    if (link.includes(':')) {
      continue;
    }
    
    links.push(link);
  }
  
  return links;
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
    console.error(`Error reading directory ${dir}: ${error.message}`);
  }
  
  return files;
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log(`\n${'='.repeat(70)}`);
  console.log('COMPREHENSIVE VALIDATION REPORT');
  console.log('='.repeat(70));
  
  const checks = [
    { name: 'Link Validation', result: results.linkValidation },
    { name: 'Format Validation', result: results.formatValidation },
    { name: 'Freshness Check', result: results.freshnessCheck },
    { name: 'Structure Validation', result: results.structureValidation },
    { name: 'Content Completeness', result: results.contentCompleteness },
    { name: 'Cross-References', result: results.crossReferences },
    { name: 'Migration Verification', result: results.migrationVerification }
  ];
  
  let allPassed = true;
  let hasWarnings = false;
  
  console.log('\nValidation Results:\n');
  checks.forEach(check => {
    let status;
    if (check.result) {
      status = check.result.passed ? '✅' : '❌';
      if (!check.result.passed) {
        allPassed = false;
      }
      if (check.result.exitCode === 2) {
        hasWarnings = true;
      }
    } else {
      status = '❌ (no result)';
      allPassed = false; // If there's no result, it's a failure
    }
    console.log(`  ${status} ${check.name}`);
  });
  
  console.log('\n' + '='.repeat(70));
  
  if (allPassed) {
    console.log('\n🎉 All validation checks passed!\n');
    return 0;
  } else if (hasWarnings) {
    console.log('\n⚠️  Validation completed with warnings\n');
    return 2;
  } else {
    console.log('\n❌ Validation failed - please address the issues above\n');
    return 1;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║     Comprehensive Documentation Validation Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documentation directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }
  
  // Run external validation scripts
  results.linkValidation = runValidationScript('validate-doc-links.js', 'Link Validation');
  results.formatValidation = runValidationScript('validate-doc-format.js', 'Format Validation');
  results.freshnessCheck = runValidationScript('check-doc-freshness.js', 'Freshness Check');
  
  // Run internal validation checks
  results.structureValidation = validateStructure();
  results.contentCompleteness = checkContentCompleteness();
  results.crossReferences = validateCrossReferences();
  results.migrationVerification = verifyMigration();
  
  // Generate final report
  const exitCode = generateReport();
  process.exit(exitCode);
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  validateStructure,
  checkContentCompleteness,
  validateCrossReferences,
  verifyMigration
};
