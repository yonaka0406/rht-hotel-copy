#!/usr/bin/env node

/**
 * Documentation Migration Orchestrator
 * 
 * Master script that orchestrates the complete documentation migration process:
 * 1. Content migration with backup
 * 2. Link updating
 * 3. Content standardization
 */

const fs = require('fs');
const path = require('path');
const DocumentationMigrator = require('./migrate-docs');
const LinkManager = require('./link-manager');
const ContentStandardizer = require('./content-standardizer');

class MigrationOrchestrator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.skipBackup = options.skipBackup || false;
    
    this.results = {
      migration: null,
      linkUpdate: null,
      standardization: null,
      success: false,
      errors: []
    };
  }

  /**
   * Execute complete migration workflow
   */
  async execute() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     Documentation Migration Orchestrator                  ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Project: ${this.projectRoot}`);
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log('');
    
    try {
      // Step 1: Migrate content
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 1: Content Migration');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      const migrator = new DocumentationMigrator({
        projectRoot: this.projectRoot,
        dryRun: this.dryRun,
        verbose: this.verbose
      });
      
      this.results.migration = migrator.migrate();
      
      if (this.results.migration.errors.length > 0) {
        throw new Error(`Migration failed with ${this.results.migration.errors.length} error(s)`);
      }
      
      // Build relocation map for link updates
      const relocationMap = this.buildRelocationMap(this.results.migration.migrated);
      
      console.log('');
      console.log('✓ Content migration completed successfully');
      console.log('');
      
      // Step 2: Update links
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 2: Link Management');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      const linkManager = new LinkManager({
        projectRoot: this.projectRoot,
        dryRun: this.dryRun,
        verbose: this.verbose
      });
      
      // Update links based on relocation map
      if (Object.keys(relocationMap).length > 0) {
        linkManager.updateAllLinks(relocationMap);
      }
      
      // Validate all links
      this.results.linkUpdate = linkManager.validateAllLinks();
      
      console.log('');
      console.log('✓ Link management completed');
      console.log('');
      
      // Step 3: Standardize content
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('STEP 3: Content Standardization');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      
      const standardizer = new ContentStandardizer({
        projectRoot: this.projectRoot,
        dryRun: this.dryRun,
        verbose: this.verbose
      });
      
      this.results.standardization = standardizer.standardize();
      
      console.log('');
      console.log('✓ Content standardization completed');
      console.log('');
      
      // Final summary
      this.printFinalSummary();
      
      this.results.success = true;
      
      // Generate comprehensive report
      this.generateComprehensiveReport();
      
      return this.results;
      
    } catch (error) {
      console.error('');
      console.error('✗ Migration failed:', error.message);
      console.error('');
      this.results.errors.push(error.message);
      this.results.success = false;
      return this.results;
    }
  }

  /**
   * Build relocation map from migration results
   */
  buildRelocationMap(migratedFiles) {
    const map = {};
    
    for (const migration of migratedFiles) {
      map[migration.source] = migration.target;
    }
    
    return map;
  }

  /**
   * Print final summary
   */
  printFinalSummary() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    FINAL SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    if (this.results.migration) {
      console.log('Content Migration:');
      console.log(`  ✓ Files migrated: ${this.results.migration.migrated.length}`);
      console.log(`  ⊘ Files skipped: ${this.results.migration.skipped.length}`);
      console.log(`  ⚠ Duplicates detected: ${this.results.migration.duplicates.length}`);
      console.log(`  ✗ Errors: ${this.results.migration.errors.length}`);
      console.log('');
    }
    
    if (this.results.linkUpdate) {
      console.log('Link Management:');
      console.log(`  ✓ Files scanned: ${this.results.linkUpdate.scanned.length}`);
      console.log(`  ✓ Files updated: ${this.results.linkUpdate.updated.length}`);
      console.log(`  ✗ Broken links: ${this.results.linkUpdate.broken.length}`);
      console.log(`  → External links: ${this.results.linkUpdate.external.length}`);
      console.log('');
    }
    
    if (this.results.standardization) {
      console.log('Content Standardization:');
      console.log(`  ✓ Files processed: ${this.results.standardization.processed.length}`);
      console.log(`  ✓ Files modified: ${this.results.standardization.standardized.length}`);
      console.log(`  ⚠ Files with violations: ${this.results.standardization.violations.length}`);
      console.log(`  ✗ Errors: ${this.results.standardization.errors.length}`);
      console.log('');
    }
    
    if (this.dryRun) {
      console.log('⚠ This was a DRY RUN - no files were actually modified');
      console.log('  Run without --dry-run to apply changes');
      console.log('');
    } else {
      console.log('✓ All changes have been applied');
      console.log('  Backups are available in .doc-migration-backup/');
      console.log('');
    }
  }

  /**
   * Generate comprehensive report
   */
  generateComprehensiveReport() {
    const reportDir = path.join(this.projectRoot, '.doc-migration-backup');
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `migration-report-${timestamp}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      dryRun: this.dryRun,
      success: this.results.success,
      migration: this.results.migration,
      linkUpdate: this.results.linkUpdate,
      standardization: this.results.standardization,
      errors: this.results.errors
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Comprehensive report saved to: ${reportPath}`);
    console.log('');
  }

  /**
   * Rollback migration (restore from backup)
   */
  rollback() {
    console.log('Rolling back migration...');
    
    const backupDir = path.join(this.projectRoot, '.doc-migration-backup');
    
    if (!fs.existsSync(backupDir)) {
      console.error('No backup directory found. Cannot rollback.');
      return false;
    }
    
    // Find all backup files
    const backups = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.bak'))
      .map(f => path.join(backupDir, f));
    
    console.log(`Found ${backups.length} backup file(s)`);
    
    for (const backupPath of backups) {
      try {
        // Extract original filename
        const fileName = path.basename(backupPath).replace(/\.\d{4}-\d{2}-\d{2}.*\.bak$/, '');
        const originalPath = path.join(this.projectRoot, fileName);
        
        // Restore backup
        fs.copyFileSync(backupPath, originalPath);
        console.log(`✓ Restored: ${fileName}`);
      } catch (error) {
        console.error(`✗ Failed to restore ${backupPath}: ${error.message}`);
      }
    }
    
    console.log('Rollback completed');
    return true;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    skipBackup: args.includes('--skip-backup'),
    projectRoot: process.cwd()
  };
  
  const orchestrator = new MigrationOrchestrator(options);
  
  if (command === 'rollback') {
    orchestrator.rollback();
  } else {
    orchestrator.execute().then(results => {
      process.exit(results.success ? 0 : 1);
    });
  }
}

module.exports = MigrationOrchestrator;
