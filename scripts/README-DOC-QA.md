# Documentation Quality Assurance Tools

This directory contains automated tools for maintaining documentation quality and consistency across the project.

## Overview

The documentation QA suite includes three main validation tools:

1. **Link Validator** - Ensures all internal documentation links are valid
2. **Freshness Checker** - Identifies outdated documentation
3. **Format Validator** - Verifies documentation follows template standards

## Quick Start

### Run All Checks
```bash
npm run docs:validate
```

### Run Individual Checks
```bash
# Run comprehensive validation (all checks + structure/migration)
npm run docs:validate:comprehensive

# Test navigation and user experience
npm run docs:test:navigation

# Run both comprehensive validation and navigation tests
npm run docs:test:all

# Validate all internal links
npm run docs:validate:links

# Check documentation freshness
npm run docs:validate:freshness

# Validate formatting and template compliance
npm run docs:validate:format
```

## Tools

### 0. Comprehensive Validator (`comprehensive-validation.js`)

**Purpose**: Master validation script that runs all validation checks and performs additional content completeness and migration verification.

**What it checks**:
- Runs all individual validation scripts (links, format, freshness)
- Validates documentation structure completeness
- Checks content completeness (no empty files, missing images)
- Validates cross-reference system (no isolated documents)
- Verifies migration completeness (old files removed, new files present)

**Usage**:
```bash
node scripts/comprehensive-validation.js
# or
npm run docs:validate:comprehensive
```

**Exit codes**:
- `0` - All checks passed
- `1` - One or more checks failed
- `2` - All checks passed with warnings

**Example output**:
```
╔════════════════════════════════════════════════════════════════╗
║     Comprehensive Documentation Validation Suite              ║
╚════════════════════════════════════════════════════════════════╝

Running Link Validation...
[... link validation output ...]

Running Format Validation...
[... format validation output ...]

Running Freshness Check...
[... freshness check output ...]

Validating Documentation Structure...
✅ Documentation structure is correct

Checking Content Completeness...
✅ All documentation content is complete

Validating Cross-Reference System...
⚠️  Cross-Reference Issues:
  content-mapping-audit.md: Isolated document (no links in or out)

Verifying Migration Completeness...
⚠️  Migration Issues:
  Old documentation file still exists: ARCHITECTURE.md

COMPREHENSIVE VALIDATION REPORT
✅ Link Validation
✅ Format Validation
⚠️  Freshness Check
✅ Structure Validation
✅ Content Completeness
⚠️  Cross-References
⚠️  Migration Verification

⚠️  Validation completed with warnings
```

### 1. Link Validator (`validate-doc-links.js`)

**Purpose**: Validates all internal links in markdown documentation to ensure they point to existing files and anchors.

**What it checks**:
- Internal file links (relative paths)
- Anchor links (headings within documents)
- Cross-document references
- Broken or missing links

**Usage**:
```bash
node scripts/validate-doc-links.js
# or
npm run docs:validate:links
```

**Exit codes**:
- `0` - All links are valid
- `1` - Broken links found

**Example output**:
```
=== Documentation Link Validation Report ===

Files scanned: 45
Links checked: 234
Broken links: 2

❌ Broken Links:

📄 api/endpoints/booking-engine.md
  ❌ [Integration Guide](../integrations/booking-engine.md)
     File not found: integrations/booking-engine.md
```

**Features**:
- Skips external links (http/https)
- Validates anchor existence in target files
- Converts headings to anchor format for validation
- Groups results by file for easy review

### 2. Freshness Checker (`check-doc-freshness.js`)

**Purpose**: Identifies documentation that may be outdated based on modification dates, related code changes, and content analysis.

**What it checks**:
- Last modification date (via git or file system)
- Related code file changes
- Stale content indicators (TODO, FIXME, placeholders)
- Deprecated status markers
- Old date references

**Thresholds**:
- **Warning**: 90 days (3 months) since last update
- **Stale**: 180 days (6 months) since last update

**Usage**:
```bash
node scripts/check-doc-freshness.js
# or
npm run docs:validate:freshness
```

**Exit codes**:
- `0` - All documentation is fresh
- `2` - Stale documentation found (warning)

**Example output**:
```
=== Documentation Freshness Report ===

Files analyzed: 45
Stale files: 3
Warning files: 5
Recent files: 37

🔴 Stale Documentation (Needs Review):

📄 api/endpoints/legacy-api.md
   Last modified: 2023-06-15 (210 days ago)
   Status: Active
   Issues:
     - Contains TODO/FIXME markers
   Related code modified more recently:
     - api/routes/legacy.js (45 days ago)
```

**Features**:
- Uses git history for accurate modification dates
- Finds related code files by name matching
- Detects placeholder text and incomplete sections
- Extracts metadata from document headers
- Configurable staleness thresholds

### 3. Format Validator (`validate-doc-format.js`)

**Purpose**: Validates markdown documentation against formatting standards and template compliance requirements.

**What it checks**:
- Required sections (based on template type)
- Required metadata fields
- Placeholder text
- Markdown formatting issues
- Code block formatting

**Template types detected**:
- Feature documentation
- API endpoint documentation
- Integration guide documentation

**Usage**:
```bash
node scripts/validate-doc-format.js
# or
npm run docs:validate:format
```

**Exit codes**:
- `0` - All documentation follows standards
- `1` - Formatting issues found

**Example output**:
```
=== Documentation Format Validation Report ===

Files validated: 45
Valid files: 42
Files with issues: 3

⚠️  Files with Formatting Issues:

📄 features/new-feature.md
   Template: feature-documentation-template.md
   Missing sections:
     - Troubleshooting
     - Related Documentation
   Placeholders found: 8
     Line 12: [Feature Name]
     Line 25: [Author]
     Line 45: TODO: Add examples
```

**Features**:
- Auto-detects template type from path and content
- Validates required sections and metadata
- Checks code blocks for language specification
- Identifies formatting inconsistencies
- Reports placeholder text that needs completion

### 4. Navigation and UX Tester (`test-doc-navigation.js`)

**Purpose**: Tests documentation navigation paths and user experience workflows to ensure efficient information discovery.

**What it tests**:
- **User Journey Tests**: Complete documentation paths for different personas (new developer, API integrator, system admin, frontend/backend developers)
- **Task Workflow Tests**: Documentation support for common tasks (adding features, deploying, integrating systems, troubleshooting)
- **Navigation Completeness**: Main README links, section README links, bidirectional linking
- **Information Architecture**: Hierarchy depth, naming conventions, directory structure

**Usage**:
```bash
node scripts/test-doc-navigation.js
# or
npm run docs:test:navigation
```

**Exit codes**:
- `0` - All tests passed
- `1` - One or more tests failed

**Example output**:
```
╔════════════════════════════════════════════════════════════════╗
║     Documentation Navigation & UX Testing Suite              ║
╚════════════════════════════════════════════════════════════════╝

Testing User Journeys...

Testing: New Developer Onboarding
Description: A new developer joining the project
  ✅ Journey path is complete

Testing: API Integration Developer
Description: Developer integrating with the API
  ✅ Journey path is complete

Testing Task Workflows...

Testing: Adding a New Feature
  ✅ Workflow is complete

Testing: Deploying to Production
  ✅ Workflow is complete

Testing Navigation Completeness...
✅ Navigation is complete

Testing Information Architecture...
✅ Information architecture is well-organized

NAVIGATION AND UX TEST REPORT

User Journey Tests:
  Passed: 5/5
  ✅ New Developer Onboarding
  ✅ API Integration Developer
  ✅ System Administrator
  ✅ Frontend Developer
  ✅ Backend Developer

Task Workflow Tests:
  Passed: 4/4
  ✅ Adding a New Feature
  ✅ Deploying to Production
  ✅ Integrating Payment System
  ✅ Troubleshooting an Issue

Navigation Tests:
  ✅ Navigation Completeness

Information Architecture:
  ✅ Information Architecture

🎉 All navigation and UX tests passed!
```

**Features**:
- Tests predefined user journey paths
- Validates task-oriented workflows
- Checks navigation link completeness
- Validates information architecture
- Identifies isolated documents
- Checks directory structure

### 5. Master Validator (`validate-docs.js`)

**Purpose**: Runs all validation checks in sequence and provides a comprehensive summary report.

**Usage**:
```bash
node scripts/validate-docs.js
# or
npm run docs:validate
```

**Exit codes**:
- `0` - All checks passed
- `1` - One or more checks failed
- `2` - All checks passed with warnings

**Example output**:
```
╔════════════════════════════════════════════════════════════════╗
║         Documentation Quality Assurance Suite                 ║
╚════════════════════════════════════════════════════════════════╝

Running Link Validation...
[... link validation output ...]
✓ Link Validation passed

Running Freshness Check...
[... freshness check output ...]
✓ Freshness Check passed

Running Format Validation...
[... format validation output ...]
✓ Format Validation passed

Summary Report

Total checks: 3
Passed: 3

  ✓ Link Validation
  ✓ Freshness Check
  ✓ Format Validation

All documentation validation checks passed!
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Documentation Quality

on:
  pull_request:
    paths:
      - 'docs/**'
  push:
    branches:
      - main
    paths:
      - 'docs/**'

jobs:
  validate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Needed for git history
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Validate documentation
        run: npm run docs:validate
```

### Pre-commit Hook Example

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if any documentation files are being committed
if git diff --cached --name-only | grep -q '^docs/'; then
  echo "Validating documentation..."
  npm run docs:validate:links
  
  if [ $? -ne 0 ]; then
    echo "Documentation validation failed. Please fix the issues before committing."
    exit 1
  fi
fi
```

## Configuration

### Customizing Thresholds

Edit the configuration constants at the top of each script:

**Freshness Checker** (`check-doc-freshness.js`):
```javascript
const STALE_THRESHOLD_DAYS = 180; // 6 months
const WARNING_THRESHOLD_DAYS = 90; // 3 months
```

**Format Validator** (`validate-doc-format.js`):
```javascript
const TEMPLATE_REQUIREMENTS = {
  'feature-documentation-template.md': {
    requiredSections: [...],
    requiredFields: [...]
  }
};
```

### Excluding Files

To exclude specific files or directories from validation, modify the file search logic:

```javascript
// In findMarkdownFiles function
if (entry.name === 'node_modules' || 
    entry.name.startsWith('.') ||
    entry.name === 'archive') {  // Add exclusions here
  continue;
}
```

## Best Practices

### Regular Validation

Run documentation validation:
- **Before committing**: Catch issues early
- **In CI/CD**: Prevent broken documentation from merging
- **Weekly**: Identify documentation that needs updates
- **After major changes**: Ensure documentation stays in sync

### Addressing Issues

**Broken Links**:
1. Update the link to point to the correct location
2. If the target was moved, update all references
3. If the target was deleted, remove the link or find an alternative

**Stale Documentation**:
1. Review the content for accuracy
2. Update outdated information
3. Add new sections for recent changes
4. Update the "Last Updated" date

**Format Issues**:
1. Add missing required sections
2. Complete placeholder text
3. Fix markdown formatting
4. Add language tags to code blocks

### Maintaining Quality

1. **Use templates**: Start new documentation from templates
2. **Review regularly**: Schedule periodic documentation reviews
3. **Update with code**: Update docs when changing related code
4. **Automate checks**: Run validation in CI/CD pipeline
5. **Track metrics**: Monitor documentation quality over time

## Troubleshooting

### "Command not found" errors

Ensure you're running commands from the project root:
```bash
cd /path/to/rht-hotel
npm run docs:validate
```

### Git-related errors in freshness checker

The freshness checker uses git to determine modification dates. Ensure:
- You're in a git repository
- Git is installed and accessible
- The repository has commit history

If git is unavailable, the tool will fall back to file system dates.

### False positives in link validation

Some links may be flagged incorrectly if:
- They use environment-specific paths
- They reference generated files
- They use special URL schemes

Consider excluding these files or adjusting the validation logic.

## Development

### Adding New Checks

To add a new validation check:

1. Create a new script in `scripts/` directory
2. Follow the existing script structure
3. Export validation functions for testing
4. Add npm script to `package.json`
5. Integrate into `validate-docs.js` master script
6. Update this README

### Testing

Each validation script exports its core functions for testing:

```javascript
// Example test
const { validateLink } = require('./validate-doc-links');

const result = validateLink('../api/README.md', '/docs/features/test.md');
console.assert(result.valid === true);
```

## Support

### Getting Help

- Check this README for usage instructions
- Review script comments for implementation details
- Check existing documentation for examples
- Contact the documentation team

### Reporting Issues

If you find bugs or have suggestions:
1. Check if the issue already exists
2. Create a detailed issue report with:
   - Script name and version
   - Command used
   - Expected vs actual behavior
   - Sample files that reproduce the issue
3. Submit a pull request with fixes if possible

## Related Documentation

- [Documentation Templates](../docs/templates/README.md)
- [Documentation Organization Guide](../docs/README.md)
- [Contribution Guidelines](../docs/development/contribution-guide.md)

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-01 | Initial QA tool suite |
| 1.1 | 2024-01-01 | Added link validator, freshness checker, format validator |
