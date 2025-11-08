# Documentation Migration Scripts

This directory contains utilities for migrating, organizing, and standardizing project documentation.

## Overview

The migration system consists of four main components:

1. **migrate-docs.js** - Content migration with backup and duplicate detection
2. **link-manager.js** - Link scanning, updating, and validation
3. **content-standardizer.js** - Markdown formatting standardization
4. **doc-migration-orchestrator.js** - Master orchestration script

## Quick Start

### Complete Migration (Recommended)

Run the full migration workflow with a dry run first to preview changes:

```bash
# Preview changes without modifying files
node scripts/doc-migration-orchestrator.js --dry-run --verbose

# Execute the migration
node scripts/doc-migration-orchestrator.js
```

### Rollback

If you need to undo the migration:

```bash
node scripts/doc-migration-orchestrator.js rollback
```

## Individual Tools

### 1. Content Migration (migrate-docs.js)

Systematically moves documentation files from root level to appropriate docs/ subdirectories.

**Features:**
- Automatic file relocation based on predefined mapping
- Duplicate content detection
- Automatic backup creation
- Dry-run mode for safe testing

**Usage:**

```bash
# Dry run to preview migration
node scripts/migrate-docs.js --dry-run --verbose

# Execute migration
node scripts/migrate-docs.js

# With verbose output
node scripts/migrate-docs.js --verbose
```

**Migration Mapping:**

The script uses a predefined mapping to determine where files should be moved:

- `ARCHITECTURE.md` → `docs/architecture/system-overview.md`
- `STATE_MGMT.md` → `docs/frontend/state-management.md`
- `BOOKING_ENGINE_API_DOCUMENTATION.md` → `docs/api/endpoints/booking-engine.md`
- `BOOKING_ENGINE_INTEGRATION_STRATEGY.md` → `docs/integrations/booking-engine/integration-strategy.md`
- `square_payment_integration.md` → `docs/integrations/payment-systems/square-integration.md`
- `BUGS.md` → `docs/reference/known-issues.md`
- `CHANGELOG.md` → `docs/reference/changelog.md`
- `GEMINI.md` → `docs/development/ai-assistance-guide.md`
- `DEALT.md` → `docs/reference/dealt-items.md`
- `instructions.md` → `docs/development/project-instructions.md`

**Output:**
- Backup files: `.doc-migration-backup/*.bak`
- Report: `.doc-migration-backup/migration-report.json`

### 2. Link Manager (link-manager.js)

Scans documentation for links, updates them after migration, and validates link integrity.

**Features:**
- Extracts all markdown and HTML links
- Updates internal links to reflect new file locations
- Validates link targets exist
- Identifies broken links
- Tracks external links

**Usage:**

```bash
# Validate all links
node scripts/link-manager.js validate --verbose

# Update links based on relocation map
node scripts/link-manager.js update --map=relocation-map.json

# Dry run
node scripts/link-manager.js validate --dry-run
```

**Output:**
- Validation report: `link-validation-report.json`
- Update report: `link-update-report.json`

### 3. Content Standardizer (content-standardizer.js)

Applies consistent markdown formatting and validates content against style rules.

**Features:**
- Standardizes heading format (ATX-style)
- Normalizes list formatting
- Ensures proper code block formatting
- Removes trailing whitespace
- Eliminates multiple blank lines
- Validates link formatting
- Checks for bare URLs

**Formatting Rules:**

**Headings:**
- Use ATX-style (`#` syntax)
- No trailing punctuation
- Blank line after headings
- Proper hierarchy

**Lists:**
- Use `-` for unordered lists
- Consistent indentation
- Blank line before lists

**Code Blocks:**
- Use fenced code blocks (```)
- Specify language
- Blank lines before and after

**General:**
- No trailing whitespace
- No multiple consecutive blank lines
- Files end with newline
- No bare URLs (wrap in markdown syntax)

**Usage:**

```bash
# Standardize all documentation
node scripts/content-standardizer.js --verbose

# Dry run to see what would change
node scripts/content-standardizer.js --dry-run --verbose
```

**Output:**
- Report: `content-standardization-report.json`

### 4. Migration Orchestrator (doc-migration-orchestrator.js)

Master script that runs the complete migration workflow in the correct order.

**Workflow:**
1. Migrate content with backup
2. Update links based on new locations
3. Validate all links
4. Standardize content formatting

**Usage:**

```bash
# Complete migration with dry run
node scripts/doc-migration-orchestrator.js --dry-run --verbose

# Execute migration
node scripts/doc-migration-orchestrator.js

# Rollback migration
node scripts/doc-migration-orchestrator.js rollback
```

**Output:**
- Comprehensive report: `.doc-migration-backup/migration-report-<timestamp>.json`
- All backups: `.doc-migration-backup/*.bak`

## Command-Line Options

All scripts support these common options:

- `--dry-run` - Preview changes without modifying files
- `--verbose` - Show detailed output
- `--help` - Display usage information (where applicable)

## Reports

All scripts generate JSON reports with detailed information about the operations performed:

### Migration Report
```json
{
  "timestamp": "2024-11-08T...",
  "projectRoot": "/path/to/project",
  "dryRun": false,
  "summary": {
    "migrated": 10,
    "skipped": 2,
    "duplicates": 1,
    "errors": 0
  },
  "details": { ... }
}
```

### Link Validation Report
```json
{
  "timestamp": "2024-11-08T...",
  "summary": {
    "filesScanned": 45,
    "filesUpdated": 12,
    "brokenLinks": 3,
    "externalLinks": 28
  },
  "details": { ... }
}
```

### Standardization Report
```json
{
  "timestamp": "2024-11-08T...",
  "summary": {
    "filesProcessed": 45,
    "filesModified": 23,
    "filesWithViolations": 15,
    "errors": 0
  },
  "details": { ... }
}
```

## Best Practices

1. **Always run with --dry-run first** to preview changes
2. **Review the reports** before executing live migration
3. **Keep backups** - don't delete `.doc-migration-backup/` until you're sure
4. **Run validation** after migration to check for broken links
5. **Use verbose mode** when troubleshooting issues

## Troubleshooting

### Migration Issues

**Problem:** Files not being migrated
- Check that source files exist in project root
- Verify file names match the migration map exactly
- Review migration report for skipped files

**Problem:** Duplicate content detected
- Review the duplicate detection report
- Manually merge content if needed
- Update migration map to skip duplicates

### Link Issues

**Problem:** Broken links after migration
- Run link validation: `node scripts/link-manager.js validate`
- Check the broken links report
- Manually fix links that couldn't be automatically updated

**Problem:** Links not being updated
- Ensure relocation map is correct
- Check that link format is standard markdown
- Review link update report for details

### Standardization Issues

**Problem:** Formatting violations remain
- Some violations require manual fixes
- Review the violations report
- Update content to match style rules

**Problem:** Content structure changed unexpectedly
- Check if template was applied
- Review before/after in version control
- Restore from backup if needed

## Backup and Recovery

### Backup Location

All backups are stored in `.doc-migration-backup/`:
- Original files: `*.bak`
- Reports: `*-report*.json`

### Manual Restore

To manually restore a file:

```bash
# Find the backup
ls .doc-migration-backup/*.bak

# Copy back to original location
cp .doc-migration-backup/ARCHITECTURE.md.2024-11-08T*.bak ARCHITECTURE.md
```

### Automatic Rollback

```bash
node scripts/doc-migration-orchestrator.js rollback
```

## Integration with CI/CD

You can integrate these scripts into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Validate Documentation Links
  run: node scripts/link-manager.js validate
  
- name: Check Documentation Formatting
  run: node scripts/content-standardizer.js --dry-run
```

## Customization

### Modifying Migration Map

Edit `migrate-docs.js` and update the `migrationMap` object:

```javascript
this.migrationMap = {
  'YOUR_FILE.md': 'docs/target/location.md',
  // Add more mappings...
};
```

### Adjusting Formatting Rules

Edit `content-standardizer.js` and modify the `rules` object:

```javascript
this.rules = {
  headings: {
    atxStyle: true,
    noTrailingPunctuation: true,
    // Customize rules...
  },
  // More rule categories...
};
```

## Support

For issues or questions:
1. Check the generated reports for detailed error information
2. Run with `--verbose` for more detailed output
3. Review this README for troubleshooting tips
4. Check the backup directory for recovery options

## Version History

- **v1.0.0** - Initial release with migration, link management, and standardization
