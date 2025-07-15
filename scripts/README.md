# Documentation Validation Scripts

This directory contains scripts to validate the project's documentation for quality, consistency, and integrity.

## Available Scripts

### 1. Requirements Validation (`validate-requirements.js`)

Validates requirements documents for:
- **EARS Format Compliance**: Checks that acceptance criteria follow the EARS format (WHEN/IF/WHERE/WHILE [condition] THEN [system] SHALL [response])
- **Completeness Checking**: Ensures all required sections are present (Introduction, Requirements, User Story, Acceptance Criteria)
- **Traceability Validation**: Verifies that requirement dependencies exist and are properly referenced

**Usage:**
```bash
# Run directly
node scripts/validate-requirements.js [docs-path]

# Using npm script
npm run validate:requirements
```

**Example Output:**
```
Requirements Validation Tool
Scanning for requirements in: docs

Validating: docs/requirements/business-requirements.md
  - Found 3 requirements
  - Found 3 user stories
  - Found 12 acceptance criteria lines
  - Found 5 requirement references

✅ All requirements validation checks passed!
```

### 2. Link Validation (`validate-docs-links.js`)

Validates documentation links for:
- **Link Integrity**: Checks that all internal and external links are valid
- **Cross-References**: Validates internal document references and anchors
- **Markdown Formatting**: Checks for proper markdown syntax and formatting issues

**Usage:**
```bash
# Run directly
node scripts/validate-docs-links.js [root-path]

# Using npm script
npm run validate:links
```

**Example Output:**
```
Documentation Link Checker
Scanning for markdown files in: .
Found 15 markdown files

Validating: README.md
  - Found 8 links

Validating: docs/design/system-architecture.md
  - Found 12 links

✅ All documentation link checks passed!
```

### 3. Combined Validation (`validate-all-docs.js`)

Runs both requirements and link validation in sequence for comprehensive documentation checking.

**Usage:**
```bash
# Run directly
node scripts/validate-all-docs.js [root-path]

# Using npm script (recommended)
npm run validate:docs
```

## Integration with Development Workflow

### Pre-commit Validation
Add to your git pre-commit hooks:
```bash
#!/bin/sh
npm run validate:docs
if [ $? -ne 0 ]; then
    echo "Documentation validation failed. Please fix issues before committing."
    exit 1
fi
```

### CI/CD Integration
Add to your CI pipeline:
```yaml
- name: Validate Documentation
  run: npm run validate:docs
```

### Regular Maintenance
Run validation regularly:
```bash
# Weekly documentation health check
npm run validate:docs
```

## Understanding Validation Results

### Error Types

**Requirements Validation Errors:**
- Missing required sections in requirements documents
- Invalid EARS format in acceptance criteria
- Broken requirement traceability (referenced requirements don't exist)

**Link Validation Errors:**
- Broken internal links (files don't exist)
- Invalid external URLs (404, timeout, etc.)
- Missing fragment anchors (section headers that don't exist)

**Markdown Formatting Warnings:**
- Unmatched brackets or parentheses
- Potentially malformed links
- Inconsistent formatting

### Exit Codes
- `0`: All validations passed
- `1`: Validation errors found (should block deployment/merge)

## Configuration

### Requirements Validation
The script looks for requirements files in:
- `docs/requirements/` (default)
- Custom path via command line argument

### Link Validation
The script scans for markdown files in:
- Current directory and subdirectories (default)
- Custom root path via command line argument
- Excludes: `node_modules`, `.git`, `.next`, `dist`, `build`

## Troubleshooting

### Common Issues

**"No requirements files found"**
- Ensure requirements files are in `docs/requirements/` directory
- Check that files have `.md` extension

**"Fragment not found" errors**
- Verify that linked section headers exist in target files
- Check that header text matches the fragment (case-insensitive, spaces become hyphens)

**External link timeouts**
- Network connectivity issues
- External site temporarily unavailable
- Consider adding retry logic for flaky external services

### Performance Considerations

- External URL checking can be slow - results are cached per run
- Large documentation sets may take several minutes to validate
- Consider running link validation separately from requirements validation for faster feedback

## Extending the Scripts

### Adding New Validation Rules

**Requirements Validation:**
```javascript
// Add to RequirementsValidator class
validateCustomRule(content, filePath) {
    // Your validation logic here
    if (/* condition */) {
        this.errors.push({
            file: filePath,
            message: 'Custom validation error'
        });
    }
}
```

**Link Validation:**
```javascript
// Add to DocumentationLinkChecker class
validateCustomLinks(content, filePath) {
    // Your link validation logic here
}
```

### Custom Output Formats
Both scripts can be extended to output results in different formats (JSON, XML, etc.) by modifying the `generateReport()` methods.