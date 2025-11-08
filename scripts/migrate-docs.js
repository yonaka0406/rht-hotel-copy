#!/usr/bin/env node

/**
 * Documentation Migration Utility
 * 
 * This script systematically moves documentation files from root level to appropriate
 * docs/ subdirectories, detects duplicate content, and creates backups.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class DocumentationMigrator {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || process.cwd();
    this.docsRoot = path.join(this.projectRoot, 'docs');
    this.backupDir = path.join(this.projectRoot, '.doc-migration-backup');
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    
    // Migration mapping: source file -> target location
    this.migrationMap = {
      'ARCHITECTURE.md': 'docs/architecture/system-overview.md',
      'STATE_MGMT.md': 'docs/frontend/state-management.md',
      'BOOKING_ENGINE_API_DOCUMENTATION.md': 'docs/api/endpoints/booking-engine.md',
      'BOOKING_ENGINE_INTEGRATION_STRATEGY.md': 'docs/integrations/booking-engine/integration-strategy.md',
      'square_payment_integration.md': 'docs/integrations/payment-systems/square-integration.md',
      'BUGS.md': 'docs/reference/known-issues.md',
      'CHANGELOG.md': 'docs/reference/changelog.md',
      'GEMINI.md': 'docs/development/ai-assistance-guide.md',
      'DEALT.md': 'docs/reference/dealt-items.md',
      'instructions.md': 'docs/development/project-instructions.md'
    };
    
    this.results = {
      migrated: [],
      skipped: [],
      duplicates: [],
      errors: []
    };
  }

  /**
   * Calculate MD5 hash of file content for duplicate detection
   */
  calculateFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if two files have similar content (duplicate detection)
   */
  areFilesSimilar(file1Path, file2Path, threshold = 0.8) {
    try {
      const content1 = fs.readFileSync(file1Path, 'utf8');
      const content2 = fs.readFileSync(file2Path, 'utf8');
      
      // Normalize content for comparison
      const normalize = (text) => text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
      
      const norm1 = normalize(content1);
      const norm2 = normalize(content2);
      
      // Simple similarity check based on common words
      const words1 = new Set(norm1.split(' '));
      const words2 = new Set(norm2.split(' '));
      
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      const similarity = intersection.size / union.size;
      
      return similarity >= threshold;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create backup of a file before migration
   */
  createBackup(filePath) {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      
      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `${fileName}.${timestamp}.bak`);
      
      fs.copyFileSync(filePath, backupPath);
      this.log(`✓ Backup created: ${backupPath}`, 'verbose');
      
      return backupPath;
    } catch (error) {
      this.log(`✗ Backup failed for ${filePath}: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Ensure target directory exists
   */
  ensureDirectory(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      this.log(`✓ Created directory: ${dirPath}`, 'verbose');
    }
  }

  /**
   * Move file to new location
   */
  moveFile(sourcePath, targetPath) {
    try {
      const targetDir = path.dirname(targetPath);
      this.ensureDirectory(targetDir);
      
      // Check if target already exists
      if (fs.existsSync(targetPath)) {
        // Check for duplicate content
        if (this.areFilesSimilar(sourcePath, targetPath)) {
          this.results.duplicates.push({
            source: sourcePath,
            target: targetPath,
            action: 'skipped',
            reason: 'Similar content already exists at target'
          });
          this.log(`⚠ Duplicate content detected: ${sourcePath} -> ${targetPath}`, 'warning');
          return false;
        } else {
          // Different content, create versioned backup
          const backupPath = targetPath + '.original';
          fs.copyFileSync(targetPath, backupPath);
          this.log(`⚠ Target exists with different content, created backup: ${backupPath}`, 'warning');
        }
      }
      
      // Create backup of source
      this.createBackup(sourcePath);
      
      if (!this.dryRun) {
        // Copy file to new location
        fs.copyFileSync(sourcePath, targetPath);
        this.log(`✓ Migrated: ${sourcePath} -> ${targetPath}`, 'info');
      } else {
        this.log(`[DRY RUN] Would migrate: ${sourcePath} -> ${targetPath}`, 'info');
      }
      
      this.results.migrated.push({
        source: sourcePath,
        target: targetPath,
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      this.results.errors.push({
        source: sourcePath,
        target: targetPath,
        error: error.message
      });
      this.log(`✗ Migration failed: ${sourcePath} -> ${targetPath}: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Scan for potential duplicate content in docs directory
   */
  scanForDuplicates() {
    const duplicates = [];
    const fileHashes = new Map();
    
    const scanDirectory = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const hash = this.calculateFileHash(fullPath);
          if (hash) {
            if (fileHashes.has(hash)) {
              duplicates.push({
                file1: fileHashes.get(hash),
                file2: fullPath,
                hash: hash
              });
            } else {
              fileHashes.set(hash, fullPath);
            }
          }
        }
      }
    };
    
    scanDirectory(this.docsRoot);
    return duplicates;
  }

  /**
   * Execute migration for all mapped files
   */
  migrate() {
    this.log('=== Documentation Migration Started ===', 'info');
    this.log(`Project Root: ${this.projectRoot}`, 'info');
    this.log(`Backup Directory: ${this.backupDir}`, 'info');
    this.log(`Dry Run: ${this.dryRun}`, 'info');
    this.log('', 'info');
    
    // Scan for existing duplicates
    this.log('Scanning for existing duplicates...', 'info');
    const existingDuplicates = this.scanForDuplicates();
    if (existingDuplicates.length > 0) {
      this.log(`Found ${existingDuplicates.length} potential duplicate(s) in docs/`, 'warning');
      existingDuplicates.forEach(dup => {
        this.log(`  - ${dup.file1}`, 'warning');
        this.log(`    ${dup.file2}`, 'warning');
      });
    }
    this.log('', 'info');
    
    // Process each file in migration map
    this.log('Processing migration map...', 'info');
    for (const [sourceFile, targetPath] of Object.entries(this.migrationMap)) {
      const sourcePath = path.join(this.projectRoot, sourceFile);
      const fullTargetPath = path.join(this.projectRoot, targetPath);
      
      if (!fs.existsSync(sourcePath)) {
        this.results.skipped.push({
          source: sourcePath,
          reason: 'Source file does not exist'
        });
        this.log(`⊘ Skipped (not found): ${sourceFile}`, 'warning');
        continue;
      }
      
      this.moveFile(sourcePath, fullTargetPath);
    }
    
    this.log('', 'info');
    this.printSummary();
    
    return this.results;
  }

  /**
   * Print migration summary
   */
  printSummary() {
    this.log('=== Migration Summary ===', 'info');
    this.log(`Migrated: ${this.results.migrated.length}`, 'info');
    this.log(`Skipped: ${this.results.skipped.length}`, 'info');
    this.log(`Duplicates: ${this.results.duplicates.length}`, 'info');
    this.log(`Errors: ${this.results.errors.length}`, 'info');
    
    if (this.results.errors.length > 0) {
      this.log('', 'info');
      this.log('Errors:', 'error');
      this.results.errors.forEach(err => {
        this.log(`  ${err.source} -> ${err.target}: ${err.error}`, 'error');
      });
    }
    
    if (this.results.duplicates.length > 0) {
      this.log('', 'info');
      this.log('Duplicates detected:', 'warning');
      this.results.duplicates.forEach(dup => {
        this.log(`  ${dup.source} -> ${dup.target}`, 'warning');
        this.log(`    Reason: ${dup.reason}`, 'warning');
      });
    }
  }

  /**
   * Logging utility
   */
  log(message, level = 'info') {
    if (level === 'verbose' && !this.verbose) return;
    
    const prefix = {
      info: '',
      warning: '⚠ ',
      error: '✗ ',
      verbose: '  '
    }[level] || '';
    
    console.log(prefix + message);
  }

  /**
   * Generate migration report
   */
  generateReport(outputPath) {
    const report = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      dryRun: this.dryRun,
      summary: {
        migrated: this.results.migrated.length,
        skipped: this.results.skipped.length,
        duplicates: this.results.duplicates.length,
        errors: this.results.errors.length
      },
      details: this.results
    };
    
    const reportJson = JSON.stringify(report, null, 2);
    
    if (outputPath) {
      fs.writeFileSync(outputPath, reportJson);
      this.log(`Report saved to: ${outputPath}`, 'info');
    }
    
    return report;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    projectRoot: process.cwd()
  };
  
  const migrator = new DocumentationMigrator(options);
  const results = migrator.migrate();
  
  // Generate report
  const reportPath = path.join(migrator.backupDir, 'migration-report.json');
  migrator.generateReport(reportPath);
  
  process.exit(results.errors.length > 0 ? 1 : 0);
}

module.exports = DocumentationMigrator;
