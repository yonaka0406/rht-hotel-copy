#!/usr/bin/env node

/**
 * Documentation Migration Cleanup Script
 * 
 * This script handles the final cleanup phase of documentation migration:
 * - Archives original scattered documentation files
 * - Creates redirect mappings for external references
 * - Validates migration completeness
 * 
 * Usage: node docs/scripts/migration-cleanup.js [--dry-run] [--archive-only]
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '../..');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const ARCHIVE_DIR = path.join(DOCS_DIR, 'archive', 'pre-migration');
const REDIRECT_MAP_FILE = path.join(DOCS_DIR, 'redirect-mappings.json');

// Files to archive (migrated root-level documentation)
const FILES_TO_ARCHIVE = [
  'ARCHITECTURE.md',
  'BOOKING_ENGINE_API_DOCUMENTATION.md',
  'BOOKING_ENGINE_INTEGRATION_STRATEGY.md',
  'STATE_MGMT.md',
  'square_payment_integration.md',
  'BUGS.md',
  'DEALT.md',
  'GEMINI.md'
];

// Redirect mappings for external references
const REDIRECT_MAPPINGS = {
  'ARCHITECTURE.md': 'docs/architecture/README.md',
  'BOOKING_ENGINE_API_DOCUMENTATION.md': 'docs/api/endpoints/booking-engine.md',
  'BOOKING_ENGINE_INTEGRATION_STRATEGY.md': 'docs/integrations/booking-engine/overview.md',
  'STATE_MGMT.md': 'docs/frontend/state-management.md',
  'square_payment_integration.md': 'docs/integrations/payment-systems/square-integration.md',
  'BUGS.md': 'docs/reference/known-issues.md',
  'DEALT.md': 'docs/archive/pre-migration/DEALT.md',
  'GEMINI.md': 'docs/archive/pre-migration/GEMINI.md'
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const archiveOnly = args.includes('--archive-only');

console.log('=== Documentation Migration Cleanup ===\n');
if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No files will be modified\n');
}

/**
 * Create archive directory if it doesn't exist
 */
function ensureArchiveDirectory() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    console.log(`📁 Creating archive directory: ${ARCHIVE_DIR}`);
    if (!isDryRun) {
      fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    }
  }
}

/**
 * Archive a file from root to archive directory
 */
function archiveFile(filename) {
  const sourcePath = path.join(ROOT_DIR, filename);
  const destPath = path.join(ARCHIVE_DIR, filename);

  if (!fs.existsSync(sourcePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return false;
  }

  console.log(`📦 Archiving: ${filename}`);
  if (!isDryRun) {
    try {
      fs.copyFileSync(sourcePath, destPath);
      fs.unlinkSync(sourcePath);
      console.log(`   ✓ Moved to: ${path.relative(ROOT_DIR, destPath)}`);
    } catch (error) {
      console.error(`   ✗ Error archiving ${filename}:`, error.message);
      return false;
    }
  } else {
    console.log(`   → Would move to: ${path.relative(ROOT_DIR, destPath)}`);
  }
  return true;
}

/**
 * Create redirect mappings file
 */
function createRedirectMappings() {
  console.log('\n📋 Creating redirect mappings...');
  
  const mappings = {
    version: '1.0.0',
    created: new Date().toISOString(),
    description: 'Redirect mappings for migrated documentation files',
    mappings: REDIRECT_MAPPINGS,
    usage: {
      description: 'Use these mappings to update external references',
      example: 'If external link points to /ARCHITECTURE.md, update to /docs/architecture/README.md'
    }
  };

  if (!isDryRun) {
    try {
      fs.writeFileSync(REDIRECT_MAP_FILE, JSON.stringify(mappings, null, 2));
      console.log(`✓ Created: ${path.relative(ROOT_DIR, REDIRECT_MAP_FILE)}`);
    } catch (error) {
      console.error('✗ Error creating redirect mappings:', error.message);
      return false;
    }
  } else {
    console.log(`→ Would create: ${path.relative(ROOT_DIR, REDIRECT_MAP_FILE)}`);
  }
  return true;
}

/**
 * Create archive README with context
 */
function createArchiveReadme() {
  const readmePath = path.join(ARCHIVE_DIR, 'README.md');
  const content = `# Pre-Migration Documentation Archive

This directory contains the original documentation files that were located at the project root level before the documentation reorganization.

## Archive Date
${new Date().toISOString().split('T')[0]}

## Archived Files
${FILES_TO_ARCHIVE.map(f => `- ${f}`).join('\n')}

## Migration Information

These files have been migrated to the new documentation structure. See \`../redirect-mappings.json\` for the mapping of old locations to new locations.

### Why These Files Were Archived

1. **Content Migrated**: All valuable content has been consolidated into the new docs/ structure
2. **Improved Organization**: Content is now organized by topic and audience
3. **Better Navigation**: New structure provides clearer navigation and discoverability
4. **Reduced Clutter**: Root directory is cleaner and more focused on project essentials

## Accessing Migrated Content

To find the migrated content, refer to:
- Main documentation index: \`../README.md\`
- Redirect mappings: \`../redirect-mappings.json\`
- Architecture docs: \`../architecture/\`
- API docs: \`../api/\`
- Integration docs: \`../integrations/\`

## Restoration

If you need to restore any of these files, they are preserved here in their original form. However, we recommend using the new documentation structure as it provides better organization and maintainability.
`;

  console.log('\n📝 Creating archive README...');
  if (!isDryRun) {
    try {
      fs.writeFileSync(readmePath, content);
      console.log(`✓ Created: ${path.relative(ROOT_DIR, readmePath)}`);
    } catch (error) {
      console.error('✗ Error creating archive README:', error.message);
      return false;
    }
  } else {
    console.log(`→ Would create: ${path.relative(ROOT_DIR, readmePath)}`);
  }
  return true;
}

/**
 * Validate migration completeness
 */
function validateMigration() {
  console.log('\n🔍 Validating migration completeness...');
  
  const issues = [];
  
  // Check that all expected new documentation exists
  const expectedDocs = Object.values(REDIRECT_MAPPINGS)
    .filter(p => p.startsWith('docs/') && !p.includes('archive'));
  
  expectedDocs.forEach(docPath => {
    const fullPath = path.join(ROOT_DIR, docPath);
    if (!fs.existsSync(fullPath)) {
      issues.push(`Missing migrated file: ${docPath}`);
    }
  });
  
  // Check for any remaining root-level .md files that might need attention
  const rootFiles = fs.readdirSync(ROOT_DIR)
    .filter(f => f.endsWith('.md') && f !== 'README.md' && f !== 'CHANGELOG.md');
  
  if (rootFiles.length > 0) {
    console.log('\n⚠️  Additional markdown files found at root:');
    rootFiles.forEach(f => console.log(`   - ${f}`));
    console.log('   Review these files to determine if they should be migrated or archived.');
  }
  
  if (issues.length > 0) {
    console.log('\n❌ Validation Issues:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    return false;
  }
  
  console.log('✓ Migration validation passed');
  return true;
}

/**
 * Main execution
 */
function main() {
  let success = true;
  
  // Step 1: Ensure archive directory exists
  ensureArchiveDirectory();
  
  // Step 2: Archive files
  console.log('\n--- Archiving Files ---');
  FILES_TO_ARCHIVE.forEach(file => {
    if (!archiveFile(file)) {
      success = false;
    }
  });
  
  if (archiveOnly) {
    console.log('\n✓ Archive-only mode complete');
    return;
  }
  
  // Step 3: Create archive README
  if (!createArchiveReadme()) {
    success = false;
  }
  
  // Step 4: Create redirect mappings
  if (!createRedirectMappings()) {
    success = false;
  }
  
  // Step 5: Validate migration
  if (!validateMigration()) {
    success = false;
  }
  
  // Summary
  console.log('\n=== Cleanup Summary ===');
  if (success) {
    console.log('✓ All cleanup tasks completed successfully');
    if (!isDryRun) {
      console.log('\nNext steps:');
      console.log('1. Review archived files in docs/archive/pre-migration/');
      console.log('2. Update any external references using docs/redirect-mappings.json');
      console.log('3. Commit changes to version control');
    }
  } else {
    console.log('❌ Some cleanup tasks failed - review errors above');
    process.exit(1);
  }
}

// Run the script
main();
